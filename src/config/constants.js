// ========================================
// Application Constants
// Agent hierarchy, model fleet, cron jobs
// ========================================

export const TABS = {
  TASK_BOARD: 'task-board',
  ORG_CHART: 'org-chart',
  WORKSPACES: 'workspaces',
  CRM: 'crm',
}

export const TAB_LABELS = {
  [TABS.TASK_BOARD]: 'Task Board',
  [TABS.ORG_CHART]: 'Org Chart',
  [TABS.WORKSPACES]: 'Workspaces',
  [TABS.CRM]: 'CRM',
}

export const AGENT_HIERARCHY = {
  ceo: { id: 'ceo', name: 'DANO', role: 'CEO', description: 'Chief Executive Officer — Human Operator', isHuman: true, parent: null, designation: null },
  clawd: { id: 'clawd', name: 'Clawd', role: 'COO', description: 'Chief Operating Officer — Delegation, orchestration, reporting', isHuman: false, parent: 'ceo', model: 'claude-opus-4-6', designation: 'Main' },
  architect: { id: 'architect', name: 'Soren', role: 'The Planner', description: 'System design, build plans, requirements, research', isHuman: false, parent: 'clawd', model: 'claude-opus-4-6', designation: 'FF-PLN-001' },
  mason: { id: 'mason', name: 'Mason', role: 'The Builder', description: 'Code, integrations, automations, SOPs, documentation', isHuman: false, parent: 'clawd', model: 'claude-opus-4-6', designation: 'FF-BLD-001' },
  sentinel: { id: 'sentinel', name: 'Sentinel', role: 'The Inspector', description: 'QA, security audits, compliance, failure patterns', isHuman: false, parent: 'clawd', model: 'claude-opus-4-6', designation: 'FF-QA-001' },
  scout: { id: 'scout', name: 'Scout', role: 'Research', description: 'Competitors, carrier APIs, compliance, market trends', isHuman: false, parent: 'architect', model: 'claude-sonnet-4', designation: 'CC-RES-001' },
  cartographer: { id: 'cartographer', name: 'Cartographer', role: 'Documentation', description: 'System diagrams, data flows, process maps', isHuman: false, parent: 'architect', model: 'claude-sonnet-4', designation: 'CC-MAP-001' },
  coder: { id: 'coder', name: 'Coder', role: 'Code Generation', description: 'Components, endpoints, schemas, utilities', isHuman: false, parent: 'mason', model: 'codex-5.3', designation: 'CC-CODE-001' },
  wirer: { id: 'wirer', name: 'Wirer', role: 'Automation', description: 'n8n workflows, GHL automations, webhooks', isHuman: false, parent: 'mason', model: 'codex-5.3', designation: 'CC-AUTO-001' },
  scribe: { id: 'scribe', name: 'Scribe', role: 'Documentation', description: 'SOPs, process docs, training materials, READMEs', isHuman: false, parent: 'mason', model: 'claude-sonnet-4', designation: 'CC-DOC-001' },
  probe: { id: 'probe', name: 'Probe', role: 'Automated Testing', description: 'Test suites, integration tests, smoke tests', isHuman: false, parent: 'sentinel', model: 'codex-5.3', designation: 'CC-QA-001' },
  auditor: { id: 'auditor', name: 'Auditor', role: 'Security & Compliance', description: 'Vulnerability scans, compliance checks, access audits', isHuman: false, parent: 'sentinel', model: 'claude-opus-4-6', designation: 'CC-SEC-001' },
}

export const MODEL_FLEET = [
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', tier: 'flagship' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', tier: 'standard' },
  { id: 'codex-5.3', name: 'Codex 5.3', tier: 'code' },
]

export const CRON_JOBS = []

export const REGISTERED_AGENTS = ['clawd', 'architect', 'mason', 'sentinel']

export const THEMES = ['forge', 'charcoal', 'tokyo', 'steel', 'offwhite', 'white']
export const DEFAULT_THEME = 'forge'

export const FILE_PREVIEWS = {}

export const ACTIVITY_TIMELINE = {}
