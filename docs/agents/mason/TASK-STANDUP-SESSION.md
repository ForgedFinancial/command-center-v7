# TASK: Stand-Up Room — Agent Session Mode
**Assigned by:** Clawd (COO)
**Priority:** High
**Date:** 2026-02-20

## FEATURE SUMMARY
Boss wants a "Session Mode" in the Stand-Up Room. When he clicks a button, agents can talk to each other. When he doesn't activate it, agents only respond to him — never to each other.

---

## PART 1 — BACKEND (VPS sync server)

**File:** `/home/clawd/sync-server/server.js`

### New session state file
Create `/home/clawd/claude-comms/session.json` with default content:
```json
{ "active": false, "activatedBy": null, "activatedAt": null }
```

### Add two endpoints BEFORE the 404 handler (around line 843, near the comms/room route):

```js
const SESSION_FILE = path.join('/home/clawd/claude-comms', 'session.json')

function loadSession() {
  try { return JSON.parse(fsSync.readFileSync(SESSION_FILE, 'utf8')) }
  catch { return { active: false, activatedBy: null, activatedAt: null } }
}

function saveSession(data) {
  fsSync.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2))
}

// GET /api/comms/session
app.get('/api/comms/session', authenticateAPI, (req, res) => {
  res.json(loadSession())
})

// POST /api/comms/session
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
```

### Also add `commsSession` to the Pages Function proxy
File: `/home/clawd/command-center-v7/functions/api/comms/[[path]].js` — already handles all /api/comms/* routes, no changes needed.

---

## PART 2 — FRONTEND (CC v7)

### 2.1 `src/config/api.js` — add endpoint
```js
commsSession: '/api/comms/session',
```

### 2.2 `src/context/AppContext.jsx` — add session state

Add to `initialState`:
```js
standUpSession: { active: false, activatedBy: null, activatedAt: null },
```

Add to `ActionTypes`:
```js
UPDATE_STANDUP_SESSION: 'UPDATE_STANDUP_SESSION',
```

Add reducer case:
```js
case ActionTypes.UPDATE_STANDUP_SESSION:
  return { ...state, standUpSession: action.payload }
```

Add action creator:
```js
updateStandUpSession: useCallback((session) => {
  dispatch({ type: ActionTypes.UPDATE_STANDUP_SESSION, payload: session })
}, []),
```

### 2.3 `src/components/tabs/stand-up/StandUpTab.jsx` — session controls

Add session fetch + toggle to the existing component.

**Fetch session state** (add to existing useEffect or separate one):
```js
const fetchSession = useCallback(async () => {
  try {
    const res = await fetch('/api/comms/session', { headers: { 'Content-Type': 'application/json' } })
    if (res.ok) {
      const data = await res.json()
      actions.updateStandUpSession(data)
    }
  } catch {}
}, [actions])
```

**Toggle session:**
```js
const toggleSession = useCallback(async () => {
  const newActive = !state.standUpSession?.active
  try {
    const res = await fetch('/api/comms/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: newActive }),
    })
    if (res.ok) {
      const data = await res.json()
      actions.updateStandUpSession(data.session)
    }
  } catch {}
}, [state.standUpSession, actions])
```

**Add session poll** to the existing useEffect (add `fetchSession()` call alongside `fetchMessages()`).

**Add header bar above MessageFeed** inside the main panel:
```jsx
{/* Session Header */}
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 16px',
  borderBottom: '1px solid var(--border-color)',
  backgroundColor: state.standUpSession?.active
    ? 'rgba(16, 185, 129, 0.08)'
    : 'var(--bg-secondary)',
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      backgroundColor: state.standUpSession?.active
        ? 'var(--status-online, #4ade80)'
        : 'var(--status-offline, #6b7280)',
    }} />
    <span style={{
      fontSize: '12px',
      color: state.standUpSession?.active ? 'var(--status-online, #4ade80)' : 'var(--text-muted)',
      fontWeight: 500,
    }}>
      {state.standUpSession?.active ? 'Session Active — Agents can collaborate' : 'Session Inactive'}
    </span>
  </div>
  <button
    onClick={toggleSession}
    style={{
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: 600,
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: state.standUpSession?.active
        ? 'rgba(239, 68, 68, 0.15)'
        : 'rgba(16, 185, 129, 0.15)',
      color: state.standUpSession?.active
        ? 'var(--status-error, #ef4444)'
        : 'var(--status-online, #4ade80)',
      transition: 'all 0.15s',
    }}
  >
    {state.standUpSession?.active ? 'End Session' : 'Start Session'}
  </button>
</div>
```

Place this ABOVE `{error && ...}` and above `<MessageFeed ... />`.

---

## PART 3 — AUTO-RESPONDER SCRIPT UPDATE

**File:** `/home/clawd/sync-server/standup-trigger.sh`

The script already handles Dano-only responses. Add session check:

After detecting a new message, check if it's from an agent (not Dano) — if session is inactive, skip it. If session is active, respond to agent messages too.

Replace the message detection section with:

```bash
# Get latest message (from anyone)
LATEST=$(curl -s "https://api.forgedfinancial.us/api/comms/room?topic=standup&limit=50" \
  -H "x-api-key: $VPS_KEY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
msgs = d.get('messages', [])
# Session file check
import os
try:
    sess = json.load(open('/home/clawd/claude-comms/session.json'))
    session_active = sess.get('active', False)
except:
    session_active = False

# Filter: always respond to Dano. Only respond to others if session is active.
eligible = [m for m in msgs if m.get('from') == 'dano' or session_active]
# Never respond to messages from the responding agents themselves (handled per-agent)
if eligible:
    last = eligible[-1]
    print(last['id'] + '|' + last['from'] + '|' + last['message'][:300])
" 2>/dev/null)
```

Also update `post_agent_response()` to skip if the message is from the same agent:
```bash
# Skip if message is from this agent
if [ "$LAST_FROM" = "$FROM" ]; then
  echo "[$(date -u +%H:%M:%S)] $NAME skipped (own message)"
  return
fi
```

Extract `LAST_FROM` from the pipe-delimited message string (update parsing accordingly).

Also update the last-message tracking file to use `LAST_ID-$LAST_FROM` so each sender's messages are tracked independently.

---

## BUILD CHECKLIST
1. Add session endpoints to `/home/clawd/sync-server/server.js`
2. Create `/home/clawd/claude-comms/session.json`
3. Add `commsSession` to `src/config/api.js`
4. Add `standUpSession` state to `src/context/AppContext.jsx`
5. Update `src/components/tabs/stand-up/StandUpTab.jsx` — session fetch, toggle, header bar
6. Update `/home/clawd/sync-server/standup-trigger.sh` — session-aware triggering
7. Restart ff-sync.service: `sudo systemctl restart ff-sync.service`
8. `cd /home/clawd/command-center-v7 && npm run build` — zero errors
9. Deploy: `CLOUDFLARE_API_TOKEN="jsExsycjXPI0QktmAwsNUsvspvUUSfWN65BghpKC" /home/clawd/.npm-global/bin/wrangler pages deploy dist --project-name command-center-v7 --branch main`
10. `git add -A && git commit -m "feat: Stand-Up Room session mode — Boss-controlled agent collaboration toggle" && git push origin main`

## WHEN DONE
Prepend to `/home/clawd/.openclaw/workspace/SHARED-LOG.md`:
```
### [DATE TIME UTC] | MASON | BUILD | STANDUP SESSION MODE
**What:** Stand-Up Room session mode — Boss-controlled agent collaboration toggle
**Why:** Agents only collaborate when Boss is present and activates the session
**Impact:** New session endpoints, session header UI, script updated for session-aware triggering
**Status:** DONE
**Files changed:** [list]
---
```
