# CC v7 — Deep Diagnostic Audit

**Date:** 2026-02-19  
**Auditor:** Soren (FF-PLN-001)  
**Build Status:** ✅ Compiles clean (`npx vite build` — 0 errors, 124 modules)  
**Verdict:** App is structurally sound. No missing imports, no broken provider tree, no compile errors. Issues found are runtime data mismatches and non-critical UX gaps.

---

## Executive Summary

The codebase is well-structured and the build is clean. The provider tree (`main.jsx` → `AppProvider` → `App` → `ThemeProvider` → `PhoneProvider` → `TaskBoardProvider` → `CRMProvider` → `Shell`) is correctly ordered. All hooks are used within their providers. All imported components exist.

**"Pages not loading" is most likely caused by:**
1. The sync server connection failing (shows "Connecting to server…" spinner indefinitely if `/api/health` and `/api/cc-state` both fail)
2. CRM data fetch failures (silent — no user-facing error state on CRM tab)
3. Task Board data fetch failures (shows loading spinner until timeout)

These are **server-side/network issues**, not frontend code bugs.

---

## Issues Found

### CRITICAL

| # | File | Line | Description | Fix |
|---|------|------|-------------|-----|
| — | — | — | **No critical frontend issues found** | — |

### HIGH

| # | File | Line | Description | Fix |
|---|------|------|-------------|-----|
| H1 | `hooks/useSyncServer.js` | 45-48 | **Initial load spinner blocks entire app** if server unreachable. `isInitialLoad` stays `true` until first sync attempt completes. If Worker proxy is down, user sees infinite spinner. The `catch` block does set `setInitialLoad(false)`, but only after the 10s fetch timeout. | Add a max-wait timer (e.g., 5s) that forces `setInitialLoad(false)` regardless, showing the app in disconnected state. |
| H2 | `components/tabs/crm/dashboard/CRMDashboard.jsx` | 12,21 | **Stage mismatch:** Dashboard uses `application` stage but `config/crm.js` defines `proposal`. Leads in `proposal` stage won't appear in dashboard bar chart. | Replace `application` → `proposal` in STAGE_COLORS and STAGE_LABELS. |
| H3 | `components/tabs/crm/settings/CRMSettings.jsx` | 14 | **Same stage mismatch:** Settings page shows `application`/`Negotiation` but pipeline uses `proposal`/`Proposal`. | Replace `application` → `proposal` in STAGE_CONFIG array. |
| H4 | `components/tabs/crm/CRMTab.jsx` | 58-65 | **CRM data fetch has no user-facing error state.** If `crmClient.getLeads()` fails, `console.error` is called but no error UI shown. User sees empty dashboard with no explanation. | Add error state to CRM context; show error banner on fetch failure. |
| H5 | `components/tabs/crm/contacts/FollowUpQueue.jsx` | 16 | **Direct fetch to Worker proxy** (`WORKER_PROXY_URL/api/contacts/follow-up-queue`) — this endpoint likely doesn't exist on the Worker. No Pages Function proxy for it. Will always 404 silently. | Route through CRM client or create endpoint. |

### MEDIUM

| # | File | Line | Description | Fix |
|---|------|------|-------------|-----|
| M1 | `components/tabs/crm/contacts/ContactActivityTimeline.jsx` | 23 | **Direct Worker proxy fetch** to `/api/contacts/${contactId}/activity` — likely non-existent endpoint. Fails silently. | Route through CRM client or verify endpoint exists. |
| M2 | `components/tabs/crm/contacts/ContactsView.jsx` | 140 | **Direct fetch to `/api/dial`** on Worker proxy — not a standard endpoint. Fire-and-forget, but will 404. | Verify endpoint exists or remove. |
| M3 | `components/tabs/crm/pipeline/PipelineView.jsx` | 156,166,184 | **Direct fetches to `/api/phone/call`, `/api/phone/video`, `/api/phone/message`** on Worker proxy — these are VPS-only endpoints that may not be proxied. | Verify Worker routes these to VPS. |
| M4 | `components/tabs/task-board/phone/PhoneView.jsx` | 41 | **Fetches `/api/calls`** from Worker proxy — may not exist. Falls back gracefully (empty array), but phone history won't populate. | Verify endpoint or show "not configured" state. |
| M5 | `components/tabs/task-board/messages/MessagesView.jsx` | 43 | **Fetches `/api/messages`** from Worker proxy — same issue. iMessage data requires VPS sync server running. | Show clear "sync server offline" state when fetch fails. |
| M6 | `components/tabs/task-board/calendar/CalendarView.jsx` | 42,57 | **Fetches `/api/calendar/events` and `/api/calendar/calendars`** from Worker proxy — requires VPS sync server. Silent failure shows empty calendar. | Add connection status check before fetch. |
| M7 | `hooks/useSyncServer.js` | 27-30 | **Stale closure risk:** `sync` callback references `state.sessions`, `state.tokens`, etc. in its dependency array. On every state change, a new `sync` function is created, but `useInterval` may hold stale ref. | Use refs for state values in the callback, or remove state from deps (the callback doesn't actually read them for logic). |
| M8 | `api/taskboardClient.js` | 10 | **Auth token key mismatch:** Uses `sessionStorage.getItem('forged-os-token')` but `AuthGate`/`syncClient` uses `cc_auth_token`. TaskBoard API calls may go unauthenticated. | Align token key to `cc_auth_token`. |

### LOW

| # | File | Line | Description | Fix |
|---|------|------|-------------|-----|
| L1 | `components/layout/Shell.jsx` | — | **CRMSubTabs component defined but never used.** Dead code (164 lines). Sidebar replaced it. | Remove dead code. |
| L2 | `config/crm.js` | 1 | **`CRM_API_URL` exported but never imported anywhere.** CRM client uses `/api/crm` (relative). | Remove unused export. |
| L3 | `context/AppContext.jsx` | — | **`DEFAULT_THEME` from constants is 'forge' but `useTheme` defaults to 'obsidian'.** AppContext.initialState.theme is 'forge' (never applied). Harmless since ThemeContext overrides. | Align or remove from AppContext. |
| L4 | `config/constants.js` | — | **Empty exports:** `FILE_PREVIEWS`, `ACTIVITY_TIMELINE`, `CRON_JOBS` are empty objects/arrays. Not breaking but clutters config. | Clean up or populate. |
| L5 | `components/tabs/crm/pipeline/PipelineView.jsx` | 6 | **Imports `WORKER_PROXY_URL`** directly for ad-hoc fetches instead of using `crmClient`. Inconsistent API access pattern. | Consolidate through crmClient. |
| L6 | `package.json` | — | **Bundle size warning:** 549KB JS (146KB gzipped). Single chunk. Consider code-splitting CRM/TaskBoard/OrgChart. | Add lazy() imports for tab content. |

---

## View-by-View Status

| View | Tab | Status | Notes |
|------|-----|--------|-------|
| **KanbanBoard** | Task Board | ✅ OK | DnD imports correct, @dnd-kit installed |
| **KanbanHeader** | Task Board | ✅ OK | Clean |
| **ProjectsView** | Task Board | ✅ OK | Handles selected/unselected project |
| **ProjectDetailView** | Task Board | ✅ OK | Tab navigation works |
| **TasksListView** | Task Board | ✅ OK | Filtering/sorting works |
| **DocumentsView** | Task Board | ✅ OK | Category filter, empty state handled |
| **CalendarView** | Task Board | ⚠️ M6 | Works if VPS sync server is up |
| **PhoneView** | Task Board/CRM | ⚠️ M4 | Works if VPS sync server is up |
| **MessagesView** | Task Board/CRM | ⚠️ M5 | Works if VPS sync server is up |
| **CRMDashboard** | CRM | ⚠️ H2 | Stage mismatch (`application` vs `proposal`) |
| **PipelineView** | CRM | ⚠️ M3,L5 | Works but ad-hoc fetches may 404 |
| **ContactsView** | CRM | ⚠️ M2 | Dial endpoint may not exist |
| **FollowUpQueue** | CRM | ⚠️ H5 | Endpoint likely doesn't exist — always empty |
| **CRMSettings** | CRM | ⚠️ H3 | Stage mismatch |
| **OrgChart** | Org Chart | ✅ OK | Agent poll, pipeline poll both graceful |
| **Workspaces** | Workspaces | ✅ OK | File viewer works, graceful empty state |
| **AuthGate** | Login | ✅ OK | Boot sequence, server auth |
| **Shell** | Layout | ✅ OK | Provider usage correct |
| **TabBar** | Layout | ✅ OK | Clean |
| **Sidebar** | Layout | ✅ OK | Config-driven |
| **StatusBar** | Layout | ✅ OK | Health toggle, lock button |

---

## Root Cause Analysis: "Pages Not Loading"

The most likely cause is **NOT frontend bugs** but rather:

1. **VPS sync server down** → `/api/health` and `/api/cc-state` fail → initial load spinner shows for 10s, then app loads in disconnected state. Many features (Calendar, Phone, Messages) show empty.

2. **Cloudflare Worker proxy issues** → If `forged-sync.danielruh.workers.dev` has errors, ALL task board operations, agent status, and VPS-dependent features fail.

3. **CRM API down** → If `yncrm-api.danielruh.workers.dev` or the Pages Function proxy fails, CRM tab shows empty with no error message (H4).

**Recommended immediate actions:**
1. Fix H2/H3 (stage mismatch) — 2 min fix
2. Fix H4 (CRM error state) — 15 min fix  
3. Fix M8 (auth token key mismatch) — 1 min fix
4. Verify VPS sync server is running and Worker proxy is routing correctly
