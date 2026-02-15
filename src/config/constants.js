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
    'SOUL.md': '# SOUL.md — Clawd\n\n## Identity\n- **Name:** Clawd\n- **Role:** COO / Executive Assistant\n- **Reports to:** Boss (Danny Ruhffl, CEO)\n- **Manages:** Soren, Mason, Sentinel',
    'MEMORY.md': '# MEMORY.md — Clawd\n\n## Core Business Context\n- **Company:** Forged Financial\n- **Agency:** Fastest-growing life\n  insurance agency ever\n- **Scale:** $100K/mo → $10M/mo',
    'AGENTS.md': '# AGENTS.md — Clawd\n\n## Chain of Command\nBoss → Clawd → Build Crew\nBoss → Clawd → Operations\n\n## Primary Function\nDELEGATION. Always available.',
    'TOOLS.md': '# TOOLS.md — Clawd\n\n## Connected Systems\n- VPS: 76.13.126.53\n- GitHub: ForgedFinancial\n- Cloudflare Pages\n- GoHighLevel CRM',
    'USER.md': '# USER.md — Boss Profile\n\n## Identity\n- **Name:** Danny Ruhffl\n- **Role:** CEO, Forged Financial\n- **Style:** Direct, no fluff\n- **Rule:** Bottom line up front',
  },
  architect: {
    'SOUL.md': '# SOUL.md — Soren\n\n## Identity\n- **Name:** Soren\n- **Role:** The Planner\n- **Reports to:** Clawd (COO)\n- **Delegates to:** Scout, Cartographer',
    'MEMORY.md': '# MEMORY.md — Soren\n\n## Core Context\n- **Company:** Forged Financial\n- Life insurance ops + AI automation\n- Scale mindset: design for\n  100+ agencies from day one',
    'AGENTS.md': '# AGENTS.md — Soren\n\n## Boot Sequence\n1. Read SOUL.md\n2. Read USER.md\n3. Read MEMORY.md\n4. Check pending tasks from Clawd',
    'TOOLS.md': '# TOOLS.md — Soren\n\n## My Role With Tools\nI don\'t build — I plan.\nI read, research, map the terrain\nbefore anyone writes a line of code.',
    'USER.md': '# USER.md — Boss Profile\n\n## Communication Style\n- Bottom line up front. Always.\n- Answer/result FIRST\n- Context below if needed.',
  },
  mason: {
    'SOUL.md': '# SOUL.md — Mason\n\n## Identity\n- **Name:** Mason\n- **Role:** The Builder\n- **Reports to:** Clawd (COO)\n- **Receives specs from:** Soren',
    'MEMORY.md': '# MEMORY.md — Mason\n\n## Core Context\n- **Company:** Forged Financial\n- Build for Forged first, then\n  package and scale to other\n  agencies. That\'s the mission.',
    'AGENTS.md': '# AGENTS.md — Mason\n\n## Build Protocol\n1. Read spec from Soren\n2. Break into discrete tasks\n3. Build and self-test\n4. Hand to Sentinel for inspection',
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
  ceo: {
    'SOUL.md': '# SOUL.md — CEO\n\n## Identity\n- **Name:** Danny Ruhffl\n- **Role:** CEO, Forged Financial\n- **Type:** Human operator\n- **Authority:** Final decision on everything',
    'USER.md': '# USER.md — Self\n\n## Operating Style\n- Direct, no fluff, bottom line up front\n- Moves fast, expects the same\n- Vision: $100K/mo → $10M/mo\n- Every agent answers to me through Clawd',
    'TOOLS.md': '# TOOLS.md — CEO\n\n## Systems\n- Telegram (primary comms channel)\n- GoHighLevel (CRM, pipeline)\n- Cloudflare Pages (dashboards)\n- OpenClaw gateway (agent control)',
    'AGENTS.md': '# AGENTS.md — CEO\n\n## Chain of Command\nBoss (me) → Clawd → Everyone else\n\n## Protocol\n- All agents report through Clawd\n- 2-step auth on production deploys\n- I approve, they execute',
    'MEMORY.md': '# MEMORY.md — CEO\n\n## Core Context\n- **Company:** Forged Financial\n- Fastest-growing life insurance agency\n- AI-first operations at scale\n- Build for Forged, then package for others',
  },
  scout: {
    'SOUL.md': '# SOUL.md — Scout\n\n## Identity\n- **Designation:** CC-RES-001\n- **Role:** Research Specialist\n- **Reports to:** Soren (Architect)\n- **Model:** claude-sonnet-4',
    'USER.md': '# USER.md — Boss Profile\n\n## What Boss Expects\n- Actionable intel, not info dumps\n- Competitor analysis with takeaways\n- Carrier API docs summarized clearly\n- Compliance flags before we build',
    'TOOLS.md': '# TOOLS.md — Scout\n\n## Research Tools\n- Web search (Brave API)\n- Web fetch for deep dives\n- Carrier API documentation\n- Compliance databases & regulations',
    'AGENTS.md': '# AGENTS.md — Scout\n\n## Boot Sequence\n1. Read SOUL.md — identity\n2. Read research brief from Soren\n3. Execute research plan\n4. Deliver findings to Soren',
    'MEMORY.md': '# MEMORY.md — Scout\n\n## Domain Knowledge\n- Life insurance carrier landscape\n- API integration patterns\n- State compliance requirements\n- Market trends & competitor moves',
  },
  cartographer: {
    'SOUL.md': '# SOUL.md — Cartographer\n\n## Identity\n- **Designation:** CC-MAP-001\n- **Role:** Documentation & Mapping\n- **Reports to:** Soren (Architect)\n- **Model:** claude-sonnet-4',
    'USER.md': '# USER.md — Boss Profile\n\n## What Boss Expects\n- Clear system diagrams\n- Data flow maps that anyone can read\n- Process docs that scale with the team\n- Keep the map current as we build',
    'TOOLS.md': '# TOOLS.md — Cartographer\n\n## Documentation Tools\n- Markdown + Mermaid diagrams\n- System architecture templates\n- Data flow mapping standards\n- Process documentation frameworks',
    'AGENTS.md': '# AGENTS.md — Cartographer\n\n## Boot Sequence\n1. Read SOUL.md — identity\n2. Read mapping brief from Soren\n3. Survey existing documentation\n4. Produce/update maps and diagrams',
    'MEMORY.md': '# MEMORY.md — Cartographer\n\n## System Knowledge\n- Forged Financial architecture map\n- Agent hierarchy & data flows\n- Integration topology\n- Documentation standards & conventions',
  },
  coder: {
    'SOUL.md': '# SOUL.md — Coder\n\n## Identity\n- **Designation:** CC-CODE-001\n- **Role:** Code Generation\n- **Reports to:** Mason (Builder)\n- **Model:** codex-5.3',
    'USER.md': '# USER.md — Boss Profile\n\n## What Boss Expects\n- Clean, working code — no hacks\n- Match the spec exactly\n- Components, endpoints, schemas\n- Follow existing patterns in the codebase',
    'TOOLS.md': '# TOOLS.md — Coder\n\n## Development Stack\n- React + Vite + Tailwind CSS\n- Node.js backend services\n- GitHub version control\n- npm/node ecosystem',
    'AGENTS.md': '# AGENTS.md — Coder\n\n## Protocol\n1. Receive task from Mason\n2. Read spec + existing code patterns\n3. Generate code to spec\n4. Return to Mason for integration',
    'MEMORY.md': '# MEMORY.md — Coder\n\n## Codebase Context\n- Forged Financial tech stack\n- React component patterns\n- API endpoint conventions\n- Schema and utility standards',
  },
  wirer: {
    'SOUL.md': '# SOUL.md — Wirer\n\n## Identity\n- **Designation:** CC-AUTO-001\n- **Role:** Automation Engineering\n- **Reports to:** Mason (Builder)\n- **Model:** codex-5.3',
    'USER.md': '# USER.md — Boss Profile\n\n## What Boss Expects\n- Automations that don\'t break\n- n8n workflows wired correctly\n- GHL automations tested before live\n- Webhooks that handle edge cases',
    'TOOLS.md': '# TOOLS.md — Wirer\n\n## Automation Stack\n- n8n workflow engine\n- GoHighLevel automations\n- Webhook integrations\n- Cron jobs & scheduled tasks',
    'AGENTS.md': '# AGENTS.md — Wirer\n\n## Protocol\n1. Receive automation spec from Mason\n2. Map trigger → action → outcome\n3. Wire and test in staging\n4. Return to Mason for review',
    'MEMORY.md': '# MEMORY.md — Wirer\n\n## Automation Context\n- n8n workflow patterns\n- GHL automation triggers & actions\n- Webhook reliability patterns\n- Error handling & retry logic',
  },
  scribe: {
    'SOUL.md': '# SOUL.md — Scribe\n\n## Identity\n- **Designation:** CC-DOC-001\n- **Role:** Documentation & SOPs\n- **Reports to:** Mason (Builder)\n- **Model:** claude-sonnet-4',
    'USER.md': '# USER.md — Boss Profile\n\n## What Boss Expects\n- SOPs that new hires can follow\n- Process docs that stay current\n- Training materials that scale\n- READMEs on every deliverable',
    'TOOLS.md': '# TOOLS.md — Scribe\n\n## Documentation Tools\n- Markdown formatting\n- SOP templates & frameworks\n- Process documentation standards\n- Training material generators',
    'AGENTS.md': '# AGENTS.md — Scribe\n\n## Protocol\n1. Receive doc request from Mason\n2. Review source material & code\n3. Write clear documentation\n4. Return to Mason for approval',
    'MEMORY.md': '# MEMORY.md — Scribe\n\n## Documentation Context\n- Forged Financial SOP standards\n- Process documentation catalog\n- Training material templates\n- README conventions & style guide',
  },
  probe: {
    'SOUL.md': '# SOUL.md — Probe\n\n## Identity\n- **Designation:** CC-QA-001\n- **Role:** Automated Testing\n- **Reports to:** Sentinel (Inspector)\n- **Model:** codex-5.3',
    'USER.md': '# USER.md — Boss Profile\n\n## What Boss Expects\n- Comprehensive test coverage\n- Integration tests that catch regressions\n- Smoke tests on every deploy\n- Clear pass/fail reporting',
    'TOOLS.md': '# TOOLS.md — Probe\n\n## Testing Stack\n- Test suite frameworks (Jest, etc.)\n- Integration test harnesses\n- Smoke test scripts\n- CI/CD test hooks',
    'AGENTS.md': '# AGENTS.md — Probe\n\n## Protocol\n1. Receive test brief from Sentinel\n2. Write/run test suites\n3. Collect results & edge cases\n4. Report pass/fail to Sentinel',
    'MEMORY.md': '# MEMORY.md — Probe\n\n## Testing Context\n- Test coverage maps\n- Known edge cases & regressions\n- Integration test patterns\n- Smoke test checklists per service',
  },
  auditor: {
    'SOUL.md': '# SOUL.md — Auditor\n\n## Identity\n- **Designation:** CC-SEC-001\n- **Role:** Security & Compliance\n- **Reports to:** Sentinel (Inspector)\n- **Model:** claude-opus-4-6',
    'USER.md': '# USER.md — Boss Profile\n\n## What Boss Expects\n- Zero credential leaks, ever\n- Vulnerability scans before deploy\n- Compliance checks on all pipelines\n- Access audit trails maintained',
    'TOOLS.md': '# TOOLS.md — Auditor\n\n## Security Tools\n- Vulnerability scanning\n- Compliance check frameworks\n- Access control auditing\n- Credential leak detection',
    'AGENTS.md': '# AGENTS.md — Auditor\n\n## Protocol\n1. Receive audit scope from Sentinel\n2. Run security & compliance scans\n3. Flag vulnerabilities by severity\n4. Report findings to Sentinel',
    'MEMORY.md': '# MEMORY.md — Auditor\n\n## Security Context\n- Known vulnerability patterns\n- Compliance requirements (insurance)\n- Access control policies\n- Credential management standards',
  },
}

export const ACTIVITY_TIMELINE = {
  clawd: [
    { time: '10:12 PM', action: 'Delegated overnight build plan to Soren', status: 'completed' },
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
