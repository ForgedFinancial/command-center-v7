# YN-CRM EXECUTIVE REPAIR PROMPT

> **Purpose:** Hand this entire document to an executive agent. The agent will systematically diagnose and fix every issue found in the YN-CRM Structural Integrity Scan (0/7 categories passing, 70+ issues). Every fix includes the exact file, line number, broken code, and replacement code.

---

## ROLE

You are the **Executive Repair Agent** for the YN-CRM platform. Your job is to systematically fix every issue listed below. Work through each phase in order. Do NOT skip ahead. After each fix, verify it compiles and doesn't break other functionality. When all phases are complete, deploy and verify.

---

## CODEBASE LOCATIONS

| Component | Path |
|-----------|------|
| API Worker | `C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\api\worker.js` (763 lines) |
| Automation Worker | `C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\automation\worker.js` (519 lines) |
| SMS Worker | `C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\sms\worker.js` (487 lines) |
| Calendar Worker | `C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\calendar\worker.js` (595 lines) |
| iMessage Worker | `C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\imsg\worker.js` (323 lines) |
| Database Schema | `C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\api\schema.sql` (128 lines) |
| Frontend SPA | `C:\Users\danie\OneDrive\Desktop\YN-CRM\index.html` (10,994 lines) |

## CLOUDFLARE DEPLOYMENT CONFIG

```
CLOUDFLARE_ACCOUNT_ID: bbaba6c44b7b5d3bba84ca01f4d38d02
CLOUDFLARE_API_TOKEN: wfcXVeTThiyilbb-Fa8svpTJAGCUkazlUdcXAuEY
D1_DATABASE_ID: b2ae86e6-cc42-431a-80f9-f17e82379119
D1_DATABASE_NAME: yncrm-db

Worker URLs:
  API:        https://yncrm-api.danielruh.workers.dev
  Automation: https://yncrm-automation.danielruh.workers.dev
  SMS:        https://yncrm-sms.danielruh.workers.dev
  Calendar:   https://yncrm-calendar.danielruh.workers.dev
  iMessage:   https://yncrm-imsg.danielruh.workers.dev
```

---

# PHASE 1: CRITICAL SECURITY FIXES

> These are active vulnerabilities. Fix ALL of these before moving to Phase 2.

---

## FIX 1.1 — Hardcoded JWT Secret [CRITICAL]

**File:** `api/worker.js` — Line 34
**Problem:** JWT secret is hardcoded in source code. Anyone who reads the code can forge auth tokens.

**Current code (line 34):**
```js
const JWT_SECRET = 'yncrm-jwt-secret-change-in-production';
```

**Fix:** Remove the hardcoded constant. Use Cloudflare Worker environment variable instead.

**Replace line 34 with:**
```js
// JWT_SECRET is now read from env in each function that needs it
```

**Then update every function that references `JWT_SECRET` to accept `env` and use `env.JWT_SECRET`:**

1. `hashPassword(password)` at line 190 → change signature to `hashPassword(password, env)` and replace `JWT_SECRET` with `env.JWT_SECRET`
2. `createJWT(agent)` at line 197 → change signature to `createJWT(agent, env)` and replace `JWT_SECRET` with `env.JWT_SECRET`
3. `handleSignup` at line 241 → update calls: `hashPassword(password, env)` and `createJWT(user, env)`
4. `handleLogin` at line 271 → update calls: `hashPassword(password, env)` and `createJWT(agent, env)`

**After fixing, set the secret in Cloudflare:**
```bash
wrangler secret put JWT_SECRET --name yncrm-api
# Enter a strong random string (64+ characters)
```

---

## FIX 1.2 — Wildcard CORS on ALL Workers [CRITICAL]

**Problem:** Every single worker has `'Access-Control-Allow-Origin': '*'` which allows ANY website to call your API.

**Files & Lines:**
- `api/worker.js` line 37
- `sms/worker.js` line 17
- `calendar/worker.js` line 19
- `imsg/worker.js` line 18
- `automation/worker.js` line 19

**Current code (same in all 5 workers):**
```js
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  ...
};
```

**Fix:** Replace with a dynamic origin check in each worker. Add this function at the top of each worker file and update corsHeaders to be a function:

```js
const ALLOWED_ORIGINS = [
  'https://yncrm.danielruh.workers.dev',
  'https://yn-crm.pages.dev',
  'http://localhost:3000',
  'http://localhost:8788'
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Worker-Auth',
    'Access-Control-Allow-Credentials': 'true',
  };
}
```

**Then update every `jsonResponse` function to accept `request` and pass the dynamic headers.** Alternatively, store `corsHeaders` per-request at the top of the `fetch()` handler:
```js
async fetch(request, env, ctx) {
  const corsHeaders = getCorsHeaders(request);
  // ... rest of handler uses corsHeaders as before
}
```

**Update the ALLOWED_ORIGINS array with your actual production domain(s).**

---

## FIX 1.3 — Hardcoded Access Code [CRITICAL]

**File:** `api/worker.js` — Line 239
**Problem:** Signup access code is hardcoded as `YN123$`. Anyone reading the code can sign up.

**Current code (line 239):**
```js
const VALID_ACCESS_CODE = 'YN123$';
```

**Fix:** Move to environment variable.

**Replace line 239 with:**
```js
// ACCESS_CODE is read from env.ACCESS_CODE
```

**Update `handleSignup` (line 241) to use `env.ACCESS_CODE`:**
```js
async function handleSignup(request, env) {
  const { email, password, name, phone, access_code } = await request.json();

  if (!access_code || access_code !== env.ACCESS_CODE) {
    return jsonResponse({ error: 'Invalid access code' }, 403);
  }
  // ... rest unchanged
}
```

**Set it in Cloudflare:**
```bash
wrangler secret put ACCESS_CODE --name yncrm-api
# Enter a strong access code
```

---

## FIX 1.4 — No Auth on SMS / Calendar / iMessage Workers [CRITICAL]

**Problem:** The SMS, Calendar, and iMessage workers have ZERO authentication. Anyone can call `/send` on the SMS worker and send texts using your Twilio account. Anyone can call the calendar worker and read/write events.

**Fix:** Add a shared secret header check to each worker. The API worker (which IS authenticated via JWT) will include this secret when calling the other workers.

**Add this to the TOP of each worker (sms, calendar, imsg):**
```js
function authenticateWorker(request, env) {
  const authHeader = request.headers.get('X-Worker-Auth');
  if (!authHeader || authHeader !== env.WORKER_SECRET) {
    return false;
  }
  return true;
}
```

**Then wrap each POST handler with the auth check. Example for SMS worker `handleSend`:**
```js
if (path === '/send' && request.method === 'POST') {
  if (!authenticateWorker(request, env)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  return await handleSend(request, env);
}
```

**EXCEPTION:** The Twilio webhook endpoints (`/webhook`, `/status-callback` in SMS worker) must remain open because Twilio calls them. But add Twilio signature validation:
```js
// For /webhook and /status-callback, validate Twilio signature instead:
const twilioSignature = request.headers.get('X-Twilio-Signature');
// Implement Twilio request validation
```

**Set the shared secret:**
```bash
wrangler secret put WORKER_SECRET --name yncrm-sms
wrangler secret put WORKER_SECRET --name yncrm-calendar
wrangler secret put WORKER_SECRET --name yncrm-imsg
wrangler secret put WORKER_SECRET --name yncrm-automation
```

**Update the automation worker** (which calls SMS and calendar workers) to include the header:
```js
await fetch(`${SMS_WORKER_URL}/send`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Worker-Auth': env.WORKER_SECRET  // ADD THIS
  },
  body: JSON.stringify({...})
});
```

---

## FIX 1.5 — JWT Verification Does Not Check Signature [CRITICAL]

**File:** `api/worker.js` — Lines 216-231
**Problem:** The `authenticate()` function decodes the JWT payload but NEVER verifies the HMAC signature. An attacker can craft a fake token with any agent ID and it will be accepted as long as `exp` is in the future.

**Current code (lines 216-231):**
```js
async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const [headerB64, payloadB64, sigB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));

    if (payload.exp < Date.now()) return null;

    const result = await env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(payload.sub).first();
    return result;
  } catch {
    return null;
  }
}
```

**Replace with proper HMAC-SHA256 verification:**
```js
async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const [headerB64, payloadB64, sigB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(env.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    // Decode the signature (reverse the URL-safe base64)
    const sigString = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    const sigPadded = sigString + '='.repeat((4 - sigString.length % 4) % 4);
    const sigBytes = Uint8Array.from(atob(sigPadded), c => c.charCodeAt(0));

    const valid = await crypto.subtle.verify(
      'HMAC', key, sigBytes, encoder.encode(`${headerB64}.${payloadB64}`)
    );

    if (!valid) return null;

    // Decode payload
    const payloadPadded = payloadB64 + '='.repeat((4 - payloadB64.length % 4) % 4);
    const payload = JSON.parse(atob(payloadPadded));

    if (payload.exp < Date.now()) return null;

    const result = await env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(payload.sub).first();
    return result;
  } catch {
    return null;
  }
}
```

---

## FIX 1.6 — Weak Password Hashing (SHA-256) [HIGH]

**File:** `api/worker.js` — Lines 190-195
**Problem:** Passwords are hashed with a single round of SHA-256 using the JWT secret as salt. This is trivially brute-forceable.

**Current code:**
```js
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + JWT_SECRET);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}
```

**Replace with PBKDF2 (available in Cloudflare Workers via Web Crypto):**
```js
async function hashPassword(password, env) {
  const encoder = new TextEncoder();
  const salt = encoder.encode(env.JWT_SECRET + 'yncrm-salt');

  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );

  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}
```

**WARNING:** Changing the hash algorithm will invalidate all existing passwords. You need a migration strategy:
1. Add a `password_version` column to the agents table
2. On login, if `password_version` is NULL/0, verify with old SHA-256, then re-hash with PBKDF2 and set `password_version = 1`
3. New signups always use PBKDF2

**Schema migration:**
```sql
ALTER TABLE agents ADD COLUMN password_version INTEGER DEFAULT 0;
```

---

# PHASE 2: CRITICAL FUNCTIONAL FIXES

> These are broken features that prevent the CRM from working correctly.

---

## FIX 2.1 — Google Sheets Polling is DEAD [CRITICAL]

**File:** `automation/worker.js` — Lines 226-240
**Problem:** The `fetchGoogleSheet()` function has a placeholder API key `AIzaSyD...` and literally returns `null` on line 239. The entire drip-in lead feature is non-functional.

**Current code:**
```js
async function fetchGoogleSheet(sheetUrl) {
  const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(sheetUrl);
  if (!match) return null;

  const sheetId = match[1];
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:Z?key=AIzaSyD...`;

  console.log('Sheet polling: Would fetch', sheetId);
  return null;  // <--- DEAD CODE
}
```

**Replace with working implementation using env variable for API key:**
```js
async function fetchGoogleSheet(sheetUrl, env) {
  const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(sheetUrl);
  if (!match) return null;

  const sheetId = match[1];

  if (!env.GOOGLE_API_KEY) {
    console.error('GOOGLE_API_KEY not configured');
    return null;
  }

  try {
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:Z?key=${env.GOOGLE_API_KEY}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(`Google Sheets API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('Google Sheets fetch error:', err.message);
    return null;
  }
}
```

**Update the call site in `pollGoogleSheets()` (line 156):**
```js
const sheetData = await fetchGoogleSheet(source.sheet_url, env);
```

**Set the API key:**
```bash
wrangler secret put GOOGLE_API_KEY --name yncrm-automation
# Enter your Google Sheets API key
```

---

## FIX 2.2 — Lead Deletion Does NOT Cascade [CRITICAL]

**File:** `api/worker.js` — Lines 439-441
**Problem:** When a lead is deleted, orphaned messages, events, and activities remain in the database. While the schema has `ON DELETE SET NULL` for FK references, the API code does a direct delete without cleaning up.

**Current code:**
```js
async function deleteLead(id, agent, env) {
  await env.DB.prepare('DELETE FROM leads WHERE id = ? AND agent_id = ?').bind(id, agent.id).run();
  return jsonResponse({ success: true });
}
```

**Replace with cascade cleanup:**
```js
async function deleteLead(id, agent, env) {
  // Verify the lead belongs to this agent first
  const lead = await env.DB.prepare('SELECT id FROM leads WHERE id = ? AND agent_id = ?').bind(id, agent.id).first();
  if (!lead) {
    return jsonResponse({ error: 'Lead not found' }, 404);
  }

  // Delete related records first (messages, activities, events linked to this lead)
  await env.DB.prepare('DELETE FROM messages WHERE lead_id = ? AND agent_id = ?').bind(id, agent.id).run();
  await env.DB.prepare('DELETE FROM activities WHERE lead_id = ? AND agent_id = ?').bind(id, agent.id).run();
  // For events, set lead_id to NULL instead of deleting (events may be on calendar)
  await env.DB.prepare('UPDATE events SET lead_id = NULL WHERE lead_id = ? AND agent_id = ?').bind(id, agent.id).run();

  // Now delete the lead
  await env.DB.prepare('DELETE FROM leads WHERE id = ? AND agent_id = ?').bind(id, agent.id).run();

  // Log the deletion
  await env.DB.prepare(
    'INSERT INTO activities (id, agent_id, lead_id, type, description) VALUES (?, ?, NULL, ?, ?)'
  ).bind(generateId(), agent.id, 'lead_deleted', `Lead ${id} deleted`).run();

  return jsonResponse({ success: true });
}
```

**Also fix `bulkDeleteLeads` (line 444) the same way** — loop through IDs and clean up related records before bulk delete.

---

## FIX 2.3 — 3-Way Sync Race Condition [CRITICAL]

**File:** `index.html` — Around lines 5700-5730
**Problem:** The frontend's `saveState()` writes to localStorage, then IndexedDB, then cloud with a 2-second debounced delay. If two tabs are open, or the user makes rapid changes, data can be lost or overwritten because there's no version counter or conflict resolution.

**Fix:** Add a version counter to the state object and implement last-write-wins with version check.

**In the frontend's `saveState()` function, add:**
```js
function saveState() {
  // Increment version on every save
  state._version = (state._version || 0) + 1;
  state._lastModified = Date.now();

  // Save to localStorage
  try {
    localStorage.setItem('nickcrm_state', JSON.stringify(state));
  } catch (e) {
    console.error('localStorage save failed:', e);
  }

  // Save to IndexedDB (async)
  saveToIndexedDB(state);

  // Debounced cloud sync with version check
  clearTimeout(window._cloudSyncTimer);
  window._cloudSyncTimer = setTimeout(async () => {
    try {
      const currentVersion = state._version;
      const response = await syncToCloud(state);
      if (response && response.conflict) {
        // Cloud has newer data — merge instead of overwrite
        console.warn('Sync conflict detected, merging...');
        await mergeCloudData(response.cloudData);
      }
    } catch (e) {
      console.error('Cloud sync failed:', e);
    }
  }, 2000);
}
```

**The key principle:** Every save increments `_version`. Cloud sync sends the version. If the cloud has a higher version, pull and merge before pushing.

---

## FIX 2.4 — Missing `filterCalendarList*()` Functions [CRITICAL]

**File:** `index.html` — Around lines 8084-8095
**Problem:** The HTML references `filterCalendarListAll()`, `filterCalendarListUpcoming()`, and `filterCalendarListPast()` in onclick handlers, but these functions are never defined in the JavaScript. Clicking these filters throws a ReferenceError.

**Fix:** Find the calendar list section in the frontend and implement the three filter functions:

```js
function filterCalendarListAll() {
  const items = document.querySelectorAll('.calendar-list-item');
  items.forEach(item => item.style.display = '');
  updateCalendarFilterButtons('all');
}

function filterCalendarListUpcoming() {
  const now = new Date();
  const items = document.querySelectorAll('.calendar-list-item');
  items.forEach(item => {
    const startTime = new Date(item.dataset.startTime);
    item.style.display = startTime >= now ? '' : 'none';
  });
  updateCalendarFilterButtons('upcoming');
}

function filterCalendarListPast() {
  const now = new Date();
  const items = document.querySelectorAll('.calendar-list-item');
  items.forEach(item => {
    const startTime = new Date(item.dataset.startTime);
    item.style.display = startTime < now ? '' : 'none';
  });
  updateCalendarFilterButtons('past');
}

function updateCalendarFilterButtons(active) {
  document.querySelectorAll('.calendar-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === active);
  });
}
```

**Make sure each `.calendar-list-item` has a `data-start-time` attribute set when rendered.**

---

## FIX 2.5 — Syntax Error (Backslash vs Forward Slash) [CRITICAL]

**File:** `index.html` — Around line 6953
**Problem:** There is a reported syntax error where a backslash `\` is used instead of a forward slash `/` in a path or regex. This may cause silent failures.

**Action:** Search the frontend file for any lone backslashes in string contexts. Look specifically around line 6953. The most likely culprit is a file path or regex. Replace `\` with `/` where appropriate.

```
Search for: backslash characters in JavaScript string literals
Common fix: Replace '\\path\\to' with '/path/to'
```

---

# PHASE 3: HIGH PRIORITY FIXES

> These affect security, performance, and user experience.

---

## FIX 3.1 — Add Rate Limiting to API [HIGH]

**File:** `api/worker.js`
**Problem:** No rate limiting on any endpoint. An attacker can brute-force login, spam signups, or DDoS the API.

**Fix:** Add rate limiting using Cloudflare's built-in tools. The simplest approach for Workers:

```js
// Add at the top of the fetch handler, after CORS check
const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
const rateLimitKey = `rate:${clientIP}:${path}`;

// Use KV or a simple in-memory approach (KV is more reliable)
if (env.RATE_LIMIT) {
  const current = parseInt(await env.RATE_LIMIT.get(rateLimitKey) || '0');
  if (current > 60) { // 60 requests per minute per IP per endpoint
    return jsonResponse({ error: 'Rate limit exceeded' }, 429);
  }
  await env.RATE_LIMIT.put(rateLimitKey, String(current + 1), { expirationTtl: 60 });
}
```

**Add a KV namespace binding in wrangler.toml:**
```toml
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "your-kv-namespace-id"
```

**Stricter limits for auth endpoints:**
- `/auth/login`: 5 per minute per IP
- `/auth/signup`: 3 per minute per IP
- All other endpoints: 60 per minute per IP

---

## FIX 3.2 — Add Input Validation / Sanitization [HIGH]

**File:** `api/worker.js`
**Problem:** No input validation beyond checking if fields exist. SQL injection is mitigated by parameterized queries, but there's no validation of email format, phone format, string lengths, or data types.

**Fix:** Add a validation helper and use it in every handler:

```js
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/[\s()-]/g, ''));
}

function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
}

function validateLeadData(data) {
  const errors = [];
  if (!data.name || data.name.trim().length === 0) errors.push('Name is required');
  if (data.name && data.name.length > 200) errors.push('Name too long (max 200)');
  if (data.email && !validateEmail(data.email)) errors.push('Invalid email format');
  if (data.phone && !validatePhone(data.phone)) errors.push('Invalid phone format');
  if (data.value && (typeof data.value !== 'number' || data.value < 0)) errors.push('Invalid value');
  return errors;
}
```

**Apply validation in `createLead`, `updateLead`, `handleSignup`, `handleLogin`, and `importLeads`.**

---

## FIX 3.3 — O(n²) Client Filtering in Frontend [HIGH]

**File:** `index.html`
**Problem:** The frontend filters clients with nested loops or repeated DOM queries, causing lag with large datasets.

**Fix:** Replace linear scans with indexed lookups. Pre-build index maps:

```js
// Build once, update on data change
let clientsByStage = {};
let clientsByPipeline = {};

function rebuildClientIndexes() {
  clientsByStage = {};
  clientsByPipeline = {};
  for (const client of state.clients) {
    const stage = client.stage || 'new_lead';
    const pipeline = client.pipeline || 'new';
    if (!clientsByStage[stage]) clientsByStage[stage] = [];
    if (!clientsByPipeline[pipeline]) clientsByPipeline[pipeline] = [];
    clientsByStage[stage].push(client);
    clientsByPipeline[pipeline].push(client);
  }
}
```

**Call `rebuildClientIndexes()` after any state change. Use the indexes in filter/render functions instead of `.filter()` on the full array.**

---

## FIX 3.4 — Add Loading States to UI [HIGH]

**File:** `index.html`
**Problem:** When data is loading from the cloud, the UI shows nothing — no spinner, no skeleton, no feedback. Users think the app is broken.

**Fix:** Add a global loading overlay and per-section loading states:

```js
function showLoading(containerId, message = 'Loading...') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

function hideLoading(containerId) {
  const el = document.querySelector(`#${containerId} .loading-state`);
  if (el) el.remove();
}
```

**Add CSS for the spinner and use `showLoading()` before every async operation (cloud sync, API calls, calendar fetch).**

---

## FIX 3.5 — Add Empty States to UI [HIGH]

**File:** `index.html`
**Problem:** When a list has zero items (no leads, no events, no messages), the UI shows a blank void. Users don't know if data is missing or the feature is broken.

**Fix:** After every render function, check if the list is empty and show a helpful message:

```js
function renderEmptyState(containerId, icon, title, subtitle) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(subtitle)}</p>
    </div>
  `;
}
```

**Example usage in the leads list:**
```js
if (filteredLeads.length === 0) {
  renderEmptyState('leads-container', '📋', 'No leads yet', 'Add your first lead to get started');
  return;
}
```

---

## FIX 3.6 — Add Toast Feedback for User Actions [HIGH]

**File:** `index.html`
**Problem:** When users perform actions (save lead, delete lead, sync calendar), there's no visible confirmation. Users don't know if the action succeeded.

**Fix:** Add a toast notification system:

```js
function showToast(message, type = 'success', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
```

**Add CSS:**
```css
.toast {
  position: fixed; bottom: 20px; right: 20px;
  padding: 12px 24px; border-radius: 8px;
  color: white; font-weight: 500; z-index: 10000;
  transform: translateY(100px); opacity: 0;
  transition: all 0.3s ease;
}
.toast.show { transform: translateY(0); opacity: 1; }
.toast-success { background: #10b981; }
.toast-error { background: #ef4444; }
.toast-warning { background: #f59e0b; }
```

**Use after every user action:** `showToast('Lead saved successfully')`, `showToast('Failed to delete', 'error')`, etc.

---

## FIX 3.7 — Audit XSS Vulnerabilities [HIGH]

**File:** `index.html`
**Problem:** There is an `escapeHTML()` function defined around line 6094, but it may not be used everywhere user-generated content is rendered.

**Fix:** Search the entire frontend for places where data is injected into HTML WITHOUT `escapeHTML()`:

```
Search for patterns like:
  innerHTML = `...${variable}...`
  innerHTML = '...' + variable + '...'
  .insertAdjacentHTML('...', variable)
```

**Every instance where user data (lead name, notes, email, phone, tags, custom fields) is rendered into the DOM MUST go through `escapeHTML()`.** Common missed spots:
- Lead names in Kanban cards
- Notes in lead detail view
- Tag names
- Custom field values
- SMS message body in message list
- Activity descriptions

---

## FIX 3.8 — Memory Leaks from Event Listeners [HIGH]

**File:** `index.html`
**Problem:** When views are re-rendered, old event listeners are not cleaned up. Each re-render adds NEW listeners without removing old ones, causing memory leaks and duplicate action firing.

**Fix:** Use event delegation instead of per-element listeners:

```js
// Instead of:
document.querySelectorAll('.delete-btn').forEach(btn => {
  btn.addEventListener('click', () => deleteLead(btn.dataset.id));
});

// Use delegation on a stable parent:
document.getElementById('leads-container').addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('.delete-btn');
  if (deleteBtn) {
    deleteLead(deleteBtn.dataset.id);
  }
});
```

**Set up delegation listeners ONCE during initialization, not on every render.**

---

# PHASE 4: MEDIUM PRIORITY FIXES

---

## FIX 4.1 — Add Global Error Handler [MEDIUM]

**File:** `index.html`
**Problem:** Unhandled errors crash silently. Users see nothing.

**Fix:**
```js
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
  showToast('Something went wrong. Please refresh.', 'error', 5000);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showToast('Network error. Please check your connection.', 'error', 5000);
});
```

---

## FIX 4.2 — Add Retry Logic for Failed API Calls [MEDIUM]

**File:** `index.html`
**Problem:** If a cloud API call fails, it fails silently with no retry.

**Fix:**
```js
async function apiCall(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return await response.json();
      if (response.status >= 500 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
        continue;
      }
      throw new Error(`API error: ${response.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

---

## FIX 4.3 — Google & Microsoft Calendar Stubs [MEDIUM]

**File:** `calendar/worker.js` — Lines 65-78
**Problem:** Google and Microsoft calendar endpoints return 501 "coming soon." These should either be removed from the UI or properly implemented.

**Fix (short term):** Update the frontend to hide Google/Microsoft calendar options in the UI until they're implemented. Add a "Coming Soon" badge to the settings UI.

**Fix (long term):** Implement Google Calendar using OAuth2 + Google Calendar API, and Microsoft Calendar using Microsoft Graph API. This is a major feature — create a separate prompt for it.

---

## FIX 4.4 — iMessage Receive Doesn't Persist to Database [MEDIUM]

**File:** `imsg/worker.js` — Lines 177-194
**Problem:** The `handleReceive()` function just logs incoming iMessages and returns success. It does NOT save them to the database.

**Current code:**
```js
async function handleReceive(data, env) {
  const { from, message, timestamp, guid, chatGuid, attachments } = data;
  console.log('Received iMessage:', { from, message: message?.substring(0, 50), timestamp });
  // Here you would typically: 1. Store the message 2. Trigger webhook 3. Run automations
  return jsonResponse({ success: true, received: true, ... });
}
```

**Replace with:**
```js
async function handleReceive(data, env) {
  const { from, message, timestamp, guid, chatGuid, attachments, agent_id } = data;

  console.log('Received iMessage:', { from, message: message?.substring(0, 50), timestamp });

  if (env.DB && agent_id) {
    // Find lead by phone/email
    const lead = await env.DB.prepare(
      'SELECT id FROM leads WHERE agent_id = ? AND (phone = ? OR email = ?)'
    ).bind(agent_id, from || '', from || '').first();

    // Store as message
    const messageId = generateUUID();
    await env.DB.prepare(`
      INSERT INTO messages (id, agent_id, lead_id, direction, from_number, to_number, body, status)
      VALUES (?, ?, ?, 'inbound', ?, NULL, ?, 'received')
    `).bind(messageId, agent_id, lead?.id || null, from, message || '').run();

    // Log activity
    await env.DB.prepare(`
      INSERT INTO activities (id, agent_id, lead_id, type, description)
      VALUES (?, ?, ?, 'imessage_received', ?)
    `).bind(generateUUID(), agent_id, lead?.id || null, `iMessage from ${from}: ${(message || '').substring(0, 50)}`).run();
  }

  return jsonResponse({ success: true, received: true, messageId: guid, timestamp: new Date().toISOString() });
}
```

**NOTE:** The iMessage worker needs a D1 binding in its wrangler.toml:
```toml
[[d1_databases]]
binding = "DB"
database_name = "yncrm-db"
database_id = "b2ae86e6-cc42-431a-80f9-f17e82379119"
```

---

## FIX 4.5 — Add Pagination for Large Datasets [MEDIUM]

**File:** `index.html` and `api/worker.js`
**Problem:** The frontend loads ALL leads at once. With hundreds of leads, this causes performance issues.

**Fix (API):** The API already supports `limit` and `offset` params (line 342-343 in api/worker.js). Good.

**Fix (Frontend):** Add pagination controls to the leads list:
```js
let currentPage = 0;
const PAGE_SIZE = 50;

async function loadLeadsPage(page = 0) {
  const offset = page * PAGE_SIZE;
  const response = await apiCall(`${API_URL}/leads?limit=${PAGE_SIZE}&offset=${offset}`);
  renderLeads(response.leads);
  renderPagination(page, response.count);
}
```

---

# PHASE 5: DEPLOY & VERIFY

> After all code fixes are made, deploy and verify.

---

## 5.1 — Set All Environment Secrets

```bash
# API Worker
wrangler secret put JWT_SECRET --name yncrm-api
wrangler secret put ACCESS_CODE --name yncrm-api

# All workers that communicate with each other
wrangler secret put WORKER_SECRET --name yncrm-api
wrangler secret put WORKER_SECRET --name yncrm-sms
wrangler secret put WORKER_SECRET --name yncrm-calendar
wrangler secret put WORKER_SECRET --name yncrm-imsg
wrangler secret put WORKER_SECRET --name yncrm-automation

# Automation worker
wrangler secret put GOOGLE_API_KEY --name yncrm-automation
```

## 5.2 — Run Database Migrations

```bash
wrangler d1 execute yncrm-db --command "ALTER TABLE agents ADD COLUMN password_version INTEGER DEFAULT 0;"
```

## 5.3 — Deploy Each Worker

```bash
cd workers/api && wrangler deploy
cd workers/automation && wrangler deploy
cd workers/sms && wrangler deploy
cd workers/calendar && wrangler deploy
cd workers/imsg && wrangler deploy
```

## 5.4 — Verify Each Fix

Run these curl commands after deployment:

```bash
# 1. Health check all workers
curl https://yncrm-api.danielruh.workers.dev/health
curl https://yncrm-sms.danielruh.workers.dev/health
curl https://yncrm-calendar.danielruh.workers.dev/health
curl https://yncrm-imsg.danielruh.workers.dev/health
curl https://yncrm-automation.danielruh.workers.dev/health

# 2. Verify CORS rejects unknown origins
curl -H "Origin: https://evil.com" https://yncrm-api.danielruh.workers.dev/health -v
# Should NOT see Access-Control-Allow-Origin: https://evil.com

# 3. Verify SMS worker rejects unauthenticated requests
curl -X POST https://yncrm-sms.danielruh.workers.dev/send \
  -H "Content-Type: application/json" \
  -d '{"to":"+1234567890","body":"test"}'
# Should return 401

# 4. Verify JWT verification works
curl https://yncrm-api.danielruh.workers.dev/leads \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIiwiZXhwIjo5OTk5OTk5OTk5OTk5fQ.fake"
# Should return 401 (forged token rejected)

# 5. Test signup with old access code fails
curl -X POST https://yncrm-api.danielruh.workers.dev/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test","access_code":"YN123$"}'
# Should return 403

# 6. Verify rate limiting
for i in $(seq 1 70); do curl -s https://yncrm-api.danielruh.workers.dev/health > /dev/null; done
# Last requests should return 429
```

## 5.5 — Frontend Verification Checklist

Open the frontend in a browser and verify:

- [ ] Calendar filter buttons (All / Upcoming / Past) work without console errors
- [ ] Deleting a lead also removes associated messages and activities
- [ ] Loading spinner appears during data fetch
- [ ] Empty states appear when no leads / no events / no messages
- [ ] Toast notifications appear on save, delete, sync actions
- [ ] No console errors related to undefined functions
- [ ] Rapid saves don't cause data loss (test with two tabs)
- [ ] XSS test: Create a lead with name `<script>alert('xss')</script>` — should display as text, not execute

---

## SUMMARY

| Phase | Fixes | Severity |
|-------|-------|----------|
| Phase 1 | 6 fixes | CRITICAL security |
| Phase 2 | 5 fixes | CRITICAL functional |
| Phase 3 | 8 fixes | HIGH priority |
| Phase 4 | 5 fixes | MEDIUM priority |
| Phase 5 | Deploy & verify | — |
| **Total** | **24 fix groups** | **70+ individual issues** |

**Execute in order. Do not skip phases. Verify after each phase before proceeding.**
