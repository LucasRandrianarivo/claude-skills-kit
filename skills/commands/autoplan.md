---
description: Run all four plan reviews sequentially with auto-decisions, producing one consolidated revised plan
argument-hint: "[--interactive] [plan file | issue number]"
---

# /autoplan — Auto-Review Pipeline

One command: rough plan in, fully reviewed plan out. Runs `/plan-ceo-review`, `/plan-design-review`, `/plan-eng-review`, and `/plan-devex-review` at full depth, but answers every intermediate question itself using the 6 decision principles below. Taste decisions surface at a single final approval gate instead of 15-30 interruptions.

## Usage
```
/autoplan                       — auto-review the plan discussed in this conversation
/autoplan <path>                — auto-review a plan/spec file
/autoplan <issue number>        — auto-review a GitHub issue (fetched via gh)
/autoplan --interactive <src>   — ask the user at each conflict instead of auto-deciding
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **`--interactive`**: at every decision the principles would auto-answer, ask the user instead when the top options are genuinely close — mechanical decisions (one clearly right answer) stay automatic.
- **File path**: the plan under review; revisions are written back to this file.
- **Number**: `gh issue view <n> --json title,body` — the revised plan is written to `.claude/reports/autoplan/<date>-issue-<n>.md`.
- **No source argument**: the plan discussed in this conversation, written to `.claude/reports/autoplan/<date>-<slug>.md`.

---

## The 6 Decision Principles

These rules auto-answer every intermediate question:

| # | Principle | Rule |
|---|-----------|------|
| 1 | **Choose completeness** | Ship the whole thing. Pick the approach that covers more edge cases |
| 2 | **Boil lakes** | Fix everything in the blast radius (files this plan touches + their direct importers). Auto-approve scope expansions that are in blast radius AND small (< 5 files, no new infra) |
| 3 | **Pragmatic** | If two options fix the same thing, pick the cleaner one. 5 seconds choosing, not 5 minutes |
| 4 | **DRY** | Duplicates existing functionality? Reject. Reuse what exists |
| 5 | **Explicit over clever** | A 10-line obvious fix beats a 200-line abstraction. Pick what a new contributor reads in 30 seconds |
| 6 | **Bias toward action** | Progress beats stale deliberation. Flag concerns, don't block |

**Conflict tiebreakers by phase:** CEO phase → P1 + P2 dominate. Eng phase → P5 + P3 dominate. Design phase → P5 + P1 dominate. DX phase → P1 + P5 dominate.

## Decision Classification

Every auto-decision is classified and logged:

- **Mechanical** — one clearly right answer. Auto-decide silently (logged, not surfaced). Examples: run the analysis (always yes), reduce scope on an already-complete plan (always no).
- **Taste** — reasonable people could disagree: the top two approaches are both viable, a scope item is borderline (3-5 files or ambiguous blast radius). Auto-decide with the principles, but surface at the final gate with the alternative and its downstream impact.
- **User Challenge** — the review concludes the user's *stated direction* should change (merge, split, add, or remove something the user explicitly specified). **Never auto-decided.** Goes to the final gate with: what the user said, what the review recommends, why, what context might be missing, and the cost if the review is wrong. The user's original direction is the default — the review must make the case for change. Exception framing: if the challenge is a security or feasibility risk (not a preference), say so explicitly and urgently; the user still decides.

**Two things are never auto-decided:** premises (Phase 1 gate — what problem to solve requires human judgment) and User Challenges.

## What "Auto-Decide" Means

Auto-decide replaces the USER'S answers, not the ANALYSIS. Every phase runs its full methodology at the same depth as the interactive version:

- READ the actual code, files, and diffs each phase requires
- PRODUCE every required output (diagrams, state tables, registries, scorecards)
- IDENTIFY every issue the phase is designed to catch
- DECIDE each issue with the principles, and LOG each decision in the audit trail

**Iron rule: never compress a review section into a one-liner.** "No issues found" is valid only after doing the analysis, with 1-2 sentences on what was examined. "Skipped" is never valid for an applicable section. If you catch yourself writing fewer than 3 sentences for a review dimension, you are compressing — go back.

---

## Phase 0: Intake and Restore Point

1. **Restore point:** before touching anything, copy the plan's current content to `.claude/reports/autoplan/<date>-<slug>-restore.md` with a header noting how to restore it. Tell the user the path.
2. **Read context:** the plan source, `CLAUDE.md`, `TODOS.md` if present, `git log --oneline -20`, `git diff <base>... --stat` if a branch exists.
3. **Detect scope:**
   - **UI scope** — the plan mentions 2+ of: component, screen, form, button, modal, layout, dashboard, nav, dialog. Gates Phase 2.
   - **DX scope** — the plan mentions 2+ of: API, endpoint, webhook, CLI, flag, SDK, library, package, import, docs, onboarding, error message — or the product IS a developer tool or agent-facing surface. Gates Phase 4.
4. **Methodology:** read the sibling command files (`plan-ceo-review.md`, `plan-eng-review.md`, `plan-design-review.md`, `plan-devex-review.md` — from this kit's commands directory) and execute each phase from the file, not from memory. Skip each sibling's Usage/Argument Parsing and its own wrap-up/handoff sections — /autoplan owns intake and reporting.
5. Announce: plan summary, UI scope yes/no, DX scope yes/no, mode (auto or interactive).

## Phase 1: CEO Review (strategy and scope)

Run the full `/plan-ceo-review` methodology with these overrides:

- Mode: SELECTIVE (hold scope as baseline, cherry-pick expansions).
- **Premise gate — the one question always asked:** present the plan's premises and your challenge of each; the user confirms before anything else proceeds.
- Alternatives: pick the highest-completeness approach (P1); if tied, the simplest (P5); if the top two are close → **taste decision**.
- Scope expansions: in blast radius + small → approve (P2); outside → defer to TODOS.md (P3); duplicates → reject (P4); borderline → **taste decision**.
- One-way doors (reversibility 1-2) are always surfaced at the final gate, never silently accepted.

Emit a transition summary (issues found, decisions made, taste items queued) and write the CEO outputs (NOT in scope, What already exists, cut list, dream state delta) into the revised plan before starting Phase 2.

## Phase 2: Design Review (skip if no UI scope)

Run the full `/plan-design-review` methodology (all 7 passes, 0-10 ratings) with:

- Structural gaps (missing states, broken hierarchy, no empty-state spec): auto-fix in the plan (P1, P5).
- Design-system alignment: auto-fix when a design system exists and the fix is obvious (P4).
- Aesthetic/taste gaps (visual direction, tone): **taste decision**.

If skipped, log: "Phase 2 skipped — no UI scope detected." Emit a transition summary.

## Phase 3: Eng Review (feasibility, tests, risk)

Run the full `/plan-eng-review` methodology with:

- Scope: never reduce below what Phase 1 settled (P2); never re-argue.
- Architecture choices: explicit over clever (P5); close calls → **taste decision**.
- **Test review is never compressed:** build the full coverage diagram; for each gap, decide add-vs-defer with a stated principle; the regression rule stays iron — regression tests are added, not decided.
- Write the test plan artifact to `.claude/reports/plan-eng-review/` as the eng review specifies.
- Critical gaps in the risk register (silent + untested + unrescued) are fixed in the plan (P1), and flagged at the gate.

Emit a transition summary.

## Phase 4: DX Review (skip if no DX scope)

Run the full `/plan-devex-review` methodology (persona, TTHW, 8 passes) with:

- Persona: infer the most likely persona from README/docs (P6) — state the inference at the gate instead of stopping to ask.
- Getting-started friction: always toward fewer steps (P5). Error messages: always problem + cause + fix (P1). Naming: consistency over cleverness (P5).
- Opinionated-default vs flexibility calls: **taste decision**.

If skipped, log: "Phase 4 skipped — no developer-facing scope." Emit a transition summary.

## Decision Audit Trail

After every auto-decision, append a row to the revised plan (incrementally, not at the end):

```markdown
## Decision Audit Trail
| # | Phase | Decision | Class | Principle | Rationale | Rejected alternative |
|---|-------|----------|-------|-----------|-----------|----------------------|
```

**Iron rule: no silent decisions — every choice gets a row.** In `--interactive` mode, rows record the user's answer instead.

## Pre-Gate Verification

Before the final gate, verify the revised plan actually contains: premise gate passed; every applicable review dimension with findings or an explicit "examined X, nothing flagged"; NOT-in-scope and What-already-exists sections; the coverage diagram and risk register (Phase 3); state tables and scores (Phase 2, if run); persona + TTHW + scorecard (Phase 4, if run); a non-empty audit trail. Anything missing → go back and produce it (max 2 attempts, then proceed with a warning naming what's incomplete).

---

## Output — Final Approval Gate

Present, then ask the user to choose, presenting numbered options:

```markdown
## /autoplan Review Complete

### Plan Summary
[1-3 sentences]

### Decisions: [N] total — [M] auto-decided, [K] taste, [J] user challenges

### User Challenges (the review disagrees with your stated direction)
**Challenge [N]: [title]** (from [phase])
You said: […] · Review recommends: […] · Why: […]
What we might be missing: […] · If we're wrong, the cost is: […]
Your call — your original direction stands unless you explicitly change it.

### Your Choices (taste decisions)
**Choice [N]: [title]** (from [phase]) — I picked [X] ([principle]). [Y] is also viable: [1-sentence downstream impact].

### Review Scores
- CEO: [verdict] · Design: [overall /10 or "skipped, no UI scope"]
- Eng: [issues, critical gaps] · DX: [overall /10, TTHW, or "skipped"]

### Cross-Phase Themes
[Concern that appeared independently in 2+ phases = high-confidence signal — name it. Otherwise: "No cross-phase themes."]

### Deferred to TODOS.md
[items with reasons]

### Revised plan: <path>   ·   Restore point: <path>
```

Skip empty sections. 8+ taste decisions → group by phase and warn: "unusually high ambiguity — review carefully."

Options: **A)** approve as-is **B)** approve with overrides (name which taste decisions to flip) **C)** interrogate a specific decision **D)** revise the plan and re-run affected phases (max 3 cycles) **E)** discard revisions (restore point path above).

On approval: log one line to `.claude/decisions.jsonl` (`{"date","skill":"autoplan","decision":"plan approved: <slug>","challenges":J,"taste":K}`) and suggest `/feat` to implement or `/spec` to file the revised plan as an issue.

**Iron rule: never abort to interactive review.** The user chose /autoplan — surface taste decisions at the gate, don't redirect mid-run.
