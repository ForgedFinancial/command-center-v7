# SOREN — CC v7 Wiring Fix Sprint Architecture Brief
**From:** Clawd  
**Priority:** CRITICAL/HIGH across the board  
**Your role:** Produce a complete, Mason-ready fix specification for all 22 wiring gaps  

## FULL AUDIT REPORT
Read this first (Sentinel's complete findings):
/home/clawd/.openclaw/workspace/agents/sentinel/CC-V7-WIRING-AUDIT.md

## YOUR TASK
Produce a grouped, sequenced build spec that Mason can execute top-to-bottom. Group fixes by file/system to minimize context switching. For each group, specify:
- Exact file(s) to edit
- Exactly what to change (line numbers where known)
- Acceptance criteria Sentinel will test against

## THE 22 TASK IDs (all in INTAKE on Ops board)
Critical:
- task-e2d9b668 — [C1] Weather crash
- task-35d6177a — [C2] Mac bridge degradation
- task-f4c328ae — [C3] Pipeline relay reconciliation

Security (treat as Critical priority):
- task-a4d6cabb — [S1/S4] Hardcoded creds to .env
- task-29753d14 — [S2] API key in frontend bundle
- task-11892458 — [S3] Telegram tokens in source

High:
- task-77aa8e9e — [H1] Telegram notification stub
- task-f4df462d — [H2] Document upload stub
- task-6b775dfe — [H3] KB auto-lesson on Sentinel complete
- task-30dba45d — [H4] CalDAV health check cron
- task-d079d4c0 — [H5] CompletedView wrong endpoint
- task-40733b06 — [H6] Stand-Up Room auth headers
- task-5650f588 — [H7] Power Dialer UI

Medium:
- task-83f67585 — [M1] GSheet poller failure alerting
- task-9f3b20f5 — [M2] Notification center polling
- task-1bcc2a84 — [M3] Contact activity timeline
- task-92aa58ec — [M4] Follow-up queue
- task-f1233de7 — [M5] Auth route duplication
- task-8a510d14 — [M6] Taskboard suggestions
- task-33575353 — [L1] Kyle fs bug
- task-093947b6 — [L2/L3] Orphan endpoints + route placement

## SUGGESTED GROUPING FOR MASON
Group by system so Mason can stay in one context:

**Group A — server.js / backend cleanup** (C1, L1, L2/L3, M5, auth)
**Group B — Security / .env migration** (S1, S2, S3, S4)
**Group C — Ops pipeline fixes** (C3, H5, H3)
**Group D — Frontend stub replacements** (H1, H2, H6, M2, M6)
**Group E — CRM data wiring** (M3, M4)
**Group F — CalDAV + polling** (H4, M1)
**Group G — Mac bridge** (C2, H7 — may need Boss to reconnect Mac first)

## KEY ARCHITECTURAL DECISIONS YOU MUST MAKE
1. **C3 — Relay reconciliation**: Keep v2AutoAdvance in tasks.js (preferred) and disable/remove pipeline-relay.js? Or migrate relay to use v2 stage names? Recommend the cleanest path.
2. **S2 — API key removal**: What env var name to use for Cloudflare Pages? How does the frontend handle missing key gracefully?
3. **H7 — Power Dialer**: Full spec for the 4-phase UI (load list → auto-dial → disposition → next). What does it look like? How does it integrate with existing PhoneView tabs?
4. **H3 — KB auto-lesson**: What fields should the auto-generated KB entry contain? How to format Sentinel's inspection result as a KB entry?
5. **.env file management**: Where does the .env live on VPS? Is there already one? How do we load it for the sync-server process?

## OUTPUT
Write your full spec to:
/home/clawd/.openclaw/workspace/agents/soren/plans/CC-V7-FIX-SPRINT-SPEC.md

Format each fix group with:
- Group name + task IDs covered
- Files to edit (with line numbers)
- Step-by-step what to change
- Acceptance criteria for Sentinel
- Estimated risk level (low/medium/high — things that could break other features)

## WHEN DONE
1. Move each task you've specced from INTAKE → SPEC on Ops board:
```bash
for TASK_ID in task-e2d9b668 task-35d6177a task-f4c328ae task-a4d6cabb task-29753d14 task-11892458 task-77aa8e9e task-f4df462d task-6b775dfe task-30dba45d task-d079d4c0 task-40733b06 task-5650f588 task-83f67585 task-9f3b20f5 task-1bcc2a84 task-92aa58ec task-f1233de7 task-8a510d14 task-33575353 task-093947b6; do
  curl -s -X PATCH "https://api.forgedfinancial.us/api/ops/pipeline/tasks/$TASK_ID" \
    -H "Content-Type: application/json" \
    -H "x-api-key: 8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0" \
    -d '{"stage":"SPEC"}' > /dev/null
  echo "Advanced $TASK_ID to SPEC"
done
```
2. Write SHARED-LOG entry
3. Telegram Boss:
```bash
curl -s -X POST "https://api.telegram.org/bot8549625129:AAF0CSoyXFdFru5eEWQ0mflFZJmdquQ1z-k/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"5317054921","text":"📐 Soren — CC v7 Fix Sprint spec COMPLETE.\n\n22 fixes grouped into 7 build batches. Spec at: agents/soren/plans/CC-V7-FIX-SPRINT-SPEC.md\n\nHanding to Mason."}'
```
