# FORGED FINANCIAL — COMMAND CENTER V7
## Ultimate Prompt Library for Building a Jaw-Dropping UI

---

## HOW TO USE THIS DOCUMENT

Each prompt below is a self-contained instruction you can paste directly into an AI coding assistant (Claude, Cursor, etc.) to generate that specific component or feature. They're ordered in a logical build sequence — foundation first, then layers of increasing sophistication. Customize names, colors, and data fields to match your brand.

---

## PHASE 1: FOUNDATION & LAYOUT ARCHITECTURE

### Prompt 1 — Core Shell & Navigation Spine

> Build me a React + Tailwind command center dashboard shell. The layout should have: a collapsible left sidebar (64px collapsed / 260px expanded) with frosted glass effect (backdrop-blur-xl, semi-transparent dark background), a top command bar with a global search input that supports slash-commands (e.g., /goto, /search, /deploy), and a main content area that uses CSS Grid with resizable panels. The sidebar should have animated icon-to-label transitions using Framer Motion. Include a bottom status bar showing: connection status (green pulse dot), current user, local time with seconds ticking live, and system uptime. Color palette: deep navy (#0a0e1a) base, electric blue (#00d4ff) accents, subtle purple (#7c3aed) highlights. All corners rounded-2xl, all panels with subtle 1px border of rgba(255,255,255,0.05).

### Prompt 2 — Drag-and-Drop Widget Grid

> Create a drag-and-drop dashboard grid system using react-grid-layout. Each widget should be a self-contained card with: a frosted glass header bar containing the widget title, a minimize/maximize/close button cluster (like a mini window manager), and a subtle grip handle for dragging. When dragging, the widget should lift with a box-shadow glow effect and other widgets should smoothly reorganize. Include a "+" button that opens a widget catalog modal where users can browse available widgets by category (Finance, Analytics, Communication, System, Custom) and drag them onto the grid. Persist layout to localStorage and allow users to save/load named layout profiles (e.g., "Trading Floor", "Executive Overview", "Deep Focus").

### Prompt 3 — Theming Engine with Live Preview

> Build a theming system with a slide-out panel that lets users customize the entire command center in real time. Include: preset themes (Midnight Operator, Arctic Frost, Cyber Noir, Forge Red, Terminal Green), a full color picker for primary/secondary/accent/background/text colors, blur intensity slider, border opacity slider, animation speed control (0.5x to 2x), font selector (Inter, JetBrains Mono, Space Grotesk, Fira Code), and corner radius control. Changes should apply instantly via CSS custom properties. Include an "Export Theme" button that generates a shareable JSON config and an "Import Theme" button. Add a "Randomize" button that generates aesthetically coherent random themes using color theory (complementary, analogous, triadic).

---

## PHASE 2: DATA VISUALIZATION & REAL-TIME FEEDS

### Prompt 4 — Real-Time Financial Ticker Ribbon

> Create an auto-scrolling ticker ribbon across the top of the dashboard showing live financial data. Each ticker item displays: symbol, current price, change amount, change percentage (green up-arrow or red down-arrow), and a tiny inline sparkline (last 24 data points). The ribbon should scroll smoothly with CSS animation, pause on hover to let users read, and clicking any ticker opens a detailed popover with a larger chart, volume, 52-week range, and quick-action buttons (Set Alert, Add to Watchlist, Open Research). Include a settings gear to choose which tickers to display from a searchable list. Simulate realistic data with randomized price movements using a WebSocket mock.

### Prompt 5 — Multi-Chart Analytics Panel

> Build an analytics panel that can display multiple chart types using Recharts or D3.js. Include a chart-type selector toolbar: Line, Area, Candlestick, Bar, Heatmap, Treemap, Radar, and Sankey. Each chart should have: animated entrance transitions, crosshair cursor with tooltip showing all data points at that position, zoomable time axis (scroll to zoom, drag to pan), time range selector buttons (1H, 4H, 1D, 1W, 1M, 3M, 1Y, ALL), drawing tools overlay (trend line, horizontal line, fib retracement — stored in state), and a "Compare" mode where users can overlay multiple datasets with independent Y-axes. Include a screenshot button that captures the chart to clipboard as PNG.

### Prompt 6 — Live Activity Stream with Smart Filtering

> Create a real-time activity feed panel that displays events as they happen. Each event card should show: timestamp, event type icon (transaction, alert, login, deployment, error, message), severity level (color-coded left border), title, description preview (expandable), and source system badge. Include smart filters at the top: severity chips (Critical, Warning, Info, Debug), source filters, date range, and a natural-language search bar that can parse queries like "errors from last 2 hours" or "transactions over $10k". Add infinite scroll with virtualized rendering (react-window) for performance. Include a "Focus Mode" toggle that only shows Critical and Warning events with an ambient red/orange pulse on the panel border.

### Prompt 7 — 3D Globe Visualization

> Build a WebGL 3D rotating globe using Three.js or Globe.gl that shows real-time activity by geographic location. Each event appears as a glowing arc from origin to destination with color indicating type (blue = transaction, green = login, red = alert, gold = high-value). The globe should have: subtle atmosphere glow, country borders drawn with thin luminous lines, click-to-zoom on any country showing a detail panel, data point clustering at low zoom with expansion at high zoom, day/night terminator line, and small pulsing dots at active locations. Include a 2D flat-map toggle for accessibility. Connection arcs should animate from source to destination with a trailing particle effect.

---

## PHASE 3: COMMUNICATION & COLLABORATION

### Prompt 8 — Integrated Command Terminal

> Build a fully functional embedded terminal emulator panel with: syntax-highlighted command output, autocomplete dropdown for known commands (Tab to accept), command history (Up/Down arrows), multiple tabs for parallel sessions, a built-in command palette listing all custom commands with descriptions, and custom command registration (e.g., /deploy staging, /report daily, /alert set BTC > 100000). The terminal should support split-pane (horizontal/vertical) like tmux. Include output piping — typing "| chart" after a data command renders the output as a chart instead of text. Add a "Record Macro" button that captures a sequence of commands and lets users replay them with one click.

### Prompt 9 — Notification Center with Intelligence

> Create a notification center accessible from a bell icon in the top bar. When clicked, it slides out a panel with grouped notifications: categorized by type, with unread count badges. Each notification has: priority level (P0-P4), timestamp with "2 min ago" relative formatting, action buttons (Acknowledge, Snooze 1hr, Escalate, Dismiss), and a "Related" section showing linked notifications. Include notification rules: users can create rules like "If CPU > 90% for 5 min, send P1 to #ops-channel and play alert sound." Add a Do Not Disturb mode with scheduling (e.g., DND from 10pm-8am weekdays). Unacknowledged P0 notifications should cause the header bar to subtly pulse red.

### Prompt 10 — Team Presence & Quick Chat

> Build a team presence sidebar widget showing team members with: avatar, name, status indicator (Online/green, Away/yellow, DND/red, Offline/gray), current activity label ("Reviewing Q4 Report", "In Meeting until 3pm"), and local time. Clicking a team member opens an inline chat thread — messages appear in bubbles with read receipts and typing indicators. Include @mentions with autocomplete, within chat (/task, /remind, /share-screen), message reactions (emoji picker), file/image sharing with preview, and pinned messages. Add a "Broadcast" mode for sending announcements to all team members.

---

## PHASE 4: OPERATIONAL INTELLIGENCE

### Prompt 11 — System Health Monitor with Animated Gauges

> Create a system health dashboard with animated gauges and meters. Include: circular progress gauges for CPU, Memory, Disk, Network (smooth animated fills with gradient colors that shift from green to yellow to red), a server rack visualization showing each server as a small colored block (green = healthy, yellow = degraded, red = down, gray = maintenance) in a grid, uptime percentage with 99.99% style display, response time histogram (last 1000 requests), active connections counter with sparkline, and error rate with trend arrow. Each gauge should have a click-to-drill-down that shows historical data and anomaly highlights. Add a "Health Score" — a single 0-100 number computed from all metrics with an animated radial progress ring.

### Prompt 12 — AI-Powered Insights Panel

> Build an AI insights panel that surfaces smart observations. Display cards like: "Revenue is 23% above forecast this quarter — driven primarily by Enterprise segment (+41%)", "Unusual login pattern detected: 3 logins from new IP ranges in the last hour", "Deployment frequency increased 2x this month vs. last — zero rollbacks." Each insight card has: an AI confidence indicator (bar), source data references (clickable to drill down), suggested actions (buttons), thumbs up/down feedback, and a "deep dive" expander that shows the AI's reasoning chain. Include a prompt bar at the bottom where users can ask questions like "Why did churn increase in January?" and get AI-generated answers with cited data.

### Prompt 13 — KPI Scoreboard with Targets

> Create a KPI scoreboard section that displays key metrics in large, bold typography. Each KPI shows: metric name, current value (animated counting up on load), comparison vs. target (progress bar underneath), trend direction with percentage change, sparkline of last 30 days, and a status icon (on-track checkmark, at-risk warning, off-track X). Include conditional formatting — the entire KPI card subtly glows green/yellow/red based on status. Users can click any KPI to set/edit targets, add notes, and configure alert thresholds. Include a "Presentation Mode" button that cycles through KPIs one at a time on a full-screen display with smooth transitions — perfect for wall-mounted monitors.

---

## PHASE 5: WORKFLOW & AUTOMATION

### Prompt 14 — Visual Workflow Builder (Node-Based)

> Build a node-based visual workflow/automation builder using React Flow. Users can drag trigger nodes (Schedule, Webhook, Event, Manual), action nodes (Send Email, API Call, Database Query, Slack Message, Generate Report), logic nodes (If/Else, Switch, Loop, Delay, Filter), and connect them with animated flowing edges. Each node should have: a config panel on click (slide-in from right), input/output type validation (green = compatible, red = incompatible connection), execution status indicators during runs (gray = pending, blue spinner = running, green = success, red = error with message tooltip), and mini data previews at each step. Include a "Test Run" button that executes the flow with sample data and shows results at each node. Add version history with visual diffs.

### Prompt 15 — Task Board with Kanban + Timeline Views

> Create a task management system with dual views: Kanban board and Timeline (Gantt). The Kanban view has customizable columns, drag-and-drop cards with: priority flag, assignee avatar, due date with overdue highlighting, tag chips, progress indicator, and subtask checklist preview. The Timeline view shows tasks as horizontal bars on a time axis with: dependency arrows, critical path highlighting, drag to resize/move, and milestone diamonds. Both views sync — moving a card in Kanban updates the Timeline. Include quick-add (Ctrl+N), bulk operations (select multiple cards), and a "My Focus" filtered view showing only the logged-in user's tasks sorted by priority and due date.

### Prompt 16 — Scheduled Reports & Export Engine

> Build a report configuration panel where users can: choose data sources (checkboxes for each module), select time range (preset or custom), choose format (PDF, Excel, CSV, Dashboard Snapshot PNG), set delivery method (Email, Slack, Download, S3 Upload), configure schedule (Once, Daily, Weekly, Monthly with cron-like precision), add recipients, and preview the report before scheduling. Include a report history list showing past runs with status (Delivered, Failed, Pending) and one-click re-run. Add a "Report Builder" mode where users can drag data blocks (tables, charts, text, KPI cards) onto a WYSIWYG canvas to design custom report layouts. Save report templates for reuse.

---

## PHASE 6: SECURITY & ACCESS

### Prompt 17 — Security Dashboard with Threat Map

> Create a security operations panel showing: a world map with real-time threat indicators (pulsing red dots at attack origin points with arcs to your infrastructure), a threat level meter (DEFCON style — 5 levels with current status and auto-escalation rules), recent security events log (failed logins, blocked IPs, vulnerability scans, permission changes), an active sessions list showing all logged-in users with IP, device, location, and a "Terminate Session" button, and a firewall rules table with toggle switches for quick enable/disable. Include an anomaly detection visual — a baseline pattern overlay with current traffic, highlighting deviations in red. Add an "Incident Response" button that activates a predefined checklist and starts a timer.

### Prompt 18 — Role-Based Access Control Manager

> Build an RBAC management interface with: a visual role hierarchy tree (drag to reorganize), permission matrix (roles as columns, permissions as rows, checkboxes at intersections with inheritance indicators), user-to-role assignment with search and bulk operations, an audit log showing every permission change with who/what/when, and a "Test Permissions" simulator where admins can select a user and see exactly what they can and cannot access. Include a "Policy Diff" view that shows what changes when a role is modified (who gains/loses access to what). Add emergency controls: a "Lockdown Mode" that restricts all non-admin access with one click, and a "Break Glass" mechanism requiring multi-admin approval.

---

## PHASE 7: PERSONALIZATION & EXPERIENCE

### Prompt 19 — Onboarding Tutorial & Guided Tours

> Build an interactive onboarding system that activates on first login. Display a welcome modal with the user's name, then launch a step-by-step guided tour using tooltip spotlights that highlight each major UI element with: a description, a "Try It" interactive prompt (e.g., "Click here to add a widget"), progress dots at the bottom, and skip/back/next controls. After the tour, show a "Quick Setup" wizard: choose your role (Executive, Analyst, Operator, Developer), pick a starting layout template, connect integrations (show logos with connect buttons), and set notification preferences. Store completion status so returning users see a "What's New" changelog modal instead.

### Prompt 20 — Keyboard Shortcut System with Cheat Sheet

> Implement a comprehensive keyboard shortcut system. Include: global shortcuts (Ctrl+K = command palette, Ctrl+/ = shortcut cheat sheet overlay, Ctrl+Shift+F = global search, Ctrl+1-9 = switch between saved layouts, Esc = close any modal/panel), widget shortcuts (arrow keys to navigate between widgets, Enter to focus, Ctrl+M = minimize, Ctrl+Shift+M = maximize), navigation shortcuts (G then D = go to dashboard, G then S = settings, G then T = terminal, G then R = reports), and a fully searchable shortcut cheat sheet modal. Include a shortcut customization panel where users can rebind any key combination. Display active shortcut hints as subtle badges on UI elements when holding Alt.

### Prompt 21 — Voice Command Integration

> Add a voice command system activated by a microphone button or hotword ("Hey Command Center"). Implement using the Web Speech API. Support commands like: "Show me revenue for Q4", "Open the terminal", "Set alert when Bitcoin drops below 60,000", "Navigate to security dashboard", "Zoom into Europe on the globe", "Start focus mode", "Read me the latest critical alerts." Display a voice waveform animation while listening, show the recognized text in real-time with confidence score, and highlight the UI element being targeted before executing. Include a voice command log showing what was heard vs. what was executed, and a training mode where users can add custom voice commands mapped to actions.

### Prompt 22 — Ambient Sound & Focus Mode

> Create a "Focus Mode" feature: when activated, the UI transforms — non-essential panels fade to 20% opacity, the primary workspace expands to fill the screen, a subtle ambient background animation plays (slowly drifting particles, gentle gradient shifts, or a calm audio-reactive waveform), notification sounds switch to gentle chimes, and a Pomodoro timer appears in the corner (25 min work / 5 min break with progress ring). Include optional ambient sound mixer: rain, coffee shop, white noise, lo-fi beats — each with volume sliders. Add a "Deep Work" log that tracks time spent in focus mode with daily/weekly summaries. Focus mode keyboard shortcut: Ctrl+Shift+Z.

---

## PHASE 8: ADVANCED & "WOW FACTOR" FEATURES

### Prompt 23 — Augmented Reality Data Overlay (WebXR)

> Using WebXR API, create an experimental AR mode that can be activated on mobile devices or VR headsets. When activated, dashboard widgets float in 3D space around the user. Users can: grab and position widgets by air-tapping, resize by pinching, dismiss by swiping, and arrange them in a curved panoramic layout. Real-time data streams display as holographic floating numbers. Include a "Data Rain" effect where new data points fall from above like Matrix-style rain but with actual values. Add spatial audio — critical alerts come from the direction of their widget. Show a disclaimer that this feature is experimental.

### Prompt 24 — Predictive Command Autocomplete

> Build an intelligent command system that learns from user behavior. The command bar should: predict the next likely command based on time of day and past patterns (e.g., at 9am it suggests "Open Morning Report"), offer contextual suggestions based on current view (e.g., while on finance dashboard, suggest financial commands first), show a "Quick Actions" row of the 5 most-used commands as icon buttons, support natural language input ("show me how we're doing this month" maps to the monthly KPI view), and auto-chain commands (detecting "Generate report and email it to the team" as two sequential actions). Display prediction confidence as a subtle fill bar behind each suggestion. Include a learning reset button if suggestions get stale.

### Prompt 25 — Collaborative Cursors & Live Co-Viewing

> Implement real-time collaboration features using WebSockets. When multiple users are on the command center simultaneously, show: other users' cursor positions as labeled colored dots (like Figma), a "Follow" button on each user's presence indicator that syncs your view to theirs, collaborative annotations — anyone can draw/highlight on any widget and others see it live (auto-fades after 30 seconds), a shared pointer mode for presentations ("Look here" with a spotlight effect), and live co-editing on notes, task descriptions, and workflow configurations with operational transforms for conflict resolution. Include a "Screen Share" toggle that broadcasts one user's exact viewport to others.

### Prompt 26 — Easter Egg: Konami Code Unlock

> Implement a hidden easter egg: entering the Konami Code (↑↑↓↓←→←→BA) triggers an over-the-top animation sequence — the entire UI briefly explodes into particles (using tsparticles), reforms with a neon synthwave theme, retro scan lines overlay, a brief 8-bit victory jingle plays, and a trophy notification appears: "You found the secret! 🏆 Achievement Unlocked: Master Operator." The synthwave theme persists as a selectable option in the theme picker afterward. Include 5 other hidden achievements: "Night Owl" (use the system after midnight 10 times), "Speed Demon" (execute 50 commands in under 5 minutes), "Data Junkie" (view every chart type in one session), "Commander" (customize every widget slot), and "Architect" (create and save 5 custom layouts).

### Prompt 27 — Cinematic Login Sequence

> Design a login page that feels like booting up a spaceship command center. On page load: a dark screen with a subtle scan line, then a glowing horizontal line expands from center, text "INITIALIZING COMMAND CENTER V7" types out character-by-character in monospace font, a progress bar fills with system-check labels flashing by ("Connecting Secure Channels... OK", "Loading Financial Modules... OK", "Syncing Real-Time Feeds... OK"), then the login form fades in over a dark animated mesh gradient background. After credentials, show a brief "IDENTITY VERIFIED — WELCOME BACK, COMMANDER [NAME]" message before the dashboard loads in with a smooth opacity + scale animation. Include a biometric prompt option (WebAuthn fingerprint/face).

### Prompt 28 — Adaptive AI Dashboard Layout

> Create an AI-powered layout manager that automatically rearranges the dashboard based on context. Rules engine: if it's Monday morning, surface the weekly summary widget prominently; if a critical alert fires, auto-expand the alert panel and minimize less-relevant widgets; if the user hasn't interacted in 5 minutes, switch to a calm ambient view with just key KPIs; when the user starts typing in the terminal, auto-minimize other panels to give it more space. Include a "Why this layout?" tooltip that explains the AI's reasoning. Users can approve/reject suggestions (training the model), and a "Lock Layout" toggle prevents any auto-changes. Show layout suggestions as ghost outlines the user can accept or dismiss.

---

## PHASE 9: INFRASTRUCTURE & PERFORMANCE

### Prompt 29 — Offline Mode with Service Worker

> Implement a robust offline mode using a Service Worker. When connection is lost: show a subtle amber status bar "Operating in Offline Mode — data may not be current", cache and serve the last-known state of all widgets, queue any user actions (commands, settings changes, notes) for replay when reconnected, show a sync queue counter with list of pending actions, and when reconnection happens, play a brief green flash "Back Online — Syncing 12 queued actions..." with a progress indicator. Include a manual "Force Sync" button and a "Work Offline" toggle for intentional disconnected use (e.g., airplane mode). Cache critical data (last 24hr of all feeds) using IndexedDB.

### Prompt 30 — Performance Monitor & Debug Panel

> Build a developer/admin debug panel (toggled with Ctrl+Shift+D) that shows: real-time FPS counter with graph (last 60 seconds), component render count heatmap (which widgets re-render most), WebSocket message throughput (messages/sec with graph), memory usage trend, API call log with response times (sortable, filterable), state tree inspector (like Redux DevTools), and a "Performance Score" that grades the current session A-F based on FPS, memory, and render efficiency. Include a "Simulate Load" button that stress-tests the dashboard with high-frequency data updates. Add an "Optimize" button that automatically reduces animation quality, disables non-essential effects, and lazy-loads off-screen widgets.

---

## PHASE 10: DATA INTEGRATION LAYER

### Prompt 31 — Universal API Connector

> Build a visual API integration manager. Users see a library of pre-built connectors (Stripe, QuickBooks, Plaid, Slack, GitHub, AWS CloudWatch, Google Analytics, Salesforce, HubSpot) as logo tiles. Clicking a tile opens a setup wizard: enter API key/OAuth flow, select which data to pull (checkboxes), set sync frequency (real-time, every 1/5/15/60 min), map fields to dashboard widgets (drag source → target), and test the connection with a live data preview. Include a "Custom API" builder where users enter a REST endpoint URL, headers, auth type, response mapping (JSONPath), and it generates a connector. Show a connection health dashboard with latency, error rates, and last-sync timestamps for all active integrations.

### Prompt 32 — Data Pipeline Visualizer

> Create a visual data pipeline monitoring screen. Show data flowing from sources (left side: APIs, databases, files, streams) through processing stages (middle: transform, validate, enrich, aggregate) to destinations (right side: dashboards, reports, alerts, storage). Each node shows: current throughput (records/sec), error count, last-run timestamp, and processing latency. Connections between nodes are animated flowing lines (speed represents throughput, color represents health). Clicking any node opens detailed logs and configuration. Include pipeline version history, rollback capability, and a "Replay" feature that re-processes historical data through an updated pipeline. Add a global "Pause All" emergency stop button.

---

## BONUS: MICRO-INTERACTION PROMPTS

### Prompt 33 — Hover & Click Micro-Animations

> Add micro-interactions throughout the command center: buttons have a subtle magnetic effect (cursor pulls them slightly toward the mouse), cards lift 2px with a soft shadow on hover, toggle switches have a satisfying snap animation with a subtle haptic-style bounce, loading states use skeleton screens with a shimmer gradient sweep, success actions show a brief confetti burst (tiny, tasteful — 20 particles), error states shake the element 3 times, number changes animate with a slot-machine rolling effect, and panel open/close uses a spring physics animation (slight overshoot then settle). All animations respect prefers-reduced-motion. Include a master "Animation Level" setting: None, Subtle, Standard, Extra.

### Prompt 34 — Sound Design System

> Create an audio feedback system for the command center. Map sounds to actions: soft click for button presses, subtle whoosh for panel open/close, gentle chime for successful operations, warning tone for alerts (escalating pitch for higher severity), typing sounds for terminal input (optional), ambient hum for connected state. All sounds should be short (<500ms), non-intrusive, and synthesized using the Web Audio API (no external files). Include a sound mixer panel: master volume, individual category volumes (UI, Alerts, Ambient, Communication), mute toggle, and sound theme selector (Minimal, Sci-Fi, Corporate, Mechanical). Default: muted — sounds opt-in only.

### Prompt 35 — Context-Aware Right-Click Menus

> Implement custom context (right-click) menus throughout the command center. The menu adapts based on what was clicked: on a widget → Refresh, Configure, Duplicate, Export Data, Share, Remove; on a chart data point → View Details, Set Alert at Value, Copy Value, Annotate; on a user avatar → View Profile, Send Message, Start Call, Share My Screen, View Activity; on the grid background → Add Widget, Paste Widget, Change Background, Reset Layout; on a table row → Copy Row, Edit, Delete, Export Selection, Create Alert from This. Menus should appear with a fast scale-up animation, support keyboard navigation, and show keyboard shortcut hints next to each item.

---

## USAGE NOTES

Recommended tech stack for these prompts:
- React 18+ with TypeScript
- Tailwind CSS + Framer Motion
- Recharts or D3.js for data viz
- React Flow for node-based editors
- Three.js / Globe.gl for 3D
- React-Grid-Layout for drag-and-drop
- TanStack Query for data fetching
- Zustand or Jotai for state management
- WebSocket or Socket.io for real-time data

Build order recommendation:
1. Prompts 1-3 (Foundation)
2. Prompts 4-7 (Data & Visualization)
3. Prompts 8-10 (Communication)
4. Prompts 11-13 (Intelligence)
5. Prompts 27, 19-20 (Login & Onboarding)
6. Prompts 14-16 (Workflow)
7. Prompts 29-30 (Infrastructure)
8. Prompts 31-32 (Data Integration)
9. Prompts 17-18 (Security)
10. Prompts 21-28 (Advanced & Wow Factor)
11. Prompts 33-35 (Polish & Micro-interactions)

---

*Built for Forged Financial — Command Center V7*
*35 prompts. One legendary system.*
