---
description: Build the roadmap — phases, milestones, dependencies, sequencing, capacity and risk, with a dated plan you can defend
argument-hint: "[from cdc|scratch] [--weeks N] [--team N] [--quarters]"
---

# /roadmap — Phasing & Milestones

## Usage
```
/roadmap                    — build the roadmap from the validated CDC
/roadmap --team 3 --weeks 12
/roadmap --quarters         — quarter-level view for stakeholders
/roadmap update             — re-plan from where the project actually is
```

## Overview
A roadmap is not a list of features with dates. It's a **sequence chosen so that risk is retired early, dependencies don't block, and each milestone ships something demonstrable**. This one is built from the CDC's requirement IDs, so nothing gets planned that wasn't specified, and nothing specified gets forgotten.

Saved to `.claude/project/<slug>/roadmap.md`.

---

## Phase 1: Inventory the work

1. Read the CDC (`.claude/project/<slug>/cdc.md`) — every F-xx and N-xx requirement, with its MoSCoW priority.
2. Add the work the CDC implies but doesn't list: environments, CI/CD, auth, data migration, monitoring, documentation, training, acceptance. **This is where estimates die** — the unlisted 30%.
3. Size each item coarsely: S (≤1d) · M (2–4d) · L (1–2w) · XL (needs splitting — split it).
4. Flag each item's **uncertainty**: known · unclear · unknown. Unknown items get a spike, not an estimate.

## Phase 2: Order by risk and dependency

Sequence with these rules, in priority order:

1. **Retire the riskiest assumption first.** The thing that could invalidate the project (a third-party API that doesn't do what the docs say, a performance ceiling, a legal constraint) is a week-1 spike — never a month-3 discovery.
2. **Unblock dependencies early**: anything others wait on (schema, contract, design system, auth) comes before what waits on it. Use `/contract` to unblock parallel work.
3. **Ship something usable at each milestone**: a milestone that produces nothing demonstrable can't be validated and can't be corrected.
4. **Must before Should before Could**, but a cheap Should that unblocks a Must goes first.
5. **Client dependencies pull forward**: anything needing content, access or a decision from the client is requested at the start of the phase before it's needed, with its own deadline.

## Phase 3: The roadmap

```markdown
# Roadmap — <project>
Base: CDC v<n> · Team: <n> people · Start: <date> · Target: <date>

## Phase 0 — Cadrage & risk spikes (<dates>)
Goal: prove the risky things work before committing to them.
Contents: <spikes>, environment setup, CI/CD skeleton, the contract (/contract)
Milestone M0: <what is demonstrable> — decision point: continue / adjust scope / stop

## Phase 1 — <name> (<dates>)
Goal:        <one sentence, in outcome terms>
Requirements: F-01, F-02, F-05, N-01
Deliverable:  <what the client can see and use>
Milestone M1: <demo + what gets validated>
Depends on:   <upstream work / client input, with its deadline>
Risks:        <what could slip this phase>

## Phase 2 — ...
## Phase 3 — Hardening & acceptance
Contents: performance (/web-vitals), accessibility (/a11y), security (/cso),
          documentation, training, acceptance run (/validate)

## Timeline
<a compact month/week grid, or a Mermaid gantt if the project uses diagrams>

## Capacity check
Available: <n people × n weeks × ~3.5 productive days/week> = <n> person-days
Estimated: <n> person-days (+ <n>% contingency)
Verdict: fits | over by <n> days → <what gets cut or moved, listed explicitly>

## Critical path
<the chain of items where a one-day slip is a one-day slip on the delivery date>

## What is NOT in this roadmap
<deferred items, with the phase or version they're candidates for>
```

## Phase 4: Sanity checks before presenting

- **Capacity is real**: ~3.5 productive days per person-week, not 5. Meetings, review, support and context-switching are not free.
- **Contingency is explicit**: 15–25% depending on how many "unknown" items remain. A plan with zero buffer is a plan that will be wrong.
- **No phase longer than 4 weeks** without a demonstrable milestone — feedback later than that is feedback too late.
- **Holidays and freezes** are in the calendar (August, end of year, the client's own release freeze).
- **Every client dependency has a date and an owner**, and the slip it causes is stated.
- **The critical path is named.** If you can't name it, the plan isn't sequenced, it's listed.

## Phase 5: Keep it alive (`update`)

A roadmap that isn't re-planned is a historical document. On `update`:
1. Mark what actually shipped vs planned, per milestone.
2. Compute the drift and its cause (underestimate · scope added · blocked · unknown became known).
3. Re-plan the remainder from today's reality — never by compressing future estimates to preserve the original date. If the date is fixed, cut scope explicitly and say what was cut.
4. Log significant re-plans with `/decisions`.

## Rules
- Every phase produces something demonstrable and validatable.
- Every roadmap item traces to a CDC requirement ID, or is flagged as implied work (and then added to the CDC).
- Risk-retirement work goes first, always.
- Capacity math is shown, with the productivity assumption stated.
- Never absorb a slip by silently shrinking later estimates; re-plan or cut scope, visibly.
- Dates are commitments only after capacity is checked; before that they're projections and are labelled as such.
