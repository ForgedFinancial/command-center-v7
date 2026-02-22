# Openclaw Quick Reference Card

## API Credentials
```
Base URL: https://76.13.126.53
API Key: 107077d472faf7fa8fe4ca31fb34483b89c7712a75d484a3c2575c4a6115e630
```

## Essential Headers
```http
Authorization: Bearer 107077d472faf7fa8fe4ca31fb34483b89c7712a75d484a3c2575c4a6115e630
Content-Type: application/json
```

---

## 3 Webhook Endpoints

### 1️⃣ Complete Task
```bash
POST /api/openclaw/complete
```
```json
{
  "taskId": "task_xxx",
  "result": "What I accomplished",
  "documents": [{
    "title": "Document Title",
    "content": "Full markdown content",
    "type": "report" | "email_draft" | "analysis"
  }],
  "confidence": 95,
  "timeSpent": 180,
  "nextActions": ["Next step 1", "Next step 2"]
}
```

### 2️⃣ Update Progress
```bash
POST /api/openclaw/progress
```
```json
{
  "taskId": "task_xxx",
  "status": "working",
  "message": "What I'm doing now",
  "progress": 60
}
```

### 3️⃣ Report Error
```bash
POST /api/openclaw/error
```
```json
{
  "taskId": "task_xxx",
  "error": "What went wrong",
  "recoverable": true,
  "suggestedAction": "What Danny should do"
}
```

---

## Workflow

```
1. Receive task → assigned to "openclaw"
2. Start working → POST /progress {"status": "working"}
3. During long tasks → POST /progress every 30-60s
4. When done:
   ✅ Success → POST /complete with results
   ❌ Failure → POST /error with explanation
5. Task auto-moves to Review → Danny gets notified
```

---

## Document Types

- `"report"` - Research, analysis, comparisons
- `"email_draft"` - Client emails (shows special preview)
- `"analysis"` - Data analysis, metrics
- `"proposal"` - Client proposals, presentations
- `"guide"` - How-to, setup instructions

---

## Confidence Levels

- **90-100%:** Facts, data, CRM updates
- **80-89%:** Email drafts, recommendations
- **70-79%:** Creative work, experiments
- **<70%:** High uncertainty, explain in result

---

## Always Include

✅ **taskId** - Exact match from assignment
✅ **result** - Clear summary of what you did
✅ **confidence** - How sure you are (0-100)
✅ **nextActions** - What should happen next (1-3 items)

---

## Email Draft Template

```markdown
Subject: [Clear subject line]

Dear [Name],

[Context/reason for email]

[Main content/value]

[Call to action]

Best regards,
Danny
Forged Financial
```

Set `type: "email_draft"` for special UI!

---

## Error Examples

**Missing Info:**
```json
{
  "error": "Client DOB required for quote",
  "recoverable": true,
  "suggestedAction": "Add DOB to task description"
}
```

**API Failure:**
```json
{
  "error": "API rate limit exceeded",
  "recoverable": true,
  "suggestedAction": "Wait 60s and reassign"
}
```

---

## Testing Commands

```bash
# Health check
curl https://76.13.126.53/api/health

# Poll events
curl 'https://76.13.126.53/api/poll?since=2026-02-12T00:00:00Z'

# Complete test task
curl -X POST https://76.13.126.53/api/openclaw/complete \
  -H "Authorization: Bearer 107077d472faf7fa8fe4ca31fb34483b89c7712a75d484a3c2575c4a6115e630" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test_123",
    "result": "Test completed successfully",
    "confidence": 95
  }'
```

---

## Task Categories

- **insurance** - Carrier research, quotes, client emails
- **ai** - Automation, integrations, tool research
- **marketing** - Ads, social media, copy
- **crm** - Lead updates, follow-ups, pipeline
- **business** - General operations, admin

---

## Priority Handling

- **critical** - Drop everything, respond ASAP
- **high** - Complete within hours
- **medium** - Complete within day
- **low** - Complete when time permits

---

## Pro Tips

💡 Always suggest next actions - think ahead for Danny
💡 Include sources/data in research tasks
💡 For emails: provide 2-3 subject line options
💡 Update progress on tasks >2 minutes
💡 Report errors immediately, don't retry silently
💡 Use markdown formatting in documents
💡 Set realistic confidence levels
💡 Test with simple task first before production

---

**Full Documentation:** OPENCLAW_INTEGRATION.md
