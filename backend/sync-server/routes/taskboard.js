// ========================================
// Task Board API Routes
// JSON file-backed CRUD for tasks, projects, documents, lessons
// ========================================

const express = require('express')
const router = express.Router()
const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')
const crypto = require('crypto')

const multer = require('multer')

const DATA_DIR = '/home/clawd/.openclaw/data/taskboard'
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
const upload = multer({ dest: UPLOADS_DIR, limits: { fileSize: 10 * 1024 * 1024 } })

// Ensure data directory
if (!fsSync.existsSync(DATA_DIR)) fsSync.mkdirSync(DATA_DIR, { recursive: true })
if (!fsSync.existsSync(UPLOADS_DIR)) fsSync.mkdirSync(UPLOADS_DIR, { recursive: true })

// --- Helpers ---
function dataPath(name) { return path.join(DATA_DIR, `${name}.json`) }

async function readData(name) {
  try {
    const raw = await fs.readFile(dataPath(name), 'utf8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeData(name, data) {
  await fs.writeFile(dataPath(name), JSON.stringify(data, null, 2))
}

function genId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

function now() { return new Date().toISOString() }

// ===== TASKS =====

router.get('/tasks', async (req, res) => {
  try {
    let tasks = await readData('tasks')
    const { stage, projectId, priority, assignedAgent } = req.query
    if (stage) tasks = tasks.filter(t => t.stage === stage)
    if (projectId) tasks = tasks.filter(t => t.projectId === projectId)
    if (priority) tasks = tasks.filter(t => t.priority === priority)
    if (assignedAgent) tasks = tasks.filter(t => t.assignedAgent === assignedAgent)
    res.json({ ok: true, data: tasks })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/tasks', async (req, res) => {
  try {
    const tasks = await readData('tasks')
    const task = {
      id: genId('task'),
      title: req.body.title || 'Untitled Task',
      description: req.body.description || '',
      stage: req.body.stage || 'new_task',
      priority: req.body.priority || 'medium',
      projectId: req.body.projectId || null,
      projectColumn: req.body.projectColumn || null,
      assignedAgent: req.body.assignedAgent || null,
      createdAt: now(),
      updatedAt: now(),
      dueDate: req.body.dueDate || null,
      startTime: req.body.startTime || null,
      completedAt: null,
      notes: req.body.notes || '',
      agentOutput: '',
      completionReport: null,
      documentIds: [],
      suggestedBy: null,
      suggestReason: null,
      declinedAt: null,
      declineNotes: null,
      stageHistory: [{ stage: req.body.stage || 'new_task', at: now(), by: 'boss' }],
    }
    tasks.unshift(task)
    await writeData('tasks', tasks)
    res.json({ ok: true, data: task })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.put('/tasks/:id', async (req, res) => {
  try {
    const tasks = await readData('tasks')
    const idx = tasks.findIndex(t => t.id === req.params.id)
    if (idx === -1) return res.status(404).json({ ok: false, error: 'Task not found' })
    tasks[idx] = { ...tasks[idx], ...req.body, id: tasks[idx].id, updatedAt: now() }
    await writeData('tasks', tasks)
    res.json({ ok: true, data: tasks[idx] })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.delete('/tasks/:id', async (req, res) => {
  try {
    let tasks = await readData('tasks')
    tasks = tasks.filter(t => t.id !== req.params.id)
    await writeData('tasks', tasks)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/tasks/:id/move', async (req, res) => {
  try {
    const tasks = await readData('tasks')
    const task = tasks.find(t => t.id === req.params.id)
    if (!task) return res.status(404).json({ ok: false, error: 'Task not found' })
    const oldStage = task.stage
    task.stage = req.body.stage
    task.updatedAt = now()
    if (req.body.stage === 'completed') task.completedAt = now()
    task.stageHistory = [...(task.stageHistory || []), { stage: req.body.stage, at: now(), by: req.body.movedBy || 'unknown' }]
    await writeData('tasks', tasks)
    res.json({ ok: true, data: task })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/tasks/:id/approve', async (req, res) => {
  try {
    const tasks = await readData('tasks')
    const task = tasks.find(t => t.id === req.params.id)
    if (!task) return res.status(404).json({ ok: false, error: 'Task not found' })
    task.stage = 'completed'
    task.completedAt = now()
    task.updatedAt = now()
    task.stageHistory = [...(task.stageHistory || []), { stage: 'completed', at: now(), by: 'boss' }]
    await writeData('tasks', tasks)
    res.json({ ok: true, data: task })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/tasks/:id/decline', async (req, res) => {
  try {
    const tasks = await readData('tasks')
    const task = tasks.find(t => t.id === req.params.id)
    if (!task) return res.status(404).json({ ok: false, error: 'Task not found' })
    task.stage = 'new_task'
    task.declinedAt = now()
    task.declineNotes = req.body.notes || ''
    task.updatedAt = now()
    task.stageHistory = [...(task.stageHistory || []), { stage: 'new_task', at: now(), by: 'boss' }]
    await writeData('tasks', tasks)
    res.json({ ok: true, data: task })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/tasks/:id/completion-report', async (req, res) => {
  try {
    const tasks = await readData('tasks')
    const task = tasks.find(t => t.id === req.params.id)
    if (!task) return res.status(404).json({ ok: false, error: 'Task not found' })
    task.completionReport = req.body.report
    task.updatedAt = now()
    await writeData('tasks', tasks)
    res.json({ ok: true, data: task })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ===== SUGGESTIONS =====

// GET /api/taskboard/suggestions — smart suggestions based on task state
router.get('/suggestions', async (req, res) => {
  try {
    const tasks = await readData('tasks');
    const suggestions = [];
    const now = new Date();

    // Overdue tasks
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.stage !== 'done' && t.stage !== 'complete');
    if (overdue.length) suggestions.push({ type: 'overdue', message: `${overdue.length} overdue tasks need attention`, priority: 'high', count: overdue.length });

    // Stale tasks (no update in 48+ hours)
    const stale = tasks.filter(t => t.stage === 'in-progress' && t.updatedAt && (now - new Date(t.updatedAt)) > 48 * 3600000);
    if (stale.length) suggestions.push({ type: 'stale', message: `${stale.length} tasks haven't been updated in 48+ hours`, priority: 'medium', count: stale.length });

    // Suggestion-stage tasks (existing suggested items)
    const suggested = tasks.filter(t => t.stage === 'suggestions');
    if (suggested.length) suggestions.push({ type: 'pending_suggestions', message: `${suggested.length} suggestions awaiting review`, priority: 'low', count: suggested.length });

    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/suggestions', async (req, res) => {
  try {
    const tasks = await readData('tasks')
    const task = {
      id: genId('task'),
      title: req.body.title || 'Untitled Suggestion',
      description: req.body.description || '',
      stage: 'suggestions',
      priority: 'medium',
      projectId: req.body.projectId || null,
      assignedAgent: null,
      createdAt: now(), updatedAt: now(),
      dueDate: null, completedAt: null,
      notes: '', agentOutput: '', completionReport: null,
      documentIds: [],
      suggestedBy: 'clawd',
      suggestReason: req.body.reason || '',
      declinedAt: null, declineNotes: null,
      stageHistory: [{ stage: 'suggestions', at: now(), by: 'clawd' }],
    }
    tasks.unshift(task)
    await writeData('tasks', tasks)
    res.json({ ok: true, data: task })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/suggestions/:id/approve', async (req, res) => {
  try {
    const tasks = await readData('tasks')
    const task = tasks.find(t => t.id === req.params.id)
    if (!task) return res.status(404).json({ ok: false, error: 'Task not found' })
    task.stage = 'new_task'
    task.updatedAt = now()
    task.stageHistory = [...(task.stageHistory || []), { stage: 'new_task', at: now(), by: 'boss' }]
    await writeData('tasks', tasks)
    res.json({ ok: true, data: task })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/suggestions/:id/dismiss', async (req, res) => {
  try {
    let tasks = await readData('tasks')
    tasks = tasks.filter(t => t.id !== req.params.id)
    await writeData('tasks', tasks)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ===== PROJECTS =====

router.get('/projects', async (req, res) => {
  try {
    const projects = await readData('projects')
    res.json({ ok: true, data: projects })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/projects', async (req, res) => {
  try {
    const projects = await readData('projects')
    // Generate column IDs from template if provided
    const templateColumns = (req.body.columns || []).map((col, i) => ({
      id: genId('col'),
      name: col.name || `Column ${i + 1}`,
      color: col.color || '#71717a',
      order: col.order ?? i,
    }))

    const project = {
      id: genId('proj'),
      name: req.body.name || 'Untitled Project',
      description: req.body.description || '',
      notes: req.body.notes || '',
      status: 'active',
      template: req.body.template || 'custom',
      color: req.body.color || '#71717a',
      icon: req.body.icon || '📁',
      canvasPosition: req.body.canvasPosition || { x: 0, y: 0 },
      columns: templateColumns,
      canvasSettings: req.body.canvasSettings || { snapToGrid: true, gridSize: 20 },
      category: req.body.category || null,
      tags: req.body.tags || [],
      deadline: req.body.deadline || null,
      priority: req.body.priority || 'medium',
      pinned: req.body.pinned || false,
      metadata: req.body.metadata || {},
      createdAt: now(), updatedAt: now(),
    }
    projects.unshift(project)
    await writeData('projects', projects)
    res.json({ ok: true, data: project })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.put('/projects/canvas-positions', async (req, res) => {
  try {
    const { positions } = req.body
    if (!Array.isArray(positions)) return res.status(400).json({ ok: false, error: 'positions array required' })
    const projects = await readData('projects')
    let updated = 0
    for (const { id, canvasPosition } of positions) {
      const proj = projects.find(p => p.id === id)
      if (proj && canvasPosition) {
        proj.canvasPosition = canvasPosition
        proj.updatedAt = now()
        updated++
      }
    }
    await writeData('projects', projects)
    res.json({ ok: true, updated })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.put('/projects/:id', async (req, res) => {
  try {
    const projects = await readData('projects')
    const idx = projects.findIndex(p => p.id === req.params.id)
    if (idx === -1) return res.status(404).json({ ok: false, error: 'Project not found' })
    projects[idx] = { ...projects[idx], ...req.body, id: projects[idx].id, updatedAt: now() }
    await writeData('projects', projects)
    res.json({ ok: true, data: projects[idx] })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.delete('/projects/:id', async (req, res) => {
  try {
    const projects = await readData('projects')
    const idx = projects.findIndex(p => p.id === req.params.id)
    if (idx === -1) return res.status(404).json({ ok: false, error: 'Project not found' })
    projects[idx].status = 'archived'
    projects[idx].updatedAt = now()
    await writeData('projects', projects)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ===== DOCUMENTS =====

router.get('/documents', async (req, res) => {
  try {
    let docs = await readData('documents')
    const { category, taskId, projectId, source } = req.query
    if (category) docs = docs.filter(d => d.category === category)
    if (taskId) docs = docs.filter(d => d.taskId === taskId)
    if (projectId) docs = docs.filter(d => d.projectId === projectId)
    if (source) docs = docs.filter(d => d.source === source)
    res.json({ ok: true, data: docs })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/documents', async (req, res) => {
  try {
    const docs = await readData('documents')
    const doc = {
      id: genId('doc'),
      name: req.body.name || 'Untitled Document',
      category: req.body.category || 'attachment',
      source: req.body.source || 'boss',
      taskId: req.body.taskId || null,
      projectId: req.body.projectId || null,
      createdAt: now(),
      filePath: req.body.filePath || null,
      content: req.body.content || null,
      mimeType: req.body.mimeType || null,
      size: req.body.size || null,
      pipelineMetadata: req.body.pipelineMetadata || null,
    }
    docs.unshift(doc)
    await writeData('documents', docs)
    res.json({ ok: true, data: doc })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.put('/documents/:id', async (req, res) => {
  try {
    const docs = await readData('documents')
    const idx = docs.findIndex(d => d.id === req.params.id)
    if (idx === -1) return res.status(404).json({ ok: false, error: 'Document not found' })
    docs[idx] = { ...docs[idx], ...req.body, id: docs[idx].id }
    await writeData('documents', docs)
    res.json({ ok: true, data: docs[idx] })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.delete('/documents/:id', async (req, res) => {
  try {
    let docs = await readData('documents')
    docs = docs.filter(d => d.id !== req.params.id)
    await writeData('documents', docs)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// POST /api/taskboard/documents/upload — file upload (replaces stub)
router.post('/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const doc = {
      id: `doc-${Date.now()}`,
      filename: req.file.originalname,
      name: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
      projectId: req.body.projectId || null,
      category: req.body.category || null,
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      uploadedBy: req.body.agentId || 'dano'
    };
    const docs = await readData('documents');
    docs.push(doc);
    await writeData('documents', docs);
    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
});

// Download file
router.get('/documents/download/:id', async (req, res) => {
  try {
    const docs = await readData('documents')
    const doc = docs.find(d => d.id === req.params.id)
    if (!doc) return res.status(404).json({ ok: false, error: 'Document not found' })
    if (!doc.path || !fsSync.existsSync(doc.path)) return res.status(404).json({ ok: false, error: 'File not found on disk' })
    res.download(doc.path, doc.filename || doc.name || 'download')
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ===== LESSONS =====

router.get('/lessons', async (req, res) => {
  try {
    let lessons = await readData('lessons')
    const { agentId, taskId } = req.query
    if (agentId) lessons = lessons.filter(l => l.agentId === agentId)
    if (taskId) lessons = lessons.filter(l => l.taskId === taskId)
    res.json({ ok: true, data: lessons })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/lessons', async (req, res) => {
  try {
    const lessons = await readData('lessons')
    const lesson = {
      id: genId('lesson'),
      agentId: req.body.agentId,
      agentName: req.body.agentName,
      taskId: req.body.taskId,
      mistake: req.body.mistake || '',
      cause: req.body.cause || '',
      correction: req.body.correction || '',
      fix: req.body.fix || '',
      createdAt: now(),
      sharedWith: req.body.sharedWith || [],
    }
    lessons.unshift(lesson)
    await writeData('lessons', lessons)
    res.json({ ok: true, data: lesson })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ── Canvas Objects (sticky notes, frames, text labels, connectors) ──

router.get('/canvas-objects', async (req, res) => {
  try {
    const objects = await readData('canvasObjects')
    res.json({ ok: true, data: objects || [] })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/canvas-objects', async (req, res) => {
  try {
    const objects = await readData('canvasObjects') || []
    const obj = {
      id: genId('obj'),
      type: req.body.type || 'sticky',
      position: req.body.position || { x: 0, y: 0 },
      size: req.body.size || { width: 180, height: 180 },
      color: req.body.color || '#fef08a',
      zIndex: req.body.zIndex || 1,
      locked: req.body.locked || false,
      data: req.body.data || {},
      createdAt: now(),
      updatedAt: now(),
    }
    objects.push(obj)
    await writeData('canvasObjects', objects)
    res.json({ ok: true, data: obj })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.put('/canvas-objects/:id', async (req, res) => {
  try {
    const objects = await readData('canvasObjects') || []
    const idx = objects.findIndex(o => o.id === req.params.id)
    if (idx === -1) return res.status(404).json({ ok: false, error: 'Not found' })
    objects[idx] = { ...objects[idx], ...req.body, updatedAt: now() }
    await writeData('canvasObjects', objects)
    res.json({ ok: true, data: objects[idx] })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.delete('/canvas-objects/:id', async (req, res) => {
  try {
    let objects = await readData('canvasObjects') || []
    objects = objects.filter(o => o.id !== req.params.id)
    await writeData('canvasObjects', objects)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.put('/canvas-objects/batch-move', async (req, res) => {
  try {
    const { positions } = req.body
    if (!Array.isArray(positions)) return res.status(400).json({ ok: false, error: 'positions array required' })
    const objects = await readData('canvasObjects') || []
    let updated = 0
    for (const { id, position } of positions) {
      const obj = objects.find(o => o.id === id)
      if (obj && position) { obj.position = position; obj.updatedAt = now(); updated++ }
    }
    await writeData('canvasObjects', objects)
    res.json({ ok: true, updated })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
