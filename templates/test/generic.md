---
description: Run and diagnose tests on any stack — discover the runner, classify failures, fix
argument-hint: "[file or pattern]"
---

# /test — Test Runner (Generic)

## Usage
```
/test [file or pattern]
```

## Overview
Stack-agnostic test running. Discovers the project's test command, runs the suite (or the given scope), diagnoses failures, and fixes them.

---

## Phase 1: Discover the test command

Check in order, use the first match:

| Source | How |
|--------|-----|
| `package.json` scripts | `test`, `test:unit`, `test:e2e` scripts |
| Config files | `vitest.config.*`, `jest.config.*`, `playwright.config.*`, `cypress.config.*`, `pytest.ini`, `phpunit.xml` |
| Language convention | `go test ./...`, `cargo test`, `python -m pytest`, `mvn test` |
| `Makefile` | a `test` target |
| CI config | `.github/workflows/*.yml` test steps |

If multiple exist (unit + e2e), run unit first; run e2e only when the change touches user-facing flows or the user asks.

## Phase 2: Execute

1. Run the discovered command, scoped to `$ARGUMENTS` if provided
2. Capture full output: passed / failed / skipped counts and every error detail

## Phase 3: Diagnose (if failures)

For each failing test:

1. **Read the test** — what behavior does it expect?
2. **Read the source** — what does the code actually do?
3. **Classify**:

| Failure type | Diagnosis |
|-------------|-----------|
| Assertion mismatch | Is the test outdated, or is the code wrong? Check `git log` on both |
| Setup/fixture error | Missing mock, DB state, env var, or setup file |
| Timeout / async | Unawaited promise, real network call leaking, race condition |
| Flaky (passes on retry) | Shared state between tests, time/ordering dependence |
| Import/compile error | Broken path, missing dependency, config drift |

4. **Determine responsibility**: fix the test if the behavior change was intentional; fix the source if not. Never delete a failing test to make the suite green.

## Phase 4: Fix and re-run

1. Apply the fix
2. Re-run the failing tests, then the full scope
3. Report:

```
## Test Report
Command: <command>
Before: <pass>/<fail>/<skip>   After: <pass>/<fail>/<skip>
Fixes:
- <file>: <what was wrong> → <what was done>
```

If a failure revealed a real bug (not a test issue), log it to `.claude/learnings.jsonl`.
