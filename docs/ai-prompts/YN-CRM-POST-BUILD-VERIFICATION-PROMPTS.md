# YN-CRM POST-BUILD VERIFICATION PROMPTS

> **Usage:** Paste one (or all) of these prompts AFTER any build, update, or feature addition. The agent will run a full operational verification pass and fix anything that's broken — looping until everything passes at 100%.

---

## HOW TO USE

After your executive agent finishes a build or update, append one of these prompts:

- **PROMPT A** — Full-stack verification (run after major builds)
- **PROMPT B** — API & worker connectivity check (run after backend changes)
- **PROMPT C** — Frontend integrity check (run after UI changes)
- **PROMPT D** — Security regression check (run after any code change)
- **PROMPT E** — Data integrity & sync check (run after DB or sync changes)
- **PROMPT F** — The "Nuclear" full sweep (run before any production release)

---

# PROMPT A — FULL-STACK OPERATIONAL VERIFICATION

```
You just finished building/updating the YN-CRM platform. Now run a FULL operational verification. Do NOT report back until EVERY check passes. If something fails, fix it immediately and re-run the check. Loop until 100%.

## CODEBASE
- Workers: C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\
- Frontend: C:\Users\danie\OneDrive\Desktop\YN-CRM\index.html
- Schema: C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\api\schema.sql

## CLOUDFLARE
- Account ID: bbaba6c44b7b5d3bba84ca01f4d38d02
- API Token: wfcXVeTThiyilbb-Fa8svpTJAGCUkazlUdcXAuEY
- D1 Database: b2ae86e6-cc42-431a-80f9-f17e82379119

## CHECKS TO RUN (fix failures immediately, re-check until pass)

### 1. WORKER HEALTH (all 5 must return 200 + "healthy")
- curl https://yncrm-api.danielruh.workers.dev/health
- curl https://yncrm-sms.danielruh.workers.dev/health
- curl https://yncrm-calendar.danielruh.workers.dev/health
- curl https://yncrm-imsg.danielruh.workers.dev/health
- curl https://yncrm-automation.danielruh.workers.dev/health
→ If ANY returns non-200 or error: read the worker file, find the bug, fix it, redeploy, re-check.

### 2. API AUTH FLOW (signup → login → token → protected route)
- POST /auth/signup with valid access code → must return token
- POST /auth/login with those credentials → must return token
- GET /auth/me with that token → must return user object
- GET /leads with that token → must return leads array (even if empty)
- GET /leads WITHOUT token → must return 401
→ If ANY step fails: trace the auth flow in api/worker.js, fix the broken link, redeploy, re-check.

### 3. CRUD OPERATIONS (create → read → update → delete for each entity)
For LEADS:
- POST /leads → create test lead → must return { success: true, id }
- GET /leads/:id → must return the lead you just created
- PUT /leads/:id → update the name → must return { success: true }
- GET /leads/:id → verify name changed
- DELETE /leads/:id → must return { success: true }
- GET /leads/:id → must return 404

For EVENTS:
- POST /events → create test event → must return { success: true, id }
- GET /events → must include the event
- PUT /events/:id → update title → verify
- DELETE /events/:id → must return { success: true }

For MESSAGES:
- POST /messages → create test message → must return { success: true, id }
- GET /messages → must include the message

For AUTOMATIONS:
- POST /automations → create test automation → must return { success: true, id }
- GET /automations → must include it
- PUT /automations/:id → toggle enabled → verify
- DELETE /automations/:id → must succeed

→ If ANY CRUD operation fails: read the handler function, check the SQL query, check the DB schema, fix, redeploy, re-check.

### 4. INTER-WORKER CONNECTIVITY
- API worker calls SMS worker: simulate by having automation worker trigger an SMS send → must not return auth error or network error
- API worker calls Calendar worker: simulate iCloud connect → must get response (even if credentials are wrong, should get structured error not network failure)
- Automation worker cron: POST /run on automation worker → must execute without throwing
→ If workers can't reach each other: check worker URLs, check WORKER_SECRET env vars match across workers, fix, redeploy, re-check.

### 5. DATABASE INTEGRITY
- Run: SELECT COUNT(*) FROM agents
- Run: SELECT COUNT(*) FROM leads
- Run: SELECT COUNT(*) FROM events
- Run: SELECT COUNT(*) FROM messages
- Run: SELECT COUNT(*) FROM automations
- Run: SELECT COUNT(*) FROM drip_sources
- Run: SELECT COUNT(*) FROM activities
→ All queries must execute without error. If any table is missing, re-run schema.sql against D1.

### 6. FRONTEND LOADS WITHOUT ERRORS
- Open index.html in a browser (or read the file and verify):
  - No undefined function references
  - No syntax errors
  - All view render functions exist (renderDashboard, renderKanban, renderContacts, renderCalendar, renderSettings)
  - escapeHTML() function exists
  - saveState() and loadState() functions exist
  - Cloud sync functions exist and point to correct API URL
→ If any function is missing or broken: implement it, verify no console errors.

### 7. CASCADE DELETE VERIFICATION
- Create a test lead
- Create a message linked to that lead
- Create an activity linked to that lead
- Create an event linked to that lead
- Delete the lead
- Verify: messages for that lead are gone or nulled
- Verify: activities for that lead are gone or nulled
- Verify: events for that lead have lead_id = NULL
→ If orphaned records remain: fix deleteLead() in api/worker.js to cascade properly.

## REPORTING FORMAT
After ALL checks pass, report:
✅ Worker Health: 5/5 passing
✅ Auth Flow: signup → login → token → protected routes all working
✅ CRUD: leads, events, messages, automations all create/read/update/delete
✅ Inter-Worker: API↔SMS, API↔Calendar, Automation cron all connected
✅ Database: 7 tables verified, all queries execute
✅ Frontend: loads clean, no undefined references, all views render
✅ Cascade Delete: no orphaned records

If you had to fix anything, list what you fixed at the bottom.
```

---

# PROMPT B — API & WORKER CONNECTIVITY CHECK

```
Run a quick connectivity and response check on all YN-CRM Cloudflare Workers. Fix anything broken. Loop until all pass.

Workers:
- https://yncrm-api.danielruh.workers.dev
- https://yncrm-sms.danielruh.workers.dev
- https://yncrm-calendar.danielruh.workers.dev
- https://yncrm-imsg.danielruh.workers.dev
- https://yncrm-automation.danielruh.workers.dev

Codebase: C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\

For EACH worker:
1. Hit /health → must return 200 with JSON containing "status": "healthy"
2. Hit a non-existent route like /doesnotexist → must return 404 (not 500 or crash)
3. Send OPTIONS request → must return proper CORS headers
4. Send POST to a protected endpoint without auth → must return 401 or 403 (not 500)

If ANY worker:
- Returns 500 → read the worker.js, find the error, fix it, wrangler deploy, re-test
- Times out → check if the worker is deployed, check wrangler.toml config
- Returns wrong CORS headers → fix getCorsHeaders() or corsHeaders object
- Accepts unauthenticated requests to protected endpoints → add auth check

Also verify inter-worker calls work:
- Automation worker can reach SMS worker (check URL constant and WORKER_SECRET)
- Automation worker can reach Calendar worker (check URL constant)
- All workers share the same D1 database binding (database_id: b2ae86e6-cc42-431a-80f9-f17e82379119)

Report format:
✅/❌ yncrm-api: health, 404 handling, CORS, auth guard
✅/❌ yncrm-sms: health, 404 handling, CORS, auth guard
✅/❌ yncrm-calendar: health, 404 handling, CORS, auth guard
✅/❌ yncrm-imsg: health, 404 handling, CORS, auth guard
✅/❌ yncrm-automation: health, 404 handling, CORS, cron trigger
✅/❌ Inter-worker connectivity verified

Fix ALL failures before reporting. Loop until 100%.
```

---

# PROMPT C — FRONTEND INTEGRITY CHECK

```
Run a full frontend integrity check on the YN-CRM single-page application. Fix anything broken. Loop until all pass.

File: C:\Users\danie\OneDrive\Desktop\YN-CRM\index.html

## CHECK 1: NO JAVASCRIPT ERRORS
Read the entire file. Search for:
- References to undefined functions (function called but never defined)
- Syntax errors (unmatched brackets, missing semicolons that cause parsing failure)
- Backslash vs forward slash errors in string literals
- Variables used before declaration
Report and fix every instance found.

## CHECK 2: ALL VIEW RENDERERS EXIST
Verify these functions are defined (not just called):
- renderDashboard() or equivalent
- renderKanban() or equivalent
- renderContacts() or equivalent
- renderCalendar() or equivalent
- renderSettings() or equivalent
- filterCalendarListAll()
- filterCalendarListUpcoming()
- filterCalendarListPast()
If any is missing, implement it based on the surrounding code patterns.

## CHECK 3: DATA FLOW INTEGRITY
- saveState() exists and writes to localStorage
- loadState() exists and reads from localStorage
- IndexedDB backup functions exist
- Cloud sync function exists and calls the correct API URL (https://yncrm-api.danielruh.workers.dev)
- The sync function includes the JWT token in the Authorization header
If any link in the data flow chain is broken, fix it.

## CHECK 4: SECURITY FUNCTIONS
- escapeHTML() is defined
- escapeHTML() is used everywhere user data is injected into innerHTML
  - Search for all innerHTML assignments
  - For each one, verify user data goes through escapeHTML()
  - Fix any that don't
- No eval() calls with user data
- No document.write() with user data

## CHECK 5: EVENT LISTENERS
- No duplicate event listener registration (listeners should use delegation or be registered once)
- All onclick handlers in HTML reference functions that exist
- Modal open/close functions exist and work
If any listener references a non-existent function, fix it.

## CHECK 6: UI COMPLETENESS
- Loading states: verify showLoading/hideLoading or equivalent exists
- Empty states: verify empty list messaging exists for leads, events, messages
- Toast notifications: verify showToast or equivalent exists
- Error handling: verify window.onerror or error boundary exists
If any is missing, implement it.

Fix ALL issues. Loop until the entire file is clean. Report what you fixed.
```

---

# PROMPT D — SECURITY REGRESSION CHECK

```
Run a security regression check on the entire YN-CRM codebase. This checks that no security fix has been accidentally reverted or bypassed. Fix anything that fails. Loop until 100%.

Codebase: C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\
Frontend: C:\Users\danie\OneDrive\Desktop\YN-CRM\index.html

## CHECK EACH ITEM — FAIL = FIX IMMEDIATELY

1. JWT_SECRET: Search ALL files for hardcoded strings like 'yncrm-jwt-secret' or any JWT secret in plain text. Must use env.JWT_SECRET only.
   → If found hardcoded: replace with env.JWT_SECRET, redeploy.

2. ACCESS_CODE: Search ALL files for 'YN123$' or any hardcoded access code. Must use env.ACCESS_CODE only.
   → If found hardcoded: replace with env.ACCESS_CODE, redeploy.

3. CORS: Search ALL worker files for "'Access-Control-Allow-Origin': '*'" (wildcard). Must use domain allowlist.
   → If wildcard found: replace with getCorsHeaders() function using ALLOWED_ORIGINS array.

4. WORKER AUTH: Verify SMS, Calendar, and iMessage workers check X-Worker-Auth header on all non-webhook POST endpoints.
   → If any POST endpoint is unprotected: add authenticateWorker() check.

5. JWT VERIFICATION: Read the authenticate() function in api/worker.js. Verify it ACTUALLY checks the HMAC signature (crypto.subtle.verify), not just decodes the payload.
   → If signature verification is missing: implement it.

6. PASSWORD HASHING: Read hashPassword() in api/worker.js. Verify it uses PBKDF2 with 100000+ iterations, NOT plain SHA-256.
   → If still using SHA-256: upgrade to PBKDF2.

7. INPUT VALIDATION: Verify createLead, handleSignup, handleLogin have input validation (email format, string length limits, required fields).
   → If validation is missing: add it.

8. RATE LIMITING: Verify the API worker has rate limiting on /auth/login and /auth/signup.
   → If missing: implement it.

9. XSS: Search index.html for innerHTML assignments where user data is NOT escaped with escapeHTML().
   → If unescaped user data found: wrap it in escapeHTML().

10. SENSITIVE DATA IN LOGS: Search ALL files for console.log statements that might leak passwords, tokens, or credentials.
    → If found: remove or redact the sensitive data from logs.

Report:
✅/❌ for each of the 10 checks.
Fix ALL failures. Re-check until all 10 pass.
```

---

# PROMPT E — DATA INTEGRITY & SYNC CHECK

```
Run a data integrity and synchronization check on YN-CRM. Fix anything broken. Loop until all pass.

Database: D1 (yncrm-db), ID: b2ae86e6-cc42-431a-80f9-f17e82379119
Schema: C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\api\schema.sql
API: https://yncrm-api.danielruh.workers.dev

## CHECK 1: SCHEMA MATCHES CODE
- Read schema.sql
- Read api/worker.js
- Verify every column referenced in SQL queries in the worker actually exists in the schema
- Verify every table referenced in the worker exists in the schema
- If the code references a column that doesn't exist → either add the column to schema or fix the query

## CHECK 2: FOREIGN KEY INTEGRITY
Run these queries against D1:
- SELECT COUNT(*) FROM leads WHERE agent_id NOT IN (SELECT id FROM agents)
  → Must be 0. If not, delete orphaned leads.
- SELECT COUNT(*) FROM events WHERE agent_id NOT IN (SELECT id FROM agents)
  → Must be 0.
- SELECT COUNT(*) FROM messages WHERE agent_id NOT IN (SELECT id FROM agents)
  → Must be 0.
- SELECT COUNT(*) FROM activities WHERE agent_id NOT IN (SELECT id FROM agents)
  → Must be 0.
- SELECT COUNT(*) FROM messages WHERE lead_id IS NOT NULL AND lead_id NOT IN (SELECT id FROM leads)
  → Must be 0. If not, set lead_id = NULL for orphaned records.
- SELECT COUNT(*) FROM events WHERE lead_id IS NOT NULL AND lead_id NOT IN (SELECT id FROM leads)
  → Must be 0.
- SELECT COUNT(*) FROM activities WHERE lead_id IS NOT NULL AND lead_id NOT IN (SELECT id FROM leads)
  → Must be 0.

## CHECK 3: SYNC ENDPOINT WORKS
- POST /sync with a test lead payload → must return success with sync counts
- GET /leads → must include the synced lead
- The sync endpoint must handle: new leads (create), existing leads (update), settings merge

## CHECK 4: FRONTEND SYNC POINTS TO CORRECT URL
- Read index.html
- Find the cloud sync URL / API base URL
- Verify it matches: https://yncrm-api.danielruh.workers.dev
- Verify the sync sends Authorization: Bearer <token> header
- Verify saveState() triggers cloud sync
- Verify loadState() attempts to pull from cloud

## CHECK 5: NO DATA LOSS SCENARIOS
- Verify saveState() writes to localStorage BEFORE attempting cloud sync (offline-first)
- Verify loadState() reads from localStorage first, then merges cloud data
- Verify if cloud sync fails, the data is still safely in localStorage
- Verify the state has a _version or timestamp field for conflict detection

Fix ALL issues found. Report what was broken and what you fixed.
```

---

# PROMPT F — THE NUCLEAR FULL SWEEP (Pre-Release)

```
You are about to certify YN-CRM for production release. Run THE FULL SWEEP. Every single check must pass. If ANYTHING fails, fix it and restart the entire sweep from the beginning. Do NOT report until you have achieved a CLEAN full pass with ZERO failures.

## CODEBASE
- Workers: C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\
- Frontend: C:\Users\danie\OneDrive\Desktop\YN-CRM\index.html
- Schema: C:\Users\danie\OneDrive\Desktop\Master X\Master X Agent\execution\workers\api\schema.sql

## CLOUDFLARE
- Account ID: bbaba6c44b7b5d3bba84ca01f4d38d02
- D1 Database: b2ae86e6-cc42-431a-80f9-f17e82379119

## THE SWEEP (32 checks)

### INFRASTRUCTURE (checks 1-5)
1. All 5 workers deployed and returning /health 200
2. All workers have correct D1 binding (database_id matches)
3. All wrangler.toml files are valid
4. Automation worker cron trigger is configured (*/1 * * * *)
5. All environment secrets are set (JWT_SECRET, ACCESS_CODE, WORKER_SECRET, GOOGLE_API_KEY)

### SECURITY (checks 6-15)
6. No hardcoded secrets in ANY source file
7. CORS uses domain allowlist, not wildcard
8. JWT signature is cryptographically verified
9. Passwords hashed with PBKDF2 (100000+ iterations)
10. SMS/Calendar/iMessage workers require X-Worker-Auth
11. Rate limiting active on auth endpoints
12. Input validation on all create/update endpoints
13. escapeHTML() used on ALL user data rendered in frontend
14. No sensitive data in console.log statements
15. Access code read from env, not hardcoded

### API FUNCTIONALITY (checks 16-22)
16. Signup → Login → Token → Protected route flow works end-to-end
17. Leads CRUD (create, read, update, delete) all work
18. Events CRUD all work
19. Messages create and list work
20. Automations CRUD all work
21. Bulk delete works
22. Import leads works

### DATA INTEGRITY (checks 23-27)
23. All 7 database tables exist and are queryable
24. No orphaned records (FK integrity clean)
25. Lead delete cascades properly (messages, activities cleaned up)
26. Sync endpoint creates and updates leads correctly
27. Schema matches all SQL queries in worker code

### FRONTEND (checks 28-32)
28. Zero undefined function references
29. All 5 views render without error
30. Calendar filter buttons (All/Upcoming/Past) work
31. saveState/loadState/cloud sync chain is intact
32. Loading states, empty states, toast notifications all present

## RULES
- If ANY check fails: fix it, then RESTART THE ENTIRE SWEEP from check 1
- Only report when you complete checks 1-32 with ZERO failures in a single pass
- Maximum 5 restart loops. If still failing after 5 loops, report what's still broken.

## REPORT FORMAT (only after clean pass)
🟢 FULL SWEEP PASSED — 32/32 CHECKS CLEAN

Infrastructure: 5/5 ✅
Security: 10/10 ✅
API Functionality: 7/7 ✅
Data Integrity: 5/5 ✅
Frontend: 5/5 ✅

Fixes applied during sweep: [list any fixes made]
Restart loops needed: [number]

YN-CRM is CERTIFIED for production.
```

---

# QUICK REFERENCE — WHICH PROMPT WHEN

| Situation | Use Prompt |
|-----------|-----------|
| Just finished a major build or overhaul | **A** (Full-Stack) |
| Changed backend workers or API routes | **B** (API & Workers) |
| Changed frontend UI or JavaScript | **C** (Frontend) |
| Touched any auth, CORS, or security code | **D** (Security) |
| Changed database schema or sync logic | **E** (Data Integrity) |
| About to push to production | **F** (Nuclear Sweep) |
| Quick sanity check after small change | **B** (fast) or **A** (thorough) |
