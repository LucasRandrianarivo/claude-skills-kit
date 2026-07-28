---
description: Run and diagnose Jest tests — classify failures, fix test or source
argument-hint: "[file or pattern]"
---

# /test — Test Runner (Jest)

## Usage
```
/test [file or pattern]
```

## Overview
Run, diagnose, and fix tests using Jest. If a file or pattern is provided, scope to that. Otherwise, run the full suite.

---

## Phase 1: Discovery

1. Parse `$ARGUMENTS` for a specific file, pattern, or test name
2. Read `jest.config.ts` (or `jest.config.js`, or `jest` key in `package.json`) to understand:
   - Test file patterns (`testMatch` / `testPathPattern`)
   - Setup files (`setupFiles`, `setupFilesAfterFramework`)
   - Test environment (`jsdom`, `node`)
   - Module name mapping (`moduleNameMapper`)
   - Transform configuration
   - Coverage configuration
3. Identify the test scope:
   - If argument is a file path: run that file
   - If argument is a pattern: run matching files
   - If argument is empty: run the full suite

## Phase 2: Execute

Run the appropriate command:

| Intent | Command |
|--------|---------|
| Full suite | `npx jest` |
| Single file | `npx jest <file>` |
| Pattern match | `npx jest -t "<pattern>"` |
| Watch mode | `npx jest --watch` (only if user asks) |
| Coverage | `npx jest --coverage` |
| Single test by name | `npx jest -t "<test name>"` |
| Update snapshots | `npx jest -u` |
| Verbose output | `npx jest --verbose` |

Capture the full output: passed, failed, skipped counts, and any error details.

## Phase 3: Diagnose (if failures)

For each failing test:

1. **Read the test file** — understand what the test expects
2. **Read the source file** — understand what the code does
3. **Classify the failure**:

| Failure type | Diagnosis |
|-------------|-----------|
| Assertion error | Expected vs actual mismatch. Is the test wrong or the code? |
| Type/Module error | Import issue, missing mock, `moduleNameMapper` misconfigured, transform missing |
| Timeout | Async operation not resolving. Missing `await`, unresolved Promise, missing `done()` callback |
| Mock error | Mock not set up correctly, not cleared between tests, or auto-mock interfering |
| Snapshot mismatch | Intentional change? Run with `-u` to update. Unintentional? Fix the code |

4. **Determine responsibility**: Is the test outdated/wrong, or does the source code have a bug?
5. **Fix**:
   - If the test is wrong: update the test
   - If the code is wrong: fix the code (use `/debug` for complex bugs)
   - If a mock is stale: update the mock to match current interfaces

## Phase 4: Report

```
## Test Report

**Scope**: <full suite / file / pattern>
**Command**: <exact command run>

**Results**: X passed, Y failed, Z skipped
**Duration**: <time>

**Failures** (if any):
| Test | File | Cause | Fix |
|------|------|-------|-----|
| <name> | <file> | <root cause> | <what was fixed> |

**Coverage** (if run):
- Statements: X%
- Branches: X%
- Functions: X%
- Lines: X%

**Status**: GREEN / RED — <summary>
```

---

## Common Mock Patterns (Jest)

```ts
// Mock a module
jest.mock('@/services/api', () => ({ fetchData: jest.fn().mockResolvedValue({ items: [] }) }));

// Mock a hook
jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn().mockReturnValue({ user: mockUser }) }));

// Mock global fetch
global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

// Mock env vars
const env = process.env;
beforeEach(() => { process.env = { ...env, API_URL: 'http://localhost:3000' }; });
afterEach(() => { process.env = env; });

// Reset between tests
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });
```

## Diagnosis Checklist

- [ ] All imports resolve (check `moduleNameMapper` and `moduleDirectories`)
- [ ] Mocks hoisted correctly (`jest.mock` is hoisted but factory functions have scope limits)
- [ ] Async tests use `await`, return a Promise, or call `done()`
- [ ] Test environment matches requirements (`jsdom` for DOM, `node` for server)
- [ ] No test pollution — use `beforeEach`/`afterEach` to reset state
- [ ] Transform handles file types (CSS, images, SVG need mock transforms)
