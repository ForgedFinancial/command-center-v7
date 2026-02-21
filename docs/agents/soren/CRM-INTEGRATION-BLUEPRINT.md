# CRM Integration Blueprint: YN-CRM → Forged-OS Command Center
## Architect: FF-PLN-001 | Date: 2026-02-17
## Status: READY FOR BOSS APPROVAL → Mason Execution

---

## BOTTOM LINE

Rebuild all YN-CRM functionality as React components inside the existing Forged-OS architecture. Add a "CRM" top-level tab to the Command Center with 5 sub-views (Dashboard, Pipeline/Kanban, Contacts, Calendar, Settings). This is Boss's personal CRM — single-user, no multi-agent login needed. Connect to the same D1 backend API. Add a Clawd-accessible appointment booking API endpoint.

**Scope:** ~45 new React components, 1 new Context, 1 new API client, 1 new Worker endpoint for Clawd booking.  
**Estimated build:** 3-4 focused sessions for Mason.

---

## 1. WHAT EXISTS TODAY

### YN-CRM (index.html — 11,221 lines)
A single-file HTML/CSS/JS monolith with:

| View | Lines (approx) | Key Functions |
|------|----------------|---------------|
| **Dashboard** | ~400 | `renderDashboard()` — KPI cards (total leads, pipeline value, conversion rate, avg days to close), stage distribution chart, trend indicators, time range filter (7d/30d/90d/all), pipeline mode toggle (new/aged) |
| **Kanban (Pipeline)** | ~700 | `renderKanban()`, `renderCard()` — 6 stages (New Lead → Sold), drag-and-drop between stages, card preview with configurable fields, bulk selection/actions, pipeline mode toggle |
| **Contacts (Table)** | ~500 | `renderContacts()` — Sortable table, pagination (20/page), inline search, column sorting, click-to-edit |
| **Calendar** | ~1100 | `renderCalendar()` — 5 views (month/week/day/agenda/list), event CRUD, event types (appointment/follow-up/closing/task/personal/reminder), Google Calendar sync, iCloud sync, booking link settings |
| **Settings** | ~600 | `renderSettings()` — Agent profile, theme (5 themes), default stage/lead type, overdue threshold, card preview fields, Google Sheets drip-in, calendar provider config, custom fields management |

**Cross-cutting features:**
- 235 functions total
- Client/Lead CRUD with modal (5 tabs: Contact, Policy, Inventory, Progress, Activity)
- Custom fields system (user-defined fields per tab category)
- Activity/progress timeline per client
- Advanced filters (stage, lead type, tags, value range, date range, overdue)
- Saved filter presets
- CSV import/export with field mapping
- Google Sheets drip-in (background polling via D1)
- Background lead sync (polls D1 for new leads from backend cron)
- Drag & drop (kanban)
- Keyboard shortcuts
- Toast notification system
- Triple-layer persistence (memory → IndexedDB → cloud D1)
- 5 themes (charcoal, tokyo, steel, offwhite, white)

### YN-CRM API (yncrm-api.danielruh.workers.dev)
Cloudflare Worker + D1 database. Endpoints:
- `POST /auth/signup` — creates agent (requires access_code)
- `POST /auth/login` — returns JWT
- `GET /auth/me` — current user
- `GET /leads` — all leads for agent
- `POST /leads` — create lead
- `PUT /leads/:id` — update lead
- `DELETE /leads/:id` — delete lead
- `POST /leads/bulk-delete` — bulk delete
- `POST /leads/import` — bulk import
- `GET /settings` — agent settings
- `PUT /settings` — update settings
- `POST /sync` — full state sync
- `GET/POST/PUT /drip-sources` — Google Sheets drip config

### Forged-OS Command Center (NOT YET BUILT — spec only)
React + Vite + Tailwind app planned for `/forged-os/` path. Architecture defined in FORGED-OS-BUILD-INSTRUCTIONS.md:
- **Framework:** React 19, Vite 6, Tailwind 4, plain JS (no TypeScript)
- **State:** React Context + useReducer (separate contexts per domain)
- **Routing:** No router — tab state managed via Context
- **Auth:** SHA-256 password gate
- **Styling:** 5 themes via CSS variables, mapped to Tailwind utilities
- **Existing planned tabs:** Task Manager, Org Chart, Workspaces
- **Deploy:** Cloudflare Pages, `bash build.sh` → `_site/`
- **API proxy:** `forged-sync.danielruh.workers.dev` (proxies to VPS for agent management)

**KEY FINDING:** The `forged-os/dev` branch does NOT exist yet. Forged-OS has NOT been built. The spec exists but no code. This means we're building Forged-OS AND integrating CRM simultaneously.

---

## 2. ARCHITECTURE DECISION

### Approach: CRM as a Top-Level Tab in Forged-OS

```
Forged-OS Shell
├── TabBar: [Task Manager] [Org Chart] [Workspaces] [CRM]
└── Active Tab Content
    └── CRM Tab
        ├── CRM Sub-Navigation (sidebar or sub-tabs)
        │   ├── Dashboard
        │   ├── Pipeline (Kanban)
        │   ├── Contacts
        │   ├── Calendar
        │   └── Settings
        └── Active CRM View
```

The CRM tab gets its own sub-navigation because it has 5 distinct views — too many to flatten into the top-level tab bar.

### Data Flow

```
React Components
    ↓ dispatch actions
CRMContext (useReducer)
    ↓ async thunks
crmApiClient.js
    ↓ fetch
yncrm-api.danielruh.workers.dev (D1)
    ↑ response
CRMContext updates state
    ↑ re-render
React Components
```

**No proxy needed for CRM API** — it's already a Cloudflare Worker with CORS. The VPS proxy (`forged-sync`) is only for the agent management API.

### Auth Strategy
Boss logs into the CRM using his existing YN-CRM credentials. The CRM auth token is stored separately from the Forged-OS password gate. Flow:
1. Boss passes Forged-OS password gate (SHA-256, existing)
2. On CRM tab first load, check for stored CRM JWT
3. If no JWT or expired → show CRM login form within the CRM tab
4. JWT stored in localStorage as `forgedos_crm_token`

---

## 3. COMPONENT MAP

### YN-CRM Function → React Component Mapping

#### Layout & Navigation
| YN-CRM | React Component | Notes |
|--------|----------------|-------|
| `switchView()` | `CRMTab.jsx` + `CRMContext` | `activeView` state in context |
| Sidebar nav items | `CRMSidebar.jsx` | Vertical sidebar within CRM tab |
| Theme system | Already in Forged-OS themes | Reuse existing 5 themes |
| Toast system | Already in Forged-OS `Toast.jsx` | Reuse existing toast |

#### CRM Dashboard (`view-dashboard`)
| YN-CRM Function | React Component | File |
|-----------------|----------------|------|
| `renderDashboard()` | `CRMDashboard.jsx` | Main dashboard container |
| KPI cards (leads, value, conversion, days) | `KPICard.jsx` | Reusable stat card |
| `renderTrendIndicator()` | `TrendIndicator.jsx` | Up/down arrow with % |
| Stage distribution chart | `StageChart.jsx` | CSS bar chart (no lib needed) |
| Time range filter | `DashboardFilters.jsx` | 7d/30d/90d/all toggle |
| Pipeline mode toggle | `PipelineModeToggle.jsx` | new/aged switch |

#### Pipeline/Kanban (`view-kanban`)
| YN-CRM Function | React Component | File |
|-----------------|----------------|------|
| `renderKanban()` | `PipelineView.jsx` | Container with stage columns |
| Stage column | `StageColumn.jsx` | Single column with drop zone |
| `renderCard()` | `LeadCard.jsx` | Draggable card with preview fields |
| Drag & drop | `useDragAndDrop.js` hook | HTML5 drag API or `@dnd-kit/core` |
| Pipeline mode toggle | `PipelineModeToggle.jsx` | Shared with dashboard |
| Bulk selection | `useBulkSelection.js` hook | Checkbox state management |
| Bulk actions bar | `BulkActionsBar.jsx` | Delete, move stage, export |

#### Contacts Table (`view-contacts`)
| YN-CRM Function | React Component | File |
|-----------------|----------------|------|
| `renderContacts()` | `ContactsView.jsx` | Table container |
| Table header | `ContactsTableHeader.jsx` | Sortable column headers |
| Table row | `ContactRow.jsx` | Single contact row |
| `renderPagination()` | `Pagination.jsx` | Shared pagination component |
| Search input | Part of `ContactsView.jsx` | Inline search bar |

#### Calendar (`view-calendar`)
| YN-CRM Function | React Component | File |
|-----------------|----------------|------|
| `renderCalendar()` | `CalendarView.jsx` | Container + view switcher |
| `renderMonthView()` | `MonthView.jsx` | Month grid |
| `renderWeekView()` | `WeekView.jsx` | 7-day columns with hours |
| `renderDayView()` | `DayView.jsx` | Single day with hours |
| `renderAgendaView()` | `AgendaView.jsx` | Upcoming events list |
| `renderListView()` | `ListView.jsx` | Full event list |
| Calendar nav (prev/next/today) | `CalendarNav.jsx` | Navigation controls |
| Event CRUD | `EventModal.jsx` | Create/edit event modal |
| Event display | `CalendarEvent.jsx` | Event chip on calendar |
| Booking link settings | `BookingSettings.jsx` | In CRM Settings |

#### Settings (`view-settings`)
| YN-CRM Function | React Component | File |
|-----------------|----------------|------|
| `renderSettings()` | `CRMSettings.jsx` | Settings container |
| Agent profile section | `ProfileSettings.jsx` | Name, phone |
| Default values | `DefaultsSettings.jsx` | Default stage, lead type, tags |
| Card preview fields | `CardPreviewSettings.jsx` | Drag-to-reorder field list |
| `renderDripInSettings()` | `DripInSettings.jsx` | Google Sheets URL + status |
| Calendar provider config | `CalendarProviderSettings.jsx` | Google/iCloud/Outlook setup |
| Custom fields management | `CustomFieldsManager.jsx` | CRUD for custom fields |

#### Client/Lead Modal (shared)
| YN-CRM Function | React Component | File |
|-----------------|----------------|------|
| `openAddModal()` / `openEditModal()` | `LeadModal.jsx` | Add/edit modal container |
| `switchTab('contact')` | `LeadContactTab.jsx` | Name, phone, email, type, stage, etc. |
| `switchTab('policy')` | `LeadPolicyTab.jsx` | Policy details |
| `switchTab('inventory')` | `LeadInventoryTab.jsx` | Product inventory |
| `switchTab('progress')` | `LeadProgressTab.jsx` | `renderProgressTimeline()` |
| `switchTab('activity')` | `LeadActivityTab.jsx` | `renderActivityNotes()` |
| `saveClient()` | `useLeadCRUD.js` hook | Create/update via API |
| `deleteClient()` | `useLeadCRUD.js` hook | Delete via API |
| Custom field rendering | `CustomFieldRenderer.jsx` | Renders dynamic fields in form |

#### Filters & Search
| YN-CRM Function | React Component | File |
|-----------------|----------------|------|
| `filterClients()` + advanced filters | `FilterPanel.jsx` | Collapsible filter sidebar |
| `renderFilterPresets()` | `FilterPresets.jsx` | Saved filter management |
| Search bar | `SearchBar.jsx` | Shared search input |

#### Import/Export
| YN-CRM Function | React Component | File |
|-----------------|----------------|------|
| `openImportModal()` | `ImportModal.jsx` | Multi-step import wizard |
| `renderImportStep2()` | `ImportFieldMapping.jsx` | Field mapping UI |
| `renderImportStep3()` | `ImportPreview.jsx` | Preview + validate |
| `exportBackup()` / CSV export | `ExportButton.jsx` | Download button |

---

## 4. STATE MANAGEMENT

### CRMContext.jsx

```javascript
// State shape
const initialState = {
  // Auth
  token: localStorage.getItem('forgedos_crm_token'),
  user: null,
  authLoading: true,
  
  // Data
  leads: [],
  customFields: [],
  activity: [],
  
  // Calendar
  calendar: {
    events: [],
    view: 'month',       // month|week|day|agenda|list
    currentDate: new Date(),
    providers: [],
    settings: { /* booking link, alerts, auto-schedule */ }
  },
  
  // UI
  activeView: 'dashboard',  // dashboard|pipeline|contacts|calendar|settings
  pipelineMode: 'new',
  filters: {
    search: '',
    stages: [],
    leadTypes: [],
    tags: [],
    valueMin: null,
    valueMax: null,
    createdAfter: null,
    createdBefore: null,
    overdueOnly: false
  },
  savedFilters: [],
  sortBy: 'createdAt',
  sortDir: 'desc',
  currentPage: 1,
  pageSize: 20,
  selectedLeads: [],       // for bulk ops
  dashboardRange: 'all',
  
  // Settings
  settings: {
    agentName: '',
    workPhone: '',
    personalPhone: '',
    defaultStage: 'new_lead',
    defaultLeadType: '',
    defaultTags: [],
    overdueDays: 7,
    cardPreviewFields: ['state', 'createdAt', 'carrier', 'premium'],
    googleSheetUrl: '',
    dripInEnabled: false,
    dripInInterval: 30,
    dripInPipeline: 'new',
    bookingLink: {
      enabled: false,
      slug: '',
      availableHours: { start: '09:00', end: '17:00' },
      bufferMinutes: 15,
      maxPerDay: 8
    }
  },
  
  // Sync
  syncStatus: 'idle',      // idle|syncing|error
  lastSync: null
};
```

### Actions (useReducer)

```
SET_AUTH, CLEAR_AUTH, SET_AUTH_LOADING
SET_LEADS, ADD_LEAD, UPDATE_LEAD, DELETE_LEAD, DELETE_LEADS_BULK
SET_CUSTOM_FIELDS, ADD_CUSTOM_FIELD, UPDATE_CUSTOM_FIELD, DELETE_CUSTOM_FIELD
SET_ACTIVITY, ADD_ACTIVITY
SET_CALENDAR_EVENTS, ADD_EVENT, UPDATE_EVENT, DELETE_EVENT
SET_CALENDAR_VIEW, SET_CALENDAR_DATE
SET_ACTIVE_VIEW, SET_PIPELINE_MODE
SET_FILTERS, SET_SAVED_FILTERS, SET_SORT, SET_PAGE
SET_SELECTED_LEADS, CLEAR_SELECTION
SET_SETTINGS, SET_DASHBOARD_RANGE
SET_SYNC_STATUS
```

---

## 5. API CLIENT

### `src/api/crmClient.js`

```javascript
const CRM_API_URL = 'https://yncrm-api.danielruh.workers.dev';

class CRMApiClient {
  constructor() {
    this.token = localStorage.getItem('forgedos_crm_token');
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('forgedos_crm_token', token);
    else localStorage.removeItem('forgedos_crm_token');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers
    };
    const res = await fetch(`${CRM_API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API error');
    return data;
  }

  // Auth
  login(email, password) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); }
  getMe() { return this.request('/auth/me'); }

  // Leads
  getLeads() { return this.request('/leads'); }
  createLead(lead) { return this.request('/leads', { method: 'POST', body: JSON.stringify(lead) }); }
  updateLead(id, lead) { return this.request(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(lead) }); }
  deleteLead(id) { return this.request(`/leads/${id}`, { method: 'DELETE' }); }
  bulkDelete(ids) { return this.request('/leads/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }); }
  importLeads(leads) { return this.request('/leads/import', { method: 'POST', body: JSON.stringify({ leads }) }); }

  // Settings
  getSettings() { return this.request('/settings'); }
  updateSettings(settings) { return this.request('/settings', { method: 'PUT', body: JSON.stringify(settings) }); }

  // Sync
  syncAll(data) { return this.request('/sync', { method: 'POST', body: JSON.stringify(data) }); }

  // Drip sources
  getDripSources() { return this.request('/drip-sources'); }
  createDripSource(source) { return this.request('/drip-sources', { method: 'POST', body: JSON.stringify(source) }); }
  updateDripSource(id, source) { return this.request(`/drip-sources/${id}`, { method: 'PUT', body: JSON.stringify(source) }); }

  // === NEW: Appointment Booking (for Clawd) ===
  createAppointment(appointment) { return this.request('/appointments', { method: 'POST', body: JSON.stringify(appointment) }); }
  getAppointments(params = {}) { return this.request('/appointments?' + new URLSearchParams(params)); }
  updateAppointment(id, data) { return this.request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteAppointment(id) { return this.request(`/appointments/${id}`, { method: 'DELETE' }); }
  getAvailableSlots(date) { return this.request(`/appointments/available?date=${date}`); }
}

export const crmApi = new CRMApiClient();
```

---

## 6. CLAWD APPOINTMENT BOOKING SYSTEM

### New API Endpoints (add to yncrm-api Worker)

```
POST   /appointments              — Create appointment
GET    /appointments              — List appointments (query: date_from, date_to, status)
GET    /appointments/available    — Get available time slots for a date
PUT    /appointments/:id          — Update appointment
DELETE /appointments/:id          — Cancel appointment
```

### D1 Schema Addition

```sql
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  lead_id TEXT,                    -- optional link to lead
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,        -- ISO 8601
  end_time TEXT NOT NULL,          -- ISO 8601
  type TEXT DEFAULT 'appointment', -- appointment|follow_up|closing|task
  status TEXT DEFAULT 'scheduled', -- scheduled|completed|cancelled|no_show
  location TEXT,                   -- phone|zoom|in_person|address
  attendee_name TEXT,
  attendee_phone TEXT,
  attendee_email TEXT,
  created_by TEXT DEFAULT 'user',  -- 'user' or 'clawd'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### How Clawd Books Appointments

Clawd uses the CRM API directly with Boss's auth token (stored securely in CLAWD-VPS-INFO.md):

```
1. GET /appointments/available?date=2026-02-20
   → Returns: [{ start: "09:00", end: "09:30" }, { start: "09:30", end: "10:00" }, ...]

2. POST /appointments
   Body: {
     title: "Call with John Smith",
     start_time: "2026-02-20T09:00:00Z",
     end_time: "2026-02-20T09:30:00Z",
     type: "appointment",
     attendee_name: "John Smith",
     attendee_phone: "+15551234567",
     location: "phone",
     created_by: "clawd"
   }
   → Returns: { id: "apt_xxx", ...appointment }
```

The `/appointments/available` endpoint checks Boss's booking settings (available hours, buffer minutes, max per day) and returns open slots excluding existing appointments.

### Clawd Integration Notes
- Store Boss's CRM JWT in Clawd's environment (not in code)
- Clawd can check availability, create appointments, and confirm back to Boss or the client
- All Clawd-created appointments marked with `created_by: 'clawd'` for audit trail
- Appointments show in the Calendar view with a "🤖 Booked by Clawd" badge

---

## 7. FILE STRUCTURE (New Components)

```
forged-os/src/
├── api/
│   ├── syncClient.js          (existing — VPS agent management)
│   └── crmClient.js           (NEW — YN-CRM API client)
├── context/
│   ├── AppContext.jsx          (existing)
│   ├── TaskManagerContext.jsx  (existing)
│   ├── OrgChartContext.jsx     (existing)
│   ├── WorkspaceContext.jsx    (existing)
│   └── CRMContext.jsx          (NEW)
├── hooks/
│   ├── useInterval.js          (existing)
│   ├── useSyncServer.js        (existing)
│   ├── useLeadCRUD.js          (NEW — lead create/update/delete)
│   ├── useDragAndDrop.js       (NEW — kanban drag & drop)
│   ├── useBulkSelection.js     (NEW — multi-select leads)
│   ├── useCalendarNav.js       (NEW — calendar navigation)
│   └── useCRMSync.js           (NEW — background sync + drip polling)
└── components/
    └── tabs/
        └── crm/
            ├── CRMTab.jsx              (main container + sub-routing)
            ├── CRMSidebar.jsx          (sub-navigation)
            ├── CRMLoginForm.jsx        (auth within CRM tab)
            ├── dashboard/
            │   ├── CRMDashboard.jsx
            │   ├── KPICard.jsx
            │   ├── TrendIndicator.jsx
            │   ├── StageChart.jsx
            │   └── DashboardFilters.jsx
            ├── pipeline/
            │   ├── PipelineView.jsx
            │   ├── StageColumn.jsx
            │   ├── LeadCard.jsx
            │   ├── PipelineModeToggle.jsx
            │   └── BulkActionsBar.jsx
            ├── contacts/
            │   ├── ContactsView.jsx
            │   ├── ContactRow.jsx
            │   └── Pagination.jsx
            ├── calendar/
            │   ├── CalendarView.jsx
            │   ├── CalendarNav.jsx
            │   ├── MonthView.jsx
            │   ├── WeekView.jsx
            │   ├── DayView.jsx
            │   ├── AgendaView.jsx
            │   ├── ListView.jsx
            │   ├── CalendarEvent.jsx
            │   └── EventModal.jsx
            ├── settings/
            │   ├── CRMSettings.jsx
            │   ├── ProfileSettings.jsx
            │   ├── DefaultsSettings.jsx
            │   ├── CardPreviewSettings.jsx
            │   ├── DripInSettings.jsx
            │   ├── CalendarProviderSettings.jsx
            │   ├── BookingSettings.jsx
            │   └── CustomFieldsManager.jsx
            ├── shared/
            │   ├── LeadModal.jsx
            │   ├── LeadContactTab.jsx
            │   ├── LeadPolicyTab.jsx
            │   ├── LeadInventoryTab.jsx
            │   ├── LeadProgressTab.jsx
            │   ├── LeadActivityTab.jsx
            │   ├── CustomFieldRenderer.jsx
            │   ├── FilterPanel.jsx
            │   ├── FilterPresets.jsx
            │   ├── SearchBar.jsx
            │   ├── ImportModal.jsx
            │   ├── ImportFieldMapping.jsx
            │   ├── ImportPreview.jsx
            │   └── ExportButton.jsx
            └── constants.js            (STAGES, NOTE_TYPES, LEAD_TYPES, EVENT_TYPES)
```

**Total new files: ~50** (45 components + 1 context + 1 API client + 3 hooks + 1 constants)

---

## 8. BUILD SEQUENCE (For Mason)

### Phase 0: Foundation (must be first)
**Prerequisite:** Forged-OS itself doesn't exist yet. Mason needs to build the shell first per FORGED-OS-BUILD-INSTRUCTIONS.md, OR we build CRM-first and add the other tabs later.

**Recommendation:** Build Forged-OS shell + CRM tab first. Other tabs (Task Manager, Org Chart, Workspaces) come later. Boss wants CRM now.

1. Create `forged-os/` directory per existing spec
2. Set up Vite + React + Tailwind
3. Build Shell.jsx, TabBar.jsx, StatusBar.jsx, AuthGate.jsx
4. Build theme system (5 themes, CSS vars)
5. Add CRM as the first (and initially only) tab
6. Verify build.sh works, deploys to Cloudflare Pages

### Phase 1: CRM Core (data layer + basic CRUD)
1. `crmClient.js` — API client
2. `CRMContext.jsx` — state management
3. `CRMTab.jsx` + `CRMSidebar.jsx` — container + nav
4. `CRMLoginForm.jsx` — auth flow
5. `constants.js` — STAGES, LEAD_TYPES, NOTE_TYPES, EVENT_TYPES
6. `LeadModal.jsx` + all 5 tabs — full lead CRUD
7. `CustomFieldRenderer.jsx` — dynamic field support
8. **Test:** Can log in, create lead, edit lead, delete lead

### Phase 2: Views
1. `CRMDashboard.jsx` + sub-components — KPIs, charts
2. `PipelineView.jsx` + `StageColumn.jsx` + `LeadCard.jsx` — kanban
3. `useDragAndDrop.js` — drag between stages
4. `ContactsView.jsx` + `Pagination.jsx` — table view
5. `FilterPanel.jsx` + `SearchBar.jsx` — filtering
6. **Test:** All 3 main views render, drag works, search works

### Phase 3: Calendar
1. `CalendarView.jsx` + `CalendarNav.jsx` — container
2. `MonthView.jsx` — month grid (start here)
3. `WeekView.jsx`, `DayView.jsx` — time-based views
4. `AgendaView.jsx`, `ListView.jsx` — list views
5. `EventModal.jsx` + `CalendarEvent.jsx` — event CRUD
6. **Test:** Can create/view/edit/delete events, navigate months

### Phase 4: Settings & Import/Export
1. `CRMSettings.jsx` + all sub-sections
2. `CustomFieldsManager.jsx` — custom field CRUD
3. `ImportModal.jsx` + steps — CSV import wizard
4. `ExportButton.jsx` — CSV/backup export
5. `DripInSettings.jsx` — Google Sheets config
6. **Test:** Settings persist, import works, export works

### Phase 5: Clawd Booking API
1. Add `appointments` table to D1 schema
2. Add appointment endpoints to yncrm-api Worker
3. Add `/appointments/available` availability logic
4. Test via curl: create appointment, check availability
5. Add appointment display to Calendar views
6. **Test:** Clawd can book via API, shows in Boss's calendar

### Phase 6: Polish
1. Background sync (lead polling)
2. Keyboard shortcuts
3. Bulk selection + actions
4. Saved filter presets
5. Toast integration
6. Mobile responsiveness (basic)
7. **Test:** Full feature parity check against YN-CRM

---

## 9. ACCEPTANCE CRITERIA

### Per-Component Acceptance

| Component | Criteria |
|-----------|----------|
| CRM Login | Boss can log in with YN-CRM creds, JWT persists across sessions |
| Lead CRUD | Create/read/update/delete leads via modal, all 5 tabs work, saves to D1 |
| Custom Fields | Can add/edit/delete custom fields, they appear in lead modal forms |
| Dashboard | Shows correct KPI counts, stage chart matches lead distribution, time range filter works |
| Pipeline | 6 stage columns render, cards show correct preview fields, drag moves lead to new stage and persists |
| Contacts | Table renders all leads, sortable by any column, pagination works at 20/page |
| Calendar | Month/week/day/agenda/list views all render, can create/edit/delete events |
| Settings | All settings save and persist, theme changes work, custom fields manageable |
| Filters | Can filter by stage, lead type, tags, value range, date range, overdue; can save/load filter presets |
| Import | CSV upload → field mapping → preview → import works; shows errors for invalid rows |
| Export | Downloads CSV with all leads; backup export includes full state |
| Drip-In | Google Sheets URL saves to D1, background polling picks up new leads |
| Appointment API | `GET /appointments/available` returns correct open slots; `POST /appointments` creates appointment; shows in calendar |
| Clawd Booking | Clawd can hit API with auth token, create appointment, appointment shows with "Booked by Clawd" badge |

### Global Acceptance
- [ ] All YN-CRM features functional in Forged-OS
- [ ] Matches Forged-OS design system (Tailwind, CSS vars, dark theme)
- [ ] Same data — Boss sees same leads as in YN-CRM (same D1 backend)
- [ ] No regressions to YN-CRM at root (it stays untouched)
- [ ] Deploys via `bash build.sh` to Cloudflare Pages
- [ ] `/forged-os/` serves the Command Center
- [ ] `/` still serves the original YN-CRM

---

## 10. RISK REGISTER

| Risk | Impact | Mitigation |
|------|--------|------------|
| Forged-OS shell doesn't exist yet | Blocks CRM integration | Build shell first (Phase 0), minimal viable shell |
| D1 schema changes for appointments | Could break existing CRM | Additive only — new table, no changes to existing tables |
| Auth token conflicts (Forged-OS gate vs CRM JWT) | Confusing UX | Separate localStorage keys, clear separation in UI |
| 235 functions to port — scope creep | Timeline bloat | Prioritize by phase, defer polish (Phase 6) if needed |
| Calendar provider integrations (Google/iCloud) | Complex OAuth flows | Port config UI but don't block on provider connections — they depend on existing Worker integrations |
| `gh` CLI not authed | Can't push from workspace | Use `git` with token directly, or auth `gh` |
| No forged-os/dev branch | Need to create it | Mason creates branch on first commit |

---

## 11. DEPENDENCIES & PACKAGES

### New npm dependencies for CRM features:
```json
{
  "@dnd-kit/core": "^6",       // Drag and drop for kanban (better than HTML5 drag API)
  "@dnd-kit/sortable": "^8",   // Sortable within columns
  "date-fns": "^3"             // Date manipulation for calendar (lighter than moment)
}
```

No other new dependencies needed. Everything else is vanilla React + Tailwind.

---

## 12. DATA MODEL REFERENCE

### Lead Object (from YN-CRM state → D1)
```javascript
{
  id: "string",
  name: "string",
  phone: "string",
  email: "string",
  leadType: "FEX|WHOLE|TERM|IUL|ANNUITY|TRUCKER|MP|VETERANS",
  stage: "new_lead|contact|engaged|qualified|application|sold",
  value: number,
  premium: number,
  tags: ["string"],
  state: "string",         // US state
  carrier: "string",
  notes: "string",
  assignee: "string",
  createdAt: "ISO date",
  lastContact: "ISO date",
  followUpDate: "ISO date",
  stageHistory: [{ stage, date }],
  customFieldValues: { fieldId: value }
}
```

### Calendar Event Object
```javascript
{
  id: "string",
  title: "string",
  start: "ISO datetime",
  end: "ISO datetime",
  type: "appointment|follow_up|closing|task|personal|reminder",
  color: "string",
  clientId: "string|null",   // linked lead
  notes: "string",
  alerts: [{ timing: minutes, method: "in_app|browser" }],
  recurrence: null,          // future: rrule string
  provider: "local|google|icloud",
  externalId: "string|null"  // provider's event ID
}
```

---

*Blueprint complete. Ready for Boss approval → Mason execution.*
