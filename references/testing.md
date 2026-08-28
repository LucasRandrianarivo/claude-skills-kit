# Field notes — Testing

Consulted by `/testing`, `/test`, `/qa`, `specialist-testing`.

---

## The mental model

A test suite has exactly one job: **tell you, quickly and truthfully, whether the change is safe to ship.** Every property below follows from that:
- **Truthful** — it fails when behavior breaks (no false green) and passes otherwise (no flakes).
- **Fast** — a suite people wait for is a suite people skip.
- **Diagnostic** — the failure message says what broke, not that something did.

Coverage percentage measures none of these. A suite at 95% coverage with no negative paths is a suite that has never seen a bug.

## Where the false greens come from

| Pattern | Why it lies |
|---|---|
| Mocking your own repository/service | Verifies the mock, not the integration. The mock drifts from reality and the test stays green |
| Asserting on call counts of internals | Passes after a refactor that broke behavior; fails after a refactor that didn't |
| Snapshot of a huge tree, updated on failure | `--update` becomes a reflex, and the snapshot stops asserting anything |
| Test that never fails | Assertion after an early return, `expect` inside an un-awaited promise, a test with no assertion at all |
| Shared fixture mutated by an earlier test | Green in file order, red alone (or worse, the reverse) |
| Testing the framework | `expect(component).toBeDefined()` proves nothing about your code |

The one habit that eliminates most of these: **write the test, watch it fail for the right reason, then make it pass.** A test that has never been red is unverified — and this applies to tests written after the code too: break the code, confirm red, restore.

## What belongs where

- **Unit** — pure logic: pricing, permissions rules, parsers, state machines, date math. Microseconds, no I/O, no mocks of your own code.
- **Integration** — the boundary you own: handler + real database, repository + schema, consumer + queue, migration + data. This is where most web-app bugs actually live, and where most suites are thinnest.
- **Contract** — shapes between layers or against a vendor, generated from the spec where possible.
- **E2E** — the 3–8 flows that mean "the product works". Real build, seeded isolated data, selected by role/name.

Mock at the edges you **don't own** (third-party HTTP, clock, randomness, filesystem, payment provider). Don't mock the edges you do.

## Flakes — the four causes

1. **Timing** — fixed `sleep`/`waitFor(500)` instead of waiting for the observable condition. Fix: wait for the state, not for time.
2. **Shared state** — a database row, a global, a port, a temp file, a cached module. Fix: isolate per test (transaction rollback, unique tenant, random port).
3. **Order dependence** — a test that only passes after another. Fix: run with `--shuffle`/random seed in CI and fix what falls over.
4. **Real world** — network, real clock, timezone, locale, today's date crossing a boundary (month-end, DST, leap day). Fix: inject the clock, freeze time, pin the timezone in CI.

Never "fix" a flake with a retry or a longer sleep. Retries hide a real race that will bite in production, and they train the team to re-run until green — which is how a genuine failure gets merged.

## Test data

Factories/builders with explicit overrides beat shared fixtures: the test states exactly what it cares about, and nothing else. A fixture used by 40 tests becomes unchangeable — the first sign is a test that fails when you add an unrelated field.

Never seed from a production dump (personal data, and it changes under you). Generate; keep the volume realistic for the tests that care about volume.

## E2E that stay green

Select by accessible role and name — which doubles as an accessibility check and survives markup changes. Wait for network idle/state, never for milliseconds. Isolate data per run so two CI jobs can't collide. Upload trace, video and server logs on failure or nobody will debug them. Keep the critical subset on every PR and the long tail on main, and say explicitly which is which.

## Reading the suite's health

| Signal | Healthy | What a bad value means |
|---|---|---|
| Wall time on PR | < 10 min | People start merging on red |
| Flake rate | < 0.5% of runs | Trust is gone; failures get re-run, not read |
| Changed-code coverage | high, and reviewed | Global coverage says nothing about this change |
| Negative-path tests | roughly as many as happy-path | The bugs live in the paths nobody tested |
| Age of the oldest skipped test | days, not years | A permanently skipped test is a deleted test with extra guilt |

## Where this gets decided wrong

- Chasing a coverage number by testing getters, instead of testing the three error paths that actually occur.
- An hourglass suite (many unit, many e2e, nothing between) — slow, brittle, and blind to exactly the integration bugs that ship.
- Deleting a failing test to unblock a release, without a ticket. It never comes back.
- Writing tests only for the code you wrote, never for the bug you just fixed — the regression test is the cheapest test in the suite.

## Where to check the current truth
Tooling APIs move faster than the principles here. Fetch and cite these before stating a version-specific fact — the `expertise` rule requires it:
- Testing Library — https://testing-library.com (queries, and why role-based ones)
- Playwright — https://playwright.dev · Vitest — https://vitest.dev
- Practical Test Pyramid — https://martinfowler.com/articles/practical-test-pyramid.html
