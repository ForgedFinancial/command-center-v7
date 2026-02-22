# FF Sync Bridge — Setup & API Spec for Clawd

## What This Is
A two-way sync bridge between the local Command Center HTML file and the VPS.
Danny keeps using the CC locally from `file://`. The sync client inside the HTML
polls the VPS every 7 seconds. Clawd pushes updates via HTTP POST.

## VPS Setup Steps

### 1. Copy files to VPS
Upload the `ff-sync-server/` folder to the VPS (e.g., `~/sync-server/`):
- `server.js` — the sync server
- `package.json` — dependencies

### 2. Install & test
```bash
cd ~/sync-server
npm install
export SYNC_API_KEY=$(openssl rand -hex 32)
echo "Your API key: $SYNC_API_KEY"   # SAVE THIS
node server.js
# Should print: FF Sync Server running on port 3737
```

Test locally:
```bash
curl http://localhost:3737/health
```

### 3. Configure Caddy reverse proxy
Add this inside the existing Caddyfile site block (the one on the externally-open port):

```
handle_path /sync/* {
    reverse_proxy localhost:3737
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

Test externally (replace PORT with Caddy's external port):
```bash
curl http://76.13.126.53:PORT/sync/health
```

### 4. Set up systemd service
```bash
sudo cp ff-sync.service /etc/systemd/system/
# Edit the service file: set correct WorkingDirectory and SYNC_API_KEY
sudo nano /etc/systemd/system/ff-sync.service
sudo systemctl daemon-reload
sudo systemctl enable --now ff-sync
sudo systemctl status ff-sync
```

### 5. Tell Danny the URL
Once Caddy is working, the sync URL will be:
```
http://76.13.126.53:<CADDY_PORT>/sync
```
Danny clicks the OFFLINE pill in the CC header and enters this URL + the API key.

---

## API Endpoints

All endpoints are relative to the sync server root.
When accessed via Caddy, prefix with `/sync`.

### GET /health
Health check. No auth required.
```json
{"status":"ok","uptime":123,"updates":45,"lastUpdate":"2026-02-09T15:00:00.000Z"}
```

### GET /api/poll?since=TIMESTAMP
Returns updates since the given ISO timestamp. No auth required (read-only).
```bash
curl "http://localhost:3737/api/poll?since=2026-02-09T10:00:00.000Z"
```
Response:
```json
{
  "updates": [
    {"ts":"...","type":"task","action":"create","source":"clawd","data":{...}},
    {"ts":"...","type":"operator","action":"update","source":"clawd","data":{...}}
  ],
  "serverTime": "2026-02-09T15:30:00.000Z",
  "count": 2
}
```

### POST /api/push
Push a single update. **Auth required** (Bearer token).
```bash
curl -X POST http://localhost:3737/api/push \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task",
    "action": "create",
    "source": "clawd",
    "data": {
      "id": "unique_id_here",
      "title": "Follow up with John Doe",
      "desc": "Email inquiry about home insurance",
      "priority": "high",
      "status": "new_task",
      "category": "insurance",
      "assignee": "danny",
      "createdAt": "2026-02-09T15:30:00.000Z",
      "deadline": null,
      "completedAt": null,
      "scheduledAt": null
    }
  }'
```

### POST /api/batch
Push multiple updates at once. **Auth required**.
```bash
curl -X POST http://localhost:3737/api/batch \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {"type":"operator","action":"update","data":{"id":"openclaw","status":"working","task":"Processing emails"}},
      {"type":"log","action":"create","data":{"id":"log123","ts":"2026-02-09T15:30:00.000Z","type":"task","op":"openclaw","txt":"Processed 12 emails","sub":"3 leads identified","ico":"business"}}
    ]
  }'
```

---

## Data Types & Schemas

### type: "task"
Actions: `create`, `update`, `delete`
```json
{
  "id": "string (required, unique)",
  "title": "string",
  "desc": "string",
  "priority": "critical|high|medium|low",
  "status": "new_task|in_progress|review|done|scheduled",
  "category": "ai|marketing|crm|insurance|drhq",
  "assignee": "danny|openclaw|claude|shary|john",
  "createdAt": "ISO timestamp",
  "deadline": "YYYY-MM-DD or null",
  "completedAt": "ISO timestamp or null",
  "scheduledAt": "ISO timestamp or null"
}
```

### type: "operator"
Actions: `update`
```json
{
  "id": "danny|openclaw|claude|shary|john",
  "status": "working|thinking|idle",
  "task": "string describing current task, or null",
  "subs": [{"name": "sub-agent name", "status": "running|done"}]
}
```

### type: "log"
Actions: `create`
```json
{
  "id": "string (required, unique)",
  "ts": "ISO timestamp",
  "type": "task|research|report|memory|message|note|scheduled",
  "op": "danny|openclaw|claude|shary|john|system",
  "txt": "Main log text",
  "sub": "Subtitle / detail text",
  "ico": "system|success|comms|business|research|memory"
}
```

### type: "note"
Actions: `create`, `update`
```json
{
  "id": "string (required, unique)",
  "content": "Note text",
  "createdAt": "ISO timestamp",
  "from": "openclaw|claude|system",
  "seen": false,
  "seenBy": null,
  "seenAt": null,
  "reply": null
}
```

### type: "document"
Actions: `create`, `update`
```json
{
  "id": "string (required, unique)",
  "title": "Document title",
  "type": "deliverable|report|template",
  "content": "Markdown content",
  "by": "openclaw|claude|shary|john",
  "at": "ISO timestamp"
}
```

### type: "workflow"
Actions: `update`
```json
{
  "id": "string (must match existing workflow ID)",
  "lastRun": "ISO timestamp",
  "nextRun": "ISO timestamp or null",
  "active": true
}
```

### type: "goal"
Actions: `update`
```json
{
  "id": "string (must match existing goal ID)",
  "progress": 75,
  "milestones": [{"text":"milestone name","done":true}, ...],
  "metrics": {"key":"value", ...}
}
```

### type: "memory"
Actions: `create`, `update`
```json
{
  "id": "string",
  "name": "MEMORY.md",
  "type": "longterm|daily|project",
  "icon": "emoji",
  "content": "Markdown content",
  "updatedAt": "ISO timestamp"
}
```

### type: "system"
Actions: `update`
```json
{
  "id": "string (must match existing system ID: ghl, n8n, clickup, etc.)",
  "status": "connected|pending|error",
  "lastAction": "Description of last action",
  "lastActionTime": "ISO timestamp",
  "stats": {"key": "value"}
}
```

---

## Generating IDs
Use this format to match the CC's `gid()` function:
```
timestamp_base36 + random_5_chars
```

Python:
```python
import time, random, string
def gid():
    ts = int(time.time() * 1000)
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
    # Convert timestamp to base36
    chars = '0123456789abcdefghijklmnopqrstuvwxyz'
    result = ''
    n = ts
    while n > 0:
        result = chars[n % 36] + result
        n //= 36
    return result + rand
```

Node.js:
```javascript
const gid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
```

---

## Common Workflows for Clawd

### Update your status (do this frequently!)
```json
POST /api/push
{"type":"operator","action":"update","data":{"id":"openclaw","status":"working","task":"Triaging morning emails"}}
```

### Log what you're doing
```json
POST /api/push
{"type":"log","action":"create","data":{"id":"<gid>","ts":"<now>","type":"task","op":"openclaw","txt":"Email triage complete","sub":"12 processed, 3 leads","ico":"business"}}
```

### Create a task for Danny
```json
POST /api/push
{"type":"task","action":"create","data":{"id":"<gid>","title":"Call back John Doe","desc":"Interested in commercial auto quote","priority":"high","status":"new_task","category":"insurance","assignee":"danny","createdAt":"<now>","deadline":"2026-02-10","completedAt":null,"scheduledAt":null}}
```

### Push a report/document
```json
POST /api/push
{"type":"document","action":"create","data":{"id":"<gid>","title":"Morning Briefing — Feb 9","type":"report","content":"# Morning Briefing\n\n## Highlights\n- 3 new leads overnight\n- Meta Ads CPL down 12%\n...","by":"openclaw","at":"<now>"}}
```

### Mark a task as done
```json
POST /api/push
{"type":"task","action":"update","data":{"id":"EXISTING_TASK_ID","status":"done","completedAt":"<now>"}}
```

### Go idle
```json
POST /api/push
{"type":"operator","action":"update","data":{"id":"openclaw","status":"idle","task":null}}
```
