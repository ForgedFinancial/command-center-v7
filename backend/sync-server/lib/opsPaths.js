const path = require('path')

const DEFAULT_OPS_ROOT = '/home/clawd/.openclaw/ops'
const OPS_ROOT = process.env.OPENCLAW_OPS_ROOT || DEFAULT_OPS_ROOT

const OPS_PATHS = {
  root: OPS_ROOT,
  manifests: path.join(OPS_ROOT, 'manifests'),
  checkpoints: path.join(OPS_ROOT, 'checkpoints'),
  handoffs: path.join(OPS_ROOT, 'handoffs'),
  logs: path.join(OPS_ROOT, 'logs'),
  audit: path.join(OPS_ROOT, 'audit'),
  archive: path.join(OPS_ROOT, 'archive'),
  patterns: path.join(OPS_ROOT, 'patterns'),
  antiPatterns: path.join(OPS_ROOT, 'anti-patterns'),
  config: path.join(OPS_ROOT, 'config'),
  data: path.join(OPS_ROOT, 'data'),
  prompts: path.join(OPS_ROOT, 'prompts'),
  promptsBuild: path.join(OPS_ROOT, 'prompts', 'build'),
  promptsAgents: path.join(OPS_ROOT, 'prompts', 'agents'),
  promptsHandoffs: path.join(OPS_ROOT, 'prompts', 'handoffs'),
  pipelineConfig: path.join(OPS_ROOT, 'config', 'pipeline.json'),
  agentsConfig: path.join(OPS_ROOT, 'config', 'agents.json'),
  classificationsConfig: path.join(OPS_ROOT, 'config', 'classifications.json'),
  tasksData: path.join(OPS_ROOT, 'data', 'tasks.json'),
  dependenciesData: path.join(OPS_ROOT, 'data', 'dependencies.json'),
}

function resolveOpsPath(...parts) {
  return path.join(OPS_ROOT, ...parts)
}

module.exports = {
  DEFAULT_OPS_ROOT,
  OPS_ROOT,
  OPS_PATHS,
  resolveOpsPath,
}
