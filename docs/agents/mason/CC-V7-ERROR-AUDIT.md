# CC v7 — Runtime Error Audit
**Date:** 2026-02-19  
**Auditor:** Mason (FF-BLD-001)  
**Build Status:** ✅ PASSES (vite build clean, 124 modules)

---

## Issues Found

### 1. MEDIUM — Dashboard stage key mismatch (`application` vs `proposal`)
- **File:** `src/components/tabs/crm/dashboard/CRMDashboard.jsx` lines 12, 21
- **What's broken:** `STAGE_COLORS` and `STAGE_LABELS` use key `application`, but all CRM data uses `proposal` (from `config/crm.js`). The dashboard's pipeline breakdown bar chart shows 0 for the proposal/negotiation stage because `stats.byStage` is keyed by `proposal` (computed from `CRM_STAGES`) but the render loop iterates `STAGE_LABELS` which has `application`. Result: proposal leads never shown in dashboard chart, and the `application` row always shows 0.
- **Fix:** Replace `application` with `proposal` in both `STAGE_COLORS` and `STAGE_LABELS`:
  ```js
  // line 12
  proposal: '#f97316',
  // line 21  
  proposal: 'Negotiation',
  ```

### 2. MEDIUM — `seenLeads` localStorage grows forever (no pruning)
- **Files:**
  - `src/components/tabs/crm/pipeline/PipelineView.jsx` lines 130-137
  - `src/components/tabs/crm/contacts/ContactsView.jsx` lines 102-109
- **What's broken:** Every lead ID ever viewed gets added to `cc7-seen-leads` in localStorage and is never cleaned up. Over time this Set grows unbounded. With thousands of leads, JSON.parse/stringify on every render gets expensive and could hit localStorage quota (~5MB).
- **Fix:** Cap the Set to last 500 IDs. On add, if size > 500, drop oldest entries:
  ```js
  const MAX_SEEN = 500
  const next = new Set(prev)
  next.add(id)
  if (next.size > MAX_SEEN) {
    const arr = [...next]
    return new Set(arr.slice(arr.length - MAX_SEEN))
  }
  ```

### 3. LOW — Duplicate `seenLeads` state (not shared)
- **Files:** `PipelineView.jsx` line 130, `ContactsView.jsx` line 102
- **What's broken:** Both views independently read/write the same `cc7-seen-leads` localStorage key with separate React state. Marking a lead as seen in Pipeline doesn't update Contacts view until remount (stale in-memory Set).
- **Fix:** Extract `useSeenLeads()` hook or move to CRMContext so state is shared.

### 4. LOW — Dashboard stage labels don't match rest of CRM
- **File:** `src/components/tabs/crm/dashboard/CRMDashboard.jsx` lines 16-23
- **What's broken:** Dashboard labels differ from `config/crm.js CRM_STAGE_CONFIG`:
  - Dashboard: `engaged → "Qualified"`, `qualified → "Proposal Sent"`, `application → "Negotiation"`
  - Config: `engaged → "Engaged"`, `qualified → "Qualified"`, `proposal → "Proposal"`
  - Users see different stage names on dashboard vs pipeline view.
- **Fix:** Use `CRM_STAGE_CONFIG` labels instead of hardcoded `STAGE_LABELS`, or align them.

### 5. LOW — Large bundle (549KB minified)
- **What's broken:** Single chunk exceeds 500KB warning. Not a crash but affects load time.
- **Fix:** Add dynamic `import()` for tab views (CRM, TaskBoard, OrgChart, Workspaces). Shell.jsx already imports `lazy` but doesn't use it for all tabs.

---

## Verified Working (No Issues Found)

| Area | Status |
|------|--------|
| **Build** | ✅ Clean — no errors, warnings only for chunk size |
| **PhoneProvider** | ✅ Wraps all `usePhone()` consumers via `App.jsx` |
| **Twilio client** | ✅ All calls route through Worker proxy, no direct API calls |
| **API config** | ✅ `WORKER_PROXY_URL` correct, all endpoints properly defined |
| **Import chains** | ✅ All imports resolve — every component file exists |
| **Hardcoded credentials** | ✅ NONE found — no API keys in frontend code |
| **Error handling** | ✅ syncClient, crmClient, taskboardClient all have try/catch with error propagation |
| **localStorage keys** | ✅ All namespaced with `cc7-` or `forgedos_` prefix, no conflicts |
| **Sync server hook** | ✅ Exponential backoff, idle mode, toast notifications on disconnect |

---

## Summary

**No CRITICAL issues found.** Build is clean and all imports resolve. The codebase is solid.

**2 MEDIUM issues** that affect data display:
1. Dashboard stage mismatch (`application` → should be `proposal`) — causes proposal leads to not appear in dashboard chart
2. seenLeads unbounded growth — performance degradation over time

**3 LOW issues** — cosmetic/architectural improvements.

If Boss reports "pages aren't loading," the issue is likely **not in the frontend code** — it's probably:
- Server/VPS down or Cloudflare Worker proxy failing
- Auth token expired (`forgedos_crm_token`)
- Network connectivity to `forged-sync.danielruh.workers.dev`

Recommend checking: `curl https://forged-sync.danielruh.workers.dev/api/health`
