#!/bin/bash
# Monitors Clawd's recent actions and auto-logs to CC
# Designed to run via cron every 15 minutes

LOG="/home/clawd/sync-server/clawd-log.sh"
STATE_FILE="/home/clawd/sync-server/.last-activity-check"

# Get last check timestamp
LAST_CHECK=$(cat "$STATE_FILE" 2>/dev/null || echo "0")
NOW=$(date +%s)
echo "$NOW" > "$STATE_FILE"

# Log agent status changes
STATUS=$(curl -sk https://localhost:443/api/agent-status -H "Authorization: Bearer 8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0" 2>/dev/null)
TASK=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task','idle'))" 2>/dev/null)
AGENT_ST=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)

if [ "$AGENT_ST" = "working" ] && [ -n "$TASK" ] && [ "$TASK" != "null" ] && [ "$TASK" != "idle" ]; then
    $LOG "system" "clawd" "Working: $TASK" "Agent status: $AGENT_ST" "system"
fi

# Check for new sub-agent sessions in last 15 min
SESSIONS_DIR="/home/clawd/.openclaw/agents/main/sessions"
if [ -d "$SESSIONS_DIR" ]; then
    NEW_SESSIONS=$(find "$SESSIONS_DIR" -name "*.jsonl" -newer "$STATE_FILE" -mmin -15 2>/dev/null | wc -l)
    if [ "$NEW_SESSIONS" -gt 0 ]; then
        $LOG "automation" "clawd" "Spawned $NEW_SESSIONS sub-agent session(s)" "Background tasks running" "automation"
    fi
fi
