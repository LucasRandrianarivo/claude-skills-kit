---
description: Estimation that survives contact with reality — decomposition, reference class, ranges, uncertainty, re-estimation
argument-hint: "<what to estimate> [--range] [--reference] [--reestimate]"
---

# /estimate — Estimation

## Usage
```
/estimate <feature or project>
/estimate --reference       — estimate from comparable past work, not from tasks
/estimate --reestimate      — re-estimate from where the project actually is
```

## Overview
An estimate is a **forecast under uncertainty**, and everyone who receives one will read it as a commitment. So the discipline is: produce a range, name what would move it, and say plainly what is unknown — before the number is repeated in a meeting you're not in.

Field notes: `.claude/references/consulting.md` — why estimates are structurally wrong, and the productive-time numbers.

---

## Phase 1: Decompose — including the work nobody lists

Break down to items of ≤ 2 days. Anything larger is not an estimate, it's a wish. Then add the categories that are always forgotten and always happen:

| Category | Typical share of real effort |
|---|---|
| Feature code | the part people estimate |
| Tests (written, not "we'll add them") | +20–30% of the code |
| Code review + rework | +10–15% |
| Environments, CI, deployment, config | often a whole item |
| Data migration and backfills | often underestimated 3× |
| Error states, empty states, permissions, edge cases | +15% (`/component` calls these mandatory) |
| Integration with a third party | double whatever you first thought |
| Meetings, demos, client validation waiting | real elapsed time |
| Bug-fixing after acceptance | a line, not a hope |

If a task has no test, no review and no deploy in its estimate, it is estimating a demo, not a delivery.

## Phase 2: Mark uncertainty per item

```
| # | Item | Effort | Certainty | Why |
| 1 | Order list screen | 2d | known | done 20 times |
| 2 | Sync with the client's ERP | ? | unknown | no docs, no sandbox access → spike, 1d, then re-estimate |
```
**Unknown items never get a number** — they get a timeboxed spike. A number invented for an unknown is the single largest source of blown budgets. Say it explicitly: "we can estimate this after a one-day spike; before that any figure is fiction."

## Phase 3: Cross-check against reality (`--reference`)

Decomposition alone is optimistic — it estimates the path where nothing goes wrong, which has never happened. So also estimate from the **outside**:
- Comparable past projects: how long did they *actually* take, from kickoff to acceptance?
- The ratio between your last estimates and their outcomes (if you've been out by 1.6× three times running, your new estimate is a 1.6× estimate).
- The calendar: holidays, the client's own availability, freeze periods.

When the two methods disagree by more than ~30%, the reference class is usually right and the decomposition has forgotten something. Find what, rather than averaging the two.

## Phase 4: Produce a range, with the conditions

```
## Estimate — <scope>

Effort:    <n>–<n> person-days (P50 <n>, P80 <n>)
Elapsed:   <n>–<n> weeks with <n> people at 3.5 productive days/week
Confidence: <high | medium | low> — <one line why>

Assumptions (if any is false, the estimate changes):
- <access/API/docs/decisions available by <date>>
- <the design is settled; a redesign is not included>
- <existing test suite is green and runnable locally>

Excluded: <what this number does not cover>
Unknowns: <items awaiting a spike, with the spike's cost>
Confidence grows: after <the spike / the design freeze / the API sandbox access>
```

Never give a single number. If pressed for one, give the P80 and say it's the P80 — the figure you'd defend, not the one that sounds good in the room.

## Phase 5: Re-estimate (`--reestimate`)

An estimate has a shelf life. Re-estimate at every phase gate, and immediately when scope moves or an unknown resolves.

1. Compare estimated vs actual for what's done — that ratio is your correction factor for what remains.
2. Re-estimate the remainder from today's knowledge; **never compress remaining items to preserve the original date**. That's the mechanism behind every project that is "on track" until the final week.
3. If the date is fixed, present what fits and what doesn't, as a choice: cut scope, add people (with the ramp-up cost, which is real), or move the date. The client decides — with the numbers.
4. Record the drift and its cause (underestimate · scope added · blocked on client · unknown became known). Over three projects, that log is worth more than any estimation technique.

## Rules
- Ranges, never point estimates; a single number will be quoted as a commitment.
- Unknowns get a spike, never a number.
- Every estimate lists its assumptions and exclusions — an estimate without them is not reusable in a proposal.
- Include tests, review, deployment, edge cases, and client waiting time, or say explicitly that they're excluded.
- Plan on ~3.5 productive days per person-week and show the arithmetic.
- Never absorb a slip by shrinking future estimates; re-plan visibly (`/roadmap update`).
- An estimate given verbally becomes a budget: write it down the same day, with its conditions.
