# Creative + Functional Prompting
## How to Get Abstract, Inventive Outputs That Actually Work

*For Danny — UI Enhancement, Feature Design, Dashboard Development*

---

## WHY YOUR AI OUTPUTS LOOK GENERIC

There's a specific reason AI-generated UIs look like "AI slop" — and it's
not the model's fault. It's the prompt pattern most people use:

**❌ THE GENERIC PATTERN (What most people do):**
> "Enhance the UI of this dashboard. Make it look more modern and professional."

This produces safe, predictable output because:
- "Modern" = the model picks the statistical average of modern design (Inter font, purple gradients, rounded cards, white backgrounds)
- "Professional" = conservative, low-risk, forgettable
- No creative direction = the model defaults to the most common patterns in its training data

**✅ THE CREATIVE PATTERN (What gets inventive results):**
> "Redesign this dashboard with the aesthetic of a NASA mission control room
> from the 1960s — amber-on-black CRT displays, monospaced type, scan lines —
> but running on modern hardware. Dense, information-rich, zero decoration
> that isn't functional. Every pixel earns its place."

This produces distinctive output because:
- A **specific mood/reference** gives the model a creative anchor
- A **constraint philosophy** ("every pixel earns its place") shapes decisions
- A **tension** (retro aesthetic + modern capability) forces creative problem-solving

---

## THE CORE FORMULA

Every creative-yet-functional prompt needs THREE elements:

```
VISION (the abstract "feel")
  +
FUNCTION (what it must actually DO)
  +
CONSTRAINT (what forces creative choices)
```

**Vision** without Function = pretty but broken
**Function** without Vision = works but forgettable
**Constraint** is what makes it creative — limitations force invention

---

## THE 8 PROMPT TEMPLATES

### PROMPT 1: "The Mood Board Directive"
*Best for: Major UI redesigns, new dashboards, landing pages*

```
Build [what you need] with this aesthetic direction:

MOOD: [Pick one or blend two]
- The feel of [specific real-world reference — a place, era, object, film]
- As if designed by [type of person/discipline, NOT a specific designer]
- The visual equivalent of [a sensation, sound, or experience]

Examples of good mood directions:
- "The cockpit of a submarine — dark, dense, every indicator vital"
- "A luxury watch face — precise, minimal, quietly expensive"
- "The feeling of opening a leather-bound notebook — warm, textured, personal"
- "A Bloomberg terminal that went to art school"
- "Tokyo street signage at night — layered, neon-lit, controlled chaos"

FUNCTION: [What it must do — be specific about interactions and data]
- Must display [these data points]
- Must support [these user actions]
- Must work on [these screen sizes/contexts]

CONSTRAINT: [Pick one creative limitation]
- "Maximum 3 colors plus black and white"
- "No rounded corners anywhere — all sharp geometry"
- "Every element must be useful — zero decorative elements"
- "Typography does ALL the heavy lifting — minimal use of color"
- "Must feel alive — nothing should be completely static"

One thing that would make this UNFORGETTABLE: [your wild card]
```

**Example for your Command Center:**
```
Redesign the OpenClaw Command Center dashboard with this direction:

MOOD: A military-grade operations center crossed with Tony Stark's
holographic displays. Dark, commanding, information-dense — but with
moments of unexpected elegance. The visual equivalent of hearing a
deep bass note in a quiet room.

FUNCTION:
- 6-stage Kanban board (New → In Progress → Review → Completed → Scheduled → Clawd Suggestions)
- Sub-agent status panels for Atlas, Sentinel, Vanguard, Curator, AdsSpecialist
- Real-time activity feed with severity indicators
- Memory/context usage visualization
- Approval gate notifications that demand attention without being annoying

CONSTRAINT: Information hierarchy through LIGHT — brighter = more urgent.
The default state should be calm and dim. Problems should literally
glow brighter. No color-coding by category — code by URGENCY only.

UNFORGETTABLE ELEMENT: When an approval gate fires, the entire dashboard
should subtly pulse once — like a heartbeat — then settle back. Not flashy.
Physiological. Like the system is alive and breathing.
```

---

### PROMPT 2: "The Feature Inventor"
*Best for: Adding new functionality where you want creative solutions, not obvious ones*

```
I need a new feature for [system/app]. But I don't want the obvious
implementation — I want you to think like an inventor, not an implementer.

THE PROBLEM THIS FEATURE SOLVES:
[Describe the pain point or opportunity — NOT the solution you've imagined]

THE USER'S CONTEXT:
[Who uses this, when, what state of mind are they in, what did they
just finish doing, what will they do next]

CONSTRAINTS:
- Must work within [technical boundaries]
- Must not require [things you want to avoid]
- Must be learnable in under [time limit]

Now give me THREE different concepts for this feature:

CONCEPT A — "THE OBVIOUS ONE"
The straightforward implementation most developers would build.
Include it so we have a baseline, but push it to its best version.

CONCEPT B — "THE SIDEWAYS ONE"
Solve the same problem but from a completely unexpected angle.
What if the feature worked differently than anyone would expect?
What metaphor from outside software could apply here?

CONCEPT C — "THE AMBITIOUS ONE"
If you had no technical limitations, what would the ideal experience
look like? Then work backwards to what's actually buildable.

For each concept:
- 2-sentence pitch (what it IS and why it's interesting)
- How it works (user flow in 4-5 steps)
- The technical approach (implementation sketch, not full code)
- The risk (what could go wrong or feel weird)

I'll pick one (or combine elements) and then we'll build it.
```

**Example:**
```
I need a new feature for OpenClaw's TaskBoard. But I don't want the
obvious implementation — think like an inventor.

THE PROBLEM: When I check in on my AI agents' work after being away
for a few hours, I have to read through each task individually to
understand what happened. There's no quick "what did I miss" summary.

THE USER'S CONTEXT: I'm Danny, checking in from my phone between
meetings or first thing in the morning. I have 60 seconds to decide
if anything needs my immediate attention. I don't want to read — I
want to FEEL the system's status instantly.

CONSTRAINTS:
- Must work in the existing CC-v4.2 single-file HTML architecture
- Must not require additional API calls (use data already available)
- Must be learnable in under 10 seconds — zero onboarding

Give me three concepts.
```

---

### PROMPT 3: "The Enhancement Escalator"
*Best for: Improving existing UI elements — taking something from "works" to "exceptional"*

```
Here's a UI element/component that works but feels flat:

[Paste the current code OR describe what exists]

Enhance it through FOUR escalating levels. Build each level:

LEVEL 1 — POLISH
Same design, better execution. Fix spacing, alignment, typography
weight. Make the existing concept pixel-perfect. This is the baseline
that any competent developer should ship.

LEVEL 2 — REFINE
Add the details that separate "competent" from "crafted." Micro-
interactions on hover/focus. Subtle transitions between states.
Better information hierarchy. The kind of details a user can't
articulate but FEELS when they're missing.

LEVEL 3 — ELEVATE
Rethink the visual approach. Same function, different aesthetic
execution. Maybe the card becomes a row. Maybe the list becomes
a visualization. Challenge one fundamental assumption about how
this element should look while keeping it fully functional.

LEVEL 4 — TRANSCEND
Make it something no one has seen before. Blend the best ideas from
Levels 1-3 with one creative leap. This should be the version that
makes someone say "wait, how did they do that?" or "I've never seen
a [component type] that works like this."

For each level, give me the complete code. I'll pick the level
that fits the context.
```

---

### PROMPT 4: "The Synesthesia Prompt"
*Best for: When you're stuck on aesthetics and need a creative breakthrough*

This one sounds weird but it's extremely effective. It forces the model
out of its "default design" patterns by using cross-sensory descriptions.

```
Design [component/page/feature] as if you're translating a sensory
experience into a visual interface:

THIS INTERFACE SHOULD FEEL LIKE:
- Sound: [e.g., "a low hum with occasional sharp pings"]
- Texture: [e.g., "brushed steel with one glass surface"]
- Temperature: [e.g., "cool but not cold — like morning air"]
- Speed: [e.g., "the pace of a slow-motion explosion"]
- Weight: [e.g., "heavy and grounded, nothing floats"]

THE PRACTICAL REQUIREMENTS:
[List what it actually needs to do — data, interactions, states]

Translate these sensory qualities into specific design decisions:
- Sound → animation timing and rhythm
- Texture → backgrounds, borders, surface treatments
- Temperature → color palette (warm/cool/neutral)
- Speed → transition durations and easing curves
- Weight → typography weight, shadow depth, element density

Then build it. Full working code.
```

**Example for a notification system:**
```
Design OpenClaw's approval gate notification as a sensory translation:

FEEL LIKE:
- Sound: A single deep bell strike that resonates, then silence
- Texture: Polished obsidian with one crack of amber light
- Temperature: The warmth of a screen in a dark room
- Speed: Appears instantly, then SLOWLY becomes more present
- Weight: Unmissable but not aggressive — gravity, not force

PRACTICAL REQUIREMENTS:
- Shows: Agent name, action requested, risk level, timestamp
- Actions: Approve, Deny, View Details
- States: New (unread), Viewed (read but no action), Expired
- Must stack if multiple approvals pending
- Must work in both the dashboard and as a standalone mobile notification

Build it with full HTML/CSS/JS.
```

---

### PROMPT 5: "The Anti-Pattern Breaker"
*Best for: When every output looks the same and you need to break the mold*

```
I keep getting the same style of output for [type of component/page].
Break every common AI design pattern. Here's what I do NOT want:

DO NOT USE:
- [List the specific things you keep seeing that you're tired of]
- Purple/blue gradient backgrounds
- Cards with rounded corners and drop shadows
- Inter, Roboto, or any sans-serif system font as the primary
- The standard header → hero → features → footer layout
- Glassmorphism or neumorphism
- Generic hero illustrations
- Centered text over background images

INSTEAD, design [what you need] using:
- A typography-first approach (type IS the design)
- An unexpected layout structure (name the layout strategy you're using)
- A color palette derived from [a specific source: a photograph, a place,
  a material, a decade]
- Motion that serves a PURPOSE (every animation communicates something)

Show me something I haven't seen an AI generate before.
The function requirements are: [list them]
```

---

### PROMPT 6: "The Director's Cut"
*Best for: Feature additions where you want cinematic, experience-driven design*

```
I'm adding [feature] to [system]. Design it like you're directing
a film scene, not writing code.

THE SCENE:
- Setting: [where is the user when they encounter this?]
- Emotional beat: [what should they feel? Relief? Power? Clarity? Urgency?]
- Pacing: [fast cut? Slow reveal? Building tension?]
- The "hero moment": [the single most important instant in the interaction]

THE SCRIPT (User Flow):
Act 1 — The user arrives at [state]. They see [what?].
Act 2 — They interact with [element]. The system responds by [what?].
Act 3 — The outcome is [result]. They feel [emotion].

THE CHOREOGRAPHY (Interaction Details):
- What draws the eye first?
- What happens on hover/focus?
- What transitions between states?
- What sound would this make if it had audio? (Design the visual rhythm
  to match that imagined sound.)

Now build the full working implementation. Every design decision should
serve the emotional arc described above.

Technical constraints: [list real constraints]
```

---

### PROMPT 7: "The Functional Beauty Mandate"
*Best for: When you need creative output that MUST be production-ready*

This is the workhorse prompt — creative direction with hard functional specs.

```
Build [what you need] that is simultaneously BEAUTIFUL and BULLETPROOF.

BEAUTY REQUIREMENTS (non-negotiable):
- A distinctive aesthetic that I could not find on any template site
- At least ONE element that surprises or delights
- Typography that has been deliberately chosen for this specific context
- Color palette with a rationale (not just "looks good")
- Motion/animation that adds meaning, not decoration

BULLETPROOF REQUIREMENTS (non-negotiable):
- Works on screens from 375px to 2560px wide
- Handles empty states gracefully (what does it look like with no data?)
- Handles overflow gracefully (what happens with 100+ items? 1000 characters in a name?)
- Loading states that maintain the aesthetic (no generic spinners)
- Error states that are helpful AND beautiful
- Keyboard accessible (tab order makes sense)
- Performance: initial render under 100ms, animations at 60fps

THE DELIVERABLE:
[Describe what you need — component, page, feature]

DATA IT DISPLAYS:
[Exact fields, types, value ranges]

INTERACTIONS:
[What the user can do — click, drag, filter, sort, etc.]

AESTHETIC DIRECTION:
[Use one of the mood/reference techniques from earlier prompts,
or describe what you want in sensory terms]

Deliver complete, production-ready code with inline comments
explaining non-obvious design decisions.
```

---

### PROMPT 8: "The Evolution Prompt"
*Best for: Iterating on something that already exists and making it dramatically better*

```
Here is my current [component/page/feature]:

[Paste the existing code]

This works but it's at maybe a 5/10 in terms of design impact.
I need you to evolve it to a 9/10 WITHOUT breaking any functionality.

RULES OF EVOLUTION:
1. Every existing function must still work exactly as before
2. The layout can change but the information architecture cannot
   (same data, same hierarchy, same user flows)
3. You must make at least ONE bold choice that I wouldn't expect
4. Explain your reasoning for the biggest change you made

EVOLUTION PRIORITIES (in order):
1. Typography — make it distinctive and intentional
2. Color — give it a palette that has personality
3. Spacing — create rhythm through whitespace
4. Motion — add life where it serves comprehension
5. Detail — the finishing touches that separate craft from output

Show me the evolved version with a brief "DESIGN NOTES" section
explaining the 3 biggest decisions you made and why.
```

---

## THE POWER MOVES: Advanced Techniques

### Technique 1: "Reference Stacking"
Combine multiple references to create something that doesn't exist yet:

```
"Design this like a Dieter Rams product (functional minimalism)
had a baby with a Blade Runner interface (moody, dense, atmospheric)
and it was raised by Edward Tufte (information density without clutter)."
```

### Technique 2: "The Constraint Squeeze"
The tighter the constraint, the more creative the output:

```
"Build this entire dashboard using ONLY:
- One font family (but any weight/size)
- Black, white, and ONE accent color
- No images, no icons — typography and geometry only"
```

### Technique 3: "The Negative Space Directive"
Tell the AI what the EMPTY areas should do:

```
"The negative space in this layout should feel intentional —
like the silence between notes in music. Every gap should create
breathing room that makes the content more impactful, not just
'unused area.'"
```

### Technique 4: "State Choreography"
Design transitions between states, not just the states themselves:

```
"When data loads, don't just pop it in. Design the ARRIVAL:
- Elements should enter from the direction that makes semantic sense
  (new items from the right, historical from the left)
- Stagger the entrance by 40ms per element
- Each element should feel like it's settling into its natural position,
  not teleporting there"
```

### Technique 5: "The 'One Weird Thing' Rule"
Always ask for one element that breaks the pattern:

```
"This should be clean and systematic everywhere EXCEPT one element
that breaks the grid / defies the color scheme / uses unexpected motion.
That one element should be [the most important interactive element]
because the visual break signals 'this is where the action is.'"
```

---

## CHEAT SHEET: Mood Words That Actually Work

Instead of "modern" and "clean" (which produce generic output), use these:

| Instead of... | Try... | What It Produces |
|---------------|--------|-----------------|
| Modern | Precision-engineered | Sharp, intentional, no wasted space |
| Clean | Surgical | Extreme clarity, almost stark |
| Professional | Authoritative | Commands respect, not boring |
| Beautiful | Arresting | Stops you mid-scroll |
| Simple | Distilled | Complex ideas made elemental |
| Colorful | Chromatic | Deliberate color relationships |
| Dark mode | Nocturnal | Dark with life, not just inverted |
| Minimalist | Monastic | Every element earned its place |
| Futuristic | Anticipatory | Feels like it's from 2 years ahead |
| Elegant | Composed | Grace under complexity |
| Bold | Unapologetic | Takes a stance, no hedging |
| Friendly | Conspiratorial | Feels like an inside joke you're in on |
| Fast | Instantaneous | Zero perceptible delay |
| Responsive | Liquid | Flows between sizes like water |

---

## FINAL TIP: The Two-Prompt Method

For the absolute best results, split creative and functional into two turns:

**Turn 1 (Creative Direction):**
```
I'm about to ask you to build [thing]. Before we write any code,
I want you to be my creative director. Give me:

1. Three aesthetic directions you'd consider for this (with mood
   references and color palettes)
2. One unconventional layout approach
3. The single design decision that would make this memorable

Don't write code yet. Just think about the EXPERIENCE.
```

**Turn 2 (Build It):**
```
Go with [direction you chose]. Now build it with full production
code. Remember: every design decision from your creative brief
should be visible in the implementation. Don't water it down.

[Add your functional requirements here]
```

Separating the thinking from the building gives you dramatically
better results because the model commits to creative choices BEFORE
it gets into the weeds of implementation, where it tends to play safe.
