// ========================================
// OPS ROUTES — Build Pipeline + Knowledge Base
// Added: 2026-02-20 by Mason (FF-BLD-001)
// CC Ops Layer: /api/ops/pipeline/* + /api/ops/knowledge/*
// ========================================

const express = require('express');
const router = express.Router();
const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// === File Paths ===
const PIPELINE_FILE = '/home/clawd/.openclaw/data/pipeline/build-tasks.json';
const KNOWLEDGE_FILE = '/home/clawd/.openclaw/data/knowledge/entries.json';
const TASKS_FILE = '/home/clawd/claude-comms/tasks.json';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) console.warn('Telegram not configured. Features disabled.');

// ── Telegram notifier — fires when Clawd has a task that needs human-loop action ──
function notifyBoss(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const https = require('https');
    const body = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    });
    req.on('error', () => {});
    req.write(body);
    req.end();
  } catch { /* never crash on notify */ }
}

// Stage → daemon task type mapping
const STAGE_TO_TYPE = {
  SPEC_INTAKE: 'plan',
  SPEC: 'plan',
  REVIEW: 'plan',
  BUILDING: 'build',
  QA: 'inspect',
  DEPLOY: 'build',
};

// Stages that should auto-trigger a daemon task when reached
const TRIGGER_STAGES = new Set(['SPEC', 'BUILDING', 'QA']);

// Agents with active daemons
const DAEMON_AGENTS = ['soren', 'mason', 'sentinel'];

// Create a daemon task when an Ops board task is assigned to an agent
async function triggerDaemonTask(opsTask) {
  const assignee = opsTask.assignee;
  const taskType = STAGE_TO_TYPE[opsTask.stage] || 'build';
  const payload = [
    opsTask.description ? opsTask.description : '',
    opsTask.specRef ? `\nSpec reference: ${opsTask.specRef}` : '',
    `\nOps board task ID: ${opsTask.id}`,
    `\nCreated by: ${opsTask.createdBy}`,
  ].join('').trim();

  if (DAEMON_AGENTS.includes(assignee)) {
    // Create daemon task for agent
    try {
      const lockfile = require('proper-lockfile');
      const ensureFile = () => { if (!fsSync.existsSync(TASKS_FILE)) fsSync.writeFileSync(TASKS_FILE, '[]', 'utf8'); };
      ensureFile();
      let release;
      try {
        release = await lockfile.lock(TASKS_FILE, { retries: { retries: 3, minTimeout: 500 }, stale: 10000 });
        const tasks = JSON.parse(fsSync.readFileSync(TASKS_FILE, 'utf8'));

        // ── Duplicate prevention: skip if a pending/running task already exists for this ops card ──
        const alreadyQueued = tasks.some(t =>
          t.ops_task_id === opsTask.id &&
          (t.status === 'pending' || t.status === 'running' || t.status === 'claimed')
        );
        if (alreadyQueued) {
          console.log(`[OPS] Daemon task already queued for ops task ${opsTask.id} — skipping duplicate`);
          return;
        }

        const daemonTask = {
          id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
          type: taskType,
          title: opsTask.name,
          payload: payload || opsTask.name,
          assigned_to: assignee,
          priority: 'normal',
          status: 'pending',
          created_by: opsTask.createdBy || 'dano',
          created_at: new Date().toISOString(),
          claimed_at: null, started_at: null, completed_at: null,
          result: null, result_summary: null, error: null,
          depends_on: [], tags: opsTask.tags || [],
          ops_task_id: opsTask.id,
        };
        tasks.push(daemonTask);
        const tmp = TASKS_FILE + '.tmp';
        fsSync.writeFileSync(tmp, JSON.stringify(tasks, null, 2), 'utf8');
        fsSync.renameSync(tmp, TASKS_FILE);
      } finally {
        if (release) await release();
      }
      console.log(`[OPS] Daemon task created for ${assignee}: ${opsTask.name}`);
    } catch (err) {
      console.error('[OPS] Failed to create daemon task:', err.message);
    }
  } else if (assignee === 'clawd' || assignee === 'dano') {
    // Notify internally via comms API
    try {
      const https2local = require('https');
      const target = assignee === 'clawd' ? 'clawd' : 'dano';
      const msg = `📋 New Ops task assigned to you: ${opsTask.name}\n\n${opsTask.description || ''}\nStage: ${opsTask.stage} | Created by: ${opsTask.createdBy}\nOps task ID: ${opsTask.id}`;
      const commsPayload = JSON.stringify({ from: 'ops-board', to: target, message: msg, topic: 'task-notify' });
      const commsReq = https2local.request({
        hostname: 'localhost',
        port: 3737,
        rejectUnauthorized: false,
        path: '/api/comms/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(commsPayload),
          'x-api-key': process.env.COMMS_API_KEY || process.env.CC_API_KEY || process.env.SYNC_API_KEY || ''
        }
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => console.log(`[OPS] Internal comms notification sent to ${target}: ${opsTask.name}`));
      });
      commsReq.on('error', (err) => console.error(`[OPS] Comms notify failed: ${err.message}`));
      commsReq.write(commsPayload);
      commsReq.end();
    } catch (err) {
      console.error('[OPS] Failed to send internal notification:', err.message);
    }
  }
}

// === Enums ===
// V2 board stages (user-facing)
const VALID_STAGES = ['INTAKE', 'SPEC', 'REVIEW', 'BUILDING', 'QA', 'BOSS_REVIEW', 'DONE'];
// Legacy stage mapping
const LEGACY_STAGES = ['SPEC_INTAKE', 'DEPLOY', 'PLANNING', 'REBUILDING', 'FIX', 'ARCHIVED'];
const LEGACY_STAGE_MAP = { SPEC_INTAKE: 'INTAKE', DEPLOY: 'BOSS_REVIEW', PLANNING: 'SPEC', REBUILDING: 'BUILDING', FIX: 'BUILDING', ARCHIVED: 'DONE' };
const VALID_TYPES = ['build', 'design', 'fix', 'inspect', 'research'];
const VALID_PRIORITIES = ['critical', 'high', 'normal', 'low'];
const VALID_CATEGORIES = ['API_QUIRKS', 'BUILD_GOTCHAS', 'DEPLOYMENT', 'SECURITY', 'PERFORMANCE', 'OTHER'];
const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VALID_AGENTS = ['dano', 'clawd', 'soren', 'mason', 'sentinel', 'kyle', 'scout', 'cartographer', 'coder', 'wirer', 'scribe', 'probe', 'auditor'];
const VALID_CLASSIFICATIONS = ['build', 'fix', 'design', 'research', 'inspect'];

// Classification → starting agent + pipeline stage
const CLASSIFICATION_ROUTING = {
  build:    { start: 'mason',    start_stage: 'mason_build' },
  fix:      { start: 'mason',    start_stage: 'mason_build' },
  design:   { start: 'soren',    start_stage: 'planning' },
  research: { start: 'soren',    start_stage: 'planning' },
  inspect:  { start: 'sentinel', start_stage: 'sentinel_qa' },
};

// V2 Auto-stage progression: when daemon completes, advance card
// Map: current board stage → { next_stage, next_agent } per tier
const AUTO_ADVANCE = {
  // Default (Build tier)
  'SPEC|complete':        { next_stage: 'BUILDING',    next_agent: 'mason' },
  'BUILDING|complete':    { next_stage: 'QA',          next_agent: 'sentinel' },
  'REVIEW|complete':      { next_stage: 'BUILDING',    next_agent: 'mason' },
  'QA|approve':           { next_stage: 'BOSS_REVIEW', next_agent: 'dano' },
  'QA|reject':            { next_stage: 'BUILDING',    next_agent: 'mason' },
  // Boss Review — 3 outcomes
  'BOSS_REVIEW|approve':  { next_stage: 'DONE',        next_agent: null },
  'BOSS_REVIEW|modify':   { next_stage: 'BUILDING',    next_agent: 'mason' },  // specific changes requested
  'BOSS_REVIEW|reject':   { next_stage: 'BUILDING',    next_agent: 'mason' },  // declined, redo
};

// Smart stage routing: assignee → starting stage
const AGENT_STAGE_ROUTING = {
  soren:    'SPEC',
  mason:    'BUILDING',
  sentinel: 'QA',
  clawd:    'INTAKE',
  dano:     'INTAKE',
  kyle:     'INTAKE',
};

// Stage → daemon task type
const STAGE_TO_DAEMON_TYPE = {
  INTAKE: 'plan',
  SPEC: 'plan',
  REVIEW: 'plan',
  BUILDING: 'build',
  QA: 'inspect',
  BOSS_REVIEW: null,
  DONE: null,
};

// === In-process Mutex ===
const locks = new Map();

async function withFileLock(filePath, fn) {
  while (locks.has(filePath)) {
    await locks.get(filePath);
  }
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  locks.set(filePath, promise);
  try {
    return await fn();
  } finally {
    locks.delete(filePath);
    resolve();
  }
}

// === File helpers ===
function readJSON(filePath) {
  try {
    return JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
  } catch {
    return filePath === PIPELINE_FILE
      ? { tasks: [], lastModified: null }
      : { entries: [], lastModified: null };
  }
}

function writeJSON(filePath, data) {
  data.lastModified = new Date().toISOString();
  const tmp = filePath + '.tmp';
  fsSync.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fsSync.renameSync(tmp, filePath);
}

function shortId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

// ============================
// PIPELINE ROUTES
// ============================

// GET /api/ops/pipeline/tasks
router.get('/pipeline/tasks', (req, res) => {
  const data = readJSON(PIPELINE_FILE);
  const stage = req.query.stage;
  let tasks = data.tasks;
  if (stage) {
    const mappedStage = LEGACY_STAGE_MAP[stage] || stage;
    if (!VALID_STAGES.includes(mappedStage)) {
      return res.status(400).json({ error: `Invalid stage filter: ${stage}` });
    }
    tasks = tasks.filter(t => t.stage === mappedStage);
  }
  res.json({ tasks });
});

// POST /api/ops/pipeline/tasks
router.post('/pipeline/tasks', async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 200) {
      return res.status(400).json({ error: 'Missing required field: name (string, 1-200 chars)' });
    }
    // Default assignee to clawd (intake point)
    const assignee = body.assignee || 'clawd';
    if (!VALID_AGENTS.includes(assignee)) {
      return res.status(400).json({ error: 'Invalid assignee (must be valid agent ID)' });
    }
    if (!body.createdBy || !VALID_AGENTS.includes(body.createdBy)) {
      return res.status(400).json({ error: 'Missing required field: createdBy (must be valid agent ID)' });
    }

    // Default stage to INTAKE; accept legacy stages
    let stage = body.stage || 'INTAKE';
    if (LEGACY_STAGE_MAP[stage]) stage = LEGACY_STAGE_MAP[stage];
    if (!VALID_STAGES.includes(stage)) {
      return res.status(400).json({ error: `Invalid value for stage: ${body.stage}` });
    }

    const now = new Date().toISOString();
    const task = {
      id: shortId('task'),
      name: body.name.trim(),
      description: body.description || '',
      stage,
      pipeline_stage: 'intake',
      assignee,
      classification: null,
      classified_by: null,
      classified_at: null,
      routing_target: null,
      current_handler: assignee,
      handler_history: [{ agent: assignee, stage: 'intake', entered_at: now, action: 'created' }],
      rejection_count: 0,
      rejection_notes: [],
      approved_at: null,
      deployed_at: null,
      boss_notified: false,
      critical_blocker: false,
      pipeline_log: [{ from: null, to: 'intake', by: body.createdBy, at: now, notes: 'Task created' }],
      createdBy: body.createdBy,
      createdAt: now,
      stageEnteredAt: now,
      blocked: false,
      blockerReason: null,
      blockerSince: null,
      specRef: body.specRef || null,
      type: VALID_TYPES.includes(body.type) ? body.type : 'build',
      priority: VALID_PRIORITIES.includes(body.priority) ? body.priority : 'normal',
      comments: [],
      reviews: [],
      completedAt: null,
      history: [{ stage, enteredAt: now, agent: body.createdBy }],
      tags: Array.isArray(body.tags) ? body.tags : [],
    };

    const created = await withFileLock(PIPELINE_FILE, () => {
      const data = readJSON(PIPELINE_FILE);
      data.tasks.push(task);
      writeJSON(PIPELINE_FILE, data);
      return task;
    });

    console.log(`[OPS:PIPELINE] Created task: ${created.id} — ${created.name}`);
    res.status(201).json(created);

    // Auto-trigger daemon if task is created directly in an action stage with a daemon agent
    if (TRIGGER_STAGES.has(created.stage) && DAEMON_AGENTS.includes(created.assignee)) {
      triggerDaemonTask(created).catch(e => console.error('[OPS] triggerDaemonTask (POST) failed:', e.message));
    }

    // ── Clawd INTAKE alert — ping Boss immediately so nothing sits ignored ──
    if (created.assignee === 'clawd' || created.stage === 'INTAKE') {
      const priorityFlag = created.priority === 'critical' ? '🔴 CRITICAL' : created.priority === 'high' ? '🟠 HIGH' : '🔵 NEW';
      notifyBoss(`${priorityFlag} *New task for Clawd:*\n\n*${created.name}*\n\nStage: ${created.stage} | ID: \`${created.id}\`\n\nCheck Ops Board → Intake column.`);
    }
  } catch (err) {
    console.error('[OPS:PIPELINE] POST error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/ops/pipeline/tasks/:id
router.patch('/pipeline/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body;
    if (!patch || typeof patch !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    // Validate stage if provided (accept legacy stages)
    if (patch.stage) {
      if (LEGACY_STAGE_MAP[patch.stage]) patch.stage = LEGACY_STAGE_MAP[patch.stage];
      if (!VALID_STAGES.includes(patch.stage)) {
        return res.status(400).json({ error: `Invalid value for stage: ${patch.stage}` });
      }
    }
    if (patch.assignee && !VALID_AGENTS.includes(patch.assignee)) {
      return res.status(400).json({ error: `Invalid value for assignee: ${patch.assignee}` });
    }

    const result = await withFileLock(PIPELINE_FILE, () => {
      const data = readJSON(PIPELINE_FILE);
      const idx = data.tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;

      const task = data.tasks[idx];
      const now = new Date().toISOString();

      // Stage transition
      if (patch.stage && patch.stage !== task.stage) {
        task.stage = patch.stage;
        task.stageEnteredAt = now;
        if (!task.history) task.history = [];
        task.history.push({
          stage: patch.stage,
          enteredAt: now,
          agent: patch.movedBy || task.assignee,
        });
        // Set completedAt when moving to DONE
        if (patch.stage === 'DONE' && !task.completedAt) {
          task.completedAt = now;
        }
      }

      // Blocker toggle
      if (typeof patch.blocked === 'boolean') {
        task.blocked = patch.blocked;
        if (patch.blocked) {
          task.blockerReason = patch.blockerReason || task.blockerReason;
          task.blockerSince = task.blockerSince || now;
        } else {
          task.blockerReason = null;
          task.blockerSince = null;
        }
      }

      // Other editable fields
      if (patch.name !== undefined) task.name = patch.name;
      if (patch.description !== undefined) task.description = patch.description;
      if (patch.assignee !== undefined) task.assignee = patch.assignee;
      if (patch.specRef !== undefined) task.specRef = patch.specRef;
      if (patch.tags !== undefined) task.tags = patch.tags;

      // Pipeline relay fields
      if (patch.pipeline_stage !== undefined) task.pipeline_stage = patch.pipeline_stage;
      if (patch.classification !== undefined) task.classification = patch.classification;
      if (patch.classified_by !== undefined) task.classified_by = patch.classified_by;
      if (patch.classified_at !== undefined) task.classified_at = patch.classified_at;
      if (patch.routing_target !== undefined) task.routing_target = patch.routing_target;
      if (patch.current_handler !== undefined) task.current_handler = patch.current_handler;
      if (patch.handler_history !== undefined) task.handler_history = patch.handler_history;
      if (patch.rejection_count !== undefined) task.rejection_count = patch.rejection_count;
      if (patch.rejection_notes !== undefined) task.rejection_notes = patch.rejection_notes;
      if (patch.approved_at !== undefined) task.approved_at = patch.approved_at;
      if (patch.deployed_at !== undefined) task.deployed_at = patch.deployed_at;
      if (patch.boss_notified !== undefined) task.boss_notified = patch.boss_notified;
      if (patch.critical_blocker !== undefined) task.critical_blocker = patch.critical_blocker;
      if (patch.pipeline_log !== undefined) task.pipeline_log = patch.pipeline_log;
      if (patch.type !== undefined && VALID_TYPES.includes(patch.type)) task.type = patch.type;
      if (patch.priority !== undefined && VALID_PRIORITIES.includes(patch.priority)) task.priority = patch.priority;
      if (patch.comments !== undefined) task.comments = patch.comments;
      if (patch.reviews !== undefined) task.reviews = patch.reviews;
      if (patch.completedAt !== undefined) task.completedAt = patch.completedAt;

      data.tasks[idx] = task;
      writeJSON(PIPELINE_FILE, data);
      return task;
    });

    if (!result) return res.status(404).json({ error: `Task not found: ${id}` });
    res.json(result);

    // ── Auto-trigger daemon on stage move or assignee change ──
    const stageChanged = patch.stage && TRIGGER_STAGES.has(patch.stage);
    const assigneeChanged = patch.assignee !== undefined;
    if ((stageChanged || assigneeChanged) && TRIGGER_STAGES.has(result.stage) && DAEMON_AGENTS.includes(result.assignee)) {
      triggerDaemonTask(result).catch(e => console.error('[OPS] triggerDaemonTask (PATCH) failed:', e.message));
    }

    // ── Clawd INTAKE alert on stage/assignee change ──
    const nowClawd = (patch.assignee === 'clawd') || (patch.stage === 'INTAKE' && result.assignee === 'clawd');
    if (nowClawd) {
      const priorityFlag = result.priority === 'critical' ? '🔴 CRITICAL' : result.priority === 'high' ? '🟠 HIGH' : '🔵';
      notifyBoss(`${priorityFlag} *Task routed to Clawd:*\n\n*${result.name}*\n\nStage: ${result.stage} | ID: \`${result.id}\`\n\nCheck Ops Board → Intake column.`);
    }
  } catch (err) {
    console.error('[OPS:PIPELINE] PATCH error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/ops/pipeline/tasks/:id
router.delete('/pipeline/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await withFileLock(PIPELINE_FILE, () => {
      const data = readJSON(PIPELINE_FILE);
      const idx = data.tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;
      const task = data.tasks.splice(idx, 1)[0];
      writeJSON(PIPELINE_FILE, data);
      return task;
    });

    if (!removed) return res.status(404).json({ error: `Task not found: ${id}` });
    console.log(`[OPS:PIPELINE] Deleted task: ${id}`);
    res.json({ ok: true, deleted: removed });
  } catch (err) {
    console.error('[OPS:PIPELINE] DELETE error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================
// PIPELINE — CLASSIFY ENDPOINT (Phase 2)
// ============================

// POST /api/ops/pipeline/tasks/:id/classify
router.post('/pipeline/tasks/:id/classify', async (req, res) => {
  try {
    const { id } = req.params;
    const { classification, classified_by, notes } = req.body || {};

    if (!classification || !VALID_CLASSIFICATIONS.includes(classification)) {
      return res.status(400).json({ error: `classification must be one of: ${VALID_CLASSIFICATIONS.join(', ')}` });
    }
    if (!classified_by || !VALID_AGENTS.includes(classified_by)) {
      return res.status(400).json({ error: 'classified_by must be a valid agent ID' });
    }

    const routing = CLASSIFICATION_ROUTING[classification];
    const now = new Date().toISOString();
    const boardStage = PIPELINE_TO_BOARD_STAGE[routing.start_stage] || 'BUILDING';

    const result = await withFileLock(PIPELINE_FILE, () => {
      const data = readJSON(PIPELINE_FILE);
      const idx = data.tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;

      const task = data.tasks[idx];
      task.classification = classification;
      task.classified_by = classified_by;
      task.classified_at = now;
      task.routing_target = routing.start;
      task.current_handler = routing.start;
      task.assignee = routing.start;
      task.pipeline_stage = routing.start_stage;
      task.stage = boardStage;
      task.stageEnteredAt = now;

      task.handler_history = task.handler_history || [];
      task.handler_history.push({ agent: routing.start, stage: routing.start_stage, entered_at: now, action: 'routed' });

      task.pipeline_log = task.pipeline_log || [];
      task.pipeline_log.push({ from: 'intake', to: routing.start_stage, by: classified_by, at: now, notes: notes || `Classified as ${classification}` });

      task.history = task.history || [];
      task.history.push({ stage: boardStage, enteredAt: now, agent: classified_by });

      data.tasks[idx] = task;
      writeJSON(PIPELINE_FILE, data);
      return task;
    });

    if (!result) return res.status(404).json({ error: `Task not found: ${id}` });

    // Broadcast to Stand-Up Room BEFORE daemon task creation
    const broadcastMsg = [
      `📋 PIPELINE UPDATE — ${result.name}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Stage: Intake → ${boardStage}`,
      `Handler: ${classified_by} → ${routing.start}`,
      `Action: classified as "${classification}"`,
      notes ? `Notes: ${notes}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Task ID: ${id} | Rejection cycles: 0`,
    ].filter(Boolean).join('\n');

    // Fire-and-forget standup post
    const https2 = require('https');
    const standupBody = JSON.stringify({ from: 'pipeline-relay', to: 'standup', topic: 'standup', message: broadcastMsg });
    try {
      const sReq = https2.request({ hostname: 'localhost', port: 3000, path: '/api/comms/send', method: 'POST',
        headers: { 'x-api-key': req.headers['x-api-key'], 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(standupBody) },
        rejectUnauthorized: false });
      sReq.on('error', () => {});
      sReq.write(standupBody); sReq.end();
    } catch (e) { /* fire-and-forget */ }

    // Create daemon task for target agent
    let daemonTaskId = null;
    try {
      const lockfile2 = require('proper-lockfile');
      const ensureFile = () => { if (!fsSync.existsSync(TASKS_FILE)) fsSync.writeFileSync(TASKS_FILE, '[]', 'utf8'); };
      ensureFile();
      let release;
      try {
        release = await lockfile2.lock(TASKS_FILE, { retries: { retries: 3, minTimeout: 500 }, stale: 10000 });
        const tasks = JSON.parse(fsSync.readFileSync(TASKS_FILE, 'utf8'));
        const taskType = classification === 'design' || classification === 'research' ? 'plan' : classification === 'inspect' ? 'inspect' : 'build';
        const payload = [
          result.description || result.name,
          result.specRef ? `\nSpec reference: ${result.specRef}` : '',
          `\nOps board task ID: ${result.id}`,
          `\nClassified as: ${classification} by ${classified_by}`,
        ].join('').trim();
        const daemonTask = {
          id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
          type: taskType, title: result.name, payload,
          assigned_to: routing.start, priority: 'normal', status: 'pending',
          created_by: classified_by, created_at: now,
          claimed_at: null, started_at: null, completed_at: null,
          result: null, result_summary: null, error: null,
          depends_on: [], tags: result.tags || [],
          ops_task_id: result.id,
        };
        tasks.push(daemonTask);
        const tmp = TASKS_FILE + '.tmp';
        fsSync.writeFileSync(tmp, JSON.stringify(tasks, null, 2), 'utf8');
        fsSync.renameSync(tmp, TASKS_FILE);
        daemonTaskId = daemonTask.id;
        console.log(`[OPS:CLASSIFY] Daemon task created for ${routing.start}: ${result.name} (${daemonTask.id})`);
      } finally {
        if (release) await release();
      }
    } catch (err) {
      console.error('[OPS:CLASSIFY] Failed to create daemon task:', err.message);
    }

    console.log(`[OPS:CLASSIFY] Task ${id} classified as "${classification}" → routed to ${routing.start}`);
    res.json({ ...result, daemon_task_id: daemonTaskId });
  } catch (err) {
    console.error('[OPS:CLASSIFY] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================
// PIPELINE — ADVANCE (Relay Engine) ENDPOINT (Phase 3)
// ============================

// POST /api/ops/pipeline/tasks/:id/advance
router.post('/pipeline/tasks/:id/advance', async (req, res) => {
  try {
    const { id } = req.params;
    const { agent, action, summary, rejection_notes, artifacts } = req.body || {};

    if (!agent || !VALID_AGENTS.includes(agent)) {
      return res.status(400).json({ error: 'agent must be a valid agent ID' });
    }
    if (!action || !['complete', 'approve', 'reject', 'modify'].includes(action)) {
      return res.status(400).json({ error: 'action must be one of: complete, approve, reject, modify' });
    }

    // ── V2: use board stage + AUTO_ADVANCE table ──
    const pipelineData = readJSON(PIPELINE_FILE);
    const opsTask = pipelineData.tasks.find(t => t.id === id);
    if (!opsTask) return res.status(404).json({ error: `Task not found: ${id}` });

    const currentStage = opsTask.stage || 'BUILDING';
    const key = `${currentStage}|${action}`;
    const transition = AUTO_ADVANCE[key];

    if (!transition) {
      // No registered transition — log and return gracefully (don't crash)
      console.warn(`[OPS:ADVANCE] No transition for key "${key}" — task ${id} stays in ${currentStage}`);
      return res.json({ ok: true, task_id: id, current_stage: currentStage, no_transition: true, message: `No auto-advance for ${key}` });
    }

    const { next_stage, next_agent } = transition;
    const now = new Date().toISOString();

    // Update Ops board card
    const result = await withFileLock(PIPELINE_FILE, () => {
      const data = readJSON(PIPELINE_FILE);
      const idx = data.tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;

      const task = data.tasks[idx];
      task.stage = next_stage;
      task.pipeline_stage = next_stage.toLowerCase(); // keep legacy field in sync
      task.stageEnteredAt = now;
      task.current_handler = next_agent || task.current_handler;
      if (next_agent && next_agent !== 'dano') task.assignee = next_agent;

      task.handler_history = task.handler_history || [];
      task.handler_history.push({ agent: next_agent || 'system', stage: next_stage, entered_at: now, action: 'auto-advanced' });

      task.pipeline_log = task.pipeline_log || [];
      task.pipeline_log.push({ from: currentStage, to: next_stage, by: agent, at: now, action, notes: summary || '' });

      task.history = task.history || [];
      task.history.push({ stage: next_stage, enteredAt: now, agent });

      if (action === 'reject') {
        task.rejection_count = (task.rejection_count || 0) + 1;
        task.rejection_notes = task.rejection_notes || [];
        task.rejection_notes.push({ at: now, notes: rejection_notes || summary || '', by: agent });
      }
      if (next_stage === 'BOSS_REVIEW') {
        task.approved_at = now;
      }
      if (next_stage === 'DONE') {
        task.completedAt = now;
        task.boss_notified = true;
      }

      data.tasks[idx] = task;
      writeJSON(PIPELINE_FILE, data);
      return task;
    });

    if (!result) return res.status(404).json({ error: `Task not found: ${id}` });

    // Stand-Up broadcast
    const fromLabel = currentStage;
    const toLabel = next_stage;
    const broadcastMsg = [
      `📋 PIPELINE UPDATE — ${result.name}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Stage: ${fromLabel} → ${toLabel}`,
      `Handler: ${agent} → ${next_agent}`,
      `Action: ${action}`,
      summary ? `Summary: ${(summary || '').slice(0, 300)}` : null,
      rejection_notes ? `🔴 Rejection: ${(rejection_notes || '').slice(0, 300)}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Task ID: ${id} | Rejections: ${result.rejection_count || 0}`,
    ].filter(Boolean).join('\n');

    const https2 = require('https');
    const standupBody = JSON.stringify({ from: 'pipeline-relay', to: 'standup', topic: 'standup', message: broadcastMsg });
    try {
      const sReq = https2.request({ hostname: 'localhost', port: 3000, path: '/api/comms/send', method: 'POST',
        headers: { 'x-api-key': req.headers['x-api-key'], 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(standupBody) },
        rejectUnauthorized: false });
      sReq.on('error', () => {});
      sReq.write(standupBody); sReq.end();
    } catch (e) { /* fire-and-forget */ }

    // Create daemon task for next agent (using V2 board stage → type map)
    let daemonTaskId = null;
    const nextTaskType = STAGE_TO_DAEMON_TYPE[next_stage];
    if (nextTaskType && next_agent && DAEMON_AGENTS.includes(next_agent)) {
      try {
        const lockfile2 = require('proper-lockfile');
        const ensureFile = () => { if (!fsSync.existsSync(TASKS_FILE)) fsSync.writeFileSync(TASKS_FILE, '[]', 'utf8'); };
        ensureFile();
        let release;
        try {
          release = await lockfile2.lock(TASKS_FILE, { retries: { retries: 3, minTimeout: 500 }, stale: 10000 });
          const tasks = JSON.parse(fsSync.readFileSync(TASKS_FILE, 'utf8'));
          // Build contextual payload
          let payload = `[RELAY] ${result.name}\n\nPrevious agent (${agent}) summary: ${summary || '(none)'}\nOriginal description: ${result.description || result.name}\nOps board task ID: ${id}`;
          if (action === 'reject') payload = `FIX REQUIRED — ${result.name}\n\nSentinel rejection notes: ${rejection_notes || summary || '(none)'}\nOriginal description: ${result.description || result.name}\nOps board task ID: ${id}\nRejection cycle: ${result.rejection_count}`;
          const daemonTask = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            type: nextTaskType, title: `[RELAY] ${result.name}`, payload,
            assigned_to: next_agent, priority: 'normal', status: 'pending',
            created_by: 'pipeline-relay', created_at: now,
            claimed_at: null, started_at: null, completed_at: null,
            result: null, result_summary: null, error: null,
            depends_on: [], tags: result.tags || [],
            ops_task_id: id,
          };
          tasks.push(daemonTask);
          const tmp = TASKS_FILE + '.tmp';
          fsSync.writeFileSync(tmp, JSON.stringify(tasks, null, 2), 'utf8');
          fsSync.renameSync(tmp, TASKS_FILE);
          daemonTaskId = daemonTask.id;
          console.log(`[OPS:ADVANCE] Daemon task for ${next_agent}: ${daemonTask.id}`);
        } finally {
          if (release) await release();
        }
      } catch (err) {
        console.error('[OPS:ADVANCE] Failed to create daemon task:', err.message);
      }
    }

    // Boss Telegram on BOSS_REVIEW or DONE
    if (next_stage === 'BOSS_REVIEW' || next_stage === 'DONE') {
      const handlers = (result.handler_history || []).map(h => h.agent).filter((v, i, a) => a.indexOf(v) === i).join(', ');
      const tgMsg = `✅ *SHIPPED: ${result.name}*\n\nPipeline: intake → build → review → QA → deploy\nAgents: ${handlers || agent}\nRejection cycles: ${result.rejection_count || 0}\n\nDeployed at: ${now}`;
      try {
        const tgBody = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: tgMsg, parse_mode: 'Markdown' });
        const tgReq = https2.request({ hostname: 'api.telegram.org', path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(tgBody) } });
        tgReq.on('error', () => {});
        tgReq.write(tgBody); tgReq.end();
      } catch (e) { /* silent */ }
    }

    // Safety valve: 3+ rejections
    if (action === 'reject' && (result.rejection_count || 0) >= 3) {
      await withFileLock(PIPELINE_FILE, () => {
        const data = readJSON(PIPELINE_FILE);
        const idx = data.tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
          data.tasks[idx].critical_blocker = true;
          data.tasks[idx].blocked = true;
          data.tasks[idx].blockerReason = '3+ rejections — systemic issue';
          writeJSON(PIPELINE_FILE, data);
        }
        return null;
      });
      const critMsg = `🚨 *CRITICAL BLOCKER: ${result.name}*\n\nRejected ${result.rejection_count} times.\nLatest: ${(rejection_notes || '').slice(0, 200)}\n\nNeeds attention.`;
      try {
        const critBody = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: critMsg, parse_mode: 'Markdown' });
        const critReq = https2.request({ hostname: 'api.telegram.org', path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(critBody) } });
        critReq.on('error', () => {});
        critReq.write(critBody); critReq.end();
      } catch (e) { /* silent */ }
    }

    console.log(`[OPS:ADVANCE] ${id}: ${currentStage} → ${next_stage} (${action})`);
    res.json({ ...result, next_stage, next_agent, daemon_task_id: daemonTaskId });
  } catch (err) {
    console.error('[OPS:ADVANCE] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================
// PIPELINE — FLAG CRITICAL (Phase 7)
// ============================

// POST /api/ops/pipeline/tasks/:id/flag-critical
router.post('/pipeline/tasks/:id/flag-critical', async (req, res) => {
  try {
    const { id } = req.params;
    const { agent, reason } = req.body || {};
    if (!agent) return res.status(400).json({ error: 'agent required' });
    if (!reason) return res.status(400).json({ error: 'reason required' });

    const now = new Date().toISOString();
    const result = await withFileLock(PIPELINE_FILE, () => {
      const data = readJSON(PIPELINE_FILE);
      const idx = data.tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;
      const task = data.tasks[idx];
      task.critical_blocker = true;
      task.blocked = true;
      task.blockerReason = reason;
      task.blockerSince = now;
      task.pipeline_log = task.pipeline_log || [];
      task.pipeline_log.push({ from: task.pipeline_stage, to: task.pipeline_stage, by: agent, at: now, action: 'flag-critical', notes: reason });
      data.tasks[idx] = task;
      writeJSON(PIPELINE_FILE, data);
      return task;
    });

    if (!result) return res.status(404).json({ error: `Task not found: ${id}` });

    // Stand-Up broadcast
    const broadcastMsg = `🚨 CRITICAL BLOCKER — ${result.name}\nFlagged by: ${agent}\nReason: ${reason}\nTask ID: ${id}`;
    const https2 = require('https');
    const standupBody = JSON.stringify({ from: agent, to: 'standup', topic: 'standup', message: broadcastMsg });
    try {
      const sReq = https2.request({ hostname: 'localhost', port: 3000, path: '/api/comms/send', method: 'POST',
        headers: { 'x-api-key': req.headers['x-api-key'], 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(standupBody) },
        rejectUnauthorized: false });
      sReq.on('error', () => {});
      sReq.write(standupBody); sReq.end();
    } catch (e) { /* fire-and-forget */ }

    // Telegram to Boss
    const tgMsg = `🚨 *CRITICAL BLOCKER: ${result.name}*\n\nStage: ${result.pipeline_stage}\nAgent: ${agent}\nReason: ${reason}\n\nNeeds attention.`;
    try {
      const tgBody = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: tgMsg, parse_mode: 'Markdown' });
      const tgReq = https2.request({ hostname: 'api.telegram.org', path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(tgBody) } });
      tgReq.on('error', () => {});
      tgReq.write(tgBody); tgReq.end();
    } catch (e) { /* silent */ }

    res.json(result);
  } catch (err) {
    console.error('[OPS:FLAG-CRITICAL] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================
// PIPELINE — TIMELINE (Phase 7)
// ============================

// GET /api/ops/pipeline/tasks/:id/timeline
router.get('/pipeline/tasks/:id/timeline', (req, res) => {
  try {
    const data = readJSON(PIPELINE_FILE);
    const task = data.tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: `Task not found: ${req.params.id}` });

    const timeline = (task.pipeline_log || []).map(entry => ({
      stage: entry.to || entry.from,
      agent: entry.by,
      action: entry.action || 'transition',
      at: entry.at,
      notes: entry.notes || '',
    }));

    const createdAt = task.createdAt ? new Date(task.createdAt).getTime() : 0;
    const now = Date.now();

    res.json({
      task_id: task.id,
      task_name: task.name,
      timeline,
      current_stage: task.pipeline_stage || task.stage,
      current_handler: task.current_handler || task.assignee,
      total_duration_ms: createdAt ? now - createdAt : 0,
    });
  } catch (err) {
    console.error('[OPS:TIMELINE] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================
// PIPELINE — BOARD VIEW (Phase 7)
// ============================

// GET /api/ops/pipeline/board
router.get('/pipeline/board', (req, res) => {
  try {
    const data = readJSON(PIPELINE_FILE);
    const board = {};
    for (const stage of VALID_STAGES) {
      if (stage !== 'ARCHIVED') board[stage] = [];
    }
    for (const task of data.tasks) {
      const s = task.stage || 'INTAKE';
      if (board[s]) board[s].push(task);
    }
    res.json(board);
  } catch (err) {
    console.error('[OPS:BOARD] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================
// PIPELINE — COMMENT (Phase 7)
// ============================

// POST /api/ops/pipeline/tasks/:id/comment
router.post('/pipeline/tasks/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    const { agent, comment, broadcast } = req.body || {};
    if (!agent) return res.status(400).json({ error: 'agent required' });
    if (!comment) return res.status(400).json({ error: 'comment required' });

    const now = new Date().toISOString();
    const result = await withFileLock(PIPELINE_FILE, () => {
      const data = readJSON(PIPELINE_FILE);
      const idx = data.tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;
      const task = data.tasks[idx];
      task.pipeline_log = task.pipeline_log || [];
      task.pipeline_log.push({ from: task.pipeline_stage, to: task.pipeline_stage, by: agent, at: now, action: 'comment', notes: comment });
      data.tasks[idx] = task;
      writeJSON(PIPELINE_FILE, data);
      return task;
    });

    if (!result) return res.status(404).json({ error: `Task not found: ${id}` });

    // Broadcast if requested
    if (broadcast) {
      const broadcastMsg = `💬 COMMENT on ${result.name}\nBy: ${agent}\n${comment}\nTask ID: ${id}`;
      const https2 = require('https');
      const standupBody = JSON.stringify({ from: agent, to: 'standup', topic: 'standup', message: broadcastMsg });
      try {
        const sReq = https2.request({ hostname: 'localhost', port: 3000, path: '/api/comms/send', method: 'POST',
          headers: { 'x-api-key': req.headers['x-api-key'], 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(standupBody) },
          rejectUnauthorized: false });
        sReq.on('error', () => {});
        sReq.write(standupBody); sReq.end();
      } catch (e) { /* fire-and-forget */ }
    }

    res.json(result);
  } catch (err) {
    console.error('[OPS:COMMENT] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================
// V2: COMMENTS (plural — task.comments[] array)
// ============================

// POST /api/ops/pipeline/tasks/:id/comments
router.post('/pipeline/tasks/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId, message } = req.body || {};
    if (!agentId || !VALID_AGENTS.includes(agentId)) return res.status(400).json({ error: 'agentId must be a valid agent' });
    if (!message || typeof message !== 'string' || message.length > 2000) return res.status(400).json({ error: 'message required (max 2000 chars)' });

    const result = await withFileLock(PIPELINE_FILE, () => {
      const data = readJSON(PIPELINE_FILE);
      const idx = data.tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;
      const task = data.tasks[idx];
      if (!task.comments) task.comments = [];
      task.comments.push({ agentId, message, createdAt: new Date().toISOString() });
      data.tasks[idx] = task;
      writeJSON(PIPELINE_FILE, data);
      return task;
    });
    if (!result) return res.status(404).json({ error: `Task not found: ${id}` });
    res.json(result);
  } catch (err) {
    console.error('[OPS:COMMENTS] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================
// V2: REVIEWS (agent sign-off)
// ============================

// POST /api/ops/pipeline/tasks/:id/reviews
router.post('/pipeline/tasks/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId, approved, note } = req.body || {};
    if (!agentId || !VALID_AGENTS.includes(agentId)) return res.status(400).json({ error: 'agentId must be a valid agent' });
    if (typeof approved !== 'boolean') return res.status(400).json({ error: 'approved must be boolean' });
    if (note && note.length > 2000) return res.status(400).json({ error: 'note max 2000 chars' });

    const result = await withFileLock(PIPELINE_FILE, () => {
      const data = readJSON(PIPELINE_FILE);
      const idx = data.tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;
      const task = data.tasks[idx];
      if (!task.reviews) task.reviews = [];
      // Upsert — one review per agent
      const existingIdx = task.reviews.findIndex(r => r.agentId === agentId);
      const review = { agentId, approved, note: note || '', reviewedAt: new Date().toISOString() };
      if (existingIdx !== -1) task.reviews[existingIdx] = review;
      else task.reviews.push(review);
      data.tasks[idx] = task;
      writeJSON(PIPELINE_FILE, data);
      return task;
    });
    if (!result) return res.status(404).json({ error: `Task not found: ${id}` });
    res.json(result);
  } catch (err) {
    console.error('[OPS:REVIEWS] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================
// V2: ARCHIVE
// ============================

// GET /api/ops/pipeline/tasks/archive
router.get('/pipeline/tasks/archive', (req, res) => {
  try {
    const data = readJSON(PIPELINE_FILE);
    let tasks = data.tasks.filter(t => t.stage === 'DONE');
    if (req.query.assignee && req.query.assignee !== 'all') tasks = tasks.filter(t => t.assignee === req.query.assignee);
    if (req.query.priority && req.query.priority !== 'all') tasks = tasks.filter(t => t.priority === req.query.priority);
    if (req.query.from) { const from = new Date(req.query.from).getTime(); tasks = tasks.filter(t => new Date(t.completedAt || t.createdAt).getTime() >= from); }
    if (req.query.to) { const to = new Date(req.query.to).getTime(); tasks = tasks.filter(t => new Date(t.completedAt || t.createdAt).getTime() <= to); }
    tasks.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    res.json({ tasks: tasks.slice(offset, offset + limit), total: tasks.length });
  } catch (err) {
    console.error('[OPS:ARCHIVE] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================
// KNOWLEDGE ROUTES
// ============================

// GET /api/ops/knowledge/entries
router.get('/knowledge/entries', (req, res) => {
  const data = readJSON(KNOWLEDGE_FILE);
  let entries = data.entries;

  // Category filter
  const category = req.query.category;
  if (category) {
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category: ${category}` });
    }
    entries = entries.filter(e => e.category === category);
  }

  // Search (case-insensitive substring on title, description, tags)
  const q = req.query.q;
  if (q) {
    const lower = q.toLowerCase();
    entries = entries.filter(e =>
      (e.title && e.title.toLowerCase().includes(lower)) ||
      (e.description && e.description.toLowerCase().includes(lower)) ||
      (Array.isArray(e.tags) && e.tags.some(t => t.toLowerCase().includes(lower)))
    );
  }

  res.json({ entries });
});

// POST /api/ops/knowledge/entries
router.post('/knowledge/entries', async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0 || body.title.length > 300) {
      return res.status(400).json({ error: 'Missing required field: title (string, 1-300 chars)' });
    }
    if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
      return res.status(400).json({ error: 'Missing required field: category (must be valid enum)' });
    }
    if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0 || body.description.length > 5000) {
      return res.status(400).json({ error: 'Missing required field: description (string, 1-5000 chars)' });
    }
    if (!body.discoveredBy || !VALID_AGENTS.includes(body.discoveredBy)) {
      return res.status(400).json({ error: 'Missing required field: discoveredBy (must be valid agent ID)' });
    }

    if (body.severity && !VALID_SEVERITIES.includes(body.severity)) {
      return res.status(400).json({ error: `Invalid value for severity: ${body.severity}` });
    }

    const now = new Date().toISOString();
    const entry = {
      id: shortId('kb'),
      title: body.title.trim(),
      category: body.category,
      severity: body.severity || 'MEDIUM',
      description: body.description.trim(),
      discoveredBy: body.discoveredBy,
      createdAt: now,
      updatedAt: now,
      tags: Array.isArray(body.tags) ? body.tags : [],
      hitCount: 0,
    };

    const created = await withFileLock(KNOWLEDGE_FILE, () => {
      const data = readJSON(KNOWLEDGE_FILE);
      data.entries.push(entry);
      writeJSON(KNOWLEDGE_FILE, data);
      return entry;
    });

    console.log(`[OPS:KNOWLEDGE] Created entry: ${created.id} — ${created.title}`);
    res.status(201).json(created);
  } catch (err) {
    console.error('[OPS:KNOWLEDGE] POST error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/ops/knowledge/entries/:id
router.patch('/knowledge/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body;
    if (!patch || typeof patch !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    if (patch.category && !VALID_CATEGORIES.includes(patch.category)) {
      return res.status(400).json({ error: `Invalid value for category: ${patch.category}` });
    }
    if (patch.severity && !VALID_SEVERITIES.includes(patch.severity)) {
      return res.status(400).json({ error: `Invalid value for severity: ${patch.severity}` });
    }

    const result = await withFileLock(KNOWLEDGE_FILE, () => {
      const data = readJSON(KNOWLEDGE_FILE);
      const idx = data.entries.findIndex(e => e.id === id);
      if (idx === -1) return null;

      const entry = data.entries[idx];
      if (patch.title !== undefined) entry.title = patch.title;
      if (patch.description !== undefined) entry.description = patch.description;
      if (patch.category !== undefined) entry.category = patch.category;
      if (patch.severity !== undefined) entry.severity = patch.severity;
      if (patch.tags !== undefined) entry.tags = patch.tags;
      if (patch.hitCount !== undefined) entry.hitCount = patch.hitCount;
      entry.updatedAt = new Date().toISOString();

      data.entries[idx] = entry;
      writeJSON(KNOWLEDGE_FILE, data);
      return entry;
    });

    if (!result) return res.status(404).json({ error: `Entry not found: ${id}` });
    res.json(result);
  } catch (err) {
    console.error('[OPS:KNOWLEDGE] PATCH error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/ops/knowledge/entries/:id
router.delete('/knowledge/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await withFileLock(KNOWLEDGE_FILE, () => {
      const data = readJSON(KNOWLEDGE_FILE);
      const idx = data.entries.findIndex(e => e.id === id);
      if (idx === -1) return null;
      const entry = data.entries.splice(idx, 1)[0];
      writeJSON(KNOWLEDGE_FILE, data);
      return entry;
    });

    if (!removed) return res.status(404).json({ error: `Entry not found: ${id}` });
    console.log(`[OPS:KNOWLEDGE] Deleted entry: ${id}`);
    res.json({ ok: true, deleted: removed });
  } catch (err) {
    console.error('[OPS:KNOWLEDGE] DELETE error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// ATTACHMENTS — POST /api/ops/pipeline/tasks/:id/attachments
//               GET  /api/ops/attachments/:taskId/:filename
//               DELETE /api/ops/pipeline/tasks/:id/attachments/:attId
// ============================================================
const multer = require('multer');
const ATTACHMENTS_DIR = '/home/clawd/.openclaw/data/attachments';
const ALLOWED_TYPES = /jpeg|jpg|png|gif|webp|pdf|txt|md/;
const MAX_SIZE_MB = 20;

// Per-task storage under ATTACHMENTS_DIR/{taskId}/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(ATTACHMENTS_DIR, req.params.id);
    fsSync.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const attId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    cb(null, attId + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const mime = file.mimetype;
    if (ALLOWED_TYPES.test(ext) || mime.startsWith('image/') || mime === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${ext}`));
    }
  },
});

// POST /api/ops/pipeline/tasks/:id/attachments
router.post('/pipeline/tasks/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const comment = req.body.comment || '';
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const attId = path.basename(req.file.filename, path.extname(req.file.filename));
    const attachment = {
      id: attId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      comment: comment.trim(),
      uploadedBy: req.body.uploadedBy || 'dano',
      uploadedAt: new Date().toISOString(),
      url: `/api/ops/attachments/${id}/${req.file.filename}`,
    };

    const saved = await withFileLock(PIPELINE_FILE, () => {
      const data = readJSON(PIPELINE_FILE);
      const task = data.tasks.find(t => t.id === id);
      if (!task) return null;
      if (!Array.isArray(task.attachments)) task.attachments = [];
      task.attachments.push(attachment);
      writeJSON(PIPELINE_FILE, data);
      return attachment;
    });

    if (!saved) return res.status(404).json({ error: `Task not found: ${id}` });
    console.log(`[OPS:ATTACHMENTS] Uploaded ${req.file.originalname} to task ${id}`);
    res.status(201).json({ ok: true, attachment: saved });
  } catch (err) {
    console.error('[OPS:ATTACHMENTS] Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ops/attachments/:taskId/:filename — serve file
router.get('/attachments/:taskId/:filename', (req, res) => {
  const { taskId, filename } = req.params;
  // Basic path sanitization
  const safeName = path.basename(filename);
  const filePath = path.join(ATTACHMENTS_DIR, taskId, safeName);
  if (!fsSync.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(filePath);
});

// DELETE /api/ops/pipeline/tasks/:id/attachments/:attId
router.delete('/pipeline/tasks/:id/attachments/:attId', async (req, res) => {
  try {
    const { id, attId } = req.params;
    const result = await withFileLock(PIPELINE_FILE, () => {
      const data = readJSON(PIPELINE_FILE);
      const task = data.tasks.find(t => t.id === id);
      if (!task) return null;
      const idx = (task.attachments || []).findIndex(a => a.id === attId);
      if (idx === -1) return { notFound: true };
      const [removed] = task.attachments.splice(idx, 1);
      writeJSON(PIPELINE_FILE, data);
      return removed;
    });
    if (!result) return res.status(404).json({ error: `Task not found: ${id}` });
    if (result.notFound) return res.status(404).json({ error: `Attachment not found: ${attId}` });

    // Delete file from disk (non-fatal if missing)
    try {
      const filePath = path.join(ATTACHMENTS_DIR, id, result.filename);
      if (fsSync.existsSync(filePath)) fsSync.unlinkSync(filePath);
    } catch {}

    res.json({ ok: true, deleted: result });
  } catch (err) {
    console.error('[OPS:ATTACHMENTS] Delete error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
