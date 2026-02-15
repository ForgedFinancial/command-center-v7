# Coding Agent Safety Protocol

> Use this prompt structure when having AI agents write code for production systems.
> These rules prevent agents from breaking existing functionality.

---

## 1. Git Branching — Never Code on Main

```bash
git checkout -b feature/add-lead-form
# agent codes here
# you review
# merge to main only when verified
```

**If it breaks, main is untouched.** Delete the branch and start over.

**Branch naming conventions:**
- `feature/description` — new features
- `fix/description` — bug fixes
- `refactor/description` — code improvements
- `agent/description` — agent-initiated work

---

## 2. Backup Before Every Session

**Tell the agent:** "Before making ANY changes, copy index.html to index.html.bak"

This is **non-negotiable**. Every session, every time.

```bash
cp index.html index.html.bak-$(date +%Y%m%d-%H%M%S)
```

---

## 3. Give Surgical Instructions, Not Open-Ended Ones

| Bad | Good |
|-----|------|
| "Add a lead management system" | "In index.html, after line 450 (the closing div of the login section), add a new function called `renderLeadForm()` that creates a form with these exact fields: Full Name (text), State (dropdown), Age (number), DOB (date), Phone (tel), Email (email). Do NOT modify any existing functions." |

**Be specific about:**
- Exact line numbers or anchors
- Function names
- Field names and types
- What NOT to touch

---

## 4. The Golden Prompt Structure

Copy this template for every coding task:

```
RULES:
1. Do NOT modify any existing functions
2. Do NOT remove or rename any existing CSS classes
3. Do NOT change the login/auth system
4. Only ADD new code — append functions, don't rewrite
5. Before editing, show me the exact lines you plan to change
6. After editing, run a diff showing only what changed

TASK:
[specific task here]

FILES:
- index.html (read it first, understand the structure)

VERIFY:
After changes, confirm these still work:
- Login page loads
- [list existing features that must still work]
```

---

## 5. One Feature Per Session

**Don't ask for 5 things at once.**

1. One feature
2. Verify it works
3. Commit
4. Next feature

**Assembly line, not buffet.**

---

## 6. Review Before Merging

The workflow:

```
Agent pushes to branch
        ↓
You pull on VPS/local
        ↓
Diff against main
        ↓
Flag anything touching existing code
        ↓
You approve
        ↓
Merge to main
```

**Review command:**
```bash
git diff main..feature/branch-name
```

---

## 7. Test Checklist

**Give this to the agent after every change:**

```
After your changes, verify:
[ ] Page loads without console errors
[ ] Login still works
[ ] All existing buttons/links still function
[ ] New feature works as described
[ ] No broken CSS/layout
[ ] Mobile responsive (if applicable)
[ ] No hardcoded secrets/keys exposed
```

---

## 8. Modular Code Structure

**Tell the agent:**

> "Add new features as self-contained functions. Don't inline code into existing functions. Each feature should be its own block that can be removed without breaking anything else."

**Good structure:**
```javascript
// ============================================
// FEATURE: Lead Form
// Added: 2026-02-14 by Claude Code
// Can be safely removed without affecting other features
// ============================================
function renderLeadForm() {
    // all code self-contained here
}

function submitLeadForm() {
    // all code self-contained here
}
// ============================================
// END FEATURE: Lead Form
// ============================================
```

---

## Quick Reference Card

| Rule | Why |
|------|-----|
| Branch for every feature | Main stays safe |
| Backup before changes | Easy rollback |
| Surgical instructions | No scope creep |
| Golden prompt template | Consistent safety |
| One feature at a time | Easier debugging |
| Review before merge | Catch mistakes |
| Test checklist | Verify nothing broke |
| Modular code | Easy to remove/update |

---

## Emergency Rollback

If something breaks:

```bash
# Option 1: Restore from backup
cp index.html.bak index.html

# Option 2: Git reset (if committed)
git checkout main
git branch -D broken-feature-branch

# Option 3: Git revert (if merged to main)
git revert HEAD
```

---

## Example Full Prompt

```
You are editing YN-CRM (index.html, 11,000+ lines, single-file monolith).

RULES:
1. Do NOT modify any existing functions
2. Do NOT remove or rename any existing CSS classes
3. Do NOT change the login/auth system
4. Only ADD new code — append functions, don't rewrite
5. Before editing, show me the exact lines you plan to change
6. After editing, run a diff showing only what changed
7. Wrap new features in clearly marked comment blocks

TASK:
Add a "Quick Note" button to the lead card that opens a modal for adding notes.

LOCATION:
After the renderLeadCard() function (around line 2400)

REQUIREMENTS:
- Button styled with existing .btn-secondary class
- Modal uses existing .modal CSS
- Notes saved to lead.notes array
- Do NOT modify renderLeadCard() — add a separate function

FILES:
- index.html (read lines 2350-2500 first)

VERIFY AFTER:
[ ] Login works
[ ] Lead cards render
[ ] Existing lead actions work
[ ] New Quick Note button appears
[ ] Modal opens/closes
[ ] Note saves correctly
```
