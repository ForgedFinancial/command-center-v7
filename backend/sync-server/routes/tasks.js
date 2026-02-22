/**
 * Task Queue API — Agent Daemon System
 * Routes: /api/comms/tasks/*
 * Built by Mason (FF-BLD-001) — 2026-02-21
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const lockfile = require('proper-lockfile');

// DEPRECATED 2026-02-20: relay replaced by v2AutoAdvance in tasks.js — see CC-V7-FIX-SPRINT-SPEC.md
// const { handleRelay } = require('../lib/pipeline-relay');
const https = require('https');

const TASKS_FILE = '/home/clawd/claude-comms/tasks.json';
const PIPELINE_FILE = '/home/clawd/.openclaw/data/pipeline/build-tasks.json';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8549625129:AAF0CSoyXFdFru5eEWQ0mflFZJmdquQ1z-k';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '5317054921';
const COMMS_API_KEY = process.env.COMMS_API_KEY || '8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0';

// V2 auto-advance table
const V2_AUTO_ADVANCE = {
  'SPEC|complete':       { next: 'BUILDING',    agent: 'mason' },
  'BUILDING|complete':   { next: 'QA',          agent: 'sentinel' },
  'REVIEW|complete':     { next: 'BUILDING',    agent: 'mason' },
  'QA|approve':          { next: 'BOSS_REVIEW', agent: 'dano' },
  'QA|reject':           { next: 'BUILDING',    agent: 'mason' },
  'QA|complete':         { next: 'BOSS_REVIEW', agent: 'dano' },  // default complete = approve for QA
  'BOSS_REVIEW|approve': { next: 'DONE',        agent: null },
  'BOSS_REVIEW|reject':  { next: 'BUILDING',    agent: 'mason' },
};

const V2_STAGE_TO_DAEMON = { SPEC: 'plan', BUILDING: 'build', QA: 'inspect', REVIEW: 'review' };
const V2_DAEMON_AGENTS = ['soren', 'mason', 'sentinel'];

function v2AutoAdvance(opsTaskId, completedDaemonTask, action) {
  try {
    // Read ops task
    const pData = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));
    const opsTask = (pData.tasks || []).find(t => t.id === opsTaskId);
    if (!opsTask) { console.log(`[V2-ADVANCE] Ops task ${opsTaskId} not found`); return; }

    const key = `${opsTask.stage}|${action}`;
    const transition = V2_AUTO_ADVANCE[key];
    if (!transition) { console.log(`[V2-ADVANCE] No transition for ${key}`); return; }

    const now = new Date().toISOString();
    const { next, agent } = transition;

    // Update ops card
    opsTask.stage = next;
    opsTask.stageEnteredAt = now;
    if (agent) opsTask.assignee = agent;
    opsTask.current_handler = agent;
    if (!opsTask.history) opsTask.history = [];
    opsTask.history.push({ stage: next, enteredAt: now, agent: completedDaemonTask.assigned_to });
    if (next === 'DONE') opsTask.completedAt = now;

    pData.lastModified = now;
    const tmp = PIPELINE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(pData, null, 2), 'utf8');
    fs.renameSync(tmp, PIPELINE_FILE);
    console.log(`[V2-ADVANCE] ${opsTask.name}: ${key} → ${next} (${agent || 'none'})`);

    // Create daemon task for next agent if applicable
    if (agent && V2_DAEMON_AGENTS.includes(agent) && V2_STAGE_TO_DAEMON[next]) {
      const daemonType = V2_STAGE_TO_DAEMON[next];
      const summary = completedDaemonTask.result_summary || '';
      let payload = `[AUTO-ADVANCE] ${opsTask.name}\n\nPrevious: ${completedDaemonTask.assigned_to} (${action})\nSummary: ${summary}\nDescription: ${opsTask.description || opsTask.name}\nOps task: ${opsTaskId}`;
      if (action === 'reject') payload = `FIX REQUIRED — ${opsTask.name}\n\nRejection: ${summary}\nDescription: ${opsTask.description || opsTask.name}\nOps task: ${opsTaskId}`;

      const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
      tasks.push({
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        type: daemonType, title: `[AUTO] ${opsTask.name}`, payload,
        assigned_to: agent, priority: opsTask.priority || 'normal', status: 'pending',
        created_by: 'auto-advance', created_at: now,
        claimed_at: null, started_at: null, completed_at: null,
        result: null, result_summary: null, error: null,
        depends_on: [], tags: opsTask.tags || [],
        ops_task_id: opsTaskId,
      });
      const tmp2 = TASKS_FILE + '.tmp';
      fs.writeFileSync(tmp2, JSON.stringify(tasks, null, 2), 'utf8');
      fs.renameSync(tmp2, TASKS_FILE);
      console.log(`[V2-ADVANCE] Daemon task queued for ${agent} (${daemonType})`);
    }

    // Stand-Up broadcast
    const broadcastMsg = `[STAGE ADVANCE] ${opsTask.name} (${opsTaskId}) moved to ${next}${agent ? ` — ${agent} auto-assigned` : ''}`;
    const standupBody = JSON.stringify({ from: 'auto-advance', to: 'standup', topic: 'standup', message: broadcastMsg });
    try {
      const sReq = https.request({ hostname: 'localhost', port: 3000, path: '/api/comms/send', method: 'POST',
        headers: { 'x-api-key': COMMS_API_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(standupBody) },
        rejectUnauthorized: false });
      sReq.on('error', () => {});
      sReq.write(standupBody); sReq.end();
    } catch (e) { /* fire-and-forget */ }

    // Telegram to Boss when hitting BOSS_REVIEW
    if (next === 'BOSS_REVIEW') {
      const tgMsg = `🔔 Ready for review: *${opsTask.name}* (${opsTaskId}) — Sentinel approved. Check Ops Board.`;
      const tgBody = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: tgMsg, parse_mode: 'Markdown' });
      try {
        const tgReq = https.request({ hostname: 'api.telegram.org', path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(tgBody) } });
        tgReq.on('error', () => {});
        tgReq.write(tgBody); tgReq.end();
      } catch (e) { /* silent */ }
    }
  } catch (e) {
    console.error(`[V2-ADVANCE] Error: ${e.message}`);
  }
}

function v2HandleFailed(opsTaskId, daemonTask) {
  try {
    const pData = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));
    const opsTask = (pData.tasks || []).find(t => t.id === opsTaskId);
    if (!opsTask) return;
    opsTask.blocked = true;
    opsTask.blockerReason = (daemonTask.error || 'Daemon task failed').slice(0, 300);
    opsTask.blockerSince = new Date().toISOString();
    pData.lastModified = new Date().toISOString();
    const tmp = PIPELINE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(pData, null, 2), 'utf8');
    fs.renameSync(tmp, PIPELINE_FILE);
    console.log(`[V2-ADVANCE] Task ${opsTaskId} BLOCKED: ${opsTask.blockerReason}`);
  } catch (e) { console.error(`[V2-ADVANCE] handleFailed error: ${e.message}`); }
}
const VALID_AGENTS = ['soren', 'mason', 'sentinel'];
const VALID_STATUSES = ['pending', 'claimed', 'running', 'complete', 'failed', 'cancelled'];
const VALID_TYPES = ['build', 'plan', 'inspect', 'research', 'review', 'fix', 'mention', 'chat'];
const VALID_PRIORITIES = ['critical', 'high', 'normal', 'low'];

// Ensure tasks.json exists
if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, '[]', 'utf8');
}

// Atomic read/write helpers with file locking
async function withLock(fn) {
  let release;
  try {
    release = await lockfile.lock(TASKS_FILE, { retries: { retries: 3, minTimeout: 500, maxTimeout: 3000 }, stale: 10000 });
    const data = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    const result = await fn(data);
    if (result.save) {
      const tmp = TASKS_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(result.data, null, 2), 'utf8');
      fs.renameSync(tmp, TASKS_FILE);
    }
    return result.value;
  } finally {
    if (release) await release();
  }
}

function readTasks() {
  try { return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8')); }
  catch { return []; }
}

function generateTaskId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

// GET /api/comms/tasks — list tasks
router.get('/', (req, res) => {
  try {
    let tasks = readTasks().filter(t => t.status !== 'cancelled');
    if (req.query.for) tasks = tasks.filter(t => t.assigned_to === req.query.for);
    if (req.query.status) tasks = tasks.filter(t => t.status === req.query.status);
    if (req.query.type) tasks = tasks.filter(t => t.type === req.query.type);
    // Sort: critical > high > normal > low
    const pOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    tasks.sort((a, b) => (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2));
    const limit = parseInt(req.query.limit) || 50;
    res.json(tasks.slice(0, limit));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/comms/tasks — create task
router.post('/', async (req, res) => {
  try {
    const { type, title, payload, assigned_to, priority, created_by, depends_on, tags, ttl_minutes } = req.body;
    if (!type || !title || !payload || !assigned_to) {
      return res.status(400).json({ error: 'Required: type, title, payload, assigned_to' });
    }
    if (!VALID_AGENTS.includes(assigned_to)) {
      return res.status(400).json({ error: `assigned_to must be one of: ${VALID_AGENTS.join(', ')}` });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }

    const task = {
      id: generateTaskId(),
      type,
      title,
      payload,
      assigned_to,
      priority: VALID_PRIORITIES.includes(priority) ? priority : 'normal',
      status: 'pending',
      created_by: created_by || 'unknown',
      created_at: new Date().toISOString(),
      claimed_at: null,
      started_at: null,
      completed_at: null,
      result: null,
      result_summary: null,
      error: null,
      depends_on: depends_on || [],
      tags: tags || [],
      ttl_minutes: ttl_minutes || 60
    };

    const saved = await withLock(async (tasks) => {
      tasks.push(task);
      return { save: true, data: tasks, value: task };
    });

    res.status(201).json(saved);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/comms/tasks/:id — get single task
router.get('/:id', (req, res) => {
  try {
    const tasks = readTasks();
    const task = tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/comms/tasks/:id/claim — atomic claim
router.post('/:id/claim', async (req, res) => {
  try {
    const agent = req.body.agent || req.headers['x-agent'];
    if (!agent) return res.status(400).json({ error: 'agent required in body or x-agent header' });

    const result = await withLock(async (tasks) => {
      const task = tasks.find(t => t.id === req.params.id);
      if (!task) return { save: false, value: { status: 404, body: { error: 'Task not found' } } };
      if (task.status !== 'pending') return { save: false, value: { status: 409, body: { error: 'Task already claimed or not pending', current_status: task.status } } };
      if (task.assigned_to !== agent) return { save: false, value: { status: 403, body: { error: 'Task not assigned to you' } } };

      task.status = 'claimed';
      task.claimed_at = new Date().toISOString();
      return { save: true, data: tasks, value: { status: 200, body: task } };
    });

    res.status(result.status).json(result.body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/comms/tasks/:id — update task
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['status', 'result', 'result_summary', 'error', 'started_at', 'completed_at',
                     'pipeline_action', 'rejection_notes'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const result = await withLock(async (tasks) => {
      const task = tasks.find(t => t.id === req.params.id);
      if (!task) return { save: false, value: { status: 404, body: { error: 'Task not found' } } };
      const prevStatus = task.status;
      Object.assign(task, updates);
      return { save: true, data: tasks, value: { status: 200, body: task, prevStatus, task } };
    });

    res.status(result.status).json(result.body);

    // Fire pipeline relay on task completion (fire-and-forget)
    if (result.body && result.status === 200 && result.prevStatus !== 'complete' && result.body.status === 'complete') {
      const task = result.body;
      if (task.ops_task_id) {
        // Determine relay action: check for explicit pipeline_action, or parse from result
        let action = req.body.pipeline_action || 'complete';
        const resultText = (task.result_summary || task.result || '').toLowerCase();

        // Auto-detect approve/reject from sentinel results
        if (task.assigned_to === 'sentinel') {
          if (resultText.includes('approved') || resultText.includes('approve') || resultText.includes('pass')) {
            action = 'approve';
          } else if (resultText.includes('rejected') || resultText.includes('reject') || resultText.includes('fail')) {
            action = 'reject';
          }
        }
        // Auto-detect soren approve (no issues)
        if (task.assigned_to === 'soren' && task.type === 'review') {
          if (resultText.includes('approved') || resultText.includes('no issues') || resultText.includes('lgtm')) {
            action = 'approve';
          }
        }

        // V2 auto-advance (direct ops card update + daemon task creation)
        v2AutoAdvance(task.ops_task_id, task, action);

        // DEPRECATED 2026-02-20: pipeline relay disabled — v2AutoAdvance is sole transition engine
        // handleRelay(task, action, { ... });

        // KB Auto-Lesson: when sentinel completes a task, auto-create knowledge entry
        if (task.assigned_to === 'sentinel' && task.status === 'complete') {
          try {
            const kbEntry = {
              id: `kb-${Date.now()}`,
              title: `[Auto] ${task.title || 'Untitled'} — Sentinel Finding`,
              category: 'inspection',
              severity: (task.result && task.result.severity) || 'info',
              content: task.result_summary || task.result || 'No summary provided',
              source_task_id: task.id,
              source_agent: 'sentinel',
              tags: ['auto-generated', task.project || 'general'],
              created_at: new Date().toISOString(),
              actionable: true
            };
            const kbPath = path.join(__dirname, '..', 'data', 'knowledge', 'entries.json');
            let entries = [];
            try { entries = JSON.parse(fs.readFileSync(kbPath, 'utf8')); } catch {}
            entries.push(kbEntry);
            fs.writeFileSync(kbPath, JSON.stringify(entries, null, 2));
            console.log(`[KB] Auto-lesson created: ${kbEntry.title}`);
          } catch (e) {
            console.error(`[KB] Auto-lesson failed: ${e.message}`);
          }
        }
      }
    }

    // Handle failed tasks — mark ops card as BLOCKED (AC-AUTO5)
    if (result.body && result.status === 200 && result.prevStatus !== 'failed' && result.body.status === 'failed') {
      const task = result.body;
      if (task.ops_task_id) {
        v2HandleFailed(task.ops_task_id, task);
      }
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/comms/tasks/:id — soft delete (cancel)
router.delete('/:id', async (req, res) => {
  try {
    const result = await withLock(async (tasks) => {
      const task = tasks.find(t => t.id === req.params.id);
      if (!task) return { save: false, value: { status: 404, body: { error: 'Task not found' } } };
      task.status = 'cancelled';
      return { save: true, data: tasks, value: { status: 200, body: { message: 'Task cancelled', id: task.id } } };
    });

    res.status(result.status).json(result.body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
