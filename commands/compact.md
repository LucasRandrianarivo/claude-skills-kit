---
description: Code quality review only — dead code, duplication, naming, typing, error handling
argument-hint: "[files]"
---

# /compact — Code Quality Review (Phase 1)

## Usage
```
/compact              — review uncommitted changes
/compact <file paths> — review specific files
/compact --last       — review the last commit
/compact --branch     — review all commits on current branch vs main
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **No arguments**: run `git diff` + `git diff --cached` to get uncommitted changes
- **File paths**: review only those files (read each file in full)
- **`--last`**: run `git diff HEAD~1` to review the last commit
- **`--branch`**: run `git log main..HEAD --oneline` then `git diff main...HEAD`

If no changes are found, inform the user and exit.

---

## Review: Code Quality

Analyze every changed line against these checks:

| Check | What to look for |
|-------|-----------------|
| Dead code | Unused variables, unreachable branches, commented-out code |
| Duplication | Repeated logic that should be extracted into a shared function |
| Naming | Unclear, misleading, or inconsistent names |
| Typing | Missing types, `any` usage, implicit types where explicit is better |
| Error handling | Missing try/catch, unhandled rejections, swallowed errors |
| Constants | Magic numbers/strings that should be named constants |
| Function size | Functions > 40 lines that should be split |
| Imports | Unused imports, circular dependencies |
| Return values | Functions that return inconsistent types or shapes |
| Side effects | Unexpected mutations, hidden state changes |

---

## Output Format

```
## Code Quality Review

| # | Severity | File | Line | Issue | Suggestion |
|---|----------|------|------|-------|------------|
| 1 | 🔴 | path/to/file.ext | 42 | Unused variable `data` | Remove or use it |
| 2 | 🟡 | path/to/file.ext | 87 | Magic number 3600 | Extract to `SECONDS_PER_HOUR` constant |
| 3 | 🔵 | path/to/file.ext | 15 | Function `process` is 65 lines | Split into `validate` + `transform` |

**Severity legend:**
- 🔴 Critical — must fix before merge
- 🟡 Warning — should fix
- 🔵 Suggestion — nice to have

Score: X/10

Actions Required:
- 🔴 <critical items>
- 🟡 <warning items>
```

**Scoring guide:**
- 10: No issues
- 8-9: Only 🔵 suggestions
- 6-7: Some 🟡 warnings, no 🔴
- 4-5: Has 🔴 critical issues
- 1-3: Multiple 🔴 critical issues

Be specific in every finding: include the exact file, line number, variable/function name, and a concrete suggestion — never vague.
