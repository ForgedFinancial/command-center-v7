const express = require('express')
const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')

const {
  nowISO,
  generateTaskId,
  getTasks,
  saveTasks,
  getDependencies,
  saveDependencies,
  readPipelineConfig,
  readClassificationsConfig,
  getStageOrder,
  getStageConfig,
  getAgentForStage,
  appendAudit,
  readAudit,
  moveManifestToArchive,
  readArchiveTaskManifest,
  listArchivedTaskFiles,
  createNotification,
} = require('../lib/opsStore')
const {
  MANIFEST_SECTIONS,
  getManifestPath,
  writeTaskManifest,
  readTaskManifest,
  ensureTaskManifest,
  normalizeManifestSection,
} = require('../lib/manifestTemplate')
const { OPS_PATHS } = require('../lib/opsPaths')
const { validateGates } = require('../lib/gates')
const { createCheckpoint, listCheckpoints, getLatestCheckpoint } = require('../lib/checkpoints')
const { createHandoff, listHandoffs, getHandoff } = require('../lib/handoffs')
const { computeAutoAdvance } = require('../lib/autoAdvance')

const router = express.Router()

function actorFromRequest(req) {
  return req.body?.actor || req.headers['x-actor'] || 'api'
}

function mapStageToManifestSection(stage) {
  const map = {
    SPEC: 'spec',
    PLANNING: 'planning',
    BUILD: 'build',
    VALIDATE: 'validate',
    DEPLOY: 'deploy',
    MONITOR: 'monitor',
    ARCHIVE: 'retrospective',
  }
  return map[stage] || 'spec'
}

function buildInitialGates(pipelineConfig) {
  const gates = {}
  for (const stage of pipelineConfig.stages || []) {
    for (const gateName of Object.keys(stage.gates || {})) {
      gates[gateName] = false
    }
  }
  return gates
}

function applyFilters(tasks, query = {}) {
  const { stage, agent, classification, priority, search } = query
  return tasks.filter(task => {
    if (stage && task.stage !== stage) return false
    if (agent && task.assignedAgent !== agent) return false
    if (classification && task.classification !== classification) return false
    if (priority && task.priority !== priority) return false
    if (search) {
      const needle = String(search).toLowerCase()
      const hay = `${task.title || ''} ${task.description || ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })
}

function isTransitionAllowed(currentStage, targetStage, stageOrder, force = false) {
  if (force) return true
  const currentIndex = stageOrder.indexOf(currentStage)
  const targetIndex = stageOrder.indexOf(targetStage)
  if (currentIndex === -1 || targetIndex === -1) return false
  return Math.abs(targetIndex - currentIndex) === 1
}

function unresolvedDependencies(task, allTasks) {
  const deps = Array.isArray(task.dependencies) ? task.dependencies : []
  if (deps.length === 0) return []

  return deps.filter(depId => {
    const depTask = allTasks.find(t => t.id === depId)
    if (!depTask) return false
    return depTask.stage !== 'ARCHIVE'
  })
}

function stageGatesPassed(task, stageConfig) {
  const gateNames = Object.keys(stageConfig?.gates || {})
  if (gateNames.length === 0) return true
  return gateNames.every(name => task.gates[name] === true)
}

function emitOpsEvent(req, event) {
  const wss = req.app.get('opsWss')
  if (!wss || typeof wss.broadcast !== 'function') return
  try {
    wss.broadcast(event)
  } catch {
    // no-op
  }
}

async function maybeEmitGateFailureNotification(task, stage, reason) {
  return createNotification({
    title: `Gate failed: ${task.id}`,
    description: `${stage}: ${reason}`,
    type: 'error',
    meta: {
      taskId: task.id,
      stage,
      reason,
    },
  })
}

async function writeTaskAndManifest(tasks, task) {
  await saveTasks(tasks)
  await writeTaskManifest(task)
}

async function transitionTask({ req, tasks, task, targetStage, pipelineConfig, actor, force = false, reason = '' }) {
  const stageOrder = getStageOrder(pipelineConfig)
  if (!stageOrder.includes(targetStage)) {
    return { error: `Invalid stage: ${targetStage}`, status: 400 }
  }

  if (task.stage === targetStage) {
    return { error: `Task already in stage ${targetStage}`, status: 400 }
  }

  if (!isTransitionAllowed(task.stage, targetStage, stageOrder, force)) {
    return { error: 'Transition blocked: can only move one stage at a time unless force=true', status: 409 }
  }

  const sourceIndex = stageOrder.indexOf(task.stage)
  const targetIndex = stageOrder.indexOf(targetStage)
  const movingForward = targetIndex > sourceIndex

  if (movingForward && !force) {
    const currentStageConfig = getStageConfig(pipelineConfig, task.stage)
    if (!stageGatesPassed(task, currentStageConfig)) {
      return { error: `Cannot leave ${task.stage} until all gates pass`, status: 409 }
    }

    const blockedBy = unresolvedDependencies(task, tasks)
    if (blockedBy.length > 0) {
      task.blockedBy = blockedBy
      await saveTasks(tasks)
      return { error: `Task is blocked by dependencies: ${blockedBy.join(', ')}`, status: 409 }
    }
  }

  const now = nowISO()
  const fromStage = task.stage

  const currentEntry = task.stageHistory?.[task.stageHistory.length - 1]
  if (currentEntry && !currentEntry.exitedAt) {
    currentEntry.exitedAt = now
    currentEntry.duration = Math.max(0, Math.floor((new Date(now) - new Date(currentEntry.enteredAt)) / 1000))
  }

  task.stage = targetStage
  task.updatedAt = now
  task.assignedAgent = getAgentForStage(targetStage, pipelineConfig)
  task.blockedBy = unresolvedDependencies(task, tasks)

  if (!Array.isArray(task.stageHistory)) task.stageHistory = []
  task.stageHistory.push({
    stage: targetStage,
    enteredAt: now,
    exitedAt: null,
    duration: null,
  })

  await writeTaskAndManifest(tasks, task)
  await appendAudit(task.id, `[${now}] ${actor} moved ${task.id} ${fromStage} -> ${targetStage}${reason ? ` (${reason})` : ''}`)

  try {
    const summarySection = mapStageToManifestSection(fromStage)
    const manifestSnippet = typeof task.manifest?.[summarySection] === 'string' ? task.manifest[summarySection] : ''
    await createHandoff(task, fromStage, targetStage, { manifest: manifestSnippet })
  } catch {
    // non-fatal
  }

  emitOpsEvent(req, {
    type: 'task.stage.changed',
    task,
    fromStage,
    toStage: targetStage,
    timestamp: now,
  })

  return { task }
}

async function tryAutoAdvance({ req, tasks, task, pipelineConfig, actor }) {
  const nextStage = computeAutoAdvance(task, pipelineConfig)
  if (!nextStage) return null

  const transitioned = await transitionTask({
    req,
    tasks,
    task,
    targetStage: nextStage,
    pipelineConfig,
    actor,
    force: false,
    reason: 'auto-advance',
  })

  if (transitioned.error) return null
  return transitioned.task
}

// GET /api/ops/tasks
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await getTasks()
    const filtered = applyFilters(tasks, req.query)
    res.json({ tasks: filtered })
  } catch (err) {
    console.error('[OPSv2] Failed to fetch tasks:', err)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// GET /api/ops/tasks/:taskId
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const tasks = await getTasks()
    const task = tasks.find(entry => entry.id === req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })
    res.json({ task })
  } catch (err) {
    console.error('[OPSv2] Failed to fetch task:', err)
    res.status(500).json({ error: 'Failed to fetch task' })
  }
})

// POST /api/ops/tasks
router.post('/tasks', async (req, res) => {
  try {
    const pipelineConfig = await readPipelineConfig()
    const classifications = await readClassificationsConfig()
    const classificationIds = (classifications.classifications || []).map(item => item.id)

    const { title, description, classification, priority, spec, dependencies } = req.body || {}

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'title is required' })
    }

    if (!classification || !classificationIds.includes(classification)) {
      return res.status(400).json({ error: `classification must be one of: ${classificationIds.join(', ')}` })
    }

    const tasks = await getTasks()
    const taskId = generateTaskId()
    const now = nowISO()

    const taskDependencies = Array.isArray(dependencies)
      ? [...new Set(dependencies.filter(dep => typeof dep === 'string' && dep.trim().length > 0))]
      : []

    const task = {
      id: taskId,
      title: title.trim(),
      description: (description || '').trim(),
      classification,
      stage: 'SPEC',
      assignedAgent: getAgentForStage('SPEC', pipelineConfig) || 'clawd',
      priority: priority || 'medium',
      createdAt: now,
      updatedAt: now,
      stageHistory: [
        { stage: 'SPEC', enteredAt: now, exitedAt: null, duration: null },
      ],
      manifest: {
        spec: typeof spec === 'string' ? spec : '',
        planning: '',
        build: '',
        validate: '',
        deploy: '',
        monitor: '',
        retrospective: '',
      },
      gates: buildInitialGates(pipelineConfig),
      metadata: {
        gitBranch: `ops/${taskId}`,
        commitHashes: [],
        deployUrl: null,
        errorRate: null,
        uptime: null,
      },
      dependencies: taskDependencies,
      blockedBy: [],
      progress: {
        currentStep: 'Awaiting spec approval',
        totalSteps: 1,
        completedSteps: 0,
        percentage: 0,
      },
    }

    task.blockedBy = unresolvedDependencies(task, tasks)

    tasks.push(task)
    await writeTaskAndManifest(tasks, task)
    await ensureTaskManifest(task)

    const actor = actorFromRequest(req)
    await appendAudit(task.id, `[${now}] ${actor} created ${task.id}`)

    emitOpsEvent(req, {
      type: 'task.created',
      task,
      timestamp: now,
    })

    res.status(201).json({ success: true, task })
  } catch (err) {
    console.error('[OPSv2] Failed to create task:', err)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// PUT /api/ops/tasks/:taskId
router.put('/tasks/:taskId', async (req, res) => {
  try {
    const tasks = await getTasks()
    const task = tasks.find(entry => entry.id === req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const updates = req.body || {}
    const now = nowISO()

    if (typeof updates.title === 'string' && updates.title.trim()) task.title = updates.title.trim()
    if (typeof updates.description === 'string') task.description = updates.description.trim()
    if (typeof updates.priority === 'string' && updates.priority.trim()) task.priority = updates.priority.trim()
    if (typeof updates.classification === 'string' && updates.classification.trim()) task.classification = updates.classification.trim()
    if (typeof updates.assignedAgent === 'string') task.assignedAgent = updates.assignedAgent

    if (updates.progress && typeof updates.progress === 'object') {
      task.progress = {
        ...task.progress,
        ...updates.progress,
      }
    }

    if (Array.isArray(updates.dependencies)) {
      task.dependencies = [...new Set(updates.dependencies.filter(dep => typeof dep === 'string'))]
      task.blockedBy = unresolvedDependencies(task, tasks)
    }

    task.updatedAt = now

    await writeTaskAndManifest(tasks, task)
    await appendAudit(task.id, `[${now}] ${actorFromRequest(req)} updated ${task.id}`)

    emitOpsEvent(req, {
      type: 'task.updated',
      task,
      timestamp: now,
    })

    res.json({ success: true, task })
  } catch (err) {
    console.error('[OPSv2] Failed to update task:', err)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// DELETE /api/ops/tasks/:taskId
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const tasks = await getTasks()
    const index = tasks.findIndex(entry => entry.id === req.params.taskId)
    if (index === -1) return res.status(404).json({ error: 'Task not found' })

    const [task] = tasks.splice(index, 1)
    await saveTasks(tasks)

    const manifestPath = getManifestPath(task.id)
    const archivePath = await moveManifestToArchive(task.id, manifestPath)

    const now = nowISO()
    await appendAudit(task.id, `[${now}] ${actorFromRequest(req)} archived ${task.id}`)

    emitOpsEvent(req, {
      type: 'task.archived',
      taskId: task.id,
      timestamp: now,
    })

    res.json({ success: true, archivePath })
  } catch (err) {
    console.error('[OPSv2] Failed to delete task:', err)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

// POST /api/ops/tasks/:taskId/stage/:stage
router.post('/tasks/:taskId/stage/:stage', async (req, res) => {
  try {
    const tasks = await getTasks()
    const task = tasks.find(entry => entry.id === req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const pipelineConfig = await readPipelineConfig()
    const force = req.query.force === 'true' || req.body?.force === true
    const actor = actorFromRequest(req)
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : ''

    const transition = await transitionTask({
      req,
      tasks,
      task,
      targetStage: req.params.stage,
      pipelineConfig,
      actor,
      force,
      reason,
    })

    if (transition.error) {
      return res.status(transition.status || 400).json({ error: transition.error })
    }

    res.json({ success: true, task: transition.task })
  } catch (err) {
    console.error('[OPSv2] Failed stage transition:', err)
    res.status(500).json({ error: 'Failed stage transition' })
  }
})

// POST /api/ops/tasks/:taskId/advance
router.post('/tasks/:taskId/advance', async (req, res) => {
  try {
    const tasks = await getTasks()
    const task = tasks.find(entry => entry.id === req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const pipelineConfig = await readPipelineConfig()
    const order = getStageOrder(pipelineConfig)
    const idx = order.indexOf(task.stage)
    if (idx === -1 || idx >= order.length - 1) {
      return res.status(400).json({ error: 'Task is already at final stage' })
    }

    const actor = actorFromRequest(req)
    const targetStage = order[idx + 1]
    const transition = await transitionTask({
      req,
      tasks,
      task,
      targetStage,
      pipelineConfig,
      actor,
      force: false,
      reason: 'advance endpoint',
    })

    if (transition.error) {
      return res.status(transition.status || 400).json({ error: transition.error })
    }

    res.json({ success: true, task: transition.task, nextStage: targetStage })
  } catch (err) {
    console.error('[OPSv2] Failed to advance task:', err)
    res.status(500).json({ error: 'Failed to advance task' })
  }
})

// GET /api/ops/tasks/:taskId/manifest
router.get('/tasks/:taskId/manifest', async (req, res) => {
  try {
    const content = await readTaskManifest(req.params.taskId)
    res.json({ content })
  } catch {
    res.status(404).json({ error: 'Manifest not found' })
  }
})

// PUT /api/ops/tasks/:taskId/manifest/:section
router.put('/tasks/:taskId/manifest/:section', async (req, res) => {
  try {
    const section = normalizeManifestSection(req.params.section)
    if (!section) {
      return res.status(400).json({ error: `Invalid section. Allowed: ${MANIFEST_SECTIONS.join(', ')}` })
    }

    const tasks = await getTasks()
    const task = tasks.find(entry => entry.id === req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    task.manifest[section] = typeof req.body?.content === 'string' ? req.body.content : ''
    task.updatedAt = nowISO()

    await writeTaskAndManifest(tasks, task)
    await appendAudit(task.id, `[${task.updatedAt}] ${actorFromRequest(req)} updated manifest.${section}`)

    emitOpsEvent(req, {
      type: 'task.manifest.updated',
      taskId: task.id,
      section,
      timestamp: task.updatedAt,
    })

    res.json({ success: true, task })
  } catch (err) {
    console.error('[OPSv2] Failed to update manifest:', err)
    res.status(500).json({ error: 'Failed to update manifest' })
  }
})

// POST /api/ops/tasks/:taskId/gates/validate
router.post('/tasks/:taskId/gates/validate', async (req, res) => {
  try {
    const tasks = await getTasks()
    const task = tasks.find(entry => entry.id === req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const pipelineConfig = await readPipelineConfig()
    const actor = actorFromRequest(req)

    const { allPassed, results, details } = await validateGates(task, pipelineConfig)
    task.updatedAt = nowISO()

    await writeTaskAndManifest(tasks, task)
    await appendAudit(task.id, `[${task.updatedAt}] ${actor} validated gates for ${task.stage}`)

    for (const [gateName, passed] of Object.entries(results)) {
      emitOpsEvent(req, {
        type: passed ? 'task.gate.passed' : 'task.gate.failed',
        taskId: task.id,
        stage: task.stage,
        gate: gateName,
        reason: passed ? null : details[gateName]?.stderr || details[gateName]?.description || 'Gate failed',
        timestamp: task.updatedAt,
      })

      const stdout = details[gateName]?.stdout || ''
      const stderr = details[gateName]?.stderr || ''
      const output = `${stdout}\n${stderr}`.trim()
      if (output) {
        const preview = output.split('\n').slice(0, 4)
        preview.forEach(line => {
          emitOpsEvent(req, {
            type: 'live.log',
            taskId: task.id,
            agent: task.assignedAgent || 'system',
            line: `[${gateName}] ${line}`,
            timestamp: task.updatedAt,
          })
        })
      }
    }

    if (!allPassed) {
      const failedNames = Object.entries(results)
        .filter(([, passed]) => !passed)
        .map(([name]) => name)
      await maybeEmitGateFailureNotification(task, task.stage, failedNames.join(', '))
    }

    const autoAdvancedTask = allPassed
      ? await tryAutoAdvance({ req, tasks, task, pipelineConfig, actor })
      : null

    res.json({
      success: true,
      allPassed,
      results,
      details,
      task,
      autoAdvancedTo: autoAdvancedTask ? autoAdvancedTask.stage : null,
    })
  } catch (err) {
    console.error('[OPSv2] Gate validation failed:', err)
    res.status(500).json({ error: 'Gate validation failed' })
  }
})

// GET /api/ops/tasks/:taskId/gates/status
router.get('/tasks/:taskId/gates/status', async (req, res) => {
  try {
    const tasks = await getTasks()
    const task = tasks.find(entry => entry.id === req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const pipelineConfig = await readPipelineConfig()
    const stageConfig = getStageConfig(pipelineConfig, task.stage)

    res.json({
      stage: task.stage,
      gates: task.gates,
      stageGates: stageConfig?.gates || {},
    })
  } catch (err) {
    console.error('[OPSv2] Failed gate status:', err)
    res.status(500).json({ error: 'Failed gate status' })
  }
})

// PUT /api/ops/tasks/:taskId/gates/:gateName
router.put('/tasks/:taskId/gates/:gateName', async (req, res) => {
  try {
    const { taskId, gateName } = req.params
    const passed = req.body?.passed !== false

    const tasks = await getTasks()
    const task = tasks.find(entry => entry.id === taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    task.gates[gateName] = passed
    task.updatedAt = nowISO()

    await writeTaskAndManifest(tasks, task)
    await appendAudit(task.id, `[${task.updatedAt}] ${actorFromRequest(req)} set gate ${gateName}=${passed}`)

    emitOpsEvent(req, {
      type: passed ? 'task.gate.passed' : 'task.gate.failed',
      taskId,
      stage: task.stage,
      gate: gateName,
      reason: passed ? null : req.body?.reason || 'Manual gate rejection',
      timestamp: task.updatedAt,
    })

    if (!passed) {
      await maybeEmitGateFailureNotification(task, task.stage, `${gateName} failed (manual)`)
    }

    const pipelineConfig = await readPipelineConfig()
    const autoAdvancedTask = passed
      ? await tryAutoAdvance({ req, tasks, task, pipelineConfig, actor: actorFromRequest(req) })
      : null

    res.json({
      success: true,
      task,
      autoAdvancedTo: autoAdvancedTask ? autoAdvancedTask.stage : null,
    })
  } catch (err) {
    console.error('[OPSv2] Failed to update gate:', err)
    res.status(500).json({ error: 'Failed to update gate' })
  }
})

// GET /api/ops/tasks/:taskId/checkpoints
router.get('/tasks/:taskId/checkpoints', async (req, res) => {
  try {
    const checkpoints = await listCheckpoints(req.params.taskId)
    res.json({ checkpoints })
  } catch (err) {
    console.error('[OPSv2] Failed to list checkpoints:', err)
    res.status(500).json({ error: 'Failed to list checkpoints' })
  }
})

// POST /api/ops/tasks/:taskId/checkpoints
router.post('/tasks/:taskId/checkpoints', async (req, res) => {
  try {
    const tasks = await getTasks()
    const task = tasks.find(entry => entry.id === req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const checkpointPath = await createCheckpoint(task, req.body?.messageCount || 0)
    await appendAudit(task.id, `[${nowISO()}] ${actorFromRequest(req)} created checkpoint at ${checkpointPath}`)

    res.json({ success: true, checkpointPath })
  } catch (err) {
    console.error('[OPSv2] Checkpoint creation failed:', err)
    res.status(500).json({ error: 'Checkpoint creation failed' })
  }
})

// GET /api/ops/tasks/:taskId/checkpoints/latest
router.get('/tasks/:taskId/checkpoints/latest', async (req, res) => {
  try {
    const checkpoint = await getLatestCheckpoint(req.params.taskId)
    if (!checkpoint) return res.status(404).json({ error: 'No checkpoints found' })
    res.json({ checkpoint })
  } catch (err) {
    console.error('[OPSv2] Failed to retrieve latest checkpoint:', err)
    res.status(500).json({ error: 'Failed to retrieve latest checkpoint' })
  }
})

// GET /api/ops/tasks/:taskId/handoffs
router.get('/tasks/:taskId/handoffs', async (req, res) => {
  try {
    const handoffs = await listHandoffs(req.params.taskId)
    res.json({ handoffs })
  } catch (err) {
    console.error('[OPSv2] Failed to list handoffs:', err)
    res.status(500).json({ error: 'Failed to list handoffs' })
  }
})

// POST /api/ops/tasks/:taskId/handoffs
router.post('/tasks/:taskId/handoffs', async (req, res) => {
  try {
    const tasks = await getTasks()
    const task = tasks.find(entry => entry.id === req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const pipelineConfig = await readPipelineConfig()
    const stageOrder = getStageOrder(pipelineConfig)
    const currentIndex = stageOrder.indexOf(task.stage)

    const fromStage = req.body?.fromStage || task.stage
    const toStage = req.body?.toStage || (currentIndex >= 0 ? stageOrder[currentIndex + 1] : null)

    if (!fromStage || !toStage) {
      return res.status(400).json({ error: 'fromStage and toStage are required' })
    }

    const manifestSnippet = task.manifest[mapStageToManifestSection(fromStage)] || ''
    const handoffPath = await createHandoff(task, fromStage, toStage, { manifest: manifestSnippet })
    await appendAudit(task.id, `[${nowISO()}] ${actorFromRequest(req)} created handoff ${fromStage}->${toStage}`)

    res.json({ success: true, handoffPath })
  } catch (err) {
    console.error('[OPSv2] Failed to create handoff:', err)
    res.status(500).json({ error: 'Failed to create handoff' })
  }
})

// GET /api/ops/tasks/:taskId/handoffs/:from-:to
router.get('/tasks/:taskId/handoffs/:from-:to', async (req, res) => {
  try {
    const handoff = await getHandoff(req.params.taskId, req.params.from, req.params.to)
    if (!handoff) return res.status(404).json({ error: 'Handoff not found' })
    res.json(handoff)
  } catch (err) {
    console.error('[OPSv2] Failed to get handoff:', err)
    res.status(500).json({ error: 'Failed to get handoff' })
  }
})

// POST /api/ops/tasks/:taskId/dependencies
router.post('/tasks/:taskId/dependencies', async (req, res) => {
  try {
    const depId = req.body?.dependsOnTaskId
    if (!depId || typeof depId !== 'string') {
      return res.status(400).json({ error: 'dependsOnTaskId is required' })
    }

    const tasks = await getTasks()
    const task = tasks.find(entry => entry.id === req.params.taskId)
    const depTask = tasks.find(entry => entry.id === depId)

    if (!task) return res.status(404).json({ error: 'Task not found' })
    if (!depTask) return res.status(404).json({ error: 'Dependency task not found' })
    if (task.id === depTask.id) return res.status(400).json({ error: 'Task cannot depend on itself' })

    if (!Array.isArray(task.dependencies)) task.dependencies = []
    if (!task.dependencies.includes(depId)) task.dependencies.push(depId)

    task.blockedBy = unresolvedDependencies(task, tasks)
    task.updatedAt = nowISO()

    await writeTaskAndManifest(tasks, task)

    const deps = await getDependencies()
    deps.push({
      taskId: task.id,
      dependsOnTaskId: depId,
      createdAt: nowISO(),
    })
    await saveDependencies(deps)

    res.json({ success: true, task })
  } catch (err) {
    console.error('[OPSv2] Failed to add dependency:', err)
    res.status(500).json({ error: 'Failed to add dependency' })
  }
})

// DELETE /api/ops/tasks/:taskId/dependencies/:depId
router.delete('/tasks/:taskId/dependencies/:depId', async (req, res) => {
  try {
    const tasks = await getTasks()
    const task = tasks.find(entry => entry.id === req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    task.dependencies = (task.dependencies || []).filter(depId => depId !== req.params.depId)
    task.blockedBy = unresolvedDependencies(task, tasks)
    task.updatedAt = nowISO()

    await writeTaskAndManifest(tasks, task)

    const deps = await getDependencies()
    const filtered = deps.filter(edge => !(edge.taskId === req.params.taskId && edge.dependsOnTaskId === req.params.depId))
    await saveDependencies(filtered)

    res.json({ success: true, task })
  } catch (err) {
    console.error('[OPSv2] Failed to remove dependency:', err)
    res.status(500).json({ error: 'Failed to remove dependency' })
  }
})

// GET /api/ops/dependencies/graph
router.get('/dependencies/graph', async (req, res) => {
  try {
    const dependencies = await getDependencies()
    res.json({ dependencies })
  } catch (err) {
    console.error('[OPSv2] Failed dependency graph:', err)
    res.status(500).json({ error: 'Failed dependency graph' })
  }
})

// GET /api/ops/tasks/:taskId/logs
router.get('/tasks/:taskId/logs', async (req, res) => {
  try {
    const { taskId } = req.params
    const files = await fs.readdir(OPS_PATHS.logs)
    const matched = files.filter(name => name.startsWith(`${taskId}-`) || name.startsWith(taskId))

    const logs = []
    for (const name of matched) {
      const fullPath = path.join(OPS_PATHS.logs, name)
      const content = await fs.readFile(fullPath, 'utf8')
      logs.push({ name, content })
    }

    res.json({ logs })
  } catch {
    res.json({ logs: [] })
  }
})

// GET /api/ops/tasks/:taskId/audit
router.get('/tasks/:taskId/audit', async (req, res) => {
  try {
    const audit = await readAudit(req.params.taskId)
    res.json({ audit })
  } catch (err) {
    console.error('[OPSv2] Failed to read audit:', err)
    res.status(500).json({ error: 'Failed to read audit' })
  }
})

// GET /api/ops/archive
router.get('/archive', async (req, res) => {
  try {
    const archived = await listArchivedTaskFiles()
    res.json({ archived })
  } catch (err) {
    console.error('[OPSv2] Failed to list archive:', err)
    res.status(500).json({ error: 'Failed to list archive' })
  }
})

// GET /api/ops/archive/:taskId
router.get('/archive/:taskId', async (req, res) => {
  try {
    const archived = await readArchiveTaskManifest(req.params.taskId)
    if (!archived) return res.status(404).json({ error: 'Archived task not found' })
    res.json(archived)
  } catch (err) {
    console.error('[OPSv2] Failed to read archived task:', err)
    res.status(500).json({ error: 'Failed to read archived task' })
  }
})

// POST /api/ops/archive/:taskId/restore
router.post('/archive/:taskId/restore', async (req, res) => {
  try {
    const taskId = req.params.taskId
    const archived = await readArchiveTaskManifest(taskId)
    if (!archived) return res.status(404).json({ error: 'Archived task not found' })

    const tasks = await getTasks()
    if (tasks.some(task => task.id === taskId)) {
      return res.status(409).json({ error: 'Task already exists in active tasks' })
    }

    const pipelineConfig = await readPipelineConfig()
    const now = nowISO()
    const restoredTask = {
      id: taskId,
      title: req.body?.title || `Restored ${taskId}`,
      description: req.body?.description || 'Restored from archive',
      classification: req.body?.classification || 'FULLSTACK',
      stage: 'ARCHIVE',
      assignedAgent: getAgentForStage('ARCHIVE', pipelineConfig),
      priority: req.body?.priority || 'medium',
      createdAt: now,
      updatedAt: now,
      stageHistory: [{ stage: 'ARCHIVE', enteredAt: now, exitedAt: null, duration: null }],
      manifest: {
        spec: '',
        planning: '',
        build: '',
        validate: '',
        deploy: '',
        monitor: '',
        retrospective: archived.content,
      },
      gates: buildInitialGates(pipelineConfig),
      metadata: {
        gitBranch: `ops/${taskId}`,
        commitHashes: [],
        deployUrl: null,
        errorRate: null,
        uptime: null,
      },
      dependencies: [],
      blockedBy: [],
      progress: {
        currentStep: 'Restored from archive',
        totalSteps: 1,
        completedSteps: 1,
        percentage: 100,
      },
    }

    tasks.push(restoredTask)
    await writeTaskAndManifest(tasks, restoredTask)

    const manifestPath = getManifestPath(taskId)
    await fs.writeFile(manifestPath, archived.content, 'utf8')

    res.json({ success: true, task: restoredTask })
  } catch (err) {
    console.error('[OPSv2] Failed to restore archive:', err)
    res.status(500).json({ error: 'Failed to restore archive' })
  }
})

module.exports = router
