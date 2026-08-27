---
description: Turn a phase into an executable step-by-step plan — tasks, order, owners, gates, done criteria, verification
argument-hint: "<phase or milestone> [--sprint] [--tickets] [--assign]"
---

# /exec-plan — Step-by-Step Execution Plan

## Usage
```
/exec-plan phase 1
/exec-plan <milestone>
/exec-plan --tickets        — also emit GitHub/GitLab issues from the plan
/exec-plan --sprint         — format as a sprint backlog with capacity
```

## Overview
Between "Phase 1: user management, 3 weeks" and someone writing code, there's a translation nobody does properly: into ordered tasks with real dependencies, a done criterion each, and a gate at the end. This skill does that translation — the level of detail where a plan actually survives contact with the work.

Saved to `.claude/project/<slug>/exec-<phase>.md`.

---

## Phase 1: Decompose into tasks

From the roadmap phase and its CDC requirements, produce tasks that satisfy all four:

| Property | Test |
|---|---|
| **Small** | ≤ 1 day of work. Bigger → split. |
| **Verifiable** | Its done criterion is a command, a test, or an observable behavior — never "implemented". |
| **Owned by one layer** | A task spanning db+api+ui is three tasks (see `/fullstack`). |
| **Traceable** | Carries the CDC requirement ID it serves. |

Include the tasks people forget: migrations, seed/fixture data, error states, empty states, permissions, logging, tests, documentation, the demo script for the milestone review.

## Phase 2: Order it

```
| # | Task | Req | Type | Size | Depends on | Done when | Skill |
|---|------|-----|------|------|-----------|-----------|-------|
| 1 | Contract for /orders endpoints | F-04 | design | S | — | contract v1 frozen, both layers agree | /contract |
| 2 | Migration: orders table + indexes | F-04 | db | S | 1 | up/down/up clean on a data copy | /fullstack |
| 3 | GET /orders with pagination | F-04 | api | M | 2 | contract conformance test green | /fullstack |
| 4 | Orders list screen (all states) | F-04 | web | M | 1 | loading/empty/error/ideal render; a11y pass | /component |
| 5 | E2E: list → detail → filter | F-04 | test | S | 3,4 | spec green in CI | /qa |
```

Ordering rules:
- **Contract/schema first**, so downstream work parallelizes (tasks 3 and 4 above run at the same time).
- **Vertical slices over horizontal layers**: one working feature end-to-end beats "all the endpoints, then all the screens" — it produces something demonstrable sooner and finds integration bugs earlier.
- **Riskiest task early in the phase**, not at the end where it has no recovery room.
- Mark tasks that can run **in parallel** and, where the work is wide and repetitive, hand them to `/orchestrate`.

## Phase 3: Gates

Every phase ends with a gate, and long phases get one mid-way:

```
### Gate — end of phase <n>
- [ ] All Must tasks done, with their done criteria met
- [ ] Quality gate green: lint · typecheck · tests · build   (/build)
- [ ] Review passed (/pr-review) with no 🔴
- [ ] Non-functional checks for this phase: <e.g. /a11y on the new screens, /web-vitals on the new route>
- [ ] Demo runs end to end from a clean state (script: <path>)
- [ ] CDC requirements <IDs> demonstrably satisfied
- [ ] Documentation updated (README/ADR/runbook)
Decision: proceed to phase <n+1> | fix and re-gate | re-plan (/roadmap update)
```

A gate is binary. "Mostly done" fails the gate — and that is the point: it surfaces the slip while there's still time to act.

## Phase 4: Capacity & assignment

```
Capacity: <n people> × <n days> × 0.7 = <n> person-days available
Planned:  <n> person-days   Buffer: <n>% 
Overflow: <tasks moved out, and where they went>
```

With `--assign`, assign by ownership continuity (whoever built the API owns its bugs this phase) and flag any task where exactly one person can do it — that's a bus-factor risk, not a schedule detail.

## Phase 5: Emit (`--tickets`)

Generate one issue per task (GitHub `gh issue create` / GitLab `glab issue create`), each containing: the requirement ID, the done criterion, the dependencies, and the skill to run. Link them to the milestone. Never create tickets without showing the list and getting a go — bulk issue creation is hard to undo.

## Phase 6: Track

On each check-in: mark done/in-progress/blocked, recompute the remaining capacity, and surface blockers **the day they appear** — a blocker reported at the gate is a blocker reported too late.

```
Phase <n>: <done>/<total> tasks · <n> person-days left · <n> days to gate
Blocked: <task> — <what's blocking, who can unblock, since when>
At risk: <task> — <why>
```

## Rules
- Every task has a done criterion that can be checked by someone who didn't do the work.
- Every task carries a CDC requirement ID, or is explicitly flagged as implied/technical work.
- Tasks are ≤ 1 day; anything larger is split before the plan is presented.
- Gates are binary and include the non-functional checks — not just "the feature works".
- Blockers are escalated the day they appear, never held until the gate.
- Never plan at 100% capacity; 70% is the honest planning number.
