#!/bin/bash
# Usage: ./update-status.sh <status> [task] [subs_json]
# status: idle, thinking, working
# task: current task description
# subs_json: JSON array of sub-agents e.g. '[{"name":"GDrive Analyzer","status":"active","job":"Scanning files"}]'
API_KEY=$(cat /home/clawd/sync-server/.api-key)
STATUS=${1:-idle}
TASK=${2:-null}
SUBS=${3:-[]}

if [ "$TASK" = "null" ]; then
  BODY="{\"status\":\"$STATUS\",\"task\":null,\"subs\":$SUBS}"
else
  BODY="{\"status\":\"$STATUS\",\"task\":\"$TASK\",\"subs\":$SUBS}"
fi

curl -sk -X POST https://localhost:443/api/agent-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "$BODY" > /dev/null
