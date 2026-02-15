# AGENT UNSTUCK PROMPTS

> **When to use:** Your assistant agent keeps failing the same task. You've given it the same instructions 2-3 times and it keeps producing broken output, going in circles, or missing the point. Paste one of these prompts to force a reset in thinking.

---

## PROMPT 1 — STOP AND DIAGNOSE (General Purpose)

> Use when: The agent keeps attempting the same fix and it keeps failing.

```
STOP. Do not write any code yet.

You have attempted this task multiple times and it is still failing. Before you try again, do the following:

1. STATE THE PROBLEM: In 2-3 sentences, explain what you are trying to accomplish.
2. LIST WHAT YOU'VE TRIED: Bullet every approach you've taken so far.
3. EXPLAIN WHY EACH FAILED: For each attempt, state the specific error or reason it didn't work.
4. IDENTIFY THE REAL BLOCKER: Based on the pattern of failures, what is the ACTUAL underlying issue? It's probably not what you think it is.
5. PROPOSE A COMPLETELY DIFFERENT APPROACH: Do not repeat any previous strategy. Think from scratch.

Only after completing steps 1-5 should you attempt the fix again. If your new approach also fails, repeat steps 1-5 before trying again.
```

---

## PROMPT 2 — READ BEFORE YOU WRITE

> Use when: The agent keeps writing code that doesn't match the existing codebase patterns, breaks imports, or uses wrong function signatures.

```
STOP WRITING CODE. You are making changes that don't match the existing codebase.

Before your next attempt, do this MANDATORY reading phase:

1. READ the entire file you are trying to modify — top to bottom. Do not skim.
2. LIST every function in that file with its exact signature (name, parameters, return type).
3. LIST every import/require at the top of the file.
4. IDENTIFY the exact function or block you need to change.
5. SHOW ME the 10 lines BEFORE and 10 lines AFTER the code you plan to modify.
6. EXPLAIN how your change fits into the existing patterns you just read.

Only THEN write your code change. Your change must use the same coding style, same variable naming conventions, same error handling patterns, and same function signature patterns as the rest of the file.
```

---

## PROMPT 3 — SMALLEST POSSIBLE CHANGE

> Use when: The agent keeps making sweeping changes that break other things, or over-engineers the solution.

```
Your previous attempts have been too complex and keep breaking things. New rule:

Make the SMALLEST POSSIBLE CHANGE that fixes the problem. Nothing more.

1. Change ONE file only.
2. Change the FEWEST lines possible — ideally under 10 lines.
3. Do NOT refactor anything.
4. Do NOT rename anything.
5. Do NOT add new abstractions, helpers, or utilities.
6. Do NOT change function signatures unless absolutely required.
7. Do NOT touch any code that is currently working.

After making the minimal change, test it. If it works, STOP. Do not "improve" it. Do not "clean up" surrounding code. Ship the fix.
```

---

## PROMPT 4 — WORK BACKWARDS FROM THE ERROR

> Use when: The agent keeps guessing at solutions instead of reading the actual error message.

```
STOP guessing. Read the error message carefully and work BACKWARDS.

1. PASTE the exact, complete error message (no paraphrasing).
2. IDENTIFY the file and line number from the error.
3. READ that exact line in the actual file (not what you think it says — actually read it).
4. TRACE the call chain: what called this function? What called that? Go back 3 levels.
5. IDENTIFY: is the error a wrong input (caller's fault) or wrong handling (this function's fault)?
6. FIX the root cause, not the symptom.

Do NOT try a fix until you can explain the FULL chain from trigger to error. If the error doesn't have a line number, add console.log/print statements to narrow down exactly where it fails, then re-run.
```

---

## PROMPT 5 — RUBBER DUCK (explain it to me like I'm 5)

> Use when: The agent seems confused about what it's even trying to do, keeps contradicting itself, or goes in circles.

```
You seem stuck in a loop. Let's reset with a rubber duck exercise.

Explain the following to me like I'm a complete beginner who has never seen this code:

1. What does this piece of code CURRENTLY do? (Walk me through it step by step)
2. What SHOULD it do instead? (Be specific — give me an example input and expected output)
3. What is the GAP between current behavior and desired behavior? (One sentence)
4. What is the ONE thing you need to change to close that gap?

Do not use jargon. Do not skip steps. Do not say "obviously" or "simply." Walk through every single step of execution as if the computer is the dumbest machine in the world (because it is).
```

---

## PROMPT 6 — FRESH EYES (pretend you've never seen this code)

> Use when: The agent has been in a long conversation and is clearly anchored on wrong assumptions from earlier in the chat.

```
Forget everything about your previous attempts. Treat this as a brand new task.

READ the following files from scratch as if you've never seen them before:
[LIST THE RELEVANT FILES HERE]

Now, with fresh eyes:
1. What does this codebase do?
2. How is it structured?
3. What is the specific task I'm asking you to accomplish?
4. What is the straightforward way to accomplish it based on what you just read?

Do NOT reference any of your previous attempts. Do NOT reference any previous errors. Start completely clean.
```

---

## PROMPT 7 — PROVE IT WORKS FIRST (test before code)

> Use when: The agent writes code that "should work" but never actually verifies it, then the same error comes back.

```
New rule: PROVE your fix works before telling me it's done.

1. WRITE your fix.
2. IMMEDIATELY run/deploy/test it.
3. SHOW ME the output — the actual terminal output, API response, or browser result.
4. If the output shows success → done.
5. If the output shows failure → DO NOT tell me it's fixed. Go back to step 1.

You are NOT allowed to say "this should work" or "this will fix it." I only accept PROOF. Show me the passing test, the 200 response, or the working screenshot.
```

---

## PROMPT 8 — BINARY SEARCH THE BUG

> Use when: The agent can't figure out WHERE the bug is — the error is vague, there's no clear line number, or the system is complex.

```
We're going to find this bug using binary search. No more guessing.

1. IDENTIFY the full code path from start to finish (user action → final result).
2. Add a log/print at the MIDPOINT of that path.
3. Run it. Does the midpoint log show correct data?
   - YES → the bug is in the second half. Add a log at the 75% point.
   - NO → the bug is in the first half. Add a log at the 25% point.
4. Repeat until you've narrowed it to a single function or line.
5. NOW fix that specific line.

Do NOT remove the debug logs until the fix is confirmed working.
```

---

## PROMPT 9 — THE NUCLEAR RESET

> Use when: Nothing works. The agent is completely lost. You want to wipe the slate and start over on this specific feature.

```
FULL RESET. We are starting this task from absolute zero.

1. REVERT all changes you've made to every file. Return them to their last known working state.
2. VERIFY the app/system works in its current state WITHOUT your changes. If it doesn't, fix that first.
3. Now, from this CLEAN working state, tell me:
   - What exactly needs to change?
   - What is the simplest possible implementation?
   - What is the ONE file you need to touch first?
4. Make that ONE change to that ONE file.
5. Test it.
6. If it works, make the NEXT smallest change.
7. Test again.
8. Repeat until the full feature is done.

Each change must leave the system in a WORKING state. If any single change breaks things, revert it and try a different approach for that specific step.
```

---

## PROMPT 10 — CHECK YOUR ASSUMPTIONS

> Use when: The agent keeps saying "this should work" but it doesn't, suggesting it has a wrong mental model of the system.

```
Your fix keeps failing, which means one of your assumptions is WRONG. Let's find it.

List every assumption you're making about this code. For example:
- "I assume this function returns a string"
- "I assume this API endpoint exists"
- "I assume this variable is defined at this point"
- "I assume this runs in order"
- "I assume this library is installed"
- "I assume this config value is set"

Now VERIFY each assumption. Actually check. Read the code. Run a test. Log the value. Don't just say "yes that's correct" — PROVE each one.

The bug is hiding behind whichever assumption you can't prove.
```

---

## QUICK REFERENCE — WHICH PROMPT WHEN

| Symptom | Use Prompt |
|---------|-----------|
| Keeps trying the same thing that already failed | **1** (Stop and Diagnose) |
| Code doesn't match existing patterns, wrong function signatures | **2** (Read Before You Write) |
| Over-engineers, breaks other things with big changes | **3** (Smallest Possible Change) |
| Ignores the actual error message, guesses at fixes | **4** (Work Backwards From Error) |
| Confused, contradicts itself, goes in circles | **5** (Rubber Duck) |
| Anchored on wrong assumptions from earlier conversation | **6** (Fresh Eyes) |
| Says "fixed" but it's not actually fixed | **7** (Prove It Works First) |
| Can't figure out WHERE the bug is | **8** (Binary Search) |
| Completely lost, everything is broken | **9** (Nuclear Reset) |
| "This should work" but it doesn't | **10** (Check Your Assumptions) |

---

## PRO TIPS FOR MANAGING STUCK AGENTS

1. **Start a new conversation** after 3 failed attempts in the same chat. Long conversations anchor agents on bad assumptions.

2. **Give it the error, not the fix.** Instead of "change line 34 to X", say "line 34 throws this error: [paste error]. Find and fix the root cause." Let the agent diagnose.

3. **Reduce scope.** If the agent can't build the whole feature, break it into pieces. "Just make the API endpoint return the right data. Don't touch the frontend yet."

4. **Show, don't tell.** Paste the actual output, actual error, actual behavior. Don't describe it in words — agents misinterpret descriptions.

5. **Pin the files.** Tell the agent EXACTLY which files to look at: "The bug is in workers/api/worker.js, specifically in the authenticate() function on lines 232-270. Do not look at other files."

6. **One task per conversation.** Don't mix "fix the auth bug" with "also add pagination." Each gets its own conversation with a clean context.
