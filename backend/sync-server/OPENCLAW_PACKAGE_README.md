# Openclaw.ai Integration Package

This folder contains everything Openclaw needs to integrate with your Command Center webhook system.

---

## 📦 Package Contents

### 1. **OPENCLAW_INTEGRATION.md** ⭐ Main Documentation
   - **What:** Complete integration guide with detailed explanations
   - **For:** Full implementation reference
   - **Length:** ~15 pages with examples
   - **Use when:** Building the integration, troubleshooting, understanding workflows

### 2. **OPENCLAW_QUICK_REFERENCE.md** ⚡ Quick Reference
   - **What:** Condensed cheat sheet with essential info
   - **For:** Daily reference during development
   - **Length:** 2 pages
   - **Use when:** Quick lookups, remembering endpoint formats

### 3. **openclaw-test.py** 🧪 Test Script
   - **What:** Python script to test all webhook endpoints
   - **For:** Verifying integration is working
   - **Usage:** `python3 openclaw-test.py`
   - **Use when:** Initial setup, troubleshooting, before going live

### 4. **server.js** 🔧 Backend Server (already deployed)
   - **What:** The API server handling webhooks
   - **Location:** Running on VPS at ~/sync-server/server.js
   - **Status:** ✅ Active on port 443
   - **Use when:** Reference implementation, debugging

---

## 🚀 Getting Started - 3 Steps

### Step 1: Read the Docs (15 min)
```bash
# Start with the main guide
open OPENCLAW_INTEGRATION.md

# Keep the quick reference handy
open OPENCLAW_QUICK_REFERENCE.md
```

**Focus on these sections first:**
- Overview (how the system works)
- Authentication (API key setup)
- Available Webhooks (3 endpoints)
- Task Assignment Flow (your workflow)

### Step 2: Run the Test Script (5 min)
```bash
# Make executable
chmod +x openclaw-test.py

# Run all tests
python3 openclaw-test.py
```

**Expected output:**
```
✅ PASS - Health Check
✅ PASS - Progress Update
✅ PASS - Task Completion (Report)
✅ PASS - Task Completion (Email Draft)
✅ PASS - Recoverable Error
✅ PASS - Non-Recoverable Error
✅ PASS - Poll Events
✅ PASS - Invalid Auth (Security)

Results: 8/8 tests passed
🎉 All tests passed!
```

### Step 3: Process Your First Real Task (10 min)

1. **Danny creates a test task** in Command Center, assigns to "openclaw"
2. **You receive the task** via existing alertOpenClaw mechanism
3. **You complete the task** and call the webhook:
   ```python
   import requests

   response = requests.post(
       "https://76.13.126.53/api/openclaw/complete",
       headers={
           "Authorization": "Bearer 107077d472faf7fa8fe4ca31fb34483b89c7712a75d484a3c2575c4a6115e630",
           "Content-Type": "application/json"
       },
       json={
           "taskId": "the_actual_task_id",
           "result": "What you accomplished",
           "confidence": 90
       },
       verify=False  # Self-signed cert
   )
   print(response.json())
   ```
4. **Verify in Command Center:**
   - Task moves to Review column ✅
   - Browser notification appears ✅
   - AI badge shows on task card ✅
   - Activity log updated ✅

---

## 📡 API Quick Info

**Base URL:** `https://76.13.126.53`

**API Key:** `107077d472faf7fa8fe4ca31fb34483b89c7712a75d484a3c2575c4a6115e630`

**Endpoints:**
- `POST /api/openclaw/complete` - Report task completion
- `POST /api/openclaw/progress` - Update task progress
- `POST /api/openclaw/error` - Report errors
- `GET /api/health` - Health check (no auth)
- `GET /api/poll` - View event queue (no auth)

**Required Header:**
```
Authorization: Bearer 107077d472faf7fa8fe4ca31fb34483b89c7712a75d484a3c2575c4a6115e630
```

---

## 🔄 Typical Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. RECEIVE TASK                                            │
│     Danny assigns task to "openclaw"                        │
│     You get task details via alertOpenClaw()                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. START WORKING                                           │
│     POST /api/openclaw/progress                             │
│     {"status": "working", "message": "Starting research"}   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. UPDATE PROGRESS (for long tasks)                        │
│     POST /api/openclaw/progress every 30-60s                │
│     {"status": "researching", "progress": 60}               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4A. SUCCESS PATH                                           │
│      POST /api/openclaw/complete                            │
│      Include: result, documents, confidence, nextActions    │
│                                                             │
│  4B. ERROR PATH                                             │
│      POST /api/openclaw/error                               │
│      Include: error, recoverable, suggestedAction           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  5. AUTOMATIC RESULT                                        │
│     ✅ Task moves to Review column                          │
│     ✅ Danny gets browser notification                      │
│     ✅ Activity logged in Command Center                    │
│     ✅ Documents created (if provided)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Document Types

When completing tasks, set the appropriate document type:

| Type | Use For | Shows In |
|------|---------|----------|
| `report` | Research, analysis, comparisons | Documents tab |
| `email_draft` | Client emails | Review column (special preview) |
| `analysis` | Data analysis, metrics | Documents tab |
| `proposal` | Client proposals | Documents tab |
| `guide` | How-to, setup instructions | Documents tab |

**Special:** `email_draft` shows a preview with Approve/Edit/Reject buttons in the Review column!

---

## 🎯 Task Categories

| Category | Common Tasks | Expected Output |
|----------|--------------|-----------------|
| `insurance` | Carrier research, quotes, client emails | Reports, comparisons, email drafts |
| `ai` | Automation, integrations | Setup guides, workflow diagrams |
| `marketing` | Ads, social media | Copy variants, performance reports |
| `crm` | Lead updates, follow-ups | Contact summaries, email sequences |
| `business` | General operations | Varies |

---

## ⚠️ Important Notes

### Authentication
- **Always** include the `Authorization: Bearer` header
- API returns `401 Unauthorized` if missing/wrong
- No exceptions - all endpoints except `/health` and `/poll` require auth

### Task IDs
- Must **exactly match** the ID from task assignment
- Case-sensitive, no spaces
- Wrong ID = task won't move to Review

### Confidence Levels
- Be honest - don't inflate confidence
- 90-100%: Facts, data
- 80-89%: Drafts, recommendations
- 70-79%: Creative, experimental
- <70%: High uncertainty

### Next Actions
- **Always provide** 1-3 suggested next steps
- Be specific: "Schedule call with John Smith" not "Follow up"
- Think ahead: What would Danny logically do next?

### Progress Updates
- Long tasks (>2 min): Update every 30-60s
- Short tasks (<2 min): Optional
- Include meaningful info: "Analyzing carrier 3 of 5" not "Working..."

### Error Reporting
- Report immediately, don't retry silently
- Set `recoverable: true/false` appropriately
- Always suggest a solution in `suggestedAction`

---

## 🧪 Testing Checklist

Before processing real tasks, verify:

- [ ] Health endpoint returns 200 OK
- [ ] Can complete a simple test task
- [ ] Progress updates work during long tasks
- [ ] Error reporting works (both recoverable and non-recoverable)
- [ ] Email drafts create special preview UI
- [ ] Multiple documents can be submitted
- [ ] Next actions appear in Review column
- [ ] Confidence levels display correctly
- [ ] Invalid API key returns 401
- [ ] Task moves to Review after completion

Run `python3 openclaw-test.py` to test all of these automatically!

---

## 🐛 Troubleshooting

### "401 Unauthorized"
- Check API key is correct
- Verify `Bearer ` prefix (with space)
- Ensure header key is `Authorization` (capital A)

### "Task not moving to Review"
- Confirm taskId exactly matches assignment
- Check frontend is polling (every 7 seconds)
- Verify event in queue: `curl https://76.13.126.53/api/poll`

### "Connection refused"
- Server may be down
- Check: `ssh clawd@100.71.72.127 "sudo systemctl status cc-api"`
- Restart: `sudo systemctl restart cc-api`

### "SSL Certificate Error"
- Expected with self-signed cert
- In Python: Use `verify=False`
- In curl: Use `-k` flag

---

## 📞 Support

If you encounter issues:

1. **Check server logs:**
   ```bash
   ssh clawd@100.71.72.127 "sudo journalctl -u cc-api -n 50"
   ```

2. **Test health endpoint:**
   ```bash
   curl https://76.13.126.53/api/health
   ```

3. **Report error via webhook:**
   ```python
   # Let Danny know you're blocked
   POST /api/openclaw/error
   {
     "taskId": "current_task",
     "error": "What's blocking you",
     "suggestedAction": "What Danny should check"
   }
   ```

---

## 🎉 You're Ready!

Once the test script passes all 8 tests, you're ready to start processing real tasks.

**Remember:**
- ✅ Always authenticate with API key
- ✅ Always provide next actions
- ✅ Always set realistic confidence
- ✅ Report errors immediately
- ✅ Update progress on long tasks
- ✅ Include sources/data in research

**Good luck! 🚀**

---

**Questions?** Refer to the full docs in `OPENCLAW_INTEGRATION.md`
