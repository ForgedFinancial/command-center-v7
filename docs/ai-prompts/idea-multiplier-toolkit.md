# The 10x Idea Multiplier Toolkit
## Prompts That Automatically Find Everything You'd Miss

---

## THE CONCEPT

You built something. It's decent. But there are 200 things wrong with it
that you can't see because you don't know what "right" looks like yet.

These prompts are **automated inspectors**. You paste your app (or describe it),
and the AI systematically tears through every layer — finding gaps you didn't
know existed, features you didn't think of, and polish you didn't know was possible.

Think of each prompt as hiring a different specialist to review your work:
- An architect who checks the structure
- A designer who checks every pixel  
- A product manager who finds missing features
- A QA tester who breaks everything
- A UX researcher who thinks about the user
- A creative director who pushes the vision further

---

## TIER 1: THE FULL AUDIT SUITE
*Use these to get a complete picture of what needs work*

### PROMPT 1: "The 100-Point Inspector"
*The master audit. Use this first on any new output.*

```
I'm going to show you an application I built. I need you to perform 
a 100-point inspection across every dimension. Don't hold back — I want 
to know EVERYTHING that's wrong, missing, or could be better.

[Paste your code or describe your app]

Inspect across these 10 categories (10 items each):

1. VISUAL DESIGN (10 points)
   - Color consistency, contrast ratios, visual hierarchy
   - Typography quality, size relationships, readability
   - Spacing rhythm, alignment, visual breathing room
   - Polish details (shadows, borders, transitions, hover states)
   - Empty states, loading states, error states designed?
   - Dark/light consistency
   - Does anything look "default" or unfinished?
   - Icon consistency and quality
   - Image/media handling
   - Overall aesthetic cohesion — does it look intentional?

2. USER EXPERIENCE (10 points)
   - First impression — what does a new user see/feel?
   - Can a user figure out what to do without instructions?
   - Are the most important actions the most visible?
   - Feedback — does every click produce a visible response?
   - Error messages — helpful or generic?
   - Navigation — can you always tell where you are?
   - Workflow efficiency — how many clicks for common tasks?
   - Mobile/responsive behavior
   - Accessibility (keyboard nav, screen readers, contrast)
   - Cognitive load — is there too much on screen?

3. FUNCTIONALITY (10 points)
   - Do all buttons/links actually work?
   - Do all forms validate input properly?
   - Does data persist correctly (save/load)?
   - Do filters/search/sort work as expected?
   - Are CRUD operations complete (create, read, update, delete)?
   - Do edge cases break anything? (empty data, huge data, special characters)
   - Does the app handle network failures gracefully?
   - Are there any dead ends (states with no way out)?
   - Do all integrations/APIs connect properly?
   - Is there undo/redo for destructive actions?

4. MISSING FEATURES (10 points)
   - What would a user expect that isn't there?
   - What do competing products have that this doesn't?
   - What automation is possible but not implemented?
   - What data is collected but not visualized?
   - What actions require leaving the app that shouldn't?
   - What repetitive tasks could be templated?
   - What notifications/alerts should exist but don't?
   - What keyboard shortcuts would power users want?
   - What export/import/share capabilities are missing?
   - What settings should be customizable but aren't?

5. CODE QUALITY (10 points)
   - Is the code organized logically?
   - Are there any obvious bugs or error-prone patterns?
   - Is naming consistent and meaningful?
   - Are there hardcoded values that should be configurable?
   - Is there unnecessary code duplication?
   - Are there memory leaks or performance issues?
   - Is error handling comprehensive?
   - Are there any security concerns?
   - Is the code maintainable by someone else?
   - Could any sections be simplified?

6. PERFORMANCE (10 points)
   - Initial load time — is anything blocking render?
   - Scroll performance — any jank or stuttering?
   - Animation smoothness (60fps?)
   - Memory usage — does it grow over time?
   - Network efficiency — unnecessary API calls?
   - Image/asset optimization
   - Render efficiency — unnecessary re-renders?
   - Large list handling (virtual scrolling needed?)
   - Caching — is anything fetched repeatedly?
   - Bundle/file size

7. DATA & STATE (10 points)
   - Is all important data being saved?
   - Can data be corrupted? How?
   - What happens when localStorage is full?
   - Are there race conditions?
   - Is state shape well-designed?
   - Data validation on input
   - Data sanitization on display (XSS?)
   - Backup/export of user data
   - Data migration when schema changes
   - Conflict resolution if data changes in multiple places

8. MICRO-INTERACTIONS (10 points)
   - Hover effects on every interactive element?
   - Click/tap feedback (visual response)?
   - Focus states for keyboard navigation?
   - Transition animations between states?
   - Loading indicators for async operations?
   - Success confirmations after actions?
   - Drag and drop feedback?
   - Scroll-based reveals or effects?
   - Tooltip/help text where needed?
   - Sound or haptic feedback opportunities?

9. CONTENT & COPY (10 points)
   - Are labels clear and consistent?
   - Do error messages tell users what to DO?
   - Is placeholder text helpful (not just "Enter text...")?
   - Are empty states encouraging (not just "No data")?
   - Is the tone consistent throughout?
   - Are there spelling or grammar errors?
   - Do action buttons use verbs ("Save" not "OK")?
   - Are confirmation dialogs specific ("Delete 3 tasks" not "Are you sure?")?
   - Is help text available for complex features?
   - Do numbers have proper formatting (commas, currency, dates)?

10. INNOVATION OPPORTUNITIES (10 points)
    - What would make this app's "wow moment"?
    - What AI/automation could be added?
    - What data visualizations could replace text?
    - What gamification elements would drive engagement?
    - What personalization is possible?
    - What social/sharing features could add value?
    - What integrations would multiply the app's usefulness?
    - What predictive features could anticipate user needs?
    - What voice/natural language features make sense?
    - What would make someone screenshot this and share it?

FORMAT YOUR RESPONSE AS:
For each category, score it /10 and list SPECIFIC findings.
Not "improve the design" — instead "the card hover state at line X has 
no transition, add transform: translateY(-2px) with 200ms ease."

End with a PRIORITY MATRIX:
🔴 Critical (broken/missing, fix immediately): [list]
🟡 Important (noticeable gaps, fix this week): [list]  
🟢 Polish (would elevate quality, do when time allows): [list]
💡 Innovation (future features, save for later): [list]
```

---

### PROMPT 2: "The Before/After Expander"
*Takes what you have and shows you what it SHOULD be*

```
I'm going to show you my current application. For each component/section 
you can identify, I need you to describe:

CURRENT STATE: What it does now (1 sentence)
SHOULD BE: What it should do at a professional level (2-3 sentences)
GAP: The specific things missing between current and should-be
EFFORT: Quick fix (< 30 min) | Medium (1-2 hours) | Major (half day+)

[Paste your code or describe your app]

Go through every visible component:
- Every button (does it have all states? does it do enough?)
- Every card/panel (is the info hierarchy right?)
- Every form/input (validation? formatting? helper text?)
- Every list/table (sorting? filtering? pagination? empty state?)
- Every modal/dialog (can it be dismissed? is it responsive?)
- Every navigation element (clear? shows current location?)
- Every data display (formatted? contextualized? actionable?)
- Every status indicator (clear meaning? accessible colors?)

Then list the INVISIBLE components that should exist but don't:
- Toast/notification system?
- Loading skeleton screens?
- Keyboard shortcut system?
- Search/command palette?
- Onboarding/tutorial flow?
- Settings/preferences?
- Help/documentation?
- Activity log/history?
- Undo system?
- Offline handling?

Format as a numbered list so I can work through them one at a time.
```

---

### PROMPT 3: "The Competitor Lens"
*Compares your app to the best in class*

```
Here's my application: [paste code or describe it]

This is a [type of app: CRM / task manager / dashboard / etc.].

Now compare it against what the best products in this category offer.
Think about apps like: [list 2-3 competitors, e.g., "HubSpot, Monday.com, Notion"]

For each comparison, tell me:
FEATURE: [what the competitor does]
MY APP: [does it have it? how does mine compare?]  
GAP: [what specifically is missing]
HOW TO ADD: [1-2 sentence implementation approach]
PRIORITY: [must-have / nice-to-have / future / skip]

Organize by category:
1. Features I'm missing entirely
2. Features I have but they're worse than competitors
3. Features I have that are on par
4. Features where I could actually BEAT competitors (unique advantages)

End with: "The 5 features that would close the biggest gap between 
your app and professional-grade products" — ranked by impact.
```

---

## TIER 2: TARGETED DISCOVERY PROMPTS
*Use these to deep-dive specific dimensions*

### PROMPT 4: "The UX Teardown"
*Finds every user experience problem*

```
Act as a UX researcher conducting a heuristic evaluation of this app.
Walk through every user journey and flag every friction point.

[Paste your code or describe your app]

For EACH screen/page/view in the app, evaluate:

FIRST GLANCE (0-3 seconds):
- What draws the eye first? Is that the right thing?
- Can I tell what this page is for immediately?
- Is there a clear primary action?

NAVIGATION:
- Do I always know where I am?
- Can I always get back to where I was?
- Is the information architecture logical?

TASK COMPLETION (for each major task):
- Steps to complete: [list each click/action]
- Unnecessary steps that could be eliminated?
- Points where I might get confused?
- What if I make a mistake? Can I recover?
- What feedback do I get when the task is done?

EMOTIONAL JOURNEY:
- Where might a user feel frustrated?
- Where might a user feel lost?
- Where might a user feel accomplished?
- Where might a user feel confused about what to do next?

ACCESSIBILITY:
- Can everything be reached by keyboard?
- Do colors alone convey meaning? (colorblind users)
- Is text readable at all sizes?
- Do interactive elements have sufficient size for touch?
- Are there ARIA labels on non-text elements?

Output as a JOURNEY MAP with friction points marked:
User arrives → [sees X] → [clicks Y] → ⚠️ FRICTION: [problem] → ...
```

---

### PROMPT 5: "The Visual Polish Scanner"
*Finds every design inconsistency and unfinished element*

```
Scan this application for every visual inconsistency, unfinished 
element, and missed polish opportunity. Be extremely specific.

[Paste your code]

CHECK EACH OF THESE:

SPACING AUDIT:
- Find every place where spacing is inconsistent
  (one card has 16px padding, another has 12px, etc.)
- Find elements that are too close together or too far apart
- Find sections with no breathing room

COLOR AUDIT:
- Find any color used only once (probably unintentional)
- Find text with insufficient contrast
- Find colors that clash or feel disconnected from the palette
- Find places where semantic colors are wrong 
  (using success green for something that isn't a success state)

TYPOGRAPHY AUDIT:
- Find inconsistent font sizes for same-level content
- Find text that's too small to read comfortably
- Find places where font weight is wrong for the hierarchy
- Find missing letter-spacing or line-height

STATE AUDIT:
- Find every interactive element and check:
  □ Has hover state?
  □ Has active/pressed state?
  □ Has focus state?
  □ Has disabled state?
  □ Has loading state?
  List every element missing any state.

ANIMATION AUDIT:
- Find state changes that happen instantly (should transition)
- Find transitions that are too slow or too fast
- Find animations that serve no purpose
- Find places where animation SHOULD exist but doesn't

ALIGNMENT AUDIT:
- Find elements that are slightly off-grid
- Find text that should be aligned but isn't
- Find icons that aren't vertically centered with text
- Find uneven column widths or row heights

CONSISTENCY AUDIT:
- Find buttons that look different from other buttons
- Find cards/panels with different border treatments
- Find modals with different header styles
- Find lists with inconsistent item formatting

Output as a punchlist:
[Component] → [Problem] → [Fix] → [CSS needed]
```

---

### PROMPT 6: "The Feature Explosion"
*Takes one idea and generates 20 variations*

```
I have a basic feature in my app: [describe the feature]

Explode this into 20 enhancements across these categories:

DEPTH (make the existing feature deeper):
1. [enhancement]
2. [enhancement]
3. [enhancement]
4. [enhancement]

BREADTH (add related capabilities):
5. [enhancement]
6. [enhancement]
7. [enhancement]
8. [enhancement]

AUTOMATION (reduce manual work):
9. [enhancement]
10. [enhancement]
11. [enhancement]
12. [enhancement]

INTELLIGENCE (add smart/predictive behavior):
13. [enhancement]
14. [enhancement]
15. [enhancement]
16. [enhancement]

DELIGHT (add surprise and polish):
17. [enhancement]
18. [enhancement]
19. [enhancement]
20. [enhancement]

For each one:
- What it does (1 sentence)
- Why it matters to the user (1 sentence)
- Effort to build (quick/medium/major)
- Dependencies (does it need anything else first?)

Then rank all 20 by IMPACT ÷ EFFORT — the best ratio wins.
```

---

### PROMPT 7: "The Edge Case Destroyer"
*Finds every way the app can break*

```
Find every edge case, failure mode, and breaking scenario in this app.
Think like a QA tester who gets paid per bug found.

[Paste your code or describe your app]

TEST CATEGORIES:

EMPTY STATES:
- What happens with zero data in every list/view?
- What happens on first use before any data exists?
- What happens when a search returns no results?
- What happens when a filter excludes everything?

OVERFLOW STATES:
- What happens with 1,000 items in a list?
- What happens with a 500-character name?
- What happens with a 10-paragraph description?
- What happens when all kanban columns have 50+ cards?
- What happens with 20 notifications at once?

BAD INPUT:
- What if I paste HTML/script tags into a text field?
- What if I enter negative numbers where positives expected?
- What if I enter future dates where past expected?
- What if I enter emoji in name fields?
- What if I enter nothing and submit?
- What if I enter only spaces?

TIMING ISSUES:
- What if I double-click a submit button?
- What if I navigate away during a save operation?
- What if I open the same modal twice?
- What if two processes modify the same data?
- What if I refresh during a multi-step process?

BROWSER EDGE CASES:
- What if localStorage is full?
- What if cookies are disabled?
- What if JavaScript is slow/blocked?
- What if the window is resized very small?
- What if the user zooms to 200%?

DESTRUCTIVE ACTIONS:
- Is there confirmation before delete?
- Can deleted items be recovered?
- What if I accidentally clear all data?
- Is there an undo for any action?

For each bug/edge case found:
- SEVERITY: 🔴 Critical | 🟡 Medium | 🟢 Low
- SCENARIO: How to trigger it
- CURRENT BEHAVIOR: What happens now
- EXPECTED BEHAVIOR: What should happen
- FIX: How to resolve it
```

---

## TIER 3: THE CREATIVE EXPANSION PROMPTS
*Use these to generate new ideas you'd never think of*

### PROMPT 8: "The User Story Generator"
*Generates dozens of feature ideas from user perspectives*

```
My app is: [describe your app and who uses it]

Generate user stories for 5 different user personas, each with 
different goals and skill levels:

PERSONA 1: The Power User (uses it daily, wants efficiency)
PERSONA 2: The First-Timer (just discovered it, needs guidance)  
PERSONA 3: The Mobile User (using it on their phone between meetings)
PERSONA 4: The Manager (checking on team progress, needs oversight)
PERSONA 5: The Stressed User (something went wrong, needs to fix it fast)

For each persona, generate 8 user stories:
"As a [persona], I want to [action] so that [benefit]"

Then for each story, answer:
- Does my app support this today? (yes/partial/no)
- If no: what would need to be built?
- If partial: what's missing?
- Priority for this persona: critical / important / nice-to-have

This should generate 40 user stories total. Highlight the top 10 
across all personas that would have the most impact.
```

---

### PROMPT 9: "The 'What If' Brainstorm"
*Generates wild ideas, then filters to the practical ones*

```
My app currently does: [describe core functionality]

Generate 30 "What if..." ideas, ranging from practical to wild:

PRACTICAL (could build this week):
1-10: Small but impactful improvements

AMBITIOUS (could build this month):
11-20: Significant new capabilities

MOONSHOT (future vision):
21-30: Big ideas that would transform the app

For each idea:
- "What if [the app could]..."
- Why it's interesting (1 sentence)
- Technical feasibility: Easy / Medium / Hard / Research needed
- User impact: Low / Medium / High / Game-changing

Then filter: which 5 ideas have the BEST ratio of 
feasibility to impact? Those are my next features.
```

---

### PROMPT 10: "The Micro-Improvement Blitz"
*Generates 50 small improvements that are each < 30 minutes*

```
Look at this application and find 50 improvements that each take 
LESS THAN 30 MINUTES to implement. I'm talking about the small 
things that add up to make an app feel polished vs. amateur.

[Paste your code]

Categories:

CSS TWEAKS (15 items):
- Transitions that are missing
- Hover states that don't exist
- Spacing that's slightly off
- Colors that could be better
- Shadows, borders, radius adjustments
- Typography improvements
- Responsive fixes

UX MICRO-WINS (15 items):
- Better placeholder text
- Helpful tooltips
- Confirmation messages
- Better empty states
- Keyboard shortcuts
- Better error messages
- Focus management

FUNCTIONALITY QUICK WINS (10 items):
- Missing form validation
- Data formatting improvements
- Sort/filter options
- Quick actions
- Default values that should be smarter

CODE CLEANUP (10 items):
- Duplicated code to consolidate
- Magic numbers to make configurable
- Console.log statements to remove
- Unused variables/functions
- Comments to add for clarity

Format as a checklist I can work through:
□ [Category] [Description] [Where in code] [Time estimate: 5/15/30 min]

Sort by impact (highest first within each category).
```

---

## TIER 4: THE CHAINING PROMPTS
*Use one prompt's output as the next prompt's input for compounding discovery*

### THE DISCOVERY CHAIN (Use In Sequence):

```
STEP 1 — "THE INVENTORY"
List every component, feature, and interaction in this application.
Don't evaluate anything yet — just create a complete inventory.
Organize as: [Component] → [What it does] → [User interactions available]

STEP 2 — "THE GRADER" (feed Step 1's output)
For each item in this inventory, grade it on a scale of 1-5:
- Design quality: [1-5]
- Functionality completeness: [1-5]  
- User experience: [1-5]
- Code quality: [1-5]
Average score and sort by LOWEST scoring items first.

STEP 3 — "THE PRESCRIBER" (feed Step 2's lowest items)
For each item scoring below 3, write a specific prescription:
- What's wrong (diagnosis)
- What to change (treatment)
- Exact code/approach (prescription)
- How to verify it's fixed (checkup)

STEP 4 — "THE SEQUENCER" (feed Step 3's prescriptions)
Take all these prescriptions and organize them into a build plan:
- What must be done first (dependencies)
- What can be done in parallel
- What order maximizes visible improvement fastest
- Group into work sessions of 1-2 hours each
```

### THE IDEA MULTIPLICATION CHAIN:

```
STEP 1 — "SEED"
I have this idea: [describe a feature or concept]
Give me 5 variations of this idea.

STEP 2 — "BRANCH" (feed Step 1)
For each of those 5 variations, give me 3 sub-ideas.
(Now I have 15 ideas)

STEP 3 — "CROSS-POLLINATE" (feed Step 2)
Take the best elements from different branches and combine them 
into 5 hybrid ideas that are better than any single branch.

STEP 4 — "FILTER" (feed Step 3)
Of everything generated (all ~25 ideas), which 3 are:
- Most feasible to build this week?
- Most impactful for the user?
- Most innovative/unique?
Give me the implementation plan for the top pick.
```

---

## TIER 5: THE ONE-LINE POWER PROMPTS
*Quick prompts that generate massive improvement lists*

```
RAPID-FIRE — paste any of these after showing your app:

"List 20 things a professional developer would fix before shipping this."

"If this app were reviewed on Product Hunt, what would the top 10 
criticisms be?"

"Walk through this app as a first-time user narrating every thought: 
'I see X, I'm confused by Y, I expected Z...'"

"List every interactive element that's missing a hover state, 
a transition, or a loading state."

"Find every hardcoded string that should be a variable, every magic 
number that should be a constant, and every repeated block that 
should be a function."

"What are the 10 most impactful changes I could make in under 
10 lines of code each?"

"If I could only make 5 changes to this app before showing it to 
an investor, what should they be?"

"List everything this app does that would annoy a user who uses it 
10 times a day."

"Describe this app's biggest weakness as if you're a competitor 
trying to steal its users."

"Generate a changelog for version 2.0 of this app — what would 
the release notes include?"
```

---

## HOW TO USE THIS SYSTEM

### For a New Build:
1. Build the initial version
2. Run **Prompt 1** (100-Point Inspector) → get the full picture
3. Run **Prompt 10** (Micro-Improvement Blitz) → get the quick wins
4. Fix the quick wins first (instant improvement)
5. Run **Prompt 6** (Feature Explosion) on your weakest area
6. Build the top-ranked feature
7. Repeat from step 2

### For an Existing App (Like Your CCRM):
1. Run **Prompt 2** (Before/After Expander) on just the CRM page
2. Run **Prompt 5** (Visual Polish Scanner) on just the CRM page
3. Run **Prompt 7** (Edge Case Destroyer) on just the CRM page
4. Take all three outputs → feed into **Prompt Step 4 from The Discovery Chain** 
   to sequence the work
5. Work through the sequence, one session at a time

### For Creative Expansion:
1. Start with **Prompt 9** (What If Brainstorm)
2. Take best idea → run through **Prompt 6** (Feature Explosion)
3. Take top feature → use the Build Prompts from your other guides

### The Golden Rule:
**Discovery prompts BEFORE build prompts. Always.**
Find out what to fix → THEN fix it. Never just start building 
without an audit first. The audit finds things you'd never spot 
on your own, and that's the whole point.
