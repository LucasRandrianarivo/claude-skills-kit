---
description: Readability review only — nesting, conditions, clarity, abstractions
argument-hint: "[files]"
---

# /simplify — Readability Review (Phase 2)

## Usage
```
/simplify              — review uncommitted changes
/simplify <file paths> — review specific files
/simplify --last       — review the last commit
/simplify --branch     — review all commits on current branch vs main
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **No arguments**: run `git diff` + `git diff --cached` to get uncommitted changes
- **File paths**: review only those files (read each file in full)
- **`--last`**: run `git diff HEAD~1` to review the last commit
- **`--branch`**: run `git log main..HEAD --oneline` then `git diff main...HEAD`

If no changes are found, inform the user and exit.

---

## Review: Readability

Analyze every changed line against these checks:

| Check | What to look for |
|-------|-----------------|
| Nesting depth | > 3 levels of nesting — use early returns, guard clauses, or extraction |
| Complex conditions | Boolean expressions with > 2 operators — name them or simplify |
| Unclear intent | Code whose purpose is not obvious without reading surrounding context |
| Abstraction level | Mixing high-level orchestration with low-level details in one function |
| Ordering | Functions/methods not in a logical reading order (public first, helpers after) |
| Redundant comments | Comments that just restate the code (`// increment i` above `i++`) |
| Missing context | Complex logic with no comment explaining *why* (not *what*) |
| Long expressions | Chained calls or ternaries that should be broken into named steps |
| Inconsistent style | Mixing conventions within the same file (arrow vs function, etc.) |
| Cognitive load | Code that requires mental state-tracking to understand |

---

## Output Format

```
## Readability Review

| # | Severity | File | Line | Issue | Suggestion |
|---|----------|------|------|-------|------------|
| 1 | 🔴 | path/to/file.ext | 42 | 5-level nesting in `processOrder` | Extract inner logic to `validateItems()` and use early return |
| 2 | 🟡 | path/to/file.ext | 87 | Complex ternary with side effects | Break into if/else with named variables |
| 3 | 🔵 | path/to/file.ext | 15 | `data` is too generic a name | Rename to `userPreferences` |

**Severity legend:**
- 🔴 Critical — significantly harms readability, must simplify
- 🟡 Warning — noticeable friction, should simplify
- 🔵 Suggestion — minor improvement

Score: X/10

Actions Required:
- 🔴 <critical items>
- 🟡 <warning items>
```

**Scoring guide:**
- 10: Clean, clear, easy to follow
- 8-9: Minor style suggestions only
- 6-7: Some readability friction
- 4-5: Hard to follow in places
- 1-3: Significantly difficult to read and maintain

For each finding, provide a **concrete rewrite suggestion** — not just "simplify this" but show *how* to simplify it.
