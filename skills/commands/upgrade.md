---
description: Major version & framework migrations — assess, sequence, codemod, verify; one dependency at a time
argument-hint: "<dependency or framework> [--assess] [--plan] [--apply] [--all]"
---

# /upgrade — Dependency & Framework Migration

## Usage
```
/upgrade react              — upgrade one dependency across its majors
/upgrade next 14 to 15
/upgrade --assess           — what's outdated, what's risky, what's urgent
/upgrade --all              — plan the whole backlog, sequenced
```

## Overview
`/api-refresh` keeps **vendor API integrations** current. This skill handles the other decay: the framework two majors behind, the library with a CVE, the runtime going end-of-life. The failure mode is always the same — the upgrade is deferred until it's a rewrite, then it's deferred again.

Iron rule: **one dependency per branch, one major per step.** A PR that bumps twelve packages fails for an unattributable reason and gets abandoned.

Field notes: `.claude/references/devops.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1 (`--assess`): What's actually urgent

1. Inventory versions vs latest: `npm outdated` / `pip list --outdated` / `go list -m -u all` / `bundle outdated`, plus the runtime itself (Node/Python/Go/PHP version vs its support window).
2. Fetch the **live** truth per candidate: release notes, migration guides, EOL dates (`endoflife.date`), open advisories (`npm audit`, `pip-audit`, `govulncheck`, GitHub advisories).
3. Rank by force, not by preference:

| Priority | Trigger |
|---|---|
| 🔴 Now | A known-exploited or high-severity CVE · runtime past EOL (no security patches) · a blocker for something already committed |
| 🟡 Scheduled | Two or more majors behind · EOL within 6 months · a dependency the ecosystem has moved past (peer-dep conflicts appearing) |
| 🔵 Opportunistic | One major behind, no CVE, no blocker — bundle with adjacent work |

"Newer" is never a reason on its own. Every upgrade in the plan states what it buys: a fix, a deadline, a capability, or an unblock.

## Phase 2 (`--plan`): Sequence and blast radius

For each upgrade, before touching anything:
1. **Read the migration guide end to end** and list *its* breaking changes filtered to what this codebase uses. Grep for each removed/renamed API to get the real call-site count — that number is the estimate.
2. **Peer chain**: what else must move with it (a React major drags the testing library, the router, the UI kit). List them; if the chain is unmaintained, that's a decision to surface, not a blocker to hide.
3. **Order**: runtime → framework → framework-adjacent libraries → the rest. Type packages and build tooling early; they surface errors cheaply.
4. **Codemods**: use the maintainer's official codemod where one exists, review its diff (codemods are mechanical, not correct), and never let it run over unrelated code.
5. **Escape hatch**: how you revert. A branch, a lockfile diff, and a note of the previous versions.

## Phase 3 (`--apply`): One at a time

1. Branch per dependency. Bump the version and the lockfile with the project's package manager — never hand-edit a lockfile.
2. Fix the build: compiler/type errors first, then runtime. Resist refactoring while you migrate — a mixed diff can't be reviewed or reverted cleanly. Note improvements for a follow-up instead.
3. Remove now-unnecessary workarounds the old version required, but only ones you can prove are obsolete.
4. **Deprecations are part of the job**: fix the warnings this version introduces, or the next major is another wall. Note explicitly the ones you deliberately left.
5. Run the whole gate: typecheck, lint, unit, integration, e2e, build — plus a manual pass over the flows the library touches. A framework upgrade that only ran unit tests hasn't been tested.
6. Watch for the silent breaks that compile fine: changed defaults (caching, batching, strict mode), altered rendering/lifecycle timing, date/locale behavior, sorting stability, error-handling semantics. Grep the migration guide for "behavior change" and check each.
7. Compare bundle size and startup/response timings before and after (`/web-vitals`, `/benchmark`) — regressions here are common and invisible in tests.

## Phase 4: Ship it safely

- Merge one upgrade at a time; let it sit in staging (or behind a canary) long enough to see runtime errors — type-checkable breakage is the easy half.
- Deploy with `/ship` → `/canary`, watching error rate and latency against the pre-upgrade baseline.
- Record it: a `/decisions` entry (and an ADR when it's a framework or a one-way door), the new version in the docs, and the workarounds removed.

## Report

```
## Upgrade — <dep> <from> → <to>

Reason: <CVE / EOL <date> / blocker / capability>
Chain: <packages that had to move together>
Breaking changes affecting us: <n> (<call sites>)
Codemod: <name, diff reviewed ✓> · manual fixes: <n>
Deprecations: fixed <n> · deliberately left <n> (<why>)
Gate: typecheck ✓ lint ✓ unit ✓ integration ✓ e2e ✓ build ✓ manual pass ✓
Perf: bundle <before>→<after> · p95 <before>→<after>
Rollback: <branch/versions>
Remaining backlog: <next upgrade, and why it's next>
```

## Rules
- One dependency, one major, one branch. Never bundle upgrades.
- Never hand-edit a lockfile; use the package manager.
- Never mix refactoring into a migration diff.
- An upgrade with no stated reason doesn't ship; "latest" is not a reason.
- Behavior changes that compile fine are the real risk — check the guide's behavior notes explicitly and exercise the flows manually.
- Security advisories jump the queue, and go through the same gate, not around it.
