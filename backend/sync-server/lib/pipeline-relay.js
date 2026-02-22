/**
 * Pipeline Relay Engine — Automatic Agent-to-Agent Handoffs
 * Built by Mason (FF-BLD-001) — 2026-02-28
 *
 * When a daemon task completes, this module:
 * 1. Looks up the linked Ops board task (ops_task_id)
 * 2. Determines next pipeline stage from the relay table
 * 3. Creates a daemon task for the next agent
 * 4. Updates the Ops board card stage
 * 5. Writes to SHARED-LOG
 * 6. Posts to Stand-Up Room
 * 7. Sends Boss Telegram on deploy/critical
 */

const fs = require('fs');
const path = require('path');
const lockfile = require('proper-lockfile');
const https = require('https');

const TASKS_FILE = '/home/clawd/claude-comms/tasks.json';
const PIPELINE_FILE = '/home/clawd/.openclaw/data/pipeline/build-tasks.json';
const SHARED_LOG = '/home/clawd/.openclaw/workspace/SHARED-LOG.md';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8549625129:AAF0CSoyXFdFru5eEWQ0mflFZJmdquQ1z-k';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '5317054921';

// Relay table: pipeline_stage|action → next
const RELAY_TABLE = {
  'planning|complete':      { next_stage: 'mason_build',   next_agent: 'mason',    board_stage: 'BUILDING',    task_type: 'build' },
  'mason_build|complete':   { next_stage: 'soren_review',  next_agent: 'soren',    board_stage: 'REVIEW',      task_type: 'review' },
  'soren_review|complete':  { next_stage: 'mason_rebuild', next_agent: 'mason',    board_stage: 'REBUILDING',  task_type: 'build' },
  'soren_review|approve':   { next_stage: 'sentinel_qa',   next_agent: 'sentinel', board_stage: 'QA',          task_type: 'inspect' },
  'mason_rebuild|complete': { next_stage: 'sentinel_qa',   next_agent: 'sentinel', board_stage: 'QA',          task_type: 'inspect' },
  'sentinel_qa|approve':    { next_stage: 'deploy',        next_agent: 'system',   board_stage: 'DEPLOY',      task_type: null },
  'sentinel_qa|reject':     { next_stage: 'mason_fix',     next_agent: 'mason',    board_stage: 'FIX',         task_type: 'fix' },
  'mason_fix|complete':     { next_stage: 'sentinel_qa',   next_agent: 'sentinel', board_stage: 'QA',          task_type: 'inspect' },
  'deploy|complete':        { next_stage: 'done',          next_agent: 'clawd',    board_stage: 'DONE',        task_type: null },
};

// Stage labels for human-readable logs
const STAGE_LABELS = {
  intake: 'Intake',
  planning: 'Planning (Soren)',
  mason_build: 'Building (Mason)',
  soren_review: 'Review (Soren)',
  mason_rebuild: 'Rebuild (Mason)',
  sentinel_qa: 'QA (Sentinel)',
  mason_fix: 'Fix (Mason)',
  deploy: 'Deploy',
  done: 'Done',
};

// ============ HELPERS ============

function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return filePath === PIPELINE_FILE ? { tasks: [], lastModified: null } : []; }
}

function writeJSON(filePath, data) {
  if (data && typeof data === 'object' && !Array.isArray(data)) data.lastModified = new Date().toISOString();
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

async function createDaemonTask({ type, title, payload, assigned_to, created_by, ops_task_id, priority, tags }) {
  const ensureFile = () => { if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, '[]', 'utf8'); };
  ensureFile();
  let release;
  try {
    release = await lockfile.lock(TASKS_FILE, { retries: { retries: 3, minTimeout: 500 }, stale: 10000 });
    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    const daemonTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      type: type || 'build',
      title,
      payload,
      assigned_to,
      priority: priority || 'normal',
      status: 'pending',
      created_by: created_by || 'pipeline-relay',
      created_at: new Date().toISOString(),
      claimed_at: null, started_at: null, completed_at: null,
      result: null, result_summary: null, error: null,
      depends_on: [], tags: tags || [],
      ops_task_id: ops_task_id || null,
    };
    tasks.push(daemonTask);
    const tmp = TASKS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(tasks, null, 2), 'utf8');
    fs.renameSync(tmp, TASKS_FILE);
    console.log(`[RELAY] Daemon task created for ${assigned_to}: ${title} (${daemonTask.id})`);
    return daemonTask;
  } finally {
    if (release) await release();
  }
}

function updateOpsCard(opsTaskId, updates) {
  try {
    const data = readJSON(PIPELINE_FILE);
    const idx = data.tasks.findIndex(t => t.id === opsTaskId);
    if (idx === -1) { console.error(`[RELAY] Ops task not found: ${opsTaskId}`); return null; }
    const task = data.tasks[idx];
    const now = new Date().toISOString();

    Object.assign(task, updates);
    if (updates.stage && updates.stage !== task.stage) {
      task.stageEnteredAt = now;
      task.history = task.history || [];
      task.history.push({ stage: updates.stage, enteredAt: now, agent: updates.assignee || task.assignee });
    }
    task.handler_history = task.handler_history || [];
    if (updates.current_handler) {
      task.handler_history.push({ agent: updates.current_handler, stage: updates.pipeline_stage, entered_at: now, action: 'relayed' });
    }
    task.pipeline_log = task.pipeline_log || [];
    if (updates._log) {
      task.pipeline_log.push(updates._log);
      delete task._log;
    }

    data.tasks[idx] = task;
    writeJSON(PIPELINE_FILE, data);
    console.log(`[RELAY] Ops card ${opsTaskId} → stage: ${updates.stage}, handler: ${updates.current_handler}`);
    return task;
  } catch (e) {
    console.error(`[RELAY] Failed to update Ops card: ${e.message}`);
    return null;
  }
}

function appendSharedLog(agent, action, project, details) {
  try {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
    const entry = [
      `### [${now}] | ${agent.toUpperCase()} | ${action} | ${project}`,
      `**What:** ${details.what}`,
      `**Why:** ${details.why}`,
      `**Impact:** ${details.impact}`,
      `**Status:** ${details.status}`,
      details.files ? `**Files changed:** ${details.files}` : null,
      '---',
      '',
    ].filter(Boolean).join('\n');

    const existing = fs.existsSync(SHARED_LOG) ? fs.readFileSync(SHARED_LOG, 'utf8') : '';
    fs.writeFileSync(SHARED_LOG, entry + '\n' + existing, 'utf8');
    console.log(`[RELAY] SHARED-LOG entry written: ${action} — ${project}`);
  } catch (e) {
    console.error(`[RELAY] SHARED-LOG write failed: ${e.message}`);
  }
}

function postStandupMessage(apiUrl, apiKey, from, message) {
  try {
    const http = require('http');
    const body = JSON.stringify({ from, to: 'standup', topic: 'standup', message });
    const url = new URL(`${apiUrl}/api/comms/send`);
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      rejectUnauthorized: false,
    });
    req.on('error', () => {});
    req.write(body); req.end();
  } catch (e) { /* fire-and-forget */ }
}

function sendTelegramBoss(message) {
  try {
    const body = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    });
    req.on('error', () => {});
    req.write(body); req.end();
    console.log('[RELAY] Telegram notification sent to Boss');
  } catch (e) { /* silent */ }
}

// ============ MAIN RELAY FUNCTION ============

/**
 * Called when a daemon task completes or when an agent posts a result.
 * @param {object} completedTask - The daemon task that just completed
 * @param {string} action - 'complete' | 'approve' | 'reject'
 * @param {object} opts - { summary, rejection_notes, apiUrl, apiKey }
 */
async function handleRelay(completedTask, action, opts = {}) {
  const opsTaskId = completedTask.ops_task_id;
  if (!opsTaskId) {
    console.log(`[RELAY] No ops_task_id on task ${completedTask.id} — skipping relay`);
    return null;
  }

  const apiUrl = opts.apiUrl || process.env.COMMS_API_URL || 'http://localhost:3457';
  const apiKey = opts.apiKey || process.env.COMMS_API_KEY;
  const summary = opts.summary || completedTask.result_summary || '';
  const rejectionNotes = opts.rejection_notes || '';

  // Read ops task to get current pipeline_stage
  const pipelineData = readJSON(PIPELINE_FILE);
  const opsTask = pipelineData.tasks.find(t => t.id === opsTaskId);
  if (!opsTask) {
    console.error(`[RELAY] Ops task ${opsTaskId} not found — cannot relay`);
    return null;
  }

  const currentStage = opsTask.pipeline_stage || 'mason_build';
  const key = `${currentStage}|${action}`;
  const transition = RELAY_TABLE[key];

  if (!transition) {
    console.log(`[RELAY] No relay transition for ${key} — pipeline stops here`);
    return null;
  }

  const { next_stage, next_agent, board_stage, task_type } = transition;
  const fromLabel = STAGE_LABELS[currentStage] || currentStage;
  const toLabel = STAGE_LABELS[next_stage] || next_stage;
  const now = new Date().toISOString();

  console.log(`[RELAY] ${opsTask.name}: ${fromLabel} → ${toLabel} (${action})`);

  // 1. Update Ops board card
  const cardUpdates = {
    stage: board_stage,
    pipeline_stage: next_stage,
    assignee: next_agent === 'system' ? opsTask.assignee : next_agent,
    current_handler: next_agent,
    _log: { from: currentStage, to: next_stage, by: completedTask.assigned_to, at: now, action, notes: summary },
  };

  if (action === 'reject') {
    cardUpdates.rejection_count = (opsTask.rejection_count || 0) + 1;
    cardUpdates.rejection_notes = [...(opsTask.rejection_notes || []), { at: now, notes: rejectionNotes, by: completedTask.assigned_to }];
  }
  if (action === 'approve' && next_stage === 'deploy') {
    cardUpdates.approved_at = now;
  }
  if (next_stage === 'done') {
    cardUpdates.deployed_at = now;
    cardUpdates.boss_notified = true;
  }

  const updatedCard = updateOpsCard(opsTaskId, cardUpdates);

  // 2. Broadcast to Stand-Up Room
  const broadcastMsg = [
    `📋 PIPELINE UPDATE — ${opsTask.name}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Stage: ${fromLabel} → ${toLabel}`,
    `Handler: ${completedTask.assigned_to} → ${next_agent}`,
    `Action: ${action}`,
    summary ? `Summary: ${summary.slice(0, 300)}` : null,
    rejectionNotes ? `🔴 Rejection: ${rejectionNotes.slice(0, 300)}` : null,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Task ID: ${opsTaskId} | Rejections: ${updatedCard?.rejection_count || 0}`,
  ].filter(Boolean).join('\n');

  postStandupMessage(apiUrl, apiKey, 'pipeline-relay', broadcastMsg);

  // 3. Create daemon task for next agent (if applicable)
  let daemonTask = null;
  if (task_type && next_agent !== 'system') {
    const payload = buildPayload(opsTask, next_stage, action, summary, rejectionNotes);
    daemonTask = await createDaemonTask({
      type: task_type,
      title: `[RELAY] ${opsTask.name}`,
      payload,
      assigned_to: next_agent,
      created_by: 'pipeline-relay',
      ops_task_id: opsTaskId,
      tags: opsTask.tags || [],
    });
  }

  // 4. Write SHARED-LOG
  const logAgent = action === 'reject' ? completedTask.assigned_to : (next_agent !== 'system' ? next_agent : completedTask.assigned_to);
  appendSharedLog('RELAY', action.toUpperCase(), opsTask.name, {
    what: `Pipeline relay: ${fromLabel} → ${toLabel} (${action})`,
    why: `Auto-handoff after ${completedTask.assigned_to} ${action}`,
    impact: summary ? summary.slice(0, 200) : `Task relayed to ${next_agent}`,
    status: next_stage === 'done' ? 'DONE' : 'IN PROGRESS',
  });

  // 5. Boss notifications
  if (next_stage === 'deploy' || next_stage === 'done') {
    const totalRejections = updatedCard?.rejection_count || 0;
    const handlers = (updatedCard?.handler_history || []).map(h => h.agent).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    sendTelegramBoss(
      `✅ *SHIPPED: ${opsTask.name}*\n\n` +
      `Pipeline: intake → build → review → QA → deploy\n` +
      `Agents: ${handlers || 'mason, soren, sentinel'}\n` +
      `Rejection cycles: ${totalRejections}\n\n` +
      `Deployed at: ${now}`
    );
  }

  // 6. Safety valve: 3+ rejections → critical blocker
  if (action === 'reject' && (updatedCard?.rejection_count || 0) >= 3) {
    updateOpsCard(opsTaskId, { critical_blocker: true, blocked: true, blockerReason: '3+ rejections — systemic issue' });
    sendTelegramBoss(
      `🚨 *CRITICAL BLOCKER: ${opsTask.name}*\n\n` +
      `Rejected ${updatedCard.rejection_count} times.\n` +
      `Latest: ${rejectionNotes.slice(0, 200)}\n\n` +
      `Needs attention.`
    );
  }

  return { next_stage, next_agent, daemon_task_id: daemonTask?.id || null, board_stage };
}

function buildPayload(opsTask, nextStage, action, prevSummary, rejectionNotes) {
  const parts = [];
  const desc = opsTask.description || opsTask.name;

  switch (nextStage) {
    case 'soren_review':
      parts.push(`REVIEW REQUEST — ${opsTask.name}`);
      parts.push(`\nMason completed the build. Review for architectural alignment.`);
      parts.push(`\nMason's summary: ${prevSummary || '(none provided)'}`);
      parts.push(`\nOriginal spec: ${desc}`);
      break;
    case 'mason_rebuild':
      parts.push(`REBUILD REQUEST — ${opsTask.name}`);
      parts.push(`\nSoren reviewed and has feedback. Implement the required changes.`);
      parts.push(`\nSoren's review notes: ${prevSummary || '(none provided)'}`);
      parts.push(`\nOriginal spec: ${desc}`);
      break;
    case 'sentinel_qa':
      parts.push(`QA INSPECTION — ${opsTask.name}`);
      parts.push(`\nBuild is ready for QA inspection.`);
      parts.push(`\nPrevious agent summary: ${prevSummary || '(none provided)'}`);
      parts.push(`\nOriginal spec: ${desc}`);
      if ((opsTask.rejection_count || 0) > 0) {
        parts.push(`\n⚠️ This is re-inspection #${opsTask.rejection_count + 1}`);
      }
      break;
    case 'mason_fix':
      parts.push(`FIX REQUIRED — ${opsTask.name}`);
      parts.push(`\nSentinel REJECTED. Fix the following issues:`);
      parts.push(`\nRejection notes: ${rejectionNotes || prevSummary || '(none provided)'}`);
      parts.push(`\nOriginal spec: ${desc}`);
      parts.push(`\nRejection cycle: ${(opsTask.rejection_count || 0) + 1}`);
      break;
    case 'mason_build':
      parts.push(`BUILD TASK — ${opsTask.name}`);
      parts.push(`\nSoren's plan is ready. Build per spec.`);
      parts.push(`\nSoren's notes: ${prevSummary || '(none provided)'}`);
      parts.push(`\nOriginal spec: ${desc}`);
      break;
    default:
      parts.push(`${opsTask.name}\n${desc}`);
  }

  parts.push(`\nOps board task ID: ${opsTask.id}`);
  return parts.join('');
}

module.exports = { handleRelay, RELAY_TABLE, STAGE_LABELS };
