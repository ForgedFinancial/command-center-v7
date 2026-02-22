# Openclaw.ai Integration Guide - Command Center Webhooks

**Version:** 1.0.0
**Last Updated:** February 12, 2026
**API Base URL:** `https://76.13.126.53`
**API Key:** `107077d472faf7fa8fe4ca31fb34483b89c7712a75d484a3c2575c4a6115e630`

---

## Overview

The Command Center now supports **bidirectional communication** with Openclaw. You receive task assignments and must report progress/completion back via webhooks.

### How It Works:

```
1. Danny creates task → Assigns to "openclaw"
2. You receive task details (existing alertOpenClaw mechanism)
3. You work on the task
4. ✨ NEW: You call webhooks to report progress/completion
5. Task auto-moves to Review column
6. Danny gets browser notification
7. Danny approves/rejects your work
```

---

## Authentication

**All API requests require authentication.**

### Headers Required:
```http
Authorization: Bearer 107077d472faf7fa8fe4ca31fb34483b89c7712a75d484a3c2575c4a6115e630
Content-Type: application/json
```

### Example with curl:
```bash
curl -X POST https://76.13.126.53/api/openclaw/complete \
  -H "Authorization: Bearer 107077d472faf7fa8fe4ca31fb34483b89c7712a75d484a3c2575c4a6115e630" \
  -H "Content-Type: application/json" \
  -d '{"taskId":"abc123","result":"Task completed successfully"}'
```

---

## Available Webhooks

### 1. Task Completion ✅

**Endpoint:** `POST /api/openclaw/complete`

**When to call:** When you've finished a task and have results to deliver.

**Request Body:**
```json
{
  "taskId": "string (required)",
  "result": "string (required) - Summary of what you accomplished",
  "documents": [
    {
      "id": "string (optional)",
      "title": "string (required)",
      "content": "string (required) - Full content in markdown",
      "type": "string (optional) - 'report', 'email_draft', 'analysis', etc."
    }
  ],
  "confidence": "number (0-100, optional) - How confident you are in the result",
  "timeSpent": "number (optional) - Seconds spent on task",
  "aiModel": "string (optional) - 'openclaw-v2', 'claude-opus-4', etc.",
  "attachments": [
    {
      "url": "string",
      "filename": "string",
      "type": "string"
    }
  ],
  "nextActions": [
    "string - Suggested follow-up tasks"
  ],
  "error": "string (optional) - If task partially failed, explain here"
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "abc123",
  "status": "moved to review",
  "documentsCreated": 2,
  "timestamp": "2026-02-12T07:30:00.000Z"
}
```

**Example - Research Task:**
```json
{
  "taskId": "task_20260212_001",
  "result": "Research completed. Found 5 IUL carriers with competitive rates for 65yo males.",
  "documents": [
    {
      "title": "IUL Carrier Research - February 2026",
      "content": "# IUL Carrier Research\n\n## Executive Summary\n...",
      "type": "report"
    }
  ],
  "confidence": 95,
  "timeSpent": 180,
  "aiModel": "openclaw-v2",
  "nextActions": [
    "Request illustrations from Pacific Life",
    "Schedule call with client to review options"
  ]
}
```

**Example - Email Draft Task:**
```json
{
  "taskId": "task_20260212_002",
  "result": "Email draft created for client follow-up regarding IUL policy.",
  "documents": [
    {
      "title": "Client Follow-Up Email - John Smith IUL",
      "content": "Subject: Your IUL Policy Options - Pacific Life\n\nDear John,\n\nI wanted to follow up...",
      "type": "email_draft"
    }
  ],
  "confidence": 90,
  "timeSpent": 120,
  "aiModel": "claude-opus-4"
}
```

---

### 2. Progress Updates ⏳

**Endpoint:** `POST /api/openclaw/progress`

**When to call:** During long-running tasks to show you're still working.

**Request Body:**
```json
{
  "taskId": "string (required)",
  "status": "string (required) - 'working', 'thinking', 'researching', etc.",
  "message": "string (required) - What you're doing right now",
  "progress": "number (0-100, optional) - Percentage complete"
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "abc123",
  "timestamp": "2026-02-12T07:30:00.000Z"
}
```

**Example:**
```json
{
  "taskId": "task_20260212_001",
  "status": "researching",
  "message": "Analyzing carrier rates - 3 of 5 carriers complete",
  "progress": 60
}
```

**Best Practice:** Call this every 30-60 seconds during long tasks (>2 minutes).

---

### 3. Error Reporting ❌

**Endpoint:** `POST /api/openclaw/error`

**When to call:** When you encounter an error or can't complete a task.

**Request Body:**
```json
{
  "taskId": "string (required)",
  "error": "string (required) - Error message",
  "details": "string (optional) - Additional context",
  "recoverable": "boolean (optional) - Can this be retried?",
  "suggestedAction": "string (optional) - What Danny should do"
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "abc123",
  "timestamp": "2026-02-12T07:30:00.000Z"
}
```

**Example - API Rate Limit:**
```json
{
  "taskId": "task_20260212_003",
  "error": "API rate limit exceeded",
  "details": "Carrier comparison API returned 429. Will retry in 60 seconds.",
  "recoverable": true,
  "suggestedAction": "Wait 60 seconds, then reassign task"
}
```

**Example - Missing Information:**
```json
{
  "taskId": "task_20260212_004",
  "error": "Insufficient information to complete task",
  "details": "Client's date of birth is required for IUL quote but not provided in task description.",
  "recoverable": true,
  "suggestedAction": "Please add client DOB to task description and reassign"
}
```

---

## Task Assignment Flow

### How You Receive Tasks:

Danny assigns tasks through the existing `alertOpenClaw()` mechanism. Tasks assigned to "openclaw" will have:

```javascript
{
  id: "task_...",
  title: "Task title",
  desc: "Detailed description of what to do",
  priority: "critical" | "high" | "medium" | "low",
  category: "insurance" | "ai" | "marketing" | "crm" | "business",
  deadline: "2026-02-15" (optional),
  expectations: "What Danny expects from you",
  suggestions: "Danny's hints on how to approach this"
}
```

### Your Response Workflow:

1. **Receive Task** → Acknowledge receipt (optional progress call)
2. **Start Work** → Call progress endpoint: `{"status": "working", "message": "Starting research..."}`
3. **During Work** → Update progress every 30-60s for long tasks
4. **Complete or Error:**
   - ✅ Success → Call `/api/openclaw/complete` with results
   - ❌ Failure → Call `/api/openclaw/error` with explanation

---

## Task Categories & Expected Actions

### Insurance Tasks (category: "insurance")

**Common Types:**
- Research carriers/products
- Generate policy illustrations
- Draft client emails
- Compare coverage options
- Create proposal documents

**What to Return:**
- **Documents:** Research reports, comparison tables, email drafts
- **Format:** Markdown with clear headings and bullet points
- **Confidence:** High confidence (90-95%) expected for factual research
- **Next Actions:** Always suggest follow-up steps (e.g., "Schedule client call")

**Example:**
```json
{
  "taskId": "task_001",
  "result": "Completed IUL carrier research for 65yo male, $500K coverage.",
  "documents": [{
    "title": "IUL Carrier Comparison - February 2026",
    "content": "# Top 5 IUL Carriers\n\n## Pacific Life (Recommended)\n- Premium: $8,400/year\n- Assumed rate: 6.5%\n- Guarantees: Strong\n\n## AIG\n- Premium: $8,650/year\n...",
    "type": "report"
  }],
  "confidence": 95,
  "nextActions": [
    "Request formal illustration from Pacific Life",
    "Draft client presentation email"
  ]
}
```

---

### AI/Automation Tasks (category: "ai")

**Common Types:**
- Build automation workflows
- Research AI tools
- Setup integrations
- Create smart templates

**What to Return:**
- **Documents:** Setup guides, workflow diagrams, code snippets
- **Format:** Technical documentation with step-by-step instructions
- **Confidence:** Lower confidence OK (70-80%) for experimental setups
- **Next Actions:** Testing steps, configuration requirements

---

### Marketing Tasks (category: "marketing")

**Common Types:**
- Draft social media posts
- Create ad copy
- Analyze campaign performance
- Research target audiences

**What to Return:**
- **Documents:** Copy variants, performance reports, audience profiles
- **Format:** Creative copy with alternatives, data tables for analytics
- **Confidence:** 85-90% for data analysis, 70-80% for creative copy
- **Next Actions:** A/B test suggestions, posting schedules

---

### CRM Tasks (category: "crm")

**Common Types:**
- Update lead stages
- Draft follow-up sequences
- Generate contact reports
- Analyze pipeline data

**What to Return:**
- **Documents:** Lead summaries, follow-up templates, pipeline reports
- **Format:** Structured data tables, email sequences
- **Confidence:** 90-95% for data operations
- **Next Actions:** Approval for bulk updates, schedule sends

---

## Email Draft Guidelines

When Danny asks you to draft an email:

### Required Elements:
1. **Subject line** - Clear, concise, professional
2. **Greeting** - Use client's name if available
3. **Body** - 2-4 paragraphs, conversational but professional
4. **Call to action** - Clear next step
5. **Signature** - "Danny | Forged Financial"

### Email Draft Format:
```markdown
Subject: [Subject line here]

Dear [Name],

[Opening paragraph - context/reason for email]

[Middle paragraph(s) - main content/value]

[Closing paragraph - call to action]

Best regards,
Danny
Forged Financial
[Phone] | [Email]
```

### Document Type:
- Set `type: "email_draft"` in documents array
- This triggers special email preview UI in Review column
- Danny can approve/edit/reject from the Command Center

### Example Email Task Completion:
```json
{
  "taskId": "task_email_001",
  "result": "Created follow-up email for John Smith regarding his IUL policy options.",
  "documents": [{
    "title": "Follow-Up Email - John Smith IUL Policy",
    "content": "Subject: Your IUL Policy Options - Next Steps\n\nDear John,\n\nThank you for your interest in Index Universal Life insurance. Based on our initial conversation, I've researched several carriers and found some excellent options that align with your goals for wealth accumulation and tax-free retirement income.\n\nPacific Life emerged as the top choice for your situation, offering a competitive premium of $8,400/year with strong guarantees and a 6.5% assumed growth rate. I've attached a detailed comparison of the top 5 carriers for your review.\n\nWould you be available for a 30-minute call this week to walk through these options? I'd like to ensure you understand the features and help you make the best decision for your family's future.\n\nBest regards,\nDanny\nForged Financial\n(555) 123-4567 | danny@forgedfinancial.com",
    "type": "email_draft"
  }],
  "confidence": 88,
  "nextActions": [
    "Schedule call with John Smith",
    "Prepare formal Pacific Life illustration"
  ]
}
```

---

## Error Handling & Recovery

### When to Report Errors:

1. **Missing Information:** Task description lacks critical details
2. **API Failures:** Third-party services unavailable
3. **Invalid Requests:** Task asks for something impossible/unethical
4. **Technical Issues:** Your systems experiencing problems
5. **Ambiguous Instructions:** Task unclear, need clarification

### Recoverable vs. Non-Recoverable:

**Recoverable (`"recoverable": true`):**
- API rate limits (retry later)
- Temporary service outages
- Missing optional information (can proceed with assumptions)
- Partial completion (some results available)

**Non-Recoverable (`"recoverable": false`):**
- Fundamental task impossibility
- Ethical concerns
- Missing critical required data
- Invalid credentials/access

### Error Response Template:
```json
{
  "taskId": "task_xxx",
  "error": "[Clear error message]",
  "details": "[Technical details, logs, context]",
  "recoverable": true/false,
  "suggestedAction": "[What Danny should do next]"
}
```

---

## Best Practices

### 1. Always Set Confidence Levels
- **90-100%:** Factual data, simple research, CRM updates
- **80-89%:** Complex analysis, email drafts, recommendations
- **70-79%:** Creative work, experimental setups, predictions
- **Below 70%:** Indicate uncertainty in result field, explain why

### 2. Provide Actionable Next Steps
- Every completion should suggest 1-3 follow-up tasks
- Be specific: "Schedule call with John Smith" not "Follow up"
- Think ahead: What would Danny logically do next?

### 3. Use Progress Updates Wisely
- Long tasks (>2 min): Update every 30-60 seconds
- Short tasks (<2 min): Optional, only if truly beneficial
- Include meaningful progress: "Analyzing carrier #3 of 5" not just "Working..."

### 4. Document Everything
- Research → Include sources, data, methodology
- Drafts → Provide alternatives, explain choices
- Analysis → Show your work, include raw data
- Recommendations → Explain reasoning, list pros/cons

### 5. Handle Errors Gracefully
- Report errors immediately, don't keep retrying silently
- Include enough detail for Danny to understand the issue
- Suggest solutions, don't just report problems
- If partially complete, still call `/complete` with what you have + error field

---

## Testing Checklist

Before going live, test these scenarios:

- [ ] Complete a simple research task successfully
- [ ] Report progress during a long-running task
- [ ] Handle an API rate limit error (recoverable)
- [ ] Handle missing information error (non-recoverable)
- [ ] Create an email draft with proper formatting
- [ ] Submit a task with multiple documents
- [ ] Include next actions in all completions
- [ ] Test confidence levels (high vs. low)
- [ ] Verify authentication with correct API key
- [ ] Confirm error handling for invalid API key

---

## Example: Full Task Lifecycle

### Task Assignment:
```javascript
{
  id: "task_20260212_001",
  title: "Research top IUL carriers for 65yo male client",
  desc: "Client: John Smith, Age: 65, Coverage: $500K, Goal: Retirement income supplement",
  priority: "high",
  category: "insurance",
  deadline: "2026-02-14",
  expectations: "Find 3-5 carriers, compare premiums and features, recommend top choice",
  suggestions: "Check Pacific Life, AIG, Nationwide - focus on guarantees and cash value growth"
}
```

### Your Workflow:

**Step 1 - Acknowledge (Progress Update):**
```json
POST /api/openclaw/progress
{
  "taskId": "task_20260212_001",
  "status": "working",
  "message": "Starting carrier research for John Smith - analyzing Pacific Life first",
  "progress": 10
}
```

**Step 2 - Midpoint Update:**
```json
POST /api/openclaw/progress
{
  "taskId": "task_20260212_001",
  "status": "researching",
  "message": "Completed 3 of 5 carriers - Pacific Life, AIG, Nationwide analyzed",
  "progress": 60
}
```

**Step 3 - Completion:**
```json
POST /api/openclaw/complete
{
  "taskId": "task_20260212_001",
  "result": "Research complete. Analyzed 5 IUL carriers for 65yo male, $500K coverage. Pacific Life recommended with best combination of premium ($8,400/year), guarantees, and 6.5% assumed rate.",
  "documents": [
    {
      "title": "IUL Carrier Research - John Smith",
      "content": "# IUL Carrier Comparison for John Smith\n\n**Client Profile:**\n- Age: 65\n- Coverage: $500,000\n- Goal: Retirement income supplement\n\n## Executive Summary\nPacific Life offers the optimal combination of competitive pricing, strong guarantees, and growth potential for this client profile.\n\n## Carrier Analysis\n\n### 1. Pacific Life ⭐ (Recommended)\n- **Annual Premium:** $8,400\n- **Assumed Rate:** 6.5%\n- **Guarantees:** A+ rated, strong no-lapse guarantee\n- **Cash Value at Age 80:** $287,000 (projected)\n- **Pros:** Best overall value, excellent customer service, flexible withdrawal options\n- **Cons:** Slightly higher fees than Nationwide\n\n### 2. AIG\n- **Annual Premium:** $8,650\n- **Assumed Rate:** 6.2%\n- **Guarantees:** A rated, moderate no-lapse guarantee\n- **Cash Value at Age 80:** $265,000 (projected)\n- **Pros:** Strong company reputation, good riders available\n- **Cons:** Higher premium, lower assumed rate\n\n### 3. Nationwide\n- **Annual Premium:** $8,200\n- **Assumed Rate:** 6.0%\n- **Guarantees:** A rated, limited no-lapse guarantee\n- **Cash Value at Age 80:** $245,000 (projected)\n- **Pros:** Lowest premium, good for budget-conscious clients\n- **Cons:** Lower growth potential, weaker guarantees\n\n### 4. Lincoln Financial\n- **Annual Premium:** $8,550\n- **Assumed Rate:** 6.3%\n- **Guarantees:** A rated\n- **Cash Value at Age 80:** $272,000 (projected)\n\n### 5. Prudential\n- **Annual Premium:** $8,900\n- **Assumed Rate:** 6.4%\n- **Guarantees:** A+ rated\n- **Cash Value at Age 80:** $280,000 (projected)\n\n## Recommendation\nPacific Life is the best fit for John Smith based on:\n1. Competitive premium relative to benefits\n2. Strong 6.5% assumed rate for cash value growth\n3. A+ financial rating with robust guarantees\n4. Excellent track record with retirement income strategies\n\n## Data Sources\n- Pacific Life: 2026 IUL Rate Sheet (Jan 15, 2026)\n- AIG: Indexed Universal Life Comparison Guide (Feb 1, 2026)\n- Nationwide: IUL Illustration Software (Feb 10, 2026)\n- Lincoln Financial: Agent Portal (Feb 10, 2026)\n- Prudential: Rate Quote (Feb 11, 2026)\n\n*Analysis completed February 12, 2026*",
      "type": "report"
    }
  ],
  "confidence": 95,
  "timeSpent": 240,
  "aiModel": "openclaw-v2",
  "nextActions": [
    "Request formal illustration from Pacific Life for John Smith",
    "Draft client email presenting top 3 options",
    "Schedule call to review recommendations"
  ]
}
```

**Result in Command Center:**
- Task moves from "In Progress" → "Review" column
- Danny receives browser notification: "Task Ready for Review"
- Task card shows "🤖 AI" badge
- Activity log shows: "openclaw completed: Research top IUL carriers..."
- Document created in Documents tab
- Danny can now approve/reject with one click

---

## Support & Troubleshooting

### Common Issues:

**401 Unauthorized:**
- Check API key is correct in Authorization header
- Verify `Bearer ` prefix (note the space)

**400 Bad Request:**
- Validate JSON syntax
- Ensure required fields are present (taskId, result)
- Check data types (confidence should be number, not string)

**500 Internal Server Error:**
- Server issue - check with Danny
- View server logs: `sudo journalctl -u cc-api -n 50`

**Task Not Moving to Review:**
- Verify taskId exactly matches the assigned task
- Check that frontend is polling (every 7 seconds)
- Confirm event appears in queue: `curl https://76.13.126.53/api/poll`

### Testing Endpoints:

**Health Check (no auth required):**
```bash
curl https://76.13.126.53/api/health
```

**Poll Events (no auth required):**
```bash
curl 'https://76.13.126.53/api/poll?since=2026-02-12T00:00:00Z'
```

---

## Questions?

If anything is unclear or you need clarification:
1. Report an error via `/api/openclaw/error` explaining what you need
2. Set the task status to "blocked" in progress updates
3. Include specific questions in the error details

---

**Last Updated:** February 12, 2026
**Document Version:** 1.0.0
**Maintained By:** Danny @ Forged Financial
