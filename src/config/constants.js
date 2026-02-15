// ========================================
// Application Constants
// Agent hierarchy, model fleet, cron jobs
// ========================================

export const TABS = {
  TASK_MANAGER: 'task-manager',
  ORG_CHART: 'org-chart',
  WORKSPACES: 'workspaces',
}

export const TAB_LABELS = {
  [TABS.TASK_MANAGER]: 'Task Manager',
  [TABS.ORG_CHART]: 'Org Chart',
  [TABS.WORKSPACES]: 'Workspaces',
}

export const AGENT_HIERARCHY = {
  ceo: { id: 'ceo', name: 'DANO', role: 'CEO', description: 'Chief Executive Officer — Human Operator', isHuman: true, parent: null, designation: null },
  clawd: { id: 'clawd', name: 'Clawd', role: 'COO', description: 'Chief Operating Officer — Delegation, orchestration, reporting', isHuman: false, parent: 'ceo', model: 'claude-opus-4-6', designation: 'Main' },
  architect: { id: 'architect', name: 'Architect', role: 'The Planner', description: 'System design, build plans, requirements, research', isHuman: false, parent: 'clawd', model: 'claude-opus-4-6', designation: 'FF-PLN-001' },
  mason: { id: 'mason', name: 'Mason', role: 'The Builder', description: 'Code, integrations, automations, SOPs, documentation', isHuman: false, parent: 'clawd', model: 'claude-opus-4-6', designation: 'FF-BLD-001' },
  sentinel: { id: 'sentinel', name: 'Sentinel', role: 'The Inspector', description: 'QA, security audits, compliance, failure patterns', isHuman: false, parent: 'clawd', model: 'claude-opus-4-6', designation: 'FF-QA-001' },
  scout: { id: 'scout', name: 'Scout', role: 'Research', description: 'Competitors, carrier APIs, compliance, market trends', isHuman: false, parent: 'architect', model: 'claude-sonnet-4', designation: 'CC-RES-001' },
  cartographer: { id: 'cartographer', name: 'Cartographer', role: 'Documentation', description: 'System diagrams, data flows, process maps', isHuman: false, parent: 'architect', model: 'claude-sonnet-4', designation: 'CC-MAP-001' },
  coder: { id: 'coder', name: 'Coder', role: 'Code Generation', description: 'Components, endpoints, schemas, utilities', isHuman: false, parent: 'mason', model: 'codex-5.3', designation: 'CC-CODE-001' },
  wirer: { id: 'wirer', name: 'Wirer', role: 'Automation', description: 'n8n workflows, GHL automations, webhooks', isHuman: false, parent: 'mason', model: 'codex-5.3', designation: 'CC-AUTO-001' },
  scribe: { id: 'scribe', name: 'Scribe', role: 'Documentation', description: 'SOPs, process docs, training materials, READMEs', isHuman: false, parent: 'mason', model: 'claude-sonnet-4', designation: 'CC-DOC-001' },
  probe: { id: 'probe', name: 'Probe', role: 'Automated Testing', description: 'Test suites, integration tests, smoke tests', isHuman: false, parent: 'sentinel', model: 'codex-5.3', designation: 'CC-QA-001' },
  auditor: { id: 'auditor', name: 'Auditor', role: 'Security & Compliance', description: 'Vulnerability scans, compliance checks, access audits', isHuman: false, parent: 'sentinel', model: 'claude-opus-4-6', designation: 'CC-SEC-001' },
  atlas: { id: 'atlas', name: 'Atlas', role: 'Infrastructure Monitor', description: 'VPS health, uptime, resource monitoring', isHuman: false, parent: 'clawd', model: 'claude-opus-4-6', designation: 'CC-MON-001' },
  ads: { id: 'ads', name: 'AdsSpecialist', role: 'Meta Ads Intel', description: 'Ad performance, spend analysis, campaign monitoring', isHuman: false, parent: 'clawd', model: 'claude-opus-4-6', designation: 'CC-ADS-001' },
  vanguard: { id: 'vanguard', name: 'Vanguard', role: 'Pipeline Monitor', description: 'Lead health, SLA tracking, pipeline intelligence', isHuman: false, parent: 'clawd', model: 'claude-opus-4-6', designation: 'CC-CRM-001' },
  postwatch: { id: 'postwatch', name: 'Postwatch', role: 'Email Monitor', description: 'Email monitoring, flagging, priority routing', isHuman: false, parent: 'clawd', model: 'claude-opus-4-6', designation: 'CC-EMAIL-001' },
  curator: { id: 'curator', name: 'Curator', role: 'Email Organization', description: 'Email labeling, categorization, cleanup', isHuman: false, parent: 'clawd', model: 'claude-opus-4-6', designation: 'CC-EORG-001' },
}

export const MODEL_FLEET = [
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', tier: 'flagship' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', tier: 'standard' },
  { id: 'codex-5.3', name: 'Codex 5.3', tier: 'code' },
]

export const CRON_JOBS = [
  {
    id: 'daily-reports',
    name: 'Daily Reports',
    schedule: '0 6 * * *',
    description: 'Generate daily performance reports',
    agent: 'coo',
  },
  {
    id: 'inbox-check',
    name: 'Inbox Check',
    schedule: '*/15 * * * *',
    description: 'Check and process incoming emails',
    agent: 'cmo',
  },
  {
    id: 'crm-sync',
    name: 'CRM Sync',
    schedule: '0 * * * *',
    description: 'Sync CRM data with external systems',
    agent: 'cro',
  },
  {
    id: 'health-check',
    name: 'Health Check',
    schedule: '*/5 * * * *',
    description: 'System health monitoring',
    agent: 'coo',
  },
]

export const THEMES = ['forge', 'charcoal', 'tokyo', 'steel', 'offwhite', 'white']
export const DEFAULT_THEME = 'forge'

export const AGENT_FILES = [
  'SOUL.md',
  'USER.md',
  'TOOLS.md',
  'AGENTS.md',
  'MEMORY.md',
]
