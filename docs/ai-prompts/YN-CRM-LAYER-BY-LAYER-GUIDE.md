# YN-CRM Layer-by-Layer Development Guide

> This guide shows you how to incrementally build features in the YN-CRM without touching existing code.
> Use this with AI agents to safely add functionality layer by layer.

---

## CRM Architecture Overview

The YN-CRM is a **single-file monolith** (11,221 lines) with this structure:

```
index.html
├── Lines 1-10: DOCTYPE & Head
├── Lines 10-3700: CSS STYLES (organized by component)
├── Lines 3700-5000: HTML STRUCTURE
├── Lines 5000-5500: API CLIENT & AUTHENTICATION
├── Lines 5500-5900: DATA STRUCTURES & STATE
├── Lines 5900-6100: UI HELPERS (toast, modal, themes)
├── Lines 6100-6700: CORE FUNCTIONS (CRUD, validation)
├── Lines 6700-7800: RENDERING (leads, cards, kanban)
├── Lines 7800-8800: KANBAN BOARD
├── Lines 8800-9900: SETTINGS & INTEGRATIONS
├── Lines 9900-11000: IMPORT/EXPORT
├── Lines 11000-11221: INITIALIZATION & EVENT LISTENERS
```

---

## The 8 Layers

### Layer 1: CSS Variables & Themes (Lines 10-100)
**What it does:** Defines all colors, spacing, and theme variants.

**To add new colors/themes:**
```css
/* ADD after line 99 (after .theme-white) */
/* Theme: Your New Theme */
body.theme-newname {
    --bg-primary: #hexcode;
    --bg-secondary: #hexcode;
    /* ... copy structure from existing theme */
}
```

**To add new CSS variables:**
```css
/* ADD inside :root (around line 14) */
--your-new-variable: value;
```

---

### Layer 2: Component CSS (Lines 100-3700)
**What it does:** Styles for sidebar, cards, modals, forms, etc.

**Section Map:**
| Lines | Component |
|-------|-----------|
| 100-150 | Base styles, scrollbars |
| 150-300 | Sidebar |
| 300-500 | Top bar, stats, search |
| 500-800 | Filter pills, dropdowns |
| 800-1100 | Cards & lead display |
| 1100-1250 | Pipeline stages |
| 1250-1600 | Forms & inputs |
| 1600-2000 | Modals |
| 2000-2750 | Detail view |
| 2750-3400 | Settings tabs |
| 3400-3700 | Responsive & misc |

**To add new component styles:**
```css
/* ADD at end of CSS section (before </style> around line 3700) */
/* ============================================
   YOUR NEW COMPONENT
   ============================================ */
.your-component {
    /* styles here */
}
```

---

### Layer 3: HTML Structure (Lines 3700-5000)
**What it does:** The DOM structure - sidebar, main content, modals.

**Section Map:**
| Lines | Element |
|-------|---------|
| 3700-3800 | App container, sidebar |
| 3800-3900 | Navigation items |
| 3900-4100 | Top bar, stats |
| 4100-4300 | Filter bar |
| 4300-4500 | Kanban board container |
| 4500-4700 | List view container |
| 4700-5000 | Modals (add/edit, settings, etc.) |

**To add a new modal:**
```html
<!-- ADD before </body> around line 5000 -->
<div id="yourNewModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Your Modal Title</h2>
            <button class="close-modal" onclick="closeModal('yourNewModal')">x</button>
        </div>
        <div class="modal-body">
            <!-- Your content -->
        </div>
    </div>
</div>
```

---

### Layer 4: API Client & Auth (Lines 5000-5500)
**What it does:** Handles all server communication and authentication.

**Key Components:**
- `API_URL` - The Cloudflare Worker endpoint
- `api` object - All API methods (login, getLeads, etc.)
- Auth functions: `showLogin()`, `handleLogin()`, `logout()`

**To add a new API endpoint:**
```javascript
// ADD inside the api object (around line 5080)
async yourNewEndpoint(data) {
    return await this.request('/your-endpoint', {
        method: 'POST',
        body: JSON.stringify(data)
    });
},
```

---

### Layer 5: State & Data (Lines 5500-5900)
**What it does:** The `state` object holds ALL application data.

**State Structure:**
```javascript
const state = {
    clients: [],           // Lead data
    activities: [],        // Activity log
    customFields: [],      // Custom field definitions
    user: null,            // Current user
    currentView: 'kanban', // Current view mode
    settings: {
        cardPreviewFields: {...},
        calendarProviders: {...},
        dripSource: {...}
    },
    events: [],            // Calendar events
    filterPresets: []      // Saved filters
};
```

**To add new state:**
```javascript
// ADD inside state object (around line 5600)
yourNewFeature: {
    enabled: false,
    data: []
},
```

---

### Layer 6: UI Helpers (Lines 5900-6100)
**What it does:** Toast notifications, modals, themes, keyboard shortcuts.

**Key Functions:**
- `showToast(message, type)` - Show notification
- `openModal(id)` / `closeModal(id)` - Modal control
- `setTheme(theme)` - Change theme
- `switchView(view)` - Switch between kanban/list

**To add a new helper:**
```javascript
// ADD after existing helpers (around line 6100)
// ============================================
// YOUR NEW HELPER
// ============================================
function yourNewHelper(params) {
    // Your code here
}
```

---

### Layer 7: Core Functions (Lines 6100-7800)
**What it does:** CRUD operations, validation, rendering.

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `saveClient()` | Create/update lead |
| `deleteClient(id)` | Delete lead |
| `renderKanban()` | Render kanban board |
| `renderListView()` | Render list view |
| `renderLeadCard(client)` | Render single card |
| `openEditModal(id)` | Open edit modal |
| `validateClientForm()` | Validate form |

**To add a new feature function:**
```javascript
// ADD after related functions (find appropriate section)
// ============================================
// YOUR NEW FEATURE: Feature Name
// Added: YYYY-MM-DD by [who]
// ============================================
function yourNewFeature(params) {
    // Your code - self-contained
}

function yourNewFeatureHelper(params) {
    // Helper function for your feature
}
// ============================================
// END YOUR NEW FEATURE
// ============================================
```

---

### Layer 8: Initialization (Lines 11000-11221)
**What it does:** App startup, event listeners, auto-connect.

**Key Functions:**
- `init()` - Main initialization
- `initPipelineToggle()` - Set up pipeline UI
- `initICloudAutoSync()` - Start calendar sync
- Event listeners for keyboard, clicks, etc.

**To add initialization for your feature:**
```javascript
// ADD inside init() function (around line 11100)
// Initialize your feature
initYourFeature();

// AND add the function above init():
function initYourFeature() {
    // Setup code
}
```

---

## Layer-by-Layer Development Workflow

### Step 1: Identify the Layer
Before adding ANY feature, identify which layer(s) it touches:

| Feature Type | Layers Needed |
|--------------|---------------|
| New color/theme | Layer 1 |
| New UI component | Layers 2, 3, 6 |
| New data field | Layers 5, 7 |
| New API integration | Layers 4, 5, 7 |
| New modal/form | Layers 2, 3, 6, 7 |

### Step 2: Add CSS First (if needed)
Always add CSS at the END of each section, never modify existing.

### Step 3: Add HTML Structure (if needed)
Add new elements, never modify existing DOM structure.

### Step 4: Add Functions (self-contained)
Wrap new features in clearly marked comment blocks.

### Step 5: Wire Up in Init
Add initialization call in `init()` function.

---

## Agent Instructions Template

Use this template when asking an agent to add features:

```
CONTEXT:
YN-CRM is a single-file monolith (index.html, 11,221 lines).
Local clone: c:\Users\danie\OneDrive\Desktop\Master X\YN-CRM\index.html
VPS copy: /home/clawd/YN-CRM/index.html

RULES:
1. Do NOT modify existing functions
2. Do NOT remove or rename existing CSS classes
3. Only ADD new code — append, don't rewrite
4. Wrap new features in marked comment blocks
5. Follow the layer structure in YN-CRM-LAYER-BY-LAYER-GUIDE.md

LAYER(S) AFFECTED:
[Specify which layers this feature touches]

TASK:
[Specific task description]

LOCATION:
[Exact line numbers or anchors where to add code]

VERIFY:
After changes, confirm:
[ ] Page loads without console errors
[ ] Login still works
[ ] Existing features still function
[ ] New feature works as described
```

---

## Line Number Quick Reference

| Section | Start Line | End Line |
|---------|------------|----------|
| CSS Variables | 10 | 100 |
| CSS Components | 100 | 3700 |
| HTML Structure | 3700 | 5000 |
| API Client | 5000 | 5300 |
| Auth Functions | 5150 | 5400 |
| State Object | 5550 | 5700 |
| Migration | 5577 | 5650 |
| IndexedDB | 5658 | 5720 |
| Cloud Sync | 5720 | 5880 |
| Toast System | 5883 | 5995 |
| UI Helpers | 5997 | 6100 |
| Utilities | 6100 | 6200 |
| Client CRUD | 6200 | 6450 |
| Custom Fields | 6444 | 6610 |
| Rendering | 6700 | 7800 |
| Kanban | 7800 | 8800 |
| Settings | 8800 | 9000 |
| Calendar | 9200 | 9900 |
| Import/Export | 9900 | 11000 |
| Init | 11096 | 11221 |

---

## Function Index (Most Important)

### Authentication
- `showLogin()` - Line 5146
- `handleLogin()` - Line 5158
- `handleSignup()` - Line 5192
- `logout()` - Line 5278

### Data
- `saveClient()` - Line 6296
- `deleteClient()` - Line 6397
- `saveState()` - Line 5717
- `syncToCloud()` - Line 5753

### UI
- `renderKanban()` - Line 7773 (approx)
- `renderLeadCard()` - Line 7850 (approx)
- `renderListView()` - Line 8100 (approx)
- `openEditModal()` - Line 6208
- `showToast()` - Line 5883

### Settings
- `saveSettings()` - Line 8781
- `pullFromGoogleSheet()` - Line 9017
- `syncICloud()` - Line 9655

---

## Your Local Setup

**Repo Location:** `c:\Users\danie\OneDrive\Desktop\Master X\YN-CRM\`

**Commands:**
```bash
# Check status
cd "c:\Users\danie\OneDrive\Desktop\Master X\YN-CRM"
git status

# Create feature branch
git checkout -b feature/your-feature-name

# After changes
git add index.html
git commit -m "Add: your feature description"
git push -u origin feature/your-feature-name

# Merge to main (after testing)
git checkout main
git merge feature/your-feature-name
git push
```

**Preview URLs:**
- Production: https://yncrm.pages.dev
- Your branch: https://feature-your-feature-name.yncrm.pages.dev

---

## Golden Rules

1. **NEVER edit existing functions** - Add new ones
2. **NEVER delete CSS** - Add at end of sections
3. **ALWAYS use branches** - Never commit to main directly
4. **ALWAYS mark new code** - Use comment blocks
5. **ALWAYS test before merge** - Use preview URLs
6. **ONE feature per branch** - Keep changes isolated
