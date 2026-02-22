/**
 * Stand-Up Room Communication Hub
 * - POST /api/comms/room — send message to room + Telegram relay + Boss→Agent routing
 * - POST /api/comms/agent-reply — agent posts response back to room + Telegrams Boss
 * Mason (FF-BLD-001) — Stand-Up Room Hub Build
 */
const express = require('express');
const router = express.Router();
const https = require('https');
const fsSync = require('fs');
const path = require('path');

// ── Config ──
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) console.warn('Telegram not configured. Features disabled.');
const SESSION_FILE = path.join('/home/clawd/claude-comms', 'session.json');
const COMMS_FILE = path.join('/home/clawd/claude-comms', 'messages.json');

// ── Agent Gateway Routing Table ──
const AGENT_GATEWAYS = {
  soren:    { port: 18810, token: 'b34d4193a7b926afc9a166fd46773ced4cdcd516e3e76c04' },
  mason:    { port: 18830, token: 'ffee586ed69eaac15ff294a5ba65e180ebe7623d49d821d8' },
  sentinel: { port: 18850, token: '02bce424adc8c2203a2a06537027b398cc3b348258f0a30f' },
  kyle:     { port: 18870, token: '5970b5eb2c0346e3dd800e5cde11faccda277b2640ec8e0d' },
};

// Agent name → openclaw agent id mapping
const AGENT_IDS = {
  soren: 'soren', mason: 'mason', sentinel: 'sentinel', kyle: 'kyle',
};

// ── Telegram Debounce (1 per agent per 60s) ──
const telegramLastSent = {};

// ── @Boss mention patterns ──
const BOSS_MENTION_REGEX = /@(dano|boss)\b/gi;

// ── Helpers ──
function loadComms() {
  try {
    if (fsSync.existsSync(COMMS_FILE)) return JSON.parse(fsSync.readFileSync(COMMS_FILE, 'utf8'));
  } catch (e) { console.error('[STANDUP] Load comms error:', e.message); }
  return [];
}

function saveComms(msgs) {
  fsSync.writeFileSync(COMMS_FILE, JSON.stringify(msgs, null, 2));
}

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

function loadSession() {
  try { return JSON.parse(fsSync.readFileSync(SESSION_FILE, 'utf8')); }
  catch { return { active: false }; }
}

function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return Promise.resolve(false);
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) console.error('[STANDUP] Telegram error:', data);
        resolve(res.statusCode === 200);
      });
    });
    req.on('error', (e) => { console.error('[STANDUP] Telegram net error:', e.message); resolve(false); });
    req.write(body);
    req.end();
  });
}

/**
 * Create a CC notification (POST /api/notifications internally).
 */
async function createCCNotification({ title, description, type = 'mention', meta = {} }) {
  return new Promise((resolve) => {
    const apiKey = process.env.CC_API_KEY || process.env.SYNC_API_KEY;
    const body = JSON.stringify({ title, description, type, meta });
    const req = require('http').request({
      hostname: 'localhost',
      port: parseInt(process.env.PORT || '3737'),
      path: '/api/notifications',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log(`[STANDUP] CC notification created: ${res.statusCode}`);
        resolve(res.statusCode < 300);
      });
    });
    req.on('error', (e) => {
      console.error('[STANDUP] CC notification error:', e.message);
      resolve(false);
    });
    req.write(body);
    req.end();
  });
}

/**
 * Route a message from Boss to agent gateway(s) via openclaw CLI.
 * Uses `openclaw message` or cron wake to inject into the agent's session.
 */
async function routeToAgent(agentName, message) {
  const gw = AGENT_GATEWAYS[agentName];
  if (!gw) return { routed: false, reason: 'unknown agent' };

  const agentId = AGENT_IDS[agentName] || agentName;

  // Use openclaw CLI to send a wake event to the agent's gateway
  const { execSync } = require('child_process');
  try {
    // Post as a task to the comms/tasks queue so the daemon picks it up
    const taskPayload = JSON.stringify({
      title: `Stand-Up Room message from Boss`,
      description: message,
      assignee: agentName,
      priority: 'high',
      source: 'standup-room',
    });

    // Create task via the local API
    const http = require('http');
    return new Promise((resolve) => {
      const apiKey = process.env.CC_API_KEY || process.env.SYNC_API_KEY;
      const body = JSON.stringify({
        type: 'mention',
        title: `[Stand-Up] Boss says: ${message.substring(0, 60)}`,
        payload: message,
        assigned_to: agentName,
        priority: 'high',
        created_by: 'standup-room',
      });
      const req = https.request({
        hostname: 'localhost',
        port: 443,
        path: '/api/comms/tasks',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Content-Length': Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          console.log(`[STANDUP] Task created for ${agentName}: ${res.statusCode}`);
          resolve({ routed: true, method: 'task-queue', agent: agentName });
        });
      });
      req.on('error', (e) => {
        console.error(`[STANDUP] Task creation failed for ${agentName}:`, e.message);
        resolve({ routed: false, reason: e.message });
      });
      req.write(body);
      req.end();
    });
  } catch (e) {
    console.error(`[STANDUP] Route to ${agentName} failed:`, e.message);
    return { routed: false, reason: e.message };
  }
}

/**
 * Parse @mentions from message text.
 * Returns array of agent names found, or empty if none.
 */
function parseMentions(text) {
  const mentionPattern = /@(soren|mason|sentinel|kyle|clawd)/gi;
  const mentions = [];
  let match;
  while ((match = mentionPattern.exec(text)) !== null) {
    mentions.push(match[1].toLowerCase());
  }
  return [...new Set(mentions)];
}

// ── POST /api/comms/room — Send message to Stand-Up Room ──
router.post('/', async (req, res) => {
  const { sender, from, message } = req.body;
  const senderName = sender || from;

  if (!senderName || !message) {
    return res.status(400).json({ error: 'sender and message required' });
  }

  // Save to room
  const msgs = loadComms();
  const msg = {
    id: generateId(),
    from: senderName,
    to: 'standup',
    message,
    topic: 'standup',
    ts: new Date().toISOString(),
    read: false,
  };
  msgs.push(msg);
  if (msgs.length > 500) msgs.splice(0, msgs.length - 500);
  saveComms(msgs);
  console.log(`[STANDUP] ${senderName}: ${message.substring(0, 80)}`);

  const result = { ok: true, id: msg.id, routed: [] };

  // ── Agent→Boss Telegram relay ──
  const isBoss = ['dano', 'boss'].includes(senderName.toLowerCase());
  if (!isBoss) {
    const displayName = senderName.charAt(0).toUpperCase() + senderName.slice(1);
    const hasBossMention = BOSS_MENTION_REGEX.test(message);
    BOSS_MENTION_REGEX.lastIndex = 0; // reset regex state after .test()

    if (hasBossMention) {
      // ── @Boss mention: instant Telegram + CC notification (no debounce) ──
      const truncated = message.length > 160 ? message.substring(0, 160) + '…' : message;
      sendTelegram(`📢 *${displayName}* mentioned you in the Stand-Up Room:\n\n_"${truncated}"_\n\nCheck CC → Stand-Up tab`);
      result.telegram = 'mention-alert';

      // Push CC notification
      createCCNotification({
        title: `${displayName} mentioned you`,
        description: truncated,
        type: 'mention',
        meta: { agentId: senderName, messageId: msg.id, source: 'standup' },
      });
      result.ccNotification = true;
    } else {
      // ── Regular agent message: debounced relay ──
      const session = loadSession();
      if (session.active) {
        const now = Date.now();
        const lastSent = telegramLastSent[senderName] || 0;
        if (now - lastSent >= 60000) {
          telegramLastSent[senderName] = now;
          const truncated = message.length > 200 ? message.substring(0, 200) + '…' : message;
          sendTelegram(`🤖 ${displayName}: ${truncated}`);
          result.telegram = true;
        } else {
          result.telegram = 'debounced';
        }
      }
    }
  }

  // ── Boss→Agent routing ──
  if (isBoss) {
    const mentions = parseMentions(message);
    if (mentions.length > 0) {
      // Route to mentioned agents only (skip clawd — he's the gateway host)
      const routeTargets = mentions.filter(m => m !== 'clawd' && AGENT_GATEWAYS[m]);
      for (const agent of routeTargets) {
        const routeResult = await routeToAgent(agent, message);
        result.routed.push({ agent, ...routeResult });
      }
    } else {
      // No @mention — broadcast to all active agent gateways
      for (const agent of Object.keys(AGENT_GATEWAYS)) {
        const routeResult = await routeToAgent(agent, message);
        result.routed.push({ agent, ...routeResult });
      }
    }
  }

  res.json(result);
});

// ── POST /api/comms/agent-reply — Agent posts response back to room + Telegrams Boss ──
router.post('/agent-reply', async (req, res) => {
  const { agentId, message } = req.body;
  if (!agentId || !message) {
    return res.status(400).json({ error: 'agentId and message required' });
  }

  // Save to room
  const msgs = loadComms();
  const msg = {
    id: generateId(),
    from: agentId,
    to: 'standup',
    message,
    topic: 'standup',
    ts: new Date().toISOString(),
    read: false,
  };
  msgs.push(msg);
  if (msgs.length > 500) msgs.splice(0, msgs.length - 500);
  saveComms(msgs);
  console.log(`[STANDUP] Agent reply ${agentId}: ${message.substring(0, 80)}`);

  // Telegram Boss (with debounce)
  const session = loadSession();
  const result = { ok: true, id: msg.id };
  if (session.active) {
    const now = Date.now();
    const lastSent = telegramLastSent[agentId] || 0;
    if (now - lastSent >= 60000) {
      telegramLastSent[agentId] = now;
      const truncated = message.length > 200 ? message.substring(0, 200) + '…' : message;
      const displayName = agentId.charAt(0).toUpperCase() + agentId.slice(1);
      sendTelegram(`🤖 ${displayName}: ${truncated}`);
      result.telegram = true;
    } else {
      result.telegram = 'debounced';
    }
  }

  res.json(result);
});

module.exports = router;
