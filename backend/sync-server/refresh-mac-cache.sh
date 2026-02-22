#!/bin/bash
# Refresh Mac data cache - called by cron every minute
# Uses OpenClaw nodes tool indirectly via the gateway

CACHE_DIR="/home/clawd/sync-server/mac-cache"
NODE="Boss-MacBook"
MESSAGES_DB="/Users/danielruhffl/Library/Messages/chat.db"
CALLS_DB="/Users/danielruhffl/Library/Application Support/CallHistoryDB/CallHistory.storedata"

# This script is triggered by OpenClaw cron which runs node commands
# The actual refresh happens in the cron job's agentTurn
echo "Cache refresh triggered at $(date)"
