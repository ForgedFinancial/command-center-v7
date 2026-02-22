#!/bin/bash
# Watches for tasks approved via CC review buttons OR moved to done
API_KEY="8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0"
BASE="https://localhost:443"
SEEN_FILE="/home/clawd/sync-server/.done-tasks-seen"
POLL_TS_FILE="/home/clawd/sync-server/.poll-last-ts"

touch "$SEEN_FILE"

# Method 1: Check poll endpoint for review_approve events
LAST_TS=$(cat "$POLL_TS_FILE" 2>/dev/null || echo "2026-02-11T00:00:00Z")
NOW_TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "$NOW_TS" > "$POLL_TS_FILE"

APPROVALS=$(curl -sk "$BASE/api/poll?since=$LAST_TS" -H "Authorization: Bearer $API_KEY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for u in d.get('updates',[]):
    if u.get('action')=='review_approve' and u.get('type')=='ai_request':
        data=u.get('data',{})
        tid=data.get('taskId','')
        title=data.get('title','')
        print(f'{tid}|{title}|APPROVED_VIA_BUTTON')
" 2>/dev/null)

if [ -n "$APPROVALS" ]; then
    while IFS='|' read -r tid title method; do
        if ! grep -q "$tid" "$SEEN_FILE" 2>/dev/null; then
            echo "$tid" >> "$SEEN_FILE"
            echo "NEW_DONE:$tid:$title:APPROVED_VIA_BUTTON"
        fi
    done <<< "$APPROVALS"
fi

# Method 2: Check state for done tasks (catches drag-to-done)
DONE_TASKS=$(curl -sk "$BASE/api/cc-state" -H "Authorization: Bearer $API_KEY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
tasks = d.get('state',{}).get('tasks',[])
for t in tasks:
    if t.get('status') == 'done':
        print(t['id'] + '|' + t.get('title','') + '|' + (t.get('suggestions','') or ''))
" 2>/dev/null)

if [ -n "$DONE_TASKS" ]; then
    while IFS='|' read -r tid title suggestions; do
        if ! grep -q "$tid" "$SEEN_FILE" 2>/dev/null; then
            echo "$tid" >> "$SEEN_FILE"
            echo "NEW_DONE:$tid:$title:$suggestions"
        fi
    done <<< "$DONE_TASKS"
fi
