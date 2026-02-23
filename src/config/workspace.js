export const WORKSPACE_STRUCTURE = {
  clawd: {
    name: 'Clawd',
    role: 'COO',
    defaultFolder: 'active',
    folders: [
      {
        id: 'core',
        name: 'Core',
        coreFiles: ['USER.md', 'IDENTITY.md', 'SOUL.md', 'MEMORY.md', 'SKILLS.md', 'AGENTS.md', 'HEARTBEAT.md', 'TOOLS.md'],
      },
      {
        id: 'coordination',
        name: 'Coordination',
        patterns: ['*COMMS*', '*DELEGAT*', '*SYNC*', '*ROSTER*', '*HANDOFF*'],
      },
      {
        id: 'strategic',
        name: 'Strategic',
        patterns: ['*STRATEG*', '*PRIORIT*', '*ROADMAP*', '*BRIEF*', '*VISION*'],
      },
      {
        id: 'active',
        name: 'Active',
        patterns: ['TASK-*.md', '*-PLAN.md', '*-BUILD-PLAN*.md', '*ACTIVE*'],
      },
    ],
  },
  sentinel: {
    name: 'Sentinel',
    role: 'Inspector',
    defaultFolder: 'inspection-plans',
    folders: [
      {
        id: 'core',
        name: 'Core',
        coreFiles: ['IDENTITY.md', 'SOUL.md', 'MEMORY.md', 'TOOLS.md', 'AGENTS.md'],
      },
      {
        id: 'inspection-plans',
        name: 'Inspection Plans',
        patterns: ['*AUDIT*', '*INSPECTION*', '*CHECKLIST*', '*TEST*', '*PLAN*'],
      },
      {
        id: 'inspection-prompts',
        name: 'Inspection Enhancement Prompts',
        patterns: ['*PROMPT*', '*ENHANCEMENT*', '*TEMPLATE*'],
      },
    ],
  },
  kyle: {
    name: 'Kyle',
    role: 'Desktop Agent',
    defaultFolder: 'core',
    folders: [
      {
        id: 'core',
        name: 'Core',
        coreFiles: ['IDENTITY.md', 'SOUL.md', 'MEMORY.md', 'TOOLS.md', 'AGENTS.md'],
      },
    ],
  },
}

export const WORKSPACE_AGENT_ORDER = ['clawd', 'sentinel', 'kyle']

