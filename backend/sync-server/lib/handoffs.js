const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')
const { OPS_PATHS } = require('./opsPaths')

function handoffFilename(taskId, fromStage, toStage) {
  return `${taskId}-${fromStage}-${toStage}.md`
}

function defaultHandoffTemplate(fromStage, toStage) {
  return `# Handoff: ${fromStage} -> ${toStage}

**Task:** {taskId} - {title}

## Summary
{manifest}
`
}

async function loadTemplate(fromStage, toStage) {
  const filename = `${fromStage}_TO_${toStage}.md`
  const templatePath = path.join(OPS_PATHS.promptsHandoffs, filename)
  if (fsSync.existsSync(templatePath)) {
    return fs.readFile(templatePath, 'utf8')
  }
  return defaultHandoffTemplate(fromStage, toStage)
}

function applyTemplate(template, task, context = {}) {
  return template
    .replaceAll('{taskId}', task.id)
    .replaceAll('{title}', task.title)
    .replaceAll('{fromStage}', context.fromStage || '')
    .replaceAll('{toStage}', context.toStage || '')
    .replaceAll('{agent}', task.assignedAgent || 'unassigned')
    .replaceAll('{manifest}', context.manifest || '')
}

async function createHandoff(task, fromStage, toStage, context = {}) {
  const template = await loadTemplate(fromStage, toStage)
  const content = applyTemplate(template, task, {
    ...context,
    fromStage,
    toStage,
  })

  const filePath = path.join(OPS_PATHS.handoffs, handoffFilename(task.id, fromStage, toStage))
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf8')
  return filePath
}

async function listHandoffs(taskId) {
  try {
    const files = await fs.readdir(OPS_PATHS.handoffs)
    return files
      .filter(name => name.startsWith(`${taskId}-`) && name.endsWith('.md'))
      .sort()
      .map(name => path.join(OPS_PATHS.handoffs, name))
  } catch {
    return []
  }
}

async function getHandoff(taskId, fromStage, toStage) {
  const filePath = path.join(OPS_PATHS.handoffs, handoffFilename(taskId, fromStage, toStage))
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return { filePath, content }
  } catch {
    return null
  }
}

module.exports = {
  createHandoff,
  listHandoffs,
  getHandoff,
}
