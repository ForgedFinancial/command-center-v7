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

export const REGISTERED_AGENTS = ['clawd', 'architect', 'mason', 'sentinel']

export const THEMES = ['forge', 'charcoal', 'tokyo', 'steel', 'offwhite', 'white']
export const DEFAULT_THEME = 'forge'

export const AGENT_FILES = [
  'SOUL.md',
  'USER.md',
  'TOOLS.md',
  'AGENTS.md',
  'MEMORY.md',
]

export const FILE_PREVIEWS = {
  clawd: {
    'SOUL.md': '# SOUL.md — Clawd\n\n## Identity\n- **Name:** Clawd\n- **Role:** COO / Executive Assistant\n- **Reports to:** Boss (Danny Ruhffl, CEO)\n- **Manages:** Architect, Mason, Sentinel',
    'MEMORY.md': '# MEMORY.md — Clawd\n\n## Core Business Context\n- **Company:** Forged Financial\n- **Agency:** Fastest-growing life\n  insurance agency ever\n- **Scale:** $100K/mo → $10M/mo',
    'AGENTS.md': '# AGENTS.md — Clawd\n\n## Chain of Command\nBoss → Clawd → Build Crew\nBoss → Clawd → Operations\n\n## Primary Function\nDELEGATION. Always available.',
    'TOOLS.md': '# TOOLS.md — Clawd\n\n## Connected Systems\n- VPS: 76.13.126.53\n- GitHub: ForgedFinancial\n- Cloudflare Pages\n- GoHighLevel CRM',
    'USER.md': '# USER.md — Boss Profile\n\n## Identity\n- **Name:** Danny Ruhffl\n- **Role:** CEO, Forged Financial\n- **Style:** Direct, no fluff\n- **Rule:** Bottom line up front',
  },
  architect: {
    'SOUL.md': '# SOUL.md — Architect\n\n## Identity\n- **Name:** Architect\n- **Role:** The Planner\n- **Reports to:** Clawd (COO)\n- **Delegates to:** Scout, Cartographer',
    'MEMORY.md': '# MEMORY.md — Architect\n\n## Core Context\n- **Company:** Forged Financial\n- Life insurance ops + AI automation\n- Scale mindset: design for\n  100+ agencies from day one',
    'AGENTS.md': '# AGENTS.md — Architect\n\n## Boot Sequence\n1. Read SOUL.md\n2. Read USER.md\n3. Read MEMORY.md\n4. Check pending tasks from Clawd',
    'TOOLS.md': '# TOOLS.md — Architect\n\n## My Role With Tools\nI don\'t build — I plan.\nI read, research, map the terrain\nbefore anyone writes a line of code.',
    'USER.md': '# USER.md — Boss Profile\n\n## Communication Style\n- Bottom line up front. Always.\n- Answer/result FIRST\n- Context below if needed.',
  },
  mason: {
    'SOUL.md': '# SOUL.md — Mason\n\n## Identity\n- **Name:** Mason\n- **Role:** The Builder\n- **Reports to:** Clawd (COO)\n- **Receives specs from:** Architect',
    'MEMORY.md': '# MEMORY.md — Mason\n\n## Core Context\n- **Company:** Forged Financial\n- Build for Forged first, then\n  package and scale to other\n  agencies. That\'s the mission.',
    'AGENTS.md': '# AGENTS.md — Mason\n\n## Build Protocol\n1. Read spec from Architect\n2. Break into discrete tasks\n3. Build and self-test\n4. Hand to Sentinel for inspection',
    'TOOLS.md': '# TOOLS.md — Mason\n\n## Systems Access\n- Full VPS access for builds\n- GitHub push to dev branches\n- Cloudflare Pages deploys\n- npm/node ecosystem',
    'USER.md': '# USER.md — Boss Profile\n\n## What Boss Expects\n- Working code, not excuses\n- Ship fast, iterate faster\n- Document everything you build',
  },
  sentinel: {
    'SOUL.md': '# SOUL.md — Sentinel\n\n## Identity\n- **Name:** Sentinel\n- **Role:** The Inspector\n- **Reports to:** Clawd (COO)\n- **Receives from:** Mason (FF-BLD-001)',
    'MEMORY.md': '# MEMORY.md — Sentinel\n\n## Core Context\n- **Company:** Forged Financial\n- Quality is non-negotiable\n- I assume everything is broken\n  until proven otherwise.',
    'AGENTS.md': '# AGENTS.md — Sentinel\n\n## Inspection Protocol\n1. Read spec + acceptance criteria\n2. Read Mason\'s self-test results\n3. Run independent tests\n4. Verdict: APPROVED or REJECTED',
    'TOOLS.md': '# TOOLS.md — Sentinel\n\n## Testing Approach\n- Code review against spec\n- Edge case stress testing\n- Security scanning\n- Scale readiness checks',
    'USER.md': '# USER.md — Boss Profile\n\n## Quality Standards\n- If it ships broken, we failed\n- Test like users will break it\n- Report: PASS or FAIL + why',
  },
}

export const ACTIVITY_TIMELINE = {
  clawd: [
    { time: '10:12 PM', action: 'Delegated overnight build plan to Architect', status: 'completed' },
    { time: '09:45 PM', action: 'Routed pipeline test results to Sentinel', status: 'completed' },
    { time: '08:30 PM', action: 'Deployed Build Crew — 3 agents registered', status: 'completed' },
    { time: '07:30 PM', action: 'Rewrote all 8 workspace config files', status: 'completed' },
  ],
  architect: [
    { time: '10:24 PM', action: 'Planning 5-feature overnight build', status: 'in-progress' },
    { time: '10:03 PM', action: 'Planned CC Phase 2: theme + org chart + workspaces', status: 'completed' },
    { time: '09:06 PM', action: 'Planned Cloudflare Pages deployment for CC', status: 'completed' },
    { time: '07:35 PM', action: 'Designed /api/system-status endpoint spec', status: 'completed' },
  ],
  mason: [
    { time: '10:09 PM', action: 'Built org chart with 17-agent hierarchy', status: 'completed' },
    { time: '10:08 PM', action: 'Built workspaces tab with file viewer', status: 'completed' },
    { time: '10:06 PM', action: 'Deployed Forge theme — macOS-inspired dark mode', status: 'completed' },
    { time: '09:22 PM', action: 'Deployed command-center-v7 to Cloudflare Pages', status: 'completed' },
    { time: '08:44 PM', action: 'Built /api/system-status endpoint on VPS', status: 'completed' },
  ],
  sentinel: [
    { time: '10:10 PM', action: 'Inspected Phase 2 build — APPROVED (0 issues)', status: 'completed' },
    { time: '08:45 PM', action: 'Inspected /api/system-status — APPROVED (8/8 criteria)', status: 'completed' },
    { time: '07:32 PM', action: 'Identity verification — all 6 tests passed', status: 'completed' },
  ],
}
