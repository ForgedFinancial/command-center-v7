# Building a 4-Dimensional Self-Improving AI Agent
## Implementation Guide: Reflection → Skills → Validation → Memory

*Created for Danny — OpenClaw.ai & Claude Agent Architecture*

---

## THE CORE CONCEPT: The Reinforcement Flywheel

The four dimensions aren't separate features — they're a **self-reinforcing loop**:

```
┌─────────────┐     generates insights     ┌──────────────┐
│  REFLECTION  │ ──────────────────────────▶│    SKILLS     │
│  (Learning)  │                            │  (Encoding)   │
└──────┬───────┘                            └──────┬────────┘
       ▲                                           │
       │ feeds learning                reduces need │
       │ signals back                  for checking │
       │                                           ▼
┌──────┴───────┐                            ┌──────────────┐
│    MEMORY    │◀────────────────────────────│  VALIDATION   │
│  (Context)   │     catches errors that    │  (Quality)    │
└──────────────┘     become new memories     └──────────────┘
```

Every output your agent produces should touch ALL FOUR dimensions:
1. **Reflect** on the task and past attempts
2. **Check** the skill library for relevant procedures
3. **Validate** the output before delivery
4. **Store** what worked (and what didn't) for next time

---

## PART 1: BUILDING THE CLAUDE AGENT (All Four Dimensions)

### Step 1: The Foundation System Prompt

This is your master system prompt that activates all four dimensions. Adapt this for OpenClaw.ai or any Claude-based agent:

```xml
<system_prompt>
You are an elite AI operator with four cognitive capabilities that activate
on EVERY task. These are not optional — they are your operating system.

<reflection_engine>
Before generating any output:
1. RECALL: Check if you've encountered a similar task before.
   If <memory> contains relevant past attempts, load them.
2. PLAN: State your approach in 2-3 sentences. Identify risks.
3. After generating output, SELF-CRITIQUE:
   - What assumptions did I make?
   - What could fail?
   - Rate your confidence: HIGH (>90%), MEDIUM (70-90%), LOW (<70%)
4. If confidence is LOW, generate a second attempt incorporating your critique.
Cap reflection loops at 3 iterations maximum.
</reflection_engine>

<skill_library>
Before starting work, check if a relevant skill exists:
- If a procedure has been documented for this task type, FOLLOW IT exactly.
- If you develop a new approach that works well, FLAG IT for skill capture:
  "[SKILL CANDIDATE] This approach for {task_type} should be saved."
- When composing outputs, prefer PROVEN PATTERNS from skills over improvisation.
Skills are organized: core/ | domain/ | integrations/ | meta/
</skill_library>

<validation_pipeline>
Every output passes through these gates before delivery:
GATE 1 — FORMAT: Does the output match the requested structure?
GATE 2 — CONTENT: Are all required elements present and in-range?
GATE 3 — LOGIC: Is the reasoning internally consistent?
GATE 4 — GROUNDING: Are claims supported by evidence or source material?
GATE 5 — SAFETY: Could this output cause unintended consequences?

If ANY gate fails, revise before delivering. State which gates passed/failed
in your internal reasoning.
</validation_pipeline>

<memory_system>
At the END of every task:
- Extract KEY FACTS (names, decisions, preferences) → semantic memory
- Extract WHAT WORKED/FAILED (approaches, tools, patterns) → episodic memory
- Extract PROCEDURES worth reusing → procedural memory (skill candidates)
- Flag CONTRADICTIONS with existing memory for resolution

At the START of every task:
- Load relevant context from memory
- Note what you know vs. what you need to ask about
</memory_system>

<output_format>
When delivering work, always include:
1. The deliverable itself
2. A brief confidence assessment (1 sentence)
3. Any skill candidates flagged during the work
4. Key facts/decisions to remember (for memory extraction)
</output_format>
</system_prompt>
```

---

### Step 2: The CLAUDE.md Memory File

Create this as your persistent project memory. For OpenClaw.ai on VPS, store at the project root. For Claude.ai conversations, this is what you paste at the beginning of sessions or encode in your system prompt:

```markdown
# PROJECT MEMORY — OpenClaw Command Center

## Who I Am
- Operator: Danny (Chicago, IL)
- Business: YN Navigators / Legacy Life / Forged Financial
- Role: Life insurance lead generation across FEX, Veterans, Truckers, IUL
- Team: Shary (Meta Ads), John (GoHighLevel CRM)
- RULE: Never contact employees directly. All comms through Danny.

## Active Context
- OpenClaw.ai: Executive assistant system on Hostinger VPS
- TaskBoard: 6-stage Kanban (New → In Progress → Review → Completed → Scheduled → Clawd Suggestions)
- Approval gates: ALL AI-generated actions require Danny's approval
- Sub-agents: Atlas, Sentinel, AdsSpecialist, Vanguard, Curator
- Dashboard: CC-v4.2 (single-file HTML, 40+ integrations)

## Proven Patterns (Episodic Memory)
<!-- Updated after each successful session -->
- GoHighLevel workflows: Use webhook triggers, not polling
- Meta Ads: Always check spend vs. CPL ratio before recommending changes
- File creation: Use 4-part checkpoint system for long tasks
- VPS work: Always verify Tailscale connectivity first

## Skill Index
<!-- Skills that have been captured and validated -->
1. meta-ads-audit — Structured review of campaign performance
2. ghl-pipeline-check — CRM pipeline health assessment
3. vps-deployment — Safe deployment checklist for Hostinger
4. dashboard-update — CC dashboard modification procedure

## Known Preferences
- Detailed technical documentation with visual guides
- Gradient color schemes for dashboards
- Checkpoint saves for long operations
- Explicit approval before any external actions
```

---

### Step 3: Skill File Template

Every time your agent develops a reliable approach, capture it. Here's the template for your `~/.claude/skills/` or your OpenClaw skill library:

```markdown
---
name: [task-type-identifier]
description: |
  [2-3 sentences with SPECIFIC trigger keywords.
  Include when-to-use and when-NOT-to-use.]
---

# [Skill Name]

## Overview
[1 paragraph: what this skill does and why it exists]

## Prerequisites
- [Tool/access requirements]
- [Data needed before starting]

## Procedure
1. [First step — be specific, not generic]
2. [Second step — include exact commands/formats]
3. [Third step — note decision points]
4. [Validation checkpoint — what does "correct" look like here?]
5. [Final step — delivery format]

## Quality Checks
- [ ] [Specific thing to verify]
- [ ] [Another specific thing]
- [ ] [Edge case to watch for]

## Common Failures & Fixes
| Failure Mode | Symptom | Fix |
|-------------|---------|-----|
| [What goes wrong] | [How you know] | [What to do] |

## Examples
### Good Output
[Concrete example of what success looks like]

### Bad Output (Avoid This)
[Concrete example of what failure looks like and why]

## History
- v1.0 — [date] — Initial capture from [session/task]
- v1.1 — [date] — Fixed [issue] based on [feedback]
```

---

### Step 4: The Validation Chain Prompt

Use this as a **follow-up prompt** after any agent output to run it through quality gates. This works inside Claude or as a second-pass prompt in any system:

```
Review the output above against these 5 validation gates.
For each gate, state PASS or FAIL with a 1-sentence justification.

GATE 1 — FORMAT INTEGRITY
Does the output match the requested structure/format exactly?
Are all required sections present? Is it properly formatted?

GATE 2 — CONTENT COMPLETENESS
Are all requested elements addressed? Are values realistic and in-range?
Is anything missing that was explicitly or implicitly requested?

GATE 3 — LOGICAL CONSISTENCY
Does the reasoning flow logically? Are there contradictions?
Do conclusions follow from the evidence presented?

GATE 4 — GROUNDING & ACCURACY
Are factual claims verifiable? Are recommendations supported by data?
Is anything stated as fact that is actually an assumption?

GATE 5 — OPERATIONAL SAFETY
Could executing this output cause unintended consequences?
Are there edge cases, permissions issues, or irreversible actions?

VERDICT: [ALL PASS / REVISE NEEDED]
If REVISE NEEDED, produce a corrected version addressing only the failed gates.
```

---

### Step 5: The Session-End Memory Extraction Prompt

Run this at the end of every work session to feed the memory system:

```
Based on our conversation, extract the following for persistent memory:

## Facts Learned (Semantic Memory)
[New information about the user, their business, preferences, or constraints
that should be remembered across all future sessions]

## What Worked / What Failed (Episodic Memory)
[Approaches attempted, which succeeded, which failed, and why.
Include specific error messages or failure modes encountered.]

## Procedures Worth Saving (Procedural Memory / Skill Candidates)
[Any multi-step process that was developed during this session that
could be reused. Include the exact steps, not just a summary.]

## Memory Updates (Contradiction Resolution)
[Any existing memories that need to be updated or invalidated
based on new information from this session.]

## Open Items
[Tasks started but not completed, decisions deferred, questions unanswered]

Format each section as bullet points. Be specific — "the API endpoint
changed" is useless; "GoHighLevel OAuth redirect URI must use
https://goatleads.com/oauth/callback not /auth/callback" is useful.
```

---

## PART 2: CROSS-PLATFORM PROMPTS FOR REPEATABLE OUTCOMES

These prompts work on ChatGPT, Gemini, Llama, Mistral, Perplexity — any capable LLM. They're designed to produce consistent, high-quality outputs regardless of model.

---

### PROMPT 1: "The Self-Refining Generator"
*Use for: Any content creation, analysis, or problem-solving task*

```
I need you to complete a task using a 3-pass approach:

TASK: [describe what you need]

PASS 1 — GENERATE
Complete the task to the best of your ability. At the end, include a section
called "SELF-CRITIQUE" where you identify:
- 3 weaknesses in your output
- 2 assumptions you made that might be wrong
- 1 thing that could fail in practice

PASS 2 — REVISE
Now rewrite your output addressing every item in your self-critique.
Specifically fix each weakness, validate each assumption, and mitigate
the failure risk. Mark what changed with [REVISED] tags.

PASS 3 — VALIDATE
Review your revised output against these criteria:
□ Completeness — nothing missing from the original request
□ Accuracy — all claims are defensible
□ Actionability — someone could execute this without asking follow-up questions
□ Structure — organized logically, easy to scan
State which criteria pass and which need work. Make final adjustments.

Deliver only the final validated output (not the intermediate passes).
```

---

### PROMPT 2: "The Constitutional Evaluator"
*Use for: Evaluating any AI output, document, strategy, or plan*

```
Evaluate the following [document/output/plan] against these 6 principles.
For each principle, give a score of 1-5 and specific feedback.

CONTENT TO EVALUATE:
[paste or describe the content]

PRINCIPLES:
1. ACCURACY — Are all facts correct? Are claims supported?
2. COMPLETENESS — Is anything important missing?
3. CLARITY — Could someone unfamiliar execute this without confusion?
4. EFFICIENCY — Is there unnecessary complexity? Could it be simpler?
5. RISK AWARENESS — Are edge cases and failure modes addressed?
6. ACTIONABILITY — Does it lead to concrete next steps?

For each principle:
- Score: [1-5]
- Evidence: [specific examples from the content]
- Fix: [exactly what to change to improve the score]

OVERALL VERDICT: [READY / NEEDS REVISION / MAJOR REWORK]

If NEEDS REVISION or MAJOR REWORK, produce a corrected version
implementing all your suggested fixes.
```

---

### PROMPT 3: "The Skill Extractor"
*Use for: Capturing a successful workflow as a reusable procedure*

```
I just completed a task successfully and want to capture the approach
as a reusable procedure. Here's what happened:

[Describe what you did, the steps taken, decisions made, and the outcome]

Extract this into a reusable skill document with:

1. TRIGGER CONDITIONS
   When should this procedure be used? (specific keywords/scenarios)
   When should it NOT be used?

2. PREREQUISITES
   What must be true before starting?

3. STEP-BY-STEP PROCEDURE
   Numbered steps with exact actions (not vague summaries).
   Include decision points as IF/THEN branches.
   Mark validation checkpoints with ✓

4. QUALITY CHECKLIST
   5-7 items to verify the output is correct

5. FAILURE MODES
   What commonly goes wrong and how to recover

6. EXAMPLE
   One concrete example of good input → good output

Make it specific enough that someone (or an AI) could follow it
without any additional context and get the same quality result.
```

---

### PROMPT 4: "The Iterative Problem Solver"
*Use for: Complex problems requiring multiple attempts*

```
I need to solve a complex problem and I want you to approach it
iteratively. Do NOT try to give me the final answer immediately.

PROBLEM: [describe the problem]

Follow this process:

ATTEMPT 1:
- State your understanding of the problem in your own words
- Identify the core challenge and 2-3 possible approaches
- Pick the most promising approach and execute it
- Rate your confidence in the result (LOW/MEDIUM/HIGH)

REFLECTION:
- What's strong about this solution?
- What's weak or uncertain?
- What would you do differently?

ATTEMPT 2 (only if confidence was LOW or MEDIUM):
- Incorporate your reflection
- Try the approach you identified as "what I'd do differently"
- Compare with Attempt 1 — which is stronger and why?

FINAL DELIVERY:
- Present the best solution with your confidence level
- Include 1-2 caveats or assumptions the user should verify
- Suggest one follow-up action to validate the solution
```

---

### PROMPT 5: "The Chain-of-Verification Factchecker"
*Use for: Any output where accuracy matters (research, reports, recommendations)*

```
I need you to answer a question/complete a task, but I need
high factual reliability. Use this process:

TASK: [describe what you need]

STEP 1 — DRAFT RESPONSE
Generate your initial response.

STEP 2 — GENERATE VERIFICATION QUESTIONS
Based on your draft, list 3-5 specific questions that, if answered
correctly, would verify the key claims in your response.
Example: "Is it true that X costs $Y?" or "Does Z actually support feature W?"

STEP 3 — ANSWER VERIFICATION QUESTIONS
Answer each question independently. DO NOT look at your draft while
answering — treat each question as a fresh, standalone query.

STEP 4 — RECONCILE
Compare your verification answers against your draft.
- Where they AGREE: mark as [VERIFIED]
- Where they DISAGREE: mark as [NEEDS CORRECTION] and fix
- Where you're UNCERTAIN: mark as [UNVERIFIED — user should confirm]

STEP 5 — FINAL RESPONSE
Deliver the corrected response with verification status markers removed,
but list any [UNVERIFIED] items separately at the end.
```

---

### PROMPT 6: "The Compound Growth Prompt" (Meta-Level)
*Use for: Making ANY prompt better over time. This is the prompt that improves prompts.*

```
I have a prompt that I use regularly, but I want to make it
produce better results over time. Here's the prompt:

---
[paste your existing prompt]
---

And here's the output it produced:
[paste the output, or describe what was good/bad about it]

Do the following:

1. DIAGNOSE: What's causing the output to be suboptimal?
   - Is the prompt too vague? Too constraining?
   - Is it missing examples? Missing constraints?
   - Is it asking for too much in one pass?

2. PRESCRIBE: Suggest 3 specific modifications ranked by impact:
   - Modification 1 (highest impact): [what to change and why]
   - Modification 2: [what to change and why]
   - Modification 3: [what to change and why]

3. REWRITE: Produce the improved prompt incorporating all 3 modifications.
   Mark each change with a comment explaining what it fixes.

4. TEST PREDICTION: Describe how the output should differ with
   the improved prompt. What specific improvements should I expect?
```

---

## PART 3: PUTTING IT ALL TOGETHER — The Daily Operating Rhythm

Here's how the four dimensions flow in a typical work session:

### Session Start (Memory Load)
```
Load CLAUDE.md / project memory
↓
Retrieve relevant episodic memories for today's tasks
↓
Check skill index for applicable procedures
↓
Begin work with full context loaded
```

### During Work (Reflection + Validation)
```
For each task:
  1. Check skill library → follow procedure if exists
  2. If no skill → use Self-Refine loop (generate → critique → revise)
  3. Run output through validation gates
  4. Flag any skill candidates discovered
  5. Note what worked/failed for episodic memory
```

### Session End (Memory Extraction + Skill Capture)
```
Run memory extraction prompt
↓
Update CLAUDE.md with new facts/preferences
↓
Capture any flagged skill candidates into skill files
↓
Update episodic memory with session outcomes
↓
Note any open items for next session
```

---

## QUICK REFERENCE: Which Prompt for Which Situation

| Situation | Use This | Platform |
|-----------|----------|----------|
| Building anything complex | Self-Refining Generator (#1) | Any |
| Checking quality of AI output | Constitutional Evaluator (#2) | Any |
| Saving a successful approach | Skill Extractor (#3) | Any |
| Tough problem, need iteration | Iterative Problem Solver (#4) | Any |
| Accuracy-critical research | Chain-of-Verification (#5) | Any |
| Making a prompt better | Compound Growth Prompt (#6) | Any |
| Full agent system | Part 1 System Prompt + Memory | Claude |
| Claude Code / CLI projects | CLAUDE.md + Skill files | Claude Code |
| OpenClaw.ai sub-agents | System Prompt per agent + shared memory | Claude API |

---

## THE GOLDEN RULE

**Start simple. Add complexity only when you have evidence it's needed.**

Week 1: Self-Refine loop + CLAUDE.md memory file + 3 hand-crafted skills
Week 2: Add validation gates + session-end memory extraction
Week 3: Begin auto-capturing skills from successful sessions
Week 4: Implement the Compound Growth Prompt on your most-used prompts

Each week, your system gets measurably stronger because each dimension
feeds the others. That's the compounding effect.
