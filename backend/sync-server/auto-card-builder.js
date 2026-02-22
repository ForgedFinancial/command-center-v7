// Auto-Card Builder — generates CC Connected Systems cards automatically
// When a new API key/token is detected, builds a polished card and pushes to CC

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const REGISTRY_PATH = path.join(__dirname, 'system-registry.json');
const LOGOS_DIR = path.join(__dirname, 'public', 'logos');
const API_KEY = fs.readFileSync(path.join(__dirname, '.api-key'), 'utf8').trim();
const BASE_URL = 'https://localhost:443';

let registry = {};
try { registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')); } catch(e) { console.error('Failed to load registry:', e.message); }

// Env var → system ID mapping
const ENV_MAP = {};
for (const [id, cfg] of Object.entries(registry)) {
  if (cfg.envVar) ENV_MAP[cfg.envVar] = id;
}

// File-based credentials (Gmail OAuth tokens, iCloud config)
const FILE_CREDENTIALS = {
  gmail: {
    check: () => {
      const tokenFiles = ['token_personal.json', 'token_gmail.json', 'token_business.json'];
      const found = tokenFiles.filter(f => fs.existsSync(path.join('/home/clawd/sentinel', f)));
      return found.length > 0 ? { accounts: found.length, tokenDir: '/home/clawd/sentinel' } : null;
    }
  },
  icloud: {
    check: () => {
      const configPath = '/home/clawd/calendar-integration/calendar_config.json';
      if (fs.existsSync(configPath)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          return { calendars: (cfg.calendars || []).length, appleId: cfg.apple_id };
        } catch(e) { return null; }
      }
      return null;
    }
  }
};

function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const opts = new URL(url);
    const reqOpts = {
      hostname: opts.hostname,
      port: opts.port || (url.startsWith('https') ? 443 : 80),
      path: opts.pathname + opts.search,
      method: 'GET',
      headers: { 'User-Agent': 'Clawd/1.0', ...headers },
      rejectUnauthorized: false,
      timeout: 10000
    };
    const req = mod.request(reqOpts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function postJSON(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const opts = new URL(url);
    const payload = JSON.stringify(body);
    const reqOpts = {
      hostname: opts.hostname,
      port: opts.port || 443,
      path: opts.pathname + opts.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      },
      rejectUnauthorized: false,
      timeout: 10000
    };
    const req = mod.request(reqOpts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end(payload);
  });
}

function getLogoSrc(systemId) {
  const cfg = registry[systemId];
  if (!cfg) return '';
  const logoFile = cfg.logoFile;
  // Check for PNG first, then SVG
  const pngPath = path.join(LOGOS_DIR, logoFile);
  const svgPath = path.join(LOGOS_DIR, logoFile.replace('.png', '.svg'));
  if (fs.existsSync(pngPath)) return `/logos/${logoFile}`;
  if (fs.existsSync(svgPath)) return `/logos/${logoFile.replace('.png', '.svg')}`;
  return '';
}

async function verifySystem(systemId, token) {
  const cfg = registry[systemId];
  if (!cfg || !cfg.verifyUrl) return { live: false, reason: 'no verify URL' };

  let url = cfg.verifyUrl.replace('{token}', token);
  let headers = {};

  switch (cfg.authType) {
    case 'Bearer':
      headers['Authorization'] = `Bearer ${token}`;
      break;
    case 'X-Subscription-Token':
      headers['X-Subscription-Token'] = token;
      break;
    case 'OAuth':
      // Token already in URL for meta, or in header for gmail
      if (!url.includes(token)) headers['Authorization'] = `Bearer ${token}`;
      break;
    case 'ApiKey':
      // Already in URL via {token}
      break;
  }

  if (cfg.extraHeaders) Object.assign(headers, cfg.extraHeaders);

  try {
    const resp = await fetchJSON(url, headers);
    return { live: resp.status >= 200 && resp.status < 300, status: resp.status, data: resp.data };
  } catch(e) {
    return { live: false, reason: e.message };
  }
}

async function getSystemStats(systemId, token, verifyData) {
  const stats = {};
  switch (systemId) {
    case 'gmail': {
      const fileCreds = FILE_CREDENTIALS.gmail.check();
      if (fileCreds) {
        stats.accounts = fileCreds.accounts;
        stats.description = `${fileCreds.accounts} accounts monitored`;
      }
      break;
    }
    case 'ghl': {
      if (verifyData && verifyData.data && verifyData.data.contacts) {
        stats.contacts = verifyData.data.meta?.total || verifyData.data.contacts.length;
      }
      try {
        const resp = await fetchJSON(
          'https://services.leadconnectorhq.com/contacts/?locationId=FINPoRVWInKbwFxxQJMA&limit=1',
          { Authorization: `Bearer ${token}`, Version: '2021-07-28' }
        );
        if (resp.data && resp.data.meta) stats.contacts = resp.data.meta.total;
      } catch(e) {}
      break;
    }
    case 'meta': {
      try {
        const resp = await fetchJSON(`https://graph.facebook.com/v21.0/me/adaccounts?fields=name,account_status&access_token=${token}`);
        if (resp.data && resp.data.data) {
          stats.adAccounts = resp.data.data.length;
          stats.activeAccounts = resp.data.data.filter(a => a.account_status === 1).length;
        }
        const perms = await fetchJSON(`https://graph.facebook.com/v21.0/me/permissions?access_token=${token}`);
        if (perms.data && perms.data.data) {
          stats.permissions = perms.data.data.filter(p => p.status === 'granted').map(p => p.permission).join(', ');
        }
      } catch(e) {}
      break;
    }
    case 'icloud': {
      const fileCreds = FILE_CREDENTIALS.icloud.check();
      if (fileCreds) {
        stats.calendars = fileCreds.calendars;
        stats.appleId = fileCreds.appleId;
      }
      break;
    }
    case 'github': {
      if (verifyData && verifyData.data) {
        stats.user = verifyData.data.login;
        stats.publicRepos = verifyData.data.public_repos;
      }
      break;
    }
    case 'openai': {
      if (verifyData && verifyData.data && verifyData.data.data) {
        stats.models = verifyData.data.data.length;
      }
      break;
    }
  }
  return stats;
}

async function buildCard(systemId, token = null) {
  const cfg = registry[systemId];
  if (!cfg) throw new Error(`Unknown system: ${systemId}`);

  // Get token from env if not provided
  if (!token && cfg.envVar) token = process.env[cfg.envVar];

  // For file-based creds
  let fileCreds = null;
  if (!token && FILE_CREDENTIALS[systemId]) {
    fileCreds = FILE_CREDENTIALS[systemId].check();
  }

  const isConnected = !!(token || fileCreds);
  let verifyResult = null;
  if (token && cfg.verifyUrl) {
    verifyResult = await verifySystem(systemId, token);
  }

  const stats = await getSystemStats(systemId, token, verifyResult);
  const logoSrc = getLogoSrc(systemId);
  const now = new Date().toISOString();

  // Build icon HTML — real image tag
  const iconHtml = logoSrc
    ? `<img src="${logoSrc}" style="width:28px;height:28px;border-radius:4px;object-fit:contain" alt="${cfg.name}">`
    : cfg.name.charAt(0); // fallback to first letter

  // Map defaultAccess to CC-expected string format
  const accessMap = { 'READ ONLY': 'read', 'READ/WRITE': 'read-write' };
  const accessStr = accessMap[cfg.defaultAccess] || 'none';

  // Store auth details in stats for reference
  stats.accessType = cfg.authType;
  if (cfg.defaultAccess) stats.accessScopes = cfg.defaultAccess;

  const card = {
    id: systemId,
    name: cfg.name,
    icon: iconHtml,
    status: isConnected ? (verifyResult ? (verifyResult.live ? 'connected' : 'error') : 'connected') : 'disconnected',
    lastCheck: now,
    stats: stats,
    access: accessStr
  };

  return card;
}

async function pushCard(card) {
  try {
    const result = await postJSON(`${BASE_URL}/api/push`, {
      type: 'connectedSystems',
      action: 'add',
      data: card
    }, {
      'Authorization': `Bearer ${API_KEY}`
    });
    return result;
  } catch(e) {
    console.error(`Failed to push card for ${card.id}:`, e.message);
    return null;
  }
}

async function logActivity(message, icon = '🔌') {
  try {
    await postJSON(`${BASE_URL}/api/push`, {
      type: 'logs',
      action: 'add',
      data: {
        id: `log-autocard-${Date.now()}`,
        ts: new Date().toISOString(),
        type: 'backend',
        op: 'Auto-Card Builder',
        txt: message,
        sub: 'clawd',
        ico: icon
      }
    }, {
      'Authorization': `Bearer ${API_KEY}`
    });
  } catch(e) {}
}

async function scanAndBuildAll() {
  console.log('[Auto-Card] Scanning for connected systems...');
  const results = [];

  for (const [systemId, cfg] of Object.entries(registry)) {
    let token = null;
    let hasCredentials = false;

    // Check env var
    if (cfg.envVar && process.env[cfg.envVar]) {
      token = process.env[cfg.envVar];
      hasCredentials = true;
    }

    // Check file-based credentials
    if (!hasCredentials && FILE_CREDENTIALS[systemId]) {
      const fileCreds = FILE_CREDENTIALS[systemId].check();
      if (fileCreds) hasCredentials = true;
    }

    if (hasCredentials) {
      try {
        const card = await buildCard(systemId, token);
        await pushCard(card);
        results.push({ systemId, status: card.status, stats: card.stats });
        console.log(`[Auto-Card] ✅ ${cfg.name}: ${card.status}`);
      } catch(e) {
        console.error(`[Auto-Card] ❌ ${cfg.name}: ${e.message}`);
        results.push({ systemId, status: 'error', error: e.message });
      }
    }
  }

  if (results.length > 0) {
    await logActivity(`Auto-scan complete: ${results.filter(r => r.status === 'connected').length}/${results.length} systems connected`);
  }

  return results;
}

async function connectSystem(systemId, token, extraConfig = {}) {
  const cfg = registry[systemId];
  if (!cfg) throw new Error(`Unknown system: ${systemId}`);

  const card = await buildCard(systemId, token);
  const pushResult = await pushCard(card);
  await logActivity(`${cfg.name} connected via Auto-Card Builder`, '🔌');

  return { card, pushResult };
}

module.exports = {
  registry,
  buildCard,
  pushCard,
  scanAndBuildAll,
  connectSystem,
  verifySystem,
  logActivity,
  ENV_MAP
};
