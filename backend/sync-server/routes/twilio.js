// ========================================
// Twilio Integration Routes — Phase 1 Power Dialer
// Browser calling, SMS, smart number routing, call control
// ========================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_PATH = path.join(__dirname, '..', '.twilio-config.json');
const DB_PATH = path.join(__dirname, '..', 'data', 'twilio.db');

// ── Smart Number Routing ──

const STATE_NUMBER_MAP = {
  'NC': '+19846004966',
  'TX': '+14692754702',
  'CA': '+13238493632',
  'IL': '+16304896325',
};

const TWILIO_NUMBERS = [
  { number: '+16304896325', display: '(630) 489-6325', region: 'IL', area: 'West Chicago', areaCode: '630' },
  { number: '+18477448354', display: '(847) 744-8354', region: 'IL', area: 'North Chicago', areaCode: '847' },
  { number: '+13238493632', display: '(323) 849-3632', region: 'CA', area: 'Los Angeles', areaCode: '323' },
  { number: '+14692754702', display: '(469) 275-4702', region: 'TX', area: 'Dallas', areaCode: '469' },
  { number: '+19846004966', display: '(984) 600-4966', region: 'NC', area: 'Raleigh', areaCode: '984' },
];

const DEFAULT_NUMBER = '+18477448354';

function selectNumberForLead(lead) {
  // Priority 1: Match lead's state
  if (lead.state && STATE_NUMBER_MAP[lead.state]) {
    return STATE_NUMBER_MAP[lead.state];
  }

  // Priority 2: Match area code
  if (lead.phone) {
    const digits = lead.phone.replace(/\D/g, '');
    const areaCode = digits.startsWith('1') && digits.length === 11
      ? digits.slice(1, 4) : digits.slice(0, 3);
    const match = TWILIO_NUMBERS.find(n => n.areaCode === areaCode);
    if (match) return match.number;
  }

  // Priority 3: Default fallback
  return DEFAULT_NUMBER;
}

function getNumberDisplay(e164) {
  const found = TWILIO_NUMBERS.find(n => n.number === e164);
  return found ? found.display : e164;
}

// ── SQLite DB ──

let _db = null;
function getDb() {
  if (_db) return _db;
  const Database = require('better-sqlite3');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  initTables(_db);
  return _db;
}

function initTables(db) {
  // Safe migration: add lead_name if missing on older DBs
  try {
    const cols = db.prepare("PRAGMA table_info(twilio_calls)").all().map(c => c.name);
    if (cols.length > 0 && !cols.includes('lead_name')) {
      db.exec("ALTER TABLE twilio_calls ADD COLUMN lead_name VARCHAR(255)");
      console.log('[TWILIO] Migrated: added lead_name column to twilio_calls');
    }
  } catch (e) { /* table doesn't exist yet, will be created below */ }

  db.exec(`
    CREATE TABLE IF NOT EXISTS twilio_messages (
      id TEXT PRIMARY KEY,
      from_number TEXT,
      to_number TEXT,
      body TEXT,
      direction TEXT,
      status TEXT,
      lead_id TEXT,
      created_at TEXT,
      twilio_sid TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tw_msg_lead ON twilio_messages(lead_id);
    CREATE INDEX IF NOT EXISTS idx_tw_msg_from ON twilio_messages(from_number);
    CREATE INDEX IF NOT EXISTS idx_tw_msg_to ON twilio_messages(to_number);
    CREATE INDEX IF NOT EXISTS idx_tw_msg_created ON twilio_messages(created_at);

    CREATE TABLE IF NOT EXISTS twilio_calls (
      id TEXT PRIMARY KEY,
      from_number TEXT,
      to_number TEXT,
      direction TEXT,
      status TEXT,
      duration INTEGER DEFAULT 0,
      recording_url TEXT,
      lead_id TEXT,
      lead_name TEXT,
      lead_state TEXT,
      disposition TEXT,
      notes TEXT,
      created_at TEXT,
      ended_at TEXT,
      twilio_sid TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tw_call_lead ON twilio_calls(lead_id);
    CREATE INDEX IF NOT EXISTS idx_tw_call_created ON twilio_calls(created_at);
    CREATE INDEX IF NOT EXISTS idx_tw_call_sid ON twilio_calls(twilio_sid);

    CREATE TABLE IF NOT EXISTS phone_lines (
      id TEXT PRIMARY KEY,
      number TEXT,
      label TEXT,
      type TEXT,
      is_primary INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      twilio_sid TEXT,
      created_at TEXT
    );
  `);
  console.log('[TWILIO:DB] Tables initialized');
}

// ── Helpers ──

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { accountSid: '', authToken: '', apiKeySid: '', apiKeySecret: '', twimlAppSid: '', numbers: [], configured: false };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function isConfigured(cfg) {
  return !!(cfg && cfg.accountSid && cfg.authToken && cfg.configured !== false);
}

function notConfiguredResponse(res) {
  return res.status(200).json({
    error: 'Twilio not configured',
    configured: false,
    message: 'Twilio credentials not set up yet',
  });
}

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `tw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatE164(phone) {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
}

let twilioSdk = null;
function getTwilio() {
  if (twilioSdk) return twilioSdk;
  try { twilioSdk = require('twilio'); return twilioSdk; }
  catch { return null; }
}

function getTwilioClient(cfg) {
  const twilio = getTwilio();
  if (!twilio || !cfg.accountSid || !cfg.authToken) return null;
  return twilio(cfg.accountSid, cfg.authToken);
}

async function getStateRatesFromDB(days = 30) {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        lead_state as state,
        COUNT(*) as total,
        SUM(CASE WHEN duration > 0 THEN 1 ELSE 0 END) as connected
      FROM twilio_calls
      WHERE created_at >= ? AND lead_state IS NOT NULL AND lead_state != ''
      GROUP BY lead_state
    `).all(new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    const rates = {};
    rows.forEach((row) => {
      rates[row.state] = row.total > 0 ? Math.round((row.connected / row.total) * 100) : 0;
    });
    return rates;
  } catch {
    return {};
  }
}

async function getTypeRatesFromDB(days = 30) {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        direction as type,
        COUNT(*) as total,
        SUM(CASE WHEN duration > 0 THEN 1 ELSE 0 END) as connected
      FROM twilio_calls
      WHERE created_at >= ? AND direction IS NOT NULL AND direction != ''
      GROUP BY direction
    `).all(new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    const rates = {};
    rows.forEach((row) => {
      rates[row.type] = row.total > 0 ? Math.round((row.connected / row.total) * 100) : 0;
    });
    return rates;
  } catch {
    return {};
  }
}

// ── Register Routes ──

function registerRoutes(app) {
  const BASE_URL = process.env.TWILIO_WEBHOOK_BASE || 'https://forged-sync.danielruh.workers.dev';
  const API_KEY = process.env.SYNC_API_KEY;
  if (!API_KEY) {
    console.error('[TWILIO] FATAL: SYNC_API_KEY env var is not set. Twilio auth endpoints will reject all requests.');
  }

  // Auth middleware for sensitive Twilio endpoints
  function requireAuth(req, res, next) {
    const key = req.headers['x-api-key'];
    if (key === API_KEY) return next();
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try { getDb(); } catch (err) { console.error('[TWILIO:DB] Init error:', err.message); }

  // ──────────────────────────────────────
  // GET /api/twilio/config/status
  // ──────────────────────────────────────
  app.get('/api/twilio/config/status', (req, res) => {
    const cfg = loadConfig();
    res.json({
      configured: isConfigured(cfg),
      hasAccountSid: !!cfg.accountSid,
      hasAuthToken: !!cfg.authToken,
      hasApiKey: !!cfg.apiKeySid,
      hasTwimlApp: !!cfg.twimlAppSid,
      numberCount: (cfg.numbers || []).length,
      numbers: (cfg.numbers || []).map(n => ({ number: n.number, label: n.label, region: n.region, is_primary: n.is_primary })),
      a2pStatus: cfg.a2pStatus || 'unknown',
    });
  });

  // ──────────────────────────────────────
  // POST /api/twilio/config/update
  // ──────────────────────────────────────
  app.post('/api/twilio/config/update', requireAuth, (req, res) => {
    const { accountSid, authToken, apiKeySid, apiKeySecret, twimlAppSid } = req.body;
    const cfg = loadConfig();
    if (accountSid !== undefined) cfg.accountSid = accountSid;
    if (authToken !== undefined) cfg.authToken = authToken;
    if (apiKeySid !== undefined) cfg.apiKeySid = apiKeySid;
    if (apiKeySecret !== undefined) cfg.apiKeySecret = apiKeySecret;
    if (twimlAppSid !== undefined) cfg.twimlAppSid = twimlAppSid;
    cfg.configured = !!(cfg.accountSid && cfg.authToken);
    saveConfig(cfg);
    res.json({ success: true, configured: cfg.configured });
  });

  // ──────────────────────────────────────
  // POST /api/twilio/token — Twilio Client SDK Access Token
  // ──────────────────────────────────────
  app.post('/api/twilio/token', requireAuth, (req, res) => {
    const cfg = loadConfig();
    if (!isConfigured(cfg)) return notConfiguredResponse(res);

    const twilio = getTwilio();
    if (!twilio) return res.status(500).json({ error: 'Twilio SDK not installed' });
    if (!cfg.apiKeySid || !cfg.apiKeySecret || !cfg.twimlAppSid) {
      return res.status(400).json({ error: 'Missing API Key or TwiML App SID — configure in Twilio Console first' });
    }

    const identity = req.body.identity || 'boss';
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    try {
      const token = new AccessToken(
        cfg.accountSid, cfg.apiKeySid, cfg.apiKeySecret,
        { identity, ttl: 3600 }
      );
      token.addGrant(new VoiceGrant({
        outgoingApplicationSid: cfg.twimlAppSid,
        incomingAllow: true,
      }));
      res.json({ token: token.toJwt(), identity, ttl: 3600 });
    } catch (err) {
      console.error('[TWILIO:TOKEN]', err.message);
      res.status(500).json({ error: 'Failed to generate token', details: err.message });
    }
  });

  // ──────────────────────────────────────
  // GET /api/twilio/lines — All 5 numbers with status + smart routing info
  // ──────────────────────────────────────
  app.get('/api/twilio/lines', (req, res) => {
    const cfg = loadConfig();
    const db = getDb();

    const lines = TWILIO_NUMBERS.map(num => {
      // Get call stats for this number
      let callCount = 0, connectCount = 0;
      try {
        const stats = db.prepare(
          `SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' AND duration > 0 THEN 1 ELSE 0 END) as connected
           FROM twilio_calls WHERE from_number = ? AND created_at > datetime('now', '-30 days')`
        ).get(num.number);
        callCount = stats?.total || 0;
        connectCount = stats?.connected || 0;
      } catch {}

      const cfgNum = (cfg.numbers || []).find(n => n.number === num.number);
      return {
        ...num,
        is_primary: cfgNum?.is_primary || false,
        is_active: cfgNum?.is_active !== false,
        stateRouting: Object.entries(STATE_NUMBER_MAP)
          .filter(([, n]) => n === num.number)
          .map(([s]) => s),
        stats: { calls30d: callCount, connects30d: connectCount },
        status: 'healthy',
      };
    });

    res.json({
      lines,
      configured: isConfigured(cfg),
      defaultNumber: DEFAULT_NUMBER,
      defaultDisplay: getNumberDisplay(DEFAULT_NUMBER),
      stateMap: STATE_NUMBER_MAP,
    });
  });

  // ──────────────────────────────────────
  // GET /api/twilio/numbers — Backward compatible
  // ──────────────────────────────────────
  app.get('/api/twilio/numbers', async (req, res) => {
    const cfg = loadConfig();

    // Check Mac node connectivity for iPhone line
    let macOnline = false;
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 2000);
      const r = await fetch('http://100.84.3.117:7890/health', { signal: ctrl.signal });
      clearTimeout(timeout);
      macOnline = r.ok;
    } catch { macOnline = false; }

    // Check Twilio API connectivity (cached 60s)
    let twilioOnline = false;
    if (isConfigured(cfg)) {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 3000);
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}.json`, {
          headers: { 'Authorization': 'Basic ' + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64') },
          signal: ctrl.signal,
        });
        clearTimeout(timeout);
        twilioOnline = r.ok;
      } catch { twilioOnline = false; }
    }

    const lines = [
      { id: 'iphone-personal', number: '7739239449', label: 'Personal', type: 'iphone', is_primary: 0, is_active: macOnline ? 1 : 0 },
      ...TWILIO_NUMBERS.map((num, i) => {
        const cfgNum = (cfg.numbers || []).find(n => n.number === num.number);
        return {
          id: cfgNum?.sid || `twilio-${i}`,
          number: num.number,
          label: cfgNum?.label || num.area,
          type: 'twilio',
          region: num.region,
          display: num.display,
          is_primary: cfgNum?.is_primary ? 1 : 0,
          is_active: twilioOnline ? 1 : 0,
        };
      }),
    ];

    res.json({
      lines,
      configured: isConfigured(cfg),
      twilioConfigured: isConfigured(cfg),
      primaryLine: lines.find(l => l.is_primary) || lines[0],
      health: { macOnline, twilioOnline },
    });
  });

  // ──────────────────────────────────────
  // POST /api/twilio/call — Initiate outbound call with smart routing
  // ──────────────────────────────────────
  app.post('/api/twilio/call', requireAuth, async (req, res) => {
    const cfg = loadConfig();
    if (!isConfigured(cfg)) return notConfiguredResponse(res);

    const client = getTwilioClient(cfg);
    if (!client) return res.status(500).json({ error: 'Twilio client unavailable' });

    const { to, from, contactId, leadName, leadState, machineDetection = 'off' } = req.body;
    if (!to) return res.status(400).json({ error: 'to number required' });

    // Smart number routing
    const fromNumber = from || selectNumberForLead({ phone: to, state: leadState });

    try {
      const callParams = {
        url: `${BASE_URL}/api/twilio/webhook/voice`,
        to: formatE164(to),
        from: formatE164(fromNumber),
        statusCallback: `${BASE_URL}/api/twilio/webhook/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: false, // Recording controlled separately — IL two-party consent
      };

      // Phase 2: Add AMD if enabled
      if (machineDetection && machineDetection !== 'off') {
        callParams.machineDetection = machineDetection;
        callParams.machineDetectionTimeout = 10;
        callParams.machineDetectionSpeechThreshold = 2400;
        callParams.machineDetectionSpeechEndThreshold = 1200;
      }

      const call = await client.calls.create(callParams);

      const callId = generateId();
      const db = getDb();
      db.prepare(
        `INSERT INTO twilio_calls (id, from_number, to_number, direction, status, duration, lead_id, lead_name, lead_state, created_at, twilio_sid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(callId, formatE164(fromNumber), formatE164(to), 'outbound', call.status, 0,
        contactId || null, leadName || null, leadState || null, new Date().toISOString(), call.sid);

      console.log(`[TWILIO:CALL] Outbound to ${to} via ${getNumberDisplay(fromNumber)} — SID: ${call.sid}`);
      res.json({
        success: true,
        callSid: call.sid,
        status: call.status,
        id: callId,
        fromNumber: formatE164(fromNumber),
        fromDisplay: getNumberDisplay(fromNumber),
      });
    } catch (err) {
      console.error('[TWILIO:CALL]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ──────────────────────────────────────
  // POST /api/twilio/call/:sid/hold
  // ──────────────────────────────────────
  app.post('/api/twilio/call/:sid/hold', requireAuth, async (req, res) => {
    const cfg = loadConfig();
    if (!isConfigured(cfg)) return notConfiguredResponse(res);
    const client = getTwilioClient(cfg);
    if (!client) return res.status(500).json({ error: 'Twilio client unavailable' });

    try {
      // Update the call with hold TwiML
      await client.calls(req.params.sid).update({
        url: `${BASE_URL}/api/twilio/webhook/voice/hold`,
        method: 'POST',
      });
      console.log(`[TWILIO:HOLD] Call ${req.params.sid} placed on hold`);
      res.json({ success: true, status: 'on-hold' });
    } catch (err) {
      console.error('[TWILIO:HOLD]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ──────────────────────────────────────
  // POST /api/twilio/call/:sid/unhold
  // ──────────────────────────────────────
  app.post('/api/twilio/call/:sid/unhold', requireAuth, async (req, res) => {
    const cfg = loadConfig();
    if (!isConfigured(cfg)) return notConfiguredResponse(res);
    const client = getTwilioClient(cfg);
    if (!client) return res.status(500).json({ error: 'Twilio client unavailable' });

    try {
      // Resume call — bridge back to client
      await client.calls(req.params.sid).update({
        url: `${BASE_URL}/api/twilio/webhook/voice/resume`,
        method: 'POST',
      });
      console.log(`[TWILIO:UNHOLD] Call ${req.params.sid} resumed`);
      res.json({ success: true, status: 'in-progress' });
    } catch (err) {
      console.error('[TWILIO:UNHOLD]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ──────────────────────────────────────
  // POST /api/twilio/call/:sid/end
  // ──────────────────────────────────────
  app.post('/api/twilio/call/:sid/end', requireAuth, async (req, res) => {
    const cfg = loadConfig();
    if (!isConfigured(cfg)) return notConfiguredResponse(res);
    const client = getTwilioClient(cfg);
    if (!client) return res.status(500).json({ error: 'Twilio client unavailable' });

    try {
      await client.calls(req.params.sid).update({ status: 'completed' });

      // Update DB
      const db = getDb();
      db.prepare(`UPDATE twilio_calls SET status = 'completed', ended_at = ? WHERE twilio_sid = ?`)
        .run(new Date().toISOString(), req.params.sid);

      console.log(`[TWILIO:END] Call ${req.params.sid} ended`);
      res.json({ success: true, status: 'completed' });
    } catch (err) {
      console.error('[TWILIO:END]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ──────────────────────────────────────
  // POST /api/twilio/call/:sid/disposition
  // ──────────────────────────────────────
  app.post('/api/twilio/call/:sid/disposition', requireAuth, (req, res) => {
    const { disposition, notes } = req.body;
    if (!disposition) return res.status(400).json({ error: 'disposition required' });

    try {
      const db = getDb();
      db.prepare(`UPDATE twilio_calls SET disposition = ?, notes = ? WHERE twilio_sid = ?`)
        .run(disposition, notes || null, req.params.sid);
      console.log(`[TWILIO:DISPO] Call ${req.params.sid}: ${disposition}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ──────────────────────────────────────
  // GET /api/twilio/calls
  // ──────────────────────────────────────
  app.get('/api/twilio/calls', (req, res) => {
    const { contactId, phone, limit = 50, offset = 0, today } = req.query;
    const db = getDb();
    let rows;
    try {
      if (contactId) {
        rows = db.prepare(`SELECT * FROM twilio_calls WHERE lead_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .all(contactId, Number(limit), Number(offset));
      } else if (phone) {
        const e164 = formatE164(phone);
        rows = db.prepare(`SELECT * FROM twilio_calls WHERE from_number = ? OR to_number = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .all(e164, e164, Number(limit), Number(offset));
      } else if (today === 'true') {
        const todayDate = new Date().toISOString().split('T')[0];
        rows = db.prepare(`SELECT * FROM twilio_calls WHERE DATE(created_at) = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .all(todayDate, Number(limit), Number(offset));
      } else {
        rows = db.prepare(`SELECT * FROM twilio_calls ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .all(Number(limit), Number(offset));
      }
    } catch (err) {
      console.error('[TWILIO:CALLS:GET]', err.message);
      rows = [];
    }
    res.json({ calls: rows, count: rows.length, configured: isConfigured(loadConfig()) });
  });

  // ──────────────────────────────────────
  // POST /api/twilio/sms/send
  // ──────────────────────────────────────
  app.post('/api/twilio/sms/send', requireAuth, async (req, res) => {
    const cfg = loadConfig();
    if (!isConfigured(cfg)) return notConfiguredResponse(res);
    const client = getTwilioClient(cfg);
    if (!client) return res.status(500).json({ error: 'Twilio client unavailable' });

    const { to, body, from, contactId, leadState } = req.body;
    if (!to || !body) return res.status(400).json({ error: 'to and body required' });

    // Check A2P
    if (cfg.a2pStatus !== 'approved') {
      return res.status(503).json({ error: 'SMS unavailable — A2P registration pending', a2pStatus: cfg.a2pStatus });
    }

    const fromNumber = from || selectNumberForLead({ phone: to, state: leadState });

    try {
      const message = await client.messages.create({
        body,
        from: formatE164(fromNumber),
        to: formatE164(to),
        statusCallback: `${BASE_URL}/api/twilio/webhook/status`,
      });

      const msgId = generateId();
      const db = getDb();
      db.prepare(
        `INSERT INTO twilio_messages (id, from_number, to_number, body, direction, status, lead_id, created_at, twilio_sid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(msgId, formatE164(fromNumber), formatE164(to), body, 'outbound', message.status, contactId || null, new Date().toISOString(), message.sid);

      res.json({ success: true, sid: message.sid, status: message.status, id: msgId });
    } catch (err) {
      console.error('[TWILIO:SMS]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ──────────────────────────────────────
  // GET /api/twilio/sms/messages
  // ──────────────────────────────────────
  app.get('/api/twilio/sms/messages', (req, res) => {
    const { contactId, phone, limit = 50, offset = 0 } = req.query;
    const db = getDb();
    let rows;
    try {
      if (contactId) {
        rows = db.prepare(`SELECT * FROM twilio_messages WHERE lead_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .all(contactId, Number(limit), Number(offset));
      } else if (phone) {
        const e164 = formatE164(phone);
        rows = db.prepare(`SELECT * FROM twilio_messages WHERE from_number = ? OR to_number = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .all(e164, e164, Number(limit), Number(offset));
      } else {
        rows = db.prepare(`SELECT * FROM twilio_messages ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .all(Number(limit), Number(offset));
      }
    } catch (err) { rows = []; }
    res.json({ messages: rows, count: rows.length, configured: isConfigured(loadConfig()) });
  });

  // ──────────────────────────────────────
  // GET /api/twilio/sms/threads
  // ──────────────────────────────────────
  app.get('/api/twilio/sms/threads', (req, res) => {
    const { limit = 30 } = req.query;
    const db = getDb();
    try {
      const rows = db.prepare(`
        SELECT CASE WHEN direction = 'outbound' THEN to_number ELSE from_number END as phone,
          body as last_message, created_at as last_msg_time, direction, status, lead_id
        FROM twilio_messages ORDER BY created_at DESC LIMIT 500
      `).all();
      const threads = {};
      for (const msg of rows) {
        if (!msg.phone || threads[msg.phone]) continue;
        threads[msg.phone] = msg;
      }
      const threadList = Object.values(threads)
        .sort((a, b) => new Date(b.last_msg_time) - new Date(a.last_msg_time))
        .slice(0, Number(limit));
      res.json({ threads: threadList, count: threadList.length, configured: isConfigured(loadConfig()) });
    } catch (err) {
      res.json({ threads: [], count: 0, configured: isConfigured(loadConfig()) });
    }
  });

  // ──────────────────────────────────────
  // POST /api/twilio/numbers/primary
  // ──────────────────────────────────────
  app.post('/api/twilio/numbers/primary', requireAuth, (req, res) => {
    const { lineId } = req.body;
    if (!lineId) return res.status(400).json({ error: 'lineId required' });
    const cfg = loadConfig();
    if (cfg.numbers) {
      cfg.numbers.forEach(n => {
        n.is_primary = (n.sid === lineId || n.number === lineId);
      });
    }
    saveConfig(cfg);
    res.json({ success: true });
  });

  // ──────────────────────────────────────
  // POST /api/twilio/numbers/add & /remove
  // ──────────────────────────────────────
  app.post('/api/twilio/numbers/add', requireAuth, (req, res) => {
    const { number, label, sid } = req.body;
    if (!number) return res.status(400).json({ error: 'number required' });
    const cfg = loadConfig();
    if (!cfg.numbers) cfg.numbers = [];
    cfg.numbers.push({ number: formatE164(number), label: label || 'New Line', sid, is_primary: false, is_active: true });
    saveConfig(cfg);
    res.json({ success: true });
  });

  app.post('/api/twilio/numbers/remove', requireAuth, (req, res) => {
    const { number, sid } = req.body;
    const cfg = loadConfig();
    if (cfg.numbers) {
      cfg.numbers = cfg.numbers.filter(n => {
        if (sid && n.sid === sid) return false;
        if (number && n.number === formatE164(number)) return false;
        return true;
      });
    }
    saveConfig(cfg);
    res.json({ success: true });
  });

  // ──────────────────────────────────────
  // GET /api/twilio/failover/status
  // ──────────────────────────────────────
  app.get('/api/twilio/failover/status', (req, res) => {
    const cfg = loadConfig();
    res.json({
      iphone: { available: true, number: '7739239449' },
      twilio: { available: isConfigured(cfg), numbers: TWILIO_NUMBERS.map(n => n.number) },
      autoFailover: cfg.autoFailover !== false,
    });
  });

  // ──────────────────────────────────────
  // GET /api/twilio/dashboard/stats — Phase 3B: Live Dashboard Stats
  // ──────────────────────────────────────
  app.get('/api/twilio/dashboard/stats', (req, res) => {
    try {
      const db = getDb();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Active calls (in-progress)
      const activeCalls = db.prepare(`
        SELECT COUNT(*) as count FROM twilio_calls 
        WHERE status IN ('initiated', 'ringing', 'in-progress', 'queued')
      `).get();
      
      // Calls today
      const callsToday = db.prepare(`
        SELECT COUNT(*) as count FROM twilio_calls 
        WHERE DATE(created_at) = ?
      `).get(today);
      
      // Average duration today
      const avgDuration = db.prepare(`
        SELECT AVG(duration) as avg FROM twilio_calls 
        WHERE DATE(created_at) = ? AND duration > 0
      `).get(today);
      
      // Connection rate (calls with duration > 0 vs total)
      const connectionStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN duration > 0 THEN 1 ELSE 0 END) as connected
        FROM twilio_calls 
        WHERE DATE(created_at) = ?
      `).get(today);
      
      const connectionRate = connectionStats.total > 0 
        ? (connectionStats.connected / connectionStats.total) * 100 
        : 0;
      
      // Call outcomes breakdown
      const outcomes = db.prepare(`
        SELECT 
          SUM(CASE WHEN status = 'completed' AND duration > 0 THEN 1 ELSE 0 END) as connected,
          SUM(CASE WHEN status = 'no-answer' OR status = 'cancelled' THEN 1 ELSE 0 END) as no_answer,
          SUM(CASE WHEN status = 'voicemail' THEN 1 ELSE 0 END) as voicemail,
          SUM(CASE WHEN status = 'busy' THEN 1 ELSE 0 END) as busy
        FROM twilio_calls 
        WHERE DATE(created_at) = ?
      `).get(today);
      
      res.json({
        success: true,
        stats: {
          activeCalls: activeCalls?.count || 0,
          callsToday: callsToday?.count || 0,
          avgDuration: Math.round(avgDuration?.avg || 0),
          connectionRate: Math.round(connectionRate * 100) / 100,
        },
        outcomes: {
          connected: outcomes?.connected || 0,
          no_answer: outcomes?.no_answer || 0,
          voicemail: outcomes?.voicemail || 0,
          busy: outcomes?.busy || 0,
        }
      });
    } catch (err) {
      console.error('[TWILIO:DASHBOARD:STATS]', err.message);
      res.status(500).json({ error: err.message, success: false });
    }
  });

  // ──────────────────────────────────────
  // GET /api/twilio/intelligence/best-time — Phase 4B: Best Time Intelligence
  // ──────────────────────────────────────
  app.get('/api/twilio/intelligence/best-time', async (req, res) => {
    const { range = '30d' } = req.query;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    
    try {
      const db = getDb();
      const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      // Hourly connection rates
      const hourlyRates = {};
      const hourlyStats = db.prepare(`
        SELECT 
          strftime('%H', created_at) as hour,
          COUNT(*) as total,
          SUM(CASE WHEN duration > 0 THEN 1 ELSE 0 END) as connected
        FROM twilio_calls 
        WHERE created_at >= ? 
        GROUP BY hour
      `).all(dateLimit);
      
      hourlyStats.forEach(stat => {
        const rate = stat.total > 0 ? Math.round((stat.connected / stat.total) * 100) : 0;
        hourlyRates[parseInt(stat.hour)] = rate;
      });
      
      // Daily connection rates (0=Sunday, 6=Saturday)
      const dailyRates = {};
      const dailyStats = db.prepare(`
        SELECT 
          strftime('%w', created_at) as dow,
          COUNT(*) as total,
          SUM(CASE WHEN duration > 0 THEN 1 ELSE 0 END) as connected
        FROM twilio_calls 
        WHERE created_at >= ? 
        GROUP BY dow
      `).all(dateLimit);
      
      dailyStats.forEach(stat => {
        const rate = stat.total > 0 ? Math.round((stat.connected / stat.total) * 100) : 0;
        dailyRates[parseInt(stat.dow)] = rate;
      });
      
      const stateRates = await getStateRatesFromDB(days);
      const typeRates = await getTypeRatesFromDB(days);

      if (!Object.keys(stateRates).length && !Object.keys(typeRates).length) {
        return res.json({ stateRates: {}, typeRates: {} });
      }
      
      // Weekly digest
      const totalCalls = db.prepare(`SELECT COUNT(*) as count FROM twilio_calls WHERE created_at >= ?`).get(dateLimit);
      const connectedCalls = db.prepare(`SELECT COUNT(*) as count FROM twilio_calls WHERE created_at >= ? AND duration > 0`).get(dateLimit);
      
      const bestHour = Object.entries(hourlyRates).reduce((best, [hour, rate]) => 
        rate > (best.rate || 0) ? { hour: parseInt(hour), rate } : best, {});
      const bestDay = Object.entries(dailyRates).reduce((best, [day, rate]) => 
        rate > (best.rate || 0) ? { day: parseInt(day), rate } : best, {});
        
      res.json({
        success: true,
        data: {
          hourlyRates,
          dailyRates,
          stateRates,
          typeRates,
          weeklyDigest: {
            bestHour,
            bestDay,
            bestState: null,
            bestType: null,
            totalCalls: totalCalls?.count || 0,
            connectedCalls: connectedCalls?.count || 0,
            overallRate: totalCalls?.count > 0 ? Math.round((connectedCalls?.count / totalCalls?.count) * 100) : 0,
          }
        }
      });
    } catch (err) {
      console.error('[TWILIO:INTELLIGENCE:BEST-TIME]', err.message);
      res.status(500).json({ error: err.message, success: false });
    }
  });

  // ──────────────────────────────────────
  // GET /api/twilio/intelligence/call-metrics — Phase 4C: Auto-Intelligence Suite  
  // ──────────────────────────────────────
  app.get('/api/twilio/intelligence/call-metrics', (req, res) => {
    try {
      const db = getDb();
      
      // Connection rate by number
      const connectionRateByNumber = {};
      const numberStats = db.prepare(`
        SELECT 
          from_number,
          COUNT(*) as total,
          SUM(CASE WHEN duration > 0 THEN 1 ELSE 0 END) as connected
        FROM twilio_calls 
        WHERE from_number IS NOT NULL AND created_at >= date('now', '-30 days')
        GROUP BY from_number
      `).all();
      
      numberStats.forEach(stat => {
        const displayNumber = getNumberDisplay(stat.from_number);
        const rate = stat.total > 0 ? Math.round((stat.connected / stat.total) * 100) : 0;
        connectionRateByNumber[displayNumber] = rate;
      });
      
      // Average attempts to connect
      const avgAttempts = db.prepare(`
        SELECT AVG(CAST(SUBSTR(notes, INSTR(notes, 'attempts: ') + 10) AS INTEGER)) as avg
        FROM twilio_calls 
        WHERE notes LIKE '%attempts:%' AND created_at >= date('now', '-30 days')
      `).get();

      return res.json({
        connectionRateByNumber,
        avgAttemptsToConnect: avgAttempts?.avg || 0,
        callToCloseRatio: {},
        talkTimeVsIdle: { talk: 0, idle: 0 },
        leadSourceROI: {},
      });
    } catch (err) {
      console.error('[TWILIO:INTELLIGENCE:CALL-METRICS]', err.message);
      res.status(500).json({ error: err.message, success: false });
    }
  });

  // POST /api/calendar/events — REMOVED: was mock stub shadowing real CalDAV route in server.js

  // ──────────────────────────────────────
  // GET /api/twilio/routing/preview — Preview which number would be used
  // ──────────────────────────────────────
  app.get('/api/twilio/routing/preview', (req, res) => {
    const { phone, state } = req.query;
    const selected = selectNumberForLead({ phone, state });
    res.json({
      selectedNumber: selected,
      selectedDisplay: getNumberDisplay(selected),
      reason: state && STATE_NUMBER_MAP[state] ? `State match: ${state}` :
        phone ? 'Area code or default' : 'Default fallback',
    });
  });

  // ──────────────────────────────────────
  // TwiML Webhooks
  // ──────────────────────────────────────

  // Outbound call TwiML
  app.post('/api/twilio/webhook/voice', (req, res) => {
    const twilio = getTwilio();
    if (!twilio) {
      res.type('text/xml');
      return res.send('<Response><Say>System error.</Say></Response>');
    }

    const twiml = new twilio.twiml.VoiceResponse();
    const to = req.body.To;
    const from = req.body.CallerIdNumber || (req.body.From?.startsWith('+') ? req.body.From : null);
    const leadState = req.body.LeadState;
    const answeredBy = req.body.AnsweredBy;  // Phase 2: AMD result
    const machineDetection = req.body.MachineDetection;

    // Phase 2: Handle AMD results
    if (answeredBy && machineDetection && machineDetection !== 'off') {
      console.log(`[TWILIO:AMD] Call to ${to} answered by: ${answeredBy}`);
      
      if (answeredBy === 'machine_start' || answeredBy === 'machine_end_beep') {
        // Voicemail detected - hang up or drop voicemail
        twiml.hangup();
        res.type('text/xml');
        return res.send(twiml.toString());
      }
      // If answeredBy === 'human', continue normal flow
    }

    if (to && !to.startsWith('client:')) {
      // Outbound call from browser Voice SDK → dial the lead
      // Use the from number the agent selected, or smart route
      const fromNumber = from && from.startsWith('+')
        ? from
        : selectNumberForLead({ phone: to, state: leadState });

      // IL two-party consent disclosure
      twiml.say({ voice: 'Polly.Matthew' },
        'This call may be recorded for quality and compliance purposes.');

      const dial = twiml.dial({
        callerId: formatE164(fromNumber),
        timeout: 30,
        answerOnBridge: true,  // Better for AMD
      });
      dial.number(formatE164(to));
    } else {
      twiml.say('No destination number provided.');
    }

    res.type('text/xml');
    res.send(twiml.toString());
  });

  // Hold TwiML — play hold music
  app.post('/api/twilio/webhook/voice/hold', (req, res) => {
    const twilio = getTwilio();
    if (!twilio) { res.type('text/xml'); return res.send('<Response><Hangup/></Response>'); }

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Matthew' }, 'Please hold.');
    twiml.play({ loop: 10 }, 'http://com.twilio.music.classical.s3.amazonaws.com/BusssyBoy_-_Its_Your_Birthday_%28instrumental%29.mp3');
    res.type('text/xml');
    res.send(twiml.toString());
  });

  // Resume TwiML — bridge back to client
  app.post('/api/twilio/webhook/voice/resume', (req, res) => {
    const twilio = getTwilio();
    if (!twilio) { res.type('text/xml'); return res.send('<Response><Hangup/></Response>'); }

    const twiml = new twilio.twiml.VoiceResponse();
    const dial = twiml.dial();
    dial.client('boss');
    res.type('text/xml');
    res.send(twiml.toString());
  });

  // Inbound call
  app.post('/api/twilio/webhook/voice/inbound', (req, res) => {
    const { From, CallSid, To } = req.body;
    console.log(`[TWILIO:CALL:INBOUND] From: ${From}`);

    try {
      const db = getDb();
      db.prepare(
        `INSERT INTO twilio_calls (id, from_number, to_number, direction, status, duration, lead_id, created_at, twilio_sid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(generateId(), From, To, 'inbound', 'ringing', 0, null, new Date().toISOString(), CallSid);
    } catch {}

    const twilio = getTwilio();
    if (!twilio) {
      res.type('text/xml');
      return res.send('<Response><Say>We are currently unavailable.</Say></Response>');
    }

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Matthew' }, 'This call may be recorded for quality and compliance purposes.');
    const dial = twiml.dial({ timeout: 25, action: `${BASE_URL}/api/twilio/webhook/voice/complete` });
    dial.client('boss');
    res.type('text/xml');
    res.send(twiml.toString());
  });

  // Missed call → voicemail
  app.post('/api/twilio/webhook/voice/complete', (req, res) => {
    const twilio = getTwilio();
    const twiml = twilio ? new twilio.twiml.VoiceResponse() : null;
    if (!twiml) { res.type('text/xml'); return res.send('<Response><Hangup/></Response>'); }

    if (req.body.DialCallStatus !== 'completed') {
      twiml.say({ voice: 'Polly.Matthew' }, "You've reached Forged Financial. Please leave a message after the beep.");
      twiml.record({ maxLength: 120, playBeep: true, transcribe: true,
        transcribeCallback: `${BASE_URL}/api/twilio/webhook/voicemail/transcription`,
        action: `${BASE_URL}/api/twilio/webhook/voice/goodbye`,
      });
    }
    res.type('text/xml');
    res.send(twiml.toString());
  });

  app.post('/api/twilio/webhook/voice/goodbye', (req, res) => {
    res.type('text/xml');
    res.send('<Response><Say voice="Polly.Matthew">Thank you. Goodbye.</Say><Hangup/></Response>');
  });

  app.post('/api/twilio/webhook/voicemail/transcription', (req, res) => {
    const { RecordingSid, TranscriptionText, CallSid } = req.body;
    console.log(`[TWILIO:VOICEMAIL] ${(TranscriptionText || '').slice(0, 100)}`);
    try {
      const db = getDb();
      const cfg = loadConfig();
      if (CallSid) {
        db.prepare(`UPDATE twilio_calls SET recording_url = ?, status = 'voicemail' WHERE twilio_sid = ?`)
          .run(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Recordings/${RecordingSid}.mp3`, CallSid);
      }
    } catch {}
    res.sendStatus(200);
  });

  // Inbound SMS webhook
  app.post('/api/twilio/webhook/sms', (req, res) => {
    const { From, Body, MessageSid, To } = req.body;
    console.log(`[TWILIO:SMS:INBOUND] From: ${From}`);
    try {
      const db = getDb();
      db.prepare(
        `INSERT INTO twilio_messages (id, from_number, to_number, body, direction, status, lead_id, created_at, twilio_sid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(generateId(), From, To, Body || '', 'inbound', 'received', null, new Date().toISOString(), MessageSid);
    } catch {}
    res.type('text/xml');
    res.send('<Response></Response>');
  });

  // Status callback (calls + SMS + recordings)
  app.post('/api/twilio/webhook/status', (req, res) => {
    const { 
      CallSid, CallStatus, CallDuration, 
      MessageSid, MessageStatus, 
      RecordingSid, RecordingUrl, RecordingStatus,
      AnsweredBy  // Phase 2: AMD result
    } = req.body;
    
    try {
      const db = getDb();
      if (CallSid && CallStatus) {
        let updateQuery = `UPDATE twilio_calls SET status = ?, duration = COALESCE(?, duration)`;
        let params = [CallStatus, CallDuration ? Number(CallDuration) : null];
        
        // Phase 2: Store AMD result if available
        if (AnsweredBy) {
          updateQuery += `, notes = COALESCE(notes || ' ', '') || ?`;
          params.push(`AMD: ${AnsweredBy}`);
          console.log(`[TWILIO:AMD] Call ${CallSid} answered by: ${AnsweredBy}`);
        }
        
        updateQuery += ` WHERE twilio_sid = ?`;
        params.push(CallSid);
        
        db.prepare(updateQuery).run(...params);
      }
      if (MessageSid && MessageStatus) {
        db.prepare(`UPDATE twilio_messages SET status = ? WHERE twilio_sid = ?`)
          .run(MessageStatus, MessageSid);
      }
      if (RecordingSid && RecordingStatus === 'completed' && RecordingUrl && CallSid) {
        db.prepare(`UPDATE twilio_calls SET recording_url = ? WHERE twilio_sid = ?`)
          .run(RecordingUrl, CallSid);
      }
    } catch (err) { console.error('[TWILIO:STATUS]', err.message); }
    res.sendStatus(200);
  });

  console.log('[TWILIO] Phase 1 routes registered: /api/twilio/*');
}

module.exports = { registerRoutes, selectNumberForLead, TWILIO_NUMBERS, STATE_NUMBER_MAP };
