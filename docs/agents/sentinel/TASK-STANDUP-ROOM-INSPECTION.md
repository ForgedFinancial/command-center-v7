# TASK: Inspect Stand-Up Room Build
**Assigned by:** Clawd (COO)
**Priority:** High
**Date:** 2026-02-20

## WHAT WAS BUILT
Mason built the Stand-Up Room tab for CC v7. Read the spec for acceptance criteria:
`/home/clawd/.openclaw/workspace/agents/kyle/STANDUP-ROOM-BUILD-SPEC-APPROVED.md`

## WHAT TO INSPECT
Repo: `/home/clawd/command-center-v7/`

### Files to check:
1. `functions/api/comms/[[path]].js` — Pages Function proxy for comms API
2. `src/config/constants.js` — STAND_UP tab constant + AGENT_COLORS
3. `src/config/api.js` — commsRoom endpoint
4. `src/api/syncClient.js` — getRoomMessages + sendRoomMessage (must use relative fetch, NOT WORKER_PROXY_URL)
5. `src/context/AppContext.jsx` — standUpMessages state + UPDATE_STANDUP reducer
6. `src/components/layout/TabBar.jsx` — Stand-Up tab right-aligned (marginLeft: auto)
7. `src/components/layout/Shell.jsx` — StandUpTab import + switch case
8. `src/components/tabs/stand-up/StandUpTab.jsx`
9. `src/components/tabs/stand-up/MessageFeed.jsx`
10. `src/components/tabs/stand-up/MessageBubble.jsx`
11. `src/components/tabs/stand-up/RoomInput.jsx`

### Inspection criteria (from spec Section 7):

**Functional:**
- [ ] Stand-Up tab in top bar, right-aligned
- [ ] 2-panel layout (agent sidebar left + message feed right)
- [ ] Agent sidebar lists Clawd, Kyle, Soren, Mason, Sentinel with status dots
- [ ] Status dots default to gray if state.agents unavailable — no crash
- [ ] Messages load from `/api/comms/room?topic=standup` (relative URL, same-origin)
- [ ] Messages display: agent name, color bar, timestamp
- [ ] @mentions highlighted in accent color
- [ ] Dano can send message via RoomInput
- [ ] Sent messages appear immediately (optimistic update)
- [ ] Auto-scroll to bottom on new messages; user can scroll up without being yanked
- [ ] Date separators between messages from different days
- [ ] Empty state: "No messages yet..." text
- [ ] Polling every 15s when tab active, stops when tab inactive

**Style:**
- [ ] ALL styling uses inline style={} — zero CSS files or Tailwind classes
- [ ] ALL colors use CSS variables
- [ ] Layout matches spec wireframe

**Integration:**
- [ ] `npm run build` passes with zero errors
- [ ] ZERO references to `forged-sync.danielruh.workers.dev`
- [ ] comms API calls use relative paths (NOT api.forgedfinancial.us directly in frontend)
- [ ] Pages Function properly proxies to api.forgedfinancial.us with x-api-key header

## HOW TO CHECK BUILD
```bash
cd /home/clawd/command-center-v7
npm run build 2>&1
```

## VERDICT
Issue one of:
- **APPROVED** — all criteria pass, build is clean
- **REJECTED** — list specific failures, fix them, re-run build, re-inspect

If you find issues: fix them directly, re-run build, then mark APPROVED.

## WHEN DONE
Prepend to `/home/clawd/.openclaw/workspace/SHARED-LOG.md`:
```
### [DATE TIME UTC] | SENTINEL | INSPECT | STAND-UP ROOM
**What:** Inspection of Mason's Stand-Up Room build
**Why:** QA gate before considering feature complete
**Impact:** [list what passed/failed/fixed]
**Status:** APPROVED / REJECTED
**Verdict:** [summary]
---
```
