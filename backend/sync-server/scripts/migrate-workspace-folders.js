#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const AGENTS_ROOT = process.env.OPENCLAW_WORKSPACE_AGENTS_ROOT || '/home/clawd/.openclaw/workspace/agents';
const APPLY = process.argv.includes('--apply');

const FOLDER_MAPPING = {
  clawd: {
    defaultFolder: 'active',
    folders: {
      core: ['USER.md', 'IDENTITY.md', 'SOUL.md', 'MEMORY.md', 'SKILLS.md', 'AGENTS.md', 'HEARTBEAT.md', 'TOOLS.md'],
      coordination: ['*COMMS*', '*DELEGAT*', '*SYNC*', '*HANDOFF*'],
      strategic: ['*STRATEG*', '*PRIORIT*', '*ROADMAP*', '*BRIEF*'],
      active: ['TASK-*.md', '*-PLAN.md', '*ACTIVE*'],
    },
  },
  soren: {
    defaultFolder: 'prompt-enhancement',
    folders: {
      core: ['IDENTITY.md', 'SOUL.md', 'MEMORY.md', 'TOOLS.md', 'AGENTS.md'],
      'prompt-enhancement': ['*PROMPT*', '*ENHANCEMENT*', '*PLAN*'],
    },
  },
  mason: {
    defaultFolder: 'enhancement-prompts',
    folders: {
      core: ['IDENTITY.md', 'SOUL.md', 'MEMORY.md', 'TOOLS.md', 'AGENTS.md'],
      sops: ['SOP-*.md', '*SOP*', '*DOC*', '*GUIDE*'],
      'enhancement-prompts': ['*PROMPT*', '*ENHANCEMENT*', '*TEMPLATE*'],
    },
  },
  sentinel: {
    defaultFolder: 'inspection-plans',
    folders: {
      core: ['IDENTITY.md', 'SOUL.md', 'MEMORY.md', 'TOOLS.md', 'AGENTS.md'],
      'inspection-plans': ['*AUDIT*', '*INSPECTION*', '*CHECKLIST*', '*TEST*', '*PLAN*'],
      'inspection-prompts': ['*PROMPT*', '*ENHANCEMENT*', '*TEMPLATE*'],
    },
  },
  kyle: {
    defaultFolder: 'core',
    folders: {
      core: ['IDENTITY.md', 'SOUL.md', 'MEMORY.md', 'TOOLS.md', 'AGENTS.md'],
    },
  },
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wildcardToRegex(pattern) {
  return new RegExp(`^${escapeRegExp(pattern).replace(/\\\*/g, '.*')}$`, 'i');
}

function matchesPattern(filename, pattern) {
  if (!pattern) return false;
  if (pattern.includes('*')) return wildcardToRegex(pattern).test(filename);
  return filename.toUpperCase() === pattern.toUpperCase();
}

function resolveFolder(agentConfig, filename) {
  const entries = Object.entries(agentConfig.folders);

  const coreMatch = entries.find(([folder, patterns]) =>
    folder === 'core' && patterns.some(pattern => matchesPattern(filename, pattern)),
  );
  if (coreMatch) return coreMatch[0];

  const patternMatch = entries.find(([folder, patterns]) =>
    folder !== 'core' && patterns.some(pattern => matchesPattern(filename, pattern)),
  );
  if (patternMatch) return patternMatch[0];

  return agentConfig.defaultFolder;
}

async function ensureFolders(agentDir, folderNames) {
  for (const folderName of folderNames) {
    const fullPath = path.join(agentDir, folderName);
    if (APPLY) {
      await fs.mkdir(fullPath, { recursive: true });
    }
    console.log(`${APPLY ? 'CREATE' : 'PLAN  '} ${fullPath}`);
  }
}

async function migrateAgent(agentId, config) {
  const agentDir = path.join(AGENTS_ROOT, agentId);
  if (!fsSync.existsSync(agentDir)) {
    console.log(`SKIP  ${agentId} (missing: ${agentDir})`);
    return { moved: 0, skipped: 0 };
  }

  await ensureFolders(agentDir, Object.keys(config.folders));

  const entries = await fs.readdir(agentDir, { withFileTypes: true });
  let moved = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) continue;

    const fromPath = path.join(agentDir, entry.name);
    const targetFolder = resolveFolder(config, entry.name);
    const toPath = path.join(agentDir, targetFolder, entry.name);

    if (fsSync.existsSync(toPath)) {
      console.log(`SKIP  ${agentId}/${entry.name} (destination exists)`);
      skipped += 1;
      continue;
    }

    if (APPLY) {
      await fs.rename(fromPath, toPath);
    }
    console.log(`${APPLY ? 'MOVE  ' : 'PLAN  '} ${agentId}/${entry.name} -> ${targetFolder}/${entry.name}`);
    moved += 1;
  }

  return { moved, skipped };
}

async function run() {
  console.log(`Workspace migration root: ${AGENTS_ROOT}`);
  console.log(APPLY ? 'Mode: APPLY' : 'Mode: DRY RUN (pass --apply to execute)');
  console.log('');

  let totalMoved = 0;
  let totalSkipped = 0;

  for (const [agentId, config] of Object.entries(FOLDER_MAPPING)) {
    console.log(`== ${agentId} ==`);
    const result = await migrateAgent(agentId, config);
    totalMoved += result.moved;
    totalSkipped += result.skipped;
    console.log('');
  }

  console.log(`Summary: moved=${totalMoved}, skipped=${totalSkipped}`);
}

run().catch(error => {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
});

