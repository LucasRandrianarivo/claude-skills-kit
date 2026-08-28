---
description: Controlled multi-agent execution of a large task — decompose into a DAG, dispatch in waves, verify, merge, with gates and a budget
argument-hint: "<task> [--waves N] [--max-agents N] [--dry-run] [--sequential]"
---

# /orchestrate — Controlled Agent Orchestration

## Usage
```
/orchestrate <task>
/orchestrate migrate all class components in src/ to hooks
/orchestrate --dry-run            — produce the plan and the dispatch table, run nothing
/orchestrate --max-agents 4       — cap concurrency
/orchestrate --sequential         — one agent at a time, full trace
```

## Overview
Fan-out is easy; **controlled** fan-out is the hard part. Agents that overlap produce conflicting edits, agents without boundaries wander, and agents without verification produce confident garbage. This skill spends its effort on the control structure: a decomposition where units are genuinely independent, hard file boundaries, a verification pass that assumes each unit is wrong, and gates where you decide.

Use it when the work is **wide** (many similar units: files, endpoints, components, packages) — not when it's deep. Deep work belongs to one agent with full context.

---

## Phase 1: Decompose

1. Enumerate the units of work by reading the codebase, never by guessing: the actual file list, endpoint list, package list. Print the count.
2. For each unit, record: what changes, which files it may touch, what it depends on, how it will be verified.
3. Build the dependency DAG and collapse it into **waves** — a wave is a set of units with no dependency on each other and **no file overlap**.

```
Units: 23    Waves: 3
Wave 1 (independent, 12 units): <list>
Wave 2 (depends on shared types from wave 1, 8 units): <list>
Wave 3 (call-site cleanup, 3 units): <list>
Shared files touched by >1 unit: <list — these become sequential, never parallel>
```

**If two units must edit the same file, they do not go in the same wave.** This single rule prevents most orchestration failures.

## Phase 2: Contract the agents

For each unit, write the dispatch spec that the agent will receive verbatim:

| Field | Content |
|---|---|
| Goal | One sentence, testable |
| Boundary | The exact files it may create/modify — everything else is read-only |
| Conventions | The patterns to follow, with a reference file to imitate |
| Definition of done | The command that must pass (test, typecheck, build) |
| Report format | What it returns (files changed, evidence, blockers) |
| Escalation | When to stop and report instead of improvising |

Pick the agent type per unit: existing kit agents (`scaffolder`, `backend-builder`, `frontend-builder`, `code-reviewer`, `test-runner`) or a general agent with the spec above.

**Gate 1 — plan.** Present the waves, the dispatch table, and the estimated cost. With `--dry-run`, stop here.

## Phase 3: Dispatch, wave by wave

For each wave:

1. Dispatch its units concurrently (respect `--max-agents`; `--sequential` runs them one by one).
2. Give every agent its spec, and **only** its spec — no shared mutable scratch state between agents in a wave.
3. Collect reports. Classify each: **done** / **partial** / **blocked** / **out-of-bounds**.
4. Verify the wave before starting the next (Phase 4). A wave that doesn't verify does not unblock its dependents.

Failure handling, in order:
- **Blocked** (missing decision, ambiguous convention) → collect, batch the questions, ask once at the wave gate.
- **Partial** → re-dispatch the remainder with a narrowed spec; never let the orchestrator "just finish it" silently, that hides the failure mode.
- **Out-of-bounds** (edited files outside its boundary) → revert those edits, re-dispatch with the boundary restated. Report it; a boundary breach is a finding about the decomposition.
- **Same unit failing twice** → stop dispatching that unit and escalate to the user with both attempts.

## Phase 4: Verify each wave (assume the agents are wrong)

Never accept an agent's self-report as evidence:

1. `git diff --stat` for the wave: does the changed-file set match the union of the boundaries? Anything else is a breach.
2. Run the definition-of-done command for each unit — the orchestrator runs it, not the agent.
3. Run the project's full gate once per wave: typecheck, lint, tests, build.
4. Spot-read 2–3 units' diffs in full, chosen from the largest and the most repetitive — repetitive units are where a wrong pattern is duplicated 12 times.
5. Check for the classic fan-out defects: the same helper created in 12 places, inconsistent naming between units, a shared file edited by two agents, tests weakened to pass, `any`/`@ts-ignore`/skipped tests introduced.

**Gate 2 — wave review.** Report per wave: units done, evidence, defects found, cost so far. Continue, re-dispatch, or stop.

## Phase 5: Consolidate

After the last wave:
1. Deduplicate what fan-out duplicates: identical helpers, near-identical tests, repeated constants → extract once, update call sites.
2. Normalize naming and structure across units — 23 units done by 23 agents drift by default.
3. Run the full gate again, plus `/review` on the aggregate diff (the whole is reviewable in a way the parts were not).
4. Report:

```
## Orchestration: <task>

Units: <n> (done <n> · partial <n> · abandoned <n>)
Waves: <n>    Agents dispatched: <n>    Re-dispatches: <n>
Boundary breaches: <n>    Defects caught in verification: <n>
Gate: typecheck ✓ lint ✓ tests ✓ build ✓
Consolidated: <what was deduplicated/normalized>
Left undone: <units + why>
```

## Rules
- **No two agents in a wave may touch the same file.** If the decomposition can't satisfy that, the work isn't wide — do it sequentially.
- The orchestrator verifies; agents report. A report is a claim.
- Boundaries are absolute; a breach is reverted, not accepted because the change looked fine.
- Stop and ask rather than pushing through a second failure of the same unit.
- Never fan out a task whose conventions aren't settled yet — decide the pattern once (one agent, one unit), then fan out with that unit as the reference.
- Cost is a first-class output: report agents dispatched and re-dispatches every gate, so the user can stop a run that isn't paying for itself.
