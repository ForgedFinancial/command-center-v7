# CC v7 Infrastructure Wiring Audit — COMPLETE

**Inspector:** Sentinel (FF-QA-001)
**Date:** 2026-02-20
**Scope:** Full line-by-line wiring audit of Command Center v7
**Verdict:** 🔴 **4 CRITICAL, 6 HIGH, 8 MEDIUM, 5 LOW** — 23 findings total

---

## BOTTOM LINE UP FRONT

CC v7 has a solid frontend and a functioning VPS backend, but the wiring between them has **4 critical gaps** that will cause visible failures in production. The worst: a weather endpoint crash on every page load, relative-URL fetches that silently fail through the Cloudflare proxy, hardcoded credentials in source files, and stub endpoints returning 501s for features the UI actively calls. The bones are good — but the plumbing leaks.

---

## LAYER 1: VPS SYNC SERVER (port 443)

### Server Architecture
- **server.js** — Express app with HTTPS (self-signed), mounted at port 443
- **Auth:** API key via `x-api-key` header, applied globally via `authMiddleware` at line 55 (before routes)
- **Health endpoint** at line 692 — sits AFTER auth middleware, so `/api/health` requires auth (by design)

### Route Files Mounted
| Route File | Mount Point | Status |
|---|---|---|
| ops.js | /api/ops | ✅ WORKING — 7 tasks returned |
| taskboard.js | /api/taskboard | ✅ WORKING — returns tasks |
| notifications.js | /api/notifications | ✅ WORKING — 5 notifs, 2 unread |
| twilio.js | registerRoutes(app) | ✅ WORKING — 30+ endpoints self-mounted |
| mac-proxy.js | registerRoutes(app) | ✅ WORKING — Mac reachable, calls/messages flowing |
| lead-sources.js | /api/lead-sources | ✅ PRESENT |
| leads-webhook.js | /api/leads | ✅ PRESENT |
| stubs.js | /api (various) | ⚠️ STUB — 5 endpoints return 501 |
| gsheet-poller.js | (collector) | ✅ RUNNING — 30s polling |
| agent-status.js | /api/agents | ✅ WORKING — 17 agents tracked |
| calendar collector | (internal) | ✅ WORKING — 9 events from CalDAV |

### Findings

#### 🔴 CRITICAL-1: Weather endpoint crashes on every call
- **File:** `server.js` lines 19, 683
- **Issue:** `weatherCollector` import is commented out at line 19 (`// const weatherCollector = require('./collectors/weather')`), but line 683 still calls `weatherCollector.getData()`. Every request to `/api/dashboard/weather` throws `ReferenceError: weatherCollector is not defined`.
- **Live test:** Returns `{"error":"weatherCollector is not defined"}`
- **Impact:** If any frontend component polls weather, it gets a crash error. Currently the old CC dashboard may still call this.
- **Fix:** Either uncomment the import or remove line 683 and the route entirely.

#### 🔴 CRITICAL-2: Hardcoded credentials in source files
- **File:** `collectors/calendar.js` lines 4-6
  ```
  CALDAV_USER = 'zombiekiller885@icloud.com'
  CALDAV_PASS = 'vibp-ezfp-grpw-koji'
  ```
- **File:** `routes/mac-proxy.js` line 5
  ```
  MAC_TOKEN = 'mac-api-secret-2026'
  ```
- **File:** `/opt/forged-daemons/daemon.js` lines 29-30
  ```
  TELEGRAM_BOT_TOKEN = '8549625129:AAF0CSoyXFdFru5eEWQ0mflFZJmdquQ1z-k'
  TELEGRAM_CHAT_ID = '5317054921'
  ```
- **Impact:** Anyone with read access to these files has Boss's iCloud app-specific password, Telegram bot token, and Mac API secret. These are in git-trackable locations.
- **Fix:** Move ALL credentials to `.env` files or environment variables. Rotate the CalDAV app-specific password and Telegram bot token after migration.

#### ⚠️ HIGH-1: Stub endpoints return 501 for active UI features
- **File:** `routes/stubs.js`
- **Endpoints returning 501 "Not implemented":**
  - `POST /api/notifications/telegram` — Called by TaskBoardContext.jsx line 9
  - `POST /api/taskboard/documents/upload` — Called by DocumentsView
  - `POST /api/auth/setup` — Called by auth configuration flow
- **Endpoint returning empty but functional:**
  - `GET /api/taskboard/suggestions` — Returns `[]`
  - `GET /api/auth/setup` — Returns `{ configured: true }`
- **Impact:** Telegram notifications from the Ops board silently fail. Document upload is broken. Users see no error but features don't work.

#### ⚠️ HIGH-2: `/api/phone/ping` returns `{ connected: false }` always
- **File:** `routes/stubs.js` line 22
- **Issue:** Hardcoded `connected: false`. PhoneContext.jsx line 190 calls this to determine phone system health. Frontend will always show phone as disconnected via this check, even when Twilio is fully configured.
- **Fix:** Wire this to actually check Twilio configuration status.

---

## LAYER 2: FRONTEND → BACKEND WIRING

### URL Strategy
CC v7 uses two fetch patterns:
1. **`WORKER_PROXY_URL` prefix** — Goes through Cloudflare Worker proxy (`forged-sync.danielruh.workers.dev`) → VPS. **Correct for production.**
2. **Relative URLs** (no prefix) — Goes to the same origin (`cc.forgedfinancial.us`). **Will hit Cloudflare Pages, NOT the VPS.** Pages will serve the SPA HTML, not API JSON.

### Findings

#### 🔴 CRITICAL-3: CompletedView uses relative URLs — broken in production
- **File:** `components/tabs/ops/completed/CompletedView.jsx` lines 23-24
  ```js
  fetch('/api/comms/tasks?status=complete&limit=100')
  fetch('/api/comms/tasks?status=failed&limit=50')
  ```
- **Issue:** No `WORKER_PROXY_URL` prefix. In production on `cc.forgedfinancial.us`, these hit Cloudflare Pages which returns HTML (SPA catch-all), not JSON. The `res.json()` call fails silently (caught by `catch { /* silent */ }`).
- **Impact:** Completed tasks view is always empty in production. Works in dev (localhost proxies to VPS).

#### 🔴 CRITICAL-4: StandUpTab uses relative URLs — broken in production
- **File:** `components/tabs/stand-up/StandUpTab.jsx` lines 23, 34, 48, 91
  ```js
  fetch('/api/comms/session', ...)
  fetch('/api/comms/room?topic=standup&limit=100', ...)
  fetch('/api/comms/send', ...)
  ```
- **Issue:** Same as CRITICAL-3. All 4 fetch calls use relative URLs without `WORKER_PROXY_URL`.
- **Impact:** Stand-Up Room is completely non-functional in production. Session creation, message loading, and message sending all silently fail.

#### ⚠️ HIGH-3: NotificationCenter uses `WORKER_PROXY_URL` but with path concatenation
- **File:** `components/shared/NotificationCenter.jsx` line 17
  ```js
  fetch(`${WORKER_PROXY_URL}${endpoint}`, ...)
  ```
- **Issue:** `endpoint` already includes `/api/...` prefix. If WORKER_PROXY_URL doesn't end with a clean base, paths could double up. Currently works because the proxy URL doesn't have a trailing path, but fragile.
- **Severity:** Working but fragile wiring.

#### ⚠️ HIGH-4: CRM pipeline data goes through `/api/crm` — Pages Function proxy required
- **File:** `api/crmClient.js` line 7 — `const CRM_API_URL = '/api/crm'`
- **Issue:** Uses relative URL. This works ONLY if Cloudflare Pages has a Function at `/api/crm/*` that proxies to the D1 worker (`yncrm-api.danielruh.workers.dev`). If that Function is missing or misconfigured, entire CRM pipeline is dead.
- **Status:** Cannot verify from VPS side — requires checking Cloudflare Pages Functions deployment.

#### ⚠️ HIGH-5: ContactActivityTimeline and FollowUpQueue use hardcoded proxy paths
- **File:** `components/tabs/crm/contacts/ContactActivityTimeline.jsx` line 23
  ```js
  fetch(`${WORKER_PROXY_URL}/api/contacts/${contactId}/activity`)
  ```
- **File:** `components/tabs/crm/contacts/FollowUpQueue.jsx` line 16
  ```js
  fetch(`${WORKER_PROXY_URL}/api/contacts/follow-up-queue`)
  ```
- **Issue:** These endpoints (`/api/contacts/*`) don't exist in any VPS route file. No route in ops.js, taskboard.js, stubs.js, or any other file handles `/api/contacts/`. These will always 404.
- **Impact:** Contact activity timeline and follow-up queue are dead features.

#### ⚠️ MEDIUM-1: `/api/calendar/events` endpoint works but CalDAV polling has no error recovery
- **File:** `collectors/calendar.js`
- **Issue:** If CalDAV auth fails (token expires, Apple requires re-auth), the collector silently stops returning events. No alerting, no retry with backoff, no notification to Boss.
- **Impact:** Calendar view could go stale for hours/days without anyone noticing.

---

## LAYER 3: DAEMON PIPELINE WIRING

### Architecture
- 3 daemon services: `soren.service` (Architect), `mason.service` (Mason), `sentinel.service` (Sentinel)
- All running, healthy, 15-second poll interval
- Task client polls `/api/comms/tasks` for available work
- V2 auto-advance handles ops board stage transitions

### Findings

#### ⚠️ MEDIUM-2: No knowledge auto-write on sentinel inspection completion
- **Issue:** When Sentinel completes an inspection, the result is stored in `/api/comms/tasks` but there's no automation to extract findings and write them to the Knowledge Base (`/api/ops/knowledge/entries`). The task file (`routes/tasks.js`) and daemon (`daemon.js`) have zero references to `knowledge` or `kb`.
- **Impact:** Inspection insights are buried in task results. Knowledge Base stays empty unless manually populated.
- **Fix:** Add a post-completion hook in the daemon or task router that extracts key findings from sentinel completions and POSTs them to `/api/ops/knowledge/entries`.

#### ⚠️ MEDIUM-3: Daemon task timeout is only 5 minutes
- **File:** `/opt/forged-daemons/daemon.js` line 28 — `const TASK_TIMEOUT = 300`
- **Issue:** Complex inspections (like the one that found the ops layer issues) took 138 seconds. Browser-based inspections or large code reviews could easily exceed 300 seconds.
- **Impact:** Long-running agent tasks get killed mid-execution.

#### ⚠️ MEDIUM-4: Agent status endpoint shows all agents as "offline"
- **Live test:** All 17 agents show `status: "offline"`, `lastActive: null`
- **Issue:** The agent-status route doesn't integrate with the daemon poll loop. Daemons are clearly running (confirmed via systemctl) but status endpoint doesn't know.
- **Impact:** Agent Status panel in CC v7 shows everyone as offline, which is misleading.

---

## LAYER 4: THEME SYSTEM

### Architecture
- 22 themes in `hooks/useTheme.js` via `THEME_DEFINITIONS` object
- 6 categories: dark (4), rich (4), light (2), luxury (4), unique (4), dano (4)
- CSS custom properties applied via `data-theme` attribute on `<html>`
- Migration map handles old theme IDs
- localStorage persistence at key `cc7-bg-theme`

### Findings

#### ⚠️ MEDIUM-5: Theme CSS custom properties not verified against components
- **Issue:** Themes define colors in JS (`colors.bg`, `colors.surface`, etc.) but components reference CSS variables like `var(--theme-text-primary)`, `var(--theme-accent)`, `var(--theme-border)`, `var(--theme-surface)`. I cannot verify from the JS alone that `applyThemeToDOM()` actually sets ALL the CSS variables that components consume. If any variable is missing for a theme, components fall back to transparent/inherit which could be invisible text on matching backgrounds.
- **Impact:** Potential invisible text or broken styling on certain theme selections.
- **Severity:** MEDIUM because the theme definitions look complete, but there's no automated verification.

---

## LAYER 5: CRON & AUTOMATION

### Active Crontab
| Schedule | Job | Status |
|---|---|---|
| `0 * * * *` | activity-logger.js | ✅ Running |
| `0 3 * * 0` | security-scan.sh (weekly) | ✅ Configured |
| `0 4 * * *` | scratch cleanup | ✅ Running |
| `30 13 * * *` | generate-briefing.sh | ✅ Configured |
| `0 3 * * *` | backup.sh | ✅ Configured |
| `*/2 * * * *` | standup-trigger.sh | ✅ Running |
| `0 16 21 2 *` | remind-sep-video-templates.sh | ⚠️ One-shot, fires today |

### Findings

#### ⚠️ MEDIUM-6: standup-trigger.sh runs every 2 minutes but Stand-Up room is broken
- **Issue:** The cron triggers stand-up polling every 2 minutes, but per CRITICAL-4, the Stand-Up Tab uses relative URLs that don't work in production. So the trigger fires, but the UI can't display anything.
- **Impact:** Wasted cron cycles with no visible benefit until CRITICAL-4 is fixed.

---

## LAYER 6: DATA PERSISTENCE

### Data Files
| File | Purpose | Size | Writable |
|---|---|---|---|
| pipeline/build-tasks.json | Ops pipeline | 15.9K | Root-owned ⚠️ |
| taskboard/tasks.json | Taskboard | Present | — |
| taskboard/documents.json | Documents | Present | — |
| taskboard/projects.json | Projects | Present | — |
| notifications/notifications.json | Notifications | Present | — |
| leads/webhook-leads.json | Lead intake | Present | — |
| knowledge/entries.json | Knowledge Base | Present | — |

### Findings

#### ⚠️ MEDIUM-7: build-tasks.json is root-owned
- **File:** `/home/clawd/.openclaw/data/pipeline/build-tasks.json` — owned by `root:root`
- **Issue:** The sync server runs as root (PID 261538), so writes work. But if the server is ever run as `clawd` user, pipeline persistence breaks immediately.
- **Fix:** `chown clawd:clawd` all data files.

#### ⚠️ HIGH-6: ReviewPanel allows anyone to approve/reject as any agent
- **File:** `components/tabs/ops/pipeline/ReviewPanel.jsx`
- **Issue:** The review buttons let the UI user click "Approve" or "Reject" for ANY agent (clawd, soren, mason, sentinel). The POST to `/api/ops/pipeline/tasks/:id/reviews` accepts whatever `agentId` is sent. There's no server-side verification that the submitter IS that agent.
- **Impact:** Boss (or anyone with CC access) can forge reviews as any agent. This undermines the review gate entirely — the "2 approvals + Clawd required" check is security theater if anyone can impersonate agents.
- **Fix:** Server should validate the authenticated session's identity before accepting a review.

---

## LAYER 7: INTER-AGENT COMMS

### Architecture
- claude-comms directory: `inbox.json`, `outbox.json`, `messages.json`, `session.json`
- Stand-Up Room: `/api/comms/room` + `/api/comms/send`
- Task queue: `/api/comms/tasks` (GET/POST/PATCH/DELETE)

### Findings

#### ⚠️ MEDIUM-8: Two separate comms systems with no bridge
- **Issue:** The daemon uses `/api/comms/tasks` for agent work assignment. The Stand-Up Room uses `/api/comms/room` for agent chat. The Ops pipeline uses `/api/ops/pipeline/tasks` for project tracking. These three systems don't cross-reference. When a daemon task completes, no notification goes to the Stand-Up Room or Ops pipeline automatically (the V2 auto-advance handles stage movement but doesn't post to the room).
- **Impact:** Information silos between agent work, agent chat, and project tracking.

---

## LAYER 8: SECURITY POSTURE

### Findings (beyond CRITICAL-2 above)

#### 🟡 LOW-1: Auth middleware blocks /api/health
- **File:** `server.js` line 55 (authMiddleware) vs line 692 (/api/health)
- **Issue:** Health endpoint is after auth middleware. External health checks (uptime monitors, load balancers) can't ping health without an API key.
- **Fix:** Move health route above authMiddleware or add it to a skip list.

#### 🟡 LOW-2: Self-signed SSL with no certificate rotation
- **Issue:** VPS uses self-signed cert. No Let's Encrypt, no auto-renewal. Browser clients can't connect directly (by design — Cloudflare proxy handles it). But if the cert expires, the Worker proxy will also fail.
- **Impact:** Low risk since Cloudflare handles public traffic, but worth monitoring.

#### 🟡 LOW-3: CommentsPanel hardcodes `agentId: 'dano'`
- **File:** `components/tabs/ops/pipeline/CommentsPanel.jsx` line 17
  ```js
  body: JSON.stringify({ agentId: 'dano', message: draft.trim() })
  ```
- **Issue:** Every comment posted through the UI is attributed to 'dano' regardless of who's typing. If agents ever get CC access, their comments will be misattributed.
- **Fix:** Use the authenticated session's identity.

#### 🟡 LOW-4: Mac proxy has no auth on GET endpoints
- **File:** `routes/mac-proxy.js`
- **Issue:** `/api/messages` and `/api/calls` are GET endpoints that return real iMessage conversations and call history. They're protected by the global authMiddleware (API key), but there's no per-user access control. Any CC user with the API key sees all of Boss's personal messages.
- **Impact:** Low risk while only Boss uses CC, but blocks multi-user deployment.

#### 🟡 LOW-5: No rate limiting on review/comment submission
- **Files:** `routes/ops.js` lines 893, 924
- **Issue:** No rate limiting on POST to comments or reviews endpoints. A malicious or buggy client could flood with thousands of comments.

---

## ENDPOINT WIRING MATRIX

| Frontend Component | Endpoint | Uses Proxy? | VPS Route Exists? | Status |
|---|---|---|---|---|
| OpsTab | /api/ops/pipeline/tasks | Via ENDPOINTS config | ✅ ops.js | ✅ WORKING |
| OpsTab | /api/ops/knowledge/entries | Via ENDPOINTS config | ✅ ops.js | ✅ WORKING |
| CommentsPanel | /api/ops/pipeline/tasks/:id/comments | Via ENDPOINTS | ✅ ops.js | ✅ WORKING |
| ReviewPanel | /api/ops/pipeline/tasks/:id/reviews | Via ENDPOINTS | ✅ ops.js | ✅ WORKING |
| CompletedView | /api/comms/tasks | ❌ RELATIVE | ✅ tasks.js | 🔴 BROKEN (no proxy) |
| StandUpTab | /api/comms/session | ❌ RELATIVE | ✅ comms | 🔴 BROKEN (no proxy) |
| StandUpTab | /api/comms/room | ❌ RELATIVE | ✅ comms | 🔴 BROKEN (no proxy) |
| StandUpTab | /api/comms/send | ❌ RELATIVE | ✅ comms | 🔴 BROKEN (no proxy) |
| PhoneView | /api/calls | ✅ WORKER_PROXY | ✅ mac-proxy.js | ✅ WORKING |
| PhoneView | /api/phone/call | ✅ WORKER_PROXY | ✅ twilio.js | ✅ WORKING |
| MessagesView | /api/messages | ✅ WORKER_PROXY | ✅ mac-proxy.js | ✅ WORKING |
| CalendarView | /api/calendar/events | ✅ WORKER_PROXY | ✅ calendar collector | ✅ WORKING |
| NotificationCenter | /api/notifications | ✅ WORKER_PROXY | ✅ notifications.js | ✅ WORKING |
| TaskBoardContext | /api/notifications/telegram | ✅ WORKER_PROXY | ⚠️ stubs.js (501) | 🟡 STUB |
| TaskBoardContext | /api/tasks/notify | ✅ WORKER_PROXY | ⚠️ stubs.js | 🟡 STUB |
| PhoneContext | /api/twilio/token | ✅ WORKER_PROXY | ✅ twilio.js | ✅ WORKING |
| PhoneContext | /api/phone/ping | ✅ WORKER_PROXY | ⚠️ stubs.js (false) | 🟡 ALWAYS "disconnected" |
| LiveCallDashboard | /api/twilio/dashboard/stats | ✅ WORKER_PROXY | ✅ twilio.js | ✅ WORKING |
| BestTimeIntelligence | /api/twilio/intelligence/best-time | ✅ WORKER_PROXY | ✅ twilio.js | ✅ WORKING |
| CRMSettings | /api/lead-sources | ✅ WORKER_PROXY | ✅ lead-sources.js | ✅ WORKING |
| CRMClient | /api/crm/* | ❌ RELATIVE (Pages Fn) | N/A (D1 worker) | ⚠️ DEPENDS ON PAGES FN |
| ContactActivityTimeline | /api/contacts/:id/activity | ✅ WORKER_PROXY | ❌ NO ROUTE | 🔴 DEAD |
| FollowUpQueue | /api/contacts/follow-up-queue | ✅ WORKER_PROXY | ❌ NO ROUTE | 🔴 DEAD |
| PipelineView | /api/phone/video | ✅ WORKER_PROXY | ❌ NO ROUTE | 🔴 DEAD |
| PipelineView | /api/phone/message | ✅ WORKER_PROXY | ❌ NO ROUTE | 🔴 DEAD |
| ContactsView | /api/dial | ✅ WORKER_PROXY | ⚠️ mac-proxy.js (queued only) | 🟡 PARTIAL |

---

## SUMMARY BY SEVERITY

### 🔴 CRITICAL (4) — Blocks deployment / data risk
1. **Weather endpoint crash** — `weatherCollector is not defined` on every call
2. **Hardcoded credentials** — iCloud password, Telegram bot token, Mac API secret in source
3. **CompletedView relative URLs** — Completed tasks view broken in production
4. **StandUpTab relative URLs** — Stand-Up Room completely broken in production

### ⚠️ HIGH (6) — Must fix before next build
1. Stub endpoints return 501 for active UI features (Telegram notifs, doc upload)
2. `/api/phone/ping` always returns `connected: false`
3. NotificationCenter path concatenation fragility
4. CRM pipeline depends on unverified Pages Function proxy
5. Contact activity + follow-up queue hit nonexistent endpoints
6. ReviewPanel allows impersonation of any agent

### 🟡 MEDIUM (8) — Fix when convenient
1. No knowledge auto-write on sentinel completion
2. 5-minute daemon task timeout too short for complex inspections
3. Agent status always shows "offline" despite running daemons
4. Theme CSS variable coverage unverified
5. Stand-up trigger cron wasted while Stand-Up Tab is broken
6. build-tasks.json root-owned
7. Two comms systems with no bridge
8. CalDAV has no error recovery/alerting

### 🟢 LOW (5) — Nice to have
1. /api/health requires auth (blocks external monitors)
2. Self-signed SSL with no rotation monitoring
3. CommentsPanel hardcodes agentId to 'dano'
4. Mac proxy exposes personal messages to any API key holder
5. No rate limiting on review/comment endpoints

---

## RECOMMENDED FIX ORDER
1. **CRITICAL-2 first** — Rotate credentials, move to .env. Security above all.
2. **CRITICAL-3 + CRITICAL-4** — Add `WORKER_PROXY_URL` prefix to CompletedView and StandUpTab fetches. 10-minute fix, unblocks two features.
3. **CRITICAL-1** — Remove dead weather route or fix import. 2-minute fix.
4. **HIGH-6** — Add server-side identity validation for reviews.
5. **HIGH-1** — Replace stubs with real implementations (Telegram notif is most impactful).
6. **HIGH-5** — Either build `/api/contacts/*` routes or remove dead UI components.

---

*Report generated by Sentinel (FF-QA-001) — 2026-02-20 22:05 UTC*
*Methodology: Static analysis of all source files + live endpoint testing against VPS port 443*
