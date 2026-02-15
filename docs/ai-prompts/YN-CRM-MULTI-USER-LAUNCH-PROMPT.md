# YN-CRM MULTI-USER LAUNCH READINESS PROMPTS

> **Context:** You are about to launch YN-CRM to multiple insurance agents on the same team. These prompts catch multi-user issues that single-user testing never reveals — cross-agent data leaks, credential theft, resource hogging, and infrastructure gaps.
>
> **Usage:** Paste any prompt below into your executive agent. Each is a self-contained one-liner (with full context). The agent will fix-and-loop until pass.

---

## CODEBASE & CONFIG (referenced by all prompts below)

```
WORKERS:    C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\
FRONTEND:   C:\Users\danie\OneDrive\Desktop\YN-CRM\index.html
SCHEMA:     C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\api\schema.sql

CLOUDFLARE_ACCOUNT_ID: bbaba6c44b7b5d3bba84ca01f4d38d02
D1_DATABASE_ID: b2ae86e6-cc42-431a-80f9-f17e82379119

WORKER URLS:
  API:        https://yncrm-api.danielruh.workers.dev
  SMS:        https://yncrm-sms.danielruh.workers.dev
  Calendar:   https://yncrm-calendar.danielruh.workers.dev
  iMessage:   https://yncrm-imsg.danielruh.workers.dev
  Automation: https://yncrm-automation.danielruh.workers.dev
```

---

# PROMPT 1 — FIX LAUNCH BLOCKERS

> **When to use:** BEFORE giving any agent access. These 6 issues will cause data breaches, crashes, or abuse on day one.

```
You are preparing YN-CRM for multi-user production launch. Fix ALL 6 launch blockers below. Do NOT stop until every one is resolved. After each fix, verify it works, then move to the next. Loop until 6/6 pass.

CODEBASE: C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\
FRONTEND: C:\Users\danie\OneDrive\Desktop\YN-CRM\index.html

## BLOCKER 1: SMS WORKER CREDENTIAL THEFT [CRITICAL]
File: workers/sms/worker.js — handleSend() function
Problem: The /send endpoint accepts `agent_id` from the request body and uses that agent's Twilio credentials to send SMS. Since the SMS worker only checks X-Worker-Auth (worker-to-worker secret), the frontend calls go through the API worker which forwards to SMS. BUT — the API worker passes the agent_id from the authenticated JWT, so the REAL vulnerability is: if the frontend ever calls the SMS worker directly (bypassing the API worker), or if the automation worker passes a wrong agent_id, Agent A's Twilio credentials get used for Agent B's messages.

Fix: In handleSend() of sms/worker.js, the agent_id MUST come from a verified source. Since only authenticated workers (with X-Worker-Auth) can call /send, the agent_id in the request body is trusted as long as the calling worker extracted it from a verified JWT. VERIFY this chain is unbroken:
1. Frontend sends SMS request to API worker with JWT token
2. API worker verifies JWT, extracts agent.id
3. API worker forwards to SMS worker with X-Worker-Auth header AND the verified agent_id
4. SMS worker ONLY accepts requests with valid X-Worker-Auth

CHECK: Does the frontend EVER call the SMS worker directly (not through the API)? Search index.html for "yncrm-sms" or the SMS worker URL. If yes, that's the vulnerability — remove direct SMS worker calls from frontend, force all SMS through the API worker.

Also CHECK: In the automation worker, when it sends SMS, does it use the correct agent_id from the database (not from user input)? Read the automation worker's SMS sending code and verify.

## BLOCKER 2: CALENDAR WORKER MISSING D1 BINDING [CRITICAL]
File: workers/calendar/wrangler.toml
Problem: The calendar worker code may reference env.DB for syncing events to the database, but the wrangler.toml may not have a [[d1_databases]] binding. This means calendar sync will crash at runtime.

Fix: Open workers/calendar/wrangler.toml. If there is NO [[d1_databases]] section, add:
```toml
[[d1_databases]]
binding = "DB"
database_name = "yncrm-db"
database_id = "b2ae86e6-cc42-431a-80f9-f17e82379119"
```
Then redeploy: `cd workers/calendar && wrangler deploy`

Also check: Does the calendar worker code actually USE env.DB anywhere? If not, the binding is still good to have for future calendar event storage.

## BLOCKER 3: iMESSAGE WORKER KV NOT BOUND [CRITICAL]
File: workers/imsg/wrangler.toml
Problem: The iMessage worker code references env.IMSG_CONFIG (a KV namespace) for storing relay configuration, but the wrangler.toml likely doesn't have it bound.

Fix: Create a KV namespace and bind it:
```bash
wrangler kv namespace create "IMSG_CONFIG" --name yncrm-imsg
```
Then add to workers/imsg/wrangler.toml:
```toml
[[kv_namespaces]]
binding = "IMSG_CONFIG"
id = "<the-id-from-the-command-above>"
```
Redeploy: `cd workers/imsg && wrangler deploy`

Also add D1 binding if the iMessage worker needs to persist received messages to the database:
```toml
[[d1_databases]]
binding = "DB"
database_name = "yncrm-db"
database_id = "b2ae86e6-cc42-431a-80f9-f17e82379119"
```

## BLOCKER 4: file:// IN CORS ALLOWLIST [CRITICAL]
Files: ALL 5 worker files (api, sms, calendar, imsg, automation)
Problem: Every worker has `'file://'` in the ALLOWED_ORIGINS array. This means ANY local HTML file on ANY computer can make authenticated API calls.

Fix: In EVERY worker file, find the ALLOWED_ORIGINS array and REMOVE the `'file://'` entry. Only keep actual production and development origins:
```js
const ALLOWED_ORIGINS = [
  'https://yncrm.pages.dev',
  'https://yn-crm.pages.dev',
  'http://localhost:3000',
  'http://localhost:8788'
];
```
Redeploy ALL workers after this change.

## BLOCKER 5: HARDCODED ACCESS CODE IN FRONTEND [HIGH]
File: index.html (search for 'YN123$' or 'VALID_ACCESS_CODE')
Problem: The frontend JavaScript has the signup access code hardcoded. Anyone who right-clicks → View Source can see it and sign up.

Fix: REMOVE the client-side access code validation entirely. Let the backend (api/worker.js) be the ONLY place that checks the access code. The frontend should just pass whatever the user types to the API and display the error if the API rejects it:
```js
// REMOVE this:
// const VALID_ACCESS_CODE = 'YN123$';
// if (accessCode !== VALID_ACCESS_CODE) { ... }

// KEEP this — just send to API and let API validate:
const response = await fetch(`${API_URL}/auth/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, name, phone, access_code: accessCode })
});
const data = await response.json();
if (!data.success) {
  errorEl.textContent = data.error;
  return;
}
```

## BLOCKER 6: NO RATE LIMITING [CRITICAL]
Files: workers/api/worker.js (primary), all workers (secondary)
Problem: Zero rate limiting. One agent (or attacker) can:
- Brute-force login (unlimited attempts)
- Create 100,000 leads in a loop
- Send 10,000 SMS burning through Twilio credits
- DoS the entire platform for all agents

Fix: Implement rate limiting on the API worker at minimum. Use Cloudflare KV for tracking:

1. Create KV namespace:
```bash
wrangler kv namespace create "RATE_LIMIT" --name yncrm-api
```

2. Add to api/wrangler.toml:
```toml
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "<id-from-command>"
```

3. Add rate limit middleware at the TOP of the fetch handler in api/worker.js:
```js
// Rate limiting
const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

async function checkRateLimit(env, key, maxRequests, windowSeconds) {
  if (!env.RATE_LIMIT) return true; // Skip if KV not bound
  const current = parseInt(await env.RATE_LIMIT.get(key) || '0');
  if (current >= maxRequests) return false;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: windowSeconds });
  return true;
}

// Apply limits:
// Auth endpoints: 10 per minute
if (path.startsWith('/auth/')) {
  if (!await checkRateLimit(env, `auth:${clientIP}`, 10, 60)) {
    return jsonResponse({ error: 'Too many requests. Try again in 1 minute.' }, 429, corsHeaders);
  }
}
// SMS send: 30 per hour per agent
if (path === '/send') {
  const agentKey = agent ? `sms:${agent.id}` : `sms:${clientIP}`;
  if (!await checkRateLimit(env, agentKey, 30, 3600)) {
    return jsonResponse({ error: 'SMS rate limit reached. Max 30 per hour.' }, 429, corsHeaders);
  }
}
// All other endpoints: 200 per minute per IP
if (!await checkRateLimit(env, `api:${clientIP}`, 200, 60)) {
  return jsonResponse({ error: 'Rate limit exceeded' }, 429, corsHeaders);
}
```

4. Redeploy: `cd workers/api && wrangler deploy`

## REPORTING
After fixing all 6, report:
✅/❌ Blocker 1: SMS credential chain verified
✅/❌ Blocker 2: Calendar worker D1 binding added
✅/❌ Blocker 3: iMessage worker KV + D1 binding added
✅/❌ Blocker 4: file:// removed from all CORS allowlists
✅/❌ Blocker 5: Frontend access code hardcode removed
✅/❌ Blocker 6: Rate limiting implemented and deployed
```

---

# PROMPT 2 — MULTI-USER SMOKE TEST

> **When to use:** After launch blockers are fixed. Simulates two real agents using the platform simultaneously.

```
Run a full multi-user smoke test on YN-CRM. Create two test agents and verify they can operate independently without interfering with each other. Fix anything that breaks. Loop until all tests pass.

API: https://yncrm-api.danielruh.workers.dev
ACCESS_CODE: (use the value set in env.ACCESS_CODE via wrangler secret)

## SETUP: Create 2 test agents
1. POST /auth/signup → Agent A (email: test-agent-a@yncrm.test, password: TestPass123!)
2. POST /auth/signup → Agent B (email: test-agent-b@yncrm.test, password: TestPass456!)
3. POST /auth/login for each → save both JWT tokens as TOKEN_A and TOKEN_B

## TEST 1: LEAD ISOLATION
- As Agent A: POST /leads → create lead "Alice Customer" with phone "+1111111111"
- As Agent B: POST /leads → create lead "Bob Customer" with phone "+2222222222"
- As Agent A: GET /leads → MUST only see "Alice Customer", MUST NOT see "Bob Customer"
- As Agent B: GET /leads → MUST only see "Bob Customer", MUST NOT see "Alice Customer"
→ FAIL if either agent sees the other's leads.

## TEST 2: CROSS-AGENT UPDATE BLOCK
- As Agent A: capture lead_id of "Alice Customer"
- As Agent B: PUT /leads/{alice_lead_id} with body { "name": "HACKED" } using TOKEN_B
→ MUST return 404 or 403 (Agent B cannot update Agent A's lead)
- As Agent A: GET /leads/{alice_lead_id} → name MUST still be "Alice Customer"
→ FAIL if Agent B was able to modify Agent A's lead.

## TEST 3: CROSS-AGENT DELETE BLOCK
- As Agent B: DELETE /leads/{alice_lead_id} using TOKEN_B
→ MUST return 404 or 403
- As Agent A: GET /leads/{alice_lead_id} → MUST still exist
→ FAIL if Agent B deleted Agent A's lead.

## TEST 4: EVENT ISOLATION
- As Agent A: POST /events → create event "Meeting with Alice" at 2025-03-01T10:00:00
- As Agent B: GET /events → MUST NOT see "Meeting with Alice"
- As Agent A: GET /events → MUST see "Meeting with Alice"
→ FAIL if events leak between agents.

## TEST 5: MESSAGE ISOLATION
- As Agent A: POST /messages → create message body "Hello Alice" to lead_id of Alice
- As Agent B: GET /messages → MUST NOT see "Hello Alice"
→ FAIL if messages leak between agents.

## TEST 6: SETTINGS ISOLATION
- As Agent A: PUT /settings with { "twilio_sid": "AC_FAKE_A", "twilio_token": "TOKEN_A_FAKE" }
- As Agent B: GET /settings → MUST NOT see Agent A's Twilio credentials
- As Agent B: PUT /settings with { "twilio_sid": "AC_FAKE_B" }
- As Agent A: GET /settings → twilio_sid MUST still be "AC_FAKE_A"
→ FAIL if credentials leak between agents.

## TEST 7: SYNC ISOLATION
- As Agent A: POST /sync with { "leads": [{ "id": "sync-test-a", "name": "Sync Lead A" }] }
- As Agent B: GET /leads → MUST NOT see "Sync Lead A"
→ FAIL if sync crosses agent boundaries.

## TEST 8: AUTOMATION ISOLATION
- As Agent A: POST /automations → create automation "Auto A"
- As Agent B: GET /automations → MUST NOT see "Auto A"
→ FAIL if automations leak between agents.

## TEST 9: CONCURRENT OPERATIONS
- Simultaneously (in parallel):
  - Agent A: POST /leads 10 times (leads A1-A10)
  - Agent B: POST /leads 10 times (leads B1-B10)
- After both finish:
  - Agent A: GET /leads → MUST have exactly 11 leads (Alice + A1-A10), zero of Agent B's
  - Agent B: GET /leads → MUST have exactly 11 leads (Bob + B1-B10), zero of Agent A's
→ FAIL if any data mixing under concurrent load.

## CLEANUP
- Delete all test leads, events, messages, automations for both agents
- DELETE the two test agent accounts from D1 directly if a delete endpoint exists, otherwise leave them

## REPORTING
Pass: X/9 tests
If ANY test fails: identify the endpoint, read the handler code, fix the SQL query or auth check, redeploy, re-run ALL 9 tests. Loop until 9/9.
```

---

# PROMPT 3 — CROSS-AGENT PENETRATION TEST

> **When to use:** After smoke test passes. Actively tries to break agent boundaries.

```
You are a security auditor for YN-CRM. Your job is to BREAK cross-agent data isolation. Try every attack vector below. If ANY attack succeeds, fix the vulnerability immediately, redeploy, and re-run ALL attacks. Loop until 0 attacks succeed.

API: https://yncrm-api.danielruh.workers.dev
CODEBASE: C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\

Create 2 agents (attacker = Agent X, victim = Agent Y). Create test data for Agent Y.

## ATTACK 1: DIRECT ID GUESSING
As Agent X, try to access Agent Y's resources by guessing IDs:
- GET /leads/{agent_y_lead_id} with TOKEN_X → must return 404
- PUT /leads/{agent_y_lead_id} with TOKEN_X → must return 404
- DELETE /leads/{agent_y_lead_id} with TOKEN_X → must return 404
- GET /events?lead_id={agent_y_lead_id} with TOKEN_X → must return empty array
- GET /messages?lead_id={agent_y_lead_id} with TOKEN_X → must return empty array

## ATTACK 2: BULK OPERATIONS
As Agent X:
- POST /leads/bulk-delete with { "ids": [agent_y_lead_id_1, agent_y_lead_id_2] } → must NOT delete Agent Y's leads
- POST /leads/import with leads that have Agent Y's existing lead IDs → must NOT overwrite Agent Y's data

## ATTACK 3: SYNC HIJACK
As Agent X:
- POST /sync with { "leads": [{ "id": "{agent_y_lead_id}", "name": "HIJACKED" }] } using TOKEN_X
- As Agent Y: GET /leads/{agent_y_lead_id} → name must NOT be "HIJACKED"

## ATTACK 4: FORGED JWT
Craft a JWT with Agent Y's agent ID but signed with a wrong secret:
- Build token: header={"alg":"HS256"}, payload={"sub":"agent_y_id","exp":9999999999999}
- Sign with "wrong-secret" instead of the real JWT_SECRET
- GET /leads with this forged token → must return 401

## ATTACK 5: EXPIRED TOKEN REUSE
- Login as Agent X, get token
- Manually modify the token's exp field to a past timestamp
- GET /leads with expired token → must return 401

## ATTACK 6: SMS WORKER DIRECT CALL (if accessible)
Try calling the SMS worker directly from outside:
- POST https://yncrm-sms.danielruh.workers.dev/send with { "agent_id": "agent_y_id", "to": "+1234567890", "body": "stolen" }
  - Without X-Worker-Auth header → must return 401
  - With wrong X-Worker-Auth value → must return 401

## ATTACK 7: CALENDAR WORKER DIRECT CALL
- POST https://yncrm-calendar.danielruh.workers.dev/icloud-connect with { "apple_id": "test", "app_password": "test" }
  - Without X-Worker-Auth header → must return 401

## ATTACK 8: IMESSAGE WORKER DIRECT CALL
- POST https://yncrm-imsg.danielruh.workers.dev/send with { "relay_url": "http://evil.com", "to": "+1", "message": "test" }
  - Without X-Worker-Auth header → must return 401

## ATTACK 9: SQL INJECTION ATTEMPT
As Agent X, try these payloads:
- POST /leads with { "name": "'; DROP TABLE leads; --" } → must not crash, must create lead with that literal name
- GET /leads?stage=' OR 1=1 -- → must return only Agent X's leads (parameterized query protection)
- POST /auth/login with { "email": "' OR 1=1 --", "password": "x" } → must return 401

## ATTACK 10: MASS REQUEST (Rate Limit Test)
As Agent X, send 100 rapid-fire requests to:
- POST /auth/login (wrong password) → should get 429 after ~10 attempts
- POST /leads (valid data) → should get 429 after ~200 in a minute
If rate limiting is NOT active, implement it before continuing.

## REPORTING
Attacks blocked: X/10
If ANY attack succeeds: read the vulnerable code, fix it, redeploy, re-run ALL 10 attacks.
Only report when 10/10 attacks are blocked.
```

---

# PROMPT 4 — INFRASTRUCTURE & WRANGLER READINESS

> **When to use:** Final check before giving agents the URL.

```
Verify the Cloudflare infrastructure is production-ready for multi-user YN-CRM. Check every item. Fix anything missing. Loop until all pass.

WORKERS DIR: C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\
ACCOUNT_ID: bbaba6c44b7b5d3bba84ca01f4d38d02
D1_DATABASE_ID: b2ae86e6-cc42-431a-80f9-f17e82379119

## CHECK 1: WRANGLER.TOML BINDINGS (all 5 workers)
For EACH worker (api, sms, calendar, imsg, automation), read wrangler.toml and verify:

API worker must have:
- [[d1_databases]] binding = "DB", database_id = "b2ae86e6-cc42-431a-80f9-f17e82379119"
- [[kv_namespaces]] binding = "RATE_LIMIT" (for rate limiting)

SMS worker must have:
- [[d1_databases]] binding = "DB", same database_id

Calendar worker must have:
- [[d1_databases]] binding = "DB", same database_id

iMessage worker must have:
- [[d1_databases]] binding = "DB", same database_id
- [[kv_namespaces]] binding = "IMSG_CONFIG"

Automation worker must have:
- [[d1_databases]] binding = "DB", same database_id
- [triggers] crons = ["*/1 * * * *"]

→ If ANY binding is missing, add it to the wrangler.toml and redeploy that worker.

## CHECK 2: SECRETS SET
Run these commands to verify secrets exist (they'll error if not set):
```
wrangler secret list --name yncrm-api
wrangler secret list --name yncrm-sms
wrangler secret list --name yncrm-calendar
wrangler secret list --name yncrm-imsg
wrangler secret list --name yncrm-automation
```

Required secrets:
- yncrm-api: JWT_SECRET, ACCESS_CODE, WORKER_SECRET
- yncrm-sms: WORKER_SECRET
- yncrm-calendar: WORKER_SECRET
- yncrm-imsg: WORKER_SECRET
- yncrm-automation: WORKER_SECRET, GOOGLE_API_KEY

→ If any secret is missing, prompt the user to set it with `wrangler secret put`.

## CHECK 3: CORS ALLOWLIST (no file://)
Read EVERY worker.js file. The ALLOWED_ORIGINS array must NOT contain 'file://'. Only these are acceptable:
- https://yncrm.pages.dev
- https://yn-crm.pages.dev
- http://localhost:3000 (ok for dev, remove before true production)
- http://localhost:8788 (ok for dev, remove before true production)

→ If file:// is found, remove it and redeploy.

## CHECK 4: WORKER HEALTH
Hit every /health endpoint:
- curl https://yncrm-api.danielruh.workers.dev/health → 200 + "healthy"
- curl https://yncrm-sms.danielruh.workers.dev/health → 200 + "healthy"
- curl https://yncrm-calendar.danielruh.workers.dev/health → 200 + "healthy"
- curl https://yncrm-imsg.danielruh.workers.dev/health → 200 + "healthy"
- curl https://yncrm-automation.danielruh.workers.dev/health → 200 + "healthy"

→ If any fails, read the worker code, find the error, fix, redeploy.

## CHECK 5: DATABASE SCHEMA
Execute against D1:
```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```
Must return 7 tables: activities, agents, automations, drip_sources, events, leads, messages

Check indexes:
```sql
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';
```
Must include: idx_leads_agent, idx_events_agent, idx_messages_agent, idx_activities_agent, idx_leads_stage, idx_leads_pipeline, idx_events_start, idx_messages_lead, idx_activities_lead

→ If any table or index is missing, run schema.sql against D1.

## CHECK 6: FRONTEND DEPLOYMENT
- Verify the frontend is accessible at https://yncrm.pages.dev (or https://yn-crm.pages.dev)
- Verify it loads without JavaScript errors
- Verify the signup form works and calls the correct API URL
- Verify the login form works and stores the JWT token
- Verify the API_URL constant in index.html points to https://yncrm-api.danielruh.workers.dev

→ If frontend is not deployed, it needs to be uploaded to Cloudflare Pages.

## CHECK 7: NO HARDCODED SECRETS IN SOURCE
Search ALL source files for:
- 'YN123$' (old access code) → must not exist in any worker file
- 'yncrm-jwt-secret' (old JWT secret) → must not exist
- Any Twilio SID/token literals
- Any Google API key literals (like 'AIzaSyD...')
- Any password strings

→ If any hardcoded secret found, replace with env variable reference.

## REPORTING
✅/❌ Check 1: All wrangler.toml bindings present
✅/❌ Check 2: All secrets set
✅/❌ Check 3: CORS clean (no file://)
✅/❌ Check 4: All 5 workers healthy
✅/❌ Check 5: Schema complete (7 tables, all indexes)
✅/❌ Check 6: Frontend deployed and functional
✅/❌ Check 7: No hardcoded secrets

Fix ALL failures. Loop until 7/7 pass.

When all pass, report: "🟢 INFRASTRUCTURE READY — YN-CRM cleared for multi-user launch."
```

---

# PROMPT 5 — THE ONE-LINER (paste after ANY build)

> **When to use:** After every single build, update, feature, or hotfix. This is your "did I break multi-user?" safety net.

```
Run a rapid multi-user integrity check on YN-CRM. You have 7 checks. Fix anything broken. Do not report until 7/7 pass.

Workers: C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\
Frontend: C:\Users\danie\OneDrive\Desktop\YN-CRM\index.html

1. HEALTH — Hit /health on all 5 workers. All must return 200.
2. AUTH — POST /auth/login with valid creds → token. GET /auth/me with token → user. GET /leads without token → 401.
3. ISOLATION — Create 2 test agents. Agent A creates a lead. Agent B GET /leads must NOT see it. Agent B PUT/DELETE Agent A's lead must fail.
4. CORS — Read all 5 worker files. ALLOWED_ORIGINS must NOT contain 'file://'. Must NOT contain '*'.
5. SECRETS — Search all worker files and index.html for hardcoded passwords, JWT secrets, access codes, or API keys. Must find ZERO.
6. AUTH GATES — POST to /send on SMS worker without X-Worker-Auth → must get 401. Same for calendar /icloud-connect and imsg /send.
7. RATE LIMIT — Send 15 rapid POST /auth/login attempts with wrong password to API worker. Must get 429 before all 15 complete. If no rate limiting exists, implement it.

Fix every failure. Re-run from check 1 after any fix. Report only when 7/7 pass in a single clean sweep.
```

---

# QUICK REFERENCE

| Prompt | Name | When | Time |
|--------|------|------|------|
| **1** | Fix Launch Blockers | Before ANY agents get access | 30-60 min |
| **2** | Multi-User Smoke Test | After blockers fixed | 15-20 min |
| **3** | Cross-Agent Penetration Test | After smoke test passes | 20-30 min |
| **4** | Infrastructure Readiness | Final pre-launch check | 10-15 min |
| **5** | The One-Liner | After EVERY build/update | 5-10 min |

**Launch sequence: 1 → 2 → 3 → 4 → GO LIVE → 5 (after every update)**
