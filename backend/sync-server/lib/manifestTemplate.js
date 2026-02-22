const fs = require('fs').promises
const path = require('path')
const { OPS_PATHS } = require('./opsPaths')

const MANIFEST_SECTIONS = [
  'spec',
  'planning',
  'build',
  'validate',
  'deploy',
  'monitor',
  'retrospective',
]

function ensureSectionContent(task, section) {
  const content = task.manifest && typeof task.manifest[section] === 'string' ? task.manifest[section].trim() : ''
  return content.length > 0 ? content : '_Pending_'
}

function renderManifest(task) {
  return `# ${task.id}: ${task.title}

## METADATA
- **ID:** ${task.id}
- **Classification:** ${task.classification}
- **Stage:** ${task.stage}
- **Assigned Agent:** ${task.assignedAgent || 'None'}
- **Priority:** ${task.priority}
- **Created:** ${task.createdAt}
- **Last Updated:** ${task.updatedAt}
- **Git Branch:** ${task.metadata?.gitBranch || `ops/${task.id}`}
- **Dependencies:** ${(task.dependencies || []).join(', ') || 'None'}

---

## SPEC

${ensureSectionContent(task, 'spec')}

---

## PLANNING

${ensureSectionContent(task, 'planning')}

---

## BUILD

${ensureSectionContent(task, 'build')}

---

## VALIDATE

${ensureSectionContent(task, 'validate')}

---

## DEPLOY

${ensureSectionContent(task, 'deploy')}

---

## MONITOR

${ensureSectionContent(task, 'monitor')}

---

## RETROSPECTIVE

${ensureSectionContent(task, 'retrospective')}
`
}

function getManifestPath(taskId) {
  return path.join(OPS_PATHS.manifests, `${taskId}.md`)
}

async function writeTaskManifest(task) {
  const manifestPath = getManifestPath(task.id)
  await fs.mkdir(path.dirname(manifestPath), { recursive: true })
  await fs.writeFile(manifestPath, renderManifest(task), 'utf8')
  return manifestPath
}

async function readTaskManifest(taskId) {
  const manifestPath = getManifestPath(taskId)
  return fs.readFile(manifestPath, 'utf8')
}

async function ensureTaskManifest(task) {
  try {
    await fs.access(getManifestPath(task.id))
    return getManifestPath(task.id)
  } catch {
    return writeTaskManifest(task)
  }
}

function normalizeManifestSection(section) {
  const normalized = String(section || '').toLowerCase()
  return MANIFEST_SECTIONS.includes(normalized) ? normalized : null
}

module.exports = {
  MANIFEST_SECTIONS,
  getManifestPath,
  renderManifest,
  writeTaskManifest,
  readTaskManifest,
  ensureTaskManifest,
  normalizeManifestSection,
}
