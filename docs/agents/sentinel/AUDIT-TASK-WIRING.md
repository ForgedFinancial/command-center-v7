# SENTINEL AUDIT TASK — CC v7 Full Infrastructure Wiring Audit
**Task Card:** task-6b968723 (Ops Board, QA → BUILDING → BOSS_REVIEW)
**Priority:** HIGH
**Ordered by:** Clawd / Boss (Danny Ruhffl)

## YOUR MISSION
Perform a COMPLETE infrastructure wiring audit of the entire CC v7 system.
Go line by line, file by file. Find everything BUILT but NOT properly wired, connected, or functional.

## STEP 0 — Move card to BUILDING
```bash
curl -s -X PATCH https://api.forgedfinancial.us/api/ops/pipeline/tasks/task-6b968723 \
  -H "Content-Type: application/json" \
  -H "x-api-key: 8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0" \
  -d '{"stage":"BUILDING","assignee":"sentinel"}'
```

## AUDIT SCOPE

### 1. Frontend — /home/clawd/command-center-v7/src/
- Every component: does it fetch from a real endpoint? Is that endpoint live on the backend?
- Every feature flag, toggle, mode switch: fully wired end-to-end?
- Every button/action handler: real API call or stub/TODO/console.log?
- Every useEffect/data fetch: does the endpoint exist on VPS? Returns real data?
- Every service file in src/services/*: are all methods called from the UI?
- src/config/api.js: every ENDPOINT defined — does it exist on the backend?

### 2. Backend — /home/clawd/sync-server/
- Every route file in routes/: is it mounted in server.js?
- Every endpoint: reachable from frontend?
- Every file/data store referenced: does the file/directory actually exist?
- Cron jobs: scheduled and running?
- Environment variables referenced: are they set?

### 3. Daemon System — /opt/forged-daemons/
- daemon.js: every hook, handler, relay connected?
- lib/pipeline-relay.js: every transition rule tested/working?
- systemd services: soren, mason, sentinel all running?

### 4. Data Files
- Every JSON data file referenced in routes: does it exist?
- /home/clawd/.openclaw/data/* — what's there vs what's expected?

### 5. SPECIFIC KNOWN SUSPECTS — check each one explicitly:
1. Knowledge Base auto-lesson write (Sentinel completion → KB entry) — wired?
2. Auto-stage progression: daemon task complete → ops card advance — end-to-end?
3. Taskboard API (/api/taskboard) — mounted in server.js? frontend fetches it?
4. Mac data bridge (port 7890 → vps mac-proxy → CC v7) — any of this live?
5. Google Sheet lead poller — still running? cron active?
6. CalDAV health check cron — running?
7. Twilio browser audio — any TODO stubs in twilioClient.js or TwilioDialer?
8. Stand-Up Room session mode — fully wired?
9. Theme system (22 themes) — all 22 selectable and applied correctly?
10. Power dialer — all 4 phases complete? any dead buttons?
11. CRM Calendar view — reading from iCloud CalDAV or mock?
12. Phone/Messages views — real data or empty state stubs?
13. Notification center — receives real events or placeholder?
14. FilterBar in Ops board — all filters functional?
15. CommentsPanel — endpoint exists, but does it persist correctly to disk?
16. ReviewPanel — reviews endpoint (/api/ops/pipeline/tasks/:id/reviews) — persists reviews?
17. Task Brief fields (tier, specRef, etc) — saved and displayed?
18. Task Lifecycle archive view — actually wired to backend?

## AUDIT COMMANDS (run these)
```bash
# All route mounts in server.js
grep -n "require\|router\|app.use" /home/clawd/sync-server/server.js

# All fetch calls in frontend
grep -rn "fetch(" /home/clawd/command-center-v7/src/ | grep -v node_modules

# All TODO/FIXME/stub markers
grep -rn "TODO\|FIXME\|stub\|placeholder\|mock\|NOT_IMPLEMENTED" /home/clawd/command-center-v7/src/ | grep -v node_modules

# All defined API endpoints
cat /home/clawd/command-center-v7/src/config/api.js

# systemd service status
systemctl status soren.service mason.service sentinel.service --no-pager 2>&1 | head -30

# Cron jobs
crontab -l 2>&1

# What data files exist
find /home/clawd/.openclaw/data -type f | sort
find /home/clawd/claude-comms -type f | sort

# All route files on VPS
ls -la /home/clawd/sync-server/routes/

# Check server.js for all mounts
cat /home/clawd/sync-server/server.js

# Check what endpoints CommentsPanel + ReviewPanel call
grep -n "fetch\|ENDPOINT" /home/clawd/command-center-v7/src/components/tabs/ops/pipeline/CommentsPanel.jsx
grep -n "fetch\|ENDPOINT" /home/clawd/command-center-v7/src/components/tabs/ops/pipeline/ReviewPanel.jsx

# Check if /api/taskboard is mounted
grep -n "taskboard" /home/clawd/sync-server/server.js

# Check mac-proxy
grep -rn "mac-proxy\|mac_proxy\|macProxy\|7890" /home/clawd/sync-server/ 2>/dev/null

# Check Twilio stubs
grep -n "TODO\|stub\|not implemented\|// TODO" /home/clawd/command-center-v7/src/services/twilioClient.js 2>/dev/null

# Check notification system
find /home/clawd/command-center-v7/src -name "*notif*" -o -name "*Notif*" | head -10
grep -rn "notification\|notify" /home/clawd/command-center-v7/src/ | grep -iv "node_modules" | grep -i "fetch\|socket\|poll\|push" | head -20

# Check knowledge auto-write on sentinel completion
grep -n "knowledge\|kb\|KNOWLEDGE" /home/clawd/sync-server/routes/tasks.js | head -20
grep -n "knowledge\|kb\|KNOWLEDGE" /opt/forged-daemons/daemon.js | head -20

# Check Ops auto-stage in tasks.js
grep -n "auto\|advance\|ops.*task\|PATCH.*ops" /home/clawd/sync-server/routes/tasks.js | head -20

# Check all frontend components for empty state only (no real fetch)
grep -rn "useState\(\[\]\)\|useState(null)" /home/clawd/command-center-v7/src/components/tabs/crm/ | head -30

# CRM Calendar — does it call CalDAV?
cat /home/clawd/command-center-v7/src/components/tabs/task-board/calendar/CalendarView.jsx | head -60

# Phone/Messages views
find /home/clawd/command-center-v7/src -name "Phone*" -o -name "Messages*" | head -10

# Theme system — all 22 themes
grep -rn "theme\|Theme" /home/clawd/command-center-v7/src/ | grep -i "22\|count\|length" | head -10
find /home/clawd/command-center-v7/src -name "*theme*" -o -name "*Theme*" | head -15
```

## OUTPUT — Write to this file:
/home/clawd/.openclaw/workspace/agents/sentinel/CC-V7-WIRING-AUDIT.md

### Format:
```
# CC v7 Infrastructure Wiring Audit
**Date:** [date]
**Auditor:** Sentinel (FF-QA-001)
**Scope:** Full CC v7 frontend + VPS backend + daemon system

## EXECUTIVE SUMMARY
[2-3 sentence overview: how many gaps total, how many critical]

## 🔴 CRITICAL — Built but completely unwired/broken
| # | Component | What's built | What's missing | File:Line |
|---|-----------|-------------|----------------|-----------|

## 🟠 HIGH — Partially wired, broken end-to-end
| # | Component | What's built | What's missing | File:Line |

## 🟡 MEDIUM — Wired but degraded (stubs, fallbacks, missing data)
| # | Component | What's built | What's missing | File:Line |

## 🟢 LOW — Minor (dead code, orphan refs, cleanup)
| # | Component | What's built | What's missing | File:Line |

## ✅ CONFIRMED WORKING (spot-checked, end-to-end green)
[bullet list]

## 🔧 RECOMMENDED FIX ORDER (for Mason)
1. [highest impact first]
...
```

## STEP FINAL — When done:
1. Update ops card to BOSS_REVIEW:
```bash
curl -s -X PATCH https://api.forgedfinancial.us/api/ops/pipeline/tasks/task-6b968723 \
  -H "Content-Type: application/json" \
  -H "x-api-key: 8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0" \
  -d '{"stage":"BOSS_REVIEW","assignee":"sentinel"}'
```
2. Write a SHARED-LOG entry to /home/clawd/.openclaw/workspace/SHARED-LOG.md
3. Send Telegram:
```bash
curl -s -X POST "https://api.telegram.org/bot8549625129:AAF0CSoyXFdFru5eEWQ0mflFZJmdquQ1z-k/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"5317054921","text":"🔍 Sentinel — CC v7 Wiring Audit COMPLETE.\n\nFull gap report ready. Review on Ops board (task-6b968723) or check:\n/home/clawd/.openclaw/workspace/agents/sentinel/CC-V7-WIRING-AUDIT.md"}'
```

## RULES
- DO NOT fix anything — audit and report only
- Reference exact file + line number for every finding
- If unsure whether something is wired — CHECK it (run curl, grep, read the file). Never guess.
- Write to the report file as you go — do not wait until the end
- Be exhaustive. Boss said line by line, character by character.
