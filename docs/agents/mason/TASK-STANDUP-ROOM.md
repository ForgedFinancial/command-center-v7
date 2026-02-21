# TASK: Build Stand-Up Room for CC v7
**Assigned by:** Clawd (COO)
**Priority:** High
**Date:** 2026-02-20

## FULL SPEC LOCATION
Read: `/home/clawd/.openclaw/workspace/agents/kyle/STANDUP-ROOM-BUILD-SPEC-APPROVED.md`

## CRITICAL CORRECTIONS (override spec where there is conflict)

### Correction 1: API calls — same-origin proxy
ALL frontend API calls must go through `cc.forgedfinancial.us` (same-origin), NOT directly to `api.forgedfinancial.us`.

Create: `/home/clawd/command-center-v7/functions/api/comms/[[path]].js`

Model it after: `/home/clawd/command-center-v7/functions/api/crm/[[path]].js`

The function should:
- Proxy any request to `/api/comms/*` → `https://api.forgedfinancial.us/api/comms/{path}` (preserve query params)
- Inject header `x-api-key`: env `SYNC_API_KEY` (fallback: `8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0`)
- Forward method, body, all headers
- Return response as-is
- Handle CORS preflight (OPTIONS) the same way the CRM function does

In `src/api/syncClient.js`, `getRoomMessages` and `sendRoomMessage` must use plain `fetch('/api/comms/...')` with relative URLs — do NOT prepend WORKER_PROXY_URL.

### Correction 2: Tab placement — RIGHT side of the top bar
Stand-Up tab must appear on the RIGHT side of the main top bar.

In `src/components/layout/TabBar.jsx`: Add `marginLeft: 'auto'` to the Stand-Up tab wrapper so it floats right.

Visual: [Task Board] [Org Chart] [Workspaces] [CRM] .............. [Stand-Up]

## BUILD CHECKLIST
1. Read full spec
2. Create `functions/api/comms/[[path]].js`
3. Modify `src/config/constants.js` — add STAND_UP + AGENT_COLORS
4. Modify `src/config/api.js` — add commsRoom endpoint
5. Modify `src/api/syncClient.js` — add getRoomMessages + sendRoomMessage (relative fetch)
6. Modify `src/context/AppContext.jsx` — add standUpMessages state
7. Modify `src/components/layout/TabBar.jsx` — Stand-Up right-aligned
8. Modify `src/components/layout/Shell.jsx` — import + render StandUpTab
9. Create `src/components/tabs/stand-up/StandUpTab.jsx`
10. Create `src/components/tabs/stand-up/MessageFeed.jsx`
11. Create `src/components/tabs/stand-up/MessageBubble.jsx`
12. Create `src/components/tabs/stand-up/RoomInput.jsx`
13. `cd /home/clawd/command-center-v7 && npm run build` — must pass with zero errors
14. `git add -A && git commit -m "feat: Stand-Up Room tab — multi-agent comms channel" && git push origin main`

## STYLE RULES
- Inline styles ONLY — no CSS files, no Tailwind
- All colors via CSS variables

## WHEN DONE
Prepend to `/home/clawd/.openclaw/workspace/SHARED-LOG.md`:
```
### [DATE TIME UTC] | MASON | BUILD | STAND-UP ROOM
**What:** Built Stand-Up Room tab for CC v7
**Why:** Multi-agent comms channel per approved spec + corrections
**Impact:** New tab (right side), 4 components, Pages Function comms proxy, deployed
**Status:** DONE
**Files changed:** [list all]
---
```
