export const OPS_STAGE_ORDER = ['SPEC', 'PLANNING', 'BUILD', 'VALIDATE', 'DEPLOY', 'MONITOR', 'ARCHIVE']

export const OPS_STAGE_CONFIG = {
  SPEC: { label: 'SPEC', color: '#8b5cf6', description: 'Requirements and approval' },
  PLANNING: { label: 'PLANNING', color: '#3b82f6', description: 'Architecture and plan' },
  BUILD: { label: 'BUILD', color: '#f59e0b', description: 'Implementation' },
  VALIDATE: { label: 'VALIDATE', color: '#10b981', description: 'Tests and review' },
  DEPLOY: { label: 'DEPLOY', color: '#06b6d4', description: 'Release and verification' },
  MONITOR: { label: 'MONITOR', color: '#ef4444', description: 'Production monitoring' },
  ARCHIVE: { label: 'ARCHIVE', color: '#6b7280', description: 'Completed and archived' },
}

export const OPS_CLASSIFICATIONS = [
  { id: 'FRONTEND', label: 'Frontend', color: '#3b82f6' },
  { id: 'BACKEND', label: 'Backend', color: '#10b981' },
  { id: 'FULLSTACK', label: 'Full-Stack', color: '#8b5cf6' },
  { id: 'AGENT-CONFIG', label: 'Agent Config', color: '#f59e0b' },
  { id: 'RESEARCH', label: 'Research', color: '#06b6d4' },
]

export const OPS_AGENT_CONFIG = {
  dano: { label: 'DANO', color: '#3b82f6' },
  clawd: { label: 'Clawd', color: '#8b5cf6' },
  codex: { label: 'Codex', color: '#f97316' },
  sentinel: { label: 'Sentinel', color: '#06b6d4' },
  kyle: { label: 'Kyle', color: '#f59e0b' },
}

export const OPS_PRIORITIES = [
  { id: 'low', label: 'Low', color: '#4ade80' },
  { id: 'medium', label: 'Medium', color: '#f59e0b' },
  { id: 'high', label: 'High', color: '#ef4444' },
  { id: 'urgent', label: 'Urgent', color: '#b91c1c' },
]

export function isValidStageTransition(fromStage, toStage) {
  const fromIndex = OPS_STAGE_ORDER.indexOf(fromStage)
  const toIndex = OPS_STAGE_ORDER.indexOf(toStage)
  if (fromIndex === -1 || toIndex === -1) return false
  return Math.abs(toIndex - fromIndex) === 1
}

export function stageForDropTarget(targetId, tasks = []) {
  if (OPS_STAGE_ORDER.includes(targetId)) return targetId
  const targetTask = tasks.find(task => task.id === targetId)
  return targetTask?.stage || null
}
