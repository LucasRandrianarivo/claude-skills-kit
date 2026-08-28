---
description: Onboard a developer onto a codebase — first-day setup, a guided first change, the map, and the 30-day plan
argument-hint: "[--prepare] [--first-task] [--map] [--as-newcomer]"
---

# /onboarding — Developer Onboarding

## Usage
```
/onboarding --prepare        — prepare the codebase and the plan before someone arrives
/onboarding --first-task     — pick and prepare a good first change
/onboarding --map            — generate the codebase map a newcomer actually needs
/onboarding --as-newcomer    — walk in cold and record every friction point
```

## Overview
Time-to-first-merged-change is the honest measure of a codebase's health, and it's usually measured in weeks because nobody has ever done the walk cold. Onboarding is also the one moment where the friction is **visible** — a newcomer sees what everyone else has learned to work around.

Two outputs: a person who is productive quickly, and a list of repository defects nobody else can see anymore.

---

## Phase 1: Prepare before they arrive (`--prepare`)

Do the walk yourself, from a clean machine, following the README **literally** — no shortcuts you know by heart. Every failure is a defect to fix now, not an instruction to give verbally (`/devex-review` does this systematically):

```
| Step | Works? | Time | Fix |
| Clone + install | ✗ | — | node version not documented; add .nvmrc + README line |
| Run the tests | ✓ | 4 min | |
| Start the app with seeded data | ✗ | — | no seed script; write one |
| Make a trivial change and see it | ✓ | 2 min | |
| Deploy to staging | ✗ | — | requires an access nobody documented |
```

Target: **clone to running app in under 30 minutes, unattended.** Then prepare the accesses (`/kickoff`'s access table applies to a new hire too — request them a week ahead), a buddy who's expected to be interrupted, and the first task.

## Phase 2: The map (`--map`)

Not a wiki page nobody updates — the six things a newcomer must know, generated from the code:

1. **What this product does**, in two sentences, in user terms.
2. **The 10 directories that matter** and what lives in each (skip the rest).
3. **How a request flows** end to end: entry point → routing → handler → data → response. One real example, with file paths.
4. **The conventions that aren't obvious**: naming, error handling, how state is managed, what's generated, what's forbidden. (`CLAUDE.md` should already carry these — `/init` if it doesn't.)
5. **The dangerous places**: what breaks easily, what has no tests, what requires a review from a specific person, what must never be edited by hand.
6. **How to ship**: branch, review, CI, deploy, rollback — the actual commands.

Add the ADRs (`docs/adr/`) — reading why the big decisions were made saves a newcomer from re-proposing rejected ideas in week two.

## Phase 3: The first task (`--first-task`)

A good first change is: **real** (it ships to users), **small** (one file or two), **safe** (reversible, well-covered), and **end-to-end** — it forces them through the whole pipeline: local run, change, test, review, merge, deploy. A visible copy fix or a small UI adjustment beats a "starter issue" that's actually a subtle refactor nobody wanted to do.

Aim for a merged change on **day one or two**. What it teaches isn't the code; it's that the pipeline works and that they can move without asking permission.

Then a second task in the same area, slightly larger — depth beats breadth in the first two weeks.

## Phase 4: The 30-day arc

```
Day 1     Environment running, map read, first tiny change merged
Week 1    3–5 small changes in one area · pair session on a real bug · read the ADRs
Week 2    A small feature end to end, reviewed normally (not gently — with explanations)
Week 3    On the review rotation as a reviewer; their questions become documentation
Week 4    An area of ownership, and a written retro: what was confusing, what's still unclear
```

The week-4 retro is the deliverable that pays for the whole process: it's the most accurate defect report on your codebase and your documentation you'll ever get, and its value decays fast — after a month, they've internalized the workarounds too. Act on it while it's fresh, and record what you fixed.

## Phase 5: The cultural half

Explain what usually goes unsaid, because it's what makes people hesitant for months: how much autonomy they have (what they can merge alone), what "done" means here (`/kickoff`'s definition), how disagreements get resolved, how much of the day is meetings, when it's fine to ask instead of digging, and what to do when they break production (the answer is "tell someone immediately and nobody is punished" — say it out loud, before it happens).

Review their first PRs with **explanations rather than corrections** — "we do X because Y" teaches the convention; "change this to X" teaches compliance.

## Phase 6 (`--as-newcomer`): The audit

Anyone can run this on a codebase they don't know: follow the docs literally, time every step, log every moment you had to ask a human or guess, and every place the documentation was wrong. Output the friction table above plus a prioritized fix list. Every item is a permanent tax being paid by everyone who joins.

## Rules
- Do the cold walk before the person arrives; a README nobody has followed is fiction.
- Clone to running app in under 30 minutes, unattended, or fix that first.
- A real merged change on day one — the pipeline, not the codebase, is the first lesson.
- Review with explanations; the first weeks teach conventions, not just fixes.
- Collect the week-4 retro and act on it while the perspective is still fresh.
- Every question a newcomer has to ask twice is a documentation defect: fix the doc rather than answering again.
