# CC v7 — Call Disposition System + Book of Business
## Architecture Blueprint v1.0
### Author: Soren (FF-PLN-001) | Date: 2026-02-18
### Status: AWAITING BOSS APPROVAL — Nothing executes until approved.

---

## BOTTOM LINE UP FRONT

This blueprint adds 13 call dispositions, a "Sold" auto-trigger policy form, an archive/DNC view, a production scoreboard ("Book of Business"), activity logging on every disposition, and auto follow-up scheduling via iCloud CalDAV — all wired into the existing YN-CRM monolith (11,279-line `index.html`) with D1 backend. The plan requires **4 new D1 columns**, **1 new D1 table**, and approximately **2,400 lines of new frontend code** inserted into the monolith. No separate React app — this lives in the existing CRM.

---

## TABLE OF CONTENTS

1. [File Structure](#1-file-structure)
2. [Component Hierarchy](#2-component-hierarchy)
3. [State Management](#3-state-management)
4. [Data Flow](#4-data-flow)
5. [Event Architecture](#5-event-architecture)
6. [Error Handling](#6-error-handling)
7. [Naming Conventions](#7-naming-conventions)
8. [D1 Schema Changes](#8-d1-schema-changes)
9. [Worker API Changes](#9-worker-api-changes)
10. [Build Sequence](#10-build-sequence)
11. [Acceptance Criteria](#11-acceptance-criteria)
12. [Risk Register](#12-risk-register)

---

## 1. FILE STRUCTURE

The CRM is a **single-file monolith** (`index.html`). All new code goes into this file at designated insertion points. No new files required for the frontend. The Worker (`yncrm-api.danielruh.workers.dev`) needs targeted additions.

### Insertion Map Within index.html

```
index.html (11,279 lines currently)
│
├── <style> block (lines ~50–1300)
│   └── INSERT @ ~line 1300: Disposition modal styles, archive view styles,
│       scoreboard/dashboard styles, policy form styles (~250 lines CSS)
│
├── <body> HTML structure (lines ~3800–4900)
│   ├── Sidebar navigation (lines ~4020–4040)
│   │   └── INSERT: Two new nav items:
│   │       • "Archive" nav item (with badge count)
│   │       • "Scoreboard" nav item
│   │
│   ├── Main content area (lines ~4050–4800)
│   │   └── INSERT: Three new page containers:
│   │       • <div id="page-archive"> — Archive/DNC view
│   │       • <div id="page-scoreboard"> — Book of Business dashboard
│   │       • Modal: <div id="disposition-modal"> — Disposition selector
│   │       • Modal: <div id="policy-sold-modal"> — Sold policy form
│   │       • Modal: <div id="followup-picker-modal"> — Date/time picker for Follow-Up & Appointment
│   │
│   └── Existing modals section (lines ~4460–4800)
│       └── INSERT: disposition-modal, policy-sold-modal, followup-picker-modal HTML
│
├── <script> block — Constants (lines ~5050–5600)
│   └── INSERT @ ~line 5470 (after STAGES):
│       • DISPOSITIONS constant (13 disposition definitions)
│       • DISPOSITION_STAGE_MAP (disposition → pipeline stage mapping)
│       • FOLLOWUP_DEFAULTS (default timing per disposition)
│       • SCOREBOARD_CONFIG (AP calculation rules, goal defaults)
│
├── <script> block — State (lines ~5500–5600)
│   └── MODIFY state object:
│       • Add: state.dispositionHistory = []
│       • Add: state.archiveFilters = { reason: 'all', search: '' }
│       • Add: state.scoreboardGoals = { monthlyAP: 15000 }
│       • Add: state.currentView entries for 'archive' and 'scoreboard'
│
├── <script> block — Core functions (lines ~5600–7000)
│   └── INSERT @ ~line 6400 (after saveClient):
│       • applyDisposition(clientId, dispositionId, notes, extra)
│       • openDispositionModal(clientId)
│       • closeDispositionModal()
│       • handleDispositionSelect(dispositionId)
│       • openPolicySoldForm(clientId)
│       • savePolicySoldForm()
│       • scheduleAutoFollowUp(clientId, disposition)
│       • addActivityEntry(clientId, type, text, metadata)
│       • incrementCallAttempt(clientId)
│       • archiveLead(clientId, reason)
│       • restoreLead(clientId)
│       • flagDNC(clientId)
│       • flagBadNumber(clientId)
│       • flagReplacementRequest(clientId)
│
├── <script> block — Render functions (lines ~7000–9000)
│   └── INSERT @ ~line 8700 (after renderCalendar):
│       • renderArchiveView()
│       • renderScoreboard()
│       • renderDispositionModal(clientId)
│       • renderPolicySoldForm(clientId)
│       • renderFollowUpPicker(clientId, disposition)
│       • calculateAP(client)
│       • calculateScoreboardMetrics()
│       • renderScoreboardCards()
│       • renderCarrierBreakdown()
│       • renderLeadSourceROI()
│       • renderTimeToCloseChart()
│
├── <script> block — Calendar/iCloud (lines ~9500–9900)
│   └── MODIFY existing iCloud sync:
│       • createCalendarEventForDisposition(clientId, disposition, dateTime)
│       • Leverage existing syncICloud() dirty flag mechanism
│
└── <script> block — Pipeline render (lines ~7080–7200)
    └── MODIFY renderPipeline():
        • Add "Dispose" button on each kanban card
        • Add call attempt counter badge on cards
        • Add red flag styling for Bad Number cards
        • Add DNC visual indicator
        • Add last contact date on card
```

### Worker Additions (yncrm-api.danielruh.workers.dev)

```
Worker code additions:
├── D1 schema migration (new columns + table)
├── GET /leads — MODIFY: include new columns in response
├── PUT /leads/:id — MODIFY: accept new columns
├── POST /leads — MODIFY: accept new columns
├── GET /leads/archived — NEW: fetch archived leads
├── POST /leads/:id/restore — NEW: restore archived lead
├── GET /production/stats — NEW: aggregate production data
└── POST /sync — MODIFY: handle new columns in sync payload
```

---

## 2. COMPONENT HIERARCHY

Since this is a monolith (vanilla JS, no React), "components" = render functions + their DOM containers. Hierarchy shows parent → child rendering relationships.

```
index.html
├── Sidebar Navigation
│   ├── [existing] Dashboard, Contacts, Pipeline, Calendar, Settings
│   ├── [NEW] Archive nav item (renderArchiveNav)
│   └── [NEW] Scoreboard nav item (renderScoreboardNav)
│
├── Pipeline View (renderPipeline — MODIFIED)
│   └── Kanban Card (renderKanbanCard — MODIFIED)
│       ├── [NEW] Call attempt counter badge
│       ├── [NEW] Last contact indicator
│       ├── [NEW] Bad Number red flag
│       ├── [NEW] DNC indicator
│       └── [NEW] "📋 Dispose" button → opens Disposition Modal
│
├── [NEW] Disposition Modal (renderDispositionModal)
│   ├── Client header (name, phone, lead type, current stage)
│   ├── Disposition grid (13 options, color-coded)
│   │   ├── Each disposition tile: icon + name + description
│   │   └── Active state highlight on selection
│   ├── Notes textarea (optional, pre-filled for some dispositions)
│   ├── [CONDITIONAL] Follow-Up Date/Time Picker (renderFollowUpPicker)
│   │   ├── Date input
│   │   ├── Time input
│   │   └── "Add to Calendar" toggle (default: on)
│   ├── [CONDITIONAL] Appointment Date/Time Picker (same component, different label)
│   │   ├── Date input
│   │   ├── Time input
│   │   ├── Reminder dropdown (15min, 30min, 1hr before)
│   │   └── "Add to Calendar" toggle (default: on)
│   └── Action buttons: [Cancel] [Apply Disposition]
│
├── [NEW] Policy Sold Form Modal (renderPolicySoldForm)
│   ├── Header: "🎉 Policy Details — [Client Name]"
│   ├── Pre-filled fields (from lead's existing Policy tab data):
│   │   ├── Carrier (text input, pre-filled if exists)
│   │   ├── Policy Number (text input)
│   │   ├── Face Amount (currency input)
│   │   ├── Monthly Premium (currency input) → shows "AP: $X" calculated live
│   │   ├── Payment Method (dropdown: Bank Draft, Credit Card, Direct Bill)
│   │   ├── Draft Date (date input)
│   │   ├── Effective Date (date input)
│   │   ├── Bank Name (text input, if payment = Bank Draft)
│   │   └── Product Type (dropdown: FEX, WHOLE, TERM, IUL, ANNUITY, etc.)
│   ├── Beneficiary section (pre-filled from Beneficiary tab):
│   │   ├── Primary beneficiary name
│   │   ├── Primary beneficiary relationship
│   │   ├── Secondary beneficiary name (optional)
│   │   └── Secondary beneficiary relationship (optional)
│   ├── Notes textarea
│   └── Action buttons: [Cancel] [Save Policy & Close Sale]
│
├── [NEW] Archive View (renderArchiveView)
│   ├── Header: "📦 Archive" + lead count
│   ├── Filter bar:
│   │   ├── Reason dropdown: All | Not Interested | Bad Number | DNC | Lead Replacement Submitted
│   │   └── Search input (name, phone, email)
│   ├── Archive table:
│   │   ├── Columns: Name | Phone | Reason | Archived Date | Original Stage | Lead Source | Actions
│   │   ├── Phone: amber (#f59e0b), bold, 12px
│   │   └── Each row: [👁️ View] [♻️ Restore] buttons
│   └── Empty state: "No archived leads"
│
├── [NEW] Scoreboard / Book of Business (renderScoreboard)
│   ├── Header: "📊 Book of Business" + date range selector
│   ├── Hero metrics row (4 cards):
│   │   ├── Monthly AP Closed (progress bar toward goal)
│   │   ├── Weekly AP Closed
│   │   ├── Today's AP
│   │   └── YTD AP
│   ├── Stats row (4 cards):
│   │   ├── Policies Written (this month / this week)
│   │   ├── Close Rate (Won / total leads, percentage)
│   │   ├── Avg Time to Close (days from New Lead → Sold)
│   │   └── Goal Progress (monthly AP target with edit button)
│   ├── Carrier Breakdown (horizontal bar chart):
│   │   └── Each carrier: bar + policy count + AP amount
│   ├── Lead Source ROI (table):
│   │   ├── Columns: Source | Leads | Sales | Conversion % | AP Generated | Cost per Lead*
│   │   └── *Cost per lead if ad_source data available
│   ├── Persistency Tracker:
│   │   ├── Policies in force vs. total written
│   │   └── Lapse rate percentage
│   └── Recent Sales (last 10 sold leads):
│       └── Name | Carrier | Face Amount | Premium | AP | Date Sold
│
├── Lead Detail Modal (openEditModal — MODIFIED)
│   ├── [existing] Contact Tab
│   ├── [existing] Policy Tab
│   ├── [existing] Beneficiary Tab
│   ├── [existing] Progress Tab
│   │   └── [MODIFIED] Add disposition history timeline
│   └── [existing] Activity Tab
│       └── [MODIFIED] Show disposition entries with special formatting
│           ├── Each entry: timestamp + disposition icon + disposition name + notes
│           └── Call attempt counter at top
│
└── [MODIFIED] Edit Client Form
    └── [NEW] "📋 Dispose" button in the header area (next to Save/Delete)
```

---

## 3. STATE MANAGEMENT

### New State Variables

| State Variable | Type | Lives In | Updated By | Read By |
|---|---|---|---|---|
| `state.dispositionModal` | `{ open: boolean, clientId: string, selected: string\|null, notes: string, dateTime: string\|null }` | `state` (memory + localStorage) | `openDispositionModal()`, `handleDispositionSelect()`, `closeDispositionModal()` | `renderDispositionModal()` |
| `state.policySoldModal` | `{ open: boolean, clientId: string }` | `state` (memory) | `openPolicySoldForm()`, `closePolicySoldForm()` | `renderPolicySoldForm()` |
| `state.archiveFilters` | `{ reason: string, search: string }` | `state` (memory + localStorage) | `setArchiveFilter()`, `setArchiveSearch()` | `renderArchiveView()` |
| `state.scoreboardGoals` | `{ monthlyAP: number, weeklyAP: number }` | `state` (localStorage + D1 via settings) | `updateScoreboardGoal()` | `renderScoreboard()`, `calculateScoreboardMetrics()` |
| `state.followUpDefaults` | `{ [dispositionId]: { hours: number } }` | `state` (localStorage via settings) | `updateFollowUpDefault()` in Settings | `scheduleAutoFollowUp()` |
| `client.disposition` | `string` | Each client in `state.clients[]` | `applyDisposition()` | `renderKanbanCard()`, `renderArchiveView()`, pipeline filters |
| `client.dispositionHistory` | `Array<{ disposition, timestamp, notes, agent }>` | Each client in `state.clients[]` | `applyDisposition()` | Activity tab, Progress tab, `renderArchiveView()` |
| `client.callAttempts` | `number` | Each client in `state.clients[]` | `applyDisposition()` (Called, Follow-Up) | `renderKanbanCard()`, lead detail |
| `client.noShowCount` | `number` | Each client in `state.clients[]` | `applyDisposition()` (Appointment - No Show) | Lead detail, kanban card tooltip |
| `client.archived` | `boolean` | Each client in `state.clients[]` | `archiveLead()`, `restoreLead()` | `renderPipeline()` (exclude), `renderArchiveView()` (include) |
| `client.archivedAt` | `string\|null` (ISO timestamp) | Each client in `state.clients[]` | `archiveLead()` | `renderArchiveView()` sort |
| `client.archiveReason` | `string\|null` | Each client in `state.clients[]` | `archiveLead()` | `renderArchiveView()` filter |
| `client.isDNC` | `boolean` | Each client in `state.clients[]` | `flagDNC()` | Pipeline (exclude from call queue), `renderKanbanCard()` (visual), archive filter |
| `client.isBadNumber` | `boolean` | Each client in `state.clients[]` | `flagBadNumber()` | `renderKanbanCard()` (red flag), pipeline filter |
| `client.replacementRequested` | `boolean` | Each client in `state.clients[]` | `flagReplacementRequest()` | `renderKanbanCard()` (flag icon), archive view |
| `client.replacementDate` | `string\|null` | Each client in `state.clients[]` | Lead Replacement Submitted disposition | `renderArchiveView()` |
| `client.leadSource` | `string\|null` | Each client (maps to `ad_source` in D1) | Already exists | `renderScoreboard()` lead source ROI |
| `client.soldAt` | `string\|null` | Each client in `state.clients[]` | `applyDisposition()` (Sold) | `renderScoreboard()`, time-to-close calc |
| `client.policyStatus` | `string` | Each client in `state.clients[]` | Policy form, manual update | Persistency tracker in scoreboard |
| `client.effectiveDate` | `string\|null` | Each client in `state.clients[]` | Policy sold form | Scoreboard, persistency |
| `client.productType` | `string\|null` | Each client in `state.clients[]` | Policy sold form | Scoreboard carrier breakdown |

### Existing State Modified

| State Variable | Modification | Reason |
|---|---|---|
| `state.clients[]` | Each client gets new fields above | Disposition tracking, archive, scoring |
| `state.settings` | Add `scoreboardGoals`, `followUpDefaults` | User-configurable settings |
| `state.activity[]` | Disposition entries get special `type: 'disposition'` | Filtering and display |
| `state.currentView` | Add `'archive'` and `'scoreboard'` as valid values | Navigation |
| `STAGES` array | Add `{ id: 'lost', name: 'Lost', color: '#ef4444' }` if not present | DNC/archive routing |

### Constants (Immutable)

```javascript
const DISPOSITIONS = [
  {
    id: 'new_lead',
    name: 'New Lead',
    icon: '🆕',
    color: '#22d3ee',
    description: 'Reset to New Lead column',
    targetStage: 'new_lead',
    autoFollowUp: null,
    requiresDatePicker: false,
    requiresPolicyForm: false,
    archivesLead: false
  },
  {
    id: 'called',
    name: 'Called',
    icon: '📞',
    color: '#38bdf8',
    description: 'Move to Contacted, log attempt, auto-schedule follow-up 2hrs',
    targetStage: 'contact',
    autoFollowUp: { hours: 2 },
    requiresDatePicker: false,
    requiresPolicyForm: false,
    archivesLead: false,
    incrementsCallAttempt: true
  },
  {
    id: 'follow_up',
    name: 'Follow-Up',
    icon: '📅',
    color: '#60a5fa',
    description: 'Date/time picker → calendar event, stay in Contacted',
    targetStage: null, // stays in current stage
    autoFollowUp: null,
    requiresDatePicker: true,
    requiresPolicyForm: false,
    archivesLead: false
  },
  {
    id: 'appointment_booked',
    name: 'Appointment Booked',
    icon: '📋',
    color: '#a78bfa',
    description: 'Move to Qualified, date/time picker → calendar event with reminder',
    targetStage: 'qualified',
    autoFollowUp: null,
    requiresDatePicker: true,
    hasReminder: true,
    requiresPolicyForm: false,
    archivesLead: false
  },
  {
    id: 'appointment_no_show',
    name: 'Appointment - No Show',
    icon: '👻',
    color: '#f97316',
    description: 'Stay in Qualified, auto-schedule retry 24hrs, log no-show count',
    targetStage: null, // stays in qualified
    autoFollowUp: { hours: 24 },
    requiresDatePicker: false,
    requiresPolicyForm: false,
    archivesLead: false,
    incrementsNoShow: true
  },
  {
    id: 'pitched_not_sold',
    name: 'Pitched - Not Sold',
    icon: '🎯',
    color: '#eab308',
    description: 'Move to Proposal, auto-schedule follow-up 48hrs',
    targetStage: 'application', // maps to "Proposal" stage
    autoFollowUp: { hours: 48 },
    requiresDatePicker: false,
    requiresPolicyForm: false,
    archivesLead: false
  },
  {
    id: 'sold',
    name: 'Sold',
    icon: '🎉',
    color: '#4ade80',
    description: 'Move to Won, auto-trigger policy form',
    targetStage: 'sold',
    autoFollowUp: null,
    requiresDatePicker: false,
    requiresPolicyForm: true,
    archivesLead: false
  },
  {
    id: 'not_interested',
    name: 'Not Interested',
    icon: '🚫',
    color: '#6b7280',
    description: 'Archive with timestamp',
    targetStage: null,
    autoFollowUp: null,
    requiresDatePicker: false,
    requiresPolicyForm: false,
    archivesLead: true,
    archiveReason: 'not_interested'
  },
  {
    id: 'bad_number',
    name: 'Bad Number',
    icon: '📵',
    color: '#ef4444',
    description: 'Flag card red, remove from call queue, stay visible for review',
    targetStage: null,
    autoFollowUp: null,
    requiresDatePicker: false,
    requiresPolicyForm: false,
    archivesLead: false,
    flagsBadNumber: true
  },
  {
    id: 'nurture',
    name: 'Nurture',
    icon: '🌱',
    color: '#34d399',
    description: 'Move to long-term drip, auto-schedule follow-up 7 days',
    targetStage: 'contact',
    autoFollowUp: { hours: 168 }, // 7 days
    requiresDatePicker: false,
    requiresPolicyForm: false,
    archivesLead: false
  },
  {
    id: 'request_replacement',
    name: 'Request Replacement',
    icon: '🔄',
    color: '#f59e0b',
    description: 'Flag for replacement, tag lead source',
    targetStage: null,
    autoFollowUp: null,
    requiresDatePicker: false,
    requiresPolicyForm: false,
    archivesLead: false,
    flagsReplacement: true
  },
  {
    id: 'lead_replacement_submitted',
    name: 'Lead Replacement Submitted',
    icon: '✅',
    color: '#9ca3af',
    description: 'Archive original, note replacement date',
    targetStage: null,
    autoFollowUp: null,
    requiresDatePicker: false,
    requiresPolicyForm: false,
    archivesLead: true,
    archiveReason: 'lead_replacement_submitted'
  },
  {
    id: 'add_to_dnc',
    name: 'Add to DNC',
    icon: '🛑',
    color: '#dc2626',
    description: 'Remove from all queues, flag Do Not Call, permanent',
    targetStage: null,
    autoFollowUp: null,
    requiresDatePicker: false,
    requiresPolicyForm: false,
    archivesLead: true,
    archiveReason: 'dnc',
    flagsDNC: true
  }
];

const FOLLOWUP_DEFAULTS = {
  called: 2,              // hours
  appointment_no_show: 24,  // hours
  pitched_not_sold: 48,    // hours
  nurture: 168             // hours (7 days)
};

const ARCHIVE_REASONS = {
  not_interested: { label: 'Not Interested', icon: '🚫', color: '#6b7280' },
  bad_number: { label: 'Bad Number', icon: '📵', color: '#ef4444' },
  dnc: { label: 'Do Not Call', icon: '🛑', color: '#dc2626' },
  lead_replacement_submitted: { label: 'Lead Replacement', icon: '✅', color: '#9ca3af' }
};
```

---

## 4. DATA FLOW

### Flow A: User Clicks "Dispose" on Kanban Card

```
User clicks "📋 Dispose" button on kanban card
    │
    ▼
openDispositionModal(clientId)
    │ Sets state.dispositionModal = { open: true, clientId, selected: null, notes: '', dateTime: null }
    │ Renders modal with 13 disposition tiles
    ▼
renderDispositionModal(clientId)
    │ Shows client header info
    │ Renders 13 clickable disposition tiles in a grid
    │ Notes textarea at bottom
    │ [Cancel] + [Apply Disposition] buttons
    ▼
User clicks a disposition tile
    │
    ▼
handleDispositionSelect(dispositionId)
    │ Highlights selected tile
    │ IF disposition.requiresDatePicker → shows inline date/time picker
    │ IF disposition.hasReminder → shows reminder dropdown
    │ Updates state.dispositionModal.selected
    ▼
User clicks [Apply Disposition]
    │
    ▼
applyDisposition(clientId, dispositionId, notes, extra)
    │
    ├──► (1) Update client stage (if targetStage !== null)
    │        client.stage = disposition.targetStage
    │        client.stageChangedAt = now
    │
    ├──► (2) Log disposition to activity
    │        addActivityEntry(clientId, 'disposition', {
    │          disposition: dispositionId,
    │          previousStage: oldStage,
    │          newStage: disposition.targetStage,
    │          notes: notes,
    │          timestamp: now
    │        })
    │
    ├──► (3) Update client.disposition = dispositionId
    │        Push to client.dispositionHistory[]
    │
    ├──► (4) Handle special flags
    │        IF incrementsCallAttempt → client.callAttempts++
    │        IF incrementsNoShow → client.noShowCount++
    │        IF flagsBadNumber → client.isBadNumber = true
    │        IF flagsDNC → client.isDNC = true, archiveLead()
    │        IF flagsReplacement → client.replacementRequested = true
    │        IF archivesLead → archiveLead(clientId, archiveReason)
    │
    ├──► (5) Update last contact
    │        client.lastContact = now
    │
    ├──► (6) Schedule auto follow-up (if autoFollowUp defined)
    │        scheduleAutoFollowUp(clientId, disposition)
    │        └── Creates calendar event via existing dirty-flag mechanism
    │        └── Sets client.followUpDate = calculated datetime
    │
    ├──► (7) IF disposition === 'sold'
    │        closeSaleFlow(clientId)
    │        └── Opens Policy Sold Form modal
    │        └── Pre-fills from existing client data
    │
    ├──► (8) Save state + trigger cloud sync
    │        saveState() → syncToCloud()
    │
    └──► (9) Close modal + re-render pipeline
             closeDispositionModal()
             renderPipeline()
             showToast(`Disposition applied: ${disposition.name}`)
```

### Flow B: Sold → Policy Form → Scoreboard

```
applyDisposition(clientId, 'sold', notes)
    │
    ├──► Move to 'sold' stage
    ├──► Set client.soldAt = now
    ├──► Log activity
    │
    ▼
openPolicySoldForm(clientId)
    │
    ▼
renderPolicySoldForm(clientId)
    │ PRE-FILL from existing client data:
    │   carrier → client.carrier
    │   policyNumber → client.policyNumber
    │   faceAmount → client.faceAmount
    │   premium → client.premium
    │   paymentMethod → client.paymentMethod
    │   draftDate → client.draftDate
    │   bankName → client.bankName
    │   beneficiary → client.beneficiary
    │   beneficiaryRelation → client.beneficiaryRelation
    │   beneficiary2 → client.beneficiary2 (if exists)
    │   beneficiary2Relation → client.beneficiary2Relation (if exists)
    │   dob → client.dob
    │   productType → client.leadType
    │   effectiveDate → (empty, user fills)
    │
    │ Shows AP calculation live: premium × 12 = AP
    │ Empty fields highlighted for manual entry
    ▼
User fills remaining fields, clicks [Save Policy & Close Sale]
    │
    ▼
savePolicySoldForm()
    │
    ├──► Write all fields to client record
    │        client.carrier = form.carrier
    │        client.policyNumber = form.policyNumber
    │        client.faceAmount = parseFloat(form.faceAmount)
    │        client.premium = parseFloat(form.premium)
    │        client.effectiveDate = form.effectiveDate
    │        client.productType = form.productType
    │        client.paymentMethod = form.paymentMethod
    │        client.draftDate = form.draftDate
    │        client.bankName = form.bankName
    │        client.policyStatus = 'active'
    │        ... (beneficiary fields)
    │
    ├──► Log activity: "Policy saved — [Carrier] [ProductType] $[Premium]/mo ($[AP] AP)"
    │
    ├──► saveState() + syncToCloud()
    │
    ├──► Close modal
    │
    └──► Scoreboard auto-updates on next render
         (Scoreboard reads from sold clients in real-time)
```

### Flow C: Archive → Restore

```
renderArchiveView()
    │ Filters state.clients WHERE client.archived === true
    │ Applies archiveFilters.reason and archiveFilters.search
    ▼
User clicks [♻️ Restore] on archived lead
    │
    ▼
restoreLead(clientId)
    │
    ├──► client.archived = false
    ├──► client.archivedAt = null
    ├──► client.archiveReason = null
    ├──► IF client.isDNC → confirm dialog "This lead was DNC. Remove DNC flag?"
    │        IF yes → client.isDNC = false
    │        IF no → keep isDNC, put back but still flagged
    ├──► client.stage = 'new_lead' (fresh start)
    ├──► Log activity: "Lead restored from archive"
    ├──► saveState() + syncToCloud()
    └──► Re-render archive view + pipeline
```

### Flow D: Scoreboard Data Aggregation

```
renderScoreboard()
    │
    ▼
calculateScoreboardMetrics()
    │
    ├──► soldLeads = state.clients.filter(c => c.stage === 'sold' && c.soldAt)
    │
    ├──► Monthly AP:
    │    thisMonthSold = soldLeads.filter(soldAt within current month)
    │    monthlyAP = sum(thisMonthSold.map(c => (c.premium || 0) * 12))
    │
    ├──► Weekly AP:
    │    thisWeekSold = soldLeads.filter(soldAt within current week, Mon-Sun)
    │    weeklyAP = sum(thisWeekSold.map(c => (c.premium || 0) * 12))
    │
    ├──► Today's AP:
    │    todaySold = soldLeads.filter(soldAt === today)
    │    todayAP = sum(todaySold.map(c => (c.premium || 0) * 12))
    │
    ├──► YTD AP:
    │    ytdSold = soldLeads.filter(soldAt within current year)
    │    ytdAP = sum(ytdSold.map(c => (c.premium || 0) * 12))
    │
    ├──► Policies written:
    │    thisMonthPolicies = thisMonthSold.length
    │    thisWeekPolicies = thisWeekSold.length
    │
    ├──► Close Rate:
    │    totalLeads = state.clients.length (include archived?)
    │    closeRate = (soldLeads.length / totalLeads * 100).toFixed(1) + '%'
    │
    ├──► Time to Close:
    │    avgDays = soldLeads.map(c => daysBetween(c.createdAt, c.soldAt))
    │    avgTimeToClose = average(avgDays)
    │
    ├──► Carrier Breakdown:
    │    grouped = groupBy(soldLeads, 'carrier')
    │    sorted by total AP descending
    │
    ├──► Lead Source ROI:
    │    grouped = groupBy(state.clients, 'leadSource' or 'ad_source')
    │    per source: { leads, sales, conversionRate, totalAP }
    │
    └──► Persistency:
         activePolicies = soldLeads.filter(c => c.policyStatus === 'active')
         persistencyRate = (activePolicies.length / soldLeads.length * 100)
```

### Flow E: Auto Follow-Up Scheduling

```
scheduleAutoFollowUp(clientId, disposition)
    │
    ├──► Calculate follow-up time:
    │    followUpTime = now + (disposition.autoFollowUp.hours * 3600 * 1000)
    │    OR if user provided custom dateTime → use that
    │
    ├──► Set on client:
    │    client.followUpDate = followUpTime.toISOString()
    │    client.nextFollowUp = followUpTime.toISOString()
    │
    ├──► Create calendar event:
    │    event = {
    │      id: generateId(),
    │      title: `Follow-up: ${client.name} — ${disposition.name}`,
    │      description: `Disposition: ${disposition.name}\nNotes: ${notes}\nPhone: ${client.phone}`,
    │      start: followUpTime,
    │      end: followUpTime + 30min,
    │      allDay: false,
    │      contactId: clientId,
    │      source: 'crm',
    │      type: 'follow_up',
    │      status: 'scheduled',
    │      alerts: disposition.hasReminder ? [{ minutes: 15 }] : state.calendar.settings.defaultAlerts,
    │      createdAt: now,
    │      dirty: true  // ← Triggers iCloud sync on next cycle
    │    }
    │
    ├──► state.calendar.events.push(event)
    │
    ├──► Log activity: "Follow-up scheduled for [datetime]"
    │
    └──► saveState()
         └──► Existing iCloud auto-sync picks up dirty event
              └──► syncICloud() pushes to iCloud CalDAV
```

### Flow F: 15-Second Polling Interaction

```
Existing polling (every 15 seconds):
    │
    ▼
loadLeadsFromCloud() — already implemented
    │
    ├──► Fetches all leads from D1 via API
    ├──► convertLeadFromCloud() — MODIFIED to include new fields:
    │    disposition, callAttempts, noShowCount, archived, archivedAt,
    │    archiveReason, isDNC, isBadNumber, replacementRequested,
    │    replacementDate, soldAt, policyStatus, effectiveDate, productType
    │
    ├──► Merges into state.clients
    │
    └──► Re-renders current view
         (Pipeline excludes archived/DNC leads automatically)
```

---

## 5. EVENT ARCHITECTURE

| Event | Trigger | Handler | Side Effects |
|---|---|---|---|
| Open Disposition Modal | Click "📋 Dispose" on kanban card OR lead detail header | `openDispositionModal(clientId)` | Renders modal, focuses first tile |
| Select Disposition | Click disposition tile in modal | `handleDispositionSelect(dispositionId)` | Highlights tile, conditionally shows date picker |
| Apply Disposition | Click "Apply Disposition" button | `applyDisposition(clientId, dispositionId, notes, extra)` | Stage change, activity log, flag updates, follow-up scheduling, cloud sync, toast notification |
| Cancel Disposition | Click "Cancel" button | `closeDispositionModal()` | Clears modal state, removes modal from DOM |
| Open Policy Form | Auto-triggered by "Sold" disposition | `openPolicySoldForm(clientId)` | Renders policy form modal with pre-filled data |
| Save Policy | Click "Save Policy & Close Sale" | `savePolicySoldForm()` | Writes policy data to client, logs activity, syncs to cloud, closes modal |
| Cancel Policy Form | Click "Cancel" | `closePolicySoldForm()` | **NOTE: Sale is already recorded. Policy form is optional data entry. Lead stays in Sold stage.** |
| Navigate to Archive | Click "Archive" in sidebar | `switchView('archive')` | Renders archive view, updates active nav item |
| Filter Archive | Change reason dropdown or search input | `setArchiveFilter(reason)` / `setArchiveSearch(query)` | Re-renders archive table with filtered results |
| Restore Lead | Click "♻️ Restore" on archived lead | `restoreLead(clientId)` | Confirmation dialog → unarchive, reset to new_lead, sync, re-render |
| Navigate to Scoreboard | Click "Scoreboard" in sidebar | `switchView('scoreboard')` | Calculates metrics, renders scoreboard |
| Update Goal | Click edit icon on monthly AP goal | `editScoreboardGoal()` | Shows inline input, saves to settings on blur/enter |
| Bad Number Flag | "Bad Number" disposition applied | `flagBadNumber(clientId)` | Card turns red, removed from call queue, stays in pipeline for review |
| DNC Flag | "Add to DNC" disposition applied | `flagDNC(clientId)` | Archived, removed from ALL queues permanently, confirmation dialog first |
| Replacement Request | "Request Replacement" disposition applied | `flagReplacementRequest(clientId)` | Tags lead source, shows replacement flag on card |
| Replacement Submitted | "Lead Replacement Submitted" disposition applied | `archiveLead(clientId, 'lead_replacement_submitted')` | Archives original, notes replacement date |
| Auto Follow-Up Created | Disposition with autoFollowUp applied | `scheduleAutoFollowUp(clientId, disposition)` | Calendar event created with dirty flag, iCloud syncs on next cycle |
| Follow-Up Due | Calendar event time reached (existing alert system) | Existing `scheduleEventAlerts()` | Browser notification if enabled |
| Call Attempt Logged | "Called" or "Follow-Up" disposition | `incrementCallAttempt(clientId)` | client.callAttempts++, badge updates on kanban card |
| Cloud Sync | saveState() triggers debounced sync | Existing `syncToCloud()` | New fields included in `convertLeadToCloud()` payload |

---

## 6. ERROR HANDLING

### Disposition Operations

| Operation | Failure Mode | User Sees | System Does |
|---|---|---|---|
| Apply disposition | Client not found in state | Toast: "Error: Lead not found" | Log error, close modal, no state change |
| Apply disposition | Cloud sync fails after local save | Toast: "Disposition saved locally — cloud sync pending" | Local state is saved, hasPendingSync = true, retries on next cycle |
| Apply disposition | Invalid disposition ID | Toast: "Unknown disposition" | Log error, no state change, modal stays open for retry |
| Stage transition | Target stage not in STAGES array | Toast: "Stage update failed" | Log warning, disposition still recorded (activity + flags), stage unchanged |
| Apply "Sold" | Policy form modal fails to render | Toast: "Could not open policy form" | Lead IS moved to Sold stage, activity IS logged. Policy form can be opened later from lead detail. |
| Apply "Add to DNC" | User accidentally clicks | **Confirmation dialog**: "⚠️ This will permanently flag [Name] as Do Not Call and archive them. This action is difficult to reverse. Continue?" | Only proceeds on explicit confirm. Cancel returns to disposition modal. |
| Apply "Bad Number" | None expected | N/A | Straightforward flag operation |

### Policy Form Operations

| Operation | Failure Mode | User Sees | System Does |
|---|---|---|---|
| Save policy | Premium field is 0 or empty | Inline validation: "Premium is required to calculate AP" | Prevents save, highlights field |
| Save policy | Carrier field empty | Inline validation: "Carrier is required" | Prevents save, highlights field |
| Save policy | Cloud sync fails | Toast: "Policy saved locally — sync pending" | Local save succeeds, sync retries |
| Pre-fill data | Client has no existing policy data | Empty form fields (no error) | All fields editable, nothing pre-filled = first-time entry |
| Cancel policy form | User clicks Cancel after Sold | Nothing (lead stays in Sold) | Lead is already in Sold stage from disposition. Policy form is additive data. No rollback needed. |

### Archive Operations

| Operation | Failure Mode | User Sees | System Does |
|---|---|---|---|
| Restore lead | Lead was DNC | Confirmation: "This lead was flagged DNC. Remove DNC flag and restore?" with [Yes, remove DNC] [No, keep DNC flag] [Cancel] | Three-way choice. "No, keep DNC" restores but keeps isDNC true. |
| Restore lead | Cloud sync fails | Toast: "Lead restored locally — sync pending" | Local restore succeeds, sync retries |
| Filter archive | No results match filter | "No archived leads match your filters" empty state | Clear message with "Clear Filters" button |
| Search archive | Invalid regex/special chars | Escapes input, treats as literal string | `escapeRegex()` wrapper on search term |

### Scoreboard Operations

| Operation | Failure Mode | User Sees | System Does |
|---|---|---|---|
| Calculate metrics | No sold leads exist | "No sales data yet" empty state with message: "Close your first deal and your scoreboard lights up!" | All metrics show 0, progress bars at 0% |
| Calculate AP | Client has no premium | Excluded from AP calculation (treated as $0) | `(client.premium \|\| 0) * 12` — never NaN |
| Goal update | Non-numeric input | Inline validation, keeps previous value | `parseFloat()` with fallback to current value |
| Time to close | Client missing createdAt or soldAt | Excluded from average | Filters out invalid dates before averaging |
| Carrier breakdown | Client has empty carrier | Grouped under "Unknown" | Carrier = client.carrier \|\| 'Unknown' |
| Lead source ROI | No ad_source data | "No lead source data available" section message | Hides ROI section entirely if no clients have leadSource |
| Persistency | No policy status data | Shows "N/A" instead of percentage | Requires policyStatus field populated |

### Calendar/Follow-Up Operations

| Operation | Failure Mode | User Sees | System Does |
|---|---|---|---|
| Schedule auto follow-up | Calendar not connected | Toast: "Follow-up scheduled — connect iCloud Calendar in Settings to sync" | Event created locally in state.calendar.events with dirty flag. Will sync when iCloud connected. |
| Schedule follow-up | Invalid date/time from picker | Inline validation: "Please select a valid date and time" | Prevents scheduling, highlights date/time fields |
| iCloud sync | CalDAV auth fails | Existing iCloud error handling (toast + status indicator) | Existing error flow. Events stay dirty, retry on next sync cycle. |
| iCloud sync | Event push rejected | Existing iCloud error handling | Dirty flag stays, retries next cycle |

---

## 7. NAMING CONVENTIONS

### Functions

| Pattern | Example | Usage |
|---|---|---|
| `render[View]()` | `renderArchiveView()`, `renderScoreboard()` | Functions that generate HTML and set innerHTML |
| `open[Modal]()` | `openDispositionModal(clientId)` | Functions that show a modal |
| `close[Modal]()` | `closeDispositionModal()` | Functions that hide a modal |
| `handle[Action]()` | `handleDispositionSelect(id)` | User interaction handlers |
| `apply[Noun]()` | `applyDisposition(clientId, id, notes)` | Functions that modify state based on user action |
| `save[Form]()` | `savePolicySoldForm()` | Form submission handlers |
| `calculate[Metric]()` | `calculateScoreboardMetrics()` | Pure computation functions |
| `flag[Condition]()` | `flagBadNumber(clientId)`, `flagDNC(clientId)` | Functions that set boolean flags |
| `schedule[Action]()` | `scheduleAutoFollowUp(clientId, disposition)` | Functions that create future events |
| `set[Filter]()` | `setArchiveFilter(reason)`, `setArchiveSearch(query)` | Filter/search state setters |
| `increment[Counter]()` | `incrementCallAttempt(clientId)` | Counter increment functions |

### CSS Classes

| Pattern | Example | Usage |
|---|---|---|
| `.disposition-*` | `.disposition-modal`, `.disposition-grid`, `.disposition-tile` | Disposition system UI |
| `.policy-sold-*` | `.policy-sold-modal`, `.policy-sold-field` | Policy sold form |
| `.archive-*` | `.archive-view`, `.archive-table`, `.archive-row`, `.archive-filter` | Archive view |
| `.scoreboard-*` | `.scoreboard-view`, `.scoreboard-card`, `.scoreboard-bar` | Scoreboard/BoB |
| `.flag-*` | `.flag-bad-number`, `.flag-dnc`, `.flag-replacement` | Visual flag indicators on cards |
| `.badge-*` | `.badge-calls`, `.badge-no-show` | Counter badges on kanban cards |

### State Fields (on client objects)

| Pattern | Example | Usage |
|---|---|---|
| `camelCase` | `callAttempts`, `noShowCount`, `soldAt` | All client state fields |
| `is[Boolean]` | `isDNC`, `isBadNumber` | Boolean flags |
| `[noun]At` | `soldAt`, `archivedAt` | Timestamp fields |
| `[noun]History` | `dispositionHistory` | Array of historical entries |

### D1 Column Names

| Pattern | Example | Usage |
|---|---|---|
| `snake_case` | `call_attempts`, `no_show_count`, `sold_at` | All D1 database columns |
| `is_[flag]` | `is_dnc`, `is_bad_number` | Boolean columns |
| `[noun]_at` | `sold_at`, `archived_at` | Timestamp columns |

---

## 8. D1 SCHEMA CHANGES

### New Columns on `leads` Table

```sql
-- Run these ALTER TABLE statements on D1
-- Database ID: b2ae86e6-cc42-431a-80f9-f17e82379119

ALTER TABLE leads ADD COLUMN disposition TEXT DEFAULT NULL;
-- Current disposition ID (e.g., 'called', 'sold', 'nurture')

ALTER TABLE leads ADD COLUMN disposition_history TEXT DEFAULT '[]';
-- JSON array of { disposition, timestamp, notes, agent }

ALTER TABLE leads ADD COLUMN call_attempts INTEGER DEFAULT 0;
-- Number of call attempts (incremented by 'called' and 'follow_up' dispositions)

ALTER TABLE leads ADD COLUMN no_show_count INTEGER DEFAULT 0;
-- Number of appointment no-shows

ALTER TABLE leads ADD COLUMN archived INTEGER DEFAULT 0;
-- 0 = active, 1 = archived (SQLite doesn't have BOOLEAN)

ALTER TABLE leads ADD COLUMN archived_at TEXT DEFAULT NULL;
-- ISO timestamp when archived

ALTER TABLE leads ADD COLUMN archive_reason TEXT DEFAULT NULL;
-- 'not_interested' | 'bad_number' | 'dnc' | 'lead_replacement_submitted'

ALTER TABLE leads ADD COLUMN is_dnc INTEGER DEFAULT 0;
-- 0 = normal, 1 = Do Not Call

ALTER TABLE leads ADD COLUMN is_bad_number INTEGER DEFAULT 0;
-- 0 = normal, 1 = bad number flagged

ALTER TABLE leads ADD COLUMN replacement_requested INTEGER DEFAULT 0;
-- 0 = no, 1 = replacement requested

ALTER TABLE leads ADD COLUMN replacement_date TEXT DEFAULT NULL;
-- ISO timestamp when replacement was submitted

ALTER TABLE leads ADD COLUMN sold_at TEXT DEFAULT NULL;
-- ISO timestamp when disposition = sold

ALTER TABLE leads ADD COLUMN policy_status TEXT DEFAULT NULL;
-- 'active' | 'lapsed' | 'cancelled' | 'pending'

ALTER TABLE leads ADD COLUMN effective_date TEXT DEFAULT NULL;
-- Policy effective date

ALTER TABLE leads ADD COLUMN product_type TEXT DEFAULT NULL;
-- 'FEX' | 'WHOLE' | 'TERM' | 'IUL' | 'ANNUITY' | etc.
```

**Total: 15 new columns on existing `leads` table.**

### New Table: `disposition_log`

```sql
CREATE TABLE IF NOT EXISTS disposition_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  disposition TEXT NOT NULL,
  previous_stage TEXT,
  new_stage TEXT,
  notes TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_disposition_log_lead ON disposition_log(lead_id);
CREATE INDEX idx_disposition_log_agent ON disposition_log(agent_id);
CREATE INDEX idx_disposition_log_disposition ON disposition_log(disposition);
CREATE INDEX idx_disposition_log_created ON disposition_log(created_at);
```

This table provides a normalized, queryable history of all dispositions across all leads and agents. While `disposition_history` JSON on the lead record provides quick client-side access, the `disposition_log` table enables:
- Server-side production reporting (without parsing JSON)
- Cross-lead analytics (e.g., "how many leads were dispositioned as Sold this month?")
- Agent performance tracking
- Audit trail

### New Table: `production_goals`

```sql
CREATE TABLE IF NOT EXISTS production_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  goal_type TEXT NOT NULL,        -- 'monthly_ap' | 'weekly_ap' | 'monthly_policies'
  target_value REAL NOT NULL,     -- e.g., 15000 for $15K/month
  period TEXT NOT NULL,           -- '2026-02' for monthly, '2026-W08' for weekly
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_goals_agent_period ON production_goals(agent_id, period);
```

---

## 9. WORKER API CHANGES

### Modified Endpoints

#### `GET /leads` — Include new columns in response

```javascript
// In the SELECT query, add all new columns
const leads = await env.DB.prepare(`
  SELECT id, agent_id, name, phone, email, stage, pipeline, lead_type, state, tags,
    created_at, updated_at, dob, face_amount, beneficiary, beneficiary_relation,
    age, gender, premium, carrier, policy_number, draft_date, payment_method,
    bank_name, notes, last_contact, next_followup, custom_fields, ad_source,
    platform, health_history, has_life_insurance, favorite_hobby,
    /* NEW COLUMNS */
    disposition, disposition_history, call_attempts, no_show_count,
    archived, archived_at, archive_reason, is_dnc, is_bad_number,
    replacement_requested, replacement_date, sold_at, policy_status,
    effective_date, product_type
  FROM leads WHERE agent_id = ?
`).bind(agentId).all();
```

**IMPORTANT:** Active pipeline views should filter: `AND (archived = 0 OR archived IS NULL)`

#### `PUT /leads/:id` — Accept new columns

Add all new column names to the allowed fields list in the update handler.

#### `POST /leads` — Accept new columns on creation

Add defaults for new columns.

#### `POST /sync` — Handle new columns in bulk sync

Extend the sync handler to accept and write all new columns.

### New Endpoints

#### `GET /leads/archived` — Fetch archived leads only

```javascript
// New endpoint for archive view
// GET /leads/archived?reason=dnc&search=smith
router.get('/leads/archived', authenticate, async (req, env) => {
  const agentId = req.user.id;
  let query = 'SELECT * FROM leads WHERE agent_id = ? AND archived = 1';
  const params = [agentId];

  if (req.query.reason && req.query.reason !== 'all') {
    query += ' AND archive_reason = ?';
    params.push(req.query.reason);
  }

  if (req.query.search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    const search = `%${req.query.search}%`;
    params.push(search, search, search);
  }

  query += ' ORDER BY archived_at DESC';

  const results = await env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ leads: results.results });
});
```

#### `POST /leads/:id/restore` — Restore archived lead

```javascript
router.post('/leads/:id/restore', authenticate, async (req, env) => {
  const { removeDNC } = await req.json();
  const updates = {
    archived: 0,
    archived_at: null,
    archive_reason: null,
    stage: 'new_lead',
  };
  if (removeDNC) {
    updates.is_dnc = 0;
  }

  // Build SET clause dynamically
  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);

  await env.DB.prepare(
    `UPDATE leads SET ${setClauses}, updated_at = datetime('now') WHERE id = ? AND agent_id = ?`
  ).bind(...values, req.params.id, req.user.id).run();

  return jsonResponse({ success: true });
});
```

#### `GET /production/stats` — Aggregate production data

```javascript
router.get('/production/stats', authenticate, async (req, env) => {
  const agentId = req.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekStart = getWeekStart(now).toISOString(); // Monday of current week
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  // Monthly stats
  const monthlyStats = await env.DB.prepare(`
    SELECT
      COUNT(*) as policies_written,
      COALESCE(SUM(premium * 12), 0) as total_ap,
      AVG(JULIANDAY(sold_at) - JULIANDAY(created_at)) as avg_days_to_close
    FROM leads
    WHERE agent_id = ? AND stage = 'sold' AND sold_at >= ?
  `).bind(agentId, monthStart).first();

  // Weekly stats
  const weeklyStats = await env.DB.prepare(`
    SELECT COUNT(*) as policies_written, COALESCE(SUM(premium * 12), 0) as total_ap
    FROM leads WHERE agent_id = ? AND stage = 'sold' AND sold_at >= ?
  `).bind(agentId, weekStart).first();

  // Today stats
  const todayStats = await env.DB.prepare(`
    SELECT COUNT(*) as policies_written, COALESCE(SUM(premium * 12), 0) as total_ap
    FROM leads WHERE agent_id = ? AND stage = 'sold' AND sold_at >= ?
  `).bind(agentId, todayStart).first();

  // YTD stats
  const ytdStats = await env.DB.prepare(`
    SELECT COUNT(*) as policies_written, COALESCE(SUM(premium * 12), 0) as total_ap
    FROM leads WHERE agent_id = ? AND stage = 'sold' AND sold_at >= ?
  `).bind(agentId, yearStart).first();

  // Close rate
  const totalLeads = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM leads WHERE agent_id = ?
  `).bind(agentId).first();

  const soldCount = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM leads WHERE agent_id = ? AND stage = 'sold'
  `).bind(agentId).first();

  // Carrier breakdown
  const carrierBreakdown = await env.DB.prepare(`
    SELECT carrier, COUNT(*) as policies, COALESCE(SUM(premium * 12), 0) as total_ap
    FROM leads WHERE agent_id = ? AND stage = 'sold' AND carrier IS NOT NULL AND carrier != ''
    GROUP BY carrier ORDER BY total_ap DESC
  `).bind(agentId).all();

  // Lead source ROI
  const leadSourceROI = await env.DB.prepare(`
    SELECT
      COALESCE(ad_source, 'Unknown') as source,
      COUNT(*) as total_leads,
      SUM(CASE WHEN stage = 'sold' THEN 1 ELSE 0 END) as sales,
      COALESCE(SUM(CASE WHEN stage = 'sold' THEN premium * 12 ELSE 0 END), 0) as total_ap
    FROM leads WHERE agent_id = ?
    GROUP BY COALESCE(ad_source, 'Unknown')
    ORDER BY total_ap DESC
  `).bind(agentId).all();

  // Persistency
  const persistency = await env.DB.prepare(`
    SELECT
      COUNT(*) as total_sold,
      SUM(CASE WHEN policy_status = 'active' THEN 1 ELSE 0 END) as active_policies
    FROM leads WHERE agent_id = ? AND stage = 'sold'
  `).bind(agentId).first();

  // Goals
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const goals = await env.DB.prepare(`
    SELECT * FROM production_goals WHERE agent_id = ? AND period = ?
  `).bind(agentId, currentMonth).all();

  return jsonResponse({
    monthly: monthlyStats,
    weekly: weeklyStats,
    today: todayStats,
    ytd: ytdStats,
    closeRate: {
      total: totalLeads.count,
      sold: soldCount.count,
      rate: totalLeads.count > 0 ? (soldCount.count / totalLeads.count * 100).toFixed(1) : '0.0'
    },
    carrierBreakdown: carrierBreakdown.results,
    leadSourceROI: leadSourceROI.results,
    persistency: {
      totalSold: persistency.total_sold,
      activePolicies: persistency.active_policies,
      rate: persistency.total_sold > 0
        ? (persistency.active_policies / persistency.total_sold * 100).toFixed(1)
        : '0.0'
    },
    goals: goals.results
  });
});
```

#### `POST /production/goals` — Set/update goals

```javascript
router.post('/production/goals', authenticate, async (req, env) => {
  const { goalType, targetValue, period } = await req.json();
  const agentId = req.user.id;

  // Upsert: update if exists, insert if not
  const existing = await env.DB.prepare(`
    SELECT id FROM production_goals WHERE agent_id = ? AND goal_type = ? AND period = ?
  `).bind(agentId, goalType, period).first();

  if (existing) {
    await env.DB.prepare(`
      UPDATE production_goals SET target_value = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(targetValue, existing.id).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO production_goals (agent_id, goal_type, target_value, period)
      VALUES (?, ?, ?, ?)
    `).bind(agentId, goalType, targetValue, period).run();
  }

  return jsonResponse({ success: true });
});
```

#### `POST /leads/:id/disposition` — Record disposition with server-side logging

```javascript
router.post('/leads/:id/disposition', authenticate, async (req, env) => {
  const { disposition, notes, metadata } = await req.json();
  const agentId = req.user.id;
  const leadId = req.params.id;

  // Get current lead state for previous_stage
  const lead = await env.DB.prepare(
    'SELECT stage FROM leads WHERE id = ? AND agent_id = ?'
  ).bind(leadId, agentId).first();

  if (!lead) return jsonResponse({ error: 'Lead not found' }, 404);

  // Insert into disposition_log
  await env.DB.prepare(`
    INSERT INTO disposition_log (lead_id, agent_id, disposition, previous_stage, new_stage, notes, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    leadId, agentId, disposition,
    lead.stage,
    metadata?.newStage || lead.stage,
    notes || '',
    JSON.stringify(metadata || {})
  ).run();

  return jsonResponse({ success: true });
});
```

---

## 10. BUILD SEQUENCE

Mason should execute in this exact order. Each step must be verified before proceeding.

### Phase 1: Database Schema (Day 1)

**Step 1.1:** Run ALTER TABLE statements on D1 to add all 15 new columns to `leads` table.

**Step 1.2:** Create `disposition_log` table with indexes.

**Step 1.3:** Create `production_goals` table with index.

**Step 1.4:** Verify all columns exist:
```sql
PRAGMA table_info(leads);
PRAGMA table_info(disposition_log);
PRAGMA table_info(production_goals);
```

### Phase 2: Worker API Updates (Day 1-2)

**Step 2.1:** Update `GET /leads` to include all new columns in SELECT.

**Step 2.2:** Update `PUT /leads/:id` to accept all new columns.

**Step 2.3:** Update `POST /leads` to accept all new columns with defaults.

**Step 2.4:** Update `POST /sync` to handle new columns in bulk sync payload.

**Step 2.5:** Add `GET /leads/archived` endpoint.

**Step 2.6:** Add `POST /leads/:id/restore` endpoint.

**Step 2.7:** Add `POST /leads/:id/disposition` endpoint.

**Step 2.8:** Add `GET /production/stats` endpoint.

**Step 2.9:** Add `POST /production/goals` endpoint.

**Step 2.10:** Test all endpoints via curl. Verify responses match expected schema.

### Phase 3: Frontend Constants & State (Day 2)

**Step 3.1:** Add DISPOSITIONS array constant after STAGES in index.html.

**Step 3.2:** Add FOLLOWUP_DEFAULTS constant.

**Step 3.3:** Add ARCHIVE_REASONS constant.

**Step 3.4:** Extend state object with new fields.

**Step 3.5:** Update `convertLeadFromCloud()` to map all new D1 columns to local fields.

**Step 3.6:** Update `convertLeadToCloud()` to include all new fields in sync payload.

**Step 3.7:** Update `migrateState()` to add defaults for existing leads missing new fields.

**Step 3.8:** Verify: load CRM, check console for no errors, existing functionality unbroken.

### Phase 4: Disposition Modal (Day 2-3)

**Step 4.1:** Add CSS for disposition modal, tiles, date picker.

**Step 4.2:** Add HTML shell for disposition modal (hidden by default).

**Step 4.3:** Implement `openDispositionModal(clientId)`.

**Step 4.4:** Implement `renderDispositionModal(clientId)` — 13-tile grid with icons and descriptions.

**Step 4.5:** Implement `handleDispositionSelect(dispositionId)` — highlight, conditional date picker.

**Step 4.6:** Implement `renderFollowUpPicker(clientId, disposition)` — inline date/time picker.

**Step 4.7:** Implement core `applyDisposition()` function with all 13 disposition behaviors.

**Step 4.8:** Implement `closeDispositionModal()`.

**Step 4.9:** Add "📋 Dispose" button to kanban cards in `renderPipeline()`.

**Step 4.10:** Test each of the 13 dispositions manually. Verify stage changes, flags, and activity logging.

### Phase 5: Policy Sold Form (Day 3)

**Step 5.1:** Add CSS for policy sold form modal.

**Step 5.2:** Add HTML shell for policy sold form modal.

**Step 5.3:** Implement `openPolicySoldForm(clientId)` with pre-fill logic.

**Step 5.4:** Implement `renderPolicySoldForm(clientId)` — all fields, AP calculator.

**Step 5.5:** Implement `savePolicySoldForm()` — validation + save + sync.

**Step 5.6:** Implement live AP calculation: `premium × 12` updates as user types.

**Step 5.7:** Wire "Sold" disposition to auto-open policy form after stage move.

**Step 5.8:** Test: Apply "Sold" disposition → verify form opens → fill fields → save → verify data persists.

### Phase 6: Activity & Card Enhancements (Day 3-4)

**Step 6.1:** Implement `addActivityEntry()` — formats disposition entries for Activity tab.

**Step 6.2:** Implement `incrementCallAttempt(clientId)`.

**Step 6.3:** Modify `renderKanbanCard()`:
- Add call attempt badge (e.g., "📞 3" for 3 attempts)
- Add last contact date indicator
- Add red border/flag for bad number cards
- Add DNC indicator for DNC-flagged cards still visible
- Add replacement flag icon

**Step 6.4:** Modify Activity tab in lead detail to show disposition-specific entries.

**Step 6.5:** Modify Pipeline render to exclude archived leads: `filter(c => !c.archived)`.

**Step 6.6:** Test: Apply several dispositions, verify cards update, activity tab shows history.

### Phase 7: Auto Follow-Up Scheduling (Day 4)

**Step 7.1:** Implement `scheduleAutoFollowUp(clientId, disposition)`.

**Step 7.2:** Wire it into `applyDisposition()` for: Called (2hr), No Show (24hr), Pitched Not Sold (48hr), Nurture (7 days).

**Step 7.3:** Wire Follow-Up and Appointment Booked to use user-selected date/time.

**Step 7.4:** Ensure events get `dirty: true` flag for iCloud sync.

**Step 7.5:** Test: Apply "Called" disposition → verify calendar event created → verify iCloud sync picks it up (if connected).

### Phase 8: Archive View (Day 4-5)

**Step 8.1:** Add "📦 Archive" nav item to sidebar.

**Step 8.2:** Add CSS for archive view.

**Step 8.3:** Implement `renderArchiveView()` — table with filters.

**Step 8.4:** Implement `setArchiveFilter(reason)` and `setArchiveSearch(query)`.

**Step 8.5:** Implement `restoreLead(clientId)` with DNC confirmation dialog.

**Step 8.6:** Wire sidebar nav to switch to archive view.

**Step 8.7:** Add badge count to Archive nav item (number of archived leads).

**Step 8.8:** Test: Archive leads via dispositions → navigate to Archive → filter → search → restore.

### Phase 9: Scoreboard / Book of Business (Day 5-6)

**Step 9.1:** Add "📊 Scoreboard" nav item to sidebar.

**Step 9.2:** Add CSS for scoreboard — cards, progress bars, charts.

**Step 9.3:** Implement `calculateScoreboardMetrics()`.

**Step 9.4:** Implement `renderScoreboardCards()` — hero metrics row (Monthly AP, Weekly AP, Today's AP, YTD AP).

**Step 9.5:** Implement AP goal progress bar with edit functionality.

**Step 9.6:** Implement `renderCarrierBreakdown()` — horizontal bar chart.

**Step 9.7:** Implement `renderLeadSourceROI()` — table with conversion rates.

**Step 9.8:** Implement persistency tracker.

**Step 9.9:** Implement recent sales list (last 10 sold leads).

**Step 9.10:** Implement `calculateAP(client)` utility function.

**Step 9.11:** Implement time-to-close metric.

**Step 9.12:** Wire sidebar nav to switch to scoreboard view.

**Step 9.13:** Test with real Sold leads: verify all metrics calculate correctly, goal progress bar works.

### Phase 10: Integration Testing & Polish (Day 6-7)

**Step 10.1:** Full flow test: New Lead → Called → Follow-Up → Appointment Booked → Sold → Policy Form → verify scoreboard updates.

**Step 10.2:** Full flow test: New Lead → Bad Number → verify card styling → Bad Number visible in archive.

**Step 10.3:** Full flow test: New Lead → DNC → verify confirmation → verify archived → verify cannot reach from pipeline.

**Step 10.4:** Full flow test: Restore from archive → verify back in pipeline → verify new_lead stage.

**Step 10.5:** Verify 15s polling doesn't break any new state.

**Step 10.6:** Verify cloud sync includes all new fields (check D1 directly).

**Step 10.7:** Verify no console errors in any view.

**Step 10.8:** Verify modal dismiss rules: only close via Cancel/Save/explicit buttons, NOT backdrop click.

**Step 10.9:** Verify phone number styling in archive view: amber (#f59e0b), bold, 12px.

**Step 10.10:** Verify AP calculation: premium × 12 everywhere.

---

## 11. ACCEPTANCE CRITERIA

### Disposition System ✓/✗

- [ ] "📋 Dispose" button visible on every kanban card
- [ ] Clicking Dispose opens modal with client info header and 13 disposition tiles
- [ ] Each disposition tile shows icon, name, and brief description
- [ ] Selecting a tile highlights it; only one can be selected
- [ ] "Follow-Up" and "Appointment Booked" show inline date/time picker
- [ ] "Appointment Booked" date picker includes reminder dropdown
- [ ] Clicking "Apply Disposition" executes all documented side effects
- [ ] "New Lead" resets lead to new_lead stage
- [ ] "Called" moves to contact stage, increments call attempts, schedules 2hr follow-up
- [ ] "Follow-Up" creates calendar event at selected date/time, stays in current stage
- [ ] "Appointment Booked" moves to qualified, creates calendar event with reminder
- [ ] "Appointment - No Show" stays in qualified, schedules 24hr retry, increments no-show count
- [ ] "Pitched - Not Sold" moves to application stage, schedules 48hr follow-up
- [ ] "Sold" moves to sold stage, opens policy form
- [ ] "Not Interested" archives lead with timestamp
- [ ] "Bad Number" flags card red, stays visible in pipeline
- [ ] "Nurture" moves to contact, schedules 7-day follow-up
- [ ] "Request Replacement" flags for replacement, tags lead source
- [ ] "Lead Replacement Submitted" archives original, notes date
- [ ] "Add to DNC" shows confirmation, then archives + flags DNC permanently
- [ ] Disposition modal only closes via Cancel or Apply buttons (NOT backdrop click)
- [ ] Every disposition logs to lead's activity tab

### Policy Sold Form ✓/✗

- [ ] Auto-opens when "Sold" disposition is applied
- [ ] Pre-fills all existing policy data (carrier, premium, face amount, policy #, etc.)
- [ ] Pre-fills beneficiary data
- [ ] Empty fields are editable and clearly indicated
- [ ] Live AP calculation shows as user types premium
- [ ] Required field validation (carrier, premium minimum)
- [ ] Save writes to lead record AND syncs to cloud
- [ ] Cancel does NOT undo the Sold disposition (lead stays in Sold stage)
- [ ] No double-entry: data entered here updates the same fields as the Policy tab

### Archive View ✓/✗

- [ ] Accessible via sidebar "📦 Archive" nav item
- [ ] Badge count shows number of archived leads
- [ ] Table shows: Name, Phone, Reason, Archived Date, Original Stage, Lead Source, Actions
- [ ] Phone numbers styled: amber (#f59e0b), bold, 12px
- [ ] Filterable by disposition reason (Not Interested, Bad Number, DNC, Lead Replacement)
- [ ] Searchable by name, phone, email
- [ ] "Restore" button on each row
- [ ] Restoring DNC lead shows three-way confirmation dialog
- [ ] Restored lead returns to new_lead stage
- [ ] Empty state shows helpful message when no archived leads

### Scoreboard / Book of Business ✓/✗

- [ ] Accessible via sidebar "📊 Scoreboard" nav item
- [ ] Monthly AP with progress bar toward goal (default $15,000)
- [ ] Weekly AP displayed
- [ ] Today's AP displayed
- [ ] YTD AP displayed
- [ ] Policies written this month and this week
- [ ] Close rate: Won / total leads as percentage
- [ ] Goal setting: click to edit monthly AP target, persists
- [ ] Carrier breakdown: sorted bar chart by AP
- [ ] Lead source ROI: table with source, leads, sales, conversion %, AP
- [ ] Persistency tracking: active vs. total, with rate
- [ ] Time-to-close: average days from New Lead → Sold
- [ ] AP = monthly premium × 12 everywhere
- [ ] Empty state when no sold leads (motivational message)
- [ ] All numbers are real data, never mock

### Activity Logging ✓/✗

- [ ] Every disposition auto-logs to lead's Activity tab
- [ ] Activity entry format: timestamp + disposition icon + name + notes
- [ ] Call attempt counter visible on kanban cards
- [ ] Last contact date auto-updates on contact-related dispositions
- [ ] Activity entries show in chronological order (newest first)

### Auto Follow-Up Scheduling ✓/✗

- [ ] Called → auto-schedules follow-up 2 hours out
- [ ] Appointment - No Show → auto-schedules retry 24 hours out
- [ ] Pitched - Not Sold → auto-schedules follow-up 48 hours out
- [ ] Nurture → auto-schedules follow-up 7 days out
- [ ] Follow-Up → uses user-selected date/time
- [ ] Appointment Booked → uses user-selected date/time with reminder
- [ ] Events appear in Calendar view
- [ ] Events have dirty flag set for iCloud sync
- [ ] Connected iCloud syncs events on next cycle
- [ ] Disconnected iCloud: events stored locally, toast suggests connecting

---

## 12. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| D1 ALTER TABLE fails on production data | Low | High | Test on a throwaway D1 database first. ALTERs on SQLite are additive and safe (adding columns doesn't touch existing data). |
| Existing leads break with new fields | Medium | High | `convertLeadFromCloud()` uses `\|\|` defaults for every new field. Migration function backfills empty values. |
| Cloud sync payload too large with new fields | Low | Medium | New fields are small (strings, integers). Test with 500+ leads to verify. |
| Policy form pre-fill misses data | Low | Low | Graceful empty field handling. User can fill anything manually. |
| Scoreboard metrics slow with many leads | Low | Medium | D1 queries use indexes. For <10K leads (current scale), this is trivial. Add LIMIT + date range filters for future scale. |
| DNC flag circumvented | Low | High | DNC flag checked in BOTH pipeline render AND sync. Server-side endpoint validates DNC on restore. |
| 15-second polling overwrites local disposition | Medium | High | **Critical**: `syncToCloud()` is called immediately after any disposition. The polling cycle re-fetches from cloud, which should now reflect the disposition. If polling arrives BEFORE cloud sync completes, use a `dirty` flag on the client to prevent overwrite. Add to `convertLeadFromCloud()`: if local lead has `dirty: true`, skip cloud overwrite until sync confirms. |
| Calendar event duplicates | Low | Medium | Use existing `dirty` flag mechanism. Events get unique IDs. Existing dedup logic in `mergeICloudEvents()` applies. |
| User applies wrong disposition | Medium | Low | Every disposition is reversible except DNC (which requires confirmation). Re-disposing a lead overwrites the previous disposition and updates the history. |
| Modal dismiss on backdrop click | Low | Medium | Explicit enforcement: disposition modal, policy form, and follow-up picker all use `onclick` stopPropagation on backdrop, NOT close handler. Only Cancel/Save buttons close. |
| Breaking existing CRM functionality | Medium | High | All changes are additive. No existing functions are modified in-place — only extended. `renderPipeline()` gets an additional filter line. `convertLeadFromCloud()/ToCloud()` get additional fields. Sentinel reviews every modification point. |

---

## STAGE MAPPING REFERENCE

The existing CRM uses these stages in D1 and the monolith:

| Existing Stage ID | Existing Name | Disposition(s) That Target It |
|---|---|---|
| `new_lead` | New Lead | New Lead, (Restored leads) |
| `contact` | Contact | Called, Nurture |
| `engaged` | Engaged Interest | (none directly — may need "contacted" alias) |
| `qualified` | Qualified Interest | Appointment Booked, Appointment No Show (stays) |
| `application` | Application Process | Pitched - Not Sold (maps to Proposal) |
| `sold` | Sold | Sold |

**NOTE FOR MASON:** The prompt says "Contacted" and "Proposal" stages but D1 has `contact` and `application`. Map accordingly:
- "Move to Contacted" → `stage = 'contact'`
- "Move to Qualified" → `stage = 'qualified'`
- "Move to Proposal" → `stage = 'application'`
- "Move to Won" → `stage = 'sold'`

**IMPORTANT:** The existing monolith has 6 stages: new_lead, contact, engaged, qualified, application, sold. There is NO separate "lost" stage. Archived leads are identified by the `archived` flag, not by stage. DNC leads similarly use the `is_dnc` flag. This avoids adding pipeline stages.

---

## DISPOSITION MODAL UI SPEC

The modal should be visually striking — this is the agent's main workflow tool.

```
┌────────────────────────────────────────────────────┐
│ 📋 Dispose Lead                              [✕]  │
├────────────────────────────────────────────────────┤
│ 👤 John Smith • 📞 1-555-123-4567 • FEX          │
│    Current: Contact • 📞 3 calls • Last: 2hr ago   │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 🆕       │ │ 📞       │ │ 📅       │           │
│  │ New Lead │ │ Called   │ │ Follow-Up│           │
│  └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 📋       │ │ 👻       │ │ 🎯       │           │
│  │ Appt     │ │ No Show  │ │ Pitched  │           │
│  │ Booked   │ │          │ │ Not Sold │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 🎉       │ │ 🚫       │ │ 📵       │           │
│  │ Sold     │ │ Not      │ │ Bad      │           │
│  │          │ │ Interest │ │ Number   │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 🌱       │ │ 🔄       │ │ ✅       │           │
│  │ Nurture  │ │ Request  │ │ Replace  │           │
│  │          │ │ Replace  │ │ Submitted│           │
│  └──────────┘ └──────────┘ └──────────┘           │
│        ┌──────────┐                                 │
│        │ 🛑       │                                 │
│        │ Add to   │                                 │
│        │ DNC      │                                 │
│        └──────────┘                                 │
│                                                     │
│  [Conditional: Date/Time Picker appears here]       │
│                                                     │
│  📝 Notes (optional):                               │
│  ┌──────────────────────────────────────────────┐  │
│  │                                               │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  [Cancel]                    [Apply Disposition]    │
└────────────────────────────────────────────────────┘
```

**Tile Styling:**
- 3-column grid (4 rows + 1 centered row for DNC)
- Each tile: 100px × 80px, rounded corners, subtle border
- Background: disposition's color at 10% opacity
- Hover: color at 20% opacity, slight lift
- Selected: full color border, checkmark in corner, color at 15% opacity
- DNC tile: red border, centered in last row for visual distinction (danger action)

---

## SCOREBOARD UI SPEC

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Book of Business                    February 2026   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Monthly  │  │ Weekly   │  │ Today's  │  │ YTD    │ │
│  │ $8,400   │  │ $2,100   │  │ $0       │  │ $14,700│ │
│  │ AP       │  │ AP       │  │ AP       │  │ AP     │ │
│  │ ████████░│  │          │  │          │  │        │ │
│  │ 56% goal │  │          │  │          │  │        │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Policies │  │ Close    │  │ Avg Days │  │ Goal   │ │
│  │ 7 / 2    │  │ Rate     │  │ to Close │  │ $15K/mo│ │
│  │ mo / wk  │  │ 12.3%    │  │ 8.2 days │  │ [edit] │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│                                                          │
│  📊 Carrier Breakdown                                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Mutual of Omaha  ████████████████  4 | $4,800   │   │
│  │ Americo           ████████████      3 | $3,600   │   │
│  │ AIG               ████              1 | $1,200   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  📈 Lead Source ROI                                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Source    │ Leads │ Sales │ Conv% │ AP           │   │
│  │ Facebook  │ 45    │ 5     │ 11.1% │ $6,000       │   │
│  │ LeadChamp │ 20    │ 3     │ 15.0% │ $3,600       │   │
│  │ Referral  │ 8     │ 2     │ 25.0% │ $2,400       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  🔒 Persistency: 85.7% (6/7 active)                    │
│                                                          │
│  📜 Recent Sales                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ John Smith  │ Mutual │ $50K │ $100/mo │ $1,200  │   │
│  │ Jane Doe    │ Americo│ $25K │ $75/mo  │ $900    │   │
│  │ ...                                               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## convertLeadFromCloud() ADDITIONS

```javascript
// ADD these mappings inside convertLeadFromCloud():
disposition: cloudLead.disposition || null,
dispositionHistory: parseSafe(cloudLead.disposition_history, []),
callAttempts: cloudLead.call_attempts || 0,
noShowCount: cloudLead.no_show_count || 0,
archived: cloudLead.archived === 1,
archivedAt: cloudLead.archived_at || null,
archiveReason: cloudLead.archive_reason || null,
isDNC: cloudLead.is_dnc === 1,
isBadNumber: cloudLead.is_bad_number === 1,
replacementRequested: cloudLead.replacement_requested === 1,
replacementDate: cloudLead.replacement_date || null,
soldAt: cloudLead.sold_at || null,
policyStatus: cloudLead.policy_status || null,
effectiveDate: cloudLead.effective_date || null,
productType: cloudLead.product_type || null,
```

## convertLeadToCloud() ADDITIONS

```javascript
// ADD these mappings inside convertLeadToCloud():
disposition: localLead.disposition || null,
disposition_history: localLead.dispositionHistory || [],
call_attempts: localLead.callAttempts || 0,
no_show_count: localLead.noShowCount || 0,
archived: localLead.archived ? 1 : 0,
archived_at: localLead.archivedAt || null,
archive_reason: localLead.archiveReason || null,
is_dnc: localLead.isDNC ? 1 : 0,
is_bad_number: localLead.isBadNumber ? 1 : 0,
replacement_requested: localLead.replacementRequested ? 1 : 0,
replacement_date: localLead.replacementDate || null,
sold_at: localLead.soldAt || null,
policy_status: localLead.policyStatus || null,
effective_date: localLead.effectiveDate || null,
product_type: localLead.productType || null,
```

---

## POLL CONFLICT PREVENTION

**Critical design decision:** The 15-second polling cycle fetches all leads from D1. If a user applies a disposition locally and the cloud sync hasn't completed before the next poll, the poll could overwrite local changes.

**Solution: Dirty Lead Tracking**

```javascript
// Add to state:
let dirtyLeadIds = new Set();

// In applyDisposition(), add:
dirtyLeadIds.add(clientId);

// In syncToCloud() success callback, add:
dirtyLeadIds.clear();

// In loadLeadsFromCloud() / convertLeadFromCloud(), add:
function mergeCloudLeads(cloudLeads) {
  cloudLeads.forEach(cloudLead => {
    const local = state.clients.find(c => c.id === cloudLead.id);
    if (local && dirtyLeadIds.has(cloudLead.id)) {
      // Local has unsaved changes — skip cloud overwrite for this lead
      console.log(`Skipping cloud overwrite for dirty lead: ${cloudLead.id}`);
      return;
    }
    // Normal merge logic...
  });
}
```

This ensures the user's disposition is never lost due to a race condition with polling.

---

## END OF BLUEPRINT

**Next steps:**
1. Boss reviews and approves this blueprint
2. Mason executes Phase 1-10 in order
3. Sentinel inspects each phase against acceptance criteria
4. Deploy after full integration test pass

---

*Prepared by Soren (FF-PLN-001) — "Plan the work, then work the plan."*
