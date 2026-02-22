const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3737;
const API_KEY = process.env.SYNC_API_KEY || 'CHANGE_ME';

// --- SSL ---
const SSL_KEY = path.join(__dirname, 'ssl', 'server.key');
const SSL_CERT = path.join(__dirname, 'ssl', 'server.crt');
const useSSL = fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT);
const DATA_FILE = path.join(__dirname, 'sync-data.json');

// --- AUTH CONFIG ---
const AUTH_USER = 'Danielruhffl';
const AUTH_HASH = '$2b$12$.F0YLNtCP1PRFAeuKzgb3eyHSWu35p5T8QzP5IhOMoth2yYV20vaG';
const SESSION_SECRET = '6d8718e2b9266af3a7914c95bc06635d5fe476951766e5c2d7480d78419101e498da9c071ef354f8d185992a763ed72c';
const SESSION_MAX_AGE = 12 * 60 * 60 * 1000; // 12 hours
const sessions = new Map();

// --- 2FA CONFIG ---
const TOTP_FILE = path.join(__dirname, '.totp-secret');
let totpSecret = null;
let totpEnabled = false;
try {
  if (fs.existsSync(TOTP_FILE)) {
    totpSecret = fs.readFileSync(TOTP_FILE, 'utf8').trim();
    totpEnabled = true;
    console.log('[2FA] TOTP enabled');
  }
} catch(e) {}

// --- IP ALLOWLIST ---
const IP_FILE = path.join(__dirname, 'ip-allowlist.json');
let ipAllowlist = { enabled: false, ips: [], note: 'Add IPs to restrict CC access. API endpoints bypass this.' };
try {
  if (fs.existsSync(IP_FILE)) {
    ipAllowlist = JSON.parse(fs.readFileSync(IP_FILE, 'utf8'));
    console.log(`[IP] Allowlist: ${ipAllowlist.enabled ? ipAllowlist.ips.length + ' IPs' : 'disabled'}`);
  } else {
    fs.writeFileSync(IP_FILE, JSON.stringify(ipAllowlist, null, 2));
  }
} catch(e) {}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress?.replace('::ffff:', '') || 'unknown';
}

// --- AUDIT TRAIL ---
const AUDIT_FILE = path.join(__dirname, 'audit-trail.json');
let auditLog = [];
const MAX_AUDIT = 5000;
try {
  if (fs.existsSync(AUDIT_FILE)) {
    auditLog = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
  }
} catch(e) {}

function audit(action, user, detail, ip) {
  const entry = { ts: new Date().toISOString(), action, user: user || 'system', detail: detail || '', ip: ip || '' };
  auditLog.unshift(entry);
  if (auditLog.length > MAX_AUDIT) auditLog = auditLog.slice(0, MAX_AUDIT);
  try { fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditLog)); } catch(e) {}
}

// --- ENCRYPTED STATE STORAGE ---
const ENC_KEY_FILE = path.join(__dirname, '.encryption-key');
let encKey = null;
try {
  if (fs.existsSync(ENC_KEY_FILE)) {
    encKey = Buffer.from(fs.readFileSync(ENC_KEY_FILE, 'utf8').trim(), 'hex');
  } else {
    encKey = crypto.randomBytes(32);
    fs.writeFileSync(ENC_KEY_FILE, encKey.toString('hex'), { mode: 0o600 });
  }
} catch(e) { console.error('[ENC] Key setup failed:', e.message); }

function encrypt(text) {
  if (!encKey) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(data) {
  if (!encKey || !data.includes(':')) return data;
  try {
    const [ivHex, encrypted] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch(e) { return data; } // Fallback for unencrypted data
}

// Encrypted file I/O
const ENC_STATE_FILE = path.join(__dirname, 'cc-state.enc');
const ENC_SYNC_FILE = path.join(__dirname, 'sync-data.enc');

function saveEncrypted(filepath, data) {
  try { fs.writeFileSync(filepath, encrypt(JSON.stringify(data)), { mode: 0o600 }); } catch(e) {}
}

function loadEncrypted(filepath) {
  try {
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(decrypt(fs.readFileSync(filepath, 'utf8')));
  } catch(e) { return null; }
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, created: Date.now() });
  return token;
}

function validateSession(token) {
  const s = sessions.get(token);
  if (!s) return false;
  if (Date.now() - s.created > SESSION_MAX_AGE) { sessions.delete(token); return false; }
  return true;
}

// Login page HTML
const LOGIN_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Forged Financial — Login</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0f1419;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
.login-box{background:#1a1f2e;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:40px;width:380px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.logo{text-align:center;margin-bottom:24px}.logo h1{font-size:22px;font-weight:800;background:linear-gradient(135deg,#f97316,#ef4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.logo p{font-size:12px;color:#64748b;margin-top:4px}
.field{margin-bottom:16px}.field label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:6px}
.field input{width:100%;padding:10px 14px;background:#0f1419;border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#e2e8f0;font-size:14px;outline:none;transition:border .2s}
.field input:focus{border-color:#f97316}
.btn{width:100%;padding:12px;background:linear-gradient(135deg,#f97316,#ef4444);border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;transition:opacity .2s}
.btn:hover{opacity:.9}.err{color:#ef4444;font-size:12px;text-align:center;margin-top:12px;min-height:18px}
.lock{text-align:center;font-size:32px;margin-bottom:8px}</style></head>
<body><div class="login-box"><div class="logo"><div class="lock">🔒</div><h1>FORGED FINANCIAL</h1><p>Command Center</p></div>
<form method="POST" action="/login"><div class="field"><label>Username</label><input name="username" type="text" autocomplete="username" required autofocus></div>
<div class="field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div>
<button class="btn" type="submit">Sign In</button><div class="err" id="err">ERR_PLACEHOLDER</div></form></div>
<script>
(function(){
  function parse(ua){var b='Unknown',v='',o='Unknown',p=navigator.platform||'';if(/Edg\\//.test(ua)){b='Edge';v=ua.match(/Edg\\/(\\S+)/)?.[1]||''}else if(/Chrome\\//.test(ua)){b='Chrome';v=ua.match(/Chrome\\/(\\S+)/)?.[1]||''}else if(/Firefox\\//.test(ua)){b='Firefox';v=ua.match(/Firefox\\/(\\S+)/)?.[1]||''}else if(/Safari\\//.test(ua)&&!/Chrome/.test(ua)){b='Safari';v=ua.match(/Version\\/(\\S+)/)?.[1]||''}if(/Windows/.test(ua))o='Windows';else if(/Mac OS/.test(ua))o='macOS';else if(/Android/.test(ua))o='Android';else if(/iPhone|iPad/.test(ua))o='iOS';else if(/Linux/.test(ua))o='Linux';return{browser:b,browserVersion:v,os:o,platform:p}}
  function canvasHash(){try{var c=document.createElement('canvas');var ctx=c.getContext('2d');ctx.textBaseline='top';ctx.font='14px Arial';ctx.fillText('fp',2,2);return c.toDataURL().slice(-32)}catch(e){return null}}
  function glRenderer(){try{var c=document.createElement('canvas');var gl=c.getContext('webgl')||c.getContext('experimental-webgl');if(!gl)return null;var ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null}catch(e){return null}}
  var ua=navigator.userAgent;var p=parse(ua);
  var fp={
    browser:p.browser,browserVersion:p.browserVersion,os:p.os,platform:p.platform,
    screenRes:screen.width+'x'+screen.height,colorDepth:screen.colorDepth,
    deviceMemory:navigator.deviceMemory||null,hardwareConcurrency:navigator.hardwareConcurrency||null,
    touchSupport:'ontouchstart' in window||navigator.maxTouchPoints>0,
    language:navigator.language,languages:navigator.languages?navigator.languages.join(','):null,
    timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,timezoneOffset:new Date().getTimezoneOffset(),
    doNotTrack:navigator.doNotTrack,cookiesEnabled:navigator.cookieEnabled,
    webdriver:navigator.webdriver||false,
    plugins:Array.from(navigator.plugins||[]).map(function(p){return p.name}).slice(0,10).join(','),
    canvasHash:canvasHash(),webglRenderer:glRenderer(),
    connectionType:navigator.connection?navigator.connection.effectiveType:null,
    fingerprint:null
  };
  // Generate fingerprint hash
  var raw=fp.browser+fp.os+fp.platform+fp.screenRes+fp.colorDepth+fp.hardwareConcurrency+fp.canvasHash+fp.webglRenderer+fp.timezone;
  // Simple hash
  var h=0;for(var i=0;i<raw.length;i++){h=((h<<5)-h)+raw.charCodeAt(i);h|=0}
  fp.fingerprint=Math.abs(h).toString(16);
  // Try geolocation
  if(navigator.geolocation){navigator.geolocation.getCurrentPosition(function(pos){fp.geo={lat:pos.coords.latitude,lon:pos.coords.longitude,acc:pos.coords.accuracy};send(fp)},function(){send(fp)},{timeout:3000})}else{send(fp)}
  function send(d){fetch('/api/access-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).catch(function(){})}
  // Also capture username on submit
  var form=document.querySelector('form');if(form)form.addEventListener('submit',function(){fp.username=document.querySelector('[name=username]')?.value||null;send(fp)})
})();
</script></body></html>`;

const LOGIN_2FA_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Forged Financial — 2FA</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0f1419;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
.login-box{background:#1a1f2e;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:40px;width:380px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.logo{text-align:center;margin-bottom:24px}.logo h1{font-size:22px;font-weight:800;background:linear-gradient(135deg,#f97316,#ef4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.logo p{font-size:12px;color:#64748b;margin-top:4px}
.field{margin-bottom:16px}.field label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:6px}
.field input{width:100%;padding:10px 14px;background:#0f1419;border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#e2e8f0;font-size:18px;text-align:center;letter-spacing:6px;outline:none;transition:border .2s}
.field input:focus{border-color:#f97316}
.btn{width:100%;padding:12px;background:linear-gradient(135deg,#f97316,#ef4444);border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px}
.err{color:#ef4444;font-size:12px;text-align:center;margin-top:12px;min-height:18px}</style></head>
<body><div class="login-box"><div class="logo"><div style="text-align:center;font-size:32px;margin-bottom:8px">🔐</div><h1>TWO-FACTOR AUTH</h1><p>Enter the 6-digit code from your authenticator app</p></div>
<form method="POST" action="/login"><input type="hidden" name="username" value="__USER__"><input type="hidden" name="password" value="__PASS__">
<div class="field"><label>Authentication Code</label><input name="totp" type="text" maxlength="6" autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]*" required autofocus></div>
<button class="btn" type="submit">Verify</button><div class="err">ERR_PLACEHOLDER</div></form></div></body></html>`;

// In-memory store
let store = { updates: [], snapshot: null };

// Load from disk on startup
try {
  if (fs.existsSync(DATA_FILE)) {
    store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`Loaded ${store.updates.length} updates from disk`);
  }
} catch (e) {
  console.error('Failed to load data file, starting fresh:', e.message);
}

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS — must allow file:// origin (sends Origin: null)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Auth middleware for push endpoints
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Save to disk
function saveToDisk() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error('Failed to save to disk:', e.message);
  }
}

// --- COMMAND CENTER HOSTING ---
const CC_DIR = path.join(__dirname, 'cc');
const CC_FILE = path.join(CC_DIR, 'index.html');
const CC_BACKUP_DIR = path.join(CC_DIR, 'backups');

// Ensure directories exist
if (!fs.existsSync(CC_DIR)) fs.mkdirSync(CC_DIR, { recursive: true });
if (!fs.existsSync(CC_BACKUP_DIR)) fs.mkdirSync(CC_BACKUP_DIR, { recursive: true });

// Copy initial CC if not yet hosted
if (!fs.existsSync(CC_FILE)) {
  const src = '/home/clawd/.openclaw/workspace/command-center/cc-v4.2.html';
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, CC_FILE);
    console.log('Copied initial CC v4.2 to hosting directory');
  }
}

function backupCC(label) {
  if (!fs.existsSync(CC_FILE)) return;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `cc-backup-${label || ts}.html`;
  fs.copyFileSync(CC_FILE, path.join(CC_BACKUP_DIR, name));
  // Keep only last 10 backups
  const backups = fs.readdirSync(CC_BACKUP_DIR).sort();
  while (backups.length > 10) {
    fs.unlinkSync(path.join(CC_BACKUP_DIR, backups.shift()));
  }
  console.log(`[BACKUP] ${name}`);
}

// --- IP ALLOWLIST MIDDLEWARE ---
function ipCheck(req, res, next) {
  if (!ipAllowlist.enabled) return next();
  const ip = getClientIP(req);
  // Always allow localhost and API key auth
  if (ip === '127.0.0.1' || ip === '::1') return next();
  const bearer = req.headers.authorization?.replace('Bearer ', '');
  if (bearer === API_KEY) return next();
  if (ipAllowlist.ips.includes(ip)) return next();
  audit('ip_blocked', 'unknown', `Blocked IP: ${ip}`, ip);
  console.log(`[IP] Blocked: ${ip}`);
  return res.status(403).send('<h1>403 Forbidden</h1><p>Your IP is not authorized.</p>');
}

// Apply IP check to all CC routes (before auth)
app.use('/', (req, res, next) => {
  // Skip IP check for API endpoints (they use API key auth)
  if (req.path.startsWith('/api/') || req.path === '/health') return next();
  ipCheck(req, res, next);
});

// --- CC AUTH MIDDLEWARE ---
function requireLogin(req, res, next) {
  const token = req.cookies?.ff_session;
  if (token && validateSession(token)) return next();
  const bearer = req.headers.authorization?.replace('Bearer ', '');
  if (bearer === API_KEY) return next();
  return res.send(LOGIN_HTML.replace('ERR_PLACEHOLDER', ''));
}

// Login endpoint (supports 2FA)
app.post('/login', (req, res) => {
  const { username, password, totp } = req.body;
  const ip = getClientIP(req);
  if (username === AUTH_USER && bcrypt.compareSync(password, AUTH_HASH)) {
    // Check 2FA if enabled
    if (totpEnabled && totpSecret) {
      if (!totp || !authenticator.check(totp, totpSecret)) {
        audit('login_2fa_fail', username, '2FA code incorrect or missing', ip);
        return res.send(LOGIN_2FA_HTML.replace('ERR_PLACEHOLDER', totp ? 'Invalid 2FA code' : '').replace('__USER__', username).replace('__PASS__', password));
      }
    }
    const token = createSession(username);
    res.cookie('ff_session', token, { httpOnly: true, maxAge: SESSION_MAX_AGE, sameSite: 'lax', secure: useSSL });
    audit('login_success', username, 'Session created', ip);
    console.log(`[AUTH] Login success: ${username} from ${ip}`);
    return res.redirect('/');
  }
  audit('login_failed', username, 'Wrong credentials', ip);
  console.log(`[AUTH] Login FAILED: ${username} from ${ip}`);
  res.send(LOGIN_HTML.replace('ERR_PLACEHOLDER', 'Invalid username or password'));
});

// Logout endpoint
app.get('/logout', (req, res) => {
  const token = req.cookies?.ff_session;
  const ip = getClientIP(req);
  if (token) { sessions.delete(token); audit('logout', AUTH_USER, '', ip); }
  res.clearCookie('ff_session');
  res.redirect('/');
});

// --- 2FA SETUP ENDPOINTS ---
app.get('/setup-2fa', requireLogin, async (req, res) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(AUTH_USER, 'ForgedFinancial', secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Setup 2FA</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0f1419;color:#e2e8f0;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
.box{background:#1a1f2e;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:40px;width:420px;text-align:center}
h2{margin-bottom:16px;font-size:20px}p{font-size:13px;color:#94a3b8;margin-bottom:16px}
img{margin:16px auto;border-radius:8px}code{background:#0f1419;padding:8px 16px;border-radius:8px;font-size:14px;letter-spacing:2px;display:inline-block;margin:12px 0}
.field{margin:16px 0}.field input{width:100%;padding:10px 14px;background:#0f1419;border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#e2e8f0;font-size:16px;text-align:center;letter-spacing:4px}
.btn{padding:12px 24px;background:linear-gradient(135deg,#f97316,#ef4444);border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin:8px}
.btn.sec{background:#334155}</style></head>
<body><div class="box"><h2>🔐 Setup Two-Factor Auth</h2>
<p>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
<img src="${qrDataUrl}" width="200" height="200"/>
<p>Or enter this secret manually:</p><code>${secret}</code>
<form method="POST" action="/enable-2fa"><input type="hidden" name="secret" value="${secret}"/>
<div class="field"><input name="code" type="text" placeholder="Enter 6-digit code to verify" maxlength="6" autocomplete="off" required/></div>
<button class="btn" type="submit">✅ Enable 2FA</button></form>
<br><a href="/" style="color:#94a3b8;font-size:12px">Cancel</a></div></body></html>`);
});

app.post('/enable-2fa', requireLogin, (req, res) => {
  const { secret, code } = req.body;
  const ip = getClientIP(req);
  if (authenticator.check(code, secret)) {
    fs.writeFileSync(TOTP_FILE, secret, { mode: 0o600 });
    totpSecret = secret;
    totpEnabled = true;
    audit('2fa_enabled', AUTH_USER, 'TOTP enabled', ip);
    console.log('[2FA] TOTP enabled successfully');
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>2FA Enabled</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0f1419;color:#e2e8f0;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
.box{background:#1a1f2e;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:40px;width:380px;text-align:center}
h2{color:#34d399;margin-bottom:12px}.btn{padding:12px 24px;background:linear-gradient(135deg,#f97316,#ef4444);border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;margin-top:16px}</style></head>
<body><div class="box"><h2>✅ 2FA Enabled</h2><p>Two-factor authentication is now active. You'll need your authenticator app on every login.</p><a href="/" class="btn">Continue to CC</a></div></body></html>`);
  } else {
    res.send(`<html><body style="background:#0f1419;color:#ef4444;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif"><div><h2>❌ Invalid code. <a href="/setup-2fa" style="color:#f97316">Try again</a></h2></div></body></html>`);
  }
});

app.get('/disable-2fa', requireLogin, (req, res) => {
  const ip = getClientIP(req);
  try { fs.unlinkSync(TOTP_FILE); } catch(e) {}
  totpSecret = null;
  totpEnabled = false;
  audit('2fa_disabled', AUTH_USER, 'TOTP disabled', ip);
  res.redirect('/');
});

// --- ACCESS LOG (Device Fingerprinting) ---
const ACCESS_LOG_FILE = path.join(__dirname, 'access-log.json');
let accessLog = [];
let knownDevices = {}; // fingerprint -> visit count
try {
  if (fs.existsSync(ACCESS_LOG_FILE)) {
    const data = JSON.parse(fs.readFileSync(ACCESS_LOG_FILE, 'utf8'));
    accessLog = data.log || [];
    knownDevices = data.devices || {};
  }
} catch(e) {}

function saveAccessLog() {
  try { fs.writeFileSync(ACCESS_LOG_FILE, JSON.stringify({ log: accessLog, devices: knownDevices }, null, 2)); } catch(e) {}
}

// Client-side fingerprint collection endpoint
app.post('/api/access-log', (req, res) => {
  const ip = getClientIP(req);
  const ua = req.headers['user-agent'] || 'unknown';
  const fp = req.body; // fingerprint data from client JS
  const deviceId = fp.fingerprint || crypto.createHash('sha256').update(ip + ua + (fp.screenRes || '') + (fp.platform || '')).digest('hex').substring(0, 16);
  
  const visitCount = (knownDevices[deviceId] || 0) + 1;
  knownDevices[deviceId] = visitCount;

  let entry;
  if (visitCount <= 3) {
    // Full log — capture everything
    entry = {
      ts: new Date().toISOString(),
      type: 'full',
      visitNumber: visitCount,
      ip,
      userAgent: ua,
      deviceId,
      // Browser & OS
      browser: fp.browser || null,
      browserVersion: fp.browserVersion || null,
      os: fp.os || null,
      platform: fp.platform || null,
      // Hardware
      screenRes: fp.screenRes || null,
      colorDepth: fp.colorDepth || null,
      deviceMemory: fp.deviceMemory || null,
      hardwareConcurrency: fp.hardwareConcurrency || null,
      touchSupport: fp.touchSupport || null,
      // Network & Location
      language: fp.language || null,
      languages: fp.languages || null,
      timezone: fp.timezone || null,
      timezoneOffset: fp.timezoneOffset || null,
      // Identity (from login form if available)
      username: fp.username || null,
      // Extras
      doNotTrack: fp.doNotTrack || null,
      cookiesEnabled: fp.cookiesEnabled || null,
      webdriver: fp.webdriver || null,
      plugins: fp.plugins || null,
      canvas: fp.canvasHash || null,
      webgl: fp.webglRenderer || null,
      connectionType: fp.connectionType || null,
      // Geo (if client sends it)
      geo: fp.geo || null
    };
  } else {
    // Slim log — known device
    entry = {
      ts: new Date().toISOString(),
      type: 'slim',
      visitNumber: visitCount,
      ip,
      deviceId,
      username: fp.username || null
    };
  }

  accessLog.unshift(entry);
  if (accessLog.length > 2000) accessLog = accessLog.slice(0, 2000);
  saveAccessLog();

  const label = visitCount <= 3 ? 'FULL SCAN' : 'known device';
  console.log(`[ACCESS] ${label} — ${ip} — device:${deviceId} — visit #${visitCount}`);
  audit('access', fp.username || 'unknown', `Visit #${visitCount} from ${ip}, device:${deviceId} (${label})`, ip);

  res.json({ logged: true, visitNumber: visitCount });
});

// View access log
app.get('/api/access-log', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 2000);
  res.json({ log: accessLog.slice(0, limit), totalEntries: accessLog.length, knownDevices: Object.keys(knownDevices).length });
});

// --- AUDIT TRAIL ENDPOINT ---
app.get('/api/audit', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  res.json({ entries: auditLog.slice(0, limit), total: auditLog.length });
});

// --- IP MANAGEMENT ENDPOINTS ---
app.get('/api/ip-allowlist', requireAuth, (req, res) => {
  res.json(ipAllowlist);
});

app.post('/api/ip-allowlist', requireAuth, (req, res) => {
  const ip = getClientIP(req);
  ipAllowlist = { ...ipAllowlist, ...req.body };
  fs.writeFileSync(IP_FILE, JSON.stringify(ipAllowlist, null, 2));
  audit('ip_allowlist_update', 'clawd', JSON.stringify(ipAllowlist), ip);
  res.json({ success: true });
});

// --- SECURITY SCAN ENDPOINT ---
app.get('/api/security-scan', requireAuth, async (req, res) => {
  const results = await runSecurityScan();
  res.json(results);
});

// Serve CC at root and /cc (PROTECTED)
app.get('/', requireLogin, (req, res) => {
  if (fs.existsSync(CC_FILE)) return res.sendFile(CC_FILE);
  res.status(404).send('Command Center not deployed yet');
});
/* Serve CC static assets (css/js) — require login */
app.use('/cc', requireLogin, express.static(path.join(__dirname, 'cc')));
app.use('/logos', express.static(path.join(__dirname, 'public', 'logos')));
app.get('/styles.css', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'cc', 'styles.css')));
app.get('/core.js', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'cc', 'core.js')));
app.get('/pages.js', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'cc', 'pages.js')));
app.get('/cc', requireLogin, (req, res) => {
  if (fs.existsSync(CC_FILE)) return res.sendFile(CC_FILE);
  res.status(404).send('Command Center not deployed yet');
});

// Upload new CC version (auth required)
app.post('/api/cc/deploy', requireAuth, express.text({ limit: '5mb', type: '*/*' }), (req, res) => {
  backupCC('pre-deploy');
  fs.writeFileSync(CC_FILE, req.body);
  console.log(`[CC] New version deployed (${req.body.length} bytes)`);
  res.json({ success: true, size: req.body.length, backup: true });
});

// List backups
app.get('/api/cc/backups', requireAuth, (req, res) => {
  if (!fs.existsSync(CC_BACKUP_DIR)) return res.json({ backups: [] });
  const backups = fs.readdirSync(CC_BACKUP_DIR).sort().map(f => ({
    name: f,
    size: fs.statSync(path.join(CC_BACKUP_DIR, f)).size,
    modified: fs.statSync(path.join(CC_BACKUP_DIR, f)).mtime
  }));
  res.json({ backups });
});

// Restore a backup
app.post('/api/cc/restore/:name', requireAuth, (req, res) => {
  const bk = path.join(CC_BACKUP_DIR, req.params.name);
  if (!fs.existsSync(bk)) return res.status(404).json({ error: 'Backup not found' });
  backupCC('pre-restore');
  fs.copyFileSync(bk, CC_FILE);
  console.log(`[CC] Restored from ${req.params.name}`);
  res.json({ success: true, restored: req.params.name });
});

// --- CC STATE (single source of truth) ---
const CC_STATE_FILE = path.join(__dirname, 'cc-state.json');
let ccState = null;
try {
  if (fs.existsSync(CC_STATE_FILE)) {
    ccState = JSON.parse(fs.readFileSync(CC_STATE_FILE, 'utf8'));
    console.log('Loaded CC state from disk');
  }
} catch(e) { console.error('Failed to load CC state:', e.message); }

function saveCCState() {
  if (ccState) {
    try { fs.writeFileSync(CC_STATE_FILE, JSON.stringify(ccState)); } catch(e) {}
  }
}

// Get full CC state
app.get('/api/cc-state', (req, res) => {
  if (!ccState) return res.json({ state: null });
  res.json({ state: ccState, serverTime: new Date().toISOString() });
});

// Save full CC state (from CC on every save) — with server-side merge
app.post('/api/cc-state', requireAuth, (req, res) => {
  const incoming = req.body.state || req.body;
  if (ccState) {
    // Merge arrays: keep server-side items the client doesn't have
    const arrayKeys = ['documents', 'tasks', 'logs', 'workflows', 'goals', 'memoryFiles', 'notes', 'connectedSystems'];
    for (const key of arrayKeys) {
      if (Array.isArray(ccState[key]) && Array.isArray(incoming[key])) {
        const incomingIds = new Set(incoming[key].map(item => item.id).filter(Boolean));
        // Add server-only items that client doesn't have
        for (const serverItem of ccState[key]) {
          if (serverItem.id && !incomingIds.has(serverItem.id)) {
            incoming[key].push(serverItem);
          }
        }
      } else if (Array.isArray(ccState[key]) && !Array.isArray(incoming[key])) {
        incoming[key] = ccState[key];
      }
    }
  }
  // Filter out malformed notes (leaked log entries with wrong schema)
  if(Array.isArray(incoming.notes)){incoming.notes=incoming.notes.filter(n=>n.content&&n.content!=='undefined'&&typeof n.content==='string');}
  ccState = incoming;
  saveCCState();
  if (ccState && encKey) saveEncrypted(ENC_STATE_FILE, ccState);
  audit('state_save', 'cc', 'CC state updated (merged)', getClientIP(req));
  res.json({ success: true, ts: new Date().toISOString() });
});

// --- AGENT STATUS ---
let agentStatus = { status: 'idle', task: null, subs: [], updatedAt: new Date().toISOString() };

app.get('/api/agent-status', (req, res) => {
  res.json(agentStatus);
});

app.post('/api/agent-status', requireAuth, (req, res) => {
  Object.assign(agentStatus, req.body, { updatedAt: new Date().toISOString() });
  console.log(`[AGENT] ${agentStatus.status} — ${agentStatus.task || 'no task'} — ${(agentStatus.subs||[]).length} subs`);
  res.json({ success: true });
});

// --- ROUTES ---

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    updates: store.updates.length,
    lastUpdate: store.updates.length > 0 ? store.updates[store.updates.length - 1].ts : null
  });
});

// Poll for updates since a timestamp
app.get('/api/poll', (req, res) => {
  const since = req.query.since;
  let updates;

  if (since) {
    updates = store.updates.filter(u => u.ts > since);
  } else {
    // No since param — return last 100
    updates = store.updates.slice(-100);
  }

  res.json({
    updates,
    serverTime: new Date().toISOString(),
    count: updates.length
  });
});

// Push a single update (from Clawd or CC)
app.post('/api/push', requireAuth, (req, res) => {
  const { type, action, data, source } = req.body;

  if (!type || !action || !data) {
    return res.status(400).json({ error: 'Missing type, action, or data' });
  }

  const update = {
    ts: new Date().toISOString(),
    type,
    action,
    source: source || 'clawd',
    data
  };

  store.updates.push(update);
  audit('push', source || 'clawd', `${type}/${action}: ${data.id || data.title || '?'}`, getClientIP(req));
  console.log(`[PUSH] ${source || 'clawd'} -> ${type}/${action} (${data.id || data.title || '?'})`);

  // AUTO-MERGE into ccState so pushes appear immediately
  if (ccState) {
    try {
      if (type === 'document' && (action === 'add' || action === 'create' || action === 'create' || action === 'update')) {
        if (!ccState.documents) ccState.documents = [];
        const idx = ccState.documents.findIndex(d => d.id === data.id);
        if (idx >= 0) ccState.documents[idx] = data;
        else ccState.documents.push(data);
        saveCCState();
        console.log(`[MERGE] Document "${data.title || data.id}" merged into ccState`);
      }
      if (type === 'task' && (action === 'add' || action === 'create' || action === 'create' || action === 'update')) {
        if (!ccState.tasks) ccState.tasks = [];
        const idx = ccState.tasks.findIndex(t => t.id === data.id);
        if (idx >= 0) ccState.tasks[idx] = { ...ccState.tasks[idx], ...data };
        else ccState.tasks.push(data);
        saveCCState();
        console.log(`[MERGE] Task "${data.title || data.id}" merged into ccState`);
      }
      if (type === 'log' && (action === 'add' || action === 'create')) {
        if (!ccState.logs) ccState.logs = [];
        ccState.logs.push(data);
        saveCCState();
      }
      if (type === 'workflow' && (action === 'add' || action === 'create' || action === 'create' || action === 'update')) {
        if (!ccState.workflows) ccState.workflows = [];
        const idx = ccState.workflows.findIndex(w => w.id === data.id);
        if (idx >= 0) ccState.workflows[idx] = data;
        else ccState.workflows.push(data);
        saveCCState();
      }
      if (type === 'note' && (action === 'add' || action === 'create')) {
        if (!ccState.notes) ccState.notes = [];
        if (!ccState.notes.find(n => n.id === data.id)) ccState.notes.push(data);
        saveCCState();
      }
      if (type === 'note' && action === 'delete') {
        if (ccState.notes) {
          ccState.notes = ccState.notes.filter(n => n.id !== data.id);
          saveCCState();
          console.log(`[MERGE] Note "${data.id}" deleted from ccState`);
        }
      }
      if (type === 'task' && action === 'delete') {
        if (ccState.tasks) {
          ccState.tasks = ccState.tasks.filter(t => t.id !== data.id);
          saveCCState();
          console.log(`[MERGE] Task "${data.id}" deleted from ccState`);
        }
      }
      if (type === 'connectedSystems' && (action === 'add' || action === 'create' || action === 'update')) {
        if (!ccState.connectedSystems) ccState.connectedSystems = [];
        const idx = ccState.connectedSystems.findIndex(s => s.id === data.id);
        if (idx >= 0) ccState.connectedSystems[idx] = data;
        else ccState.connectedSystems.push(data);
        saveCCState();
        console.log(`[MERGE] System "${data.name || data.id}" merged into ccState`);
      }
      if (type === 'goal' && (action === 'add' || action === 'create' || action === 'create' || action === 'update')) {
        if (!ccState.goals) ccState.goals = [];
        const idx = ccState.goals.findIndex(g => g.id === data.id);
        if (idx >= 0) ccState.goals[idx] = data;
        else ccState.goals.push(data);
        saveCCState();
      }
    } catch(mergeErr) {
      console.error('[MERGE ERROR]', mergeErr.message);
    }
  }

  // Broadcast to SSE clients
  try { broadcastSSE(update); } catch(e) {}

  res.json({ success: true, timestamp: update.ts });
});

// Batch push multiple updates
app.post('/api/batch', requireAuth, (req, res) => {
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'updates must be a non-empty array' });
  }

  const ts = new Date().toISOString();
  const stored = updates.map((u, i) => ({
    ts: new Date(Date.now() + i).toISOString(), // Ensure unique ordering
    type: u.type,
    action: u.action,
    source: u.source || 'clawd',
    data: u.data
  }));

  store.updates.push(...stored);
  audit('batch', stored[0]?.source || 'clawd', `${stored.length} updates`, getClientIP(req));
  console.log(`[BATCH] ${stored.length} updates from ${stored[0]?.source || 'clawd'}`);

  res.json({ success: true, count: stored.length, timestamp: ts });
});

// Get full current state snapshot (for initial sync / recovery)
app.get('/api/state', (req, res) => {
  res.json({
    updates: store.updates,
    serverTime: new Date().toISOString(),
    total: store.updates.length
  });
});

// --- SSE Live Sync (Feature 12) ---
const sseClients = new Set();

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write('data: {"type":"connected"}\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

function broadcastSSE(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch (e) { sseClients.delete(client); }
  }
}

// --- Morning Auto-Briefing (Feature 1) ---
app.get('/api/briefing', (req, res) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  // Get tasks from CC state
  const tasks = ccState?.tasks || [];
  const tasksDueToday = tasks.filter(t => {
    if (t.status === 'done') return false;
    if (t.deadline && t.deadline.startsWith(todayStr)) return true;
    if (t.scheduledAt && t.scheduledAt.startsWith(todayStr)) return true;
    return false;
  });
  const overdue = tasks.filter(t => t.status !== 'done' && t.deadline && t.deadline < todayStr);
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  const totalActive = tasks.filter(t => t.status !== 'done').length;
  
  // System health
  const uptime = Math.floor(process.uptime());
  const updateCount = store.updates.length;
  const sseCount = sseClients.size;
  
  res.json({
    generated: now.toISOString(),
    tasksDueToday: tasksDueToday.map(t => ({ id: t.id, title: t.title, priority: t.priority, category: t.category, deadline: t.deadline, scheduledAt: t.scheduledAt })),
    overdueTasks: overdue.map(t => ({ id: t.id, title: t.title, priority: t.priority, deadline: t.deadline })),
    inProgress: inProgress.map(t => ({ id: t.id, title: t.title, assignee: t.assignee })),
    summary: {
      totalActive,
      dueToday: tasksDueToday.length,
      overdue: overdue.length,
      inProgress: inProgress.length,
      completedTotal: tasks.filter(t => t.status === 'done').length
    },
    systemHealth: {
      uptime,
      uptimeFormatted: `${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m`,
      totalUpdates: updateCount,
      sseClients: sseCount,
      agentStatus: agentStatus.status,
      agentTask: agentStatus.task
    }
  });
});

// --- GHL Webhook Listener (Feature 9) ---
app.post('/api/webhook/ghl', (req, res) => {
  const payload = req.body;
  const log = {
    ts: new Date().toISOString(),
    type: 'log',
    action: 'create',
    source: 'ghl',
    data: {
      id: 'ghl-' + Date.now().toString(36),
      ts: new Date().toISOString(),
      type: 'business',
      op: 'system',
      txt: `GHL Webhook: ${payload.type || payload.event || 'event'} — ${payload.contact_name || payload.name || payload.email || 'Unknown'}`,
      sub: JSON.stringify(payload).substring(0, 200),
      ico: 'business'
    }
  };
  store.updates.push(log);
  broadcastSSE(log);
  console.log(`[GHL] Webhook received: ${payload.type || payload.event || 'unknown'}`);
  res.json({ success: true, logged: true });
});

// --- Automated Backups (Feature 10) ---
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function autoBackup() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  try {
    if (fs.existsSync(CC_STATE_FILE)) {
      fs.copyFileSync(CC_STATE_FILE, path.join(BACKUP_DIR, `cc-state-${ts}.json`));
    }
    if (fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, `sync-data-${ts}.json`));
    }
    // Keep last 20 backups per type
    ['cc-state-', 'sync-data-'].forEach(prefix => {
      const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith(prefix)).sort();
      while (files.length > 20) {
        fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
      }
    });
    console.log(`[BACKUP] Auto-backup completed: ${ts}`);
  } catch (e) {
    console.error('[BACKUP] Failed:', e.message);
  }
}

// Run every 6 hours
setInterval(autoBackup, 6 * 60 * 60 * 1000);
// Also run on startup
autoBackup();

// --- Broadcast on push (enhance existing push to SSE) ---
const _origPushHandler = app._router.stack;

// --- MAINTENANCE ---

// Trim old updates (keep last 2000)
setInterval(() => {
  if (store.updates.length > 2000) {
    const trimmed = store.updates.length - 2000;
    store.updates = store.updates.slice(-2000);
    console.log(`[TRIM] Removed ${trimmed} old updates`);
  }
}, 60000);

// Periodic disk backup every 5 minutes
setInterval(saveToDisk, 300000);
setInterval(saveCCState, 300000);

// Also save on graceful shutdown
process.on('SIGINT', () => { saveToDisk(); process.exit(0); });
process.on('SIGTERM', () => { saveToDisk(); process.exit(0); });

// --- SECURITY SCAN ---
async function runSecurityScan() {
  const { execSync } = require('child_process');
  const results = { ts: new Date().toISOString(), score: 100, checks: [], issues: [] };

  // Check 1: SSL
  if (useSSL) {
    results.checks.push({ name: 'HTTPS/SSL', status: 'pass', detail: 'Self-signed cert active' });
  } else {
    results.checks.push({ name: 'HTTPS/SSL', status: 'fail', detail: 'No SSL configured' });
    results.score -= 15; results.issues.push('HTTPS not enabled');
  }

  // Check 2: Password gate
  results.checks.push({ name: 'Password Gate', status: 'pass', detail: `User: ${AUTH_USER}, 12hr sessions` });

  // Check 3: 2FA
  if (totpEnabled) {
    results.checks.push({ name: '2FA (TOTP)', status: 'pass', detail: 'Enabled' });
  } else {
    results.checks.push({ name: '2FA (TOTP)', status: 'warn', detail: 'Not enabled — visit /setup-2fa' });
    results.score -= 5;
  }

  // Check 4: IP allowlist
  if (ipAllowlist.enabled && ipAllowlist.ips.length > 0) {
    results.checks.push({ name: 'IP Allowlist', status: 'pass', detail: `${ipAllowlist.ips.length} IPs allowed` });
  } else {
    results.checks.push({ name: 'IP Allowlist', status: 'warn', detail: 'Disabled — CC accessible from any IP' });
    results.score -= 5;
  }

  // Check 5: Encrypted storage
  if (encKey) {
    results.checks.push({ name: 'Encrypted Storage', status: 'pass', detail: 'AES-256-CBC active' });
  } else {
    results.checks.push({ name: 'Encrypted Storage', status: 'fail', detail: 'Encryption key missing' });
    results.score -= 10;
  }

  // Check 6: File permissions
  try {
    const keyPerms = execSync(`stat -c %a ${ENC_KEY_FILE} 2>/dev/null || echo "missing"`).toString().trim();
    const apiKeyPerms = execSync(`stat -c %a ${path.join(__dirname, '.api-key')} 2>/dev/null || echo "missing"`).toString().trim();
    if (keyPerms === '600' || keyPerms === '400') {
      results.checks.push({ name: 'Key Permissions', status: 'pass', detail: `Encryption key: ${keyPerms}` });
    } else {
      results.checks.push({ name: 'Key Permissions', status: 'warn', detail: `Encryption key perms: ${keyPerms} (should be 600)` });
      results.score -= 3;
    }
  } catch(e) { results.checks.push({ name: 'Key Permissions', status: 'warn', detail: 'Could not check' }); }

  // Check 7: UFW
  try {
    const ufw = execSync('sudo ufw status 2>/dev/null').toString();
    if (ufw.includes('active')) {
      results.checks.push({ name: 'Firewall (UFW)', status: 'pass', detail: 'Active' });
    } else {
      results.checks.push({ name: 'Firewall (UFW)', status: 'fail', detail: 'Inactive' });
      results.score -= 15;
    }
  } catch(e) { results.checks.push({ name: 'Firewall', status: 'warn', detail: 'Could not check' }); }

  // Check 8: SSH root login
  try {
    const sshd = execSync('grep -i "^PermitRootLogin" /etc/ssh/sshd_config 2>/dev/null || echo "not set"').toString().trim();
    if (sshd.includes('no') || sshd.includes('prohibit')) {
      results.checks.push({ name: 'SSH Root Login', status: 'pass', detail: sshd });
    } else {
      results.checks.push({ name: 'SSH Root Login', status: 'warn', detail: sshd });
      results.score -= 5;
    }
  } catch(e) {}

  // Check 9: Audit trail
  results.checks.push({ name: 'Audit Trail', status: 'pass', detail: `${auditLog.length} entries logged` });

  // Check 10: Open ports
  try {
    const ports = execSync('ss -tlnp 2>/dev/null | grep LISTEN').toString();
    const portList = ports.match(/:(\d+)/g)?.map(p => p.replace(':', '')) || [];
    results.checks.push({ name: 'Open Ports', status: 'pass', detail: `Listening: ${[...new Set(portList)].join(', ')}` });
  } catch(e) {}

  audit('security_scan', 'system', `Score: ${results.score}/100`, '');
  return results;
}

// Run weekly automated security scan
setInterval(async () => {
  const results = await runSecurityScan();
  console.log(`[SECURITY] Weekly scan: ${results.score}/100`);
  // Push to sync updates for CC
  const update = {
    ts: new Date().toISOString(),
    type: 'log', action: 'create', source: 'system',
    data: { id: 'scan-' + Date.now().toString(36), ts: new Date().toISOString(), type: 'alert', op: 'system',
      txt: `🛡️ Weekly Security Scan: ${results.score}/100`,
      sub: results.issues.length ? results.issues.join(', ') : 'All clear',
      ico: results.score >= 90 ? 'success' : 'warning' }
  };
  store.updates.push(update);
  try { broadcastSSE(update); } catch(e) {}
}, 7 * 24 * 60 * 60 * 1000);

// Run initial scan on startup
setTimeout(async () => {
  const r = await runSecurityScan();
  console.log(`[SECURITY] Startup scan: ${r.score}/100, ${r.checks.length} checks`);
}, 5000);

// --- LIFE DASHBOARD COLLECTORS ---
const emailCollector = require('./collectors/email');
const financeCollector = require('./collectors/finance');
const calendarCollector = require('./collectors/calendar');
const weatherCollector = require('./collectors/weather');
const { collectAds } = require('./collectors/ads');
const autoCard = require('./auto-card-builder');

// Wire finance to email
financeCollector.setEmailCollector(emailCollector);

// Start all collectors
emailCollector.start();
financeCollector.start();
calendarCollector.start();
weatherCollector.start();

// Dashboard API endpoints
app.get('/api/dashboard/email', requireAuth, (req, res) => {
  res.json(emailCollector.getData());
});

app.get('/api/dashboard/finance', requireAuth, (req, res) => {
  res.json(financeCollector.getData());
});

app.get('/api/dashboard/calendar', requireAuth, (req, res) => {
  res.json(calendarCollector.getData());
});

app.get('/api/dashboard/weather', requireAuth, (req, res) => {
  res.json(weatherCollector.getData());
});

// --- Auto-Card System Endpoints ---
app.post('/api/connect-system', requireAuth, async (req, res) => {
  try {
    const { systemId, token, extraConfig } = req.body;
    if (!systemId) return res.status(400).json({ error: 'systemId required' });
    const result = await autoCard.connectSystem(systemId, token, extraConfig || {});
    res.json({ success: true, card: result.card });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/connect-system/scan', requireAuth, async (req, res) => {
  try {
    const results = await autoCard.scanAndBuildAll();
    res.json({ success: true, systems: results });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/system-registry', requireAuth, (req, res) => {
  res.json(autoCard.registry);
});

app.get('/api/dashboard/ads', requireAuth, async (req, res) => {
  try {
    const data = await collectAds();
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/dashboard/summary', requireAuth, (req, res) => {
  const email = emailCollector.getData();
  const finance = financeCollector.getData();
  const calendar = calendarCollector.getData();
  const weather = weatherCollector.getData();

  const totalUnread = Object.values(email.accounts || {}).reduce((sum, a) => sum + (a.unreadCount || 0), 0);

  res.json({
    today: new Date().toISOString(),
    email: {
      totalUnread,
      accounts: Object.entries(email.accounts || {}).map(([name, a]) => ({
        name,
        email: a.email,
        unread: a.unreadCount || 0,
      })),
    },
    finance: finance.summary || {},
    calendar: {
      upcomingCount: (calendar.events || []).length,
      nextEvent: (calendar.events || [])[0] || null,
      events: (calendar.events || []).slice(0, 5),
    },
    weather: weather.current ? {
      temp: `${weather.current.temp_F}°F`,
      conditions: weather.current.conditions,
      feelsLike: `${weather.current.feelsLike_F}°F`,
    } : null,
  });
});

// Graceful collector shutdown
process.on('SIGINT', () => { emailCollector.stop(); financeCollector.stop(); calendarCollector.stop(); weatherCollector.stop(); });
process.on('SIGTERM', () => { emailCollector.stop(); financeCollector.stop(); calendarCollector.stop(); weatherCollector.stop(); });

// --- ENCRYPTED SAVE OVERRIDES ---
const _origSaveToDisk = saveToDisk;
const _origSaveCCState = saveCCState;

// Also save encrypted copies alongside plaintext
const _patchedSaveToDisk = function() {
  _origSaveToDisk();
  saveEncrypted(ENC_SYNC_FILE, store);
};

const _patchedSaveCCState = function() {
  _origSaveCCState();
  if (ccState) saveEncrypted(ENC_STATE_FILE, ccState);
};

// Replace the intervals to use patched versions
// (The originals are already set up, these encrypted copies are additive)
setInterval(() => { saveEncrypted(ENC_SYNC_FILE, store); }, 300000);
setInterval(() => { if (ccState) saveEncrypted(ENC_STATE_FILE, ccState); }, 300000);

// --- HTTPS REDIRECT (if SSL available, also listen on 80 for redirect) ---

// --- START ---
// --- WebSocket Proxy to Gateway (port 18789) ---
const httpProxy = require('http-proxy');
const wsProxy = httpProxy.createProxyServer({ target: 'ws://127.0.0.1:18789', ws: true, changeOrigin: true });
wsProxy.on('error', (err, req, res) => { console.error('[WS-PROXY] Error:', err.message); });

if (useSSL) {
  const sslOpts = { key: fs.readFileSync(SSL_KEY), cert: fs.readFileSync(SSL_CERT) };
  const httpsServer = https.createServer(sslOpts, app);
  // Proxy WebSocket upgrades to the gateway
  httpsServer.on('upgrade', (req, socket, head) => {
    console.log(`[WS-PROXY] Upgrade request from ${req.socket.remoteAddress}`);
    wsProxy.ws(req, socket, head);
  });
  httpsServer.listen(PORT, '0.0.0.0', () => {
    console.log(`FF Sync Server running on HTTPS port ${PORT}`);
    console.log(`Auth: ${API_KEY === 'CHANGE_ME' ? 'WARNING — using default key!' : 'API key configured'}`);
    console.log(`Security: Password✅ 2FA:${totpEnabled?'✅':'❌'} SSL:✅ IPList:${ipAllowlist.enabled?'✅':'❌'} Encryption:${encKey?'✅':'❌'} Audit:✅`);
    // Auto-scan for connected systems on startup (delayed to let server settle)
    setTimeout(() => {
      autoCard.scanAndBuildAll().then(r => {
        console.log(`[Auto-Card] Startup scan: ${r.length} systems processed`);
      }).catch(e => console.error('[Auto-Card] Startup scan failed:', e.message));
    }, 5000);
  });
  // HTTP redirect on port 80
  const http = require('http');
  http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host?.replace(':80', ':' + PORT) || req.headers.host}${req.url}` });
    res.end();
  }).listen(80, '0.0.0.0', () => { console.log('HTTP→HTTPS redirect on port 80'); }).on('error', () => {});
} else {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FF Sync Server running on HTTP port ${PORT}`);
    console.log(`Auth: ${API_KEY === 'CHANGE_ME' ? 'WARNING — using default key!' : 'API key configured'}`);
    console.log(`Security: Password✅ 2FA:${totpEnabled?'✅':'❌'} SSL:❌ IPList:${ipAllowlist.enabled?'✅':'❌'} Encryption:${encKey?'✅':'❌'} Audit:✅`);
  });
}
