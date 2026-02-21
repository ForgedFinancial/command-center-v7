# MASTER CRM REFERENCE — Forged Financial
# The Complete System: Lifecycle, Pipelines, Metrics, KPIs, Strategy
# Created: Feb 19, 2026

---

## PART 1: THE COMPLETE LIFECYCLE MAP

### The Mission
Turn every lead into a paying, retained, long-term client. If they fall off at ANY point, systematically re-engage them until they're back or documented as truly uninsurable. No lead forgotten. No policy lost without a fight. Every outcome tracked. Every dollar accounted for.

### The Happy Path (Best Case)
```
LEAD ENTERS → LM (sell) → AP (submit) → PL (activate) → ACTIVE (retain forever)
```

### The Recovery Paths (When Things Go Wrong)
```
Lead goes cold ──────→ NURTURE (6mo) → RECYCLE (45d) → UNINSURABLE (12mo review)
Carrier declines ────→ REWRITE → back to LM or → RECYCLE
Payment fails ───────→ RE: EXCEPTION → ACTIVE RECOVERY → RESOLVED or TERMINATED
Client wants cancel ─→ RE: EXCEPTION → retention script → save or TERMINATED
Terminated policy ───→ REWRITE → WIN BACK cycle
```

### The Golden Rule
**Nothing dies permanently.** Every exit has a re-entry path:
- Cold leads → Nurture → Recycle → Uninsurable → 12-month health check → possible re-entry
- Lost policies → Terminated → Rewrite → Recycle or back to LM
- Even ZOMBIE leads (dead leads that come back) get instant hot-lead treatment

### Data Rules
- Every stage sets a TAG — you always know where the lead is
- Every move is logged in the activity feed — full audit trail
- Required fields gate progression — no skipping steps
- Lead is DELETED from previous pipeline on transfer — clean, no remnants
- All deal data carries forward — nothing lost in transitions
- All SMS goes through Approval Gate unless agent opts into auto-send

---

## PART 2: EVERY PIPELINE, STAGE, TRIGGER, ACTION & CONDITION

---

### PIPELINE 1: LM | LEAD MANAGEMENT
**Purpose:** Convert raw leads into closed sales
**Stages:** 6
**Timeline:** 0 to ~39 days max before auto-nurture

#### STAGE 1: NEW LEAD (0-3 days)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Lead enters system (Google Sheet import, webhook, manual entry, referral) |
| **CONDITIONS to enter** | Name + at least one contact method (phone or email) |
| **SYSTEM ACTIONS** | • Create opportunity record • Auto-assign to agent (round-robin or manual) • Set TAG \| New Lead \| • Send speed-to-lead SMS (through approval gate): "Hi [Name], this is [Agent] with [Company]. I'll be giving you a call shortly regarding your inquiry. Talk soon!" • Push notification + SMS to agent with lead summary |
| **CONDITIONAL ACTIONS** | • IF client replies → TAG \| REPLY NEEDED \|, notify agent, auto-move → Contact • IF 3 days, no interaction → auto-move → Contact |
| **AGENT ACTIONS** | • Call within 5 minutes • Document attempt in activity feed • IF interested → move to Engaged Interest • IF SSN provided → move to Qualified Interest • IF appointment set → move to Engaged Interest (or Qualified if SSN on file) |
| **DATA TRACKED** | Lead source, entry timestamp, first contact timestamp, response time, attempt count |

#### STAGE 2: CONTACT (0-4 days)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Auto-moved from New Lead (3 days) OR agent moves manually |
| **CONDITIONS to enter** | Was in New Lead stage |
| **SYSTEM ACTIONS** | • Set TAG \| Contact \| • Monitor for client replies |
| **CONDITIONAL ACTIONS** | • IF client replied + agent hasn't responded 24h → TAG \| Overdue-24h \|, SMS reminder to agent • Escalating: \| Overdue-48h \|, \| Overdue-72h \| • IF agent responds → remove \| REPLY NEEDED \| • IF 4 days, no contact + insufficient attempts → notification to agent • IF 4 days total, no contact → auto-move → Nurture (Pipeline 7) + farewell SMS to client |
| **AGENT ACTIONS** | • Continue outreach at different times of day • Document every attempt • Contact + interest → Engaged Interest • Contact + SSN → Qualified Interest • Contact + appointment → Engaged Interest (or Qualified) • "Not interested" → Nurture (tagged with reason) |
| **DATA TRACKED** | Attempt count, attempt times, client response timestamps, overdue tag count |

#### STAGE 3: ENGAGED INTEREST (0-14 days)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Agent confirms client expressed interest |
| **CONDITIONS to enter** | Successful contact made + client showed interest |
| **SYSTEM ACTIONS** | • Set TAG \| Engaged Interest \| • Send interest-gauge SMS (through approval gate) |
| **CONDITIONAL ACTIONS** | • IF 14 days, no interaction + no app started → auto-move → Nurture + dialer recycle |
| **AGENT ACTIONS** | • High-touch follow-up (calls, texts, relationship building) • SSN provided → Qualified Interest • Goes cold → Nurture • Appointment booked → calendar event |
| **DATA TRACKED** | Engagement type, follow-up frequency, time in stage |

#### STAGE 4: QUALIFIED INTEREST (0-7 days)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Client provides Social Security Number |
| **CONDITIONS to enter** | SSN field populated (REQUIRED) |
| **SYSTEM ACTIONS** | • Set TAG \| Qualified Interest \| |
| **CONDITIONAL ACTIONS** | • IF 48h no activity → automated check-in SMS • IF 7 days, no interaction + no app → auto-move → Nurture + dialer recycle |
| **AGENT ACTIONS** | • PRIORITY prospect — aggressive follow-up • App started → Application Process • Silent/lost interest → Nurture |
| **DATA TRACKED** | Time from engaged → qualified, SSN provided timestamp |

#### STAGE 5: APPLICATION PROCESS (0-11 days, resets on engagement)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Agent starts application with client |
| **CONDITIONS to enter** | Carrier, Product, Price, Health Status (ALL REQUIRED) |
| **SYSTEM ACTIONS** | • Set TAG \| Application Process \| • ANY client engagement resets ALL timers |
| **CONDITIONAL ACTIONS** | • IF 24h no activity → check-in SMS with carrier/product/price details • IF 11 days total no contact → auto-move → Nurture |
| **AGENT ACTIONS** | • Fill all required fields • Walk client through application • App submitted → Closed Won • Client ghosts → Nurture |
| **DATA TRACKED** | Carrier, product, price, health status, time in stage, engagement resets |

#### STAGE 6: CLOSED WON ✅

| Element | Detail |
|---------|--------|
| **TRIGGER** | Application submitted to carrier |
| **CONDITIONS to enter** | Carrier, Product, Price, Health Status, Coverage Amount (ALL REQUIRED) |
| **SYSTEM ACTIONS** | • Set TAG \| Closed \| • 7-minute buffer for agent notes • Send "Closed \| Submission Reminder" SMS to client (agent name, personal phone, work number, save both, automated alerts info) • 5 min after transfer: congratulations SMS with full details • Create opportunity in Pipeline 2 → Submitted • DELETE from Pipeline 1 (only after confirming data transfer) |
| **AGENT ACTIONS** | • Fill ALL required fields • Review accuracy • DONE with Lead Management |
| **DATA TRACKED** | Close date, premium, carrier, product, coverage amount, time from new lead → closed (velocity) |

---

### PIPELINE 2: AP | APPROVAL PROCESS
**Purpose:** Track submission through carrier underwriting to decision
**Stages:** 2
**Timeline:** Carrier-dependent (days to weeks)

#### STAGE 1: SUBMITTED

| Element | Detail |
|---------|--------|
| **TRIGGER** | Closed Won in Pipeline 1 creates opportunity here |
| **CONDITIONS to enter** | Data transferred from Closed Won |
| **SYSTEM ACTIONS** | • Set TAG \| Submitted \| |
| **CONDITIONAL ACTIONS** | • IF client has TAG \| Approved as Applied \| → bypass directly to Pipeline 3 → Approved • IF email parser configured → auto-update on carrier emails |
| **AGENT ACTIONS** | • Confirm submission with carrier • Manual status updates if no email parser • UW begins → move to Underwriting/Requirements |
| **DATA TRACKED** | Submission date, carrier, submission method |

#### STAGE 2: UNDERWRITING / REQUIREMENTS

| Element | Detail |
|---------|--------|
| **TRIGGER** | Carrier begins underwriting review |
| **CONDITIONS to enter** | Agent confirms UW started |
| **SYSTEM ACTIONS** | • Set TAG \| UW & Requirements \| • Create task: "Requirements review — same day" • Create recurring task: "Requirement chase — every 72 hours" |
| **CONDITIONAL ACTIONS** | • IF email parser detects carrier update → notify agent • IF carrier approves → move to Pipeline 3 → Approved, DELETE from Pipeline 2 • IF carrier declines → move to Pipeline 5 → Rewrite, DELETE from Pipeline 2 |
| **AGENT ACTIONS** | • Review requirements same day • Chase carrier every 72 hours • Provide any additional documentation |
| **DATA TRACKED** | UW start date, requirements list, requirement completion dates, decision date, time in UW |

---

### PIPELINE 3: PL | POLICY LIFECYCLE
**Purpose:** Track approved policy from paper to active coverage
**Stages:** 4
**Timeline:** Days to weeks depending on carrier + banking

#### STAGE 1: APPROVED

| Element | Detail |
|---------|--------|
| **TRIGGER** | Carrier approves application (from Pipeline 2) OR Approved as Applied bypass |
| **CONDITIONS to enter** | Carrier approval confirmed |
| **SYSTEM ACTIONS** | • Set TAG \| Approved \| • SMS to client: approval congratulations + agent reaching out • Create task: delivery follow-up |
| **AGENT ACTIONS** | • Deliver policy (call/video/in-person) • Confirm banking info and draft date • Walk client through coverage details • Delivery complete → move to Draft Cleared |
| **DATA TRACKED** | Approval date, carrier, delivery method, delivery date |

#### STAGE 2: DRAFT CLEARED

| Element | Detail |
|---------|--------|
| **TRIGGER** | First premium payment drafts successfully |
| **CONDITIONS to enter** | Agent confirms draft cleared with carrier/bank |
| **SYSTEM ACTIONS** | • Set TAG \| Draft Cleared \| • SMS to client: first payment confirmed |
| **CONDITIONAL ACTIONS** | • IF draft FAILS → move to Pipeline 4 → New Exception |
| **AGENT ACTIONS** | • Confirm first draft cleared with carrier • Move to Delivered |
| **DATA TRACKED** | Draft date, draft amount, payment method, pass/fail |

#### STAGE 3: DELIVERED

| Element | Detail |
|---------|--------|
| **TRIGGER** | Agent has delivered policy documents to client |
| **CONDITIONS to enter** | Policy delivered + draft cleared |
| **SYSTEM ACTIONS** | • Set TAG \| Delivered \| • Field validations: draft date, payment method, policy # |
| **CONDITIONAL ACTIONS** | • IF draft date within 7 days → create pre-draft confirmation task |
| **AGENT ACTIONS** | • Verify all fields complete and accurate • Pre-draft touch call if within 7 days • Everything checks out → move to In Force |
| **DATA TRACKED** | Delivery date, delivery method, field completion % |

#### STAGE 4: IN FORCE ✅

| Element | Detail |
|---------|--------|
| **TRIGGER** | Policy confirmed active with carrier |
| **CONDITIONS to enter** | Draft cleared + policy delivered + carrier confirms active |
| **SYSTEM ACTIONS** | • Set TAG \| In Force \| • Add to persistency cohort tracking • Start persistency monitoring • Move to Pipeline 6 → Month 1 • DELETE from Pipeline 3 |
| **AGENT ACTIONS** | • Confirm policy is truly in force with carrier • DONE with Policy Lifecycle |
| **DATA TRACKED** | In Force date, carrier, premium, coverage amount, policy number (starts persistency clock) |

---

### PIPELINE 4: RE | RETENTION EXCEPTIONS
**Purpose:** Save at-risk policies through systematic recovery
**Stages:** 4
**Timeline:** Up to 30 days before auto-termination

#### STAGE 1: NEW EXCEPTION (Intake & Triage)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Draft fails (from Pipeline 3), payment issue detected, lapse notice from carrier, client requests cancellation, or billing exception flagged |
| **CONDITIONS to enter** | Active policy with identified exception |
| **SYSTEM ACTIONS** | • Create opportunity, auto-assign to writing agent • Set TAG \| New Exception \|, populate [Exception Type] field • SMS alert to agent immediately |
| **CONDITIONAL ACTIONS** | • IF 4 hours, no movement → second SMS alert to agent • IF 24 hours, no movement → TAG \| Overdue \| |
| **AGENT ACTIONS** | • Review within 4 hours • Verify exception type and client info • Move to Active Recovery |
| **DATA TRACKED** | Exception type, entry timestamp, source (which pipeline/trigger), agent response time |

#### STAGE 2: ACTIVE RECOVERY (Work the Case)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Agent moves from New Exception |
| **CONDITIONS to enter** | Exception reviewed and triaged |
| **SYSTEM ACTIONS** | • Set TAG \| Active Recovery \| • Create task: "Call client today" • SMS to client about the issue |
| **CONDITIONAL ACTIONS (Escalating Timers)** | • 24h → TAG \| Overdue-24h \| • 48h → TAG \| Overdue-48h \| • 72h → TAG \| Overdue-72h \| + 🚨 MANAGER ALERT • 7 days → TAG \| Client Risk \| • 14 days → TAG \| URGENT \| + 🚨 MANAGER ALERT • 30 days → auto-move → Terminated |
| **CONDITIONAL ACTIONS (Special Cases)** | • IF lapse risk identified → add TAG \| Lapse Risk \| (same escalation ladder) • IF 5+ contact attempts with no response → TAG \| Unreachable \|, send final voicemail + SMS → IF 7 more days no response → auto-move → Terminated • IF "want to cancel" → retention script → IF still no → Terminated • IF billing fixed + carrier confirms → move to Resolved |
| **AGENT ACTIONS** | • Call client same day • Fix payment issue / send update form / address retention concern • Document every action |
| **DATA TRACKED** | Contact attempts, escalation tags hit, exception type, time in stage, resolution actions taken |

#### STAGE 3: RESOLVED ✅ (Policy Saved)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Issue fixed and carrier confirms policy is active again |
| **CONDITIONS to enter** | Carrier confirmation of resolution |
| **SYSTEM ACTIONS** | • Set TAG \| Resolved \| • Remove ALL escalation tags (Overdue, Client Risk, URGENT, Lapse Risk, Unreachable) • Set [Exception Outcome] field • SMS to agent: confirmation • SMS to client: confirmation • Return to Pipeline 3 (Policy Lifecycle) or Pipeline 6 (Inforce Clients) • DELETE from Pipeline 4 |
| **DATA TRACKED** | Resolution date, resolution type, time to resolve, exception outcome |

#### STAGE 4: TERMINATED ❌ (Policy Lost)

| Element | Detail |
|---------|--------|
| **TRIGGER** | 30-day auto-termination, agent marks as lost, or unreachable exhausted |
| **CONDITIONS to enter** | Recovery failed |
| **SYSTEM ACTIONS** | • Set TAG \| Terminated \| • Remove from all active automations • Duplicate opportunity to Pipeline 5 → Rewrite (Win Back cycle) • SMS notification to agent |
| **AGENT ACTIONS** | • Final disposition notes — WHY lost (REQUIRED, documented reason) |
| **DATA TRACKED** | Termination date, reason, time in recovery, attempts made, commission at risk |

**DAILY AUTOMATION:** 8AM SMS to each agent with their RE pipeline counts (active cases, overdue count, escalation status)

---

### PIPELINE 5: REWRITE | REJECTED
**Purpose:** Recapture declined and terminated cases
**Stages:** 3
**Timeline:** 7 days rewrite + 45 days recycle + 12 months uninsurable review

#### STAGE 1: REWRITE (0-7 days)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Carrier declines (from Pipeline 2) OR policy Terminated (from Pipeline 4) |
| **CONDITIONS to enter** | Decline reason or termination reason documented |
| **SYSTEM ACTIONS** | • Set TAG \| Rewrite \| • Carry forward ALL previous deal data + decline/termination reason • Create review task |
| **CONDITIONAL ACTIONS** | • IF 7 days, no activity → auto-move → Recycle |
| **AGENT ACTIONS** | • Review decline/termination reason • Viable rewrite → Pipeline 1 → Application Process (new carrier/product), DELETE from Pipeline 5 • Not viable now → move to Recycle • Truly uninsurable → move to Uninsurable |
| **DATA TRACKED** | Original decline reason, rewrite viability, new carrier/product if rewritten |

#### STAGE 2: RECYCLE (45 days)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Agent defers rewrite, 7-day auto from Rewrite, OR Nurture exhausted (from Pipeline 7) |
| **CONDITIONS to enter** | Lead not viable for immediate rewrite but not uninsurable |
| **SYSTEM ACTIONS** | • Set TAG \| Recycle \| |
| **CONDITIONAL ACTIONS** | • Day 1 → SMS to agent: re-contact this lead • Day 15 → second re-contact reminder • Day 30 → final attempt reminder • Day 45, no interest → auto-move → Uninsurable • IF client reaches out ANY time → 3 alerts + TAG \| ZOMBIE \| |
| **AGENT ACTIONS** | • Re-contact on each timer fire • Interested → Pipeline 1 at appropriate stage, DELETE from Pipeline 5 • ZOMBIE tag → treat as HOT lead, respond immediately |
| **DATA TRACKED** | Re-contact attempts, timer responses, ZOMBIE conversions |

#### STAGE 3: UNINSURABLE

| Element | Detail |
|---------|--------|
| **TRIGGER** | Recycle exhausted (45 days), or agent determines client is medically uninsurable |
| **CONDITIONS to enter** | All re-engagement attempts failed OR medical determination |
| **SYSTEM ACTIONS** | • Set TAG \| Uninsurable \| • Remove from ALL automations • Set 12-month health check timer → creates task for agent |
| **AGENT ACTIONS** | • Document WHY: specific conditions, which carriers declined, what would need to change • 12-month review: IF improved → Recycle or Pipeline 1; IF still uninsurable → reset timer or close permanently |
| **DATA TRACKED** | Reason, carriers attempted, conditions documented, 12-month review outcomes |

---

### PIPELINE 6: ACTIVE | INFORCE CLIENTS
**Purpose:** Retain clients, build relationship, maximize lifetime value
**Stages:** 5
**Timeline:** Ongoing (annual cycle)

#### STAGE 1: MONTH 1 | WELCOME & ANCHORING (0-30 days)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Policy goes In Force (from Pipeline 3) |
| **CONDITIONS to enter** | Policy confirmed active |
| **SYSTEM ACTIONS** | • Set TAG \| Month 1 \| • SMS about gift/card |
| **CONDITIONAL ACTIONS** | • IF positive response → [GIFT] pipeline + 21-day timer • IF no response 7 days → TAG \| No Gift \| • IF 30 days → auto-move → Month 3 |
| **DATA TRACKED** | Gift response, client sentiment, early engagement level |

#### STAGE 2: MONTH 3 | THE DANGER ZONE (30-90 days)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Auto from Month 1 at 30 days |
| **CONDITIONS to enter** | Completed Month 1 without exception |
| **SYSTEM ACTIONS** | • Set TAG \| Month 3 \| • SMS: 3-month thank you |
| **CONDITIONAL ACTIONS** | • IF negative reply (cancel, too expensive) → Pipeline 4 → New Exception • IF 90 days → auto-move → Month 6 |
| **DATA TRACKED** | Client response, exception trigger rate at Month 3 |

#### STAGE 3: MONTH 6 | BENEFICIARY REVIEW (90-180 days)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Auto from Month 3 at 90 days |
| **CONDITIONS to enter** | Survived Month 3 |
| **SYSTEM ACTIONS** | • Set TAG \| Month 6 \| • SMS: beneficiary update check |
| **CONDITIONAL ACTIONS** | • IF positive response → TAG \| Ready For Referrals \| • IF negative reply → Pipeline 4 → New Exception • IF 180 days → auto-move → Month 12 |
| **DATA TRACKED** | Beneficiary review status, referral readiness, client sentiment |

#### STAGE 4: MONTH 12 | ANNUAL REVIEW (365 days)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Auto from Month 6 at 180 days |
| **CONDITIONS to enter** | Survived Month 6 |
| **SYSTEM ACTIONS** | • Set TAG \| Month 12 \| • SMS: anniversary + calendar link for 5-min review call |
| **AGENT ACTIONS** | • MANUAL call (not just text) — this is personal • Review coverage, beneficiaries, life changes • Upsell opportunity (additional coverage, family members) • After review → reset to Month 1 for Year 2+ |
| **DATA TRACKED** | Review completed (Y/N), coverage changes, upsell outcome, referrals received |

#### STAGE 5: CLIENT CONTACT | RESPOND TO CLIENT

| Element | Detail |
|---------|--------|
| **TRIGGER** | Missed call or unread text detected from active client |
| **CONDITIONS to enter** | Client initiated contact |
| **SYSTEM ACTIONS** | • Create opportunity in this stage • TAG \| Client Contact Needed \| |
| **CONDITIONAL ACTIONS** | • IF billing issue mentioned → Pipeline 4 → New Exception • IF cancel request → Pipeline 4 → New Exception |
| **AGENT ACTIONS** | • Respond ASAP • General question → answer + return to appropriate month stage • Referral → handle + document • Remove tag once resolved |
| **DATA TRACKED** | Response time, contact reason, resolution |

---

### PIPELINE 7: NURTURE | LONG TERM
**Purpose:** Warm drip on cold leads until ready to re-engage
**Stages:** 1
**Timeline:** 6 months

#### STAGE 1: NURTURE START (6 months)

| Element | Detail |
|---------|--------|
| **TRIGGER** | Lead goes cold from Pipeline 1 (auto-move from Contact at 4 days, Engaged at 14 days, Qualified at 7 days, App Process at 11 days, OR agent manually moves) |
| **CONDITIONS to enter** | Lead was in Pipeline 1 but failed to progress |
| **SYSTEM ACTIONS** | • Set TAG \| Nurture \| • Preserve ALL existing tags from previous stages |
| **CONDITIONAL ACTIONS (SMS Drip Sequence)** | • Day 7 → SMS (1): "Life gets busy, I'll check back..." • Day 45 → SMS (2): "Carriers adjusted guidelines..." • Day 60 → SMS (3): "Thinking of you..." • Day 90 → SMS (4): "Still looking for coverage?" • Day 135 → SMS (5): mid-cycle check-in • Day 180 → SMS (6): "Still here if you need us" • IF positive reply to ANY SMS → Pipeline 1 → Engaged Interest, DELETE from Pipeline 7 • IF "stop" or "not interested" → TAG \| Nurture Declined \|, stop sequence • IF no reply after SMS (6) at Day 180 → auto-move → Pipeline 5 → Recycle |
| **AGENT ACTIONS** | • Reply personally to any client response • Can manually re-engage any time • LOW PRESSURE — no aggressive outreach |
| **DATA TRACKED** | Which SMS triggered response, response rate per touchpoint, re-engagement source |

---

## PART 3: PRODUCTION DASHBOARD — LAYOUT & DETAIL

### Dashboard Purpose
Give every agent an instant, honest picture of their business: where it's thriving, where it's bleeding, and exactly what to fix. No vanity metrics. Everything trackable from data already flowing through the 7 pipelines.

### UX Philosophy: Sell First, Analyze Second

**Two Modes:**
- **Selling Mode (default)** — Agent sees ONLY pipeline cards, lead details, call controls, and action-guiding signals (NEW badges, REPLY NEEDED, escalation colors). Zero metrics, zero charts, zero KPIs. Nothing gets between the agent and the next call.
- **Review Mode (dashboard)** — Agent clicks into Dashboard intentionally. Morning briefing or end-of-day review. Never interrupts selling.

**The principle:** Metrics inform the plan. Pipeline executes the plan.
- Morning: check dashboard → know your priorities
- All day: work pipeline → sell
- Evening: check dashboard → see what moved

### Everything Optional. Nothing Mandatory.

**ALL metrics, KPIs, automations, and dashboard features are opt-in.**
- The system tracks all data in the background silently — always collecting, always calculating
- The agent chooses which metrics to display on their dashboard
- The agent chooses which automations to turn on (e.g., auto-SMS sequences, escalation alerts, best-time-to-call suggestions)
- No metric is forced. No automation is mandatory. No feature blocks the agent from working.
- Each metric has THREE engagement levels:
  - **Off** — hidden from dashboard, but still tracking silently in the background
  - **Watch** — visible on dashboard (see the numbers, watch trends), but no automations or suggestions attached. Pure data observation.
  - **Active** — visible + automations and suggestions turned on (nudges, alerts, recommended actions)
- Agent picks their level for each metric independently in Settings
- Suggestions surface as optional nudges (e.g., "Your contact rate increases 15% when you call between 10-11 AM") — only in Active mode, agent can dismiss or act on them

**Why:** The best agents don't need guardrails — they need tools they can pick up when useful and put down when not. The system serves the agent, not the other way around.

**Manager view:** Managers can see all metrics for all agents regardless of individual toggle settings. The data always exists — visibility is the only thing that's optional.

### Top Bar: Scorecard
Single row of color-coded cards — the most critical numbers at a glance (agent chooses which cards to show):
- 🟢 Green = at or above target
- 🟡 Yellow = within 10% of target
- 🔴 Red = below target

---

### Dashboard Section 1: Speed & Responsiveness

**1.1 Speed to Lead**
- **Measures:** Time from lead entering system → agent's first contact attempt
- **Source:** Pipeline 1, Stage 1 — creation timestamp vs first activity log entry
- **Target:** 🟢 < 5 min | 🟡 5-15 min | 🔴 > 15 min
- **Why:** Sub-5-minute response = 21x more likely to qualify
- **Display:** Average speed, median speed, % contacted within 5 min

**1.2 Average Response Time**
- **Measures:** Client messages → how fast does agent respond?
- **Source:** TAG | REPLY NEEDED | timestamp vs agent response timestamp
- **Target:** 🟢 < 30 min | 🟡 30-60 min | 🔴 > 60 min
- **Display:** Average, trend line (improving/declining over weeks)

**1.3 Overdue Rate**
- **Measures:** % of leads/cases that hit any Overdue tag
- **Source:** All TAG | Overdue-* | assignments across all pipelines
- **Target:** 🟢 < 5% | 🟡 5-15% | 🔴 > 15%
- **Display:** Current overdue count, % of active pipeline, trend

---

### Dashboard Section 2: Contact & Engagement

**2.1 Contact Rate**
- **Measures:** % of leads where agent made successful voice contact
- **Source:** Pipeline 1 — leads reaching Engaged Interest or beyond
- **Target:** 🟢 > 45% | 🟡 30-45% | 🔴 < 30%
- **Display:** %, raw numbers (e.g., "47% — 94 of 200 leads contacted")

**2.2 Attempts to Contact**
- **Measures:** Average call/text attempts before first successful contact
- **Source:** Activity feed entries per lead in Pipeline 1 Stages 1-2
- **Target:** 3-5 attempts (80% of sales need 5+, most agents quit at 2)
- **Display:** Average attempts, distribution chart

**2.3 Engagement Rate**
- **Measures:** % of contacted leads that show genuine interest
- **Source:** Pipeline 1 — Stage 3 entries / Stage 1 entries
- **Target:** 🟢 > 30% | 🟡 20-30% | 🔴 < 20%
- **Display:** %, with breakdown by lead source

**2.4 Qualification Rate**
- **Measures:** % of engaged leads that provide SSN
- **Source:** Pipeline 1 — Stage 4 entries / Stage 3 entries
- **Target:** 🟢 > 55% | 🟡 40-55% | 🔴 < 40%
- **Display:** %, conversion funnel visual

---

### Dashboard Section 3: Conversion & Revenue

**3.1 Close Rate (Lead → Closed Won)**
- **Measures:** % of all leads that reach Closed Won
- **Source:** Pipeline 1 — Stage 6 entries / Stage 1 entries
- **Target:** 🟢 > 10% | 🟡 6-10% | 🔴 < 6%
- **Display:** %, total closed this period, trend vs previous period

**3.2 Application-to-Close Rate**
- **Measures:** % of started applications that close
- **Source:** Pipeline 1 — Stage 6 entries / Stage 5 entries
- **Target:** 🟢 > 80% | 🟡 65-80% | 🔴 < 65%
- **Display:** %, identifies if agent loses people during app process

**3.3 Average Premium (Monthly)**
- **Measures:** Average monthly premium per closed deal
- **Source:** Pipeline 1, Stage 6 — Price field
- **Display:** Average, median, min/max, trend

**3.4 Average Annual Premium (AP)**
- **Measures:** Average premium × 12 per closed deal
- **Source:** Calculated from Price field
- **Display:** Per deal, total AP written, AP by carrier, AP by lead source

**3.5 Total Revenue Written**
- **Measures:** Sum of all AP written in period
- **Source:** All Closed Won deals
- **Display:** This week | This month | This quarter | YTD, comparison to previous periods

**3.6 Revenue by Lead Source**
- **Measures:** Which sources produce the most revenue?
- **Source:** Lead source field + Price field on Closed Won
- **Target:** ROI > 3x cost per lead
- **Display:** Table: Source | Leads | Closed | AP | Cost/Lead | ROI

**3.7 Revenue by Carrier**
- **Measures:** Where's production going?
- **Source:** Carrier field on Closed Won deals
- **Display:** Pie chart + table: Carrier | Deals | Total AP | Avg Premium

**3.8 Pipeline Velocity**
- **Measures:** Average time from New Lead → Closed Won
- **Source:** Timestamps of Stage 1 entry vs Stage 6 entry
- **Target:** 🟢 < 14 days | 🟡 14-21 days | 🔴 > 21 days
- **Display:** Average days, median, trend

---

### Dashboard Section 4: Approval & Placement

**4.1 Approval Rate**
- **Measures:** % of submitted apps approved by carrier
- **Source:** Pipeline 2 → Pipeline 3 (Approved) vs Pipeline 2 → Pipeline 5 (Declined)
- **Target:** 🟢 > 75% | 🟡 60-75% | 🔴 < 60%
- **Display:** %, by carrier

**4.2 Placement Rate**
- **Measures:** % of approved policies that actually go In Force
- **Source:** Pipeline 3 — Stage 4 (In Force) / Stage 1 (Approved)
- **Target:** 🟢 > 90% | 🟡 80-90% | 🔴 < 80%
- **Display:** %, identifies policies dying between approval and activation

**4.3 Average Underwriting Time**
- **Measures:** Days from Submitted → carrier decision
- **Source:** Pipeline 2 timestamps
- **Display:** Average days, by carrier (helps pick faster carriers)

**4.4 Requirements Completion Rate**
- **Measures:** % of UW requirements resolved without decline
- **Source:** Pipeline 2, Stage 2 outcomes
- **Display:** %, common requirement types

---

### Dashboard Section 5: Persistency & Retention

**5.1 Persistency Rate (13-month)**
- **Measures:** % of policies still In Force after 13 months
- **Source:** Pipeline 6 — clients reaching Month 12 without entering Pipeline 4
- **Target:** 🟢 > 85% | 🟡 75-85% | 🔴 < 75%
- **Why:** THE most important long-term metric. Top producers hit 88-92%. Determines chargebacks, carrier bonuses, and agency profitability.
- **Display:** %, trend, by carrier, by lead source

**5.2 Danger Zone Survival Rate**
- **Measures:** % of clients surviving Month 3 without an exception
- **Source:** Pipeline 6 — Stage 2 → Stage 3 without entering Pipeline 4
- **Target:** 🟢 > 90% | 🟡 80-90% | 🔴 < 80%
- **Why:** Month 3 is the #1 churn period in life insurance

**5.3 Exception Rate**
- **Measures:** % of In Force policies entering Retention Exceptions
- **Source:** Pipeline 4 entries / total active Pipeline 6 clients
- **Target:** 🟢 < 10% | 🟡 10-20% | 🔴 > 20%
- **Display:** %, by exception type (payment, lapse, cancel request)

**5.4 Save Rate**
- **Measures:** % of exceptions ending in Resolved (policy saved)
- **Source:** Pipeline 4 — Stage 3 (Resolved) / total exits
- **Target:** 🟢 > 65% | 🟡 50-65% | 🔴 < 50%
- **Display:** %, by exception type, average days to resolve

**5.5 Average Time to Resolve**
- **Measures:** How fast are exceptions being fixed?
- **Source:** Pipeline 4 — New Exception timestamp vs Resolved timestamp
- **Target:** < 7 days
- **Display:** Average days, distribution

**5.6 Chargeback Risk**
- **Measures:** Policies likely to lapse before commission vests (9-12 months)
- **Source:** Pipeline 4 Terminated entries within first 12 months
- **Display:** Count, estimated commission at risk ($), by carrier

---

### Dashboard Section 6: Recapture & Win Back

**6.1 Recapture Rate**
- **Measures:** % of Nurture/Recycle leads that return to Pipeline 1
- **Source:** Pipeline 7 + Pipeline 5 Stage 2 → Pipeline 1 re-entries
- **Target:** 🟢 > 10% | 🟡 5-10% | 🔴 < 5%
- **Display:** %, by original drop-off reason, by nurture SMS that triggered response

**6.2 ZOMBIE Rate**
- **Measures:** % of Recycle leads that self-reactivate
- **Source:** TAG | ZOMBIE | assignments in Pipeline 5
- **Display:** Count, conversion rate of ZOMBIEs → Closed Won

**6.3 Win Back Revenue**
- **Measures:** AP generated from recaptured leads
- **Source:** Closed Won deals where lead previously visited Pipeline 5 or 7
- **Display:** Total AP from win-backs, % of total revenue

**6.4 Nurture Response Rate**
- **Measures:** Which nurture SMS gets the most responses?
- **Source:** Pipeline 7 — which SMS (1-6) triggered the positive reply
- **Display:** Response rate per touchpoint. Optimizes messaging strategy.

---

### Dashboard Section 7: Agent Accountability

**7.1 Daily Activity Score**
- **Measures:** Combined metric — calls + texts + leads worked
- **Source:** Activity feed entries per day
- **Target:** Configurable per agency
- **Display:** Today's score, 7-day average, team ranking (if multi-agent)

**7.2 Calls Made**
- **Measures:** Total outbound dials per day/week
- **Source:** Call logs (power dialer + manual)
- **Target:** 80-100 dials/day with power dialer
- **Display:** Daily count, weekly average, trend

**7.3 Talk Time**
- **Measures:** Total time on phone with clients per day
- **Source:** Call duration logs
- **Target:** 2-3 hours/day
- **Display:** Daily total, average call duration, talk time vs idle time ratio

**7.4 Leads Worked Today**
- **Measures:** Unique leads with activity today
- **Source:** Unique lead IDs in today's activity feed
- **Display:** Count, compared to total available pipeline

**7.5 Manager Alert Summary**
- **Measures:** All escalations hitting 72h and 14d thresholds
- **Source:** TAG assignments across Pipeline 1 and 4
- **Display:** Count, list of flagged cases, which agents (manager-only view)

---

### Dashboard Section 8: Business Intelligence

**8.1 Lead Source ROI**
- **Measures:** Revenue generated vs cost per lead source
- **Formula:** (Total AP from source × commission %) / Total lead cost
- **Display:** Ranked table with recommendation to increase/decrease spend

**8.2 Best Time to Call**
- **Measures:** Which days/times yield highest contact and close rates
- **Source:** Successful contact timestamps, Closed Won timestamps
- **Display:** Heatmap (day of week × hour of day), color-coded by connection rate

**8.3 State Performance**
- **Measures:** Close rate and AP by state/region
- **Source:** Lead state field vs conversion rates
- **Display:** Map or ranked table

**8.4 Carrier Performance Matrix**
- **Measures:** Which carriers have best approval rate, fastest UW, highest persistency
- **Source:** Pipeline 2 (approval, UW time) + Pipeline 6 (persistency)
- **Display:** Matrix: Carrier | Approval % | Avg UW Days | 13-Mo Persistency | Avg Premium

**8.5 Funnel Drop-Off Analysis**
- **Measures:** Where exactly are leads dying?
- **Source:** Stage transition counts across Pipeline 1
- **Display:** Funnel chart with % at each step. Highlights biggest drop-off.

**8.6 Revenue Forecast**
- **Measures:** Projected revenue based on current pipeline
- **Formula:** Active leads × stage-specific historical close rate × avg premium
- **Display:** Projected AP this month, confidence level, pipeline value

---

### Dashboard Views

| View | Focus | What's Shown |
|------|-------|-------------|
| **Agent Scorecard** (default) | At-a-glance health | All KPIs as color-coded cards. Click any to drill in. |
| **Pipeline Funnel** | Conversion flow | Visual funnel from New Lead → Closed Won with % at each stage |
| **Revenue & Production** | Money | AP written by period/source/carrier. Forecast. Commission. |
| **Retention & Persistency** | Long-term health | Cohort chart, exception rate, save rate, chargeback risk |
| **Activity & Accountability** | Agent effort | Calls, talk time, leads worked, overdue counts. Manager view = all agents side-by-side |
| **Intelligence** | Strategic insights | Best time to call, state performance, carrier matrix, source ROI, funnel analysis |

### Time Filters (all views)
Today | This Week | This Month | This Quarter | YTD | Custom Range

---

## PART 4: METRICS WE'RE TRACKING

### Metric Categories

| Category | What It Answers |
|----------|----------------|
| **Speed** | How fast are we responding? |
| **Contact** | Are we reaching people? |
| **Conversion** | Are we closing deals? |
| **Revenue** | How much money are we making? |
| **Approval** | Are carriers accepting our business? |
| **Persistency** | Are policies staying active? |
| **Retention** | Can we save at-risk policies? |
| **Recapture** | Are we recovering lost leads? |
| **Activity** | Are agents putting in the work? |
| **Intelligence** | Where should we focus? |

### Complete Metric List

| # | Metric | Formula | Source |
|---|--------|---------|--------|
| 1 | Speed to Lead | Avg(first_contact_timestamp - lead_entry_timestamp) | P1 S1 |
| 2 | Response Time | Avg(agent_reply_timestamp - client_message_timestamp) | All pipelines |
| 3 | Overdue Rate | Count(leads with overdue tags) / Count(active leads) | All pipelines |
| 4 | Contact Rate | Count(leads reaching S3+) / Count(leads entering S1) | P1 |
| 5 | Attempts to Contact | Avg(activity_entries per lead before first conversation) | P1 S1-S2 |
| 6 | Engagement Rate | Count(S3 entries) / Count(S1 entries) | P1 |
| 7 | Qualification Rate | Count(S4 entries) / Count(S3 entries) | P1 |
| 8 | Close Rate | Count(S6 entries) / Count(S1 entries) | P1 |
| 9 | App-to-Close Rate | Count(S6 entries) / Count(S5 entries) | P1 |
| 10 | Pipeline Velocity | Avg(closed_date - entry_date) in days | P1 |
| 11 | Avg Monthly Premium | Avg(price) on Closed Won deals | P1 S6 |
| 12 | Avg Annual Premium | Avg(price × 12) on Closed Won deals | P1 S6 |
| 13 | Total AP Written | Sum(price × 12) for period | P1 S6 |
| 14 | Revenue by Source | Sum(AP) grouped by lead_source | P1 S6 |
| 15 | Revenue by Carrier | Sum(AP) grouped by carrier | P1 S6 |
| 16 | Lead Source ROI | (AP × commission_rate) / (lead_count × cost_per_lead) | P1 + config |
| 17 | Approval Rate | Count(approved) / Count(submitted) | P2 → P3 |
| 18 | Placement Rate | Count(in_force) / Count(approved) | P3 |
| 19 | Avg UW Time | Avg(decision_date - submission_date) | P2 |
| 20 | Requirements Completion | Count(resolved_without_decline) / Count(total_requirements) | P2 S2 |
| 21 | 13-Month Persistency | Count(policies active at 13 months) / Count(policies issued 13+ months ago) | P6 |
| 22 | Danger Zone Survival | Count(survived Month 3) / Count(entered Month 1) | P6 S1→S2 |
| 23 | Exception Rate | Count(P4 entries) / Count(active P6 clients) | P4 / P6 |
| 24 | Save Rate | Count(Resolved) / Count(Resolved + Terminated) | P4 |
| 25 | Avg Time to Resolve | Avg(resolved_date - exception_date) | P4 |
| 26 | Chargeback Risk | Count(terminated within 12 months) × avg_commission | P4 |
| 27 | Recapture Rate | Count(P7/P5 → P1 re-entries) / Count(P7 + P5 S2 entries) | P7 + P5 |
| 28 | ZOMBIE Rate | Count(ZOMBIE tags) / Count(P5 S2 entries) | P5 S2 |
| 29 | Win Back Revenue | Sum(AP from recaptured leads) | P1 (filtered) |
| 30 | Nurture Response Rate | Count(replies) / Count(SMS sent) per touchpoint | P7 |
| 31 | Daily Activity Score | Weighted(calls + texts + leads_worked) | Activity feed |
| 32 | Calls Made | Count(outbound_calls) per day | Call logs |
| 33 | Talk Time | Sum(call_duration) per day | Call logs |
| 34 | Leads Worked | Count(distinct lead_ids with activity) per day | Activity feed |
| 35 | Best Time to Call | Contact_rate grouped by hour × day_of_week | Call logs |
| 36 | State Performance | Close_rate + avg_AP grouped by state | P1 |
| 37 | Carrier Matrix | Approval% + UW_days + persistency + avg_premium by carrier | P2 + P3 + P6 |
| 38 | Funnel Drop-Off | Stage-to-stage conversion rates | P1 |
| 39 | Revenue Forecast | Active_leads × stage_close_rate × avg_premium | P1 |

---

## PART 5: KPIs THAT DRIVE EACH METRIC

Each metric has **input KPIs** — the specific behaviors and actions that an agent controls that directly impact the output metric. This is the "what do I actually DO to improve this number?"

### SPEED METRICS

| Output Metric | Input KPIs (What Drives It) | Target |
|---------------|---------------------------|--------|
| **Speed to Lead** | • Time between notification received and first call attempt • Number of leads in queue when new lead arrives • Agent availability at time of lead entry | First call < 5 min |
| **Response Time** | • How often agent checks for REPLY NEEDED tags • Agent's current call/appointment load • Notification responsiveness | Reply < 30 min |
| **Overdue Rate** | • Daily pipeline review habit • Number of active cases per agent • Task completion rate | < 5% overdue |

### CONTACT METRICS

| Output Metric | Input KPIs (What Drives It) | Target |
|---------------|---------------------------|--------|
| **Contact Rate** | • Calls per day (volume) • Call timing (best time to call data) • Multi-channel approach (call + text + email) • Attempt persistence (5+ attempts before giving up) | > 45% contacted |
| **Attempts to Contact** | • Agent persistence • Time spacing between attempts • Channel variation (phone AM, text PM) | 3-5 avg attempts |
| **Engagement Rate** | • Pitch quality on first conversation • Rapport building skill • Lead source quality (better leads = higher engagement) | > 30% engaged |
| **Qualification Rate** | • Trust building during engaged phase • Proper qualification questions • Objection handling on SSN request | > 55% qualified |

### CONVERSION METRICS

| Output Metric | Input KPIs (What Drives It) | Target |
|---------------|---------------------------|--------|
| **Close Rate** | • Contact rate × engagement rate × qualification rate × app completion rate • Lead source quality • Agent skill level • Speed to lead (faster = higher close rate) | > 10% |
| **App-to-Close Rate** | • Application process efficiency • Client hand-holding during app • Follow-up speed on missing info • Carrier product match accuracy | > 80% |
| **Pipeline Velocity** | • Speed at each stage transition • No leads sitting idle • Proactive follow-up cadence | < 14 days |

### REVENUE METRICS

| Output Metric | Input KPIs (What Drives It) | Target |
|---------------|---------------------------|--------|
| **Average Premium** | • Client needs assessment quality • Product recommendation accuracy • Coverage amount discussions • Upsell during application | Market-dependent |
| **Total AP Written** | • Close rate × average premium × lead volume • Pipeline velocity (faster cycles = more deals per month) | Growth month over month |
| **Lead Source ROI** | • Cost per lead by source • Close rate by source • Average premium by source • Volume available by source | > 3x return |

### APPROVAL METRICS

| Output Metric | Input KPIs (What Drives It) | Target |
|---------------|---------------------------|--------|
| **Approval Rate** | • Accurate health assessment during application • Correct carrier selection for client's health • Complete application (no missing fields) • Proper product match | > 75% |
| **Placement Rate** | • Quick policy delivery after approval • Proper banking setup • Client commitment confirmation • Pre-draft confirmation calls | > 90% |
| **UW Time** | • Complete applications (fewer requirements) • Same-day requirement responses • 72h requirement chase cadence • Carrier selection (some are faster) | Carrier-dependent |

### PERSISTENCY METRICS

| Output Metric | Input KPIs (What Drives It) | Target |
|---------------|---------------------------|--------|
| **13-Month Persistency** | • Quality of initial sale (right product, right price) • Month 1 anchoring (gift, welcome) • Month 3 danger zone outreach • Annual review completion • Exception resolution speed | > 85% |
| **Danger Zone Survival** | • Month 1 relationship quality • Gift/welcome response • Early check-in calls • Proactive identification of at-risk clients | > 90% |
| **Exception Rate** | • Quality of original sale • Client payment method setup • Premium affordability assessment • Client relationship strength | < 10% |
| **Save Rate** | • Speed of exception response (< 4 hours) • Call-same-day discipline • Retention script effectiveness • Payment solution options offered • Carrier relationship for reinstatement | > 65% |

### RECAPTURE METRICS

| Output Metric | Input KPIs (What Drives It) | Target |
|---------------|---------------------------|--------|
| **Recapture Rate** | • Nurture SMS message quality • Re-contact timing • Agent responsiveness to nurture replies • ZOMBIE response speed | > 10% |
| **Win Back Revenue** | • Recapture rate × close rate on second attempt × average premium • Rewrite viability assessment speed | Growth metric |

### ACTIVITY METRICS

| Output Metric | Input KPIs (What Drives It) | Target |
|---------------|---------------------------|--------|
| **Daily Activity Score** | • Calls made • Texts sent • Leads worked • Time on phone • Pipeline review completed | Configurable |
| **Calls Made** | • Dialing discipline • Power dialer usage • Time management • Lead queue management | 80-100/day |
| **Talk Time** | • Call connection rate • Conversation length • Pitch quality (longer = more engaged) • Objection handling | 2-3 hrs/day |

---

## PART 6: EFFICIENCY STRATEGY

### The Efficiency Philosophy
**Do more with the same time, not more time.** Every minute an agent spends on something the system could automate is a minute not spent on the phone closing deals.

### Strategy 1: Eliminate Manual Data Entry
**Problem:** Agents waste 30-60 min/day on CRM data entry
**Solution:**
- Auto-populate from lead source (GSheet, webhook) — no retyping
- Call logs auto-captured from dialer
- Stage transitions auto-tag and auto-timestamp
- Required fields enforced at stage gates — fill once, carries forward
- SMS templates pre-built — agent approves, not writes
**KPI Impact:** +15-20% more leads worked per day

### Strategy 2: Automate the Follow-Up Calendar
**Problem:** Agents forget to follow up, or follow up at wrong times
**Solution:**
- Every stage has auto-timers that create tasks
- Escalating tags make overdue items impossible to ignore
- Best Time to Call heatmap tells agents WHEN to call
- Calendar auto-creates follow-up events from disposition
- Daily 8AM SMS with pipeline counts = morning briefing
**KPI Impact:** Overdue rate drops to < 5%, contact rate increases 10-15%

### Strategy 3: Smart Prioritization
**Problem:** Agent works leads in random order, misses hot prospects
**Solution:**
- NEW badge on unseen leads with auto-dismiss after engagement
- ZOMBIE tag = instant priority override
- REPLY NEEDED tag = respond before dialing new leads
- Qualified Interest leads always show first (SSN = serious)
- Pipeline cards show time-in-stage — oldest first
- Escalation tags create visual urgency (yellow → orange → red)
**KPI Impact:** Speed to lead < 5 min, close rate increases from prioritized contact

### Strategy 4: Reduce Pipeline Bloat
**Problem:** Dead leads clog the pipeline, making it hard to see real opportunities
**Solution:**
- Every stage has a maximum time limit with auto-move
- Contact: 4 days max → Nurture
- Engaged: 14 days max → Nurture
- Qualified: 7 days max → Nurture
- Application: 11 days max → Nurture
- Exception Recovery: 30 days max → Terminated
- Nurture: 6 months max → Recycle
- Recycle: 45 days max → Uninsurable
- Lead DELETED from previous pipeline on transfer — no ghosts
**KPI Impact:** Pipeline reflects reality. Forecasting accuracy improves. Agent focus sharpens.

### Strategy 5: One-Click Actions
**Problem:** Too many clicks to do common tasks
**Solution:**
- Click-to-call from any lead card
- One-click disposition with auto-stage-move
- Quick Schedule Call button creates calendar event from lead modal
- Drag-and-drop between pipeline stages
- Inline field editing on lead cards
- SMS templates with one-click send (through approval gate)
**KPI Impact:** 20-30% reduction in time per lead interaction

### Strategy 6: Batch Operations
**Problem:** Agent has 50 leads to call, opens each one individually
**Solution:**
- Power dialer auto-loads next lead, auto-dials
- Multi-line dialing (2-3 simultaneous) increases connection rate
- AMD skips voicemails automatically
- Voicemail drop = pre-recorded, one click
- Post-call disposition auto-advances to next lead
- Call scripts display alongside — no tab switching
**KPI Impact:** 3-5x more calls per hour, 2x more talk time per day

### Strategy 7: Proactive Retention
**Problem:** Agents only react to exceptions after they happen
**Solution:**
- Month 3 "Danger Zone" proactive outreach catches churn before it starts
- Month 6 beneficiary review keeps client engaged
- Month 12 annual review deepens relationship
- Client Contact stage catches missed calls/texts immediately
- Negative sentiment in any reply auto-triggers Pipeline 4
**KPI Impact:** Exception rate drops 15-25%, persistency increases to 88%+

---

## PART 7: MAXIMIZE ROI STRATEGY

### ROI Philosophy
**Every dollar spent on leads should generate at least 3x return in commissionable premium.** The system tracks this automatically so agents know exactly which lead sources are profitable and which are burning money.

### Strategy 1: Lead Source Optimization
**How the system enables it:**
- Every lead tagged with source on entry
- Close rate calculated per source automatically
- Average premium per source tracked
- Cost per lead entered in settings (manual, one-time)
- ROI auto-calculated: (Total AP from source × commission %) / Total lead cost

**Action Plan:**
- Monthly: Review Lead Source ROI table
- Sources with ROI > 5x → increase spend
- Sources with ROI 3-5x → maintain
- Sources with ROI 1-3x → optimize (are agents working them fast enough?)
- Sources with ROI < 1x → reduce or cut
- Track lead quality (engagement rate) not just volume

### Strategy 2: Carrier Optimization
**How the system enables it:**
- Carrier Performance Matrix: Approval % | UW Time | Persistency | Avg Premium
- Shows which carriers approve more, process faster, and retain longer

**Action Plan:**
- High approval + high persistency carriers → default recommendation
- Fast UW carriers → use when client is eager and ready
- High premium carriers → use when client can afford more
- Low approval carriers → only when they're the only option for a health condition
- Track chargeback risk by carrier — some carriers have higher lapse rates

### Strategy 3: Time Optimization
**How the system enables it:**
- Best Time to Call heatmap built from YOUR data
- Pipeline Velocity tracking shows where deals slow down
- Talk Time vs Idle Time ratio shows productive hours

**Action Plan:**
- Dial during peak connection hours (heatmap)
- Handle admin/follow-ups during low-connection hours
- Target pipeline velocity < 14 days — identify and fix the slowest stage
- Aim for 60%+ of work time as talk time
- Use power dialer during prime hours, manual for follow-ups

### Strategy 4: Maximize Second-Chance Revenue
**How the system enables it:**
- Nurture drip keeps cold leads warm for 6 months
- Recycle provides structured 45-day re-engagement
- ZOMBIE detection catches self-reactivating leads
- Win Back Revenue metric shows how much AP comes from recycled leads

**Action Plan:**
- Never delete a lead — Nurture or Recycle, never trash
- Respond to ZOMBIE leads within 5 minutes (they came back for a reason)
- Track which Nurture SMS message triggers the most responses — write more like that one
- Target: 10%+ recapture rate = free revenue from leads already paid for
- Track Win Back Revenue as % of total — should be 8-15% for mature books

### Strategy 5: Reduce Chargebacks (Protect Earned Revenue)
**How the system enables it:**
- 13-Month Persistency tracking per cohort
- Danger Zone Survival rate identifies early churn risk
- Exception Rate + Save Rate show retention effectiveness
- Chargeback Risk metric shows commission dollars at risk

**Action Plan:**
- Target 85%+ 13-month persistency (industry top tier)
- Prioritize Month 1 anchoring — gift, welcome call, relationship building
- Month 3 is do-or-die: proactive outreach BEFORE problems surface
- Respond to exceptions within 4 hours (save rate drops 20% after 24h)
- Track which exception types are most common — fix the root cause
- If exception rate > 20% → review sales process (are clients buying coverage they can't afford?)

### Strategy 6: Scale Through Data
**How the system enables it:**
- Funnel Drop-Off Analysis shows exactly where leads die
- State Performance shows geographic opportunity
- Revenue Forecast provides pipeline confidence

**Action Plan:**
- Fix the biggest funnel drop-off first — biggest ROI improvement
- Double down on top-performing states
- Use Revenue Forecast to predict monthly income and plan lead purchases accordingly
- Weekly: 30-min dashboard review to identify one thing to improve
- Monthly: Full business review — all metrics, all strategies, all adjustments

### The ROI Formula (Per Agent)
```
Monthly Revenue = (Leads/Month × Close Rate × Avg AP) - Lead Cost
Monthly Revenue = (200 leads × 10% × $1,200 AP) - ($3,000 lead cost)
Monthly Revenue = $24,000 - $3,000 = $21,000 in AP written

With 85% persistency:
Retained Annual Revenue = $21,000 × 12 months × 85% = ~$214,000 AP/year

With commission at 80% first year:
Annual Commission = ~$171,000
```

**Every 1% improvement in close rate = ~$2,400 more AP/month per agent**
**Every 1% improvement in persistency = ~$2,500 more retained AP/year per agent**

That's why these KPIs matter. That's what the dashboard is protecting.

---

## SUMMARY

| Component | Count |
|-----------|-------|
| Pipelines | 7 |
| Total Stages | 24 |
| Automated Triggers | 40+ |
| System Actions | 60+ |
| Conditional Actions | 45+ |
| Tracked Metrics | 39 |
| Input KPIs | 50+ |
| SMS Automations | 15+ (all through approval gate) |
| Escalation Levels | 7 (in RE pipeline) |
| Time-Based Auto-Moves | 12 |

**One system. Every lead accounted for. Every dollar tracked. Every agent accountable. Every outcome documented.**
