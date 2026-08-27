---
description: Large-scale refactoring — seams, characterization tests, strangler fig, mechanical steps that never break behavior
argument-hint: "<target> [--plan] [--extract] [--strangler]"
---

# /refactor — Structural Refactoring

## Usage
```
/refactor src/orders            — restructure a module safely
/refactor --plan                — assess and sequence a large refactor
/refactor --extract <concept>   — pull a concept out of a god file/class
/refactor --strangler <system>  — replace a subsystem incrementally
```

## Overview
`/simplify` and `/compact` clean code you can see in one screen. This skill handles the kind where the risk is real: a 4000-line service, a module three teams depend on, a subsystem being replaced. The discipline that makes it safe is old and unglamorous — **characterize the current behavior, change structure without changing behavior, verify after every step**.

Iron rule: **refactoring never changes behavior**. If a fix is needed, it ships as its own commit, before or after — never inside the refactor, where nobody can tell which change caused the regression.

---

## Phase 1: Justify it, or stop

A refactor with no forcing reason is risk with no payoff. Name one:
- A change that should take an hour takes a week, repeatedly, and always in this file.
- Bugs cluster here (`git log --oneline -- <path> | grep -ci fix` against the repo's average, plus `/health` churn data).
- It blocks something committed (a feature, a migration, an upgrade).
- Onboarding stalls here every time.

If none applies, say so and leave it alone. "It's ugly" is not a reason to risk a regression in code that works.

## Phase 2: Build the safety net first

You cannot refactor safely what you cannot verify.

1. **Read what it actually does** — including the branch nobody remembers. Look for the callers you didn't expect (`grep` the whole repo, and check jobs, migrations, admin scripts, tests).
2. **Characterization tests** for legacy code with no coverage: write tests that assert *current* behavior, bugs included, without judging it. Their job is to detect change, not to be beautiful. Where output is complex, snapshot it — this is the one place snapshots earn their keep.
3. **Cover the edges the code actually hits**: run the app or read production logs to find which inputs are real; test those first.
4. Verify the net catches things: change a constant, confirm a test goes red, revert. **An untested safety net is not a safety net.**
5. Note the performance baseline if this path is hot (`/benchmark`) — structural changes can quietly add allocations or queries.

## Phase 3: Find the seams

A **seam** is a place where you can change behavior without editing the code around it: a function boundary, an interface, a constructor parameter, a module import. Refactoring is mostly the art of creating one seam and then working through it.

The order that keeps each step small and reversible:
1. **Extract** pure functions first — no state, no I/O, trivially testable. This alone shrinks most god files by a third.
2. **Isolate I/O** behind a narrow interface (database, HTTP, clock, filesystem). Now the logic is testable without mocks of your own code (`references/testing.md`).
3. **Extract the concept**, not the lines: name the thing that keeps appearing (a policy, a calculation, a state machine) and give it a home. A "utils" file is a refusal to name it.
4. **Invert the dependency** where the direction is wrong (a module importing from a layer above it).
5. **Split the file/class** last, once the pieces are already separable — splitting first just moves the tangle.

## Phase 4: Mechanical steps

Each step: small, behavior-preserving, verified, committed.

- Use the IDE/tooling's rename and extract operations where they exist — they don't typo.
- **One kind of change per commit**: move OR rename OR extract, never all three. A commit that moves *and* edits is unreviewable, and its diff hides the one line that changed semantics.
- `git mv` and pure moves in their own commit so the diff shows "renamed", not "deleted + added".
- Run the suite after **every** step, not at the end. Ten small verified steps beat one big hopeful one — and when something breaks, you know exactly which step did it.
- Keep it landable: a refactor that lives on a branch for three weeks will lose to `main`. Merge continuously behind the interface you're building.

## Phase 5: Strangler fig (`--strangler`) — replacing a subsystem

Big-bang rewrites fail for the same reason every time: the old system's behavior was never fully known. Instead:

1. Put an **interface (or a router) in front** of the old implementation. Nothing else changes; ship it.
2. Implement the first slice behind the new implementation, chosen for **low risk and high learning** (a read path before a write path).
3. Route that slice by a **feature flag** (`/flags`), starting with internal users, then a percentage.
4. **Run both and compare** where the stakes justify it (shadow/dark launch: call both, serve the old, log the differences). This is how you discover the behavior nobody documented — and the differences are always more numerous than expected.
5. Move traffic, watch the metrics, keep the old path warm until you're sure.
6. Delete the old implementation and the flag. Not deleting it is how you end up maintaining two.

## Phase 6: Report

```
## Refactor — <target>
Reason: <the forcing constraint>
Safety net: <n> characterization tests (verified to fail on change) · baseline <perf>
Steps: <n> commits, each verified: <extract pure fns · isolate I/O · extract <concept> · split>
Behavior: unchanged — <suite green at every step> · public API unchanged ✓ (or: <what changed and why>)
Metrics: file <before>→<after> lines · cyclomatic <before>→<after> · call sites touched <n>
Perf: <before> → <after>
Left undone: <what, and why it's a separate change>
```

## Rules
- Never change behavior and structure in the same commit.
- Never start without a safety net you have verified catches a change.
- One mechanical operation per commit; run the suite after each.
- Never fix a bug you find mid-refactor inline — note it, ship it separately, keep the diff honest.
- Never rewrite when a strangler fig will do; incremental replacement is slower to start and faster to finish.
- Delete the old path once it's dead. A refactor that leaves both is a net loss.
