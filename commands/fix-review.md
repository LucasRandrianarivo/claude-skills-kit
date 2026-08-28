---
description: Auto-fix all issues found by /review, then re-validate
---

# /fix-review — Auto-Fix Code Review Issues

## Usage
```
/fix-review              — review + fix uncommitted changes
/fix-review <file paths> — review + fix specific files
/fix-review --last       — review + fix the last commit
/fix-review --branch     — review + fix all branch changes
```

## Overview

Run a full 4-phase `/review`, then automatically fix all 🔴 (critical) and 🟡 (warning) issues. Report 🔵 (suggestions) without fixing them.

---

## Step 1: Run Full Review

Execute the complete 4-phase review (same as `/review`):

1. **Code Quality** — dead code, duplication, naming, typing, error handling, constants, function size
2. **Readability** — nesting, conditions, clarity, abstractions, ordering, comments
3. **Architecture** — file placement, dependency direction, patterns
4. **Security** — auth, validation, injection, data exposure, secrets

Collect all findings into a master list with severity.

## Step 2: Categorize Findings

Split all findings into three buckets:

| Bucket | Action |
|--------|--------|
| 🔴 Critical | **Auto-fix** — apply correction immediately |
| 🟡 Warning | **Auto-fix** — apply correction immediately |
| 🔵 Suggestion | **Report only** — list for human decision |

## Step 3: Apply Fixes

For each 🔴 and 🟡 finding, apply the fix:

- Read the file and understand the surrounding context
- Apply the minimal change that resolves the issue
- Do NOT change unrelated code
- Do NOT alter the feature's behavior — only improve quality/security
- If a fix requires a design decision (e.g., choosing between two valid approaches), move it to the human-decision table instead

After each file is modified, verify:
- No syntax errors introduced
- The fix actually addresses the issue

## Step 4: Validate

Run the project's available checks (read from CLAUDE.md or project config):
- Lint check
- Type check
- Test suite

If any check fails after fixes:
1. Diagnose which fix caused the failure
2. Revert that specific fix
3. Move it to the human-decision table
4. Re-run checks until green

## Step 5: Output Report

```
## Corrections Applied

| # | Phase | Severity | File | Line | Issue | Fix Applied |
|---|-------|----------|------|------|-------|------------|
| 1 | Quality | 🔴 | path/file.ext | 42 | Unused import | Removed import |
| 2 | Security | 🔴 | path/file.ext | 87 | SQL injection | Parameterized query |
| 3 | Quality | 🟡 | path/file.ext | 15 | Magic number | Extracted constant |
| 4 | Readability | 🟡 | path/file.ext | 33 | 4-level nesting | Early return pattern |

Total: X fixes applied

## Human Decisions Required

| # | Phase | Severity | File | Line | Issue | Options |
|---|-------|----------|------|------|-------|---------|
| 1 | Architecture | 🔵 | path/file.ext | 10 | File could be split | A: keep as-is, B: split into 2 files |
| 2 | Readability | 🔵 | path/file.ext | 55 | Generic function name | Rename to X or Y |

## Validation
- Lint: ✅/❌
- Types: ✅/❌
- Tests: ✅/❌

Score: X/10 (before) -> Y/10 (after)
```

If all checks pass, suggest running `/commit` to save the improvements.
