---
description: Project mode — run a whole project from idea to delivery through gated phases, with persistent state and the right skill at each step
argument-hint: "[start <name> | status | next | phase <n> | close]"
---

# /project — Project Mode

## Usage
```
/project start <name>      — open a project: brainstorm → CDC → roadmap → execution
/project status            — where the project stands: phase, gate, blockers, drift
/project next              — do the next thing the project needs
/project phase <n>         — jump to a phase (execution, validation, delivery)
/project close             — deliver, retro, archive
```

## Overview
The other skills in this kit each do one thing well. Project mode is the **thread through them**: it keeps the state of a real project — what was decided, what was specified, where we are, what's blocking — in files that survive sessions, and at every step it runs the right skill with the right input.

The arc:

```
/brainstorm ──▶ /cdc ──▶ /roadmap ──▶ /exec-plan ──▶ build ──▶ /validate ──▶ /delivery
   idea         spec       phases      steps      (feature loop)  recette     handover
     │            │           │           │            │             │           │
     └─ gate 0 ───┴─ gate 1 ──┴─ gate 2 ──┴── phase gates ───────────┴─ gate 3 ──┘
```

Nothing crosses a gate without your decision. Every gate can send the project backwards — that's the point of having them.

---

## State

Everything lives in `.claude/project/<slug>/`, in plain markdown you can read, edit and commit:

```
.claude/project/<slug>/
├── project.md          ← the dashboard: phase, gate status, blockers, decisions, next action
├── brainstorm.md       ← options considered, what was chosen and why
├── cdc.md              ← the cahier des charges (versioned, amendments logged)
├── roadmap.md          ← phases, milestones, capacity, critical path
├── exec-<phase>.md     ← the step-by-step plan per phase
├── validation-*.md     ← acceptance rounds and their verdicts
└── delivery.md         ← handover package and sign-off
```

`project.md` is refreshed after every step and is the first thing read on `/project status` or at the start of a new session. It is the project's memory — it should be enough to resume cold.

## `/project start <name>`

1. Create the state directory and `project.md` with the project name, date, and status `FRAMING`.
2. Ask the four framing questions and record the answers: **what problem · for whom · by when · with what constraints**. Nothing else yet — details belong in the CDC.
3. Run `/brainstorm` on the problem → save `brainstorm.md`.
4. **Gate 0 — direction.** Present the recommended direction and its riskiest assumption. Decide: proceed to the CDC · test the assumption first · stop.
5. On proceed: run `/cdc --from-brainstorm` → `cdc.md`. **Gate 1 — specification validated.**
6. Then `/roadmap` → `roadmap.md`. **Gate 2 — plan accepted** (capacity checked, critical path named).
7. Then `/exec-plan phase 1` and start building.

## `/project next`

Read `project.md`, determine where the project actually is, and do the next thing — never ask the user to remember the process:

| State | Next action |
|---|---|
| No CDC | `/cdc` (after `/brainstorm` if the direction isn't chosen) |
| CDC validated, no roadmap | `/roadmap` |
| Phase planned, tasks remaining | The next task, with the skill its plan names (`/fullstack`, `/component`, `/integrate`, …) |
| Phase tasks done | The phase gate: `/build`, `/pr-review`, the phase's non-functional checks |
| Gate passed, phases remaining | `/exec-plan phase <n+1>` |
| Last phase passed | `/validate` |
| Acceptance passed | `/delivery` |
| Delivered | `/retro` then `/project close` |

Before acting, state in one line what it's about to do and why that's next. If the next action is a gate, present the gate instead of pushing through it.

## Building inside a phase

Per task, in the plan's order, using the skill the plan names:

- Cross-layer feature → `/fullstack` (contract-first, gated)
- Single-layer feature → `/feat`
- UI component → `/component`, then `/a11y` + `/responsive` on what it renders
- Third-party API → `/api-scout` (if the vendor isn't chosen) then `/integrate`
- Wide repetitive work → `/orchestrate`
- Bug → `/debug` (root cause before fix, always)

After each task: mark it done in the phase plan with its evidence, and update `project.md`. After each **phase**: run the gate checklist from `/exec-plan`, and record the verdict.

## `/project status`

```
## <project> — phase <n>/<total>: <name>
CDC v<n> (<n> amendments) · Roadmap base <date> · Day <n> of <n>

Progress:  ███████░░░  <done>/<total> tasks this phase
Gate:      <passed | pending: what's missing>
Blocked:   <task — blocker, owner, since <date>>
At risk:   <what could slip, why>
Drift:     <planned vs actual, and the cause>
Decisions: <n> logged · <n> ADRs
Next:      <the single next action>
```

Report drift honestly and early. A project mode that reports "on track" until the deadline is worse than no project mode.

## `/project close`

1. `/delivery` — the handover package and sign-off.
2. `/retro` — estimated vs actual, what churned, what broke, what to change next time.
3. `/learn` — record the durable lessons.
4. Set `project.md` status to `CLOSED`, with the final dates, the delivered scope, and what was deferred.

## Rules
- The state files are the truth; if `project.md` and your memory of the project disagree, the file wins — re-read it before acting.
- Never skip a gate to save time. A gate skipped is a correction deferred to the most expensive moment.
- Never change a validated CDC requirement silently — it's an amendment, with its impact on planning and budget.
- Every phase produces something demonstrable; a phase that can't be demoed can't be validated.
- Blockers surface the day they appear, in `project.md` and in the next status.
- Keep the state files in the user's language and commit them with the code — the project's reasoning belongs in the repository.
