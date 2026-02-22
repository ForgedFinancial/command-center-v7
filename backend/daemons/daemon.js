#!/usr/bin/env node
require('dotenv').config();
/**
 * Forged Financial Agent Daemon Runner
 * Usage: node daemon.js --agent <openclaw-agent-id> --name <daemon-name> --poll-interval <seconds>
 */
const { execSync, spawn } = require('child_process');
const TaskClient = require('./lib/task-client');
const { postStandup } = require('./lib/standup');
const { appendLog, extractSummary } = require('./lib/shared-log');
const { writeHeartbeat, notifyWatchdog, notifyReady } = require('./lib/watchdog');

// Parse CLI args
const args = {};
process.argv.slice(2).forEach((arg, i, arr) => {
  if (arg.startsWith('--')) args[arg.slice(2)] = arr[i + 1];
});

const AGENT_ID = args.agent;          // openclaw agent id (architect, mason, sentinel)
const DAEMON_NAME = args.name;        // human name (soren, mason, sentinel)
const POLL_INTERVAL = parseInt(args['poll-interval']) || 15;
const API_URL = process.env.COMMS_API_URL || 'http://localhost:3457';
const API_KEY = process.env.COMMS_API_KEY;
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN;
const OPENCLAW_BIN = '/usr/bin/openclaw';
const TASK_TIMEOUT = 300; // 5 min
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8549625129:AAF0CSoyXFdFru5eEWQ0mflFZJmdquQ1z-k';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '5317054921';

// Notify Boss via Telegram
async function notifyBoss(message) {
  try {
    const https = require('https');
    const body = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' });
    await new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, resolve);
      req.on('error', () => {});
      req.write(body);
      req.end();
    });
  } catch (e) { /* silent fail — never crash daemon on notification error */ }
}

if (!AGENT_ID || !DAEMON_NAME || !API_KEY) {
  console.error('Required: --agent <id> --name <name> and COMMS_API_KEY env');
  process.exit(1);
}

const client = new TaskClient(API_URL, API_KEY, DAEMON_NAME);
let lastIdlePost = 0;
let lastHeartbeat = 0;
let running = true;

function log(msg) {
  const ts = new Date().toISOString();
  console.log(JSON.stringify({ ts, agent: DAEMON_NAME, msg }));
}

function logError(msg) {
  const ts = new Date().toISOString();
  console.error(JSON.stringify({ ts, agent: DAEMON_NAME, level: 'error', msg }));
}

// Run openclaw agent with task payload
function executeTask(payload) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (GATEWAY_TOKEN) env.OPENCLAW_TOKEN = GATEWAY_TOKEN;

    const child = spawn(OPENCLAW_BIN, [
      'agent', '--agent', AGENT_ID,
      '-m', payload,
      '--timeout', String(TASK_TIMEOUT),
      '--json'
    ], { env, timeout: (TASK_TIMEOUT + 30) * 1000 });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', code => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `Exit code ${code}`));
    });
    child.on('error', reject);
  });
}

async function processTask(task) {
  log(`Claiming task: ${task.id} — ${task.title}`);

  // Claim
  try {
    await client.claimTask(task.id);
  } catch (e) {
    if (e.response && e.response.status === 409) {
      log('Task already claimed, skipping');
      return;
    }
    throw e;
  }

  // Mark running
  await client.updateTask(task.id, { status: 'running', started_at: new Date().toISOString() });
  await postStandup(API_URL, API_KEY, DAEMON_NAME, `🔄 ${DAEMON_NAME} working on: ${task.title}`);

  // Execute — keepalive pings systemd watchdog every 30s during long Claude calls
  const watchdogInterval = setInterval(() => {
    writeHeartbeat(DAEMON_NAME);
    notifyWatchdog();
  }, 30000);

  try {
    const result = await executeTask(task.payload);
    clearInterval(watchdogInterval);
    const summary = extractSummary(result) || (result.length > 500 ? result.slice(0, 500) + '...' : result);

    await client.updateTask(task.id, {
      status: 'complete',
      result: result,
      result_summary: summary,
      completed_at: new Date().toISOString()
    });

    await postStandup(API_URL, API_KEY, DAEMON_NAME, `✅ ${DAEMON_NAME} completed: ${task.title}`);
    appendLog(DAEMON_NAME, task.type.toUpperCase(), task.title, {
      what: `Completed task: ${task.title}`,
      why: `Task from ${task.created_by}`,
      impact: summary,
      status: 'DONE'
    });
    await notifyBoss(`✅ *${DAEMON_NAME.toUpperCase()} DONE*\n*${task.title}*\n\n${summary}`);
    log(`Task complete: ${task.id}`);

    // Pipeline relay: auto-advance if this is a pipeline task
    if (task.ops_task_id) {
      try {
        const advResult = await client.advancePipeline(task.ops_task_id, DAEMON_NAME, 'complete', summary);
        if (advResult) {
          log(`Pipeline advanced: ${task.ops_task_id} → ${advResult.next_stage}`);
        }
      } catch (advErr) {
        logError(`Pipeline advance failed (non-fatal): ${advErr.message}`);
      }
    }
  } catch (e) {
    clearInterval(watchdogInterval);
    const errMsg = e.message.length > 500 ? e.message.slice(0, 500) : e.message;
    const isRateLimit = /rate.limit|rate_limit|cooldown|quota|429/i.test(errMsg);

    if (isRateLimit) {
      // Rate limit — reset to pending so it gets retried on next poll
      const retryAfter = new Date(Date.now() + 90000).toISOString(); // retry after 90s
      await client.updateTask(task.id, {
        status: 'pending',
        claimed_at: null,
        started_at: null,
        error: `rate_limited — will retry after ${retryAfter}`,
      });
      log(`Rate limited on task ${task.id} — reset to pending, retry in 90s`);
      await postStandup(API_URL, API_KEY, DAEMON_NAME, `⏳ ${DAEMON_NAME} rate limited — will retry: ${task.title}`);
      await new Promise(r => setTimeout(r, 90000)); // wait 90s before polling again
    } else {
      await client.updateTask(task.id, {
        status: 'failed',
        error: errMsg,
        completed_at: new Date().toISOString()
      });
      await postStandup(API_URL, API_KEY, DAEMON_NAME, `❌ ${DAEMON_NAME} failed: ${task.title} — ${errMsg.slice(0, 200)}`);
      await notifyBoss(`❌ *${DAEMON_NAME.toUpperCase()} FAILED*\n*${task.title}*\n\n${errMsg.slice(0, 300)}`);
      logError(`Task failed: ${task.id} — ${errMsg}`);
    }
  }
}

async function mainLoop() {
  // Startup
  log('Daemon starting');

  // Health check with retries
  for (let i = 0; i < 3; i++) {
    try {
      await client.healthCheck();
      log('API health check passed');
      break;
    } catch (e) {
      logError(`Health check failed (attempt ${i + 1}/3): ${e.message}`);
      if (i === 2) { process.exit(1); }
      await sleep(5000 * (i + 1));
    }
  }

  // Check for stale claimed OR running tasks from previous crash
  try {
    const staleClaimed = await client.getTasks('claimed', 10);
    for (const task of staleClaimed) {
      log(`Resetting stale claimed task: ${task.id}`);
      await client.updateTask(task.id, { status: 'pending', claimed_at: null });
    }
    // Reset ALL running tasks assigned to THIS agent on startup.
    // Any task in 'running' state at startup was being executed by a crashed instance — always retry.
    const staleRunning = await client.getTasks('running', 10);
    for (const task of staleRunning) {
      if (task.assigned_to !== DAEMON_NAME) continue;
      log(`Resetting running task from crashed instance: ${task.id}`);
      await client.updateTask(task.id, { status: 'pending', claimed_at: null, started_at: null });
    }
  } catch {}

  await postStandup(API_URL, API_KEY, DAEMON_NAME, `🟢 ${DAEMON_NAME} daemon online`);
  writeHeartbeat(DAEMON_NAME);
  notifyReady();   // Signal systemd we are up and ready
  notifyWatchdog(); // Initial watchdog ping

  // Main poll loop
  while (running) {
    try {
      // Heartbeat + watchdog ping every poll cycle (keeps systemd WatchdogSec satisfied)
      const now = Date.now();
      notifyWatchdog();
      if (now - lastHeartbeat > 60000) {
        writeHeartbeat(DAEMON_NAME);
        lastHeartbeat = now;
      }

      // Poll for tasks
      const tasks = await client.getTasks('pending', 1);

      if (tasks.length > 0) {
        await processTask(tasks[0]);
        lastIdlePost = 0; // Reset idle timer after work
      } else {
        // Idle post every 30 min
        if (now - lastIdlePost > 1800000) {
          await postStandup(API_URL, API_KEY, DAEMON_NAME, `💤 ${DAEMON_NAME} idle — no pending tasks`);
          lastIdlePost = now;
        }
      }
    } catch (e) {
      logError(`Loop error: ${e.message}`);
    }

    await sleep(POLL_INTERVAL * 1000);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Graceful shutdown
process.on('SIGTERM', () => { log('SIGTERM received, shutting down'); running = false; });
process.on('SIGINT', () => { log('SIGINT received, shutting down'); running = false; });

mainLoop().catch(e => { logError(`Fatal: ${e.message}`); process.exit(1); });
