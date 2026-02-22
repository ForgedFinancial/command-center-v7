require("dotenv").config();
const { validateEnv } = require('./validateEnv');
validateEnv();
// Command Center Backend API Server
// Enables bidirectional communication with Openclaw/Claude
// Version: 1.0.0

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require("https");
const fsSync = require("fs");
const fs = require('fs').promises;
const path = require('path');
const { bootstrapOpsWorkspace } = require('./lib/opsBootstrap');
const { initOpsWebSocket } = require('./websocket');

// Import data collectors (email, finance, ads REMOVED — tokens expired, not in use)
// const emailCollector = require('./collectors/email');
// const financeCollector = require('./collectors/finance');
const calendarCollector = require('./collectors/calendar');
// const adsCollector = require('./collectors/ads');
// const weatherCollector = require('./collectors/weather'); // REMOVED — only fed old CC dashboard

const app = express();
const PORT = process.env.PORT || 3737;
const API_KEY = process.env.CC_API_KEY || process.env.SYNC_API_KEY;

// Auth module (Session 4: Auth Overhaul)
const { registerRoutes: registerAuthRoutes, authMiddleware } = require('./auth');

// Middleware — CORS with credentials support
const ALLOWED_ORIGINS = [
  'https://command-center-v7.pages.dev',
  'https://cc.forgedfinancial.us',
  'https://forged-sync.danielruh.workers.dev',
  /^https:\/\/[a-f0-9]+\.command-center-v7\.pages\.dev$/,  // Preview deploys
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some(o =>
      o instanceof RegExp ? o.test(origin) : o === origin
    );
    callback(null, allowed ? origin : false);
  },
  credentials: true,
}));
app.use(bodyParser.json({ limit: '10mb' }));

// Bootstrap Ops Board storage/config before route registration.
try {
  bootstrapOpsWorkspace(console);
} catch (err) {
  console.error('[OPS] Workspace bootstrap failed:', err.message);
}

// Register auth routes BEFORE auth middleware
registerAuthRoutes(app);

// Leads webhook — NO AUTH (external vendors POST here)
const leadsWebhookRoutes = require('./routes/leads-webhook');
app.use('/api/leads/webhook', leadsWebhookRoutes);

// Health check — BEFORE auth middleware (must work without API key)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    queueSize: eventQueue.length,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    apiKeyConfigured: API_KEY !== undefined
  });
});

// Auth middleware on all /api/* routes (with API key fallback for agents)
app.use(authMiddleware);

// Lead Sources settings (auth-protected)
const leadSourcesRoutes = require('./routes/lead-sources');
app.use('/api/settings/lead-sources', leadSourcesRoutes);

// Ops Layer v2 + legacy compatibility
const opsRoutes = require('./routes/ops');
const opsLegacyRoutes = require('./routes/ops-legacy');
app.use('/api/ops', opsRoutes);
app.use('/api/ops', opsLegacyRoutes);

// Agent Daemon Task Queue (Mason, 2026-02-21)
const tasksRoutes = require('./routes/tasks');
app.use('/api/comms/tasks', tasksRoutes);
const agentStatusRoutes = require('./routes/agent-status');
app.use('/api/comms/agents/status', agentStatusRoutes);

app.use(express.static('cc')); // Serve index.html from cc/ folder

// Task Board API routes
const taskboardRoutes = require('./routes/taskboard');
app.use('/api/taskboard', taskboardRoutes);

// Projects API routes (AI assist for canvas task/checklist generation)
const projectsRoutes = require('./routes/projects');
app.use('/api/projects', projectsRoutes);

// Notifications API routes
const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes);

// Contacts API routes (Activity + Follow-Up Queue)
const contactsRoutes = require('./routes/contacts');
app.use('/api/contacts', contactsRoutes);

// Stand-Up Room Communication Hub (Agent↔Boss routing + Telegram relay)
const standupRoutes = require('./routes/standup');
app.use('/api/comms/room', standupRoutes);

// Mac Node Proxy routes (iMessage + Calls)
const { registerRoutes: registerMacRoutes } = require('./routes/mac-proxy');
registerMacRoutes(app);

// Phone Action routes (Call, Video, Message via Mac)
const { registerRoutes: registerPhoneRoutes } = require('./routes/phone-actions');
registerPhoneRoutes(app);

// Twilio Integration routes (Browser calling, SMS, number management)
const { registerRoutes: registerTwilioRoutes } = require('./routes/twilio');
registerTwilioRoutes(app);

// Power Dialer session routes
const dialerRoutes = require('./routes/dialer');
app.use('/api/twilio/dialer', dialerRoutes);

// Lead Watcher — DISABLED (redundant with GSheet poller, was doubling D1 requests + duplicate alerts)
// const leadWatcher = require('./lead-watcher');
// leadWatcher.start(); // DISABLED — redundant

// Google Sheet Lead Poller — watches spreadsheet for new leads
const gsheetPoller = require('./routes/gsheet-poller');
const stubRoutes = require('./routes/stubs');
app.use('/api', stubRoutes);
gsheetPoller.start();

// Track CC v7 activity (any authenticated API call = Boss is active)
app.use('/api', (req, res, next) => {
  // Write activity timestamp for cron job to read
  const actFile = '/home/clawd/.openclaw/data/leads/cc-activity.json';
  try { fsSync.writeFileSync(actFile, JSON.stringify({ lastActivity: new Date().toISOString() })); } catch {}
  next();
});

// In-memory event queue (would use Redis in production)
const eventQueue = [];
const MAX_QUEUE_SIZE = 1000;

// === PERSISTENT STATE ===
const CC_STATE_FILE = path.join(__dirname, 'cc-state.json');
const WORKSPACE_ROOT = '/home/clawd/.openclaw/workspace';
const WORKSPACE_AGENT_IDS = ['clawd', 'soren', 'mason', 'sentinel', 'kyle'];
const WORKSPACE_MAX_FILE_BYTES = 1024 * 1024; // 1MB
const WORKSPACE_AUDIT_LOG = path.join(WORKSPACE_ROOT, 'workspace-audit.log');

function loadState() {
  try {
    if (fsSync.existsSync(CC_STATE_FILE)) {
      return JSON.parse(fsSync.readFileSync(CC_STATE_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[STATE] Failed to load:', err.message);
  }
  return { tasks: [], activityLog: [], documents: [], suggestions: [], agents: [], auth: {}, connectedSystems: [] };
}

function saveState(state) {
  try {
    fsSync.writeFileSync(CC_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('[STATE] Failed to save:', err.message);
  }
}

let ccState = loadState();

// Authentication middleware
function authenticateAPI(req, res, next) {
  // Accept both "Authorization: Bearer TOKEN" and "X-API-Key: TOKEN"
  const authHeader = req.headers['authorization'];
  const xApiKey = req.headers['x-api-key'];
  const token = xApiKey || (authHeader && authHeader.split(' ')[1]); // X-API-Key takes priority

  if (!token || token !== API_KEY) {
    console.warn(`[AUTH FAIL] Invalid token attempt from ${req.ip}`);
    return res.status(403).json({ error: 'Invalid or missing API key' });
  }

  next();
}

// Utility: Generate unique ID
function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

function isPathInsideRoot(rootPath, testPath) {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedTest = path.resolve(testPath);
  return resolvedTest === resolvedRoot || resolvedTest.startsWith(resolvedRoot + path.sep);
}

function isValidWorkspaceAgentId(agentId) {
  return typeof agentId === 'string' && /^[a-z0-9-]+$/i.test(agentId);
}

function normalizeWorkspaceRelativePath(rawPath) {
  if (typeof rawPath !== 'string') return null;
  const normalized = rawPath.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) return null;
  if (!normalized.endsWith('.md')) return null;
  if (normalized.includes('..')) return null;
  if (!/^[a-z0-9._\-\/ ]+$/i.test(normalized)) return null;
  return normalized;
}

function resolveWorkspaceAgentRoot(agentId) {
  if (!isValidWorkspaceAgentId(agentId)) return null;
  const agentsRoot = path.resolve(path.join(WORKSPACE_ROOT, 'agents'));
  const agentRoot = path.resolve(path.join(agentsRoot, agentId));
  if (!isPathInsideRoot(agentsRoot, agentRoot)) return null;
  return { agentsRoot, agentRoot };
}

function resolveWorkspaceFilePath(agentId, relativePath) {
  const normalizedPath = normalizeWorkspaceRelativePath(relativePath);
  if (!normalizedPath) return null;
  const rootData = resolveWorkspaceAgentRoot(agentId);
  if (!rootData) return null;
  const { agentRoot } = rootData;

  const resolved = path.resolve(path.join(agentRoot, normalizedPath));
  if (!isPathInsideRoot(agentRoot, resolved)) return null;

  return { agentRoot, normalizedPath, resolved };
}

function listWorkspaceMarkdownFiles(agentId) {
  const rootData = resolveWorkspaceAgentRoot(agentId);
  if (!rootData) return [];
  const { agentRoot } = rootData;
  if (!fsSync.existsSync(agentRoot)) return [];

  const files = [];
  const pending = [agentRoot];

  while (pending.length > 0) {
    const current = pending.pop();
    let entries = [];
    try {
      entries = fsSync.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      continue;
    }

    entries.forEach(entry => {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        // Ignore hidden folders such as .archive and .git.
        if (!entry.name.startsWith('.')) {
          pending.push(absolute);
        }
        return;
      }
      if (!entry.isFile() || !entry.name.endsWith('.md')) return;

      try {
        const stat = fsSync.statSync(absolute);
        const relativePath = path.relative(agentRoot, absolute).replace(/\\/g, '/');
        files.push({
          filename: entry.name,
          path: relativePath,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          lastModified: stat.mtime.toISOString(),
        });
      } catch (error) {
        // Ignore files that cannot be stat'ed.
      }
    });
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function findWorkspaceMatchesByFilename(agentId, filename) {
  const target = String(filename || '').toLowerCase();
  if (!target) return [];
  return listWorkspaceMarkdownFiles(agentId).filter(file => file.filename.toLowerCase() === target);
}

function appendWorkspaceAuditLog(req, operation, details) {
  try {
    fsSync.mkdirSync(path.dirname(WORKSPACE_AUDIT_LOG), { recursive: true });
    const entry = {
      timestamp: new Date().toISOString(),
      operation,
      user: req?.user?.username || req?.headers?.['x-user'] || 'api',
      ip: req?.ip || null,
      ...details,
    };
    fsSync.appendFileSync(WORKSPACE_AUDIT_LOG, JSON.stringify(entry) + '\n', 'utf8');
  } catch (error) {
    // Audit logging should never block workspace writes.
  }
}

// === CC STATE ENDPOINTS ===

// GET /api/cc-state — full state read
app.get('/api/cc-state', authenticateAPI, (req, res) => {
  res.json({ state: ccState, serverTime: new Date().toISOString() });
});

// POST /api/cc-state — full state write (from CC frontend save)
app.post('/api/cc-state', authenticateAPI, (req, res) => {
  const incoming = req.body;
  if (!incoming) return res.status(400).json({ error: 'No state provided' });
  // Merge: incoming overwrites keys, preserves anything not sent
  ccState = { ...ccState, ...incoming };
  saveState(ccState);
  res.json({ success: true, timestamp: new Date().toISOString() });
});

// === EXISTING ENDPOINTS (from frontend sync bridge) ===

// POST /api/push - Accept updates from Command Center
app.post('/api/push', authenticateAPI, (req, res) => {
  const { type, action, data, source } = req.body;

  if (!type || !action || !data) {
    return res.status(400).json({ error: 'Missing required fields: type, action, data' });
  }

  console.log(`[PUSH] ${type}/${action} from ${source || 'unknown'}`);

  // Store event
  eventQueue.push({
    id: generateId(),
    ts: new Date().toISOString(),
    type,
    action,
    data,
    source: source || 'cc'
  });

  // Trim queue if too large
  if (eventQueue.length > MAX_QUEUE_SIZE) {
    eventQueue.shift();
  }

  // === PERSISTENT STATE HANDLERS ===

  // Auth: set/verify password hash
  if (type === 'auth' && action === 'set') {
    ccState.auth = { hash: data.hash, setAt: new Date().toISOString() };
    saveState(ccState);
    console.log('[AUTH] Password hash stored');
  }

  // Task CRUD
  if (type === 'task') {
    if (!ccState.tasks) ccState.tasks = [];
    if (action === 'create' || action === 'add') {
      data.id = data.id || generateId();
      data.createdAt = data.createdAt || new Date().toISOString();
      ccState.tasks.push(data);
      saveState(ccState);
      console.log(`[TASK] Created: ${data.title || data.id}`);
    } else if (action === 'update') {
      const idx = ccState.tasks.findIndex(t => t.id === data.id);
      if (idx !== -1) { ccState.tasks[idx] = { ...ccState.tasks[idx], ...data }; saveState(ccState); }
    } else if (action === 'complete') {
      const idx = ccState.tasks.findIndex(t => t.id === data.id);
      if (idx !== -1) { ccState.tasks[idx] = { ...ccState.tasks[idx], ...data }; saveState(ccState); }
    }
  }

  // Activity log
  if (type === 'log' && (action === 'add' || action === 'create')) {
    if (!ccState.activityLog) ccState.activityLog = [];
    data.id = data.id || generateId();
    ccState.activityLog.push(data);
    if (ccState.activityLog.length > 500) ccState.activityLog = ccState.activityLog.slice(-500);
    saveState(ccState);
  }

  // Documents
  if (type === 'document' && (action === 'add' || action === 'create')) {
    if (!ccState.documents) ccState.documents = [];
    data.id = data.id || generateId();
    ccState.documents.push(data);
    saveState(ccState);
  }

  // Suggestions
  if (type === 'suggestions' && action === 'add') {
    if (!ccState.suggestions) ccState.suggestions = [];
    const items = Array.isArray(data) ? data : [data];
    ccState.suggestions.push(...items);
    saveState(ccState);
  }

  // Agent CRUD (Forged-OS)
  if (type === 'agent') {
    if (!ccState.agents) ccState.agents = [];
    if (action === 'create') {
      // Create agent record in state
      const agent = { id: data.id, name: data.name, model: data.model, createdAt: new Date().toISOString(), status: 'offline' };
      ccState.agents.push(agent);
      saveState(ccState);
      console.log(`[AGENT] Created: ${data.name} (${data.id})`);

      // Write config files to workspace
      if (data.files) {
        const agentDir = path.join(WORKSPACE_ROOT, 'agents', data.id);
        try {
          fsSync.mkdirSync(agentDir, { recursive: true });
          for (const [filename, content] of Object.entries(data.files)) {
            fsSync.writeFileSync(path.join(agentDir, filename), content);
          }
          console.log(`[AGENT] Wrote ${Object.keys(data.files).length} config files to ${agentDir}`);
        } catch (err) {
          console.error(`[AGENT] File write error: ${err.message}`);
        }
      }
    } else if (action === 'update') {
      const idx = ccState.agents.findIndex(a => a.id === data.id);
      if (idx !== -1) { ccState.agents[idx] = { ...ccState.agents[idx], ...data }; saveState(ccState); }
    }
  }

  // Workspace file editing (Forged-OS)
  if (type === 'workspace' && action === 'update') {
    const agentDir = path.join(WORKSPACE_ROOT, 'agents', data.agentId);
    const filePath = path.join(agentDir, data.filename);
    try {
      // Security: ensure path stays within workspace
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(WORKSPACE_ROOT)) {
        console.error(`[WORKSPACE] Path traversal blocked: ${filePath}`);
      } else {
        fsSync.mkdirSync(agentDir, { recursive: true });
        fsSync.writeFileSync(resolved, data.content);
        console.log(`[WORKSPACE] Updated: ${data.agentId}/${data.filename}`);
      }
    } catch (err) {
      console.error(`[WORKSPACE] Write error: ${err.message}`);
    }
  }

  res.json({ success: true, queued: true, timestamp: new Date().toISOString() });
});

// GET /api/poll - Command Center polls for updates
app.get('/api/poll', (req, res) => {
  const since = req.query.since || new Date(Date.now() - 3600000).toISOString();
  const sinceDate = new Date(since);

  const updates = eventQueue.filter(e => new Date(e.ts) > sinceDate);

  res.json({
    serverTime: new Date().toISOString(),
    count: updates.length,
    updates: updates.map(e => ({
      type: e.type,
      action: e.action,
      data: e.data,
      source: e.source,
      ts: e.ts
    }))
  });
});

// === NEW ENDPOINTS FOR OPENCLAW ===

// POST /api/openclaw/complete - Openclaw completes a task
app.post('/api/openclaw/complete', authenticateAPI, async (req, res) => {
  const {
    taskId,           // Required: which task was completed
    result,           // Required: text summary of what was done
    documents,        // Optional: array of generated documents
    attachments,      // Optional: array of file URLs
    nextActions,      // Optional: suggested follow-up tasks
    confidence,       // Optional: 0-100 confidence score
    timeSpent,        // Optional: seconds spent
    aiModel,          // Optional: which model was used
    error             // Optional: if partial completion/failure
  } = req.body;

  if (!taskId || !result) {
    return res.status(400).json({ error: 'taskId and result are required' });
  }

  console.log(`[OPENCLAW COMPLETE] Task ${taskId} - Confidence: ${confidence || 100}%`);

  // Create task update event
  const updateEvent = {
    id: generateId(),
    ts: new Date().toISOString(),
    type: 'task',
    action: 'complete',
    source: 'openclaw',
    data: {
      id: taskId,
      status: 'review', // Always move to Review for approval
      completedAt: new Date().toISOString(),
      aiResult: {
        summary: result,
        confidence: confidence || 100,
        model: aiModel || 'openclaw-v2',
        timeSpent: timeSpent || null,
        completedBy: 'openclaw',
        error: error || null
      },
      resultDocuments: documents || [],
      attachments: attachments || [],
      nextActions: nextActions || []
    }
  };

  eventQueue.push(updateEvent);

  // If documents were created, add them as separate events
  if (documents && documents.length > 0) {
    documents.forEach(doc => {
      eventQueue.push({
        id: generateId(),
        ts: new Date().toISOString(),
        type: 'document',
        action: 'create',
        source: 'openclaw',
        data: {
          id: doc.id || generateId(),
          title: doc.title,
          content: doc.content,
          body: doc.content,
          type: doc.type || 'deliverable',
          taskId: taskId,
          by: 'openclaw',
          source: 'openclaw',
          at: new Date().toISOString(),
          tags: ['openclaw', 'auto-generated']
        }
      });
    });
  }

  // Add activity log
  eventQueue.push({
    id: generateId(),
    ts: new Date().toISOString(),
    type: 'log',
    action: 'add',
    source: 'openclaw',
    data: {
      id: generateId(),
      ts: new Date().toISOString(),
      type: 'success',
      op: 'openclaw',
      txt: `Completed: "${result.substring(0, 60)}${result.length > 60 ? '...' : ''}"`,
      sub: error ? `⚠️ ${error}` : '✅ Ready for review',
      ico: error ? 'warning' : 'success'
    }
  });

  res.json({
    success: true,
    taskId,
    status: 'moved to review',
    documentsCreated: documents?.length || 0,
    timestamp: new Date().toISOString()
  });
});

// POST /api/openclaw/progress - Openclaw reports progress
app.post('/api/openclaw/progress', authenticateAPI, (req, res) => {
  const { taskId, status, progress, message, currentStep } = req.body;

  if (!taskId) {
    return res.status(400).json({ error: 'taskId is required' });
  }

  console.log(`[OPENCLAW PROGRESS] Task ${taskId}: ${message || 'Working...'}`);

  // Update operator status
  eventQueue.push({
    id: generateId(),
    ts: new Date().toISOString(),
    type: 'operator',
    action: 'update',
    source: 'openclaw',
    data: {
      id: 'openclaw',
      status: status || 'working',
      task: message || 'Working...',
      currentTaskId: taskId,
      progress: progress || null
    }
  });

  res.json({ success: true, logged: true });
});

// POST /api/openclaw/error - Openclaw reports error
app.post('/api/openclaw/error', authenticateAPI, (req, res) => {
  const { taskId, error, details, recoverable } = req.body;

  if (!taskId || !error) {
    return res.status(400).json({ error: 'taskId and error are required' });
  }

  console.error(`[OPENCLAW ERROR] Task ${taskId}: ${error}`);

  // Add remediation to task
  eventQueue.push({
    id: generateId(),
    ts: new Date().toISOString(),
    type: 'task',
    action: 'update',
    source: 'openclaw',
    data: {
      id: taskId,
      status: recoverable ? 'in_progress' : 'review',
      remediations: [{
        at: new Date().toISOString(),
        by: 'openclaw',
        action: 'error',
        notes: `Error: ${error}${details ? ' | ' + details : ''}`
      }]
    }
  });

  // Add error log
  eventQueue.push({
    id: generateId(),
    ts: new Date().toISOString(),
    type: 'log',
    action: 'add',
    source: 'openclaw',
    data: {
      id: generateId(),
      ts: new Date().toISOString(),
      type: 'error',
      op: 'openclaw',
      txt: `Error: ${error}`,
      sub: details || '',
      ico: 'error'
    }
  });

  res.json({ success: true, logged: true });
});

// POST /api/claude/complete - Claude Code completes a task
app.post('/api/claude/complete', authenticateAPI, (req, res) => {
  const { taskId, result, documents, confidence } = req.body;

  if (!taskId || !result) {
    return res.status(400).json({ error: 'taskId and result are required' });
  }

  console.log(`[CLAUDE COMPLETE] Task ${taskId}`);

  // Same logic as openclaw but with 'claude' as source
  eventQueue.push({
    id: generateId(),
    ts: new Date().toISOString(),
    type: 'task',
    action: 'complete',
    source: 'claude',
    data: {
      id: taskId,
      status: 'review',
      completedAt: new Date().toISOString(),
      aiResult: {
        summary: result,
        confidence: confidence || 100,
        model: 'claude-sonnet-4.5',
        completedBy: 'claude'
      },
      resultDocuments: documents || []
    }
  });

  res.json({ success: true, taskId, status: 'moved to review' });
});

// === WORKSPACE FILE API ===

// GET /api/workspace/changes?since=<ISO>&agents=clawd,soren
app.get('/api/workspace/changes', authenticateAPI, (req, res) => {
  const sinceRaw = req.query.since;
  let since = new Date(0);
  if (sinceRaw) {
    const parsed = new Date(sinceRaw);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'Invalid since timestamp' });
    }
    since = parsed;
  }

  const requestedAgents = typeof req.query.agents === 'string'
    ? req.query.agents.split(',').map(agent => agent.trim()).filter(Boolean)
    : WORKSPACE_AGENT_IDS;
  const agents = requestedAgents.filter(isValidWorkspaceAgentId);

  const changes = [];
  agents.forEach(agentId => {
    const files = listWorkspaceMarkdownFiles(agentId);
    files.forEach(file => {
      const modifiedAt = new Date(file.lastModified);
      if (modifiedAt > since) {
        changes.push({
          agentId,
          filename: file.filename,
          path: file.path,
          size: file.size,
          lastModified: file.lastModified,
        });
      }
    });
  });

  changes.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  res.json({ changes, timestamp: new Date().toISOString() });
});

// GET /api/workspace/:agentId/file?path=core/IDENTITY.md
app.get('/api/workspace/:agentId/file', authenticateAPI, (req, res) => {
  const { agentId } = req.params;
  const relativePath = req.query.path;
  const resolvedData = resolveWorkspaceFilePath(agentId, relativePath);
  if (!resolvedData) {
    return res.status(400).json({ error: 'Invalid workspace path' });
  }

  try {
    if (!fsSync.existsSync(resolvedData.resolved)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fsSync.statSync(resolvedData.resolved);
    if (!stat.isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = fsSync.readFileSync(resolvedData.resolved, 'utf8');
    res.json({
      agentId,
      filename: path.basename(resolvedData.normalizedPath),
      path: resolvedData.normalizedPath,
      content,
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/workspace/:agentId/file
app.put('/api/workspace/:agentId/file', authenticateAPI, async (req, res) => {
  const { agentId } = req.params;
  const relativePath = req.body?.path;
  const content = req.body?.content;
  const resolvedData = resolveWorkspaceFilePath(agentId, relativePath);
  if (!resolvedData) {
    return res.status(400).json({ error: 'Invalid workspace path' });
  }
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Invalid content' });
  }
  if (Buffer.byteLength(content, 'utf8') > WORKSPACE_MAX_FILE_BYTES) {
    return res.status(413).json({ error: 'File exceeds 1MB limit' });
  }

  try {
    await fs.mkdir(path.dirname(resolvedData.resolved), { recursive: true });
    await fs.writeFile(resolvedData.resolved, content, 'utf8');
    const stat = await fs.stat(resolvedData.resolved);
    appendWorkspaceAuditLog(req, 'write', {
      agentId,
      path: resolvedData.normalizedPath,
      size: stat.size,
    });
    res.json({
      success: true,
      agentId,
      filename: path.basename(resolvedData.normalizedPath),
      path: resolvedData.normalizedPath,
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
    });
  } catch (error) {
    console.error('[WORKSPACE] Write failed:', error.message);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// POST /api/workspace/:agentId/file (create only)
app.post('/api/workspace/:agentId/file', authenticateAPI, async (req, res) => {
  const { agentId } = req.params;
  const relativePath = req.body?.path;
  const content = req.body?.content || '';
  const resolvedData = resolveWorkspaceFilePath(agentId, relativePath);
  if (!resolvedData) {
    return res.status(400).json({ error: 'Invalid workspace path' });
  }
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Invalid content' });
  }
  if (Buffer.byteLength(content, 'utf8') > WORKSPACE_MAX_FILE_BYTES) {
    return res.status(413).json({ error: 'File exceeds 1MB limit' });
  }
  if (fsSync.existsSync(resolvedData.resolved)) {
    return res.status(409).json({ error: 'File already exists' });
  }

  try {
    await fs.mkdir(path.dirname(resolvedData.resolved), { recursive: true });
    await fs.writeFile(resolvedData.resolved, content, 'utf8');
    const stat = await fs.stat(resolvedData.resolved);
    appendWorkspaceAuditLog(req, 'create', {
      agentId,
      path: resolvedData.normalizedPath,
      size: stat.size,
    });
    res.status(201).json({
      success: true,
      agentId,
      filename: path.basename(resolvedData.normalizedPath),
      path: resolvedData.normalizedPath,
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create file' });
  }
});

// DELETE /api/workspace/:agentId/file?path=...
app.delete('/api/workspace/:agentId/file', authenticateAPI, async (req, res) => {
  const { agentId } = req.params;
  const relativePath = req.query.path || req.body?.path;
  const resolvedData = resolveWorkspaceFilePath(agentId, relativePath);
  if (!resolvedData) {
    return res.status(400).json({ error: 'Invalid workspace path' });
  }
  if (!fsSync.existsSync(resolvedData.resolved)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const archiveStamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveRoot = path.join(resolvedData.agentRoot, '.archive', archiveStamp);
    const archivePath = path.resolve(path.join(archiveRoot, resolvedData.normalizedPath));
    if (!isPathInsideRoot(resolvedData.agentRoot, archivePath)) {
      return res.status(403).json({ error: 'Archive path blocked' });
    }

    await fs.mkdir(path.dirname(archivePath), { recursive: true });
    await fs.rename(resolvedData.resolved, archivePath);
    appendWorkspaceAuditLog(req, 'archive', {
      agentId,
      path: resolvedData.normalizedPath,
      archivedTo: path.relative(resolvedData.agentRoot, archivePath).replace(/\\/g, '/'),
    });
    res.json({
      success: true,
      agentId,
      path: resolvedData.normalizedPath,
      archivedTo: path.relative(resolvedData.agentRoot, archivePath).replace(/\\/g, '/'),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive file' });
  }
});

// GET /api/workspace/:agentId/:filename (legacy basename route)
app.get('/api/workspace/:agentId/:filename', authenticateAPI, (req, res) => {
  const { agentId, filename } = req.params;
  if (!filename.endsWith('.md') || filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const exactPath = resolveWorkspaceFilePath(agentId, filename);
  const exactExists = Boolean(exactPath && fsSync.existsSync(exactPath.resolved))
  const matches = exactExists
    ? [{
      filename,
      path: filename,
      resolved: exactPath.resolved,
    }]
    : findWorkspaceMatchesByFilename(agentId, filename).map(match => ({
      ...match,
      resolved: resolveWorkspaceFilePath(agentId, match.path)?.resolved,
    })).filter(match => match.resolved);

  if (matches.length === 0) {
    return res.status(404).json({ error: 'File not found' });
  }
  if (matches.length > 1) {
    return res.status(409).json({
      error: 'Ambiguous filename. Use /api/workspace/:agentId/file?path=...',
      matches: matches.map(match => match.path),
    });
  }

  try {
    const target = matches[0];
    const stat = fsSync.statSync(target.resolved);
    const content = fsSync.readFileSync(target.resolved, 'utf8');
    res.json({
      agentId,
      filename: target.filename || filename,
      path: target.path || filename,
      content,
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/workspace/:agentId/:filename (legacy basename route)
app.put('/api/workspace/:agentId/:filename', authenticateAPI, async (req, res) => {
  const { agentId, filename } = req.params;
  const content = req.body?.content;
  if (!filename.endsWith('.md') || filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Invalid content' });
  }
  if (Buffer.byteLength(content, 'utf8') > WORKSPACE_MAX_FILE_BYTES) {
    return res.status(413).json({ error: 'File exceeds 1MB limit' });
  }

  const exactPath = resolveWorkspaceFilePath(agentId, filename);
  const exactExists = Boolean(exactPath && fsSync.existsSync(exactPath.resolved));
  const matches = exactExists ? [{
    filename,
    path: filename,
    resolved: exactPath.resolved,
  }] : findWorkspaceMatchesByFilename(agentId, filename).map(match => ({
    ...match,
    resolved: resolveWorkspaceFilePath(agentId, match.path)?.resolved,
  })).filter(match => match.resolved);

  if (matches.length > 1) {
    return res.status(409).json({
      error: 'Ambiguous filename. Use PUT /api/workspace/:agentId/file with body.path.',
      matches: matches.map(match => match.path),
    });
  }

  const target = matches[0] || {
    filename,
    path: filename,
    resolved: exactPath?.resolved,
  };

  if (!target.resolved) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  try {
    await fs.mkdir(path.dirname(target.resolved), { recursive: true });
    await fs.writeFile(target.resolved, content, 'utf8');
    const stat = await fs.stat(target.resolved);
    appendWorkspaceAuditLog(req, 'write-legacy', {
      agentId,
      path: target.path,
      size: stat.size,
    });
    res.json({
      success: true,
      agentId,
      filename: target.filename || filename,
      path: target.path || filename,
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// GET /api/workspace/:agentId — list markdown files for an agent (recursive)
app.get('/api/workspace/:agentId', authenticateAPI, (req, res) => {
  const { agentId } = req.params;
  if (!isValidWorkspaceAgentId(agentId)) {
    return res.status(400).json({ error: 'Invalid agentId' });
  }

  const rootData = resolveWorkspaceAgentRoot(agentId);
  if (!rootData || !fsSync.existsSync(rootData.agentRoot)) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  try {
    const files = listWorkspaceMarkdownFiles(agentId).map(file => ({
      filename: file.filename,
      path: file.path,
      size: file.size,
      lastModified: file.lastModified,
    }));
    res.json({ agentId, files, count: files.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === KNOWLEDGE BASE API ===
const sqlite3Module = (() => { try { return require('better-sqlite3'); } catch(e) { return null; } })();
const KB_DB = '/home/clawd/claude-comms/knowledge.db';

// GET /api/knowledge/search?q=query
app.get('/api/knowledge/search', authenticateAPI, (req, res) => {
  if (!sqlite3Module) return res.status(501).json({ error: 'SQLite not available, use kb.sh CLI' });
  const db = sqlite3Module(KB_DB, { readonly: true });
  const q = `%${req.query.q || ''}%`;
  const rows = db.prepare('SELECT id, timestamp, agent, category, tags, title, content FROM knowledge WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? ORDER BY timestamp DESC LIMIT 20').all(q, q, q);
  db.close();
  res.json({ results: rows, count: rows.length });
});

// POST /api/knowledge/add
app.post('/api/knowledge/add', authenticateAPI, (req, res) => {
  if (!sqlite3Module) return res.status(501).json({ error: 'SQLite not available, use kb.sh CLI' });
  const { agent, category, tags, title, context, content, related_files } = req.body;
  if (!agent || !category || !title || !content) return res.status(400).json({ error: 'Missing required fields' });
  const db = sqlite3Module(KB_DB);
  const result = db.prepare('INSERT INTO knowledge (timestamp, agent, category, tags, title, context, content, related_files) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(new Date().toISOString(), agent, category, tags || '', title, context || '', content, related_files || '');
  db.close();
  res.json({ success: true, id: result.lastInsertRowid });
});

// === DASHBOARD DATA ENDPOINTS ===

// Email + Finance collectors REMOVED (tokens expired, not in use)
app.get('/api/dashboard/email', (req, res) => res.json({ accounts: {}, disabled: true }));
app.get('/api/dashboard/finance', (req, res) => res.json({ holdings: [], disabled: true }));

// GET /api/calendar/events - Calendar events (alias for CalendarView)
app.get('/api/calendar/events', (req, res) => {
  try {
    const data = calendarCollector.getData();
    res.json(data || { events: [], lastPoll: null });
  } catch (err) {
    console.error('[CALENDAR:EVENTS]', err.message);
    res.json({ events: [], error: err.message });
  }
});

// POST /api/calendar/events - Create a new calendar event
app.post('/api/calendar/events', authenticateAPI, async (req, res) => {
  try {
    const result = await calendarCollector.createEvent(req.body);
    res.json(result);
  } catch (err) {
    console.error('[CALENDAR:CREATE]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/calendar/events/:uid - Update a calendar event
app.put('/api/calendar/events/:uid', authenticateAPI, async (req, res) => {
  try {
    const result = await calendarCollector.updateEvent({ ...req.body, uid: req.params.uid });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendar/events/:uid - Delete a calendar event
app.delete('/api/calendar/events/:uid', authenticateAPI, async (req, res) => {
  try {
    const result = await calendarCollector.deleteEvent(req.params.uid);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/calendars - List available calendars
app.get('/api/calendar/calendars', (req, res) => {
  try {
    res.json({ calendars: calendarCollector.getCalendars() });
  } catch (err) {
    res.json({ calendars: [], error: err.message });
  }
});

// GET /api/dashboard/calendar - Calendar collector data
app.get('/api/dashboard/calendar', (req, res) => {
  try {
    const data = calendarCollector.getData();
    res.json(data || { events: [], lastPoll: null });
  } catch (err) {
    console.error('[DASHBOARD:CALENDAR]', err.message);
    res.json({ events: [], error: err.message });
  }
});

// Ads collector REMOVED (Meta token expired since Feb 10)
app.get('/api/dashboard/ads', (req, res) => res.json({ campaigns: [], disabled: true }));

// Weather collector REMOVED (import commented out, not in use)
app.get('/api/dashboard/weather', (req, res) => res.json({ current: null, forecast: [], disabled: true }));

// Health check moved above authMiddleware (line ~55) — 2026-02-20

// GET /api/system-status - Detailed system status
let _lastSyncTime = null; // module-level tracker (null until first sync)
app.get('/api/system-status', (req, res) => {
  try {
    // Uptime
    const uptimeSec = Math.floor(process.uptime());
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const uptimeHuman = (days ? days + 'd ' : '') + hours + 'h ' + mins + 'm';

    // Memory
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1048576);
    const heapTotalMB = Math.round(mem.heapTotal / 1048576);
    const heapPercent = parseFloat(((mem.heapUsed / mem.heapTotal) * 100).toFixed(1));
    const rssMB = Math.round(mem.rss / 1048576);

    // Agents
    let agentNames = [];
    try {
      const agentsDir = '/home/clawd/.openclaw/workspace/agents/';
      agentNames = fsSync.readdirSync(agentsDir).filter(f => {
        try { return fsSync.statSync(agentsDir + f).isDirectory(); } catch { return false; }
      });
    } catch (e) { /* graceful fallback */ }

    // Last sync - try file fallback, else use module variable
    let lastSync = _lastSyncTime;
    try {
      const lsFile = '/home/clawd/sync-server/lastSync.json';
      if (fsSync.existsSync(lsFile)) {
        const data = JSON.parse(fsSync.readFileSync(lsFile, 'utf8'));
        if (data.lastSync) lastSync = new Date(data.lastSync);
      }
    } catch (e) { /* use module-level fallback */ }

    const now = new Date();
    let lastSyncISO = null;
    let lastSyncAgeSeconds = null;
    if (lastSync) {
      lastSyncISO = lastSync.toISOString();
      lastSyncAgeSeconds = Math.floor((now - lastSync) / 1000);
    }

    // Status determination (skip lastSync checks if null)
    let status = 'healthy';
    if (heapPercent > 90 || (lastSyncAgeSeconds !== null && lastSyncAgeSeconds > 600)) status = 'critical';
    else if (heapPercent > 75 || (lastSyncAgeSeconds !== null && lastSyncAgeSeconds > 300)) status = 'degraded';

    res.json({
      status,
      uptime: uptimeSec,
      uptimeHuman,
      memory: { heapUsedMB, heapTotalMB, heapPercent, rssMB },
      agents: { count: agentNames.length, names: agentNames },
      lastSync: lastSyncISO,
      lastSyncAgeSeconds,
      version: '1.0.0',
      timestamp: now.toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: 'system-status failed', message: e.message });
  }
});

// === COMMS API (Clawd ↔ Claude Code) ===
const COMMS_FILE = path.join('/home/clawd/claude-comms', 'messages.json');

function loadComms() {
  try {
    if (fsSync.existsSync(COMMS_FILE)) return JSON.parse(fsSync.readFileSync(COMMS_FILE, 'utf8'));
  } catch (e) { console.error('[COMMS] Load error:', e.message); }
  return [];
}
function saveComms(msgs) {
  fsSync.writeFileSync(COMMS_FILE, JSON.stringify(msgs, null, 2));
}

app.post('/api/comms/send', authenticateAPI, (req, res) => {
  const { from, to, message, topic } = req.body;
  if (!from || !message) return res.status(400).json({ error: 'from and message required' });
  const msgs = loadComms();
  const msg = {
    id: generateId(),
    from,
    to: to || (from === 'claude-code' ? 'clawd' : 'claude-code'),
    message,
    topic: topic || 'general',
    ts: new Date().toISOString(),
    read: false
  };
  msgs.push(msg);
  if (msgs.length > 500) msgs.splice(0, msgs.length - 500);
  saveComms(msgs);
  console.log(`[COMMS] ${msg.from} → ${msg.to}: ${message.substring(0, 80)}`);
  res.json({ ok: true, id: msg.id });

  // Auto-trigger GitHub Action when message is for claude-code
  if (msg.to === 'claude-code') {
    try {
      const ghToken = require('fs').readFileSync('/home/clawd/.github-token', 'utf8').trim();
      fetch('https://api.github.com/repos/ForgedFinancial/comm-bridge/dispatches', {
        method: 'POST',
        headers: {
          'Authorization': `token ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: 'clawd-comm',
          client_payload: {
            id: msg.id,
            message: msg.message,
            topic: msg.topic || 'general',
            from: msg.from
          }
        })
      }).then(r => {
        if (!r.ok) console.error('[COMMS] GitHub dispatch failed:', r.status);
        else console.log('[COMMS] GitHub dispatch sent for comm', msg.id);
      }).catch(err => console.error('[COMMS] GitHub dispatch error:', err.message));
    } catch (e) {
      console.error('[COMMS] GitHub dispatch setup error:', e.message);
    }
  }
});

app.get('/api/comms/messages', authenticateAPI, (req, res) => {
  const msgs = loadComms();
  const forWho = req.query.for;
  const unreadOnly = req.query.unread === 'true';
  const limit = parseInt(req.query.limit) || 50;
  let filtered = forWho ? msgs.filter(m => m.to === forWho) : msgs;
  const topic = req.query.topic;
  if (topic) filtered = filtered.filter(m => m.topic === topic);
  if (unreadOnly) filtered = filtered.filter(m => !m.read);
  res.json({ messages: filtered.slice(-limit), total: filtered.length });
});

app.post('/api/comms/read', authenticateAPI, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
  const msgs = loadComms();
  let marked = 0;
  ids.forEach(id => { const m = msgs.find(x => x.id === id); if (m) { m.read = true; marked++; } });
  saveComms(msgs);
  res.json({ ok: true, marked });
});

// GET /api/comms/session — Stand-Up session state
const SESSION_FILE = path.join('/home/clawd/claude-comms', 'session.json')

function loadSession() {
  try { return JSON.parse(fsSync.readFileSync(SESSION_FILE, 'utf8')) }
  catch { return { active: false, activatedBy: null, activatedAt: null } }
}

function saveSession(data) {
  fsSync.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2))
}

app.get('/api/comms/session', authenticateAPI, (req, res) => {
  res.json(loadSession())
})

app.post('/api/comms/session', authenticateAPI, (req, res) => {
  const { active } = req.body
  if (typeof active !== 'boolean') return res.status(400).json({ error: 'active (boolean) required' })
  const session = {
    active,
    activatedBy: active ? 'dano' : null,
    activatedAt: active ? new Date().toISOString() : null,
  }
  saveSession(session)
  console.log(`[SESSION] Agent session ${active ? 'ACTIVATED' : 'DEACTIVATED'} by dano`)
  res.json({ ok: true, session })
})

// GET /api/comms/room — Stand-Up Room messages
app.get("/api/comms/room", authenticateAPI, (req, res) => {
  const msgs = loadComms();
  const topic = req.query.topic || "standup";
  const limit = parseInt(req.query.limit) || 100;
  const since = req.query.since;
  let filtered = msgs.filter(m => m.topic === topic);
  if (since) filtered = filtered.filter(m => m.ts > since);
  res.json({ messages: filtered.slice(-limit), total: filtered.length });
});

// === KYLE ONLINE STATUS ===
const KYLE_ONLINE_FILE = '/home/clawd/claude-comms/kyle-online.json';
app.get('/api/kyle/online', authenticateAPI, (req, res) => {
  try {
    const d = JSON.parse(fsSync.readFileSync(KYLE_ONLINE_FILE, 'utf8'));
    res.json(d);
  } catch { res.json({ active: false, last_seen: null }); }
});
app.post('/api/kyle/online', authenticateAPI, (req, res) => {
  try {
    const active = req.body.active !== false;
    const data = { active, last_seen: new Date().toISOString() };
    fsSync.writeFileSync(KYLE_ONLINE_FILE, JSON.stringify(data, null, 2));
    console.log(`[KYLE] Online status: ${active}`);
    res.json({ ok: true, active });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// === ORG CHART ENDPOINTS ===

// GET /api/agents/status — All agent statuses (gateway ping + session check)
// GREEN (online) = gateway alive + active session/heartbeat
// YELLOW (idle)  = gateway alive but no active session
// RED (offline)  = gateway not responding
const AGENT_GATEWAY_PORTS = {
  clawd: 18789, soren: 18810, mason: 18830, sentinel: 18850, kyle: 18870,
};
const AGENT_STATUS_PING_TIMEOUT_MS = Number(process.env.AGENT_STATUS_PING_TIMEOUT_MS || 1000);
const AGENT_STATUS_CACHE_TTL_MS = Number(process.env.AGENT_STATUS_CACHE_TTL_MS || 2000);

let agentStatusCache = { payload: null, expiresAtMs: 0 };
function pingAgentGateway(port) {
  return new Promise((resolve) => {
    const req = require('http').get(`http://127.0.0.1:${port}/`, { timeout: AGENT_STATUS_PING_TIMEOUT_MS }, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}
app.get('/api/agents/status', authenticateAPI, async (req, res) => {
  const requestNow = Date.now();
  const forceRefresh = req.query?.refresh === '1' || req.query?.refresh === 'true';

  if (!forceRefresh && AGENT_STATUS_CACHE_TTL_MS > 0 && agentStatusCache.payload && agentStatusCache.expiresAtMs > requestNow) {
    res.set('Cache-Control', 'private, max-age=1');
    return res.json(agentStatusCache.payload);
  }
  try {
    const { AGENT_HIERARCHY } = require('./agent-hierarchy');
    const agents = {};
    for (const [id, def] of Object.entries(AGENT_HIERARCHY)) {
      agents[id] = {
        status: 'offline',
        currentTask: null,
        lastActive: null,
        model: def.isHuman ? 'Human' : def.model || null,
        gatewayAlive: false,
      };
    }

    // Ping all known agent gateways in parallel
    const pingResults = await Promise.all(
      Object.entries(AGENT_GATEWAY_PORTS).map(async ([id, port]) => {
        const alive = await pingAgentGateway(port);
        return { id, alive };
      })
    );
    for (const { id, alive } of pingResults) {
      if (agents[id]) {
        agents[id].gatewayAlive = alive;
        if (alive) agents[id].status = 'idle'; // gateway up → at least yellow
      }
    }

    // Check heartbeat files for active session indicator → green
    const heartbeatNow = Date.now();
    for (const id of Object.keys(AGENT_GATEWAY_PORTS)) {
      if (!agents[id]) continue;
      const hbFile = `/tmp/forged-daemon-${id}.heartbeat`;
      try {
        const stat = fsSync.statSync(hbFile);
        if ((heartbeatNow - stat.mtime.getTime()) < 180000) {
          agents[id].status = 'online'; // heartbeat fresh → green
          agents[id].lastActive = stat.mtime.toISOString();
        }
      } catch {}
    }

    // Also query main OpenClaw sessions (supplements gateway ping for clawd)
    try {
      const resp = await fetch('http://localhost:18789/api/sessions');
      const sessions = await resp.json();
      for (const session of (sessions?.sessions || sessions || [])) {
        const agentId = session?.agent || session?.agentId;
        if (agents[agentId] && session.status === 'running') {
          agents[agentId].status = 'online';
          agents[agentId].currentTask = session?.label || session?.description || null;
          agents[agentId].lastActive = session?.updatedAt || session?.createdAt || null;
          agents[agentId].onlineSince = session?.createdAt || null;
        }
      }
      // Clawd itself is always online if we're responding
      if (agents.clawd) agents.clawd.status = 'online';
    } catch (e) {
      if (agents.clawd) agents.clawd.status = 'online'; // we're running, so clawd is up
    }

    // Attach recent activity
    const actLog = ccState?.activityLog || [];
    for (const [id, data] of Object.entries(agents)) {
      const agentActivity = actLog.filter(entry =>
        entry?.data?.agent === id || entry?.source === id || entry?.data?.source === id
      ).slice(-5).reverse().map(entry => ({
        id: entry?.id || entry?.data?.id || 'unknown',
        action: entry?.data?.txt || entry?.data?.action || entry?.message || 'Activity',
        type: entry?.data?.type || 'info',
        timestamp: entry?.data?.ts || entry?.ts || null,
      }));
      data.recentActivity = agentActivity;
    }

    if (!forceRefresh && AGENT_STATUS_CACHE_TTL_MS > 0) {
      agentStatusCache = { payload: { agents }, expiresAtMs: Date.now() + AGENT_STATUS_CACHE_TTL_MS };
    }

    res.set('Cache-Control', 'private, max-age=1');
    res.json({ agents });
  } catch (err) {
    if (!forceRefresh && agentStatusCache.payload) {
      res.set('Cache-Control', 'private, max-age=1');
      return res.json(agentStatusCache.payload);
    }
    res.status(500).json({ error: 'Failed to fetch agent status' });
  }
});

// GET /api/agents/:id/output — Last output for a specific agent
app.get('/api/agents/:id/output', authenticateAPI, async (req, res) => {
  const agentId = req.params?.id;
  try {
    const resp = await fetch(`http://localhost:18789/api/sessions?agent=${agentId}`);
    const data = await resp.json();
    const sessions = data?.sessions || data || [];
    const latest = sessions[0];

    if (!latest) {
      return res.json({ agentId, output: null, sessionId: null, runtime: null, timestamp: null });
    }

    let output = latest?.result || latest?.output || '';
    if (!output && latest?.id) {
      try {
        const logResp = await fetch(`http://localhost:18789/api/sessions/${latest.id}/log`);
        const logData = await logResp.json();
        output = logData?.log || logData?.content || '';
      } catch (e) { /* no log available */ }
    }

    res.json({
      agentId,
      output: output || 'No output available',
      sessionId: latest?.id?.substring(0, 8) || null,
      runtime: latest?.runtime || null,
      timestamp: latest?.updatedAt || latest?.createdAt || null,
    });
  } catch (err) {
    res.json({ agentId, output: 'Agent output unavailable', sessionId: null, runtime: null, timestamp: null });
  }
});

// POST /api/tasks/notify — Webhook when task enters "new-task" column
app.post('/api/tasks/notify', authenticateAPI, async (req, res) => {
  try {
    const { title, description, priority, startTime, projectId, taskId } = req.body;
    // Store as notification
    const notificationsRoutes = require('./routes/notifications');
    const fs = require('fs').promises;
    const path = require('path');
    const DATA_FILE = path.join('/home/clawd/.openclaw/data/notifications', 'notifications.json');
    let notifications = [];
    try { notifications = JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); } catch {}
    const crypto = require('crypto');
    const notif = {
      id: `notif_${crypto.randomBytes(8).toString('hex')}`,
      title: `New Task: ${title || 'Untitled'}`,
      description: description || `Priority: ${priority || 'medium'}`,
      type: 'task',
      read: false,
      createdAt: new Date().toISOString(),
      meta: { taskId, priority, startTime, projectId },
    };
    notifications.unshift(notif);
    if (notifications.length > 200) notifications.length = 200;
    await fs.writeFile(DATA_FILE, JSON.stringify(notifications, null, 2));
    res.json({ ok: true, notification: notif });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/pipeline/state — Pipeline banner data
app.get('/api/pipeline/state', authenticateAPI, (req, res) => {
  const pipeline = ccState?.pipeline || {
    stages: [
      { agent: 'soren', name: 'Soren', task: null, status: 'idle' },
      { agent: 'mason', name: 'Mason', task: null, status: 'idle' },
      { agent: 'sentinel', name: 'Sentinel', task: null, status: 'idle' },
    ],
    context: '',
    startTime: null,
    initiator: null,
    activeConnections: [],
  };
  res.json(pipeline);
});

// POST /api/pipeline/state — Update pipeline state
app.post('/api/pipeline/state', authenticateAPI, (req, res) => {
  ccState.pipeline = req.body;
  saveState(ccState);
  res.json({ ok: true });
});

// GET /api/agents/:id/activity — Recent activity for a specific agent
app.get('/api/agents/:id/activity', authenticateAPI, (req, res) => {
  const agentId = req.params.id;
  const log = ccState?.activityLog || [];
  const filtered = log.filter(entry =>
    entry?.data?.agent === agentId ||
    entry?.source === agentId ||
    entry?.data?.source === agentId
  ).slice(-10).reverse();
  res.json({ agentId, activity: filtered });
});

// GET /api/agents/:id/logs — List daily log files for an agent
app.get('/api/agents/:id/logs', authenticateAPI, (req, res) => {
  const agentId = req.params.id;
  const memoryDir = path.join(WORKSPACE_ROOT, 'agents', agentId, 'memory');
  if (!fsSync.existsSync(memoryDir)) {
    return res.json({ agentId, logs: [] });
  }
  try {
    const files = fsSync.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
    const result = files.map(f => {
      const stat = fsSync.statSync(path.join(memoryDir, f));
      return { filename: f, size: stat.size, lastModified: stat.mtime.toISOString() };
    }).sort((a, b) => b.filename.localeCompare(a.filename));
    res.json({ agentId, logs: result });
  } catch (err) {
    res.json({ agentId, logs: [] });
  }
});

// GET /api/agents/:id/logs/:filename — Read a specific daily log
app.get('/api/agents/:id/logs/:filename', authenticateAPI, (req, res) => {
  const { id: agentId, filename } = req.params;
  if (!filename.endsWith('.md') || filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filePath = path.join(WORKSPACE_ROOT, 'agents', agentId, 'memory', filename);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    return res.status(403).json({ error: 'Path traversal blocked' });
  }
  try {
    if (!fsSync.existsSync(resolved)) {
      return res.status(404).json({ error: 'Log not found' });
    }
    const content = fsSync.readFileSync(resolved, 'utf8');
    res.json({ agentId, filename, content, lastModified: fsSync.statSync(resolved).mtime.toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET / - Serve Command Center UI
// Serve mac-bridge installer (no auth — public download for Mac setup)
app.get('/mac-bridge.js', (req, res) => {
  const fs = require('fs');
  const filePath = '/home/clawd/sync-server/mac-bridge/mac-bridge.js';
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.setHeader('Content-Type', 'text/javascript');
  res.send(fs.readFileSync(filePath, 'utf8'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'cc', 'index.html'));
});

// ── Stub routes (prevent frontend 404 crashes) ──
app.get('/api/contacts/follow-up-queue', authenticateAPI, (req, res) => {
  res.json([]);
});

app.get('/api/contacts/:contactId/activity', authenticateAPI, (req, res) => {
  res.json([]);
});

app.post('/api/dial', authenticateAPI, (req, res) => {
  res.json({ ok: true, message: 'Dial request received — use Twilio routes for actual calling' });
});

app.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: true });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ ok: true, token: 'session' });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ ok: true });
});

// === ERROR HANDLERS ===

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      'GET /api/cc-state',
      'POST /api/cc-state',
      'GET /api/poll',
      'GET /api/workspace/changes?since=...',
      'GET /api/workspace/:agentId',
      'GET /api/workspace/:agentId/file?path=...',
      'GET /api/workspace/:agentId/:filename',
      'PUT /api/workspace/:agentId/file',
      'PUT /api/workspace/:agentId/:filename',
      'GET /api/dashboard/email',
      'GET /api/dashboard/finance',
      'GET /api/dashboard/calendar',
      'GET /api/dashboard/ads',
      'GET /api/dashboard/weather',
      'POST /api/push',
      'POST /api/openclaw/complete',
      'POST /api/openclaw/progress',
      'POST /api/openclaw/error',
      'POST /api/claude/complete'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Use Let's Encrypt cert if available, fallback to self-signed
const LE_CERT_PATH = '/etc/letsencrypt/live/api.forgedfinancial.us';
const sslOptions = fsSync.existsSync(LE_CERT_PATH + '/fullchain.pem') ? {
  key: fsSync.readFileSync(LE_CERT_PATH + '/privkey.pem'),
  cert: fsSync.readFileSync(LE_CERT_PATH + '/fullchain.pem')
} : {
  key: fsSync.readFileSync(path.join(__dirname, "server.key")),
  cert: fsSync.readFileSync(path.join(__dirname, "server.cert"))
};

// === START SERVER ===
const httpsServer = https.createServer(sslOptions, app);
const opsWss = initOpsWebSocket(httpsServer);
app.set('opsWss', opsWss);

httpsServer.listen(PORT, () => {
  console.log('');
  console.log('✅ Command Center API Server Started');
  console.log('=====================================');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
  console.log(`📋 Ready for webhook calls from Openclaw/Claude`);
  console.log(`📡 Ops WS: wss://<host>/ops`);
  console.log('');


  // Start data collectors
  console.log('📊 Starting data collectors...');
  try {
    // Email, Finance, Ads collectors REMOVED — tokens expired, not in use
    calendarCollector.start();
    console.log('   ✓ Calendar collector started');

    // weatherCollector.start(); // REMOVED
    console.log('   ✓ Weather collector started');

    console.log('📊 Active collectors running (email/finance/ads disabled)');
  } catch (err) {
    console.error('⚠️  Collector startup error:', err.message);
    console.log('   Dashboard endpoints will return empty data');
  }
});
