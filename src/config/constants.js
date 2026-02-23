// ========================================
// Application Constants
// Agent hierarchy, model fleet, cron jobs
// ========================================

export const TABS = {
  TASK_BOARD: 'task-board',
  ORG_CHART: 'org-chart',
  WORKSPACES: 'workspaces',
  OPS: 'ops',
  CRM: 'crm',
  PROJECTS: 'projects',
  STAND_UP: 'stand-up',
}

export const TAB_LABELS = {
  [TABS.TASK_BOARD]: 'Task Board',
  [TABS.ORG_CHART]: 'Org Chart',
  [TABS.WORKSPACES]: 'Workspaces',
  [TABS.OPS]: 'Ops Board',
  [TABS.CRM]: 'CRM',
  [TABS.PROJECTS]: 'Projects',
  [TABS.STAND_UP]: 'Stand-Up',
}

export const AGENT_COLORS = {
  dano: '#3b82f6',
  clawd: '#8b5cf6',
  codex: '#f97316',
  kyle: '#f59e0b',
  sentinel: '#06b6d4',
}

export const AGENT_HIERARCHY = {
  ceo: { id: 'ceo', name: 'DANO', role: 'CEO', description: 'Chief Executive Officer — Human Operator', isHuman: true, parent: null, designation: null },
  clawd: { id: 'clawd', name: 'Clawd', role: 'COO', description: 'Chief Operating Officer — Delegation, orchestration, reporting', isHuman: false, parent: 'ceo', model: 'claude-sonnet-4-6', designation: 'Main' },
  codex: { id: 'codex', name: 'Codex', role: 'Builder', description: 'Build execution, code changes, and implementation loops', isHuman: false, parent: 'clawd', model: 'openai-codex/gpt-5.3-codex', designation: 'Main' },
  sentinel: { id: 'sentinel', name: 'Sentinel', role: 'QA Inspector', description: 'QA, security audits, compliance, failure pattern detection', isHuman: false, parent: 'clawd', model: 'openai-codex/gpt-5.3-codex', designation: 'On-Demand' },
  kyle: { id: 'kyle', name: 'Kyle', role: 'Desktop Agent', description: 'Mac desktop agent with local system and browser execution', isHuman: false, parent: 'clawd', model: 'openai-codex/gpt-5.3-codex', designation: 'Desktop', online: 'conditional' },
}

export const MODEL_FLEET = [
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', tier: 'flagship' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', tier: 'standard' },
  { id: 'codex-5.3', name: 'Codex 5.3', tier: 'code' },
]

export const CRON_JOBS = []

export const REGISTERED_AGENTS = ['clawd', 'codex', 'sentinel', 'kyle']

export const THEMES = ['forge', 'charcoal', 'tokyo', 'steel', 'offwhite', 'white']
export const DEFAULT_THEME = 'forge'

export const FILE_PREVIEWS = {}

export const ACTIVITY_TIMELINE = {}
