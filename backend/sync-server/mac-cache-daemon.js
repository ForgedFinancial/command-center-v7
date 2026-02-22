#!/usr/bin/env node
// Mac Cache Daemon — connects to OpenClaw gateway WS, periodically queries Mac node,
// writes calls.json and messages.json to mac-cache/

const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');

const GATEWAY_URL = 'ws://localhost:18789';
const GATEWAY_TOKEN = 'b18154b747e5e0e1e13466203d02b4c3c3b1265707ecdf28';
const NODE_ID = '9efb6c94688b431efb899e8ebda50cf1a4287ea13914bba2b83b3bc6bc63c046';
const CACHE_DIR = '/home/clawd/sync-server/mac-cache';
const REFRESH_MS = 30000; // 30 seconds

const MESSAGES_DB = '/Users/danielruhffl/Library/Messages/chat.db';
const CALLS_DB = '/Users/danielruhffl/Library/Application Support/CallHistoryDB/CallHistory.storedata';

const MSG_SQL = `SELECT c.chat_identifier, c.display_name, (SELECT text FROM message m2 JOIN chat_message_join cmj2 ON m2.ROWID=cmj2.message_id WHERE cmj2.chat_id=c.ROWID ORDER BY m2.date DESC LIMIT 1) as last_message, MAX(datetime(m.date/1000000000 + 978307200, 'unixepoch', 'localtime')) as last_msg_time, COUNT(m.ROWID) as msg_count FROM chat c JOIN chat_message_join cmj ON c.ROWID = cmj.chat_id JOIN message m ON cmj.message_id = m.ROWID GROUP BY c.ROWID ORDER BY m.date DESC LIMIT 50`;

const CALLS_SQL = `SELECT ZADDRESS as phone, ZDURATION as duration, ZORIGINATED as outgoing, datetime(ZDATE + 978307200, 'unixepoch', 'localtime') as call_time FROM ZCALLRECORD ORDER BY ZDATE DESC LIMIT 50`;

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

let ws = null;
let connected = false;
let pendingRequests = new Map();
let reqCounter = 0;

function connect() {
  ws = new WebSocket(GATEWAY_URL, {
    headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }
  });

  ws.on('open', () => {
    console.log('[mac-cache] WebSocket open, sending connect...');
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      // Handle connect challenge
      if (msg.type === 'event' && msg.event === 'connect.challenge') {
        const deviceId = 'mac-cache-daemon-' + crypto.randomBytes(8).toString('hex');
        ws.send(JSON.stringify({
          type: 'req',
          id: 'connect-1',
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: { id: 'mac-cache-daemon', version: '1.0.0', platform: 'linux', mode: 'operator' },
            role: 'operator',
            scopes: ['operator.read', 'operator.write'],
            caps: [],
            commands: [],
            permissions: {},
            auth: { token: GATEWAY_TOKEN },
            locale: 'en-US',
            userAgent: 'mac-cache-daemon/1.0.0',
            device: { id: deviceId }
          }
        }));
        return;
      }

      // Handle connect response
      if (msg.type === 'res' && msg.id === 'connect-1') {
        if (msg.ok) {
          console.log('[mac-cache] Connected to gateway');
          connected = true;
          refresh(); // immediate first refresh
        } else {
          console.error('[mac-cache] Connect failed:', msg.error);
        }
        return;
      }

      // Handle invoke responses
      if (msg.type === 'res' && pendingRequests.has(msg.id)) {
        const { resolve } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        resolve(msg);
        return;
      }
    } catch (e) {
      // ignore parse errors
    }
  });

  ws.on('close', () => {
    console.log('[mac-cache] WebSocket closed, reconnecting in 10s...');
    connected = false;
    setTimeout(connect, 10000);
  });

  ws.on('error', (err) => {
    console.error('[mac-cache] WebSocket error:', err.message);
  });
}

function invoke(command) {
  return new Promise((resolve, reject) => {
    if (!connected || !ws) return reject(new Error('Not connected'));
    const id = `req-${++reqCounter}`;
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error('Timeout'));
    }, 12000);
    
    pendingRequests.set(id, { 
      resolve: (msg) => { clearTimeout(timeout); resolve(msg); },
    });
    
    ws.send(JSON.stringify({
      type: 'req',
      id,
      method: 'node.invoke',
      params: {
        nodeId: NODE_ID,
        command: 'system.run',
        params: JSON.stringify({ command, timeoutMs: 10000 })
      }
    }));
  });
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function refreshCalls() {
  try {
    const res = await invoke(['sqlite3', '-json', CALLS_DB, CALLS_SQL]);
    if (res.ok && res.payload) {
      const result = res.payload.result || res.payload;
      const stdout = result.stdout || (typeof result === 'string' ? result : '');
      if (stdout.trim()) {
        const rawCalls = JSON.parse(stdout);
        const calls = rawCalls.map(c => ({
          number: c.phone || '—',
          type: c.outgoing === 1 ? 'outgoing' : (c.duration === 0 ? 'missed' : 'incoming'),
          duration: c.duration > 0 ? formatDuration(c.duration) : '0:00',
          time: c.call_time,
          name: c.phone || 'Unknown',
        }));
        fs.writeFileSync(`${CACHE_DIR}/calls.json`, JSON.stringify(calls));
        console.log(`[mac-cache] Calls: ${calls.length} entries`);
      }
    }
  } catch (e) {
    console.error('[mac-cache] Calls refresh error:', e.message);
  }
}

async function refreshMessages() {
  try {
    const res = await invoke(['sqlite3', '-json', MESSAGES_DB, MSG_SQL]);
    if (res.ok && res.payload) {
      const result = res.payload.result || res.payload;
      const stdout = result.stdout || (typeof result === 'string' ? result : '');
      if (stdout.trim()) {
        const conversations = JSON.parse(stdout);
        fs.writeFileSync(`${CACHE_DIR}/messages.json`, JSON.stringify(conversations));
        console.log(`[mac-cache] Messages: ${conversations.length} conversations`);
      }
    }
  } catch (e) {
    console.error('[mac-cache] Messages refresh error:', e.message);
  }
}

async function refresh() {
  if (!connected) return;
  await Promise.allSettled([refreshCalls(), refreshMessages()]);
}

// Connect and start refresh loop
connect();
setInterval(() => { if (connected) refresh(); }, REFRESH_MS);

console.log(`[mac-cache] Daemon starting, refresh every ${REFRESH_MS/1000}s`);
