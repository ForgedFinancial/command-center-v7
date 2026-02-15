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
  ceo: {
    id: 'ceo',
    name: 'DANO',
    role: 'CEO',
    description: 'Chief Executive Officer - Human Operator',
    isHuman: true,
    parent: null,
  },
  coo: {
    id: 'coo',
    name: 'Clawd',
    role: 'COO',
    description: 'Chief Operating Officer - VPS Operations & API Management',
    isHuman: false,
    parent: 'ceo',
    model: 'claude-3-5-sonnet-20241022',
  },
  cto: {
    id: 'cto',
    name: 'Claude Code',
    role: 'CTO',
    description: 'Chief Technology Officer - Desktop Development & Build',
    isHuman: false,
    parent: 'ceo',
    model: 'claude-opus-4-5-20251101',
  },
  cmo: {
    id: 'cmo',
    name: 'Marketing Agent',
    role: 'CMO',
    description: 'Chief Marketing Officer - Ads, Content, Social',
    isHuman: false,
    parent: 'ceo',
    model: 'claude-3-5-sonnet-20241022',
  },
  cro: {
    id: 'cro',
    name: 'Revenue Agent',
    role: 'CRO',
    description: 'Chief Revenue Officer - Sales, CRM, Pipeline',
    isHuman: false,
    parent: 'ceo',
    model: 'claude-3-5-sonnet-20241022',
  },
}

export const MODEL_FLEET = [
  { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', tier: 'flagship' },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', tier: 'standard' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', tier: 'fast' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', tier: 'standard' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', tier: 'fast' },
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

export const THEMES = ['charcoal', 'tokyo', 'steel', 'offwhite', 'white']
export const DEFAULT_THEME = 'charcoal'

export const AGENT_FILES = [
  'agent.yaml',
  'behavior.md',
  'context.md',
  'tools.json',
  'history.jsonl',
]
