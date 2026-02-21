# CC v7 Security & Integration Audit

**Auditor:** Sentinel (FF-QA-001)  
**Date:** 2026-02-19  
**Verdict:** REJECTED — 4 CRITICAL, 5 HIGH, 3 MEDIUM issues found  

---

## CRITICAL Issues

### C1. Hardcoded API Key Exposed in Frontend (4 instances)
**Severity:** CRITICAL  
**Files:**
- `src/components/tabs/crm/pipeline/LeadDetailModal.jsx:111`
- `src/components/tabs/task-board/calendar/CalendarView.jsx:139, 147, 169`

**Detail:** The VPS sync server API key `8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0` is hardcoded in frontend source code sent to the browser. Anyone can inspect the bundle and use this key to call the sync server directly.

**Fix:** Move all authenticated calendar operations through the Cloudflare Worker proxy, which should inject the API key server-side. Remove all `x-api-key` headers from frontend code.

---

### C2. Missing VPS Routes — Taskboard Endpoints (PAGE BREAKER)
**Severity:** CRITICAL — **This will cause broken pages**  
**Detail:** The frontend `config/api.js` defines 15+ taskboard endpoints:
- `/api/taskboard/tasks`, `/api/taskboard/tasks/:id`, `/api/taskboard/tasks/:id/move`
- `/api/taskboard/tasks/:id/approve`, `/api/taskboard/tasks/:id/decline`
- `/api/taskboard/suggestions`, `/api/taskboard/projects`, `/api/taskboard/documents`
- `/api/taskboard/lessons`

**None of these routes exist on the VPS sync server.** The server has NO taskboard routes at all. Every taskboard fetch will get a 404 or the catch-all error response.

**Fix:** Implement taskboard CRUD routes on the VPS sync server, or route taskboard data through the CRM Worker (D1).

---

### C3. Missing VPS Routes — Notifications Endpoints (PAGE BREAKER)
**Severity:** CRITICAL — **This will cause broken pages**  
**Detail:** Frontend expects:
- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/mark-all-read`
- `POST /api/notifications/telegram`

None exist on the VPS. `NotificationCenter.jsx` will fail on load.

**Fix:** Implement notification routes on VPS sync server.

---

### C4. Missing VPS Routes — Phone/Messages/Contacts/Auth/Settings (PAGE BREAKER)
**Severity:** CRITICAL — **This will cause broken pages**  
**Detail:** Missing routes on VPS that frontend calls:
- `GET /api/calls` — PhoneView.jsx:41
- `POST /api/phone/call` — PipelineView.jsx:156, PhoneView.jsx:126
- `POST /api/phone/video` — PipelineView.jsx:166
- `POST /api/phone/message` — PipelineView.jsx:184
- `GET /api/messages` — MessagesView.jsx:43
- `GET /api/messages/:id` — MessagesView.jsx:109
- `GET /api/contacts/:id/activity` — ContactActivityTimeline.jsx:23
- `GET /api/contacts/follow-up-queue` — FollowUpQueue.jsx:16
- `POST /api/dial` — ContactsView.jsx:140, FollowUpQueue.jsx:26
- `POST /api/auth/setup` — AuthGate
- `POST /api/auth/login` — AuthGate
- `GET /api/auth/check` — AuthGate
- `GET/POST /api/settings/lead-sources` — CRMSettings.jsx:144,165

**Fix:** Implement these routes on VPS, or add Mac API bridge routes for phone/messages.

---

## HIGH Issues

### H1. CRM API URL Exported but Unused (Potential CORS Bypass)
**Severity:** HIGH  
**File:** `src/config/crm.js:6`  
**Detail:** `CRM_API_URL = 'https://yncrm-api.danielruh.workers.dev'` is exported. The `crmClient.js` correctly uses `/api/crm` (Pages Function proxy), but if any component imports from `config/crm.js` and uses this URL directly, it would bypass the proxy and hit CORS issues. Currently only used as a comment reference, but it's a foot-gun.

**Fix:** Remove the direct URL export or rename to `_CRM_API_URL_DO_NOT_USE`.

---

### H2. Worker Proxy URL Hardcoded to External Domain
**Severity:** HIGH  
**File:** `src/config/api.js:6`  
**Detail:** `WORKER_PROXY_URL = 'https://forged-sync.danielruh.workers.dev'` — all non-CRM API calls go through this Cloudflare Worker. If this worker is down or misconfigured, the entire CC goes dark. No fallback configured.

**Fix:** Add health check on app load and show connection status. Consider environment variable for the URL.

---

### H3. Auth Uses sessionStorage — Trivially Bypassable
**Severity:** HIGH  
**File:** `src/App.jsx:9`  
**Detail:** `sessionStorage.getItem('forged-os-session') === 'true'` — authentication is a client-side boolean check. Anyone can open DevTools and set this value to bypass the auth gate entirely. The actual auth endpoints (`/api/auth/*`) don't even exist on the VPS yet.

**Fix:** Implement server-side session validation. The auth check should verify a token with the backend on every page load.

---

### H4. TaskBoardContext Sends Notifications Without Auth
**Severity:** HIGH  
**File:** `src/context/TaskBoardContext.jsx:9`  
**Detail:** The Telegram notification call has no auth header — anyone who knows the endpoint can spam notifications.

**Fix:** Add authentication to the notification endpoint call.

---

### H5. No Error Boundaries in Provider Tree
**Severity:** HIGH  
**File:** `src/App.jsx`  
**Detail:** Provider order is `ThemeProvider > PhoneProvider > TaskBoardProvider > CRMProvider > Shell`. If any provider's initial data fetch fails (and many will, per C2-C4), the error could cascade and break the entire app — no error boundary catches it.

**Fix:** Add React Error Boundaries around each provider or around Shell to show fallback UI instead of white screen.

---

## MEDIUM Issues

### M1. CSS Themes Complete — No Issues Found
**Severity:** INFO  
**Detail:** All 10 themes (obsidian, deep-ocean, phantom, midnight-ember, evergreen, titanium, aurora, noir-gold, sandstorm, arctic) have complete 22-token sets. Light themes share a block. No missing tokens. ✅

---

### M2. Calendar GET Requests Don't Require Auth on VPS
**Severity:** MEDIUM  
**File:** VPS `server.js` — `app.get('/api/calendar/events', ...)` and `app.get('/api/calendar/calendars', ...)`  
**Detail:** Calendar read endpoints have no `authenticateAPI` middleware — anyone who can reach the VPS can read calendar data.

**Fix:** Add `authenticateAPI` middleware to calendar GET routes.

---

### M3. Poll Endpoint Has No Auth
**Severity:** MEDIUM  
**File:** VPS `server.js` — `app.get('/api/poll', ...)`  
**Detail:** The poll endpoint is unauthenticated, allowing anyone to poll for state updates.

**Fix:** Add authentication or rate limiting.

---

### M4. CRM Proxy Token Cached 6 Days
**Severity:** MEDIUM  
**File:** `functions/api/crm/[[path]].js:10`  
**Detail:** JWT token is cached for 6 days. If the token is revoked or credentials change, the proxy will serve stale auth for up to 6 days.

**Fix:** Reduce cache TTL to 1 hour, or implement token refresh on 401.

---

## Data Flow Summary

| Path | Status | Issue |
|------|--------|-------|
| CRM: frontend → `/api/crm/*` → Pages Function → yncrm-api Worker → D1 | ✅ Working | Proxy correctly forwards |
| Sync: frontend → forged-sync Worker → VPS `/api/*` | ⚠️ Partial | Many expected routes missing |
| Calendar: frontend → forged-sync → VPS → CalDAV | ✅ Working | CalDAV polling healthy (8 events) |
| Phone: frontend → forged-sync → VPS → Mac API | ❌ Broken | No phone/call/message routes on VPS |
| Taskboard: frontend → forged-sync → VPS | ❌ Broken | No taskboard routes on VPS |
| Notifications: frontend → forged-sync → VPS | ❌ Broken | No notification routes on VPS |
| Auth: frontend → forged-sync → VPS | ❌ Broken | No auth routes on VPS |

## VPS Sync Server Health
- **Status:** Running ✅
- **Calendar collector:** Working (polling every 15 min, 8 events found)
- **Weather collector:** Working (51°F, Partly cloudy)
- **No errors in last hour** ✅
- **Missing:** 20+ routes that frontend expects

---

## Root Cause of Broken Pages

**The VPS sync server is missing approximately 20 routes that the frontend expects.** The frontend was built with endpoints for taskboard, notifications, phone, messages, contacts, auth, and settings — but the VPS only has routes for: cc-state, calendar, dashboard stubs, comms, agents, workspace, and pipeline.

When components mount and fetch these missing endpoints, they get 404s or error responses. Without error boundaries, these failures cascade into white screens or broken tabs.

## Recommended Priority

1. **Add error boundaries** (H5) — immediate, prevents white screens
2. **Implement missing VPS routes** (C2, C3, C4) — required for pages to function
3. **Remove hardcoded API keys** (C1) — security critical
4. **Fix auth model** (H3) — security critical
5. **Add auth to open endpoints** (M2, M3) — security hardening
