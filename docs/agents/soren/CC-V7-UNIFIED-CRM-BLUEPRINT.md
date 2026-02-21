# CC-V7 UNIFIED CRM BLUEPRINT
# Forged Financial — Complete Build Specification for Mason
# Created: Feb 19, 2026 | Author: Architect (FF-PLN-001)
# Status: AWAITING BOSS APPROVAL

---

## DOCUMENT PURPOSE

This is the single source of truth for building the Forged Financial CRM. Mason builds from THIS document. If it's not in here, it doesn't get built. If it IS in here, it gets built exactly as specified.

**Incorporates:**
- MASTER-CRM-REFERENCE.md (pipelines, metrics, KPIs, strategies)
- FULL-PIPELINE-SPEC.md (pipeline detail, CRM-wide features)
- DASHBOARD-KPI-SPEC.md (dashboard layout)
- Boss's Feb 19 directives (Pipeline 4 condensed, Closed Won simplified, clean transitions, updated Recycle/Nurture timelines, UX principles)

---

## TABLE OF CONTENTS

1. [UX Core Principles](#1-ux-core-principles) — NON-NEGOTIABLE
2. [CRM-Wide Features](#2-crm-wide-features)
3. [Data Architecture Rules](#3-data-architecture-rules)
4. [Pipeline 1: LM | Lead Management](#4-pipeline-1-lm--lead-management)
5. [Pipeline 2: AP | Approval Process](#5-pipeline-2-ap--approval-process)
6. [Pipeline 3: PL | Policy Lifecycle](#6-pipeline-3-pl--policy-lifecycle)
7. [Pipeline 4: RE | Retention Exceptions](#7-pipeline-4-re--retention-exceptions)
8. [Pipeline 5: Rewrite | Rejected](#8-pipeline-5-rewrite--rejected)
9. [Pipeline 6: Active | Inforce Clients](#9-pipeline-6-active--inforce-clients)
10. [Pipeline 7: Nurture | Long Term](#10-pipeline-7-nurture--long-term)
11. [Production Dashboard](#11-production-dashboard)
12. [Metrics & KPI Engine](#12-metrics--kpi-engine)
13. [Efficiency & Automation Layer](#13-efficiency--automation-layer)
14. [ROI Strategy Engine](#14-roi-strategy-engine)
15. [REST API Specification](#15-rest-api-specification) — Complete endpoint spec
16. [Customizable Elements Registry](#16-customizable-elements-registry) — Customization engine
17. [Agent User Manual](#17-agent-user-manual) — Plain-language user guide
18. [Build Sequence & Dependencies](#18-build-sequence--dependencies)
19. [Acceptance Criteria](#19-acceptance-criteria)
20. [Risk Register](#20-risk-register)
- [Appendix A: Cross-Pipeline Transitions](#appendix-a-all-cross-pipeline-transitions)
- [Appendix B: Automated SMS Messages](#appendix-b-all-automated-sms-messages)
- [Appendix C: Phone & Dialer System](#appendix-c-phone--dialer-system) — Call recording, audio devices, voicemail, caller ID

---

## 1. UX CORE PRINCIPLES

> **These are NON-NEGOTIABLE. Every build decision filters through these.**

### 1.1 Selling Mode vs Review Mode

| Aspect | Selling Mode (DEFAULT) | Review Mode (Dashboard) |
|--------|----------------------|------------------------|
| **When** | All day while working | Intentional click-in (morning briefing, EOD review) |
| **Shows** | Pipeline cards, lead details, call controls, action signals (NEW badges, REPLY NEEDED, escalation colors) | Metrics, charts, KPIs, trends, intelligence |
| **Hides** | ALL metrics, charts, KPIs — zero data visualization | Pipeline working view |
| **Navigation** | Default landing page | Dedicated Dashboard button/tab — requires deliberate click |

**Implementation rule:** NO metric-related UI element appears in pipeline/selling views. Not in headers, not in sidebars, not in footers, not in card metadata. The pipeline view is for SELLING.

### 1.2 Everything Optional, Nothing Mandatory

- ALL metrics, KPIs, automations, and dashboard features are **opt-in**
- No feature blocks the agent from working the pipeline
- No forced onboarding wizard for metrics
- No "you must configure this before proceeding" gates
- Agent can use the CRM with ZERO dashboard features enabled and still have full pipeline functionality

### 1.3 Three Engagement Levels Per Metric

Every metric (all 39) has three states the agent controls independently:

| Level | Visibility | Automations | Data Collection |
|-------|-----------|-------------|-----------------|
| **Off** | Hidden from agent's dashboard | None | ✅ Still collecting silently |
| **Watch** | Visible (numbers, trends, charts) | None — pure observation | ✅ Collecting |
| **Active** | Visible + automations enabled | Nudges, alerts, suggestions, recommended actions | ✅ Collecting |

**Settings UI:** Each metric gets a simple three-way toggle (Off / Watch / Active) in a Settings > Metrics page. Group by category. Bulk toggles per category.

**Suggestions in Active mode** surface as dismissible nudges, e.g.:
- "Your contact rate increases 15% when you call between 10-11 AM"
- "Leads in Qualified Interest for 3+ days close at 40% lower rate"

Agent can dismiss any suggestion. No penalty. No nagging.

### 1.4 Manager Sees All

- Manager role can view ALL metrics for ALL agents — regardless of each agent's toggle settings
- Manager dashboard shows team-wide aggregates + per-agent drill-down
- Agent toggle settings are INVISIBLE to managers (managers don't know what's off/watch/active)
- Manager Alert Summary (7.5) is always active for managers

### 1.5 Data Always Collecting

- From Day 1, every timestamp, tag, stage transition, activity log entry, and field change is recorded
- This happens regardless of agent settings
- Historical data is always available if agent later turns a metric to Watch or Active
- No "start tracking from today" — it's retroactive

### 1.6 Instant Pipeline Navigation

The agent must be able to jump between any pipeline in ONE CLICK with ZERO page reload.

**Implementation requirements:**
- **Persistent pipeline switcher** — always visible in the selling view (tab bar, sidebar, or top nav)
- **Current pipeline indicator** — clear visual highlight showing which pipeline is active
- **All pipelines accessible** — all 7 defaults + any custom pipelines appear in the switcher
- **No page reload** — switching pipelines loads stage columns and lead cards via client-side state or API fetch, never a full page navigation
- **Pipeline badge counts** — each pipeline in the switcher shows its total active lead count (and optionally an alert dot for overdue/escalated items)
- **Reorderable** — agent can drag to reorder pipelines in the switcher (persists to `PUT /api/v1/pipelines/reorder`)
- **Overflow handling** — if more than ~8 pipelines, use a compact view (e.g., horizontal scroll, "More..." dropdown, or collapsible sidebar)

**UX reference:**
```
┌──────────────────────────────────────────────────────┐
│ [LM (42)] [AP (8)] [PL (12)] [RE (3)] [RW (5)]     │  ← tab bar
│ [Active (67)] [Nurture (23)] [+ New Pipeline]        │
├──────────────────────────────────────────────────────┤
│  Stage 1    │  Stage 2    │  Stage 3    │  Stage 4   │  ← columns
│  ┌───────┐  │  ┌───────┐  │  ┌───────┐  │            │
│  │ Lead  │  │  │ Lead  │  │  │ Lead  │  │            │
│  └───────┘  │  └───────┘  │  └───────┘  │            │
│  ┌───────┐  │             │             │            │
│  │ Lead  │  │             │             │            │
│  └───────┘  │             │             │            │
└──────────────────────────────────────────────────────┘
```

### 1.7 Custom Pipelines & Stages (Full Flexibility)

**The 7 default pipelines are TEMPLATES** — pre-configured best practice, shipped as the starting point. They are fully editable. Users can modify them, add to them, or build completely custom pipelines from scratch.

#### Custom Pipelines

| Operation | Detail |
|-----------|--------|
| **Create** | "+" button in pipeline switcher. Fields: name (required), description, icon, color. Created empty (no stages). |
| **Edit** | Right-click or gear icon on pipeline tab → edit name, description, icon, color |
| **Delete** | Right-click or gear icon → Delete. **Confirmation dialog** with two options: (1) Move all leads in this pipeline to another pipeline first (select destination pipeline + stage mapping), or (2) Delete all leads in this pipeline permanently. Must type pipeline name to confirm destructive delete. |
| **Reorder** | Drag pipeline tabs to reorder. Persisted server-side. |
| **Default 7 protection** | Default pipelines CAN be edited/deleted — no special protection. They're templates, not sacred. If deleted, they're gone. A "Restore Defaults" option in Settings can recreate them (empty, no leads). |

#### Custom Stages (within any pipeline)

| Operation | Detail |
|-----------|--------|
| **Create** | "+" button after the last stage column, or right-click between columns → "Add Stage Here". Fields: name (required), color, position, timer settings (optional), required fields (optional), automations (optional via workflow builder). |
| **Edit** | Click stage header → edit name, color, timer duration, required fields, tag-on-entry |
| **Delete** | Click stage header → Delete. **Confirmation dialog**: move leads in this stage to another stage in the same pipeline (required — cannot delete a stage with leads without moving them first). |
| **Reorder** | Drag stage columns left/right. Persisted server-side. |
| **Required fields** | When creating/editing a stage, optionally define fields that must be filled before a lead can enter this stage. Dropdown of all available fields + ability to create custom fields. |
| **Timer settings** | Optional auto-move timer: after X days/hours with no activity, move to [target stage or pipeline]. Same format as default pipeline timers. |
| **Tag on entry** | Optional: set a tag when a lead enters this stage (same as default pipeline behavior). |

#### Custom Fields

| Operation | Detail |
|-----------|--------|
| **Create** | Settings > Custom Fields, or inline when configuring stage required fields. Types: text, number, currency, date, dropdown (with options), checkbox, phone, email, URL. |
| **Edit** | Change label, type (with migration warning), dropdown options |
| **Delete** | Soft-delete (hide from UI, data preserved) |
| **Usage** | Custom fields appear on lead cards, can be set as required for any stage, are searchable and filterable |

---

## 2. CRM-WIDE FEATURES

### 2.1 Message Approval Gate

**Purpose:** Prevent unwanted automated messages from going to clients.

| Element | Specification |
|---------|--------------|
| **Default state** | ON (all messages require approval) |
| **Notification** | Banner appears with: message content, recipient name/number, APPROVE / DECLINE buttons |
| **Approve** | Message sends immediately |
| **Decline** | Message cancelled, logged as declined |
| **No action** | Message stays queued indefinitely — does NOT auto-send |
| **Auto-send toggle** | Settings > "Auto-Send Client Messages" — OFF by default |
| **Auto-send activation** | Toggle ON shows confirmation dialog: "This will automatically send all system-generated messages to clients without your review. Are you sure?" |
| **Scope** | Every automated SMS in every pipeline passes through this gate unless auto-send is ON |

### 2.2 Visual Workflow Builder

**Purpose:** Let agents/managers see and customize pipeline automations visually.

| Element | Specification |
|---------|--------------|
| **Interface** | Drag-and-drop, no-code flowchart |
| **Node types** | Trigger (green), Wait/Timer (yellow), Condition (blue diamond), Action (gray), Approval Gate (orange) |
| **Node interaction** | Click to edit content, drag to reposition, connect with arrows |
| **Operations** | View, edit, add/remove nodes, duplicate workflows, toggle ON/OFF per workflow |
| **Access** | Each pipeline has a "Workflows" tab; global "All Workflows" view in Settings |
| **Defaults** | All pipeline automations described in this doc are pre-built as default workflows |

---

## 3. DATA ARCHITECTURE RULES

### 3.1 Pipeline Transitions = DELETE + CREATE

When a lead/opportunity moves between pipelines:
1. Verify destination pipeline opportunity is created successfully
2. Confirm ALL data fields transferred completely
3. **DELETE** the opportunity from the source pipeline
4. No remnants, no duplicates, no ghosts

**This applies to every cross-pipeline transition in the system.**

### 3.2 Tag System

- Every stage sets a TAG on the contact/opportunity
- Tags are cumulative (new tags add, old stage tags get replaced by current stage tag)
- Exception: escalation tags (Overdue-24h, Client Risk, URGENT, Lapse Risk, Unreachable) — these stack and are explicitly removed only on resolution
- Nurture preserves ALL existing tags from previous stages

### 3.3 Activity Feed

- Every action logged: calls, texts, stage moves, tag changes, field updates, automation fires
- Timestamped to the second
- Agent-attributed (who did it — system vs agent)
- This is the raw data source for most metrics

### 3.4 Required Fields

Required fields GATE stage progression. Agent cannot move to the next stage without filling them. BUT: required fields are minimal by design — only what's truly necessary.

### 3.5 Timer Reset Rule

In stages with engagement-based timer resets (Application Process): ANY client interaction (call, text, reply) resets ALL stage timers to zero.

---

## 4. PIPELINE 1: LM | LEAD MANAGEMENT

**Purpose:** Convert raw leads into closed sales
**Stages:** 6
**Max timeline:** ~39 days before auto-nurture

### Stage 1: NEW LEAD (0–3 days)

**Entry trigger:** Lead enters system (Google Sheet import, webhook, manual entry, referral)
**Required to enter:** Name + at least one contact method (phone or email)

**System actions on entry:**
- Create opportunity record
- Auto-assign to agent (round-robin or manual override)
- Set TAG `| New Lead |`
- Queue speed-to-lead SMS → Approval Gate: *"Hi [Name], this is [Agent] with [Company]. I'll be giving you a call shortly regarding your inquiry. Talk soon!"*
- Push notification + SMS to agent with lead summary

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| Client replies | TAG `| REPLY NEEDED |`, notify agent, auto-move → Contact |
| 3 days, no interaction | Auto-move → Contact |

**Agent actions:**
- Call within 5 minutes of notification
- Document attempt in activity feed
- Interested → move to Engaged Interest
- SSN provided → move to Qualified Interest
- Appointment set → move to Engaged Interest (or Qualified if SSN on file)

**Data tracked:** Lead source, entry timestamp, first contact timestamp, response time, attempt count

---

### Stage 2: CONTACT (0–4 days)

**Entry trigger:** Auto-moved from New Lead (3 days) OR agent manual move
**Required to enter:** Was in New Lead stage

**System actions on entry:**
- Set TAG `| Contact |`
- Monitor for client replies

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| Client replied + agent no response 24h | TAG `| Overdue-24h |`, SMS reminder to agent |
| Escalating | TAG `| Overdue-48h |`, TAG `| Overdue-72h |` |
| Agent responds to overdue | Remove `| REPLY NEEDED |` tag |
| 4 days, no contact + insufficient attempts | Notification to agent |
| 4 days total, no contact | Auto-move → Pipeline 7 (Nurture) + farewell SMS to client. DELETE from P1. |

**Agent actions:**
- Continue outreach at different times of day
- Document every attempt
- Contact + interest → Engaged Interest
- Contact + SSN → Qualified Interest
- "Not interested" → Pipeline 7 Nurture (tagged with reason). DELETE from P1.

**Data tracked:** Attempt count, attempt times, client response timestamps, overdue tag count

---

### Stage 3: ENGAGED INTEREST (0–14 days)

**Entry trigger:** Agent confirms client expressed interest
**Required to enter:** Successful contact made + client showed interest

**System actions on entry:**
- Set TAG `| Engaged Interest |`
- Queue interest-gauge SMS → Approval Gate

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| 14 days, no interaction + no app started | Auto-move → Pipeline 7 (Nurture) + dialer recycle. DELETE from P1. |

**Agent actions:**
- High-touch follow-up (calls, texts, relationship building)
- SSN provided → Qualified Interest
- Goes cold → Pipeline 7 Nurture
- Appointment booked → calendar event

**Data tracked:** Engagement type, follow-up frequency, time in stage

---

### Stage 4: QUALIFIED INTEREST (0–7 days)

**Entry trigger:** Client provides SSN
**Required to enter:** SSN field populated (REQUIRED)

**System actions on entry:**
- Set TAG `| Qualified Interest |`

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| 48h no activity | Queue automated check-in SMS → Approval Gate |
| 7 days, no interaction + no app | Auto-move → Pipeline 7 (Nurture) + dialer recycle. DELETE from P1. |

**Agent actions:**
- PRIORITY prospect — aggressive follow-up
- App started → Application Process
- Silent/lost interest → Pipeline 7 Nurture

**Data tracked:** Time from engaged → qualified, SSN provided timestamp

---

### Stage 5: APPLICATION PROCESS (0–11 days, resets on engagement)

**Entry trigger:** Agent starts application with client
**Required to enter:** Carrier, Product, Price, Health Status (ALL REQUIRED)

**System actions on entry:**
- Set TAG `| Application Process |`
- ANY client engagement resets ALL timers

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| 24h no activity | Queue check-in SMS with carrier/product/price details → Approval Gate |
| 11 days total no contact | Auto-move → Pipeline 7 (Nurture). DELETE from P1. |

**Agent actions:**
- Fill all required fields
- Walk client through application
- App submitted → Closed Won
- Client ghosts → Pipeline 7 Nurture

**Data tracked:** Carrier, product, price, health status, time in stage, engagement resets

---

### Stage 6: CLOSED WON ✅

**Entry trigger:** Application submitted to carrier
**Required to enter (ONLY THESE 5 FIELDS):**
- Carrier
- Product
- Price
- Health Status
- Coverage Amount

**System actions on entry:**
- Set TAG `| Closed |`
- 7-minute buffer for agent to add notes
- Queue "Closed | Submission Reminder" SMS → Approval Gate: agent name, personal phone, work number, save both, automated alerts info
- 5 min after transfer: queue congratulations SMS with full details → Approval Gate
- Create opportunity in Pipeline 2 → Submitted (carry ALL deal data)
- **DELETE from Pipeline 1** (only after confirming data transfer success)

**Agent actions:**
- Fill ALL 5 required fields
- Review accuracy
- DONE with Lead Management

**Data tracked:** Close date, premium, carrier, product, coverage amount, time from New Lead → Closed Won (velocity)

---

## 5. PIPELINE 2: AP | APPROVAL PROCESS

**Purpose:** Track submission through carrier underwriting to decision
**Stages:** 2
**Timeline:** Carrier-dependent (days to weeks)

### Stage 1: SUBMITTED

**Entry trigger:** Closed Won in P1 creates opportunity here
**Required to enter:** Data transferred from Closed Won

**System actions on entry:**
- Set TAG `| Submitted |`

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| Client has TAG `| Approved as Applied |` | Bypass directly to Pipeline 3 → Approved. DELETE from P2. |
| Email parser configured | Auto-update on carrier emails |

**Agent actions:**
- Confirm submission with carrier
- Manual status updates if no email parser
- UW begins → move to Underwriting/Requirements

**Data tracked:** Submission date, carrier, submission method

---

### Stage 2: UNDERWRITING / REQUIREMENTS

**Entry trigger:** Carrier begins underwriting review
**Required to enter:** Agent confirms UW started

**System actions on entry:**
- Set TAG `| UW & Requirements |`
- Create task: "Requirements review — same day"
- Create recurring task: "Requirement chase — every 72 hours"

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| Email parser detects carrier update | Notify agent |
| Carrier approves | Move to Pipeline 3 → Approved. DELETE from P2. |
| Carrier declines | Move to Pipeline 5 → Rewrite. DELETE from P2. |

**Agent actions:**
- Review requirements same day
- Chase carrier every 72 hours
- Provide additional documentation as needed

**Data tracked:** UW start date, requirements list, requirement completion dates, decision date, time in UW

---

## 6. PIPELINE 3: PL | POLICY LIFECYCLE

**Purpose:** Track approved policy from paper to active coverage
**Stages:** 4
**Timeline:** Days to weeks depending on carrier + banking

### Stage 1: APPROVED

**Entry trigger:** Carrier approves (from P2) OR "Approved as Applied" bypass
**Required to enter:** Carrier approval confirmed

**System actions on entry:**
- Set TAG `| Approved |`
- Queue SMS to client: approval congratulations + agent reaching out → Approval Gate
- Create task: delivery follow-up

**Agent actions:**
- Deliver policy (call/video/in-person)
- Confirm banking info and draft date
- Walk client through coverage details
- Delivery complete → move to Draft Cleared

**Data tracked:** Approval date, carrier, delivery method, delivery date

---

### Stage 2: DRAFT CLEARED

**Entry trigger:** First premium payment drafts successfully
**Required to enter:** Agent confirms draft cleared with carrier/bank

**System actions on entry:**
- Set TAG `| Draft Cleared |`
- Queue SMS to client: first payment confirmed → Approval Gate

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| Draft FAILS | Move to Pipeline 4 → New Exception. DELETE from P3. |

**Agent actions:**
- Confirm first draft cleared with carrier
- Move to Delivered

**Data tracked:** Draft date, draft amount, payment method, pass/fail

---

### Stage 3: DELIVERED

**Entry trigger:** Agent has delivered policy documents to client
**Required to enter:** Policy delivered + draft cleared

**System actions on entry:**
- Set TAG `| Delivered |`
- Field validations: draft date, payment method, policy #

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| Draft date within 7 days | Create pre-draft confirmation task |

**Agent actions:**
- Verify all fields complete and accurate
- Pre-draft touch call if within 7 days
- Everything checks out → move to In Force

**Data tracked:** Delivery date, delivery method, field completion %

---

### Stage 4: IN FORCE ✅

**Entry trigger:** Policy confirmed active with carrier
**Required to enter:** Draft cleared + policy delivered + carrier confirms active

**System actions on entry:**
- Set TAG `| In Force |`
- Add to persistency cohort tracking
- Start persistency monitoring
- Move to Pipeline 6 → Month 1
- **DELETE from Pipeline 3**

**Agent actions:**
- Confirm policy is truly in force with carrier
- DONE with Policy Lifecycle

**Data tracked:** In Force date, carrier, premium, coverage amount, policy number (starts persistency clock)

---

## 7. PIPELINE 4: RE | RETENTION EXCEPTIONS

**Purpose:** Save at-risk policies through systematic recovery
**Stages:** 4 (condensed from 7 — Feb 19 directive)
**Timeline:** Up to 30 days before auto-termination

> **KEY DESIGN NOTE:** Lapse Risk and Unreachable are TAGS within Active Recovery, NOT separate stages. Payment Recovery and Retention Requirements are merged INTO Active Recovery.

### Stage 1: NEW EXCEPTION (Intake & Triage)

**Entry trigger:** Draft fails (from P3), payment issue detected, lapse notice from carrier, client requests cancellation, or billing exception flagged
**Required to enter:** Active policy with identified exception

**System actions on entry:**
- Create opportunity, auto-assign to writing agent
- Set TAG `| New Exception |`
- Populate `[Exception Type]` field (payment, lapse, cancel request, billing)
- SMS alert to agent immediately

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| 4 hours, no movement | Second SMS alert to agent |
| 24 hours, no movement | TAG `| Overdue |` |

**Agent actions:**
- Review within 4 hours
- Verify exception type and client info
- Move to Active Recovery

**Data tracked:** Exception type, entry timestamp, source (which pipeline/trigger), agent response time

---

### Stage 2: ACTIVE RECOVERY (Work the Case)

**Entry trigger:** Agent moves from New Exception
**Required to enter:** Exception reviewed and triaged

> This stage MERGES the old Payment Recovery, Retention Requirements, Lapse Risk, and Unreachable into one working stage with tag-based sub-classification.

**System actions on entry:**
- Set TAG `| Active Recovery |`
- Create task: "Call client today"
- Queue SMS to client about the issue → Approval Gate

**Escalating timer automations:**
| Time Elapsed | Action |
|-------------|--------|
| 24h | TAG `| Overdue-24h |` |
| 48h | TAG `| Overdue-48h |` |
| 72h | TAG `| Overdue-72h |` + 🚨 **MANAGER ALERT** |
| 7 days | TAG `| Client Risk |` |
| 14 days | TAG `| URGENT |` + 🚨 **MANAGER ALERT** |
| 30 days | Auto-move → Terminated |

**Special case automations (tag-based, within this stage):**
| Condition | Action |
|-----------|--------|
| Lapse risk identified | Add TAG `| Lapse Risk |` — same escalation ladder applies |
| 5+ contact attempts, no response | TAG `| Unreachable |`, send final voicemail + SMS |
| Unreachable + 7 more days no response | Auto-move → Terminated |
| Client says "want to cancel" | Run retention script → still no → Terminated |
| Billing fixed + carrier confirms | Move → Resolved |

**Agent actions:**
- Call client same day
- Fix payment issue / send update form / address retention concern
- Document every action in activity feed

**Data tracked:** Contact attempts, escalation tags hit, exception type, time in stage, resolution actions taken

---

### Stage 3: RESOLVED ✅ (Policy Saved)

**Entry trigger:** Issue fixed and carrier confirms policy is active again
**Required to enter:** Carrier confirmation of resolution

**System actions on entry:**
- Set TAG `| Resolved |`
- **Remove ALL escalation tags:** Overdue-*, Client Risk, URGENT, Lapse Risk, Unreachable
- Set `[Exception Outcome]` field
- Queue SMS to agent: confirmation → direct
- Queue SMS to client: confirmation → Approval Gate
- Return opportunity to Pipeline 3 (Policy Lifecycle) or Pipeline 6 (Inforce Clients) as appropriate
- **P6 return rule:** Client returns to the month stage they SHOULD be at based on actual calendar time from their original In Force date — NOT where they left. Example: leaves P6 at Month 3, spends 1 month in P4, returns to Month 4. The persistency clock NEVER pauses. Calculate: `current_month_stage = months_since(in_force_date)`
- **DELETE from Pipeline 4**

**Data tracked:** Resolution date, resolution type, time to resolve, exception outcome

---

### Stage 4: TERMINATED ❌ (Policy Lost)

**Entry trigger:** 30-day auto-termination, agent marks as lost, or unreachable exhausted
**Required to enter:** Recovery failed

**System actions on entry:**
- Set TAG `| Terminated |`
- Remove from all active automations
- Duplicate opportunity to Pipeline 5 → Rewrite (Win Back cycle)
- SMS notification to agent

**Agent actions:**
- Final disposition notes — WHY lost (REQUIRED, documented reason)

**Data tracked:** Termination date, reason, time in recovery, attempts made, commission at risk

**Daily automation:** 8AM SMS to each agent with their RE pipeline counts (active cases, overdue count, escalation status)

---

## 8. PIPELINE 5: REWRITE | REJECTED

**Purpose:** Recapture declined and terminated cases
**Stages:** 3
**Timeline:** 7 days rewrite + 45 days recycle + 12 months uninsurable review

### Stage 1: REWRITE (0–7 days)

**Entry trigger:** Carrier declines (from P2) OR policy Terminated (from P4)
**Required to enter:** Decline reason or termination reason documented

**System actions on entry:**
- Set TAG `| Rewrite |`
- Carry forward ALL previous deal data + decline/termination reason
- Create review task

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| 7 days, no activity | Auto-move → Recycle |

**Agent actions:**
- Review decline/termination reason
- Viable rewrite → Pipeline 1 → Application Process (new carrier/product). DELETE from P5.
- Not viable now → move to Recycle
- Truly uninsurable → move to Uninsurable

**Data tracked:** Original decline reason, rewrite viability, new carrier/product if rewritten

---

### Stage 2: RECYCLE (45 days total)

**Entry trigger:** Agent defers rewrite, 7-day auto from Rewrite, OR Nurture exhausted (from P7)
**Required to enter:** Lead not viable for immediate rewrite but not uninsurable

> **45 days total.** Not 45→90→1yr. Just 45 days with 3 re-contact touchpoints, then done.

**System actions on entry:**
- Set TAG `| Recycle |`

**Conditional automations:**
| Day | Action |
|-----|--------|
| Day 1 | SMS to agent: re-contact this lead |
| Day 15 | Second re-contact reminder to agent |
| Day 30 | Final attempt reminder to agent |
| Day 45 | No interest → auto-move → Uninsurable |
| ANY TIME client reaches out | 3 alerts to agent + TAG `| ZOMBIE |` |

**Agent actions:**
- Re-contact on each timer fire
- Interested → Pipeline 1 at appropriate stage. DELETE from P5.
- ZOMBIE tag → treat as HOT lead, respond immediately

**Data tracked:** Re-contact attempts, timer responses, ZOMBIE conversions

---

### Stage 3: UNINSURABLE

**Entry trigger:** Recycle exhausted (45 days), or agent determines client is medically uninsurable
**Required to enter:** All re-engagement attempts failed OR medical determination

**System actions on entry:**
- Set TAG `| Uninsurable |`
- Remove from ALL automations
- Set 12-month health check timer → creates task for agent

**Agent actions:**
- Document WHY: specific conditions, which carriers declined, what would need to change
- 12-month review: improved → Recycle or Pipeline 1; still uninsurable → reset timer or close permanently

**Data tracked:** Reason, carriers attempted, conditions documented, 12-month review outcomes

---

## 9. PIPELINE 6: ACTIVE | INFORCE CLIENTS

**Purpose:** Retain clients, build relationship, maximize lifetime value
**Stages:** 5
**Timeline:** Ongoing annual cycle

### Stage 1: MONTH 1 | WELCOME & ANCHORING (0–30 days)

**Entry trigger:** Policy goes In Force (from P3)
**Required to enter:** Policy confirmed active

**System actions on entry:**
- Set TAG `| Month 1 |`
- Queue SMS about gift/card → Approval Gate

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| Positive response | [GIFT] pipeline + 21-day timer |
| No response 7 days | TAG `| No Gift |` |
| 30 days elapsed | Auto-move → Month 3 |

**Data tracked:** Gift response, client sentiment, early engagement level

---

### Stage 2: MONTH 3 | THE DANGER ZONE (30–90 days)

**Entry trigger:** Auto from Month 1 at 30 days

**System actions on entry:**
- Set TAG `| Month 3 |`
- Queue SMS: 3-month thank you → Approval Gate

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| Negative reply (cancel, too expensive) | Move to Pipeline 4 → New Exception. DELETE from P6. |
| 90 days elapsed | Auto-move → Month 6 |

**Data tracked:** Client response, exception trigger rate at Month 3

---

### Stage 3: MONTH 6 | BENEFICIARY REVIEW (90–180 days)

**Entry trigger:** Auto from Month 3 at 90 days

**System actions on entry:**
- Set TAG `| Month 6 |`
- Queue SMS: beneficiary update check → Approval Gate

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| Positive response | TAG `| Ready For Referrals |` |
| Negative reply | Move to Pipeline 4 → New Exception. DELETE from P6. |
| 180 days elapsed | Auto-move → Month 12 |

**Data tracked:** Beneficiary review status, referral readiness, client sentiment

---

### Stage 4: MONTH 12 | ANNUAL REVIEW (365 days)

**Entry trigger:** Auto from Month 6 at 180 days

**System actions on entry:**
- Set TAG `| Month 12 |`
- Queue SMS: anniversary + calendar link for 5-min review call → Approval Gate

**Agent actions:**
- MANUAL call (not just text) — this is personal
- Review coverage, beneficiaries, life changes
- Upsell opportunity (additional coverage, family members)
- After review → reset to Month 1 for Year 2+

**Data tracked:** Review completed (Y/N), coverage changes, upsell outcome, referrals received

---

### Stage 5: CLIENT CONTACT | RESPOND TO CLIENT

**Entry trigger:** Missed call or unread text detected from active client

**System actions on entry:**
- Create opportunity in this stage
- TAG `| Client Contact Needed |`

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| Billing issue mentioned | Move to Pipeline 4 → New Exception |
| Cancel request | Move to Pipeline 4 → New Exception |

**Agent actions:**
- Respond ASAP
- General question → answer + return to appropriate month stage
- Referral → handle + document
- Remove tag once resolved

**Data tracked:** Response time, contact reason, resolution

---

## 10. PIPELINE 7: NURTURE | LONG TERM

**Purpose:** Warm drip on cold leads until ready to re-engage
**Stages:** 1
**Timeline:** 6 months, 6 SMS touchpoints

### Stage 1: NURTURE START (6 months)

**Entry trigger:** Lead goes cold from Pipeline 1:
- Contact stage at 4 days, no contact
- Engaged Interest at 14 days, no interaction
- Qualified Interest at 7 days, no interaction
- Application Process at 11 days, no contact
- OR agent manually moves

**Required to enter:** Lead was in Pipeline 1 but failed to progress

**System actions on entry:**
- Set TAG `| Nurture |`
- Preserve ALL existing tags from previous stages

**SMS drip sequence (all through Approval Gate):**
| Day | SMS Content |
|-----|------------|
| Day 7 | SMS (1): "Life gets busy, I'll check back..." |
| Day 45 | SMS (2): "Carriers adjusted guidelines..." |
| Day 60 | SMS (3): "Thinking of you..." |
| Day 90 | SMS (4): "Still looking for coverage?" |
| Day 135 | SMS (5): Mid-cycle check-in |
| Day 180 | SMS (6): "Still here if you need us" |

**Conditional automations:**
| Condition | Action |
|-----------|--------|
| Positive reply to ANY SMS | Move to Pipeline 1 → Engaged Interest. DELETE from P7. |
| "Stop" or "not interested" | TAG `| Nurture Declined |`, stop sequence |
| No reply after SMS (6) at Day 180 | Auto-move → Pipeline 5 → Recycle. DELETE from P7. |

**Agent actions:**
- Reply personally to any client response
- Can manually re-engage any time
- LOW PRESSURE — no aggressive outreach

**Data tracked:** Which SMS triggered response, response rate per touchpoint, re-engagement source

---

## 11. PRODUCTION DASHBOARD

### 11.1 Access Pattern

- Dashboard is a separate view/page — NOT integrated into pipeline view
- Dedicated navigation element (tab, button, or menu item)
- Agent clicks in intentionally; clicks back to return to selling mode
- No dashboard widgets, snippets, or previews in pipeline view

### 11.2 Top Bar: Scorecard

Single row of color-coded cards. Agent chooses which cards appear (per metric toggle settings).

Color coding:
- 🟢 Green = at or above target
- 🟡 Yellow = within 10% of target
- 🔴 Red = below target

Click any card → drill into detail view for that metric.

### 11.3 Dashboard Sections

**Section 1: Speed & Responsiveness**
| Metric | Target | Source |
|--------|--------|--------|
| 1.1 Speed to Lead | 🟢 < 5 min, 🟡 5-15 min, 🔴 > 15 min | P1 S1 timestamps |
| 1.2 Avg Response Time | 🟢 < 30 min, 🟡 30-60 min, 🔴 > 60 min | REPLY NEEDED tags |
| 1.3 Overdue Rate | 🟢 < 5%, 🟡 5-15%, 🔴 > 15% | All Overdue-* tags |

**Section 2: Contact & Engagement**
| Metric | Target | Source |
|--------|--------|--------|
| 2.1 Contact Rate | 🟢 > 45%, 🟡 30-45%, 🔴 < 30% | P1 S3+ / S1 |
| 2.2 Attempts to Contact | 3-5 avg | P1 S1-S2 activity |
| 2.3 Engagement Rate | 🟢 > 30%, 🟡 20-30%, 🔴 < 20% | P1 S3 / S1 |
| 2.4 Qualification Rate | 🟢 > 55%, 🟡 40-55%, 🔴 < 40% | P1 S4 / S3 |

**Section 3: Conversion & Revenue**
| Metric | Target | Source |
|--------|--------|--------|
| 3.1 Close Rate | 🟢 > 10%, 🟡 6-10%, 🔴 < 6% | P1 S6 / S1 |
| 3.2 App-to-Close Rate | 🟢 > 80%, 🟡 65-80%, 🔴 < 65% | P1 S6 / S5 |
| 3.3 Avg Monthly Premium | Market-dependent | P1 S6 Price |
| 3.4 Avg Annual Premium | Calculated (Price × 12) | P1 S6 |
| 3.5 Total Revenue Written | Growth MoM | All Closed Won |
| 3.6 Revenue by Lead Source | ROI > 3x | Source + Price |
| 3.7 Revenue by Carrier | N/A | Carrier + Price |
| 3.8 Pipeline Velocity | 🟢 < 14d, 🟡 14-21d, 🔴 > 21d | P1 timestamps |

**Section 4: Approval & Placement**
| Metric | Target | Source |
|--------|--------|--------|
| 4.1 Approval Rate | 🟢 > 75%, 🟡 60-75%, 🔴 < 60% | P2 → P3 vs P2 → P5 |
| 4.2 Placement Rate | 🟢 > 90%, 🟡 80-90%, 🔴 < 80% | P3 S4 / S1 |
| 4.3 Avg UW Time | Carrier-dependent | P2 timestamps |
| 4.4 Requirements Completion | N/A | P2 S2 outcomes |

**Section 5: Persistency & Retention**
| Metric | Target | Source |
|--------|--------|--------|
| 5.1 Persistency Rate (13-mo) | 🟢 > 85%, 🟡 75-85%, 🔴 < 75% | P6 cohort tracking |
| 5.2 Danger Zone Survival | 🟢 > 90%, 🟡 80-90%, 🔴 < 80% | P6 S2→S3 |
| 5.3 Exception Rate | 🟢 < 10%, 🟡 10-20%, 🔴 > 20% | P4 entries / P6 total |
| 5.4 Save Rate | 🟢 > 65%, 🟡 50-65%, 🔴 < 50% | P4 Resolved / exits |
| 5.5 Avg Time to Resolve | < 7 days | P4 timestamps |
| 5.6 Chargeback Risk | N/A | P4 Terminated < 12mo |

**Section 6: Recapture & Win Back**
| Metric | Target | Source |
|--------|--------|--------|
| 6.1 Recapture Rate | 🟢 > 10%, 🟡 5-10%, 🔴 < 5% | P7+P5→P1 |
| 6.2 ZOMBIE Rate | N/A | P5 S2 ZOMBIE tags |
| 6.3 Win Back Revenue | Growth metric | Recaptured Closed Won |
| 6.4 Nurture Response Rate | N/A | P7 SMS reply data |

**Section 7: Agent Accountability**
| Metric | Target | Source |
|--------|--------|--------|
| 7.1 Daily Activity Score | Configurable | Activity feed |
| 7.2 Calls Made | 80-100/day | Call logs |
| 7.3 Talk Time | 2-3 hrs/day | Call duration |
| 7.4 Leads Worked Today | N/A | Unique lead IDs |
| 7.5 Manager Alert Summary | Manager-only | 72h/14d escalations |

**Section 8: Business Intelligence**
| Metric | Display Type | Source |
|--------|-------------|--------|
| 8.1 Lead Source ROI | Ranked table + recommendation | Source + AP + cost |
| 8.2 Best Time to Call | Heatmap (day × hour) | Contact timestamps |
| 8.3 State Performance | Map or ranked table | State + conversion |
| 8.4 Carrier Performance Matrix | Matrix table | P2 + P3 + P6 |
| 8.5 Funnel Drop-Off Analysis | Funnel chart | P1 stage transitions |
| 8.6 Revenue Forecast | Projected AP + confidence | Pipeline × rates × premium |

### 11.4 Dashboard Views

| View | Purpose | Content |
|------|---------|---------|
| **Agent Scorecard** (default) | At-a-glance health | All enabled KPIs as color-coded cards. Click to drill. |
| **Pipeline Funnel** | Conversion flow | Visual funnel New Lead → Closed Won with % at each stage |
| **Revenue & Production** | Money tracking | AP by period/source/carrier. Forecast. Commission. |
| **Retention & Persistency** | Long-term health | Cohort chart, exception rate, save rate, chargeback risk |
| **Activity & Accountability** | Agent effort | Calls, talk time, leads worked, overdue. Manager: all agents side-by-side |
| **Intelligence** | Strategic insights | Best time to call, state perf, carrier matrix, source ROI, funnel analysis |

### 11.5 Time Filters (all views)

Today | This Week | This Month | This Quarter | YTD | Custom Range

---

## 12. METRICS & KPI ENGINE

### 12.1 Complete Metric Registry (39 metrics)

All metrics listed with formula and data source. Each metric supports the three engagement levels (Off/Watch/Active).

| # | Metric | Formula | Source | Category |
|---|--------|---------|--------|----------|
| 1 | Speed to Lead | Avg(first_contact - entry) | P1 S1 | Speed |
| 2 | Response Time | Avg(agent_reply - client_msg) | All | Speed |
| 3 | Overdue Rate | Overdue_leads / active_leads | All | Speed |
| 4 | Contact Rate | S3+ / S1 entries | P1 | Contact |
| 5 | Attempts to Contact | Avg(activities before contact) | P1 S1-S2 | Contact |
| 6 | Engagement Rate | S3 / S1 entries | P1 | Contact |
| 7 | Qualification Rate | S4 / S3 entries | P1 | Contact |
| 8 | Close Rate | S6 / S1 entries | P1 | Conversion |
| 9 | App-to-Close Rate | S6 / S5 entries | P1 | Conversion |
| 10 | Pipeline Velocity | Avg(close_date - entry_date) | P1 | Conversion |
| 11 | Avg Monthly Premium | Avg(price) | P1 S6 | Revenue |
| 12 | Avg Annual Premium | Avg(price × 12) | P1 S6 | Revenue |
| 13 | Total AP Written | Sum(price × 12) | P1 S6 | Revenue |
| 14 | Revenue by Source | Sum(AP) by source | P1 S6 | Revenue |
| 15 | Revenue by Carrier | Sum(AP) by carrier | P1 S6 | Revenue |
| 16 | Lead Source ROI | (AP × comm%) / (leads × CPL) | P1 + config | Intelligence |
| 17 | Approval Rate | approved / submitted | P2→P3 | Approval |
| 18 | Placement Rate | in_force / approved | P3 | Approval |
| 19 | Avg UW Time | Avg(decision - submission) | P2 | Approval |
| 20 | Requirements Completion | resolved / total_requirements | P2 S2 | Approval |
| 21 | 13-Month Persistency | active_13mo / issued_13mo_ago | P6 | Persistency |
| 22 | Danger Zone Survival | survived_M3 / entered_M1 | P6 | Persistency |
| 23 | Exception Rate | P4_entries / P6_active | P4/P6 | Retention |
| 24 | Save Rate | Resolved / (Resolved + Terminated) | P4 | Retention |
| 25 | Avg Time to Resolve | Avg(resolved - exception_entry) | P4 | Retention |
| 26 | Chargeback Risk | terminated_<12mo × avg_commission | P4 | Retention |
| 27 | Recapture Rate | re-entries / (P7 + P5S2 entries) | P7+P5 | Recapture |
| 28 | ZOMBIE Rate | zombie_tags / P5S2_entries | P5 S2 | Recapture |
| 29 | Win Back Revenue | Sum(AP from recaptured) | P1 filtered | Recapture |
| 30 | Nurture Response Rate | replies / SMS_sent per touchpoint | P7 | Recapture |
| 31 | Daily Activity Score | Weighted(calls + texts + leads) | Activity | Activity |
| 32 | Calls Made | Count(outbound) / day | Call logs | Activity |
| 33 | Talk Time | Sum(duration) / day | Call logs | Activity |
| 34 | Leads Worked | Distinct(lead_ids with activity) | Activity | Activity |
| 35 | Best Time to Call | Contact_rate by hour × day | Call logs | Intelligence |
| 36 | State Performance | Close_rate + AP by state | P1 | Intelligence |
| 37 | Carrier Matrix | Approval + UW + persistency + premium | P2+P3+P6 | Intelligence |
| 38 | Funnel Drop-Off | Stage-to-stage conversion | P1 | Intelligence |
| 39 | Revenue Forecast | Leads × stage_rate × avg_premium | P1 | Intelligence |

### 12.2 Input KPIs (What Agents Control)

Each output metric is driven by specific agent behaviors. These are surfaced as suggestions in Active mode:

**Speed metrics driven by:** Notification responsiveness, queue management, availability at lead entry time, daily pipeline review habit, task completion rate

**Contact metrics driven by:** Calls/day volume, call timing (best-time data), multi-channel approach, attempt persistence (5+), pitch quality, rapport building, objection handling on SSN

**Conversion metrics driven by:** All upstream rates compounding, app process efficiency, carrier/product match accuracy, follow-up speed on missing info

**Revenue metrics driven by:** Needs assessment quality, product recommendation, coverage discussions, upsell skill, lead source quality, pipeline velocity

**Approval metrics driven by:** Accurate health assessment, correct carrier selection, complete applications, proper product match, quick delivery, banking setup, pre-draft calls

**Persistency metrics driven by:** Sale quality (right product/price), Month 1 anchoring, Month 3 outreach, annual review completion, exception response speed (<4h)

**Recapture metrics driven by:** Nurture SMS quality, re-contact timing, ZOMBIE response speed, agent responsiveness to nurture replies

**Activity metrics driven by:** Dialing discipline, power dialer usage, time management, lead queue management

---

## 13. EFFICIENCY & AUTOMATION LAYER

### 13.1 Auto-Population
- Lead data auto-populates from source (GSheet, webhook) — no retyping
- Call logs auto-captured from dialer
- Stage transitions auto-tag and auto-timestamp
- Required fields enforced at stage gates, carry forward on transition

### 13.2 Auto Follow-Up
- Every stage has auto-timers that create tasks
- Escalating tags make overdue items visible
- Best Time to Call heatmap (Active mode) tells agents WHEN
- Daily 8AM SMS with pipeline counts (RE pipeline)

### 13.3 Smart Prioritization (Selling Mode signals)
These are the ONLY data-like elements visible in pipeline/selling mode:
- **NEW badge** on unseen leads — auto-dismiss after engagement
- **REPLY NEEDED** tag — respond before dialing new
- **ZOMBIE** tag — instant priority, respond within 5 min
- **Qualified Interest** leads show first (SSN = serious)
- **Time-in-stage** indicator on cards — oldest first
- **Escalation color coding:** yellow → orange → red

> These are ACTION SIGNALS, not metrics. They tell the agent what to do next, not how they're performing.

### 13.4 Pipeline Hygiene (Auto-Moves)
| Stage | Max Time | Destination |
|-------|----------|-------------|
| New Lead | 3 days | Contact |
| Contact | 4 days | Nurture (P7) |
| Engaged Interest | 14 days | Nurture (P7) |
| Qualified Interest | 7 days | Nurture (P7) |
| Application Process | 11 days | Nurture (P7) |
| Active Recovery | 30 days | Terminated |
| Nurture | 180 days (6 mo) | Recycle (P5) |
| Recycle | 45 days | Uninsurable |
| Rewrite | 7 days | Recycle |

### 13.5 One-Click Actions
- Click-to-call from any lead card
- One-click disposition with auto-stage-move
- Quick Schedule Call → calendar event from lead modal
- Drag-and-drop between pipeline stages
- Inline field editing on lead cards
- SMS templates with one-click send (through Approval Gate)

### 13.6 Batch Operations
- Power dialer auto-loads next lead, auto-dials
- AMD skips voicemails
- Voicemail drop (pre-recorded, one click)
- Post-call disposition auto-advances to next lead

---

## 14. ROI STRATEGY ENGINE

Built into the Intelligence dashboard view. Surfaces recommendations when metrics are in Active mode.

### Lead Source Optimization
- Auto-calculated ROI per source: (Total AP × commission%) / (lead_count × CPL)
- Monthly review recommendations: increase (>5x), maintain (3-5x), optimize (1-3x), cut (<1x)

### Carrier Optimization
- Carrier Performance Matrix surfaces best carriers per situation
- High approval + high persistency → default recommendation
- Fast UW → eager/ready clients
- Track chargeback risk by carrier

### Time Optimization
- Best Time to Call heatmap from agent's own data
- Pipeline Velocity shows where deals slow down
- Talk Time ratio shows productive hours

### Revenue Protection
- 13-Month Persistency per cohort
- Chargeback Risk calculation
- Exception root cause analysis

### The ROI Formula
```
Monthly AP = Leads × Close Rate × Avg AP - Lead Cost
Annual Retained = Monthly AP × 12 × Persistency Rate
Annual Commission = Annual Retained × Commission %

Every 1% close rate improvement = ~$2,400 more AP/month
Every 1% persistency improvement = ~$2,500 more retained AP/year
```

---

## 15. REST API SPECIFICATION

### 15.1 Conventions

- **Base URL:** `/api/v1`
- **Auth:** Bearer token on every request. Token contains `agentId` and `role` (agent|manager|admin).
- **Responses:** JSON. Success: `{ "ok": true, "data": {...} }`. Error: `{ "ok": false, "error": "message", "code": "ERROR_CODE" }`.
- **Pagination:** `?limit=50&cursor=<opaque>` on all list endpoints. Response includes `nextCursor` (null if no more).
- **Timestamps:** ISO 8601 UTC everywhere.
- **IDs:** UUIDs for all entities.
- **Soft delete:** Opportunities "deleted" from a pipeline during cross-pipeline transitions are hard-deleted after data transfer verification. Audit log retains the record.

---

### 15.2 Contacts

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/contacts` | Create contact (name + phone or email required) |
| `GET` | `/contacts` | List contacts. Filters: `?search=`, `?tag=`, `?pipeline=`, `?stage=`, `?agentId=` |
| `GET` | `/contacts/:id` | Get contact with all fields, tags, current pipeline/stage |
| `PATCH` | `/contacts/:id` | Update contact fields (inline editing) |
| `GET` | `/contacts/:id/activity` | Activity feed for contact. Filters: `?type=call|sms|stage_move|tag|field_update|automation`, `?from=`, `?to=` |
| `POST` | `/contacts/:id/activity` | Log manual activity entry (call note, disposition, etc.) |
| `GET` | `/contacts/:id/tags` | List all tags on contact |
| `POST` | `/contacts/:id/tags` | Add tag. Body: `{ "tag": "string" }` |
| `DELETE` | `/contacts/:id/tags/:tag` | Remove specific tag |

---

### 15.3 Opportunities (Pipeline Cards)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/opportunities` | Create opportunity. Body: `{ "contactId", "pipelineId", "stageId", "fields": {...} }`. Validates required fields for stage. |
| `GET` | `/opportunities` | List. Filters: `?pipelineId=`, `?stageId=`, `?agentId=`, `?tag=`, `?overdueOnly=true`, `?sort=time_in_stage|created` |
| `GET` | `/opportunities/:id` | Get full opportunity detail |
| `PATCH` | `/opportunities/:id` | Update fields. Validates required fields if stage is changing. |
| `DELETE` | `/opportunities/:id` | Hard delete (used internally during pipeline transitions after verification) |
| `POST` | `/opportunities/:id/move` | Move within same pipeline. Body: `{ "stageId": "target_stage_id" }`. Validates required fields for target stage. Sets tags. Fires automations. |
| `POST` | `/opportunities/:id/transfer` | Cross-pipeline transfer. Body: `{ "targetPipelineId", "targetStageId", "deleteSource": true }`. Two-phase: creates target → verifies → deletes source. Returns `{ "newOpportunityId", "sourceDeleted": true }`. |
| `GET` | `/opportunities/:id/history` | Stage transition history with timestamps |

---

### 15.4 Pipelines (Full CRUD)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/pipelines` | List all pipelines (default + custom) with stage counts, lead counts, order. Response: `[{ id, name, description, icon, color, order, isDefault, stageCount, leadCount }]` |
| `POST` | `/pipelines` | Create custom pipeline. Body: `{ "name", "description?", "icon?", "color?" }`. Returns `{ pipeline }`. Created with zero stages. |
| `GET` | `/pipelines/:id` | Pipeline detail with all stages inline |
| `PATCH` | `/pipelines/:id` | Update pipeline properties. Body: `{ "name?", "description?", "icon?", "color?" }` |
| `DELETE` | `/pipelines/:id` | Delete pipeline. Query: `?migrateLeadsTo=pipelineId&stageMappings=[{"from":"stageId","to":"stageId"}]`. If pipeline has leads and no migration specified, returns `400` with lead count. If `migrateLeadsTo` provided, bulk-moves all leads first, then deletes. |
| `PUT` | `/pipelines/reorder` | Reorder pipelines. Body: `{ "order": ["pipelineId", ...] }`. Persists tab/sidebar order. |
| `GET` | `/pipelines/:id/stats` | Pipeline counts: per-stage count, overdue count, total active, escalated count |
| `POST` | `/pipelines/restore-defaults` | Recreate any missing default pipelines (empty, no leads). Idempotent — skips pipelines that still exist. |

### 15.4b Stages (Full CRUD, within Pipelines)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/pipelines/:id/stages` | List stages for pipeline. Response: `[{ id, name, color, order, timerConfig, requiredFields, tagOnEntry, automationIds, leadCount }]` |
| `POST` | `/pipelines/:id/stages` | Create stage. Body: `{ "name", "color?", "order?", "timerConfig?": { "durationHours", "targetStageId?", "targetPipelineId?" }, "requiredFields?": ["fieldId", ...], "tagOnEntry?" }`. If `order` omitted, appended as last stage. |
| `GET` | `/pipelines/:id/stages/:stageId` | Stage detail: required fields, tags set, timers, automations, lead count |
| `PATCH` | `/pipelines/:id/stages/:stageId` | Update stage. Body: `{ "name?", "color?", "timerConfig?", "requiredFields?", "tagOnEntry?" }` |
| `DELETE` | `/pipelines/:id/stages/:stageId` | Delete stage. Query: `?migrateLeadsTo=stageId` (required if stage has leads — returns `400` otherwise). Moves all leads to target stage within same pipeline, then deletes. |
| `PUT` | `/pipelines/:id/stages/reorder` | Reorder stages. Body: `{ "order": ["stageId", ...] }`. Persists column order. |

### 15.4c Custom Fields

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/fields` | List all fields (system + custom). Response includes `{ id, label, type, isSystem, isRequired, options? }` |
| `POST` | `/fields` | Create custom field. Body: `{ "label", "type": "text|number|currency|date|dropdown|checkbox|phone|email|url", "options?": ["opt1", "opt2"] }` |
| `PATCH` | `/fields/:id` | Update field (label, options). Type change requires `{ "confirmTypeMigration": true }`. |
| `DELETE` | `/fields/:id` | Soft-delete custom field (hidden from UI, data preserved). System fields cannot be deleted. |

---

### 15.5 Stage Automations & Timers

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/automations` | List all automations. Filters: `?pipelineId=`, `?stageId=`, `?type=timer|sms|tag|move|task` |
| `GET` | `/automations/:id` | Automation detail (trigger, conditions, actions) |
| `PATCH` | `/automations/:id` | Update automation (e.g., change timer duration, SMS template). Only customizable fields allowed. |
| `POST` | `/automations/:id/toggle` | Enable/disable automation. Body: `{ "enabled": true|false }` |
| `GET` | `/timers` | List all active timers across system. Filters: `?pipelineId=`, `?opportunityId=`, `?status=active|fired|cancelled` |
| `GET` | `/timers/:opportunityId` | All timers for a specific opportunity |
| `POST` | `/timers/:id/reset` | Reset a timer (used when engagement resets App Process timers) |

---

### 15.6 SMS & Message Approval Gate

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/messages/queue` | Pending approval queue. Filters: `?status=pending|approved|declined`, `?recipientType=client|agent` |
| `POST` | `/messages/queue/:id/approve` | Approve queued message → sends immediately |
| `POST` | `/messages/queue/:id/decline` | Decline queued message → cancelled + logged |
| `POST` | `/messages/queue/bulk-approve` | Approve multiple. Body: `{ "messageIds": [...] }` |
| `GET` | `/messages/templates` | List all SMS templates (27 automated messages) |
| `GET` | `/messages/templates/:id` | Get template with variables and default content |
| `PATCH` | `/messages/templates/:id` | Update template content. Body: `{ "content": "Hi {{name}}..." }`. Variables: `{{name}}`, `{{agent_name}}`, `{{agent_phone}}`, `{{company}}`, `{{carrier}}`, `{{product}}`, `{{price}}`, `{{coverage_amount}}` |
| `POST` | `/messages/templates/:id/reset` | Reset template to system default |
| `POST` | `/messages/send` | Send manual SMS. Body: `{ "contactId", "content" }`. Bypasses approval gate (agent-initiated). |
| `GET` | `/messages/history` | Sent message log. Filters: `?contactId=`, `?templateId=`, `?from=`, `?to=` |

---

### 15.7 Tasks

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/tasks` | List tasks. Filters: `?agentId=`, `?status=open|completed|overdue`, `?opportunityId=`, `?type=one-time|recurring` |
| `POST` | `/tasks` | Create manual task. Body: `{ "title", "dueDate", "opportunityId?", "contactId?", "recurring?": { "intervalHours" } }` |
| `PATCH` | `/tasks/:id` | Update task (title, due date, status) |
| `POST` | `/tasks/:id/complete` | Mark task complete |
| `DELETE` | `/tasks/:id` | Delete task |

---

### 15.8 Tags

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/tags` | List all system tags with counts |
| `GET` | `/tags/:tag/contacts` | List all contacts with a specific tag |
| `POST` | `/tags/bulk` | Bulk add/remove tag. Body: `{ "action": "add|remove", "tag": "string", "contactIds": [...] }` |

---

### 15.9 Metrics & Dashboard

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/metrics` | List all 39 metrics with current agent's toggle level (Off/Watch/Active) |
| `GET` | `/metrics/:id` | Single metric detail: current value, trend, threshold status, formula |
| `GET` | `/metrics/:id/history` | Historical values. Filters: `?period=day|week|month|quarter`, `?from=`, `?to=` |
| `GET` | `/metrics/:id/drilldown` | Detailed breakdown (e.g., close rate by source, by carrier, by agent) |
| `GET` | `/dashboard` | Full dashboard data for current agent. Returns all Watch+Active metrics with values, thresholds, colors. Filters: `?view=scorecard|funnel|revenue|retention|activity|intelligence`, `?timeRange=today|this_week|this_month|this_quarter|ytd`, `?from=`, `?to=` |
| `GET` | `/dashboard/scorecard` | Top bar cards only — fast load for quick check |
| `GET` | `/dashboard/funnel` | Pipeline funnel data: stage counts, conversion %s |
| `GET` | `/dashboard/forecast` | Revenue forecast: projected AP, confidence, pipeline value |

**Manager endpoints (role=manager required):**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/manager/dashboard` | Aggregated metrics across all agents |
| `GET` | `/manager/agents/:agentId/metrics` | All metrics for specific agent (ignores agent's toggle settings) |
| `GET` | `/manager/agents/:agentId/dashboard` | Full dashboard for specific agent |
| `GET` | `/manager/alerts` | All active manager alerts (72h, 14d escalations) |
| `GET` | `/manager/comparison` | Side-by-side agent comparison. Body: `?agentIds=a,b,c&metrics=1,2,3` |

---

### 15.10 Agent Settings & Preferences

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/settings` | All settings for current agent |
| `PATCH` | `/settings` | Update settings. Body: partial settings object. |
| `GET` | `/settings/metrics` | All 39 metric toggle states (Off/Watch/Active) |
| `PATCH` | `/settings/metrics` | Bulk update metric toggles. Body: `{ "metrics": { "1": "off", "2": "watch", "8": "active" } }` |
| `PATCH` | `/settings/metrics/:id` | Single metric toggle. Body: `{ "level": "off|watch|active" }` |
| `GET` | `/settings/notifications` | Notification preferences |
| `PATCH` | `/settings/notifications` | Update notification prefs. Body: `{ "channels": { "sms": true, "push": true, "email": false }, "types": { "new_lead": true, "overdue_alert": true, "reply_needed": true, ... } }` |
| `GET` | `/settings/auto-send` | Auto-send toggle state |
| `PATCH` | `/settings/auto-send` | Toggle auto-send. Body: `{ "enabled": true }`. If enabling, requires `{ "confirmed": true }` (confirmation dialog). |
| `GET` | `/settings/timers` | All customizable timer durations |
| `PATCH` | `/settings/timers` | Update timer durations. Body: `{ "timers": { "p1_new_lead_auto_move": 3, "p1_contact_auto_move": 4, ... } }` (values in days) |
| `GET` | `/settings/escalation` | Escalation threshold configuration |
| `PATCH` | `/settings/escalation` | Update thresholds. Body: `{ "thresholds": { "overdue_24h": 24, "overdue_48h": 48, "manager_alert_72h": 72, "client_risk_7d": 168, "urgent_14d": 336, "auto_terminate_30d": 720 } }` (values in hours) |
| `GET` | `/settings/dashboard-cards` | Which scorecard cards are visible |
| `PATCH` | `/settings/dashboard-cards` | Update visible cards. Body: `{ "cards": ["speed_to_lead", "close_rate", "persistency_13mo", ...] }` |

---

### 15.11 Workflows (Visual Builder)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/workflows` | List all workflows. Filters: `?pipelineId=` |
| `GET` | `/workflows/:id` | Workflow detail: nodes, connections, enabled state |
| `PATCH` | `/workflows/:id` | Update workflow (node positions, connections, content) |
| `POST` | `/workflows/:id/toggle` | Enable/disable. Body: `{ "enabled": true|false }` |
| `POST` | `/workflows` | Create custom workflow |
| `POST` | `/workflows/:id/duplicate` | Duplicate workflow |
| `DELETE` | `/workflows/:id` | Delete custom workflow (cannot delete system defaults — only disable) |
| `GET` | `/workflows/:id/nodes` | List nodes in workflow |
| `POST` | `/workflows/:id/nodes` | Add node. Body: `{ "type": "trigger|wait|condition|action|approval_gate", "config": {...}, "position": {x,y} }` |
| `PATCH` | `/workflows/:id/nodes/:nodeId` | Update node config/position |
| `DELETE` | `/workflows/:id/nodes/:nodeId` | Remove node |
| `POST` | `/workflows/:id/connections` | Add connection between nodes |
| `DELETE` | `/workflows/:id/connections/:connectionId` | Remove connection |

---

### 15.12 Leads (Convenience Wrappers)

These wrap common multi-step operations into single calls for the frontend:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/leads/import` | Bulk import from Google Sheet or CSV. Body: `{ "source": "gsheet|csv", "data": [...], "assignTo": "round-robin|agentId" }` |
| `POST` | `/leads/:id/call` | Log call attempt. Body: `{ "disposition": "connected|voicemail|no_answer|busy", "notes": "", "duration": 0 }`. Auto-creates activity, updates attempt count. |
| `POST` | `/leads/:id/disposition` | One-click disposition. Body: `{ "outcome": "interested|qualified|app_started|not_interested|callback", "callbackDate?": "" }`. Auto-moves to appropriate stage. |
| `POST` | `/leads/:id/schedule-callback` | Create calendar event + task. Body: `{ "dateTime", "notes?" }` |
| `GET` | `/leads/queue` | Agent's prioritized lead queue: ZOMBIE first, REPLY NEEDED second, Qualified third, then by time-in-stage descending. |

---

### 15.13 Notifications

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/notifications` | List notifications. Filters: `?read=true|false`, `?type=` |
| `POST` | `/notifications/:id/read` | Mark notification read |
| `POST` | `/notifications/read-all` | Mark all read |
| `GET` | `/notifications/unread-count` | Badge count |

---

### 15.14 Reports & Export

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/reports/pipeline-summary` | Counts per pipeline per stage, overdue counts |
| `GET` | `/reports/agent-activity` | Activity report. Filters: `?agentId=`, `?from=`, `?to=` |
| `GET` | `/reports/revenue` | Revenue report by period/source/carrier |
| `GET` | `/reports/persistency` | Persistency cohort data |
| `POST` | `/reports/export` | Export any report as CSV. Body: `{ "report": "pipeline-summary|agent-activity|revenue|persistency", "format": "csv", "filters": {...} }` |

---

### 15.15 Webhook Ingress

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/webhooks/lead-inbound` | Receive new lead from external source. Auto-creates contact + opportunity in P1 S1. |
| `POST` | `/webhooks/carrier-update` | Receive carrier email parser updates (approval, decline, requirement). Auto-updates P2 stages. |
| `POST` | `/webhooks/payment-event` | Receive payment success/failure. Draft cleared → P3 progression or P4 exception. |
| `POST` | `/webhooks/client-message` | Inbound SMS/call detection. Triggers REPLY NEEDED, Client Contact stage, ZOMBIE detection. |

---

## 16. CUSTOMIZABLE ELEMENTS REGISTRY

> Everything the agent or manager can change. Each element lists WHERE to change it and WHAT the defaults are.

### 16.1 SMS Message Templates

**Where:** Settings > Message Templates — or `PATCH /api/v1/messages/templates/:id`

All 27 automated messages are customizable. Agent edits the template text; system variables auto-fill at send time.

| # | Template ID | Default Content | Available Variables | Pipeline/Stage |
|---|-------------|----------------|--------------------| ---------------|
| 1 | `sms_speed_to_lead` | "Hi {{name}}, this is {{agent_name}} with {{company}}. I'll be giving you a call shortly regarding your inquiry. Talk soon!" | name, agent_name, company | P1 New Lead |
| 2 | `sms_contact_farewell` | "Hey {{name}}, I haven't been able to reach you. I'll check back in a bit — feel free to reach out anytime at {{agent_phone}}." | name, agent_name, agent_phone | P1 Contact exit |
| 3 | `sms_engaged_interest_gauge` | "Hi {{name}}, just following up on our conversation. Any questions I can help with?" | name, agent_name | P1 Engaged |
| 4 | `sms_qualified_checkin` | "Hi {{name}}, checking in on your application. Ready to move forward?" | name, agent_name, carrier, product | P1 Qualified |
| 5 | `sms_app_checkin` | "Hi {{name}}, following up on your {{product}} application with {{carrier}} ({{price}}/mo). Any questions?" | name, agent_name, carrier, product, price | P1 App Process |
| 6 | `sms_closed_submission` | "Hi {{name}}, this is {{agent_name}}. My personal number is {{agent_phone}} and work number is {{work_phone}} — save both. You'll get automated updates, but reach out to me directly anytime." | name, agent_name, agent_phone, work_phone, company | P1 Closed Won |
| 7 | `sms_closed_congrats` | "Congratulations {{name}}! Your {{product}} application with {{carrier}} has been submitted. {{coverage_amount}} in coverage at {{price}}/mo. {{agent_name}} will keep you updated." | name, agent_name, carrier, product, price, coverage_amount | P1 Closed Won +5min |
| 8 | `sms_approved` | "Great news {{name}}! Your policy has been approved! {{agent_name}} will be reaching out shortly to walk you through everything." | name, agent_name, carrier | P3 Approved |
| 9 | `sms_draft_cleared` | "Hi {{name}}, your first payment has been confirmed. Your coverage is active!" | name, agent_name | P3 Draft Cleared |
| 10 | `sms_exception_agent_alert` | "⚠️ Exception alert: {{contact_name}} — {{exception_type}}. Review ASAP." | contact_name, exception_type, pipeline_link | P4 New Exception |
| 11 | `sms_exception_agent_second` | "⚠️ REMINDER: {{contact_name}} exception still unreviewed (4h). Move to Active Recovery." | contact_name, exception_type | P4 New Exception +4h |
| 12 | `sms_active_recovery_client` | "Hi {{name}}, we noticed an issue with your policy and want to help resolve it. {{agent_name}} will be calling you today." | name, agent_name | P4 Active Recovery |
| 13 | `sms_resolved_client` | "Hi {{name}}, great news — the issue with your policy has been resolved. Everything is back on track!" | name, agent_name | P4 Resolved |
| 14 | `sms_resolved_agent` | "✅ Resolved: {{contact_name}} — {{exception_type}} fixed." | contact_name, exception_type | P4 Resolved |
| 15 | `sms_daily_re_summary` | "Morning briefing: {{active_count}} active exceptions, {{overdue_count}} overdue, {{escalation_summary}}." | active_count, overdue_count, escalation_summary | P4 Daily 8AM |
| 16 | `sms_recycle_reminder_1` | "Reminder: Re-contact {{contact_name}} — Recycle Day 1." | contact_name, original_reason | P5 Recycle Day 1 |
| 17 | `sms_recycle_reminder_15` | "Reminder: Follow up with {{contact_name}} — Recycle Day 15." | contact_name, original_reason | P5 Recycle Day 15 |
| 18 | `sms_recycle_reminder_30` | "Final attempt: {{contact_name}} — Recycle Day 30. Last chance before Uninsurable." | contact_name, original_reason | P5 Recycle Day 30 |
| 19 | `sms_month1_gift` | "Hi {{name}}, thank you for trusting us with your coverage! We'd like to send you a small thank-you gift. What's the best address?" | name, agent_name | P6 Month 1 |
| 20 | `sms_month3_thankyou` | "Hi {{name}}, it's been 3 months since your policy went active. Just checking in — how's everything going?" | name, agent_name | P6 Month 3 |
| 21 | `sms_month6_beneficiary` | "Hi {{name}}, quick check-in — any life changes? Want to review your beneficiaries to make sure everything's up to date?" | name, agent_name | P6 Month 6 |
| 22 | `sms_month12_anniversary` | "Happy anniversary {{name}}! It's been a year since your policy started. Let's do a quick 5-min review — here's my calendar: {{calendar_link}}" | name, agent_name, calendar_link | P6 Month 12 |
| 23 | `sms_nurture_1` | "Hi {{name}}, life gets busy — totally understand. I'll check back in a bit. If anything changes with your coverage needs, I'm here." | name, agent_name, agent_phone | P7 Day 7 |
| 24 | `sms_nurture_2` | "Hi {{name}}, carriers have adjusted some guidelines recently. Might be worth a quick look at your options. Let me know!" | name, agent_name | P7 Day 45 |
| 25 | `sms_nurture_3` | "Thinking of you {{name}} — if you ever want to revisit coverage options, I'm just a text away." | name, agent_name | P7 Day 60 |
| 26 | `sms_nurture_4` | "Hi {{name}}, still looking for coverage? Happy to help if the timing is better now." | name, agent_name | P7 Day 90 |
| 27 | `sms_nurture_5` | "Hi {{name}}, just a quick check-in. Coverage needs change — if yours have, let's talk." | name, agent_name | P7 Day 135 |
| 28 | `sms_nurture_6` | "Hi {{name}}, still here if you need us. This is my last scheduled check-in, but you can always reach me at {{agent_phone}}." | name, agent_name, agent_phone | P7 Day 180 |

**Rules:**
- Variables use `{{double_braces}}` syntax
- Agent can edit content but cannot remove required variables (system warns if a variable is deleted)
- "Reset to default" button restores original template
- Templates can be previewed with sample data before saving

---

### 16.2 Notification Preferences

**Where:** Settings > Notifications — or `PATCH /api/v1/settings/notifications`

**Delivery channels (toggle each independently):**
| Channel | Default | Description |
|---------|---------|-------------|
| SMS to agent phone | ✅ ON | Text message to agent's mobile |
| Push notification | ✅ ON | Browser/app push |
| Email | ❌ OFF | Email digest |
| In-app badge | ✅ ON (always on) | Cannot be disabled — always shows unread count |

**Notification types (toggle each independently per channel):**
| Type | Default | Trigger |
|------|---------|---------|
| New lead assigned | ✅ ON | Lead enters P1 S1 assigned to you |
| Client replied (REPLY NEEDED) | ✅ ON | Client sends message/reply |
| Overdue alert (24h/48h/72h) | ✅ ON | Overdue tags assigned |
| Exception alert | ✅ ON | New exception in P4 |
| Exception escalation | ✅ ON | Client Risk, URGENT tags |
| Task due | ✅ ON | Task reaches due date |
| Task overdue | ✅ ON | Task past due date |
| ZOMBIE alert | ✅ ON | Recycle lead self-reactivates |
| Approval gate pending | ✅ ON | SMS queued for approval |
| Daily RE summary (8AM) | ✅ ON | Morning P4 briefing |
| Carrier update (email parser) | ✅ ON | P2 carrier decision detected |
| Pipeline auto-move | ❌ OFF | When a lead is auto-moved between pipelines |
| Timer fired | ❌ OFF | When any stage timer fires |

---

### 16.3 Timer Durations

**Where:** Settings > Timers — or `PATCH /api/v1/settings/timers`

**All auto-move timers (values in days unless noted):**
| Timer ID | Description | Default | Min | Max |
|----------|-------------|---------|-----|-----|
| `p1_new_lead_to_contact` | New Lead → Contact auto-move | 3 days | 1 | 7 |
| `p1_contact_to_nurture` | Contact → Nurture auto-move | 4 days | 2 | 10 |
| `p1_engaged_to_nurture` | Engaged → Nurture auto-move | 14 days | 7 | 30 |
| `p1_qualified_to_nurture` | Qualified → Nurture auto-move | 7 days | 3 | 14 |
| `p1_app_to_nurture` | App Process → Nurture auto-move | 11 days | 5 | 21 |
| `p1_app_checkin_sms` | App Process check-in SMS | 24 hours | 12h | 72h |
| `p1_qualified_checkin_sms` | Qualified check-in SMS | 48 hours | 24h | 96h |
| `p4_new_exception_first_alert` | First RE alert to agent | 4 hours | 1h | 8h |
| `p4_new_exception_overdue` | RE New Exception → Overdue tag | 24 hours | 12h | 48h |
| `p4_auto_terminate` | Active Recovery → Terminated | 30 days | 14 | 60 |
| `p5_rewrite_to_recycle` | Rewrite → Recycle auto-move | 7 days | 3 | 14 |
| `p5_recycle_total` | Recycle → Uninsurable | 45 days | 30 | 90 |
| `p5_recycle_reminder_1` | First re-contact reminder | Day 1 | Day 1 | Day 7 |
| `p5_recycle_reminder_2` | Second re-contact reminder | Day 15 | Day 7 | Day 30 |
| `p5_recycle_reminder_3` | Final re-contact reminder | Day 30 | Day 20 | Day 44 |
| `p5_uninsurable_review` | Health check timer | 12 months | 6mo | 24mo |
| `p6_month1_to_month3` | Month 1 → Month 3 | 30 days | 21 | 45 |
| `p6_month3_to_month6` | Month 3 → Month 6 | 90 days | 60 | 120 |
| `p6_month6_to_month12` | Month 6 → Month 12 | 180 days | 120 | 270 |
| `p7_nurture_sms_1` | Nurture SMS 1 | Day 7 | Day 3 | Day 14 |
| `p7_nurture_sms_2` | Nurture SMS 2 | Day 45 | Day 30 | Day 60 |
| `p7_nurture_sms_3` | Nurture SMS 3 | Day 60 | Day 45 | Day 90 |
| `p7_nurture_sms_4` | Nurture SMS 4 | Day 90 | Day 60 | Day 120 |
| `p7_nurture_sms_5` | Nurture SMS 5 | Day 135 | Day 100 | Day 160 |
| `p7_nurture_sms_6` | Nurture SMS 6 (final) | Day 180 | Day 150 | Day 210 |
| `p7_nurture_to_recycle` | Nurture → Recycle (after final SMS, no reply) | Day 180 | Tied to SMS 6 | Tied to SMS 6 |

---

### 16.4 Escalation Thresholds

**Where:** Settings > Escalation — or `PATCH /api/v1/settings/escalation`

**Applies to Pipeline 4 Active Recovery and Pipeline 1 Contact:**
| Threshold ID | Description | Default | Min | Max | Manager Alert? |
|-------------|-------------|---------|-----|-----|---------------|
| `overdue_24h` | First overdue tag | 24h | 12h | 48h | No |
| `overdue_48h` | Second overdue tag | 48h | 24h | 72h | No |
| `overdue_72h` | Third overdue + manager alert | 72h | 48h | 120h | ✅ Yes |
| `client_risk_7d` | Client Risk tag | 7 days | 5d | 14d | No |
| `urgent_14d` | URGENT tag + manager alert | 14 days | 10d | 21d | ✅ Yes |
| `auto_terminate_30d` | Auto-move to Terminated | 30 days | 14d | 60d | No |
| `unreachable_final` | Unreachable → Terminated (after 5+ attempts) | 7 days | 5d | 14d | No |

**Manager alert delivery:** SMS + push notification + in-app alert to all managers.

---

### 16.5 Dashboard Card Selection

**Where:** Dashboard > gear icon OR Settings > Dashboard — or `PATCH /api/v1/settings/dashboard-cards`

Agent chooses which metrics appear in the scorecard top bar. Default selection:

| Card | Default Shown | Can Remove? |
|------|--------------|-------------|
| Speed to Lead | ✅ | Yes |
| Close Rate | ✅ | Yes |
| Pipeline Velocity | ✅ | Yes |
| Persistency (13-mo) | ✅ | Yes |
| Total AP Written | ✅ | Yes |
| Exception Rate | ✅ | Yes |
| All other 33 metrics | ❌ (available) | — |

Any metric set to Watch or Active can be added as a scorecard card. Metrics set to Off cannot appear in the scorecard.

---

### 16.6 Metric Engagement Levels

**Where:** Settings > Metrics — or `PATCH /api/v1/settings/metrics/:id`

**Default levels (out of box):**
| Category | Metrics | Default Level |
|----------|---------|--------------|
| Speed (1-3) | Speed to Lead, Response Time, Overdue Rate | Watch |
| Contact (4-7) | Contact Rate, Attempts, Engagement, Qualification | Watch |
| Conversion (8-10) | Close Rate, App-to-Close, Velocity | Watch |
| Revenue (11-15) | All revenue metrics | Watch |
| Approval (17-20) | All approval metrics | Off |
| Persistency (21-22) | Persistency, Danger Zone | Off |
| Retention (23-26) | Exception, Save, Resolve Time, Chargeback | Off |
| Recapture (27-30) | All recapture metrics | Off |
| Activity (31-34) | All activity metrics | Off |
| Intelligence (35-39) | All intelligence metrics | Off |

**Rationale:** New agents start with the basics visible. Advanced metrics are available but not overwhelming. Agent turns things on as they grow.

---

### 16.7 Auto-Send Toggle

**Where:** Settings > Message Approval — or `PATCH /api/v1/settings/auto-send`

| Setting | Default | Effect |
|---------|---------|--------|
| Auto-send client messages | ❌ OFF | All automated SMS queued for approval |
| Auto-send agent alerts | ✅ ON | Agent-to-agent alerts send without approval |

Enabling auto-send client messages shows: *"⚠️ This will automatically send all system-generated messages to clients without your review. Messages will be sent using your current templates. Are you sure?"* — Requires explicit confirmation.

---

### 16.8 Customization Summary Matrix

| What | Who Can Change | Where | API Endpoint |
|------|---------------|-------|-------------|
| SMS templates | Agent, Manager | Settings > Templates | `PATCH /messages/templates/:id` |
| Notification channels | Agent | Settings > Notifications | `PATCH /settings/notifications` |
| Notification types | Agent | Settings > Notifications | `PATCH /settings/notifications` |
| Timer durations | Manager only | Settings > Timers | `PATCH /settings/timers` |
| Escalation thresholds | Manager only | Settings > Escalation | `PATCH /settings/escalation` |
| Dashboard cards | Agent | Dashboard > gear | `PATCH /settings/dashboard-cards` |
| Metric levels | Agent | Settings > Metrics | `PATCH /settings/metrics/:id` |
| Auto-send toggle | Agent | Settings > Message Approval | `PATCH /settings/auto-send` |
| Workflows | Manager only | Pipeline > Workflows tab | `PATCH /workflows/:id` |

---

## 17. AGENT USER MANUAL

> Written in plain language. This ships in-app as a help section and as a standalone doc.

---

### 17.1 Welcome to Your CRM

This system does one thing: help you sell more policies and keep them on the books. It tracks every lead from first contact through years of retention. You work the pipeline — the system handles the reminders, follow-ups, and paperwork.

**Two things to know right now:**
1. **Your main screen is for selling.** Pipeline cards, lead info, call buttons. That's it. No charts, no numbers, no distractions.
2. **The Dashboard is for reviewing your business.** Click into it when you want to see how things are going. Click back to get back to selling.

---

### 17.2 How Your Pipelines Work

You have 7 pipelines. A lead flows through them like this:

```
You get a lead → You sell them (Lead Management)
               → App goes to carrier (Approval Process)
               → Policy gets activated (Policy Lifecycle)
               → Client stays long-term (Inforce Clients)
```

**If things go sideways:**
- Lead goes cold → They go into **Nurture** (gentle texts over 6 months)
- Carrier says no → They go to **Rewrite** (try a different carrier)
- Payment fails → They go to **Retention Exceptions** (fix the problem)

**The key rule:** When a lead moves between pipelines, it gets cleaned up — removed from the old pipeline entirely. No clutter. Your pipeline always shows what's real and current.

#### Pipeline 1: Lead Management (Where You Sell)
This is where you spend most of your time. Six stages:

1. **New Lead** — Just came in. Call them within 5 minutes. You have 3 days before the system moves them along.
2. **Contact** — You're trying to reach them. 4 days to make contact, then they go to Nurture.
3. **Engaged Interest** — They're interested! Keep the conversation going. 14 days before auto-nurture.
4. **Qualified Interest** — They gave you their SSN. This is serious. 7 days to start an app.
5. **Application Process** — You're working the app. Fill in: Carrier, Product, Price, Health Status. 11 days to complete — but any time they respond, the clock resets.
6. **Closed Won** — App submitted! Fill in Coverage Amount and you're done. The system handles the rest.

#### Pipeline 2: Approval Process (Carrier's Turn)
Two stages: Submitted → Underwriting/Requirements. You wait for the carrier, chase requirements every 72 hours, and the system auto-creates reminders for you.

#### Pipeline 3: Policy Lifecycle (Getting It Active)
Four stages: Approved → Draft Cleared → Delivered → In Force. Walk the client through delivery, confirm their first payment clears, and once the carrier says it's active — done.

#### Pipeline 4: Retention Exceptions (Save the Policy)
Four stages when something goes wrong — payment failure, lapse risk, cancellation request:
1. **New Exception** — Review within 4 hours
2. **Active Recovery** — Work the case. Call the client. Fix the problem. You have 30 days.
3. **Resolved** — You saved it! 🎉
4. **Terminated** — Couldn't save it. Document why. The system sends it to Rewrite for a second chance.

*You'll get an 8AM text every morning with your exception counts.*

#### Pipeline 5: Rewrite (Second Chances)
Three stages: Rewrite (7 days to try new carrier) → Recycle (45 days of periodic re-contact) → Uninsurable (12-month health check). If a "dead" lead reaches out on their own, you get 3 alerts and they're tagged as a ZOMBIE — treat them like a hot lead.

#### Pipeline 6: Inforce Clients (Keep Them Forever)
Five stages on an annual cycle:
- **Month 1:** Welcome, send a gift
- **Month 3:** The Danger Zone — check in, catch problems early
- **Month 6:** Beneficiary review
- **Month 12:** Annual review call (do this one personally, not just a text)
- **Client Contact:** When they call/text you, respond ASAP

If a client mentions billing issues or cancellation at any point, they automatically go to Retention Exceptions.

#### Pipeline 7: Nurture (Stay in Touch)
One stage, 6 months, 6 text messages. Gentle touchpoints to keep your name in their mind. If they reply positively, they jump right back to Lead Management. If they never reply, they move to Recycle after 6 months.

---

### 17.3 What Runs Automatically vs What You Control

#### The system does these things for you:
- Sends reminder texts to clients at the right times (you approve each one first — see Message Approval below)
- Moves leads to the next stage when time limits are reached
- Tags leads with status labels (New Lead, Overdue, Lapse Risk, etc.)
- Creates follow-up tasks on your task list
- Sends you alerts when something needs attention
- Tracks every call, text, and stage change automatically

#### You control:
- When and how you contact leads (the system suggests, you decide)
- Moving leads between stages manually when something happens (client is interested, SSN provided, etc.)
- Approving or declining automated messages before they send
- Which metrics you see on your dashboard
- Which automations and suggestions are turned on
- Your SMS templates (customize any automated message)
- Whether automated messages need your approval or send automatically

---

### 17.4 Message Approval

**By default, every automated text to a client needs your approval.**

When the system wants to send a message, you'll see a notification with:
- The message content
- Who it's going to
- Two buttons: **APPROVE** (sends it) or **DECLINE** (cancels it)

If you don't tap either button, the message just sits there — it won't send on its own.

**Want messages to send automatically?** Go to Settings > Message Approval and turn on "Auto-Send Client Messages." You'll get a confirmation warning. You can turn it off anytime.

---

### 17.5 The Off / Watch / Active System

Every metric in the system (there are 39 of them) has three modes you can set independently:

| Mode | What It Means | Good For |
|------|--------------|----------|
| **Off** | You don't see it. But the system is still tracking the data in the background. | Metrics you don't care about yet. You can turn them on later and see historical data. |
| **Watch** | You see the numbers on your dashboard. No automations or suggestions attached. | When you want to observe a metric without being nudged about it. |
| **Active** | You see the numbers AND get smart suggestions and automations. | When you want the system to actively help you improve this number. |

**Example:** If you set "Best Time to Call" to Active, you'll see suggestions like "Your contact rate is 15% higher between 10-11 AM." If you set it to Watch, you see the heatmap but no suggestions. If you set it to Off, it's hidden but still collecting data.

**How to change:** Settings > Metrics. Each metric has a simple three-way toggle.

**Tip for new agents:** Start with everything at the default (most are on Watch or Off). Turn things to Active as you get comfortable. You can always change it.

---

### 17.6 Your Dashboard

Click the **Dashboard** button to enter review mode. Click back to return to your pipeline.

#### Six views:

1. **Agent Scorecard** (default) — Color-coded cards for your key numbers. Green = good, yellow = watch it, red = needs work. Click any card to see details.

2. **Pipeline Funnel** — See exactly where leads are dropping off. Shows New Lead → Contact → Engaged → Qualified → App → Closed with percentages at each step.

3. **Revenue & Production** — How much money you're writing. By week, month, quarter. By lead source, by carrier. Revenue forecast based on your current pipeline.

4. **Retention & Persistency** — Are policies staying on the books? Exception rate, save rate, chargeback risk. This is your long-term health.

5. **Activity & Accountability** — Calls made, talk time, leads worked, overdue counts. (Managers see all agents side by side.)

6. **Intelligence** — Best time to call (heatmap), state performance, carrier comparison, lead source ROI, where your funnel drops off.

**Time filters on every view:** Today, This Week, This Month, This Quarter, Year to Date, or pick custom dates.

**Customize your scorecard:** Click the gear icon on the scorecard to choose which cards appear in your top bar.

---

### 17.7 Step-by-Step: Common Tasks

#### Moving a lead to the next stage
1. Open the lead card (click on it in the pipeline)
2. Fill in any required fields for the next stage (the system will tell you what's needed)
3. Click the stage you want to move them to — or use the "Move to" dropdown
4. Alternatively: drag the lead card to the target stage column

#### Setting a disposition after a call
1. After your call, click the **Disposition** button on the lead card
2. Choose the outcome: Connected (interested), Connected (not interested), Voicemail, No Answer, Busy, Callback
3. If Callback: pick a date and time — the system creates a calendar event and task
4. The system automatically moves the lead if appropriate (e.g., "interested" → Engaged Interest)

#### Scheduling a callback
1. Open the lead card
2. Click **Schedule Callback**
3. Pick date and time
4. Add optional notes
5. The system creates a calendar event + a task that shows on your task list

#### Approving a message
1. You'll see a notification (push/SMS/in-app depending on your settings)
2. Click the notification to see the message
3. Read the content and who it's going to
4. Tap **APPROVE** to send or **DECLINE** to cancel
5. To bulk-approve: go to the message queue (Messages > Pending) and approve multiple at once

#### Customizing an SMS template
1. Go to Settings > Message Templates
2. Find the template you want to change
3. Edit the text — keep the {{variables}} in place (the system fills those in automatically)
4. Preview with sample data
5. Save. All future messages using that template will use your new version.
6. Changed your mind? Hit "Reset to Default"

#### Turning on a metric
1. Go to Settings > Metrics
2. Find the metric (organized by category: Speed, Contact, Conversion, etc.)
3. Toggle between Off → Watch → Active
4. If Active: you'll start getting suggestions related to that metric
5. Changes take effect immediately

#### Checking your morning briefing
1. Check your 8AM text — it has your exception pipeline counts
2. Click into Dashboard > Agent Scorecard for the full picture
3. Note any red cards — those need attention today
4. Click back to pipeline view and start selling

#### Handling a ZOMBIE lead
1. You'll get 3 alerts (SMS + push + in-app) when a Recycle lead reaches out
2. The lead is tagged ZOMBIE in your pipeline — it appears at the top of your queue
3. Treat it as a hot lead — call back within 5 minutes
4. If interested: move them to Lead Management at the appropriate stage
5. The system handles the pipeline transfer (delete from Recycle, create in LM)

#### Responding to a client contact (inforce)
1. You'll get a REPLY NEEDED notification
2. Open the lead in your Inforce Clients pipeline — they'll be in the Client Contact stage
3. Respond to their question/concern
4. If it's a billing issue or cancel request → the system offers to move them to Retention Exceptions
5. If it's a general question → answer it, remove the tag, they go back to their month stage
6. If it's a referral → handle it, document it

---

### 17.8 What You Can Customize (Quick Reference)

| What | Where | Can You Change It? |
|------|-------|--------------------|
| Automated text messages | Settings > Templates | ✅ Edit any message |
| Which alerts you get | Settings > Notifications | ✅ Toggle each type on/off |
| How alerts reach you (SMS, push, email) | Settings > Notifications | ✅ Toggle each channel |
| Message approval (on/off) | Settings > Message Approval | ✅ On by default, you can turn off |
| Which metrics you see | Settings > Metrics | ✅ Off / Watch / Active per metric |
| Dashboard scorecard cards | Dashboard > gear icon | ✅ Pick which cards appear |
| Stage timer durations | Settings > Timers | ⚠️ Manager only |
| Escalation thresholds | Settings > Escalation | ⚠️ Manager only |
| Workflow automations | Pipeline > Workflows tab | ⚠️ Manager only |
| Pipelines | Pipeline switcher "+" button | ✅ Create, edit, delete, reorder |
| Stages | Stage column header / "+" button | ✅ Create, edit, delete, reorder |
| Custom fields | Settings > Custom Fields | ✅ Create, edit, soft-delete |

### 17.9 Customizing Pipelines & Stages

The system ships with 7 pipelines pre-built — they're a best-practice starting point, not a straitjacket. You can change anything.

#### Switching between pipelines
Your pipelines appear as tabs across the top of your screen. Click any tab to instantly jump to that pipeline. The current pipeline is highlighted. Each tab shows how many leads are in it.

#### Creating a new pipeline
1. Click the **"+"** button at the end of your pipeline tabs
2. Give it a name (required), plus optional description, icon, and color
3. It starts empty — add stages next

#### Adding stages to a pipeline
1. In your pipeline view, click the **"+"** button after the last column
2. Name the stage (required)
3. Optionally set: color, timer (auto-move after X days), required fields, tag-on-entry
4. The stage appears as a new column — drag it to reposition

#### Editing a stage
1. Click the stage column header
2. Change the name, color, timer, or required fields
3. Save — changes apply immediately

#### Deleting a stage
1. Click the stage column header → Delete
2. If there are leads in this stage, you MUST move them to another stage first (the system will prompt you)
3. Confirm deletion

#### Deleting a pipeline
1. Right-click the pipeline tab (or click the gear icon) → Delete
2. If there are leads, choose: move them to another pipeline, or delete them permanently
3. Type the pipeline name to confirm

#### Reordering
- **Pipelines:** Drag tabs left/right
- **Stages:** Drag column headers left/right
- Changes save automatically

#### About the default pipelines
The 7 pipelines that came with the system (Lead Management, Approval Process, etc.) work like any other pipeline — you can edit their names, add/remove stages, or delete them entirely. If you want them back, go to Settings > Restore Default Pipelines.

---

## 18. BUILD SEQUENCE & DEPENDENCIES

### Phase 1: Foundation
1. Data model — contacts, opportunities, custom fields, tags, activity feed
2. Pipeline CRUD — create, read, update, delete, reorder pipelines
3. Stage CRUD — create, read, update, delete, reorder stages within pipelines
4. Seed 7 default pipelines with all stages as templates
5. Required field gates per stage (system + custom fields)
6. Cross-pipeline transition logic (create → verify → DELETE)
7. Tag system (set, stack, remove)
8. Custom field system (CRUD, type migration)

### Phase 2: Core Pipeline Logic
6. Pipeline 1 (LM) — all 6 stages, all timers, all auto-moves
7. Pipeline 2 (AP) — 2 stages, task creation
8. Pipeline 3 (PL) — 4 stages, persistency clock start
9. Pipeline 4 (RE) — 4 stages, escalation ladder, tag-based sub-classification
10. Pipeline 5 (Rewrite) — 3 stages, recycle timers, ZOMBIE detection
11. Pipeline 6 (Active) — 5 stages, annual cycle, client contact detection
12. Pipeline 7 (Nurture) — 1 stage, 6-SMS drip, response detection

### Phase 3: Automation Layer
13. Message Approval Gate (global)
14. SMS templates for all automated messages
15. Auto-timer system (stage timeouts → auto-moves)
16. Escalation tag system (time-based tag assignment)
17. Notification system (agent SMS alerts, push notifications)
18. Daily 8AM RE pipeline summary

### Phase 4: Dashboard & Metrics
19. Metric calculation engine (all 39 metrics)
20. Three-level toggle system (Off/Watch/Active per metric)
21. Dashboard layout — 8 sections, 6 views
22. Scorecard top bar with color coding
23. Time filter system
24. Drill-down views per metric

### Phase 5: Intelligence & UX
25. Visual Workflow Builder
26. Best Time to Call heatmap
27. Revenue Forecast engine
28. Funnel Drop-Off visualization
29. Manager view (all agents, all metrics)
30. Settings page (metric toggles, auto-send toggle, workflow management)

### Phase 6: Customization Engine
31. Pipeline CRUD (create, rename, recolor, reorder, delete with migration)
32. Stage CRUD (add, edit, reorder, delete with migration within any pipeline)
33. SMS template editor (view, edit, preview, reset all 27 templates)
34. Timer/threshold configuration UI
35. Notification preference management
36. Settings page unifying all customizable elements

### Phase 7: API Layer
37. REST API for all pipeline/stage/lead CRUD operations
38. REST API for metrics, toggles, dashboard config
39. REST API for approval gate, SMS templates, timers, notifications
40. REST API for auth, users, tags, tasks, callbacks, workflows
41. Bulk operations endpoints (import, migrate, delete)

### Phase 8: Phone & Dialer System
42. Call recording with two-party consent disclosure (Twilio Recording API)
43. Call recording playback (inline audio player in call history + lead activity feed)
44. Audio device selection UI (mic/speaker/headset enumeration, Twilio Voice SDK binding)
45. Ringing system (outbound ring tone, incoming ring + visual notification, volume control)
46. Voicemail Drop system (record, manage, AMD auto-drop, power dialer integration)
47. Voicemail Inbox (inbound voicemails, playback, lead linking, notifications)
48. Caller ID / CNAM registration on all 5 Twilio numbers
49. Phone API endpoints + Twilio webhook handlers (recording, voicemail, call-status)
50. `twilio_calls` table fix: add `lead_name` column + backfill

### Phase 9: Polish & UX
51. Selling Mode / Review Mode separation enforcement
52. One-click actions
53. Drag-and-drop pipeline management (pipelines AND stages)
54. Inline field editing
55. Batch operations / power dialer integration
56. Pipeline switching UI (always visible, instant, keyboard shortcuts)
57. Agent User Manual accessible in-app (help/onboarding)

---

## 19. ACCEPTANCE CRITERIA

Mason knows the build is DONE when:

### Pipeline Criteria
- [ ] All 7 pipelines exist with correct stage counts (6, 2, 4, 4, 3, 5, 1 = 25 stages total)
- [ ] Required fields gate stage progression correctly
- [ ] Every stage sets the correct TAG on entry
- [ ] All auto-move timers fire correctly at specified day counts
- [ ] Cross-pipeline transitions create new opp, verify data, then DELETE source
- [ ] No opportunity exists in two pipelines simultaneously (except during transfer verification)
- [ ] Pipeline 4 uses tags (Lapse Risk, Unreachable) not stages for sub-classification
- [ ] Closed Won requires ONLY: Carrier, Product, Price, Health Status, Coverage Amount
- [ ] Recycle is 45 days with Day 1/15/30 reminders, Day 45 → Uninsurable
- [ ] Nurture is 6 months, 6 SMS at Day 7/45/60/90/135/180, Day 180 no reply → Recycle

### Pipeline & Stage Customization Criteria
- [ ] Pipeline switcher visible at all times in selling mode with lead counts per tab
- [ ] Switching pipelines is instant — no full page reload
- [ ] Custom pipelines can be created, edited, deleted, reordered
- [ ] Custom stages can be created, edited, deleted, reordered within any pipeline
- [ ] Deleting a pipeline with leads requires migration or explicit confirmation
- [ ] Deleting a stage with leads requires migration to another stage (mandatory)
- [ ] Default 7 pipelines are editable/deletable — no special protection
- [ ] "Restore Default Pipelines" recreates missing defaults (empty)
- [ ] Custom fields can be created and used as required fields on any stage
- [ ] Stage drag-and-drop reorder works and persists

### UX Criteria
- [ ] Default view is pipeline/selling — ZERO metrics visible
- [ ] Dashboard requires deliberate navigation action to access
- [ ] No metric data leaks into pipeline cards, headers, sidebars, or footers
- [ ] All 39 metrics have Off/Watch/Active toggle in Settings
- [ ] Off metrics still collect data silently
- [ ] Watch metrics show data, no automations
- [ ] Active metrics show data + automations/suggestions
- [ ] Manager can see all metrics for all agents regardless of toggles

### Automation Criteria
- [ ] Message Approval Gate intercepts all automated SMS
- [ ] Approval Gate default is ON (require approval)
- [ ] Auto-send toggle works with confirmation dialog
- [ ] Escalation tags fire at correct intervals (24h/48h/72h/7d/14d/30d in P4)
- [ ] Manager alerts fire at 72h and 14d thresholds
- [ ] ZOMBIE detection works (client contact during Recycle → 3 alerts + tag)
- [ ] Daily 8AM RE pipeline summary SMS sends correctly

### Dashboard Criteria
- [ ] 8 sections render correctly with all metrics
- [ ] 6 views accessible and filtered appropriately
- [ ] Color coding (green/yellow/red) matches thresholds in spec
- [ ] Time filters work: Today, This Week, This Month, This Quarter, YTD, Custom
- [ ] Scorecard cards are selectable per agent preference
- [ ] Click-to-drill works on every card

### API Criteria
- [ ] All endpoints in Section 15 implemented and returning correct responses
- [ ] Auth/role enforcement: manager-only endpoints reject agent tokens
- [ ] `POST /opportunities/:id/transfer` performs two-phase create→verify→delete
- [ ] `PATCH /settings/metrics/:id` accepts only off/watch/active values
- [ ] `PATCH /settings/auto-send` requires `confirmed: true` when enabling
- [ ] `GET /dashboard` respects agent's metric toggle settings (only Watch+Active)
- [ ] `GET /manager/agents/:agentId/metrics` ignores agent toggles (shows all)
- [ ] `PATCH /messages/templates/:id` validates required variables still present
- [ ] `PATCH /settings/timers` enforces min/max bounds
- [ ] Webhook endpoints create contacts/opportunities correctly
- [ ] `GET /leads/queue` returns correctly prioritized list (ZOMBIE > REPLY NEEDED > Qualified > time-in-stage)

### Customization Criteria
- [ ] All 28 SMS templates editable with preview and reset-to-default
- [ ] Notification preferences toggleable per channel and per type
- [ ] Timer durations editable by manager with min/max enforcement
- [ ] Escalation thresholds editable by manager with min/max enforcement
- [ ] Dashboard card selection persists per agent
- [ ] Metric engagement levels persist per agent and affect dashboard rendering
- [ ] Auto-send toggle works with confirmation dialog

### User Manual Criteria
- [ ] Help section accessible in-app
- [ ] All 7 pipelines explained in plain language
- [ ] Common task step-by-steps accurate and complete
- [ ] Customization quick-reference matches actual settings UI

### API Criteria
- [ ] Every endpoint in Section 15 returns correct response shape
- [ ] Auth enforced: agent endpoints require agent+ role, manager endpoints require manager role
- [ ] Pipeline CRUD works: create, read, update, delete (with lead migration), reorder
- [ ] Stage CRUD works: create, read, update, delete (with lead migration), reorder via drag
- [ ] Lead CRUD works: create, read, update, delete, move (within pipeline), transfer (cross-pipeline)
- [ ] Bulk import accepts CSV/XLSX, maps fields, creates leads in correct stage
- [ ] Bulk migrate moves leads between stages/pipelines before delete operations
- [ ] Metric toggle endpoints persist Off/Watch/Active per metric per user
- [ ] SMS template CRUD: read all 27, update content, preview with lead data, reset to default
- [ ] Timer config: read all timers, update duration and enabled state
- [ ] Notification preferences persist per user across sessions
- [ ] Approval gate: queue renders, approve sends SMS, decline logs, bulk approve works
- [ ] Dashboard config persists visible cards and card order per user

### Customization Engine Criteria
- [ ] Users can create new pipelines (name, description, icon, color)
- [ ] Users can delete pipelines only after migrating all leads (enforced)
- [ ] Users can reorder pipelines via drag-and-drop in sidebar
- [ ] Users can add/delete/reorder stages within ANY pipeline (default or custom)
- [ ] Stage properties editable: name, color, timer duration, automations, required fields
- [ ] Default 7 pipelines are fully editable (rename, restructure, delete)
- [ ] Pipeline switching is instant (no page reload, one click)
- [ ] All 27 SMS templates editable with preview and reset-to-default
- [ ] All 27 customizable elements from Section 16.3 are accessible in Settings
- [ ] Deleting a stage with leads shows migration dialog before allowing delete

### Agent User Manual Criteria
- [ ] In-app help accessible from every major view
- [ ] Language is plain English, no developer jargon
- [ ] Step-by-step guides cover all 9 common tasks from Section 17.8
- [ ] Screenshots/illustrations for pipeline concepts and navigation

### Phone & Dialer Criteria
- [ ] Every call records via Twilio Recording API
- [ ] Two-party consent disclosure plays at call start before audio connects
- [ ] Recordings playable from call history (inline audio player with play/pause/scrub/speed)
- [ ] Recordings linked to leads and visible in lead activity feed
- [ ] Audio device selection UI: enumerate mics, speakers, headsets; persist choice; test button works
- [ ] Hot-swap devices mid-call without disconnecting
- [ ] Outbound ring tone plays in browser while connecting
- [ ] Incoming calls: audible ring + visual banner with caller info + Accept/Decline
- [ ] Ring tone volume independently configurable
- [ ] Voicemail Drop: record in-browser, upload, name, select during AMD, auto-drop option
- [ ] Voicemail Drop integrates with power dialer (AMD → drop → auto-advance)
- [ ] Voicemail Inbox: list, play, mark handled, delete, badge count, notifications
- [ ] Inbound voicemails linked to matching leads
- [ ] CNAM registered on all 5 Twilio numbers with status display
- [ ] STIR/SHAKEN attestation level visible per number
- [ ] `twilio_calls` table has `lead_name` column populated and backfilled
- [ ] All Phone API endpoints from Appendix C.6 functional
- [ ] Twilio webhooks (recording, voicemail, call-status) handled correctly

---

## 20. RISK REGISTER

| Risk | Impact | Mitigation |
|------|--------|------------|
| Timer accuracy at scale (many leads) | Auto-moves fire late or not at all | Use job queue with retry logic, not cron-based |
| Cross-pipeline DELETE race condition | Data loss if delete fires before create confirms | Two-phase commit: create → verify → DELETE. Never delete without verification. |
| Metric calculation performance | Dashboard slow with large datasets | Pre-calculate metrics on schedule (not real-time). Cache aggressively. |
| SMS volume overwhelming Approval Gate | Agent drowns in approval requests | Clear queue UI, bulk approve option, auto-send toggle prominently offered |
| Tag accumulation bloat | Contact records with 50+ tags become unmanageable | Implement tag cleanup on stage transitions; escalation tags explicitly removed on resolution |
| Manager view privacy concerns | Agents feel surveilled | Manager view is separate — agents don't see that managers can see everything |
| Nurture/Recycle re-entry loops | Lead bounces P1→P7→P5→P1→P7 forever | No forced cutoff — leads can cycle as many times as needed. Track cycle count for reporting but do NOT auto-route to Uninsurable. Boss's decision. |
| Template variable removal | Agent edits SMS template and removes {{name}}, message goes out impersonal | Validate required variables on save; warn but allow (some variables are required, some optional) |
| Timer customization breaking pipeline logic | Manager sets Recycle reminder 3 after Recycle total timer | Enforce: reminder timers must be < total timer. API validates relationships. |
| API rate limiting on dashboard | Dashboard polls all 39 metrics on load | Pre-calculate metrics on schedule; cache dashboard payloads; single GET returns full dashboard |
| Webhook replay/duplication | Same carrier email parsed twice creates duplicate exceptions | Idempotency keys on webhook endpoints; dedup by source+timestamp within 5-minute window |
| Default pipeline deletion breaks automations | Agent deletes P4 (Retention Exceptions) and cross-pipeline auto-moves fail | Automations that reference a deleted pipeline log an error and queue for manual review. System warns before deleting a pipeline that is referenced by automations in other pipelines. |
| Too many custom pipelines overwhelm UI | Agent creates 20 pipelines, tab bar becomes unusable | Overflow handling: horizontal scroll or "More..." dropdown after ~8 tabs. Soft limit warning at 15 pipelines. |
| Stage deletion data loss | Agent deletes stage, forgets leads were there | Stage deletion with leads is blocked — must migrate first. API returns `400` with lead count if migration not specified. |

---

## APPENDIX A: ALL CROSS-PIPELINE TRANSITIONS

| From | To | Trigger | Delete Source? |
|------|----|---------|----------------|
| P1 Closed Won → | P2 Submitted | App submitted | ✅ DELETE from P1 |
| P1 Contact/Engaged/Qualified/App → | P7 Nurture | Auto-timer or agent | ✅ DELETE from P1 |
| P2 UW → | P3 Approved | Carrier approves | ✅ DELETE from P2 |
| P2 UW → | P5 Rewrite | Carrier declines | ✅ DELETE from P2 |
| P2 Submitted → | P3 Approved | Approved as Applied bypass | ✅ DELETE from P2 |
| P3 Draft Cleared → | P4 New Exception | Draft fails | ✅ DELETE from P3 |
| P3 In Force → | P6 Month 1 | Policy active | ✅ DELETE from P3 |
| P4 Resolved → | P3 or P6 (calendar-based month stage) | Policy saved — P6 return uses `months_since(in_force_date)` | ✅ DELETE from P4 |
| P4 Terminated → | P5 Rewrite | Policy lost | ✅ DELETE from P4 |
| P5 Rewrite → | P1 App Process | Viable rewrite | ✅ DELETE from P5 |
| P5 Recycle → | P1 (appropriate stage) | Client interested | ✅ DELETE from P5 |
| P6 Month 3/6 → | P4 New Exception | Negative reply | ✅ DELETE from P6 |
| P6 Client Contact → | P4 New Exception | Billing/cancel issue | ✅ DELETE from P6 |
| P7 Nurture → | P1 Engaged Interest | Positive reply | ✅ DELETE from P7 |
| P7 Nurture → | P5 Recycle | Day 180 no reply | ✅ DELETE from P7 |

**Every transition: CREATE destination → VERIFY data → DELETE source. No exceptions.**

---

## APPENDIX B: ALL AUTOMATED SMS MESSAGES

All go through Approval Gate unless auto-send is enabled.

| Pipeline | Stage | Timing | Recipient | Content Summary |
|----------|-------|--------|-----------|----------------|
| P1 | New Lead | On entry | Client | Speed-to-lead intro |
| P1 | Contact | On 4-day exit | Client | Farewell SMS |
| P1 | Engaged | On entry | Client | Interest gauge |
| P1 | Qualified | 48h no activity | Client | Check-in |
| P1 | App Process | 24h no activity | Client | Check-in w/ details |
| P1 | Closed Won | On entry | Client | Submission reminder (agent info) |
| P1 | Closed Won | +5 min | Client | Congratulations w/ details |
| P3 | Approved | On entry | Client | Approval congrats |
| P3 | Draft Cleared | On entry | Client | Payment confirmed |
| P4 | New Exception | On entry | Agent | Alert |
| P4 | New Exception | +4h | Agent | Second alert |
| P4 | Active Recovery | On entry | Client | Issue notification |
| P4 | Resolved | On resolution | Client + Agent | Confirmation |
| P4 | Daily | 8AM | Agent | RE pipeline summary |
| P5 | Recycle | Day 1 | Agent | Re-contact reminder |
| P5 | Recycle | Day 15 | Agent | Re-contact reminder |
| P5 | Recycle | Day 30 | Agent | Final attempt reminder |
| P6 | Month 1 | On entry | Client | Gift/card message |
| P6 | Month 3 | On entry | Client | Thank you |
| P6 | Month 6 | On entry | Client | Beneficiary check |
| P6 | Month 12 | On entry | Client | Anniversary + calendar |
| P7 | Nurture | Day 7 | Client | "Life gets busy..." |
| P7 | Nurture | Day 45 | Client | "Carriers adjusted..." |
| P7 | Nurture | Day 60 | Client | "Thinking of you..." |
| P7 | Nurture | Day 90 | Client | "Still looking?" |
| P7 | Nurture | Day 135 | Client | Mid-cycle check-in |
| P7 | Nurture | Day 180 | Client | "Still here if needed" |

---

## APPENDIX C: PHONE & DIALER SYSTEM

> **This is a CORE system, not an afterthought. Agents live on the phone.**

### C.1 Call Recording & Playback
- **Every call recorded** via Twilio Recording API
- **Two-party consent disclosure** plays automatically at call start (Illinois law requires it)
- Announcement text: *"This call may be recorded for quality and training purposes."* — plays before agent hears audio
- Recordings stored (Twilio-hosted or downloaded to VPS storage)
- **Playback:** Click any call entry in call history → inline audio player with play/pause/scrub/speed control (1x, 1.5x, 2x)
- Recordings linked to lead — viewable from lead's activity feed AND from global call history
- API: `GET /calls/:id/recording` returns audio URL
- Retention policy configurable in Settings (default: 90 days)
- Manager can access all agent recordings

### C.2 Audio Device Selection
- Settings section: **Audio Devices**
- Enumerate available input devices (microphones) and output devices (speakers/headsets) via browser `navigator.mediaDevices.enumerateDevices()`
- Dropdown selectors for: Input (mic), Output (speaker/headset), Ringtone output (can differ from call output)
- Twilio Voice SDK `Device.audio` handles device binding
- Persist selection to localStorage + sync to server via `PUT /settings/audio`
- **Test button:** play test tone through selected output, record 3-second test through selected input with playback
- Hot-swap: changing device mid-call switches immediately (no hang-up required)
- Device disconnection detection: if selected device disappears, notify agent and fall back to system default

### C.3 Ringing / Ring Tone
- **Outbound calls:** Audible ring tone plays in browser while call is connecting (Twilio SDK `ringing` event → play local audio loop)
- **Incoming calls:** Audible ring + visual notification banner with caller info (name if known, number, lead pipeline/stage if matched) + Accept/Decline buttons
- Ring tone volume: independent slider in Settings (separate from call audio volume)
- Ring tone selection: 5 preset tones + option to upload custom (MP3/WAV, <500KB)
- Ring continues until answered, declined, or timeout (configurable, default 30 seconds)
- **Do Not Disturb mode:** silence all rings, visual notifications only

### C.4 Voicemail System

**Voicemail Drop (Outbound):**
- Agent pre-records voicemail messages in Settings > Voicemail Drops
- Record in-browser (mic capture) or upload audio file
- Multiple recordings supported, each named (e.g., "Initial Outreach", "Follow Up", "Callback Request")
- During call: if AMD detects answering machine → one-click drop selected voicemail → call auto-ends after drop
- Auto-drop option: configure a default voicemail to always drop on AMD detection (skips the selection step)
- Power dialer integration: AMD → auto-drop → auto-advance to next lead (zero agent interaction)
- API: `POST /voicemail-drops` (upload), `GET /voicemail-drops` (list), `DELETE /voicemail-drops/:id`

**Voicemail Inbox (Inbound):**
- Twilio numbers configured with voicemail greeting + recording on no-answer/busy
- Agent can record custom greeting in Settings > Voicemail Greeting
- Inbox view: list of voicemails with caller info (matched to lead if possible), timestamp, duration
- Click to play with inline audio player, delete, or mark as handled
- **Link to lead:** if caller matches a lead's phone, voicemail is linked to that lead's activity feed
- Notification when new voicemail arrives: in-app badge + push notification + optional SMS/Telegram
- Unheard count shown as badge on phone icon in nav
- API: `GET /voicemails` (list), `GET /voicemails/:id` (detail + audio), `PATCH /voicemails/:id` (mark handled), `DELETE /voicemails/:id`

### C.5 Caller ID & Spam Remediation

**CNAM Registration:**
- Register custom caller ID display name on all 5 Twilio numbers
- Boss picks the display name (e.g., "Forged Financial", "Legacy Leads")
- Twilio CNAM registration via API: `POST /phone-numbers/:sid/cnam`
- CNAM propagation takes 24-48 hours across carriers
- Dashboard shows CNAM status per number (Pending / Active / Failed)

**STIR/SHAKEN:**
- Twilio provides automatic STIR/SHAKEN attestation on all outbound calls
- No additional configuration needed — calls are cryptographically signed as legitimate
- Attestation level visible in phone number health view (A = full, B = partial, C = gateway)

**Personal Number Spam Remediation (User Manual note):**
- If agent's personal number is flagged as spam, they must file remediation directly with carriers:
  - T-Mobile: https://www.t-mobile.com/support/account/scam-and-spam-blocking
  - AT&T: https://www.att.com/security/spam-call-reporting/
  - Verizon: Contact support or use Call Filter app
- This is outside the CRM's control — carrier-level issue
- **Tip in user manual:** Register personal number with Free Caller Registry (https://freecallerregistry.com) and Hiya (https://hiya.com)

### C.6 Phone API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/calls/outbound` | Initiate call via Twilio. Body: `{ "to", "from?", "leadId?" }` | Agent |
| `POST` | `/calls/:id/hold` | Hold/unhold active call | Agent |
| `POST` | `/calls/:id/end` | End active call | Agent |
| `POST` | `/calls/:id/mute` | Mute/unmute agent mic | Agent |
| `POST` | `/calls/:id/disposition` | Set call disposition + notes. Body: `{ "disposition", "notes?", "leadId?" }` | Agent |
| `GET` | `/calls/:id/recording` | Get recording audio URL + duration + transcript (if available) | Agent |
| `DELETE` | `/calls/:id/recording` | Delete a call recording | Manager |
| `GET` | `/calls` | List call history. Query: `leadId?, agentId?, direction?, dateFrom?, dateTo?, page?, limit?` | Agent (own) / Manager (all) |
| `POST` | `/voicemail-drops` | Upload pre-recorded voicemail (multipart audio). Body: `{ "name", "audio" }` | Agent |
| `GET` | `/voicemail-drops` | List agent's voicemail drop recordings | Agent |
| `PATCH` | `/voicemail-drops/:id` | Rename a voicemail drop. Body: `{ "name" }` | Agent |
| `DELETE` | `/voicemail-drops/:id` | Delete a voicemail drop recording | Agent |
| `POST` | `/calls/:id/voicemail-drop` | Drop voicemail on active AMD-detected call. Body: `{ "dropId" }` | Agent |
| `GET` | `/voicemails` | List inbound voicemail inbox. Query: `handled?, leadId?, page?, limit?` | Agent |
| `GET` | `/voicemails/:id` | Get voicemail detail + audio URL | Agent |
| `PATCH` | `/voicemails/:id` | Mark voicemail as handled/unhandled. Body: `{ "handled": bool }` | Agent |
| `DELETE` | `/voicemails/:id` | Delete voicemail | Agent |
| `PUT` | `/settings/audio` | Save audio device + ringtone preferences. Body: `{ "inputDeviceId", "outputDeviceId", "ringtoneDeviceId", "ringtoneId?", "ringtoneVolume?" }` | Agent |
| `POST` | `/settings/audio/ringtone` | Upload custom ringtone (multipart, MP3/WAV <500KB) | Agent |
| `PUT` | `/settings/voicemail-greeting` | Upload/update voicemail greeting audio | Agent |
| `GET` | `/phone-numbers` | List all Twilio numbers with CNAM status, STIR/SHAKEN level, health | Agent |
| `PUT` | `/phone-numbers/:sid/cnam` | Register CNAM caller ID name. Body: `{ "displayName" }` | Manager |
| `POST` | `/webhooks/twilio/recording` | Twilio recording status callback (creates recording record, links to call + lead) | System |
| `POST` | `/webhooks/twilio/voicemail` | Twilio voicemail callback (new inbound voicemail received) | System |
| `POST` | `/webhooks/twilio/call-status` | Twilio call status callback (ringing, answered, completed, etc.) | System |

### C.7 Database Fix: `twilio_calls` Table

> **⚠️ MASON ACTION REQUIRED:** Add `lead_name` column to `twilio_calls` table. This was missed in Phase 1.

```sql
ALTER TABLE twilio_calls ADD COLUMN lead_name VARCHAR(255) DEFAULT NULL;
```

- Populate `lead_name` from the linked lead/contact record at call creation time
- Denormalized for fast display in call history (avoid JOIN on every list render)
- Update `lead_name` if the lead's name changes (trigger or app-level sync)
- Backfill existing rows: `UPDATE twilio_calls tc SET lead_name = (SELECT name FROM contacts c WHERE c.phone = tc.to_number OR c.phone = tc.from_number LIMIT 1) WHERE tc.lead_name IS NULL;`

---

*End of Blueprint. Mason builds from this. Sentinel validates against this.*
