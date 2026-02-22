const fsSync = require('fs')
const path = require('path')
const { OPS_PATHS, OPS_ROOT } = require('./opsPaths')

const SEEDS_DIR = path.resolve(__dirname, '../ops-seeds')

const REQUIRED_DIRS = [
  OPS_PATHS.root,
  OPS_PATHS.manifests,
  OPS_PATHS.checkpoints,
  OPS_PATHS.handoffs,
  OPS_PATHS.logs,
  OPS_PATHS.audit,
  OPS_PATHS.archive,
  OPS_PATHS.prompts,
  OPS_PATHS.promptsBuild,
  OPS_PATHS.promptsAgents,
  OPS_PATHS.promptsHandoffs,
  OPS_PATHS.patterns,
  OPS_PATHS.antiPatterns,
  OPS_PATHS.config,
  OPS_PATHS.data,
]

const DEFAULT_HANDOFF_TEMPLATES = {
  'SPEC_TO_PLANNING.md': `# Handoff: SPEC -> PLANNING\n\n**Task:** {taskId} - {title}\n\n## Context\n{manifest}\n\n## Notes\n- Refine architecture and implementation plan.\n`,
  'PLANNING_TO_BUILD.md': `# Handoff: PLANNING -> BUILD\n\n**Task:** {taskId} - {title}\n\n## Planning Summary\n{manifest}\n\n## Build Checklist\n- [ ] Create files listed in planning section\n- [ ] Implement listed steps\n- [ ] Run local tests\n- [ ] Ensure build succeeds\n`,
  'BUILD_TO_VALIDATE.md': `# Handoff: BUILD -> VALIDATE\n\n**Task:** {taskId} - {title}\n\n## Build Summary\n{manifest}\n\n## Validation Focus\n- [ ] Verify build and tests\n- [ ] Review security scan\n`,
  'VALIDATE_TO_DEPLOY.md': `# Handoff: VALIDATE -> DEPLOY\n\n**Task:** {taskId} - {title}\n\n## Validation Summary\n{manifest}\n\n## Deploy Checklist\n- [ ] Execute deploy workflow\n- [ ] Verify health checks\n`,
  'DEPLOY_TO_MONITOR.md': `# Handoff: DEPLOY -> MONITOR\n\n**Task:** {taskId} - {title}\n\n## Deploy Summary\n{manifest}\n\n## Monitoring Checklist\n- [ ] Track error rate\n- [ ] Track uptime\n`,
  'MONITOR_TO_ARCHIVE.md': `# Handoff: MONITOR -> ARCHIVE\n\n**Task:** {taskId} - {title}\n\n## Monitoring Summary\n{manifest}\n\n## Archive Checklist\n- [ ] Capture retrospective\n- [ ] Archive manifest\n`,
}

function ensureDir(dir) {
  fsSync.mkdirSync(dir, { recursive: true })
}

function readSeed(seedName, fallbackData) {
  const seedPath = path.join(SEEDS_DIR, seedName)
  if (!fsSync.existsSync(seedPath)) return fallbackData
  try {
    const raw = fsSync.readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, '')
    return JSON.parse(raw)
  } catch {
    return fallbackData
  }
}

function seedJsonFileIfMissing(targetPath, seedName, fallbackData) {
  if (fsSync.existsSync(targetPath)) return false
  const data = readSeed(seedName, fallbackData)
  fsSync.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8')
  return true
}

function ensureJsonArrayFile(targetPath) {
  if (!fsSync.existsSync(targetPath)) {
    fsSync.writeFileSync(targetPath, '[]\n', 'utf8')
    return true
  }

  try {
    const parsed = JSON.parse(fsSync.readFileSync(targetPath, 'utf8'))
    if (!Array.isArray(parsed)) {
      fsSync.writeFileSync(targetPath, '[]\n', 'utf8')
      return true
    }
  } catch {
    fsSync.writeFileSync(targetPath, '[]\n', 'utf8')
    return true
  }

  return false
}

function seedHandoffTemplates() {
  for (const [filename, template] of Object.entries(DEFAULT_HANDOFF_TEMPLATES)) {
    const filePath = path.join(OPS_PATHS.promptsHandoffs, filename)
    if (!fsSync.existsSync(filePath)) {
      fsSync.writeFileSync(filePath, template, 'utf8')
    }
  }
}

function bootstrapOpsWorkspace(logger = console) {
  const result = {
    root: OPS_ROOT,
    directoriesCreated: 0,
    filesSeeded: [],
  }

  for (const dir of REQUIRED_DIRS) {
    if (!fsSync.existsSync(dir)) result.directoriesCreated += 1
    ensureDir(dir)
  }

  if (seedJsonFileIfMissing(OPS_PATHS.pipelineConfig, 'pipeline.json', { stages: [] })) {
    result.filesSeeded.push('config/pipeline.json')
  }

  if (seedJsonFileIfMissing(OPS_PATHS.agentsConfig, 'agents.json', { agents: [] })) {
    result.filesSeeded.push('config/agents.json')
  }

  if (seedJsonFileIfMissing(OPS_PATHS.classificationsConfig, 'classifications.json', { classifications: [] })) {
    result.filesSeeded.push('config/classifications.json')
  }

  if (ensureJsonArrayFile(OPS_PATHS.tasksData)) {
    result.filesSeeded.push('data/tasks.json')
  }

  if (ensureJsonArrayFile(OPS_PATHS.dependenciesData)) {
    result.filesSeeded.push('data/dependencies.json')
  }

  seedHandoffTemplates()

  try {
    const pipeline = JSON.parse(fsSync.readFileSync(OPS_PATHS.pipelineConfig, 'utf8'))
    const agents = JSON.parse(fsSync.readFileSync(OPS_PATHS.agentsConfig, 'utf8'))
    const classifications = JSON.parse(fsSync.readFileSync(OPS_PATHS.classificationsConfig, 'utf8'))
    result.counts = {
      stages: Array.isArray(pipeline.stages) ? pipeline.stages.length : 0,
      agents: Array.isArray(agents.agents) ? agents.agents.length : 0,
      classifications: Array.isArray(classifications.classifications) ? classifications.classifications.length : 0,
    }
  } catch {
    result.counts = { stages: 0, agents: 0, classifications: 0 }
  }

  logger.log(`[OPS] Workspace bootstrap ready at ${OPS_ROOT}`)
  logger.log(`[OPS] Stages=${result.counts.stages}, Agents=${result.counts.agents}, Classifications=${result.counts.classifications}`)

  return result
}

module.exports = {
  bootstrapOpsWorkspace,
}
