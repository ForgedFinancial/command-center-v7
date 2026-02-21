# CRM Production Dashboard — KPI Specification
# Created: Feb 19, 2026

## Purpose
Give every agent an instant, honest picture of their business: where it's thriving, where it's bleeding, and exactly what to fix. No vanity metrics. Everything here is trackable from data already flowing through the 7 pipelines.

---

## DASHBOARD LAYOUT

### Top Bar: Scorecard (at-a-glance health)
Single row of cards showing the most critical numbers with color coding:
- 🟢 Green = at or above target
- 🟡 Yellow = within 10% of target
- 🔴 Red = below target

---

## SECTION 1: SPEED & RESPONSIVENESS

### 1.1 Speed to Lead
**What it measures:** Time from lead entering system → agent's first contact attempt
**Data source:** Pipeline 1, Stage 1 (New Lead) — timestamp of creation vs first activity log entry
**Target KPI:** < 5 minutes
**Thresholds:**
- 🟢 < 5 min (industry best: sub-5-minute response = 21x more likely to qualify)
- 🟡 5-15 min
- 🔴 > 15 min
**Display:** Average speed, median speed, % of leads contacted within 5 min

### 1.2 Average Response Time
**What it measures:** When a client messages/replies, how fast does the agent respond?
**Data source:** TAG | REPLY NEEDED | timestamp vs agent response timestamp
**Target KPI:** < 30 minutes during business hours
**Thresholds:**
- 🟢 < 30 min
- 🟡 30-60 min
- 🔴 > 60 min
**Display:** Average, trend line (improving/declining over weeks)

### 1.3 Overdue Rate
**What it measures:** % of leads/cases that hit any Overdue tag
**Data source:** All TAG | Overdue-* | assignments across all pipelines
**Target KPI:** < 5%
**Thresholds:**
- 🟢 < 5%
- 🟡 5-15%
- 🔴 > 15%
**Display:** Current overdue count, % of active pipeline, trend

---

## SECTION 2: CONTACT & ENGAGEMENT

### 2.1 Contact Rate
**What it measures:** % of leads where agent made successful contact (voice conversation)
**Data source:** Pipeline 1 — leads that moved past Contact stage (reached Engaged Interest or beyond)
**Target KPI:** 40-50%
**Thresholds:**
- 🟢 > 45%
- 🟡 30-45%
- 🔴 < 30%
**Display:** %, raw numbers (e.g., "47% — 94 of 200 leads contacted")

### 2.2 Attempts to Contact
**What it measures:** Average number of call/text attempts before first successful contact
**Data source:** Activity feed entries per lead in Pipeline 1 Stages 1-2
**Target KPI:** 3-5 attempts (industry data: 80% of sales require 5+ attempts, most agents quit at 2)
**Display:** Average attempts, distribution chart

### 2.3 Engagement Rate
**What it measures:** % of contacted leads that show genuine interest (reach Engaged Interest)
**Data source:** Pipeline 1 — leads entering Stage 3 / total leads entering Stage 1
**Target KPI:** 25-35%
**Thresholds:**
- 🟢 > 30%
- 🟡 20-30%
- 🔴 < 20%
**Display:** %, with breakdown by lead source

### 2.4 Qualification Rate
**What it measures:** % of engaged leads that provide SSN (reach Qualified Interest)
**Data source:** Pipeline 1 — Stage 4 entries / Stage 3 entries
**Target KPI:** 50-60% of engaged leads
**Thresholds:**
- 🟢 > 55%
- 🟡 40-55%
- 🔴 < 40%
**Display:** %, conversion funnel visual

---

## SECTION 3: CONVERSION & REVENUE

### 3.1 Close Rate (Lead → Closed Won)
**What it measures:** % of all leads that reach Closed Won
**Data source:** Pipeline 1 — Stage 6 entries / Stage 1 entries
**Target KPI:** 8-12% (industry average for final expense: 10-15% of contacted leads)
**Thresholds:**
- 🟢 > 10%
- 🟡 6-10%
- 🔴 < 6%
**Display:** %, total closed this period, trend vs previous period

### 3.2 Application-to-Close Rate
**What it measures:** % of applications that reach Closed Won (not abandoned mid-app)
**Data source:** Pipeline 1 — Stage 6 entries / Stage 5 entries
**Target KPI:** 75-85%
**Thresholds:**
- 🟢 > 80%
- 🟡 65-80%
- 🔴 < 65%
**Display:** %, identifies if agent loses people during the app process

### 3.3 Average Premium (Monthly)
**What it measures:** Average monthly premium per closed deal
**Data source:** Pipeline 1, Stage 6 — Price field
**Target KPI:** Varies by product/market
**Display:** Average, median, min/max, trend

### 3.4 Average Annual Premium (AP)
**What it measures:** Average premium × 12 per closed deal
**Data source:** Calculated from Price field
**Display:** Per deal, total AP written this period, AP by carrier, AP by lead source

### 3.5 Total Revenue Written
**What it measures:** Sum of all AP written in period
**Data source:** All Closed Won deals
**Display:** This week, this month, this quarter, YTD. Comparison to previous periods.

### 3.6 Revenue by Lead Source
**What it measures:** Which lead sources produce the most revenue?
**Data source:** Lead source field + Price field on Closed Won deals
**Target KPI:** ROI > 3x cost per lead
**Display:** Table: Source | Leads | Closed | AP | Cost/Lead | ROI

### 3.7 Revenue by Carrier
**What it measures:** Which carriers are getting the most production?
**Data source:** Carrier field on Closed Won deals
**Display:** Pie chart + table: Carrier | Deals | Total AP | Avg Premium

### 3.8 Pipeline Velocity
**What it measures:** Average time from New Lead → Closed Won
**Data source:** Timestamps of Stage 1 entry vs Stage 6 entry
**Target KPI:** < 14 days
**Thresholds:**
- 🟢 < 14 days
- 🟡 14-21 days
- 🔴 > 21 days
**Display:** Average days, median, trend

---

## SECTION 4: APPROVAL & PLACEMENT

### 4.1 Approval Rate
**What it measures:** % of submitted apps that get approved by carrier
**Data source:** Pipeline 2 → Pipeline 3 (Approved) vs Pipeline 2 → Pipeline 5 (Declined)
**Target KPI:** 70-80%
**Thresholds:**
- 🟢 > 75%
- 🟡 60-75%
- 🔴 < 60%
**Display:** %, by carrier (shows which carriers are easier/harder to place with)

### 4.2 Placement Rate
**What it measures:** % of approved policies that actually go In Force
**Data source:** Pipeline 3 — Stage 4 (In Force) / Stage 1 (Approved)
**Target KPI:** > 90%
**Thresholds:**
- 🟢 > 90%
- 🟡 80-90%
- 🔴 < 80%
**Display:** %, identifies if policies are dying between approval and in-force

### 4.3 Average Underwriting Time
**What it measures:** How long from Submitted → carrier decision?
**Data source:** Pipeline 2 timestamps
**Display:** Average days, by carrier. Helps agent pick faster carriers.

### 4.4 Requirements Completion Rate
**What it measures:** % of UW requirements resolved without decline
**Data source:** Pipeline 2, Stage 2 outcomes
**Display:** %, common requirement types

---

## SECTION 5: PERSISTENCY & RETENTION

### 5.1 Persistency Rate (13-month)
**What it measures:** % of policies still In Force after 13 months
**Data source:** Pipeline 6 — clients that reach Month 12 without entering Pipeline 4
**Target KPI:** > 85% (industry: top producers hit 88-92%)
**Thresholds:**
- 🟢 > 85%
- 🟡 75-85%
- 🔴 < 75%
**Display:** %, trend, by carrier, by lead source. THIS IS THE MOST IMPORTANT LONG-TERM METRIC.

### 5.2 Danger Zone Survival Rate
**What it measures:** % of clients that make it through Month 3 (the highest churn period) without an exception
**Data source:** Pipeline 6 — Stage 2 → Stage 3 without entering Pipeline 4
**Target KPI:** > 90%
**Thresholds:**
- 🟢 > 90%
- 🟡 80-90%
- 🔴 < 80%
**Display:** %, identifies early retention problems

### 5.3 Exception Rate
**What it measures:** % of In Force policies that enter Retention Exceptions
**Data source:** Pipeline 4 entries / total active Pipeline 6 clients
**Target KPI:** < 15%
**Thresholds:**
- 🟢 < 10%
- 🟡 10-20%
- 🔴 > 20%
**Display:** %, by exception type (payment, lapse, cancel request)

### 5.4 Save Rate
**What it measures:** % of retention exceptions that end in Resolved (not Terminated)
**Data source:** Pipeline 4 — Stage 3 (Resolved) / total exits
**Target KPI:** > 60%
**Thresholds:**
- 🟢 > 65%
- 🟡 50-65%
- 🔴 < 50%
**Display:** %, by exception type, average days to resolve

### 5.5 Average Time to Resolve
**What it measures:** How fast are exceptions being fixed?
**Data source:** Pipeline 4 — New Exception timestamp vs Resolved timestamp
**Target KPI:** < 7 days
**Display:** Average days, distribution

### 5.6 Chargeback Risk
**What it measures:** Policies likely to lapse before commission vesting (typically 9-12 months)
**Data source:** Pipeline 4 Terminated entries within first 12 months of policy
**Display:** Count, estimated commission at risk ($), by carrier

---

## SECTION 6: RECAPTURE & WIN BACK

### 6.1 Recapture Rate
**What it measures:** % of Nurture/Recycle leads that come back to Pipeline 1
**Data source:** Pipeline 7 → Pipeline 1 re-entries + Pipeline 5 Stage 2 → Pipeline 1 re-entries
**Target KPI:** 8-12%
**Thresholds:**
- 🟢 > 10%
- 🟡 5-10%
- 🔴 < 5%
**Display:** %, by original drop-off reason, by nurture SMS that triggered response

### 6.2 ZOMBIE Rate
**What it measures:** % of Recycle leads that self-reactivate (client reaches out)
**Data source:** TAG | ZOMBIE | assignments in Pipeline 5
**Display:** Count, conversion rate of ZOMBIEs to Closed Won

### 6.3 Win Back Revenue
**What it measures:** AP generated from recaptured leads (second chance revenue)
**Data source:** Closed Won deals where lead previously visited Pipeline 5 or 7
**Display:** Total AP from win-backs, % of total revenue

### 6.4 Nurture Response Rate
**What it measures:** Which nurture SMS messages get the most responses?
**Data source:** Pipeline 7 — which SMS (1-6) triggered the positive reply
**Display:** Response rate per SMS touchpoint. Optimizes messaging strategy.

---

## SECTION 7: AGENT ACCOUNTABILITY

### 7.1 Daily Activity Score
**What it measures:** Combined metric of calls made, texts sent, leads worked
**Data source:** Activity feed entries per day
**Target KPI:** Configurable per agency
**Display:** Today's score, 7-day average, ranking vs team (if multi-agent)

### 7.2 Calls Made
**What it measures:** Total outbound call attempts per day/week
**Data source:** Call logs (power dialer + manual)
**Target KPI:** 80-100 dials/day for power dialer users
**Display:** Daily count, weekly average, trend

### 7.3 Talk Time
**What it measures:** Total time on phone with clients per day
**Data source:** Call duration logs
**Target KPI:** 2-3 hours of talk time per day
**Display:** Daily total, average call duration, talk time vs idle time ratio

### 7.4 Leads Worked Today
**What it measures:** How many unique leads had activity today?
**Data source:** Unique lead IDs in today's activity feed
**Display:** Count, compared to available pipeline

### 7.5 Manager Alert Summary
**What it measures:** All escalations that hit the 72h and 14d manager thresholds
**Data source:** TAG assignments at 72h and 14d thresholds across Pipeline 1 and 4
**Display:** Count, list of cases, which agents

---

## SECTION 8: BUSINESS INTELLIGENCE

### 8.1 Lead Source ROI
**What it measures:** Return on investment per lead source
**Data source:** Lead source + cost per lead (manual input) vs AP generated
**Formula:** (Total AP from source × estimated commission %) / Total cost of leads from source
**Display:** Table with ROI ranking, recommendation to increase/decrease spend

### 8.2 Best Time to Call
**What it measures:** Which days/times yield highest contact and close rates?
**Data source:** Successful contact timestamps, Closed Won timestamps
**Display:** Heatmap (day of week × hour of day), color-coded by connection rate

### 8.3 State Performance
**What it measures:** Which states/regions perform best?
**Data source:** Lead state field vs conversion rates
**Display:** Map or table, ranked by close rate and AP

### 8.4 Carrier Performance Matrix
**What it measures:** Which carriers have best approval rate, fastest UW, highest persistency?
**Data source:** Pipeline 2 (approval rate, UW time) + Pipeline 6 (persistency by carrier)
**Display:** Matrix: Carrier | Approval % | Avg UW Days | 13-Mo Persistency | Avg Premium

### 8.5 Funnel Drop-Off Analysis
**What it measures:** Where are leads dying in the pipeline?
**Data source:** Stage transition counts across Pipeline 1
**Display:** Funnel chart: New Lead → Contact → Engaged → Qualified → App → Closed with % at each step. Highlights the biggest drop-off.

### 8.6 Revenue Forecast
**What it measures:** Projected revenue based on current pipeline
**Data source:** Active leads × stage-specific historical close rate × average premium
**Display:** Projected AP this month, confidence level, pipeline value

---

## KPI SUMMARY TABLE

| # | KPI | Target | Data Source | Why It Matters |
|---|-----|--------|-------------|----------------|
| 1 | Speed to Lead | < 5 min | P1 timestamps | 21x more likely to qualify |
| 2 | Response Time | < 30 min | REPLY NEEDED tags | Client satisfaction + close rate |
| 3 | Contact Rate | > 45% | P1 stage progression | Can't close what you can't reach |
| 4 | Attempts to Contact | 3-5 avg | P1 activity feed | Most agents quit too early |
| 5 | Engagement Rate | > 30% | P1 S3 / S1 | Measures pitch effectiveness |
| 6 | Qualification Rate | > 55% | P1 S4 / S3 | SSN = serious buyer |
| 7 | Close Rate | > 10% | P1 S6 / S1 | Bottom line conversion |
| 8 | App-to-Close | > 80% | P1 S6 / S5 | Are you losing people mid-app? |
| 9 | Pipeline Velocity | < 14 days | P1 timestamps | Faster = more revenue |
| 10 | Approval Rate | > 75% | P2 outcomes | Carrier relationship health |
| 11 | Placement Rate | > 90% | P3 S4 / S1 | Are approved policies going live? |
| 12 | Persistency (13-mo) | > 85% | P6 tracking | THE long-term metric |
| 13 | Danger Zone Survival | > 90% | P6 S2→S3 | Month 3 = highest churn |
| 14 | Exception Rate | < 15% | P4 / P6 total | Policy health |
| 15 | Save Rate | > 60% | P4 Resolved/total | Retention effectiveness |
| 16 | Recapture Rate | > 10% | P7+P5→P1 | Second chance revenue |
| 17 | Daily Calls | 80-100 | Call logs | Activity drives results |
| 18 | Talk Time | 2-3 hrs | Call duration | Quality over quantity |
| 19 | Overdue Rate | < 5% | Overdue tags | Accountability |
| 20 | Lead Source ROI | > 3x | Source + AP | Spend optimization |

---

## DASHBOARD VIEWS

### View 1: Agent Scorecard (default)
Top-level health at a glance. All 20 KPIs as color-coded cards. Click any card to drill into detail.

### View 2: Pipeline Funnel
Visual funnel from New Lead → Closed Won with % at each stage. Click any stage to see the leads stuck there.

### View 3: Revenue & Production
AP written, by period, by source, by carrier. Revenue forecast. Commission tracker.

### View 4: Retention & Persistency
Persistency cohort chart, exception rate trend, save rate, chargeback risk.

### View 5: Activity & Accountability
Calls made, talk time, leads worked, overdue counts, response times. Manager view shows all agents side-by-side.

### View 6: Intelligence
Best time to call heatmap, state performance, carrier matrix, lead source ROI, funnel drop-off.

### Time Filters (all views)
Today | This Week | This Month | This Quarter | YTD | Custom Range
