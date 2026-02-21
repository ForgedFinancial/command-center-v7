# CRM Pipelines & Workflows — Boss's Full Specification
# Received: Feb 19, 2026

## CRM-WIDE FEATURES

### Feature 1: Message Approval Gate
- Before ANY automated message sends, agent sees notification banner with: message content, recipient, APPROVE/DECLINE buttons
- DECLINE → cancelled + logged
- No action → stays queued (does NOT send)
- Settings Toggle: "Auto-Send Client Messages" (OFF by default)
- ON toggle shows confirmation dialog warning

### Feature 2: Visual Workflow Builder
- Drag-and-drop, no-code flowchart builder
- Node types: Trigger (green), Wait/Timer (yellow), Condition (blue diamond), Action (gray), Approval Gate (orange)
- Each node clickable to edit content
- Can view, edit, add/remove nodes, duplicate workflows, toggle ON/OFF
- Each pipeline has "Workflows" tab
- Global "All Workflows" view in Settings

---

## PIPELINE 1: LM | Lead Management (6 stages)

### Stage 1: NEW LEAD (0-3 days)
**System:**
- Creates opportunity, assigns owner, sets TAG | New Lead |
- Sends speed-to-lead SMS (through approval gate): "Hi [Name], this is [Agent Name] with [Company]. I'll be giving you a call shortly regarding your inquiry. Talk soon!"
- Optional intro email
- Push notification + SMS to agent with lead summary
- If lead replies: TAG | REPLY NEEDED |, notify agent, auto-move → Contact
- If NO interaction after 3 days: auto-move → Contact

**Agent:**
- Reach out within 5 minutes
- Make initial contact attempt, document in activity feed
- If interested → Engaged Interest
- If SSN provided → Qualified Interest
- If appointment set → Engaged Interest (or Qualified if SSN on file)

### Stage 2: CONTACT (0-4 days)
**System:**
- Sets TAG | Contact |
- If lead replied + agent hasn't responded 24h: TAG | Overdue-24h |, SMS reminder
- Escalating tags: | Overdue-48h |, | Overdue-72h |
- Agent responds → remove | REPLY NEEDED |
- 4 days no contact + insufficient attempts: notification to agent
- 4 days total no contact: auto-move → Long Term Nurture + farewell SMS

**Agent:**
- Continue outreach at different times
- Document every attempt
- Contact + interest → Engaged Interest
- Contact + SSN → Qualified Interest
- Contact + appointment → Engaged Interest (or Qualified)
- "Not interested" → Long Term Nurture (tagged with reason)

### Stage 3: ENGAGED INTEREST (0-14 days)
**System:**
- Sets TAG | Engaged Interest |
- Sends interest-gauge SMS (through approval gate)
- 14 days no interaction + no app: auto-move → Long Term Nurture + dialer recycle

**Agent:**
- High-touch follow-up
- SSN provided → Qualified Interest
- Goes cold → Long Term Nurture
- Appointment → book on calendar

### Stage 4: QUALIFIED INTEREST (0-7 days)
**Required field:** Social Security Number
**System:**
- Sets TAG | Qualified Interest |
- After 48h: automated check-in SMS
- 7 days no interaction + no app: auto-move → Long Term Nurture + dialer recycle

**Agent:**
- Prioritize — hot prospect
- Aggressive follow-up
- App started → Application Process
- Silent/lost interest → Long Term Nurture

### Stage 5: APPLICATION PROCESS (0-11 days, resets on engagement)
**Required fields:** Carrier, Product, Price, Health Status
**System:**
- Sets TAG | Application Process |
- ANY lead engagement resets ALL timers
- 24h no activity: check-in SMS with carrier/product/price details
- 11 days total no contact: auto-move → Long Term Nurture

**Agent:**
- Fill required fields
- Walk lead through application
- App submitted → Closed Won
- Lead ghosts → Long Term Nurture

### Stage 6: CLOSED WON
**Required fields:** Carrier, Product, Price, Health Status, Coverage Amount
**System:**
- Sets TAG | Closed |
- 7-min buffer for agent notes
- Sends "Closed | Submission Reminder" SMS: introduces agent name + personal phone, work number, save both, automated alerts info
- Transfers fields to policy tracking
- Creates opportunity in AP | Approval Process → Submitted
- Deletes from LM pipeline (only after confirming data transfer)
- 5 min after transfer: congratulations SMS with full details

**Agent:**
- Fill ALL required fields
- Review accuracy
- Done with Lead Management

---

## PIPELINE 2: AP | Approval Process (2 stages)
**Required to enter:** Policy #/App ID, Premium, Carrier, Coverage, Draft Date, Payment Method, Health Status & E-Policy Packet PDF

### Stage 1: SUBMITTED
**System:**
- Sets TAG | Submitted |
- If client has TAG | Approved as Applied | → bypass to PL | Policy Lifecycle → Approved
- Email parser auto-updates if set up

**Agent:**
- Confirm submission with carrier
- Manual updates if no email parser
- UW begins → move to Underwriting/Requirements

### Stage 2: UNDERWRITING / REQUIREMENTS
**System:**
- Sets TAG | UW & Requirements |
- Email parser auto-notifies on carrier updates
- Carrier declines → move to Rewrite | Rejected → Rewrite
- Creates task: "Requirements review — same day"
- Recurring task: "Requirement chase — every 72 hours"

**Agent:**
- Review requirements same day
- Chase every 72h
- Carrier approves → PL | Policy Lifecycle → Approved
- Carrier declines → Rewrite | Rejected → Rewrite

---

## PIPELINE 3: PL | Policy Lifecycle (4 stages)
**Required to enter:** Policy #/App ID, Premium, Carrier, Coverage, Draft Date, Payment Method, Health Status & E-Policy Packet PDF

### Stage 1: APPROVED
**System:**
- Sets TAG | Approved |
- SMS: approval congratulations + agent reaching out
- Schedules delivery follow-up task

**Agent:**
- Deliver policy (call/video/in-person)
- Confirm banking/draft date
- Walk through coverage
- Delivery complete → Delivered + TAG | Policy Delivered |

### Stage 2: DRAFT CLEARED
**System:**
- Sets TAG | Draft Cleared |
- SMS: first payment confirmed

**Agent:**
- Confirm first draft cleared
- Draft FAILED → RE | Retention Exceptions → New Exception

### Stage 3: DELIVERED
**System:**
- Sets TAG | Delivered |
- Field validations: draft date, payment method, policy #
- Draft within 7 days: pre-draft confirmation task

**Agent:**
- Verify all fields complete
- Pre-draft touch call if within 7 days
- Everything checks out → In Force

### Stage 4: IN FORCE
**System:**
- Sets TAG | In Force |
- Adds to cohort tracking
- Moves to Active | Inforce Clients → Month 1
- Starts persistency monitoring

**Agent:**
- Confirm policy truly in force
- Done with Policy Lifecycle

---

## PIPELINE 4: RE | Retention Exceptions (4 stages)

> **Condensed from 7 → 4 stages (Feb 19, 2026)**
> - Payment Recovery + Retention Requirements → merged into Active Recovery
> - Lapse Risk → tag within Active Recovery (not a standalone stage)
> - Unreachable → tag within Active Recovery (not a standalone stage)

### Stage 1: NEW EXCEPTION (Intake & Triage)
**System:**
- Creates opportunity, auto-assigns to writing agent
- Sets TAG | New Exception |, [Exception Type] field
- Agent SMS alert, 4-hour timer for second alert
- 24h no movement → TAG | Overdue |

**Agent:**
- Review within 4 hours
- Verify exception type and client info
- Move to Active Recovery

### Stage 2: ACTIVE RECOVERY (Work the Case)
**Merges:** Payment Recovery, Retention Requirements, Lapse Risk, Unreachable

**System:**
- Sets TAG | Active Recovery |
- Creates "Call client today" task
- Client SMS about the issue
- Escalating timers with tags:
  - **24h** → TAG | Overdue-24h |
  - **48h** → TAG | Overdue-48h |
  - **72h** → TAG | Overdue-72h | + **manager alert**
  - **7 days** → TAG | Client Risk |
  - **14 days** → TAG | URGENT | + **manager alert**
  - **30 days** → auto-move → Terminated
- **Lapse Risk cases:** Tagged | Lapse Risk | within this stage — same escalation ladder, same urgency, no separate stage needed
- **Unreachable cases:** After 5+ contact attempts with no response → TAG | Unreachable |, final voicemail + SMS sent, 7 more days no response → auto-move → Terminated

**Agent:**
- Call same day
- Fix payment issue / send update form / address retention concern
- "Want to cancel" → retention script → still no → Terminated
- Billing fixed + carrier confirms → Resolved

### Stage 3: RESOLVED (Policy Saved)
**System:**
- Sets TAG | Resolved |, removes all escalation tags (Overdue, Client Risk, URGENT, Lapse Risk, Unreachable)
- Sets [Exception Outcome] field
- Agent confirmation SMS, client confirmation SMS
- Moves back to Policy Lifecycle or Inforce Clients (whichever is appropriate)

### Stage 4: TERMINATED (Policy Lost)
**System:**
- Sets TAG | Terminated |
- Removes from all active automations
- Duplicates opportunity to Rewrite | Rejected pipeline → feeds into Win Back / Recycle cycle
- Agent SMS notification

**Agent:**
- Final disposition notes (WHY lost — documented reason required)
- Client gets recycled through Rewrite | Rejected for future re-engagement

**Daily 8AM automation:** Agent SMS with RE pipeline counts (active cases, overdue count, escalation status)

---

## PIPELINE 5: Rewrite | Rejected (3 stages)

### Stage 1: REWRITE (0-7 days)
**System:**
- Sets TAG | Rewrite |
- Carries forward previous deal data + decline reason
- Creates review task

**Agent:**
- Review decline reason
- Rewrite viable → LM → Application Process (new carrier/product)
- Not viable now → Recycle
- Truly uninsurable → Uninsurable
- 7 days no activity → Recycle (auto)

### Stage 2: RECYCLE (45 days)
**System:**
- Sets TAG | Recycle |
- Day 1 → agent SMS: re-contact this lead
- Day 15 → second re-contact reminder
- Day 30 → final attempt reminder
- Day 45 → no interest → auto-move → Uninsurable
- Client reaches out ANY time → 3 alerts + TAG | ZOMBIE |

**Agent:**
- Re-contact on timer fires
- Interested → LM at appropriate stage
- ZOMBIE tag → treat as hot lead, respond immediately

### Stage 3: UNINSURABLE
**System:**
- Sets TAG | Uninsurable |
- Removes from all automations
- 12-month health check timer → task for agent

**Agent:**
- Document WHY (specific condition, which carriers declined, what would need to change)
- 12-month review: improved → Recycle or LM; still uninsurable → reset timer or close

---

## PIPELINE 6: Active | Inforce Clients (5 stages)

### Stage 1: MONTH 1 | WELCOME & ANCHORING (0-30 days)
**System:**
- Sets TAG | Month 1 |
- SMS about gift/card
- Positive response → [GIFT] pipeline + 21-day timer
- No response 7 days → TAG | No Gift |
- 30 days → auto-move to Month 3

### Stage 2: MONTH 3 | STABILIZATION — THE DANGER ZONE (30-90 days)
**System:**
- Sets TAG | Month 3 |
- SMS: 3-month thank you
- Negative reply (cancel, too expensive) → RE | Retention Exceptions (auto)
- 90 days → auto-move to Month 6

### Stage 3: MONTH 6 | BENEFICIARY REVIEW (90-180 days)
**System:**
- Sets TAG | Month 6 |
- SMS: beneficiary update check
- Positive response → TAG | Ready For Referrals |
- Negative reply → RE | Retention Exceptions (auto)
- 180 days → auto-move to Month 12

### Stage 4: MONTH 12 | ANNUAL REVIEW — THE RENEWAL (365 days)
**System:**
- Sets TAG | Month 12 |
- SMS: anniversary + calendar link for 5-min review call

**Agent:**
- Manual call (not just text)
- Review coverage, beneficiaries, life changes
- Upsell opportunity
- After review → reset to Month 1 for Year 2+

### Stage 5: CLIENT CONTACT | RESPOND MISSED MESSAGE/CALL
**System:**
- Missed call/unread text detected → creates opportunity here
- TAG | Client Contact Needed |

**Agent:**
- Respond ASAP
- Billing issue → RE | Retention Exceptions
- Cancel request → RE | Retention Exceptions
- General question → answer + return to month stage
- Referral → handle + document
- Remove tag once resolved

---

## PIPELINE 7: Nurture | Long Term (1 stage)

### Stage 1: NURTURE START (6 months)
**System:**
- Sets TAG | Nurture |
- Preserves ALL existing tags
- Day 7 → SMS (1): "Life gets busy, I'll check back..."
- Day 45 → SMS (2): "Carriers adjusted guidelines..."
- Day 60 → SMS (3): "Thinking of you..."
- Day 90 → SMS (4): "Still looking for coverage?"
- Day 135 → SMS (5): mid-cycle check-in
- Day 180 → SMS (6): final touch — "Still here if you need us"
- Positive reply ANY message → LM → Engaged Interest
- Negative reply ("stop", "not interested") → TAG | Nurture Declined |, stop sequence
- No reply after SMS (6) at Day 180 → auto-move → Recycle (Pipeline 5)

**Agent:**
- Reply to any nurture response personally
- Can manually re-engage any time
- LOW PRESSURE — no aggressive outreach
