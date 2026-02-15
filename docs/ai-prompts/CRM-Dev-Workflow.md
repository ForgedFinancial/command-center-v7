# CCRM v1 — How to Stop Rebuilding & Start Building
## A Practical Workflow for Danny

---

## THE DIAGNOSIS: Why You Keep Rebuilding

I just analyzed your actual index.html. Here's what's happening:

**Your file: 7,333 lines / 630KB — ALL in one file.**

That's the root cause of everything. When you tell an AI "improve the CRM,"
it can't hold 7,333 lines in its head. So it does one of two things:
1. Regenerates the whole file and accidentally deletes or breaks other sections
2. Gives you a partial file and you lose the rest when you paste it in

Your BACKUP.html is 3,642 lines. Your current file is 7,333 lines.
That means you've ALREADY lost work equal to the gap between backups.

---

## YOUR FILE — MAPPED OUT

I mapped every section of your index.html so you always know what's where.
**Save this. Reference it every session. Give it to any AI you work with.**

```
LINE RANGE    | SECTION                          | SAFE TO EDIT ALONE?
─────────────────────────────────────────────────────────────────────
1-10          | DOCTYPE, head, meta, fonts       | ⚠️ Don't touch
10-220        | CSS: Core variables & layout      | ⚠️ Careful — affects everything
220-470       | CSS: Task cards, categories        | ✅ TaskBoard only
471-475       | CSS: CRM Pipelines                 | ✅ CRM only
475-780       | CSS: Settings, other pages         | ✅ Settings only
780-930       | CSS: CRM Detail Modal              | ✅ CRM modal only
930-975       | CSS: More components               | ⚠️ Mixed
975-1000      | HTML: Sidebar navigation           | ⚠️ Careful — affects nav
1000-1035     | HTML: Header, pills, controls      | ⚠️ Careful — affects header
1035-1042     | HTML: Page containers (empty divs) | ⚠️ Don't remove any
1042-1155     | HTML: Modals (task, memory, etc.)  | ✅ Per-modal
1155-1310     | JS: Constants, seed data, state    | ⚠️ CRITICAL — breaks everything
1310-1320     | JS: Render map + Navigation        | ⚠️ CRITICAL — page routing
1320-1450     | JS: TaskBoard render + cards        | ✅ TaskBoard only
1450-1460     | JS: Overview, Notes, Workflows      | ✅ Per-page
1460-1740     | JS: Dashboard, Overview widgets     | ✅ Dashboard only
1740-2210     | JS: Briefing, Analytics, Goals      | ✅ Per-page
2210-2560     | JS: Projects (detail, wizard)       | ✅ Projects only
2560-2980     | JS: Documents, Memory, Radar        | ✅ Per-page
2980-3270     | JS: CRM Detail Modal (tabs, edits)  | ✅ CRM modal only
3270-3700     | JS: CRM Modal extras, resize, drag  | ✅ CRM modal only
3700-4200     | JS: Systems, Security, Settings     | ✅ Per-page
4200-6400     | JS: Aesthetics, theme engine, etc.  | ✅ Settings only
6400-7150     | JS: CRM Pipeline System (separate)  | ✅ CRM MAIN PAGE
7150-7230     | JS: Sync Bridge                     | ✅ Sync only
7230-7333     | JS: Closing tags                    | ⚠️ Don't touch
```

**YOUR CRM CODE LIVES IN TWO PLACES:**
1. **Lines 780-930 + 2980-3270**: The CRM Detail Modal (popup when you click a client)
2. **Lines 6400-7150**: The CRM Pipeline System (main CRM page, kanban, dashboard, automation)

These are the ONLY lines you need to touch to work on the CRM.

---

## STEP 1: SET UP A SAFETY NET (Do This Today — 5 Minutes)

Before ANYTHING else, you need version control. Not because it's
"good practice" — because without it, every AI session is Russian roulette
with your codebase.

### Option A: The Simple Way (File Copies)
Before every session, run this in PowerShell:
```powershell
# Run this BEFORE every AI coding session
$date = Get-Date -Format "yyyy-MM-dd_HHmm"
Copy-Item "C:\Users\danie\OneDrive\Desktop\CCRM v1\index.html" "C:\Users\danie\OneDrive\Desktop\CCRM v1\backups\index_$date.html"
Write-Host "Backup saved: backups\index_$date.html"
```

Or I can create a batch file for you that does this with one double-click.

### Option B: Git (Better, but a bit more to learn)
```powershell
cd "C:\Users\danie\OneDrive\Desktop\CCRM v1"
git init
git add index.html
git commit -m "Starting point - v5.5"
```
Then before each session: `git add . && git commit -m "before CRM session"`
If the AI breaks something: `git checkout -- index.html` ← instantly restores

---

## STEP 2: THE SESSION WORKFLOW

### BEFORE You Start (2 minutes)

1. **Save a backup** (Step 1 above)
2. **Open index.html in a text editor** (VS Code, Notepad++, even Notepad)
   - This is your "truth" — if the AI gives you something weird, you still have it open
3. **Decide what ONE thing you're working on**
   - Not "improve the CRM." Instead: "Add a phone number field to the client detail modal"
   - The more specific, the less the AI will touch

### DURING the Session

Use the prompts in the next section. Key rule:
**Never ask the AI to regenerate the full file. Always ask for SPECIFIC SECTIONS.**

### AFTER the Session (3 minutes)

1. **Test the app** — open index.html in Chrome, click through every page
   - Does TaskBoard still work? Do cards drag?
   - Does the Dashboard load?
   - Does the CRM page show your pipeline?
   - Do Settings still work?
2. **If something broke** → restore from your backup
3. **If everything works** → save a NEW backup with a descriptive name:
   `index_2026-02-14_added-phone-field.html`

---

## STEP 3: THE PROMPTS — CRM-Specific Surgery

### THE CONTEXT PROMPT (Paste This at the Start of EVERY Session)

```
I'm working on a single-file HTML application called "Forged Financial 
Command Center" (CCRM v1). The entire app is in index.html (7,333 lines).

CRITICAL RULES — READ THESE BEFORE DOING ANYTHING:
1. NEVER regenerate the entire file. Only output the specific lines I ask about.
2. NEVER remove or modify code outside the section I specify.
3. When outputting code, always include the line numbers or surrounding 
   context (3-5 lines before and after) so I know exactly where to paste it.
4. If a change requires modifications in TWO places, tell me BOTH locations 
   explicitly — don't assume I'll figure it out.
5. Before making any change, tell me:
   - WHAT you're changing (plain English)
   - WHERE in the file (line numbers or section)
   - WHAT COULD BREAK if done wrong
   Then wait for my approval before showing me the code.

THE APP STRUCTURE:
- Lines 1-930: CSS styles (layout, components, CRM modal)
- Lines 930-1155: HTML structure (sidebar, header, page containers, modals)
- Lines 1155-1310: JS constants, state, seed data
- Lines 1310-1320: Render map + navigation
- Lines 1320-6400: JS page renderers (taskboard, dashboard, goals, projects, etc.)
- Lines 6400-7150: CRM Pipeline System (separate script block)
- Lines 7150-7333: Sync bridge

TODAY I'M WORKING ON: [describe your specific task]
ONLY touch code related to this task. Leave everything else alone.
```

### PROMPT: "Add a New Field to CRM Client Records"
```
In my CCRM app, I need to add a [field name] field to CRM client records.

This requires changes in exactly these locations:
1. CRM CLIENT DATA MODEL (around line 6400-6500) — add the field to 
   the client object structure and data migration section
2. CRM DETAIL MODAL (around line 2980-3270) — add the field to the 
   appropriate tab's render function (renderCRMClientTab)
3. CRM CSS (around line 780-930) — if new styling is needed

Show me each change separately with the exact surrounding code so I 
know where to paste it. Do NOT show me the entire file or entire functions — 
just the specific lines that change, with 3 lines of context above and below.
```

### PROMPT: "Modify the CRM Pipeline Kanban View"
```
In my CCRM app, the CRM pipeline kanban view is rendered by the function 
at approximately lines 6400-6730 (in the CRM Pipeline System script block).

I want to change: [describe what you want]

Show me ONLY the modified portions of the existing render function. 
Include the function name and 3 lines of surrounding context so I can 
find exactly where to paste.

DO NOT regenerate the entire CRM system. DO NOT touch anything outside 
the CRM Pipeline System script block (lines 6400-7150).
```

### PROMPT: "Add a New CRM Feature"
```
I want to add [feature description] to my CRM system.

Before writing any code, answer these questions:
1. Which existing functions need to be modified? List them with 
   approximate line numbers.
2. Do any NEW functions need to be created? Where should they go?
3. Does this require new CSS? Where should it go?
4. Does this require new HTML? Where should it go?
5. Could this change break any existing functionality? What specifically?

Show me this plan first. I'll approve it, then you can show me the code 
changes one at a time.
```

### PROMPT: "Fix Something That Broke"
```
Something broke in my app. Here's the symptom:
[Describe what's not working]

Here's what I changed recently:
[Describe what you or the AI changed]

DON'T rewrite anything. Instead:
1. Tell me what's most likely causing this
2. Show me the MINIMUM fix — the fewest lines possible to change
3. Show me exactly where to put the fix with surrounding context

If you can't determine the fix from the description, tell me what to 
look for in the browser console (F12 → Console tab) and I'll paste the 
error message.
```

### PROMPT: "Verify AI Changes Before Applying"
Use this AFTER the AI gives you code to paste:
```
Before I paste this in, verify for me:

1. LINE COUNT CHECK: My current section from line [X] to line [Y] 
   is [N] lines. Your replacement is [M] lines. Is this expected? 
   Why did it grow/shrink?

2. FUNCTION CHECK: List every function name in your replacement. 
   Are any functions MISSING that were in the original?

3. VARIABLE CHECK: Does your code reference any variables that are 
   defined outside this section? List them.

4. SIDE EFFECT CHECK: Does this change affect any other part of 
   the app? Which functions call the functions you changed?
```

---

## STEP 4: THE "DON'T BREAK OTHER STUFF" CHECKLIST

After ANY change, open the app and check these in order:

```
□ Page loads without errors (F12 → Console — any red text = problem)
□ Sidebar navigation works — click each page:
  □ Dashboard loads
  □ TaskBoard shows kanban columns with cards
  □ Daily Reports loads  
  □ Goals loads
  □ Projects loads
  □ CRM shows pipeline view  ← your work
  □ Documents loads
  □ Memory loads
  □ AI Radar loads
  □ Systems loads
  □ Settings loads
□ TaskBoard: Can drag a card between columns?
□ CRM: Can click a client and see the detail modal?
□ CRM: Can switch tabs in the detail modal?
□ Settings: Can change theme color?
□ Top header: Clock updating? Sync badge showing?
```

If anything fails, DON'T try to fix it on top of the broken version.
Go back to your backup and re-apply changes more carefully.

---

## STEP 5: LONG-TERM — STOP THE FILE FROM GROWING FOREVER

Your file went from 3,642 lines (backup) to 7,333 lines (current). 
At this rate, no AI will be able to work with it reliably. 

The CRM system (lines 6400-7150) is ALREADY in its own `<script>` block — 
that's good architecture. Over time, you should do the same for other systems:

```
Future goal (not urgent):
index.html          ← HTML structure + CSS + core JS + navigation
crm-system.js       ← CRM pipeline, kanban, dashboard, automation
taskboard.js        ← TaskBoard kanban + task detail modal  
settings.js         ← Settings, themes, aesthetics engine
sync-bridge.js      ← VPS sync system

Each loaded via: <script src="crm-system.js"></script>
```

This means you could tell the AI "here's JUST the CRM file, fix this" 
and it would never even SEE the taskboard code. That's how you eliminate 
the risk of cross-contamination entirely.

But that's a project for later. For now, the workflow above will keep 
you safe.

---

## THE GOLDEN RULES

1. **One thing per session.** Not "improve the CRM." 
   Instead: "Add a birthday field to the client detail modal."

2. **Never paste a full file replacement.** Always paste specific 
   sections with context lines so you can verify placement.

3. **Always back up before starting.** One copy command. Five seconds. 
   Saves you hours of heartbreak.

4. **Tell the AI the line numbers.** "The CRM detail modal render 
   function starts at line 2989" is 10x better than "find the CRM code."

5. **Test after every change.** Not after five changes. After ONE. 
   If you stack changes, you won't know which one broke things.

6. **When in doubt, don't paste it.** Ask the AI "what exactly does 
   this change? What functions are different from the original?" 
   If it can't explain clearly, don't apply it.
