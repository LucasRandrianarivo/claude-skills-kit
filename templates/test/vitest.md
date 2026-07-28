---
description: Run and diagnose Vitest tests — classify failures, fix test or source
argument-hint: "[file or pattern]"
---

# /test — Test Runner (Vitest)

## Usage
```
/test [file or pattern]
```

## Overview
Run, diagnose, and fix tests using Vitest. If a file or pattern is provided, scope to that. Otherwise, run the full suite.

---

## Phase 1: Discovery

1. Parse `$ARGUMENTS` for a specific file, pattern, or test name
2. Read `vitest.config.ts` (or `vite.config.ts` with test config) to understand:
   - Test file patterns (`include` / `exclude`)
   - Setup files (`setupFiles`)
   - Environment (`jsdom`, `happy-dom`, `node`)
   - Coverage configuration
3. Identify the test scope:
   - If argument is a file path: run that file
   - If argument is a pattern: run matching files
   - If argument is empty: run the full suite

## Phase 2: Execute

Run the appropriate command:

| Intent | Command |
|--------|---------|
| Full suite | `npx vitest run` |
| Single file | `npx vitest run <file>` |
| Pattern match | `npx vitest run -t "<pattern>"` |
| Watch mode | `npx vitest --watch` (only if user asks) |
| Coverage | `npx vitest run --coverage` |
| Single test by name | `npx vitest run -t "<test name>"` |
| Update snapshots | `npx vitest run -u` |

Capture the full output: passed, failed, skipped counts, and any error details.

## Phase 3: Diagnose (if failures)

For each failing test:

1. **Read the test file** — understand what the test expects
2. **Read the source file** — understand what the code does
3. **Classify the failure**:

| Failure type | Diagnosis |
|-------------|-----------|
| Assertion error | Expected vs actual mismatch. Is the test wrong or the code? |
| Type error | Import issue, missing mock, wrong function signature |
| Timeout | Async operation not resolving. Missing `await`, unresolved Promise, or real API call leaking |
| Mock error | Mock not set up correctly or not restored between tests |
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

## Common Mock Patterns (Vitest)

```ts
// Mock a module
vi.mock('@/services/api', () => ({ fetchData: vi.fn().mockResolvedValue({ items: [] }) }));

// Mock a hook
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn().mockReturnValue({ user: mockUser }) }));

// Mock global fetch
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));

// Mock env vars
vi.stubEnv('VITE_API_URL', 'http://localhost:3000');

// Reset between tests
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
```

## Diagnosis Checklist

- [ ] All imports resolve (no `Cannot find module`)
- [ ] Mocks hoisted correctly (`vi.mock` is hoisted but `vi.fn()` inside may not be)
- [ ] Async tests use `await` and return/resolve properly
- [ ] Test environment matches requirements (`jsdom` for DOM, `node` for server)
- [ ] No test pollution — tests do not depend on execution order
