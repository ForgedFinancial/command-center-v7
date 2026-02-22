#!/bin/bash
# Stand-Up Room auto-responder
# Uses openclaw agent --local --json to get clean text, script posts it
# Session-aware: always responds to Dano, only responds to agents if session is active

VPS_KEY="8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0"
LOCKFILE="/tmp/standup-trigger.lock"
LASTMSG_FILE="/tmp/standup-last-msg.txt"

# Stale lock check (5 min)
if [ -f "$LOCKFILE" ]; then
  AGE=$(( $(date +%s) - $(stat -c %Y "$LOCKFILE" 2>/dev/null || echo 0) ))
  [ "$AGE" -lt 300 ] && exit 0
fi
touch "$LOCKFILE"
trap "rm -f $LOCKFILE" EXIT

# Get latest eligible message (Dano always, agents only if session active)
LATEST=$(curl -s "https://api.forgedfinancial.us/api/comms/room?topic=standup&limit=50" \
  -H "x-api-key: $VPS_KEY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
msgs = d.get('messages', [])

# Session file check
try:
    sess = json.load(open('/home/clawd/claude-comms/session.json'))
    session_active = sess.get('active', False)
except:
    session_active = False

# Filter: always respond to Dano. Only respond to others if session is active.
eligible = [m for m in msgs if m.get('from') == 'dano' or session_active]
if eligible:
    last = eligible[-1]
    print(last['id'] + '|' + last['from'] + '|' + last['message'][:300])
" 2>/dev/null)

[ -z "$LATEST" ] && exit 0

LAST_ID=$(echo "$LATEST" | cut -d'|' -f1)
LAST_FROM=$(echo "$LATEST" | cut -d'|' -f2)
LAST_MSG=$(echo "$LATEST" | cut -d'|' -f3-)

PREV_ID=$(cat "$LASTMSG_FILE" 2>/dev/null)
[ "$LAST_ID" = "$PREV_ID" ] && exit 0

echo "$LAST_ID" > "$LASTMSG_FILE"
echo "[$(date -u +%H:%M:%S)] Responding to $LAST_FROM: $LAST_MSG"

ANTHROPIC_KEY=$(cat /home/clawd/.openclaw/agents/soren/agent/auth-profiles.json \
  | python3 -c "import json,sys; p=json.load(sys.stdin); print(list(p['profiles'].values())[0]['token'])")

post_agent_response() {
  local AGENT="$1"
  local FROM="$2"
  local NAME="$3"
  local SID

  # Skip if message is from this agent
  if [ "$LAST_FROM" = "$FROM" ]; then
    echo "[$(date -u +%H:%M:%S)] $NAME skipped (own message)"
    return
  fi

  SID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")

  RESULT=$(ANTHROPIC_API_KEY="$ANTHROPIC_KEY" openclaw agent \
    --local --agent "$AGENT" --session-id "$SID" --json \
    --message "$LAST_FROM just posted in the Stand-Up Room: \"$LAST_MSG\"

Reply as $NAME in 1-3 sentences, in character. Output only your reply — no preamble, no formatting, just the message text." \
    --timeout 60 2>&1)

  RESPONSE=$(echo "$RESULT" | python3 -c "
import json, sys
try:
    d = json.loads(sys.stdin.read())
    payloads = d.get('payloads', [])
    if payloads:
        print(payloads[0].get('text', '').strip())
except:
    pass
" 2>/dev/null)

  if [ -n "$RESPONSE" ]; then
    SAFE=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))")
    curl -s "https://api.forgedfinancial.us/api/comms/send" -X POST \
      -H "x-api-key: $VPS_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"from\":\"$FROM\",\"to\":\"standup\",\"message\":$SAFE,\"topic\":\"standup\"}" > /dev/null
    echo "[$(date -u +%H:%M:%S)] $NAME posted"
  else
    echo "[$(date -u +%H:%M:%S)] $NAME — no response"
  fi
}

post_agent_response "soren" "soren" "Soren" &
post_agent_response "mason" "mason" "Mason" &
post_agent_response "sentinel" "sentinel" "Sentinel" &

# Kyle participates when his node is online
KYLE_ONLINE=$(python3 -c "
import json
try:
    d = json.load(open('/home/clawd/claude-comms/kyle-online.json'))
    print('yes' if d.get('active') else 'no')
except:
    print('no')
" 2>/dev/null)

if [ "$KYLE_ONLINE" = "yes" ] && [ "$LAST_FROM" != "kyle" ]; then
  # Kyle gets his identity context injected since he's not a full VPS agent
  KYLE_SOUL=$(cat /home/clawd/.openclaw/workspace/agents/kyle/STANDUP-SOUL.md 2>/dev/null | head -30)
  SID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")
  KYLE_RESULT=$(ANTHROPIC_API_KEY="$ANTHROPIC_KEY" openclaw agent \
    --local --agent kyle --session-id "$SID" --json \
    --message "You are Kyle — Forged Financial's Desktop Agent on Boss's Windows machine. Context: $KYLE_SOUL

$LAST_FROM just posted in the Stand-Up Room: \"$LAST_MSG\"

Reply as Kyle in 1-3 sentences — direct, practical, ground-level perspective. Output only your reply text, nothing else." \
    --timeout 60 2>&1)
  KYLE_RESPONSE=$(echo "$KYLE_RESULT" | python3 -c "
import json, sys
try:
    d = json.loads(sys.stdin.read())
    payloads = d.get('payloads', [])
    if payloads:
        print(payloads[0].get('text', '').strip())
except:
    pass
" 2>/dev/null)
  if [ -n "$KYLE_RESPONSE" ]; then
    SAFE=$(echo "$KYLE_RESPONSE" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))")
    curl -s "https://api.forgedfinancial.us/api/comms/send" -X POST \
      -H "x-api-key: $VPS_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"from\":\"kyle\",\"to\":\"standup\",\"message\":$SAFE,\"topic\":\"standup\"}" > /dev/null
    echo "[$(date -u +%H:%M:%S)] Kyle posted"
  fi &
fi

wait
echo "[$(date -u +%H:%M:%S)] All done"
