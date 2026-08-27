---
description: Technical hiring — role definition, a fair exercise, structured evaluation, evidence-based decision
argument-hint: "[--design <role>] [--exercise] [--evaluate] [--debrief]"
---

# /interview — Technical Hiring

## Usage
```
/interview --design <role>   — define what you're actually hiring for, and the signals
/interview --exercise        — build a fair, realistic technical exercise
/interview --evaluate        — score a candidate's work against the rubric
/interview --debrief         — structure the decision and the feedback
```

## Overview
Hiring badly is one of the most expensive mistakes a technical team makes, and the usual causes are procedural: no agreed definition of the role, a puzzle that tests something the job doesn't require, and a decision made on "feel" that nobody can articulate afterwards.

The discipline: **define the signals before you meet anyone, gather evidence for each one, and decide from the evidence.**

---

## Phase 1: Define the role and the signals (`--design`)

```
Role: <title>   Level: <junior | mid | senior | lead>
In 6 months, this person is succeeding if they can: <3 concrete outcomes>
Must-have signals (each observable):
  - <writes maintainable code in <stack> without supervision>
  - <debugs a problem they've never seen, methodically>
  - <communicates a technical trade-off to a non-technical person>
Nice-to-have: <what can be learned on the job — be honest, this list is usually longer than people admit>
Explicitly not required: <the technologies people list out of habit>
```

Then map each signal to the stage that tests it. If a signal has no stage, you're not testing it; if a stage tests no signal, cut it. **Never test what the job doesn't require** — an algorithmic puzzle for a role that maintains a CRUD product selects for puzzle practice, not for the work.

## Phase 2: The exercise (`--exercise`)

The best predictor is work that resembles the job.

- **Timeboxed and respected**: 2–3 hours maximum, and say plainly that you'd rather see an unfinished, well-reasoned submission than a weekend of unpaid work. Then evaluate accordingly.
- **Realistic**: a small feature or a bug in a codebase that looks like yours — imperfect, with existing conventions to follow. That tests the actual daily skill: reading code and fitting into it.
- **Open**: their tools, their AI assistant, their references. That's how they'll work. What you're evaluating is judgment, structure, and the ability to explain the result.
- **A README asked for**: assumptions, trade-offs, what they'd do with more time. This one artifact reveals more than the code.
- **Paid** if it exceeds ~3 hours. Anything larger is work, and asking for free work filters out exactly the people with options.
- **A live alternative**: a pairing session on the same problem, for candidates who prefer it or can't do homework. Not everyone has evenings.

Better than a puzzle: a **code-reading session** (here's a module, tell us what it does, what worries you) and a **debugging session** on a real, seeded bug. Both are close to the job and hard to game.

## Phase 3: Evaluate on a rubric (`--evaluate`)

Score each signal separately, with evidence, **before** discussing with anyone else — a group conversation before independent scoring produces anchoring, not consensus.

```
| Signal | Evidence (what they did or said) | 1–4 | Note |
| Code quality in context | followed the repo's conventions, extracted <x> | 3 | matched existing patterns rather than imposing |
| Debugging method | reproduced first, bisected, found root cause | 4 | stated the hypothesis before testing it |
| Trade-off communication | explained why they skipped <y> given the timebox | 4 | |
| Handling feedback | took the suggestion, pushed back once with a reason | 3 | pushing back with a reason is a positive signal |
```
Scale: 1 below the bar · 2 close, with support · 3 meets the bar · 4 above. **No half-points, no "vibes" column.**

Watch for the failure modes on your side: hiring the person most like you; scoring confidence rather than competence; penalizing an accent, a school, or a career gap; treating nervousness as incompetence; and letting one strong signal halo the rest.

## Phase 4: Decide (`--debrief`)

1. Each interviewer states their scores and **evidence** — evidence first, conclusion after.
2. Disagreements are resolved by going back to what the candidate actually did, not by seniority in the room.
3. The decision rule is written in advance: e.g. all must-have signals ≥ 3, no signal at 1.
4. "Not sure" is a **no** for this role — but say what would change it (a different level, a different team, a second sample of work), because that's often true and worth acting on.
5. Never decide on culture "fit" as a feeling. Turn it into an observable: does this person work well with our review process, our cadence, our level of autonomy? Fit-as-feeling is where bias lives.

## Phase 5: Treat candidates as people

Respond to everyone, within the timeline you promised. Give **specific, kind feedback** to anyone who did an exercise — they spent hours on you. Never ghost. The candidate you reject well is a future referrer, a future colleague, and sometimes a future client; the one you ghost tells forty people.

## Rules
- Define the signals before the first interview; no stage exists without a signal it tests.
- Never test what the job doesn't require.
- Timebox the exercise, respect the box when evaluating, pay for anything longer.
- Score independently, with evidence, before the group discussion.
- The decision rule is agreed in advance, and "not sure" means no for this role.
- Every candidate who did work gets a real response, with the timeline you promised.
- Never use an AI-assisted-work ban as a signal: they'll use the tools on the job, so evaluate the judgment around them instead.
