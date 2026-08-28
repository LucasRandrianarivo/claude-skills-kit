---
description: Test strategy — decide what to test at which level, write the missing tests, kill flakes, make coverage mean something
argument-hint: "[feature or path] [--strategy] [--missing] [--flake] [--e2e]"
---

# /testing — Test Strategy & Authoring

## Usage
```
/testing --strategy         — design the test approach for this project (or feature)
/testing --missing          — find behavior with no test and write the tests
/testing --flake            — hunt and fix flaky tests
/testing --e2e checkout     — author the end-to-end coverage for a flow
```

## Overview
`/test` runs the suite and fixes failures. This skill decides **what should exist**: the level each behavior belongs at, the tests that are missing, the ones that are lying, and the flakes that are training the team to ignore red.

The measure that matters is not coverage percentage — it's **"would this suite catch the bug we're about to ship?"** A codebase at 90% coverage with no negative tests is untested where it counts.

Field notes: `.claude/references/testing.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Read the current state

1. Runners and tooling (Vitest/Jest/pytest/go test/RSpec, Playwright/Cypress/Detox/Maestro), where tests live, how they're run in CI.
2. Count and classify what exists: unit · integration (real DB/HTTP boundary) · contract · e2e. Note the shape — an hourglass (many unit, many e2e, nothing between) is the most common and the most expensive.
3. Measure the honest signals: suite duration, flake rate over the last N runs, coverage **of changed code** (not global), and how long since anyone deleted a test.

## Phase 2: Decide the level for each behavior

| Level | Test here when | Keep it |
|---|---|---|
| **Unit** | Pure logic, calculations, state machines, parsing, permissions rules | Milliseconds, no I/O, no mocks of your own code |
| **Integration** | Anything crossing a boundary you own: a handler + real database, a repository, a queue consumer, a migration | Real database (container/test schema), fake third parties |
| **Contract** | Between your layers or against a vendor: response shapes, error envelopes (`/contract --check`) | Generated from the spec where possible |
| **E2E** | The 3–8 flows whose breakage means "the product is down": signup, login, checkout, the core create/read path | Few, stable, on real builds |

The rule that saves the most time: **mock at the edges you don't own** (third-party HTTP, clock, randomness, filesystem) and **not at the edges you do**. A test that mocks your own repository verifies your mock, not your code — this is the #1 source of suites that are green while production is broken.

## Phase 3 (`--missing`): Find what isn't tested

Work from behavior, not from files:
1. For each public behavior in scope, list its **negative paths** — the ones that don't exist in most suites: invalid input, unauthorized, not found, conflict/duplicate, expired, rate-limited, empty collection, boundary values (0, 1, max, max+1), unicode/long strings, concurrent conflict.
2. For each state machine, list the transitions **and the forbidden ones** (cancelling a shipped order must fail).
3. For every bug fixed in the last N commits (`git log --grep=fix`), check there's a regression test. A fix without a test invites the same bug back.
4. Security-relevant enforcement (`/auth`): every "user A cannot access B's resource" is a test, not a code comment.
5. Then write them, in the project's own idiom and factories — and **verify each new test fails against the unfixed behavior** (mutate the code, see red, restore). A test that passes both ways tests nothing.

## Phase 4: What makes a good test here

- **Names describe behavior**: `rejects a reset token that was already used`, never `test resetToken2`.
- **Arrange–act–assert**, one behavior per test; a test asserting six unrelated things fails uninformatively.
- **No shared mutable state** between tests; no ordering dependency (run with `--shuffle`/`-p` to prove it).
- **Deterministic**: inject the clock, seed randomness, no `sleep`, no reliance on real network or on today's date.
- **Data via factories/builders** with explicit overrides for what the test cares about — fixtures shared by 40 tests become untouchable.
- **Assert the contract, not the implementation**: query by role/name in UI tests, assert response bodies rather than internal call counts. Tests that break on every refactor get deleted, and then nothing is tested.

## Phase 5 (`--flake`): Kill the flakes

A flaky test is worse than no test: it teaches the team to re-run until green, and that habit will one day re-run past a real failure.

1. Identify: re-run the suite N times (or read CI history) and rank tests by failure rate.
2. Diagnose by cause — the usual four: **timing** (fixed waits instead of waiting for a condition), **shared state** (a database row, a global, a port, a file), **order dependence**, **real dependency** (network, clock, timezone, locale).
3. Fix at the cause: wait for the observable condition, isolate the data per test, inject the clock, stub the network. Never fix a flake with a longer `sleep` or an automatic retry.
4. If a flake can't be fixed now: **quarantine it explicitly** — tagged, excluded from the required gate, with an owner and a ticket. Never silently `skip`, and never leave it failing in the gate.

## Phase 6 (`--e2e`): End-to-end that stays green

- Cover the few flows that define the product; everything else belongs lower in the pyramid.
- Run against a **production-like build**, with seeded, isolated data per run (a fresh tenant/user), never a shared staging account.
- Select by role and accessible name — that also makes them accessibility smoke tests.
- Own the failure output: trace, video, screenshot, and the server logs of the run uploaded as CI artifacts (`/cicd`), or nobody will debug them.
- Keep them fast enough to run on every PR; if they can't be, run the critical subset on PR and the rest on main — and say which is which.

## Phase 7: Report

```
## Test Strategy — <scope>

Shape: unit <n> · integration <n> · contract <n> · e2e <n>   Duration: <t>   Flake rate: <%>
Changed-code coverage: <%>   Mocks of own code: <n> (target: 0)

| # | Gap | Level it belongs at | Risk if untested | Added |
|---|-----|--------------------|------------------|-------|
| 1 | reset token reuse | integration | account takeover | ✓ 3 tests |

Flakes: <n> found · <n> fixed · <n> quarantined (owner, ticket)
New tests verified to fail before the fix: <n>/<n>
```

## Rules
- Every new test must be shown to fail without the behavior it tests. Unverified tests are decoration.
- Mock only what you don't own; mocking your own layers is a finding.
- Never fix a flake with a sleep or a retry — fix the cause or quarantine it explicitly with an owner.
- Coverage is reported on changed code, and never used as the definition of done.
- Every bug fix ships with the regression test that reproduces it.
- Deleting a test that asserts nothing is progress; say so in the report rather than leaving it.
