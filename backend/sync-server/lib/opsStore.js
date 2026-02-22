const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')
const crypto = require('crypto')
const { OPS_PATHS } = require('./opsPaths')

function nowISO() {
  return new Date().toISOString()
}

async function readJSON(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function writeJSON(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function generateTaskId() {
  const ts = Date.now()
  const rnd = crypto.randomBytes(3).toString('hex')
  return `TASK-${ts}-${rnd}`
}

async function getTasks() {
  const tasks = await readJSON(OPS_PATHS.tasksData, [])
  return Array.isArray(tasks) ? tasks : []
}

async function saveTasks(tasks) {
  await writeJSON(OPS_PATHS.tasksData, tasks)
}

async function getDependencies() {
  const deps = await readJSON(OPS_PATHS.dependenciesData, [])
  return Array.isArray(deps) ? deps : []
}

async function saveDependencies(dependencies) {
  await writeJSON(OPS_PATHS.dependenciesData, dependencies)
}

async function readPipelineConfig() {
  return readJSON(OPS_PATHS.pipelineConfig, { stages: [] })
}

async function readAgentsConfig() {
  return readJSON(OPS_PATHS.agentsConfig, { agents: [] })
}

async function readClassificationsConfig() {
  return readJSON(OPS_PATHS.classificationsConfig, { classifications: [] })
}

function getStageOrder(pipelineConfig) {
  return Array.isArray(pipelineConfig?.stages)
    ? pipelineConfig.stages.map(stage => stage.id)
    : []
}

function getStageConfig(pipelineConfig, stageId) {
  return (pipelineConfig?.stages || []).find(stage => stage.id === stageId) || null
}

function getAgentForStage(stageId, pipelineConfig) {
  const stageConfig = getStageConfig(pipelineConfig, stageId)
  if (!stageConfig || !Array.isArray(stageConfig.assignedAgents)) return null
  return stageConfig.assignedAgents[0] || null
}

async function appendAudit(taskId, line) {
  const filePath = path.join(OPS_PATHS.audit, `${taskId}.log`)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.appendFile(filePath, line.endsWith('\n') ? line : `${line}\n`, 'utf8')
}

async function readAudit(taskId) {
  const filePath = path.join(OPS_PATHS.audit, `${taskId}.log`)
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

async function moveManifestToArchive(taskId, manifestPath) {
  const now = new Date()
  const archiveFolder = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const archiveDir = path.join(OPS_PATHS.archive, archiveFolder)
  await fs.mkdir(archiveDir, { recursive: true })
  const targetPath = path.join(archiveDir, `${taskId}.md`)

  try {
    await fs.rename(manifestPath, targetPath)
  } catch {
    const fallbackContent = fsSync.existsSync(manifestPath)
      ? await fs.readFile(manifestPath, 'utf8')
      : `# ${taskId}\n\n_Manifest unavailable during archive._\n`
    await fs.writeFile(targetPath, fallbackContent, 'utf8')
    if (fsSync.existsSync(manifestPath)) {
      await fs.unlink(manifestPath)
    }
  }

  return targetPath
}

async function readArchiveTaskManifest(taskId) {
  try {
    const months = await fs.readdir(OPS_PATHS.archive)
    for (const month of months.sort().reverse()) {
      const candidate = path.join(OPS_PATHS.archive, month, `${taskId}.md`)
      if (fsSync.existsSync(candidate)) {
        return { path: candidate, content: await fs.readFile(candidate, 'utf8') }
      }
    }
  } catch {
    return null
  }

  return null
}

async function listArchivedTaskFiles() {
  const results = []
  try {
    const months = await fs.readdir(OPS_PATHS.archive)
    for (const month of months.sort().reverse()) {
      const monthDir = path.join(OPS_PATHS.archive, month)
      let files = []
      try {
        files = await fs.readdir(monthDir)
      } catch {
        files = []
      }

      for (const filename of files) {
        if (!filename.endsWith('.md')) continue
        const fullPath = path.join(monthDir, filename)
        const stat = await fs.stat(fullPath)
        results.push({
          taskId: path.basename(filename, '.md'),
          archivedAt: stat.mtime.toISOString(),
          month,
          path: fullPath,
        })
      }
    }
  } catch {
    return []
  }
  return results
}

async function createNotification(notification) {
  const dataDir = '/home/clawd/.openclaw/data/notifications'
  const dataFile = path.join(dataDir, 'notifications.json')
  await fs.mkdir(dataDir, { recursive: true })

  let notifications = []
  try {
    notifications = JSON.parse(await fs.readFile(dataFile, 'utf8'))
  } catch {
    notifications = []
  }

  const notif = {
    id: `notif_${crypto.randomBytes(8).toString('hex')}`,
    title: notification.title || 'Notification',
    description: notification.description || '',
    type: notification.type || 'info',
    read: false,
    createdAt: nowISO(),
    meta: notification.meta || {},
  }

  notifications.unshift(notif)
  if (notifications.length > 200) notifications.length = 200
  await fs.writeFile(dataFile, JSON.stringify(notifications, null, 2), 'utf8')
  return notif
}

module.exports = {
  nowISO,
  generateTaskId,
  getTasks,
  saveTasks,
  getDependencies,
  saveDependencies,
  readPipelineConfig,
  readAgentsConfig,
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
}
