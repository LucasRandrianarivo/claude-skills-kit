---
description: Structured brainstorming — diverge, challenge, converge; produces scored options and a decision, not a list of ideas
argument-hint: "<problem or opportunity> [--options N] [--quick]"
---

# /brainstorm — Divergent → Convergent Ideation

## Usage
```
/brainstorm <problem>
/brainstorm how do we cut onboarding from 3 days to 1 hour
/brainstorm --options 8      — how many ideas to generate before converging (default 6)
/brainstorm --quick          — one round, 20 minutes' worth
```

## Overview
Most "brainstorms" produce a list nobody uses, because they skip two steps: framing the problem well enough that ideas are comparable, and converging with explicit criteria. This one runs the full arc — **frame → diverge → challenge → converge → decide** — and ends with one recommended direction, its risks, and the next concrete action.

It's the front door of the project mode: its output feeds `/cdc`.

---

## Phase 1: Frame the problem

Restate the problem until it's the *real* one. Then:

```
Problem:      <one sentence, in the user's language>
Who has it:   <the actual person, not "users">
Evidence:     <what tells us this is real — data, quotes, tickets, or "assumption">
Today:        <what they do now, including the workaround>
Success:      <the measurable state where this is solved>
Constraints:  <budget · deadline · team · tech · legal — hard ones only>
Non-goals:    <what we deliberately won't solve>
```

Ask at most 3 questions if the frame has a hole that changes the answer. Note explicitly which parts are assumptions — an idea built on an unverified assumption is a bet, and should be labelled one.

## Phase 2: Diverge — generate genuinely different options

Generate `--options` ideas (default 6) that differ in **kind**, not in detail. Use these lenses deliberately, one idea per lens where it applies:

| Lens | The question it asks |
|---|---|
| Do nothing | What happens if we don't solve this? (Sometimes the right answer) |
| Manual first | Can a human do it for the first 100 users, and we learn? |
| Buy | Is there a product/API that already does this? (→ `/api-scout`) |
| Constrain the problem | Solve it for one segment perfectly instead of everyone poorly |
| Remove the step | Can the need be designed away rather than served? |
| Invert | What if the user did the opposite / the system pushed instead of pulled? |
| 10× cheaper | The version that costs a tenth — what does it lose? |
| 10× ambitious | The version with no resource limit — what does it unlock? |

Rules while diverging: no evaluation, no "but", no merging. Ideas get one line each plus a sentence on how it works.

## Phase 3: Challenge

For each idea, one hostile question — the one a skeptical colleague would ask:
- What has to be true for this to work? (the load-bearing assumption)
- Who hates this? (the user, ops, support, finance, legal)
- What does it cost after launch, not at launch?
- Why hasn't it been done already?

Kill ideas that fail on a **fact**, not on taste. Record why each was killed — half of them come back next quarter and the reason saves the argument.

## Phase 4: Converge

Score the survivors against criteria you state **before** scoring (weight them for this project):

```
| Option | Impact | Effort | Risk | Time to learn | Reversibility | Score |
|---|---|---|---|---|---|---|
```

- **Impact**: on the success metric from Phase 1, not on "the product".
- **Time to learn**: how fast we find out we were wrong — often the deciding column.
- **Reversibility**: one-way doors get scrutiny; two-way doors get tried.

## Phase 5: Decide

```
## Brainstorm — <problem>

Recommendation: <option>
Why:            <two sentences, tied to the criteria>
Runner-up:      <option> — chosen instead if <the condition that flips it>
Killed:         <option — the fact that killed it>, ...
Riskiest assumption: <the one to test first>
Cheapest test:  <how to test it this week, before committing>
Next step:      /cdc <the chosen direction>   (or: run the cheap test first)
```

Log the decision with `/decisions`; if it shapes architecture or is a one-way door, it becomes an ADR.

## Rules
- Never converge in the diverge phase — the first plausible idea kills the better fifth one.
- Options must differ in kind. Six variations of the same idea is one option.
- "Do nothing" and "buy instead of build" are always evaluated, explicitly.
- Every killed idea keeps its reason. Every recommendation names its riskiest assumption.
- Score against criteria stated in advance; a score invented after the fact just ratifies the favorite.
- If the evidence in Phase 1 is entirely assumption, say so and recommend the cheap test **before** the build.
