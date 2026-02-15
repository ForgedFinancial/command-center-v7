# Precision Control Prompting
## Full Command Over Operational Structure & Visual Design

*For Danny — Application Architecture, UI Systems, Dashboard Development*

---

## THE CONTROL PROBLEM

When you tell an AI "build me a dashboard," it makes hundreds of decisions
you never agreed to — how the code is organized, which CSS approach to use,
how state flows between components, what shade of blue to use, how much
padding goes where, what happens on hover. You get something that "works"
but isn't built the way YOU would build it.

**The fix: Specify the decisions that matter. Delegate the ones that don't.**

This guide gives you prompts that control TWO layers:

```
OPERATIONAL STRUCTURE          VISUAL DESIGN
(How it's built)               (How it looks)
─────────────────              ──────────────
• File/code architecture       • Color system
• Component hierarchy          • Typography scale
• State management             • Spacing system
• Data flow patterns           • Grid/layout rules
• Event handling               • Animation specs
• Error boundaries             • Component styling
• API/integration patterns     • Responsive behavior
• Naming conventions           • State-based styling
```

---

## LAYER 1: OPERATIONAL STRUCTURE CONTROL

### PROMPT A: "The Architecture Blueprint"
*Use BEFORE any code is written. Establishes the structural rules everything follows.*

```
Before writing any code, I need you to define and confirm the
architecture for [application/feature]. Follow this format exactly:

## 1. FILE STRUCTURE
Show me the complete file/section organization:
```
[root]
├── what goes here and why
├── what goes here and why
└── what goes here and why
```

## 2. COMPONENT HIERARCHY
Map every component as a tree showing parent → child relationships:
```
App
├── ComponentA (purpose: _____)
│   ├── SubComponentA1 (purpose: _____)
│   └── SubComponentA2 (purpose: _____)
└── ComponentB (purpose: _____)
```

## 3. STATE MANAGEMENT
For every piece of state in the application:
| State Variable | Type | Lives In | Updated By | Read By |
|---------------|------|----------|------------|---------|
| [name]        | [type]| [where] | [what]     | [what]  |

## 4. DATA FLOW
Draw the data flow using arrows:
```
User Action → Handler → State Update → Re-render → Visual Change
```
Show this for the 3 most important user interactions.

## 5. EVENT ARCHITECTURE
| Event | Trigger | Handler | Side Effects |
|-------|---------|---------|-------------|
| [name]| [what]  | [function]| [what else happens] |

## 6. ERROR HANDLING
For each operation that can fail:
| Operation | Failure Mode | User Sees | System Does |
|-----------|-------------|-----------|-------------|
| [what]    | [how it fails]| [message/UI] | [recovery] |

## 7. NAMING CONVENTIONS
- Components: [PascalCase / kebab-case / etc.]
- Functions: [pattern, e.g., handleX, onX, getX]
- CSS classes: [BEM / utility / semantic]
- State variables: [pattern]
- Files: [pattern]

Present this blueprint. I will approve, modify, or reject before
you write a single line of code.
```

---

### PROMPT B: "The Structural Mandate"
*Use when you already KNOW how you want it built and don't want deviation.*

```
Build [what you need] following these structural rules EXACTLY.
Do not deviate from any of these without asking first.

ARCHITECTURE RULES:
1. Single-file / Multi-file: [specify which and why]
2. Code organization order within each file:
   a. [Constants/config at top]
   b. [Utility functions]
   c. [State declarations]
   d. [Event handlers]
   e. [Render/display logic]
   f. [Initialization]

3. State management approach: [specify exactly]
   - Use [useState / global object / class properties / etc.]
   - State shape: { key: type, key: type }
   - State updates happen ONLY through [specified method]

4. Function patterns:
   - Max function length: [X lines]
   - Every function must [return a value / have JSDoc / etc.]
   - Async operations use [promises / async-await / callbacks]

5. DOM/Rendering approach:
   - [React JSX / vanilla JS createElement / template literals / etc.]
   - Re-renders triggered by [what mechanism]
   - DOM updates are [full re-render / surgical / virtual DOM]

6. Integration points:
   - External data comes in through: [fetch / WebSocket / props / etc.]
   - External data goes out through: [events / callbacks / API calls]
   - Authentication: [how it works]

7. Error strategy:
   - Try/catch around: [specify which operations]
   - Errors display as: [toast / inline / modal / console]
   - Failed operations: [retry X times / fail gracefully / escalate]

WHAT TO BUILD:
[Describe the feature/application]

INPUTS:
[What data it receives]

OUTPUTS:
[What it produces / displays / sends]

INTERACTIONS:
[What the user can do]
```

**Example for OpenClaw:**
```
Build the TaskBoard component following these structural rules EXACTLY.

ARCHITECTURE RULES:
1. Single-file HTML with embedded CSS and JS (matches CC-v4.2 pattern)
2. Code organization:
   a. CSS variables and reset at top of <style>
   b. Layout styles, then component styles, then state styles, then animations
   c. <script> starts with CONFIG object (all magic numbers, URLs, timing)
   d. State object: window.TaskBoard = { tasks: [], filters: {}, view: 'kanban' }
   e. Pure functions first (formatDate, calculatePriority, etc.)
   f. DOM manipulation functions (renderBoard, renderCard, renderColumn)
   g. Event handlers (handleDrag, handleApprove, handleFilter)
   h. Init function at bottom, called on DOMContentLoaded

3. State management:
   - Single global state object: window.TaskBoard
   - ALL state changes go through: updateState(path, value)
   - updateState triggers re-render of ONLY affected components
   - No direct DOM manipulation outside render functions

4. Function patterns:
   - Max 30 lines per function
   - Render functions return HTML strings
   - Event handlers named handle[Action] (handleDragStart, handleApprove)
   - Data transforms named get[Thing] (getFilteredTasks, getColumnCounts)

5. DOM approach:
   - Render functions return template literal HTML strings
   - innerHTML replacement at the container level
   - Event delegation on parent containers, not individual elements
   - data-* attributes for element identification

6. Error strategy:
   - Try/catch around all fetch calls and JSON parsing
   - Errors show as a toast notification (bottom-right, auto-dismiss 5s)
   - Failed API calls retry once after 2 seconds, then show error

Build the 6-column Kanban board:
New | In Progress | Review | Completed | Scheduled | Clawd Suggestions

Each card shows: task title, assigned agent, priority badge, timestamp,
approval status. Cards are draggable between columns. The "Review" column
has an approval gate — cards cannot leave Review without explicit approve/deny.
```

---

### PROMPT C: "The Component Specification"
*Use for individual components where you need precise control over behavior.*

```
Build a [component name] with this exact specification:

IDENTITY
- Name: [ComponentName]
- Purpose: [one sentence]
- Parent: [what contains it]
- Children: [what it contains]

PROPS / INPUTS
| Input | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| [name]| [type]| yes/no  | [value] | [rules]    |

INTERNAL STATE
| Variable | Type | Initial | Changes When |
|----------|------|---------|-------------|
| [name]   | [type]| [value]| [trigger]   |

RENDERED OUTPUT
Describe the DOM structure:
```
<div.component-wrapper>
  <header.component-header>
    <h3.title> {title} </h3>
    <span.badge> {status} </span>
  </header>
  <div.component-body>
    {children rendered here}
  </div>
  <footer.component-actions>
    <button.primary> {primaryAction} </button>
    <button.secondary> {secondaryAction} </button>
  </footer>
</div>
```

INTERACTIONS
| User Action | Element | Handler | Result |
|------------|---------|---------|--------|
| Click | primary button | handlePrimary | [what happens] |
| Hover | card | - | [visual change] |
| Drag | card | handleDragStart | [behavior] |

LIFECYCLE
- On mount: [what happens]
- On update: [what re-renders]
- On unmount: [cleanup]

EDGE CASES
- Empty state: [what shows when no data]
- Overflow: [what happens with too much content]
- Loading: [what shows while waiting]
- Error: [what shows on failure]
```

---

### PROMPT D: "The Integration Contract"
*Use when connecting components, APIs, or systems together.*

```
Define the integration contract between [System A] and [System B]:

INTERFACE DEFINITION
```
Direction: A → B (or bidirectional)

Endpoint/Method: [URL, function name, event name]

Request Format:
{
  "field": "type — description",
  "field": "type — description"
}

Response Format:
{
  "field": "type — description",
  "field": "type — description"
}

Error Format:
{
  "error": "string — error code",
  "message": "string — human readable",
  "retry": "boolean — safe to retry?"
}
```

TIMING
- Request timeout: [Xms]
- Retry policy: [X attempts, Y delay, backoff strategy]
- Rate limit: [X requests per Y period]

AUTHENTICATION
- Method: [API key / OAuth / session / none]
- Where: [header / query param / body]

FAILURE MODES
| Scenario | A Does | B Does | User Sees |
|----------|--------|--------|-----------|
| B is down | [action] | - | [message] |
| Bad data | [action] | [action] | [message] |
| Timeout | [action] | - | [message] |
| Auth fail | [action] | [action] | [message] |

Now build [which side] following this contract exactly.
```

---

## LAYER 2: VISUAL DESIGN CONTROL

### PROMPT E: "The Design System Declaration"
*Use ONCE to establish your visual language. Reference it in every future prompt.*

```
Establish a design system for [application name] with these exact specs.
Output this as a CSS variables block I can paste into any file, plus a
reference guide.

## COLORS
Define each color with its EXACT hex value and usage rule:

Primary palette:
- Background (base): #[hex] — used for [where]
- Background (elevated): #[hex] — used for [where]
- Background (sunken): #[hex] — used for [where]
- Text (primary): #[hex] — used for [where]
- Text (secondary): #[hex] — used for [where]
- Text (muted): #[hex] — used for [where]
- Border (default): #[hex] — used for [where]
- Border (strong): #[hex] — used for [where]

Accent palette:
- Accent (primary): #[hex] — used for [where]
- Accent (hover): #[hex] — used for [where]
- Accent (active): #[hex] — used for [where]

Semantic palette:
- Success: #[hex]
- Warning: #[hex]
- Error: #[hex]
- Info: #[hex]

## TYPOGRAPHY
- Font stack: [exact fonts with fallbacks]
- Scale (use this exact progression):
  | Name | Size | Weight | Line-height | Letter-spacing | Used for |
  |------|------|--------|-------------|----------------|----------|
  | display | Xpx | [wt] | [lh] | [ls] | [where] |
  | heading-1 | Xpx | [wt] | [lh] | [ls] | [where] |
  | heading-2 | Xpx | [wt] | [lh] | [ls] | [where] |
  | heading-3 | Xpx | [wt] | [lh] | [ls] | [where] |
  | body | Xpx | [wt] | [lh] | [ls] | [where] |
  | body-small | Xpx | [wt] | [lh] | [ls] | [where] |
  | caption | Xpx | [wt] | [lh] | [ls] | [where] |
  | mono | Xpx | [wt] | [lh] | [ls] | [where] |

## SPACING
Use this scale ONLY (no arbitrary values):
| Token | Value | Used for |
|-------|-------|----------|
| space-xs | Xpx | [where] |
| space-sm | Xpx | [where] |
| space-md | Xpx | [where] |
| space-lg | Xpx | [where] |
| space-xl | Xpx | [where] |
| space-2xl | Xpx | [where] |

## BORDERS & RADIUS
- Border width: [Xpx]
- Border radius scale: [none | sm: Xpx | md: Xpx | lg: Xpx | full: 9999px]
- Default radius for cards: [which token]
- Default radius for buttons: [which token]
- Default radius for inputs: [which token]

## SHADOWS
| Name | Value | Used for |
|------|-------|----------|
| shadow-sm | [value] | [where] |
| shadow-md | [value] | [where] |
| shadow-lg | [value] | [where] |
| shadow-glow | [value] | [accent glow effect] |

## TRANSITIONS
- Default duration: [Xms]
- Default easing: [curve]
- Hover transitions: [which properties, duration, easing]
- Layout transitions: [which properties, duration, easing]
- Entrance animations: [which properties, duration, easing, delay pattern]

## Z-INDEX SCALE
| Layer | Value | Used for |
|-------|-------|----------|
| base | 0 | default content |
| dropdown | [X] | menus, popovers |
| sticky | [X] | fixed headers |
| modal | [X] | overlays |
| toast | [X] | notifications |
| tooltip | [X] | tooltips |

Output as:
1. A :root CSS variables block
2. A utility class set for each token
3. A one-page reference card I can keep open while working
```

**Example — OpenClaw Dark Ops Theme:**
```
Establish a design system for OpenClaw Command Center:

COLORS:
Primary palette:
- Background (base): #0a0e17 — main app background, deep near-black navy
- Background (elevated): #111827 — cards, panels, raised surfaces
- Background (sunken): #060910 — inset areas, code blocks, recessed panels
- Text (primary): #e2e8f0 — main readable text, high contrast on dark
- Text (secondary): #94a3b8 — labels, descriptions, supporting text
- Text (muted): #475569 — disabled text, timestamps, tertiary info
- Border (default): #1e293b — subtle separation lines
- Border (strong): #334155 — emphasized borders, active states

Accent palette:
- Accent (primary): #f59e0b — amber, command authority, primary actions
- Accent (hover): #fbbf24 — lighter amber on hover
- Accent (active): #d97706 — darker amber on press

Semantic palette:
- Success: #10b981 — emerald, confirmed/approved
- Warning: #f59e0b — amber (shared with accent intentionally)
- Error: #ef4444 — red, failures, denials
- Info: #3b82f6 — blue, informational, neutral alerts

TYPOGRAPHY:
- Font stack: 'JetBrains Mono', 'Fira Code', monospace (operations aesthetic)
- Display/headings: 'Inter', 'SF Pro', system-ui (clean contrast to mono body)
```

---

### PROMPT F: "The Layout Controller"
*Use when you need exact control over how elements are positioned.*

```
Build the layout for [page/component] with these exact specifications:

GRID SYSTEM:
- Type: [CSS Grid / Flexbox / both]
- Columns: [count, sizes — e.g., "12-column, each 1fr" or "sidebar 280px, main 1fr, aside 320px"]
- Rows: [auto / fixed heights / template]
- Gap: [exact value using design system tokens]
- Max content width: [value]
- Edge padding: [value]

RESPONSIVE BREAKPOINTS:
| Breakpoint | Width | Layout Changes |
|-----------|-------|----------------|
| mobile | < Xpx | [what changes — stack, hide, resize] |
| tablet | X-Ypx | [what changes] |
| desktop | > Ypx | [default layout] |
| wide | > Zpx | [optional: what happens on ultrawide] |

ELEMENT PLACEMENT:
Draw an ASCII layout map at each breakpoint:

Desktop (>1024px):
┌──────────────────────────────────────────────┐
│ HEADER (full width, fixed height: Xpx)       │
├────────┬─────────────────────┬───────────────┤
│SIDEBAR │     MAIN CONTENT    │   RIGHT PANEL │
│ Xpx    │     flex: 1         │    Xpx        │
│ sticky │     scrollable      │   scrollable  │
│        │                     │               │
├────────┴─────────────────────┴───────────────┤
│ FOOTER (full width, height: Xpx)             │
└──────────────────────────────────────────────┘

Mobile (<768px):
┌──────────────────┐
│ HEADER (sticky)  │
├──────────────────┤
│                  │
│   MAIN CONTENT   │
│   (full width)   │
│                  │
├──────────────────┤
│ BOTTOM NAV       │
└──────────────────┘

OVERFLOW BEHAVIOR:
- Horizontal overflow: [hidden / scroll / visible]
- Vertical overflow per section: [specify for each]
- When content exceeds viewport: [what scrolls, what stays fixed]

ALIGNMENT RULES:
- Text alignment: [left / center / justify — per context]
- Vertical alignment of items in rows: [top / center / baseline]
- How to handle uneven content heights: [stretch / align-start / etc.]

Build this layout with the exact CSS, showing each breakpoint.
```

---

### PROMPT G: "The Component Styler"
*Use when you need exact visual control over a specific element.*

```
Style [component name] with these exact visual specifications:

DIMENSIONS:
- Width: [exact value or range: min/max]
- Height: [exact value or auto]
- Padding: [top right bottom left — use design tokens]
- Margin: [top right bottom left — use design tokens]

SURFACE:
- Background: [color token or gradient definition]
- Border: [width] [style] [color token]
- Border-radius: [token]
- Box-shadow: [token]
- Backdrop-filter: [if any, e.g., blur(Xpx)]
- Opacity: [if not 1]

TYPOGRAPHY (for text within):
- Font: [token from design system]
- Size: [token]
- Weight: [token]
- Color: [token]
- Line-height: [token]
- Text-transform: [none / uppercase / capitalize]
- Text-overflow: [clip / ellipsis + max lines]

STATES — define each visual state:
| State | Background | Border | Text Color | Shadow | Other |
|-------|-----------|--------|-----------|--------|-------|
| Default | [value] | [value] | [value] | [value] | |
| Hover | [value] | [value] | [value] | [value] | cursor: pointer |
| Active/Press | [value] | [value] | [value] | [value] | transform: scale(0.98) |
| Focus | [value] | [value] | [value] | [value] | outline: [spec] |
| Disabled | [value] | [value] | [value] | [value] | opacity: 0.5 |
| Loading | [value] | [value] | [value] | [value] | [animation] |
| Error | [value] | [value] | [value] | [value] | |
| Selected | [value] | [value] | [value] | [value] | |

TRANSITIONS between states:
- Properties that animate: [list, e.g., background, border-color, transform]
- Duration: [ms]
- Easing: [curve]
- Delay: [if any]

NESTED ELEMENTS:
For each child element within this component:
- [child name]: [position, size, spacing, color rules]
- [child name]: [position, size, spacing, color rules]

Build the complete CSS for this component matching every specification.
Show HTML structure alongside the CSS so I can see how they connect.
```

---

### PROMPT H: "The Animation Choreographer"
*Use when you need precise control over motion and transitions.*

```
Define the animation behavior for [component/page/interaction]:

ENTRANCE ANIMATIONS (when elements first appear):
| Element | Animation | Duration | Delay | Easing |
|---------|-----------|----------|-------|--------|
| [name] | [type: fade, slide, scale, etc.] | [ms] | [ms] | [curve] |
| [name] | [type] | [ms] | [ms] | [curve] |

Stagger pattern: [e.g., "each element delayed +50ms from previous"]
Direction: [e.g., "all elements enter from left" or "radiate from center"]

STATE TRANSITIONS (when something changes):
| From State | To State | What Animates | Duration | Easing |
|-----------|----------|---------------|----------|--------|
| [state] | [state] | [properties] | [ms] | [curve] |

MICRO-INTERACTIONS (hover, click, drag):
| Trigger | Element | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| hover | [el] | [e.g., translateY(-2px) + shadow increase] | [ms] | [curve] |
| click | [el] | [e.g., scale(0.95) then back] | [ms] | [curve] |
| drag | [el] | [e.g., opacity 0.7 + rotate(2deg)] | [ms] | [curve] |

LOADING ANIMATIONS:
- Skeleton screens: [describe the placeholder pattern]
- Progress indicators: [type, color, position]
- Content replacement: [how skeleton becomes real content]

SCROLL-BASED ANIMATIONS:
| Scroll Position | Element | Effect |
|----------------|---------|--------|
| [when visible] | [el] | [what happens] |

PERFORMANCE CONSTRAINTS:
- Only animate: transform, opacity (GPU-accelerated)
- Use will-change on: [specific elements that animate frequently]
- Reduce motion: [what happens when prefers-reduced-motion is set]
- Max simultaneous animations: [count]

EASING REFERENCE (define your custom curves):
| Name | Value | Used For |
|------|-------|----------|
| ease-default | cubic-bezier(X,X,X,X) | most transitions |
| ease-bounce | cubic-bezier(X,X,X,X) | playful interactions |
| ease-snap | cubic-bezier(X,X,X,X) | quick state changes |
| ease-smooth | cubic-bezier(X,X,X,X) | page transitions |

Build all animations as CSS @keyframes and transition declarations.
Include the JS trigger logic for scroll-based and interaction-based animations.
```

---

## LAYER 3: COMBINING BOTH LAYERS

### PROMPT I: "The Full Application Specification"
*The master prompt. Use when starting a new application or major feature from scratch.*

```
Build [application/feature name] from this complete specification.
Follow every section precisely. Ask before deviating from any spec.

━━━ SECTION 1: PURPOSE ━━━
What this is: [one sentence]
Who uses it: [user description]
Core task: [the #1 thing a user does here]
Success metric: [how we know it's working]

━━━ SECTION 2: OPERATIONAL ARCHITECTURE ━━━
[Use Prompt B: The Structural Mandate — paste your structural rules]

━━━ SECTION 3: DESIGN SYSTEM ━━━
[Use Prompt E: The Design System Declaration — paste your design tokens]

━━━ SECTION 4: PAGE LAYOUT ━━━
[Use Prompt F: The Layout Controller — paste your layout spec]

━━━ SECTION 5: COMPONENT INVENTORY ━━━
List every component needed:
| # | Component | Purpose | Contains | Receives | Emits |
|---|-----------|---------|----------|----------|-------|
| 1 | [name] | [why] | [children] | [props/data] | [events] |
| 2 | [name] | [why] | [children] | [props/data] | [events] |

For the 3 most complex components, include full specs using Prompt G.

━━━ SECTION 6: INTERACTIONS ━━━
User flow map:
```
[Start] → [Action 1] → [Decision?]
                            ├── Yes → [Action 2a] → [Result A]
                            └── No  → [Action 2b] → [Result B]
```

━━━ SECTION 7: ANIMATIONS ━━━
[Use Prompt H: The Animation Choreographer — paste your motion spec]

━━━ SECTION 8: EDGE CASES ━━━
| Scenario | Expected Behavior |
|----------|------------------|
| No data / empty state | [what shows] |
| Single item | [how it looks] |
| Maximum items (100+) | [how it handles] |
| Very long text in any field | [truncation rules] |
| Network failure mid-operation | [what happens] |
| User navigates away during async op | [what happens] |
| Browser back button | [what happens] |
| Multiple rapid clicks | [debounce rules] |

━━━ SECTION 9: DELIVERY FORMAT ━━━
- File structure: [single file / multi-file / specific structure]
- Comments: [inline for non-obvious logic / section headers / none]
- Code style: [specific formatter rules]
- Output includes: [code + documentation + testing notes]

Build this now. Start with Section 2 (architecture), then Section 3
(design system CSS), then Section 4 (layout), then components in
dependency order (components with no children first, working up).
```

---

## QUICK-DRAW PROMPTS

Short prompts for when you need fast control without a full spec:

### Lock Down Colors
```
Use ONLY these colors in the entire output. No other hex values:
Background: #0a0e17 | Surface: #111827 | Border: #1e293b
Text: #e2e8f0 | Muted: #94a3b8 | Accent: #f59e0b | Error: #ef4444
Map every element to one of these. If you need a shade, use
opacity (rgba) on an existing color — do NOT introduce new hex values.
```

### Lock Down Spacing
```
Use ONLY these spacing values. No arbitrary pixel values anywhere:
4px | 8px | 12px | 16px | 24px | 32px | 48px | 64px
Every margin, padding, and gap must be one of these exact values.
```

### Lock Down Typography
```
Use ONLY this type scale:
- 11px/400 — captions, timestamps
- 13px/400 — body text, descriptions
- 13px/600 — labels, small headings
- 16px/600 — section headings
- 20px/700 — page headings
- 28px/700 — display, hero text
Font: 'JetBrains Mono' for data, 'Inter' for UI text.
No other sizes. No other weights.
```

### Lock Down Layout
```
This layout uses CSS Grid. The grid is:
- 3 columns: 260px | 1fr | 320px
- Header: 56px fixed height, full width, position sticky
- Sidebar: full height, scrolls independently
- Main: scrolls independently, padding 24px
- Right panel: collapsible, 320px when open, 0 when closed
Do not use flexbox for the page-level layout. Grid only.
Flexbox is allowed INSIDE individual components.
```

### Lock Down State Visuals
```
Every interactive element must show ALL of these states:
- Default: [your spec]
- Hover: background lightens 8%, cursor pointer, transition 150ms
- Active: scale(0.97), background darkens 5%
- Focus: 2px solid accent outline, 2px offset
- Disabled: opacity 0.4, cursor not-allowed, no hover effect
- Loading: pulse animation on background, text replaced with skeleton
No element should be missing any state. Check every button, link,
card, and input against this list before delivering.
```

### Lock Down Responsive
```
Three breakpoints, no exceptions:
- Mobile: < 768px — single column, bottom nav, no sidebar
- Tablet: 768-1199px — two columns, sidebar collapses to icons
- Desktop: ≥ 1200px — full layout as designed
At each breakpoint transition, elements reflow — never overlap,
never overflow, never hide content without a way to access it.
```

---

## THE ENFORCEMENT PROMPT

Use this AFTER receiving any output to verify it followed your specs:

```
Audit the output above against my specifications:

CHECK 1 — COLOR COMPLIANCE
List every hex/rgb/hsl color value used. Flag any that are NOT
in my approved palette. Show line numbers.

CHECK 2 — SPACING COMPLIANCE
List every margin, padding, and gap value. Flag any that are NOT
in my approved spacing scale. Show line numbers.

CHECK 3 — TYPOGRAPHY COMPLIANCE
List every font-size, font-weight, and font-family used. Flag any
that are NOT in my approved type scale. Show line numbers.

CHECK 4 — STATE COVERAGE
For every interactive element, confirm these states exist:
default, hover, active, focus, disabled. List any missing states.

CHECK 5 — STRUCTURAL COMPLIANCE
Confirm the code organization follows my architectural rules.
Flag any deviation from the specified patterns.

CHECK 6 — RESPONSIVE COMPLIANCE
Confirm all breakpoints are implemented. Check for horizontal
overflow at each breakpoint. Flag any missing responsive rules.

VERDICT: COMPLIANT / [X] VIOLATIONS FOUND
If violations found, fix every one and deliver the corrected output.
```

---

## WORKFLOW: How to Use These Together

```
STARTING A NEW PROJECT:
1. Define your design system ONCE (Prompt E) → save as reference file
2. Define your architecture rules ONCE (Prompt B) → save as reference file
3. For each new feature/page:
   a. Paste your saved design system + architecture rules
   b. Add the specific layout (Prompt F)
   c. Add component specs (Prompt C/G) for complex elements
   d. Add animation specs (Prompt H) if needed
   e. Build
   f. Run the Enforcement Prompt to verify compliance
   g. Iterate on violations

MODIFYING EXISTING WORK:
1. Paste existing code
2. Paste your design system + architecture rules
3. Say: "Modify [what] to add [feature]. Follow my design system
   and architecture rules exactly. Do not change any existing
   styling or structure that isn't directly related to the new feature."
4. Run Enforcement Prompt on the output

THE KEY RULE:
Your design system and architecture rules are SAVED DOCUMENTS.
You paste them at the start of every conversation.
The AI follows them like a contractor follows blueprints.
```
