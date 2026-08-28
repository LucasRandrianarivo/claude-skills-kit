---
description: Full 4-phase code review — quality, readability, architecture, security
argument-hint: "[files] [--last] [--branch]"
---

# /review — Full 4-Phase Code Review

## Usage
```
/review              — review uncommitted changes
/review <file paths> — review specific files
/review --last       — review the last commit
/review --branch     — review all commits on current branch vs main
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **No arguments**: run `git diff` + `git diff --cached` to get uncommitted changes
- **File paths**: review only those files (read each file in full)
- **`--last`**: run `git diff HEAD~1` to review the last commit
- **`--branch`**: run `git log main..HEAD --oneline` then `git diff main...HEAD`

If no changes are found, inform the user and exit.

---

## Phase 1: Code Quality

Review every changed line for:

| Check | What to look for |
|-------|-----------------|
| Dead code | Unused variables, unreachable branches, commented-out code |
| Duplication | Repeated logic that should be extracted |
| Naming | Unclear, misleading, or inconsistent names |
| Typing | Missing types, `any` usage, implicit types where explicit is better |
| Error handling | Missing try/catch, unhandled promise rejections, swallowed errors |
| Constants | Magic numbers/strings that should be named constants |
| Function size | Functions > 40 lines that should be split |
| Imports | Unused imports, circular dependencies |

Output a severity table:

```
## Phase 1: Code Quality

| # | Severity | File | Line | Issue | Suggestion |
|---|----------|------|------|-------|------------|
| 1 | 🔴 | ... | ... | ... | ... |
| 2 | 🟡 | ... | ... | ... | ... |
| 3 | 🔵 | ... | ... | ... | ... |
```

## Phase 2: Readability

| Check | What to look for |
|-------|-----------------|
| Nesting depth | > 3 levels of nesting (suggest early returns, extraction) |
| Complex conditions | Boolean expressions that need simplification or naming |
| Clarity | Code whose intent is not obvious without a comment |
| Abstractions | Wrong level of abstraction (too high or too low) |
| Ordering | Logical ordering of functions/methods within a file |
| Comments | Missing, outdated, or redundant comments |

Output the same severity table format for Phase 2.

## Phase 3: Architecture

| Check | What to look for |
|-------|-----------------|
| File placement | Files in the wrong directory per project conventions |
| Dependency direction | Lower layers importing from higher layers |
| Pattern violations | Breaking established patterns (read CLAUDE.md and neighbors) |
| Coupling | Tight coupling between unrelated modules |
| Cohesion | Files/functions doing too many unrelated things |
| API surface | Exposing internal details that should be private |

Output the same severity table format for Phase 3.

## Phase 4: Security

| Check | What to look for |
|-------|-----------------|
| Authentication | Missing or bypassable auth checks |
| Input validation | Unvalidated user input reaching business logic or DB |
| Injection | SQL injection, XSS, command injection, path traversal |
| Data exposure | Sensitive data in logs, responses, or error messages |
| Secrets | Hardcoded API keys, passwords, tokens |
| Permissions | Missing authorization checks, privilege escalation |
| Dependencies | Known vulnerable patterns |

Output the same severity table format for Phase 4.

---

## Final Summary

After all 4 phases, output:

```
## Review Summary

| Phase | Issues | 🔴 | 🟡 | 🔵 |
|-------|--------|-----|-----|-----|
| Code Quality | ... | ... | ... | ... |
| Readability | ... | ... | ... | ... |
| Architecture | ... | ... | ... | ... |
| Security | ... | ... | ... | ... |

Score: X/10

Actions Required:
- 🔴 <list critical items that MUST be fixed>
- 🟡 <list items that SHOULD be fixed>
- 🔵 <list suggestions for improvement>
```

**Scoring guide:**
- 10: No issues found
- 8-9: Only 🔵 suggestions
- 6-7: Some 🟡 warnings, no 🔴
- 4-5: Has 🔴 critical issues
- 1-3: Multiple 🔴 critical issues, security concerns
