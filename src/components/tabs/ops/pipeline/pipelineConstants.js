// Pipeline stage configuration — V2
export const STAGES = ['INTAKE', 'SPEC', 'REVIEW', 'BUILDING', 'QA', 'BOSS_REVIEW', 'DONE']

export const STAGE_CONFIG = {
  INTAKE:      { label: 'Intake',       desc: 'Submitted, awaiting pickup',   icon: '📥', color: '#6366f1' },
  SPEC:        { label: 'Spec',         desc: 'Soren architecting plan',      icon: '📐', color: '#8b5cf6' },
  REVIEW:      { label: 'Review',       desc: 'Agents reviewing spec',        icon: '👁️', color: '#a78bfa' },
  BUILDING:    { label: 'Building',     desc: 'Mason building',               icon: '🔨', color: '#f59e0b' },
  QA:          { label: 'QA',           desc: 'Sentinel inspecting',          icon: '🔍', color: '#06b6d4' },
  BOSS_REVIEW: { label: 'Boss Review',  desc: 'Ready for Boss evaluation',    icon: '👔', color: '#10b981' },
  DONE:        { label: 'Done',         desc: 'Approved & closed',            icon: '✅', color: '#22c55e', muted: true },
}

export const AGENTS = {
  dano:     { label: 'Boss',      color: '#f59e0b', icon: '👔' },
  clawd:    { label: 'Clawd',     color: '#8b5cf6', icon: '🐾' },
  soren:    { label: 'Soren',     color: '#6366f1', icon: '📐' },
  mason:    { label: 'Mason',     color: '#f97316', icon: '🔨' },
  sentinel: { label: 'Sentinel',  color: '#06b6d4', icon: '🔍' },
  kyle:     { label: 'Kyle',      color: '#10b981', icon: '🖥️' },
}

export const TASK_TYPES = [
  { value: 'build',    label: '🔨 Build',    desc: 'Mason constructs something new' },
  { value: 'design',   label: '📐 Design',   desc: 'Soren architects a plan or spec' },
  { value: 'fix',      label: '🔧 Fix',      desc: 'Something is broken, needs repair' },
  { value: 'inspect',  label: '🔍 Inspect',  desc: 'Sentinel audits or reviews' },
  { value: 'research', label: '🔬 Research', desc: 'Investigate and report back' },
]

export const PRIORITIES = [
  { value: 'critical', label: '🔴 Critical', color: '#ef4444' },
  { value: 'high',     label: '🟠 High',     color: '#f97316' },
  { value: 'normal',   label: '🟡 Normal',   color: '#eab308' },
  { value: 'low',      label: '🔵 Low',      color: '#3b82f6' },
]

export const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  normal: '#eab308',
  low: '#3b82f6',
}

export const TIERS = [
  { value: 'patch',   label: '🩹 Patch',   desc: 'Small fix, config change' },
  { value: 'build',   label: '🏗️ Build',   desc: 'Feature, integration, most work' },
  { value: 'system',  label: '⚙️ System',  desc: 'New infrastructure, architectural' },
  { value: 'recon',   label: '🔭 Recon',   desc: 'Research, analysis, blueprint' },
]

// Smart stage routing: assignee → starting stage
export const AGENT_STAGE_ROUTING = {
  soren:    'SPEC',
  mason:    'BUILDING',
  sentinel: 'QA',
  clawd:    'INTAKE',
  dano:     'INTAKE',
  kyle:     'INTAKE',
}

// Time-in-stage thresholds (ms) for color coding
export const TIME_THRESHOLDS = {
  GREEN: 60 * 60 * 1000,
  YELLOW: 4 * 60 * 60 * 1000,
  ORANGE: 12 * 60 * 60 * 1000,
}

export function getTimeColor(stageEnteredAt) {
  const elapsed = Date.now() - new Date(stageEnteredAt).getTime()
  if (elapsed < TIME_THRESHOLDS.GREEN) return '#10b981'
  if (elapsed < TIME_THRESHOLDS.YELLOW) return '#f59e0b'
  if (elapsed < TIME_THRESHOLDS.ORANGE) return '#f97316'
  return '#ef4444'
}
