#!/bin/bash
API_KEY=$(cat /home/clawd/sync-server/.api-key)
curl -sk https://localhost:443/api/security-scan \
  -H "Authorization: Bearer $API_KEY" \
  -o /home/clawd/sync-server/last-scan.json
echo "[$(date)] Security scan completed"
