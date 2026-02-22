#!/bin/bash
# Clawd Activity Logger — pushes to CC activity log
# Usage: clawd-log.sh <type> <operation> <text> [subtitle] [icon]
# Types: system, automation, api, sync, backend, cron, security, business, comms
# Icons: system, api, automation, sync, cron, security, business, comms, alert

API_KEY="8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0"
BASE="https://localhost:443"

TYPE="${1:-system}"
OP="${2:-clawd}"
TXT="${3:-Activity logged}"
SUB="${4:-}"
ICO="${5:-system}"
ID="log-$(date +%s)-$RANDOM"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

curl -sk -X POST "$BASE/api/push" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"log\",\"action\":\"add\",\"data\":{\"id\":\"$ID\",\"ts\":\"$TS\",\"type\":\"$TYPE\",\"op\":\"$OP\",\"txt\":\"$TXT\",\"sub\":\"$SUB\",\"ico\":\"$ICO\",\"col\":\"backend\"}}" > /dev/null 2>&1

echo "Logged: $TXT"
