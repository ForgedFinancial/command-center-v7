#!/usr/bin/env node
/**
 * Forged Financial — Hourly Activity Logger
 * Runs every hour via cron. Collects all frontend, backend, and system activity.
 * Pushes to CC activity log. Never resets — appends only.
 * After 100 entries per page, new page. After 1000, compiles summaries.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const API_KEY = fs.readFileSync(path.join(__dirname, '.api-key'), 'utf8').trim();
const STATE_FILE = path.join(__dirname, 'activity-logger-state.json');
const ARCHIVE_DIR = path.join(__dirname, 'activity-archives');
const BASE_URL = 'https://localhost:443';

if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

// Load state
let state = { 
  currentPage: 1, 
  entriesOnPage: 0, 
  totalEntries: 0, 
  lastRun: null,
  pages: [], // { page, startTs, endTs, entryCount, file }
  compiledSummaries: [] // { fromPage, toPage, ts, summary, file }
};
try { if (fs.existsSync(STATE_FILE)) state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch(e) {}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function ts() { return new Date().toISOString(); }
function fmtDT(d) {
  const dt = new Date(d);
  return `${dt.getMonth()+1}/${dt.getDate()}/${String(dt.getFullYear()).slice(2)} - ${dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}).toLowerCase()}`;
}

// HTTPS request helper (self-signed cert)
function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const opts = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      rejectUnauthorized: false
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Collect all activity sources
async function collectActivity() {
  const now = new Date();
  const since = state.lastRun || new Date(now.getTime() - 3600000).toISOString();
  const entries = [];

  // 1. Server health
  try {
    const health = await apiRequest('GET', '/health');
    entries.push({
      id: `sys-health-${Date.now().toString(36)}`, ts: ts(), type: 'system', op: 'system',
      txt: `💚 System Health Check`, 
      sub: `Uptime: ${Math.floor(health.uptime/3600)}h ${Math.floor((health.uptime%3600)/60)}m | Updates: ${health.updates} | Last: ${health.lastUpdate ? fmtDT(health.lastUpdate) : 'none'}`,
      ico: 'success'
    });
  } catch(e) {
    entries.push({ id: `sys-err-${Date.now().toString(36)}`, ts: ts(), type: 'alert', op: 'system', txt: '🔴 Health check failed', sub: e.message, ico: 'error' });
  }

  // 2. Agent status
  try {
    const agent = await apiRequest('GET', '/api/agent-status');
    entries.push({
      id: `sys-agent-${Date.now().toString(36)}`, ts: ts(), type: 'system', op: 'openclaw',
      txt: `🤖 Agent Status: ${agent.status || 'idle'}`,
      sub: agent.task ? `Task: ${agent.task}` : 'No active task',
      ico: agent.status === 'working' ? 'success' : 'info'
    });
  } catch(e) {}

  // 3. Access log — new visits since last run
  try {
    const accessData = await apiRequest('GET', '/api/access-log?limit=50');
    const newVisits = accessData.log.filter(v => v.ts > since);
    if (newVisits.length > 0) {
      entries.push({
        id: `sys-access-${Date.now().toString(36)}`, ts: ts(), type: 'security', op: 'system',
        txt: `🔍 ${newVisits.length} new access log entries`,
        sub: `Devices: ${accessData.knownDevices} known | Latest: ${newVisits[0].ip} (${newVisits[0].deviceId})`,
        ico: 'info'
      });
    }
  } catch(e) {}

  // 4. Audit trail — new entries since last run
  try {
    const auditData = await apiRequest('GET', '/api/audit?limit=100');
    const newAudits = auditData.entries.filter(a => a.ts > since);
    if (newAudits.length > 0) {
      const loginAttempts = newAudits.filter(a => a.action.includes('login'));
      const pushes = newAudits.filter(a => a.action === 'push');
      const stateChanges = newAudits.filter(a => a.action === 'state_save');
      const parts = [];
      if (loginAttempts.length) parts.push(`${loginAttempts.length} logins`);
      if (pushes.length) parts.push(`${pushes.length} pushes`);
      if (stateChanges.length) parts.push(`${stateChanges.length} state saves`);
      entries.push({
        id: `sys-audit-${Date.now().toString(36)}`, ts: ts(), type: 'security', op: 'system',
        txt: `📋 ${newAudits.length} audit events`,
        sub: parts.join(' | ') || `${newAudits.length} events since last check`,
        ico: 'info'
      });
    }
  } catch(e) {}

  // 5. Disk/memory check
  try {
    const diskUsage = execSync("df -h / | tail -1 | awk '{print $5}'").toString().trim();
    const memInfo = execSync("free -m | grep Mem | awk '{printf \"%.0f%% (%dMB/%dMB)\", $3/$2*100, $3, $2}'").toString().trim();
    const loadAvg = execSync("cat /proc/loadavg | awk '{print $1, $2, $3}'").toString().trim();
    entries.push({
      id: `sys-resources-${Date.now().toString(36)}`, ts: ts(), type: 'system', op: 'system',
      txt: `📊 Server Resources`,
      sub: `Disk: ${diskUsage} | RAM: ${memInfo} | Load: ${loadAvg}`,
      ico: 'success'
    });
  } catch(e) {}

  // 6. Service status
  try {
    const services = ['ff-sync', 'cc-watcher'];
    const statuses = services.map(s => {
      try { return execSync(`systemctl is-active ${s}.service 2>/dev/null`).toString().trim(); } catch(e) { return 'inactive'; }
    });
    const gwStatus = (() => { try { return execSync('systemctl --user is-active openclaw-gateway 2>/dev/null').toString().trim(); } catch(e) { return 'inactive'; } })();
    entries.push({
      id: `sys-services-${Date.now().toString(36)}`, ts: ts(), type: 'system', op: 'system',
      txt: `⚙️ Services Check`,
      sub: `ff-sync: ${statuses[0]} | cc-watcher: ${statuses[1]} | gateway: ${gwStatus}`,
      ico: statuses.every(s => s === 'active') && gwStatus === 'active' ? 'success' : 'warning'
    });
  } catch(e) {}

  // 7. Security scan (run every 6 hours, not every hour)
  const hoursSinceLastScan = state.lastSecurityScan ? (Date.now() - new Date(state.lastSecurityScan).getTime()) / 3600000 : 999;
  if (hoursSinceLastScan >= 6) {
    try {
      const scan = await apiRequest('GET', '/api/security-scan');
      state.lastSecurityScan = ts();
      entries.push({
        id: `sys-secscan-${Date.now().toString(36)}`, ts: ts(), type: 'security', op: 'system',
        txt: `🛡️ Security Scan: ${scan.score}/100`,
        sub: scan.checks.filter(c => c.status !== 'pass').map(c => `${c.name}: ${c.status}`).join(', ') || 'All checks passed',
        ico: scan.score >= 90 ? 'success' : 'warning'
      });
    } catch(e) {}
  }

  // 8. Sync data stats
  try {
    const poll = await apiRequest('GET', '/api/poll?since=' + since);
    if (poll.count > 0) {
      const types = {};
      poll.updates.forEach(u => { types[u.type] = (types[u.type] || 0) + 1; });
      entries.push({
        id: `sys-sync-${Date.now().toString(36)}`, ts: ts(), type: 'system', op: 'system',
        txt: `🔄 ${poll.count} sync updates since last check`,
        sub: Object.entries(types).map(([k,v]) => `${k}: ${v}`).join(' | '),
        ico: 'info'
      });
    }
  } catch(e) {}

  // 9. Backup status
  try {
    const backups = await apiRequest('GET', '/api/cc/backups');
    const autoBackups = fs.readdirSync(ARCHIVE_DIR).length;
    entries.push({
      id: `sys-backup-${Date.now().toString(36)}`, ts: ts(), type: 'system', op: 'system',
      txt: `💾 Backup Status`,
      sub: `CC backups: ${backups.backups?.length || 0} | Activity archives: ${autoBackups} | Logger pages: ${state.currentPage}`,
      ico: 'success'
    });
  } catch(e) {}

  return entries;
}

// Archive current page
function archivePage(pageNum, entries) {
  const file = path.join(ARCHIVE_DIR, `activity-page-${String(pageNum).padStart(4, '0')}.json`);
  let existing = [];
  try { if (fs.existsSync(file)) existing = JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) {}
  existing.push(...entries);
  fs.writeFileSync(file, JSON.stringify(existing, null, 2));
  return file;
}

// Compile and summarize when hitting 1000
function compileSummary(fromPage, toPage) {
  const allEntries = [];
  for (let p = fromPage; p <= toPage; p++) {
    const file = path.join(ARCHIVE_DIR, `activity-page-${String(p).padStart(4, '0')}.json`);
    try { if (fs.existsSync(file)) allEntries.push(...JSON.parse(fs.readFileSync(file, 'utf8'))); } catch(e) {}
  }

  // Build summary
  const types = {};
  const ops = {};
  let alerts = 0, errors = 0;
  allEntries.forEach(e => {
    types[e.type] = (types[e.type] || 0) + 1;
    ops[e.op] = (ops[e.op] || 0) + 1;
    if (e.type === 'alert') alerts++;
    if (e.ico === 'error') errors++;
  });

  const firstTs = allEntries.length ? allEntries[allEntries.length - 1].ts : null;
  const lastTs = allEntries.length ? allEntries[0].ts : null;

  const summary = {
    compiledAt: ts(),
    fromPage, toPage,
    period: { from: firstTs, to: lastTs },
    totalEntries: allEntries.length,
    byType: types,
    byOperator: ops,
    alerts, errors,
    highlights: allEntries.filter(e => e.type === 'alert' || e.ico === 'error' || e.ico === 'warning').slice(0, 20).map(e => ({ ts: e.ts, txt: e.txt, sub: e.sub }))
  };

  const summaryFile = path.join(ARCHIVE_DIR, `summary-pages-${fromPage}-${toPage}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  state.compiledSummaries.push({ fromPage, toPage, ts: ts(), file: summaryFile, totalEntries: allEntries.length });
  
  return summary;
}

// Push entries to CC
async function pushToCC(entries) {
  if (entries.length === 0) return;
  
  const updates = entries.map(e => ({
    type: 'log', action: 'create', source: 'system',
    data: e
  }));

  await apiRequest('POST', '/api/batch', { updates });
}

// Main
async function run() {
  console.log(`[${ts()}] Activity logger running...`);
  
  const entries = await collectActivity();
  
  if (entries.length === 0) {
    console.log('No activity to log');
    state.lastRun = ts();
    saveState();
    return;
  }

  // Archive to current page
  const pageFile = archivePage(state.currentPage, entries);
  state.entriesOnPage += entries.length;
  state.totalEntries += entries.length;
  
  // Track page metadata
  const pageIdx = state.pages.findIndex(p => p.page === state.currentPage);
  if (pageIdx >= 0) {
    state.pages[pageIdx].endTs = ts();
    state.pages[pageIdx].entryCount = state.entriesOnPage;
  } else {
    state.pages.push({ page: state.currentPage, startTs: ts(), endTs: ts(), entryCount: state.entriesOnPage, file: pageFile });
  }

  // Check if page is full (100 entries)
  if (state.entriesOnPage >= 100) {
    console.log(`Page ${state.currentPage} full (${state.entriesOnPage} entries). Opening page ${state.currentPage + 1}`);
    state.currentPage++;
    state.entriesOnPage = 0;
  }

  // Check if we need to compile (every 1000 entries = 10 pages)
  const uncompiledPages = state.pages.filter(p => !state.compiledSummaries.some(s => p.page >= s.fromPage && p.page <= s.toPage));
  if (uncompiledPages.length >= 10) {
    const fromPage = uncompiledPages[0].page;
    const toPage = uncompiledPages[9].page;
    console.log(`Compiling summary for pages ${fromPage}-${toPage}...`);
    const summary = compileSummary(fromPage, toPage);
    
    // Push compilation notice to CC
    entries.push({
      id: `compile-${Date.now().toString(36)}`, ts: ts(), type: 'system', op: 'system',
      txt: `📚 Activity log compiled: Pages ${fromPage}-${toPage}`,
      sub: `${summary.totalEntries} entries summarized. ${summary.alerts} alerts, ${summary.errors} errors. Period: ${fmtDT(summary.period.from)} → ${fmtDT(summary.period.to)}`,
      ico: 'info'
    });
  }

  // Push to CC
  await pushToCC(entries);
  
  state.lastRun = ts();
  saveState();
  
  console.log(`[${ts()}] Done. ${entries.length} entries logged. Page ${state.currentPage} (${state.entriesOnPage}/100). Total: ${state.totalEntries}`);
}

run().catch(e => {
  console.error('Activity logger error:', e);
  process.exit(1);
});
