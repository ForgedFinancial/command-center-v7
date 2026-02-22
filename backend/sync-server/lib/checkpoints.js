const fs = require('fs').promises
const path = require('path')
const { OPS_PATHS } = require('./opsPaths')

function checkpointFilename(messageCount = 0) {
  const suffix = String(Number(messageCount) || 0).padStart(6, '0')
  return `checkpoint-${suffix}.json`
}

async function createCheckpoint(task, messageCount = 0) {
  const checkpointDir = path.join(OPS_PATHS.checkpoints, task.id)
  await fs.mkdir(checkpointDir, { recursive: true })

  const checkpoint = {
    taskId: task.id,
    messageCount: Number(messageCount) || 0,
    timestamp: new Date().toISOString(),
    stage: task.stage,
    manifest: task.manifest,
    gates: task.gates,
    progress: task.progress,
    metadata: task.metadata || {},
  }

  const checkpointPath = path.join(checkpointDir, checkpointFilename(messageCount))
  await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf8')
  return checkpointPath
}

async function listCheckpoints(taskId) {
  const checkpointDir = path.join(OPS_PATHS.checkpoints, taskId)
  try {
    const files = (await fs.readdir(checkpointDir))
      .filter(name => name.startsWith('checkpoint-') && name.endsWith('.json'))
      .sort()
    return files.map(name => path.join(checkpointDir, name))
  } catch {
    return []
  }
}

async function getLatestCheckpoint(taskId) {
  const checkpoints = await listCheckpoints(taskId)
  if (checkpoints.length === 0) return null

  const latest = checkpoints[checkpoints.length - 1]
  try {
    const content = await fs.readFile(latest, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

module.exports = {
  createCheckpoint,
  listCheckpoints,
  getLatestCheckpoint,
}
