// ========================================
// Auth Module — Server-side authentication
// Session 4: Auth Overhaul (2026-02-15)
// Zero new deps: crypto.scrypt, crypto.randomUUID, crypto.timingSafeEqual
// ========================================

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SESSIONS_FILE = path.join(__dirname, 'data', 'sessions.json');

// Single-user credentials — hardcoded, no signup, no other accounts
const VALID_ACCESS_CODE = 'Nugget123$';
const VALID_USERNAME = 'DANO';
const VALID_PASSWORD = 'Newmandan85$';

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;  // N
const SCRYPT_BLOCK_SIZE = 8; // r
const SCRYPT_PARALLEL = 1;   // p

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;   // 15 min
const RATE_LIMIT_MAX = 5;

// In-memory rate limit store: { ip: [timestamps] }
const rateLimitStore = {};

// ── Helpers ──

function loadJSON(filepath, fallback) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
  } catch (e) {
    console.error(`[AUTH] Failed to load ${filepath}:`, e.message);
  }
  return fallback;
}

function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString('hex');
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLEL
    }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve, reject) => {
    const [salt, hash] = stored.split(':');
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLEL
    }, (err, derivedKey) => {
      if (err) return reject(err);
      const hashBuffer = Buffer.from(hash, 'hex');
      resolve(crypto.timingSafeEqual(derivedKey, hashBuffer));
    });
  });
}

// ── Session Management ──

function loadSessions() {
  return loadJSON(SESSIONS_FILE, {});
}

function saveSessions(sessions) {
  saveJSON(SESSIONS_FILE, sessions);
}

function createSession() {
  const sessions = loadSessions();
  const token = crypto.randomUUID();
  sessions[token] = { createdAt: Date.now(), expiresAt: Date.now() + SESSION_EXPIRY_MS };
  // Prune expired
  const now = Date.now();
  for (const t of Object.keys(sessions)) {
    if (sessions[t].expiresAt < now) delete sessions[t];
  }
  saveSessions(sessions);
  return token;
}

function validateSession(token) {
  if (!token) return false;
  const sessions = loadSessions();
  const session = sessions[token];
  if (!session) return false;
  if (session.expiresAt < Date.now()) {
    delete sessions[token];
    saveSessions(sessions);
    return false;
  }
  return true;
}

function destroySession(token) {
  if (!token) return;
  const sessions = loadSessions();
  delete sessions[token];
  saveSessions(sessions);
}

// ── Rate Limiting ──

function checkRateLimit(ip) {
  const now = Date.now();
  if (!rateLimitStore[ip]) rateLimitStore[ip] = [];
  // Prune old entries
  rateLimitStore[ip] = rateLimitStore[ip].filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if (rateLimitStore[ip].length >= RATE_LIMIT_MAX) {
    const oldest = rateLimitStore[ip][0];
    const retryAfter = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { limited: true, retryAfter };
  }
  return { limited: false };
}

function recordAttempt(ip) {
  if (!rateLimitStore[ip]) rateLimitStore[ip] = [];
  rateLimitStore[ip].push(Date.now());
}

// ── Auth State ──

function getAuthState() {
  return loadJSON(AUTH_FILE, null);
}

function isSetup() {
  const auth = getAuthState();
  return !!(auth?.hash);
}

// ── Cookie Config ──

const COOKIE_NAME = 'cc_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',  // Required for cross-origin (Worker proxy)
  maxAge: SESSION_EXPIRY_MS,
  path: '/',
};

// ── Token Extraction (cookie OR Bearer header) ──

function extractToken(req) {
  // Try Bearer header first (works through proxies)
  const authHeader = req.headers?.['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Fall back to cookie
  return req.cookies?.[COOKIE_NAME];
}

// ── Express Routes ──

function registerRoutes(app) {
  // Single-user auth — no signup, no setup, one account only

  // POST /api/auth/setup — disabled, no new accounts
  app.post('/api/auth/setup', (req, res) => {
    return res.status(403).json({ error: 'Account creation is disabled. Single-user system.' });
  });

  // POST /api/auth/login — validates access code + username + password
  app.post('/api/auth/login', async (req, res) => {
    try {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const rl = checkRateLimit(ip);
      if (rl.limited) {
        res.set('Retry-After', String(rl.retryAfter));
        return res.status(429).json({ error: 'Too many attempts', retryAfter: rl.retryAfter });
      }

      const { accessCode, username, password } = req.body || {};
      if (!accessCode || !username || !password) {
        return res.status(400).json({ error: 'Access code, username, and password are all required' });
      }

      // Validate all three fields — constant-time-ish comparison
      const codeValid = accessCode === VALID_ACCESS_CODE;
      const userValid = username === VALID_USERNAME;
      const passValid = password === VALID_PASSWORD;

      if (!codeValid || !userValid || !passValid) {
        recordAttempt(ip);
        const remaining = RATE_LIMIT_MAX - (rateLimitStore[ip]?.length || 0);
        return res.status(401).json({ error: 'Invalid credentials', attemptsRemaining: Math.max(0, remaining) });
      }

      const token = createSession();
      res.json({ ok: true, token, user: 'DANO' });
    } catch (err) {
      console.error('[AUTH] Login error:', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    const token = extractToken(req);
    destroySession(token);
    res.json({ ok: true });
  });

  // GET /api/auth/check
  app.get('/api/auth/check', (req, res) => {
    const token = extractToken(req);
    const valid = validateSession(token);
    res.json({ authenticated: valid, needsSetup: false });
  });
}

// ── Auth Middleware ──

function authMiddleware(req, res, next) {
  // Skip auth endpoints
  if (req.path.startsWith('/api/auth/')) return next();
  // Skip health (public)
  if (req.path === '/api/health') return next();
  // Skip non-API routes
  if (!req.path.startsWith('/api/')) return next();

  const token = extractToken(req);
  if (!validateSession(token)) {
    // Fall back to API key auth for backwards compatibility (agent-to-server calls)
    const authHeader = req.headers['authorization'];
    const xApiKey = req.headers['x-api-key'];
    const apiToken = xApiKey || (authHeader && authHeader.split(' ')[1]);
    const API_KEY = process.env.CC_API_KEY || process.env.SYNC_API_KEY || 'CHANGE_ME_IN_ENV_FILE';

    if (apiToken && apiToken === API_KEY) {
      return next(); // API key auth still valid for server-to-server
    }

    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

module.exports = { registerRoutes, authMiddleware };
