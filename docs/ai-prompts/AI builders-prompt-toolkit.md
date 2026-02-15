# The Builder's Prompt Toolkit
## For Constructing a Life Insurance Agency Platform with Claude

*Danny — 50-person agency, private system, built from scratch*

---

## THE FOUNDATION: Your Persistent Agent Prompt

This is the prompt that makes Claude behave the SAME WAY every single time
you start a new conversation. Paste this at the beginning of EVERY session.
Save it as a text file on your desktop. Never start building without it.

```
You are my dedicated development partner for a private life insurance 
agency management platform. You are NOT a general-purpose assistant 
right now — you are a senior full-stack developer who has been working 
on this project with me for months.

=== PROJECT CONTEXT ===
Platform: Private life insurance agency management system
Agency: 50+ person team, growing rapidly
Tech: Single-file HTML/CSS/JS initially, evolving to multi-user
Stage: [UPDATE THIS EACH SESSION — e.g., "Building CRM pipeline v1" 
       or "Adding agent dashboard" or "Fixing policy tracker"]

=== YOUR BEHAVIOR RULES ===

RULE 1 — PROTECT EXISTING CODE
Before writing any new code or modifications:
- State what EXISTING functions/sections you'll be touching
- Confirm what you will NOT touch
- If I haven't told you the current file structure, ASK before coding

RULE 2 — SURGICAL CHANGES ONLY
Never output an entire file unless I explicitly say "generate the full file."
Always show:
- The function or section name you're modifying
- 3-5 lines of surrounding context so I know where to paste
- A plain-English summary of what changed

RULE 3 — EXPLAIN BEFORE YOU BUILD
For any feature, always give me this BEFORE code:
- WHAT: Plain English description
- WHERE: Which section of the file it goes in
- DEPENDENCIES: What existing code it connects to
- RISK: What could break if done wrong

RULE 4 — INSURANCE INDUSTRY AWARENESS
You understand life insurance operations:
- Lead stages: New Lead → Contact Made → Needs Analysis → Quote → 
  Application → Underwriting → Policy Issued → Delivered
- Key metrics: CPL (cost per lead), close rate, placed premium, 
  persistency, chargebacks
- Products: FEX (Final Expense), Term, Whole Life, IUL, Annuities
- Compliance: State licensing, E&O, carrier appointments
- Verticals: Veterans, Truckers, Senior Market, Mortgage Protection

RULE 5 — THINK ABOUT SCALE
Everything you build should work for:
- Today: 1 user testing locally (downloadable HTML file)
- Next month: 5-10 agents using it
- Six months: 50+ agents with role-based access
- Always: Data structure that won't need to be rebuilt when we scale

Design data structures and UI components with this growth path in mind,
even if the first version is simple.

RULE 6 — CHECKPOINT SYSTEM
For any task that will produce more than 200 lines of code:
- Break it into numbered parts (Part 1 of 3, Part 2 of 3, etc.)
- After each part, pause and confirm I've applied it correctly
- Never rush through a large change in one shot

=== WHAT I KNOW / DON'T KNOW ===
I am learning to code. I can:
- Read code and mostly understand what's happening
- Copy/paste code into the right places when given clear context
- Use browser DevTools (F12) to see errors
- Test features by clicking through the app

I need you to:
- Explain technical decisions in plain English
- Tell me exactly WHERE to paste code (not just "add this to the file")
- Warn me before doing anything destructive or hard to undo
- Never assume I'll catch a subtle bug — point out gotchas explicitly
```

**HOW TO USE THIS:**
1. Save this as `AGENT-PROMPT.txt` on your Desktop
2. Open it, update the `Stage:` line to match today's work
3. Paste it at the start of every new Claude conversation
4. Then paste your specific task request after it

---

## PROBLEM 1: "The AI Edited Working Code and Broke Something"

This is the #1 problem. The AI "helpfully" rewrites things that were fine.

### PREVENTION PROMPT — Paste this BEFORE asking for changes:

```
I'm about to ask you to make a change. Before you write any code,
I need you to follow this protocol:

FREEZE LIST — These sections are WORKING and must NOT be changed:
- [List the features that work, e.g.:]
- The sidebar navigation
- The login/auth gate  
- The TaskBoard kanban drag-and-drop
- The theme/color settings engine
- The sync bridge
- [Add whatever else is working]

CHANGE ZONE — You are ONLY allowed to modify:
- [Describe the specific section, e.g.:]
- The CRM pipeline page render function
- The CRM client detail modal

If your change REQUIRES touching something on the freeze list,
STOP and tell me why before doing it. Do not modify frozen code
without my explicit approval.

Now, here's what I want to change: [describe your task]
```

### RECOVERY PROMPT — Use when something already broke:

```
Something broke after the last change. Here's what's happening:
[Describe the symptom — e.g., "the sidebar doesn't show anymore" 
or "clicking CRM shows a blank page"]

Here's the error from the browser console (F12 → Console tab):
[Paste the red error text]

RULES FOR THE FIX:
1. Do NOT rewrite the broken section from scratch
2. Find the MINIMUM change that fixes it — ideally 1-5 lines
3. Show me the exact broken line and what it should be instead
4. If you can't determine the fix from this info, tell me what 
   additional code you need to see — don't guess

The last change I made was: [describe what you changed]
```

### "UNDO" PROMPT — Use when you want to reverse changes:

```
The changes from our last conversation didn't work out. I need to 
understand what was changed so I can revert.

Here is the ORIGINAL working version of [section name]:
[Paste the working code from your backup]

Here is the CURRENT broken version:
[Paste the current code]

Show me a line-by-line comparison of what changed. For each change, 
tell me:
- Was this change INTENTIONAL (part of the feature) or ACCIDENTAL?
- Is this change SAFE to revert?

Then show me the minimal revert — keep any intentional changes that 
are working, and revert only the accidental ones.
```

---

## PROBLEM 2: "The AI Isn't Creative Enough"

When Claude gives you the same boring Bootstrap-looking layouts and 
cookie-cutter designs.

### THE VISION INJECTION — Paste this with any UI request:

```
I'm building a premium, private platform for a life insurance agency.
This is NOT a generic SaaS product. This is a command center that 
should feel like:

AESTHETIC: [Pick one per session — rotate between these]

Option A — "The War Room"
Dark, dense, information-rich. Like a Bloomberg terminal crossed with 
a military operations center. Every element serves a purpose. Status 
indicators glow. Data is king. The kind of tool that makes an agent 
feel like they have an unfair advantage.

Option B — "The Executive Suite"  
Clean, confident, authoritative. Like the app a Fortune 500 CEO uses.
Generous whitespace. Typography-driven hierarchy. Subtle animations 
that telegraph quality. The kind of interface that makes clients trust 
you on sight when they see it over your shoulder.

Option C — "Mission Control"
Real-time feel. Live data pulsing. Status bars, activity feeds, and 
pipeline visualizations that make you feel the momentum of the agency.
Like watching a rocket launch from Houston — every metric matters and 
you can see everything at once.

DESIGN CONSTRAINTS:
- No generic card layouts with rounded corners and drop shadows
- No blue/purple gradients on white backgrounds
- Typography should feel CHOSEN, not defaulted
- The layout should surprise me — don't give me the first thing 
  that comes to mind
- One element on the page should be genuinely unexpected

Build [describe what you need] with this direction.
```

### THE "DO BETTER" PROMPT — Use when the output is generic:

```
This is too generic. It looks like every other AI-generated interface.
I need you to push harder. Specifically:

What you gave me:
- [Name what's generic — e.g., "Standard card grid with blue buttons"]

What I want instead:
- A design that a designer would look at and say "that's a CHOICE" 
  — meaning it has a clear point of view, not a safe average
- At least ONE visual element that I've never seen an AI generate
- Typography that creates hierarchy WITHOUT relying on font size alone
  (use weight, opacity, spacing, color to create levels)
- Motion/animation that communicates STATE, not decoration

Same functionality. Different execution. Surprise me.
```

---

## PROBLEM 3: "The AI Isn't Aligning to My Existing System"

The AI builds new features that look and feel completely different 
from what's already there — different colors, different spacing, 
different patterns, doesn't connect to existing data.

### THE ALIGNMENT PROMPT — Paste when adding any new feature:

```
I'm adding a new feature to my existing platform. The new feature 
MUST align with the existing system. Here are my constraints:

EXISTING DESIGN TOKENS (use these, don't invent new ones):
- Background: var(--bg) = #0B0E14
- Surfaces: var(--surface) = #12161F, var(--surface-alt) = #181D28
- Borders: var(--border) = #1E2433
- Accent: var(--accent) = #E8713A (amber/orange)
- Text: var(--text) = #E2E8F0, var(--text-sec) = #8B95A8
- Status: var(--online) = #34D399, var(--offline) = #EF4444
- Font: var(--font-main) = 'Plus Jakarta Sans'
- Radius: var(--radius) = 10px, var(--radius-sm) = 6px
- DO NOT create new CSS variables or introduce colors not in this list

EXISTING PATTERNS (follow these, don't reinvent):
- Pages render into: document.getElementById('pg-[pagename]')
- Render functions are named: render[PageName]() 
- They're registered in the renders object: renders.pagename = renderPageName
- State lives in the global S object (saved to localStorage)
- New items use gid() for IDs, ts() for timestamps
- Modals follow the pattern in the task detail modal
- Navigation items are in the sidebar nav

EXISTING DATA STRUCTURE:
- S.tasks = [] (TaskBoard items)
- S.projects = [] (Projects)
- S.documents = [] (Documents)
- S.notes = [] (Notes)
- S.logs = [] (Activity log)
- CRM data: window._CRM with CRM.clients = []

The new feature should feel like it was built by the SAME developer
who built everything else. Not bolted on — native.

Now build: [describe the feature]
```

### THE "MATCH THIS" PROMPT — For visual consistency:

```
Here is an existing component from my app that I like:
[Paste the code of a component you're happy with]

Build [new component] following the EXACT same patterns:
- Same CSS class naming convention
- Same spacing values
- Same border/shadow treatment  
- Same hover/interaction patterns
- Same typography scale
- Same color usage patterns

The new component should look like the sibling of the one above —
clearly from the same family.
```

---

## PROBLEM 4: "Features Aren't Saving / Data Isn't Persisting"

When you build something and the data disappears on refresh.

### THE DATA ARCHITECTURE PROMPT — Use BEFORE building any feature:

```
Before we build this feature, I need you to design the data model.

FEATURE: [describe what you're building]

Answer these questions:
1. WHAT DATA does this feature need to store?
   List every field with its type (string, number, boolean, array, object)

2. WHERE does it save?
   - Does it go in the existing S object (localStorage)?
   - Does it need its own localStorage key?
   - Does it go in the CRM.clients array?
   - Show me the exact path: S.newThing = [...]

3. HOW does it save?
   - Which function triggers the save? (usually save() for S object)
   - When does it auto-save vs. require a button click?

4. HOW does it load?
   - On page load, how is this data restored?
   - Is it part of the seed() function?
   - Does it need a migration for users who don't have it yet?

5. WHAT HAPPENS with old data?
   - If a user already has the app without this feature, what happens 
     when they update? Will the app crash because the new field doesn't 
     exist in their saved data?
   - Show me the migration/default code.

Show me the data model as a JSON example, then I'll approve before 
you write the UI.
```

### THE DEBUGGING PROMPT — When saves aren't working:

```
A feature isn't saving data correctly. Help me debug it.

SYMPTOM: [e.g., "I add a new client, it shows up, but after refresh 
it's gone"]

Help me trace the save chain:
1. What function is called when the user performs the action?
2. Does that function call save() or crmSaveClientsPartB()?
3. Open DevTools (F12) and type this in the Console tab — what 
   does it show?
   
   For main state: JSON.parse(localStorage.getItem('ff_v41'))
   For CRM: JSON.parse(localStorage.getItem('ff_crm_clients'))

4. Is the data IN localStorage but not showing in the UI? 
   (That means the render function is the problem, not the save)
5. Is the data NOT in localStorage at all?
   (That means save() never ran, or the data isn't being added to 
   the right object)

Based on the symptom, tell me which it is and where to look.
```

### THE PERSISTENCE CHECKLIST PROMPT:

```
I just built a new feature. Before I consider it done, verify the 
save/load cycle:

1. SAVE TEST: Walk me through exactly what happens when the user 
   creates/modifies data in this feature. Trace every function call 
   from the button click to localStorage.setItem.

2. LOAD TEST: Walk me through exactly what happens on page refresh. 
   How does this data get restored from localStorage back into the UI?

3. EDGE CASES:
   - What if localStorage is empty (brand new user)?
   - What if the data exists but is missing new fields (updated user)?
   - What if localStorage is full (rare but possible)?
   - What if two browser tabs are open (data conflict)?

4. MIGRATION: Show me the code that handles users who had the app 
   BEFORE this feature existed. Their localStorage won't have the new 
   fields — how do we add defaults without losing their existing data?

If any of these aren't handled, show me the fix.
```

---

## PROBLEM 5: "I Don't Know How to Use This Better"

Prompts that teach you AS you build.

### THE TEACHER MODE PROMPT:

```
I'm learning to code while building this project. For the next feature 
we build together, I want you to operate in TEACHER MODE:

For every piece of code you write:
1. Add a comment above each section explaining what it does in 
   PLAIN ENGLISH (not developer jargon)
2. When you use a technique I might not know, add a brief 
   "// WHY: ..." comment explaining the reason
3. After each code block, give me a "WHAT YOU JUST LEARNED" summary 
   — one concept from that code I should understand

Example of what I want:
```javascript
// This creates a list of all clients who are "overdue" in their stage
// WHY: We filter instead of looping because filter gives us a new 
// list without changing the original — safer and cleaner
const overdueClients = CRM.clients.filter(client => {
  // Get how many days this client has been in their current stage
  const daysInStage = calculateDaysInStage(client);
  // Check if they've exceeded the time limit for that stage
  return daysInStage > stage.timerDays;
});
// WHAT YOU JUST LEARNED: .filter() creates a new array containing 
// only items that pass your test. The original array stays unchanged.
```

Now let's build: [describe the feature]
```

### THE "EXPLAIN WHAT I HAVE" PROMPT:

```
I have existing code that I don't fully understand. Walk me through 
it like I'm a smart person who doesn't know programming.

Here's the code:
[Paste the section you want to understand]

For each chunk:
1. What does this DO in plain English?
2. WHY is it done this way?
3. What would BREAK if I deleted this line?
4. If there's a simpler way to write this, show me — but tell me 
   what the tradeoff is.

Don't skip anything because you think it's "obvious." 
Nothing is obvious to me yet.
```

### THE "DECISION EXPLAINER" PROMPT:

```
You're about to make a technical decision. Before you do, explain 
the options to me like I'm choosing between contractors for a 
home renovation:

THE DECISION: [e.g., "How to structure the agent dashboard data"]

Give me 2-3 options:
- OPTION A: [Name it simply] — "The Quick Way"
  What it is, how long it takes, pros, cons, when you'd regret it
  
- OPTION B: [Name it simply] — "The Solid Way"  
  What it is, how long it takes, pros, cons, when you'd regret it

- OPTION C (optional): [Name it simply] — "The Future-Proof Way"
  What it is, how long it takes, pros, cons, when you'd regret it

YOUR RECOMMENDATION: Which one and why, given that we're at [stage]
with [team size] and planning to scale to [future size].

I'll pick, then you build.
```

---

## PROBLEM 6: "Making the Agent Consistent Across Conversations"

Claude forgets everything between conversations. Here's how you 
make it behave identically every time.

### THE PROJECT MEMORY FILE

Create this file and update it after EVERY work session. Paste it 
(along with the Agent Prompt from the top) at the start of each 
new conversation.

Save as: `PROJECT-STATE.md` on your Desktop

```markdown
# Forged Financial Platform — Project State
Last updated: [DATE]

## What's Built and Working
- [x] Auth gate (login screen with operator selection)
- [x] Sidebar navigation (all pages route correctly)
- [x] TaskBoard — 6-column kanban with drag-and-drop
- [x] Overview dashboard — stats cards, activity log, operator panels
- [x] CRM Pipeline — kanban view, stage timers, client detail modal
- [x] CRM Detail Modal — 5 tabs (Client, Activity, Tasks, Policy, Notes)
- [x] CRM Automation — auto stage transitions, overdue alerts
- [x] Projects — wizard, milestones, linked documents
- [x] Documents — creation, editing, categorization
- [x] Memory — file management for AI context
- [x] Settings — themes (12 presets), fonts, spacing, 80-color palette
- [x] AI Radar — monitoring page
- [x] Systems — connected systems panel
- [x] Sync Bridge — VPS two-way sync
- [ ] Agent Performance Dashboard — NOT BUILT YET
- [ ] Commission Tracker — NOT BUILT YET
- [ ] Multi-user support — NOT BUILT YET
- [ ] Reporting/Analytics — BASIC, needs expansion

## Current File Structure  
- index.html (7,333 lines, single file)
- backend/ (Node.js server, sync, AI watcher)
- Key sections: [reference the line map from the previous guide]

## Data Storage
- Main state: localStorage key 'ff_v41' → global S object
- CRM clients: localStorage key 'ff_crm_clients' → CRM.clients array
- Render map: renders = { pagename: renderFunction }
- Navigation: navTo('pagename') switches pages

## Design System
- Dark theme, bg #0B0E14, accent #E8713A (amber)
- Font: Plus Jakarta Sans (UI), JetBrains Mono (data)
- All CSS variables defined in :root (lines 10-20)
- 80-color extended palette available

## Patterns to Follow
- State changes → save() → renders[currentPage]()
- New items: id = gid(), timestamp = ts()
- CRM operations save via crmSaveClientsPartB()
- Modals: overlay div with .show class toggle
- Event delegation on parent containers

## What I'm Working on Next
[UPDATE THIS EACH SESSION]

## Known Bugs / Issues
[LIST ANYTHING BROKEN]

## Decisions Made
- Single-file architecture for Phase 1 (downloadable)
- Will split into multi-file when adding multi-user support
- CRM pipelines: FEX, IUL, Veterans, Truckers, Mortgage Protection
- Pipeline stages follow standard insurance workflow
- All AI actions require approval gates
```

### THE SESSION-START RITUAL

Every single time. No exceptions:

```
Step 1: Open AGENT-PROMPT.txt → paste into new Claude conversation
Step 2: Open PROJECT-STATE.md → paste right after
Step 3: State today's goal:
        "Today I'm working on: [ONE specific thing]"
Step 4: Double-click BACKUP-BEFORE-SESSION.bat
Step 5: Start building
```

### THE SESSION-END RITUAL

Before closing Claude:

```
Before we end this session, help me update my project state file.

1. What did we build/change today? (List features added or modified)
2. What files/sections were touched? (Line numbers or section names)  
3. Are there any known issues from today's work?
4. What should I work on next to keep momentum?
5. Any decisions we made that I should remember?

Format this as updates I can paste into my PROJECT-STATE.md file.
```

---

## THE EMERGENCY PROMPTS

### "Everything Is Broken and I Don't Know What Happened"
```
My app is completely broken. I need triage, not a rewrite.

SYMPTOMS: [What you see — blank page, error messages, partial render]

CONSOLE ERRORS (F12 → Console): 
[Paste ALL red error messages]

LAST KNOWN WORKING STATE: I have a backup from [date/time].

DO NOT rewrite anything. Instead:
1. Read the error messages and tell me in plain English what they mean
2. Identify the SINGLE most likely cause
3. Show me the MINIMUM fix (smallest possible code change)
4. If you're not confident, say so — I'd rather restore from backup 
   than apply a guess that makes it worse
```

### "I Need to Start This Feature Over Without Losing Everything Else"
```
The [feature name] we built isn't working right and patching it is 
making things worse. I want to start JUST this feature over.

Tell me:
1. Exactly which lines to DELETE to remove the broken feature
2. What the file should look like in those spots AFTER deletion 
   (sometimes you need a placeholder)
3. Confirm that deleting those lines won't break anything else
4. Any references to this feature in OTHER parts of the code that 
   also need to be removed

Once I've cleaned it out, we'll rebuild it fresh — but ONLY those 
lines. The rest of the app stays exactly as it is.
```

### "The AI Changed Something I Didn't Ask It To Change"
```
I asked you to [what you asked for] but you also changed [what you 
noticed changed]. I did NOT ask for that second change.

1. Why did you change it? Was it necessary for the feature to work,
   or was it an "improvement" you decided to make?
2. If it was necessary, explain WHY — what would break without it?
3. If it was NOT necessary, give me the original code back for that 
   section so I can revert just that part.

Going forward: If you think something ELSE needs to change to support 
my request, TELL ME FIRST. Don't just change it.
```

---

## QUICK REFERENCE CARD

```
SITUATION                          → PROMPT TO USE
─────────────────────────────────────────────────────
Starting a new session             → Agent Prompt + Project State
Adding a new feature               → Alignment Prompt + Data Architecture
The AI broke working code          → Recovery Prompt + Freeze List
Output looks generic               → Vision Injection + "Do Better"
New feature doesn't match app      → "Match This" + Alignment Prompt  
Data disappears on refresh         → Persistence Checklist + Debug
I don't understand the code        → Teacher Mode + Explain What I Have
Making a technical decision        → Decision Explainer
Feature is unfixable               → "Start This Feature Over"
Everything is broken               → Emergency Triage
End of session                     → Session-End Ritual
```
