---
description: Project kickoff — stakeholders, decision-maker, accesses, cadence, definition of done, risks, the first-week checklist
argument-hint: "<project> [--internal] [--client]"
---

# /kickoff — Project Start

## Usage
```
/kickoff <project>
/kickoff --client        — client engagement kickoff
/kickoff --internal      — internal project or a new team on an existing codebase
```
Field notes: `.claude/references/consulting.md`.

## Overview
Most project failures are visible in week one and admitted in month three: nobody knows who decides, the accesses aren't there, the definition of "done" is different for each party, and the communication cadence was never set. Kickoff is cheap; the fix later is not.

Output goes to `.claude/project/<slug>/kickoff.md` and feeds `/roadmap` and `/status`.

---

## Phase 1: People — the part that silently blocks everything

```
| Role | Name | Decides / provides | Reachable how | Backup |
| Sponsor (signs, owns budget) | | scope & budget arbitration | | |
| Product owner (day to day) | | priorities, acceptance | | |
| Technical contact | | accesses, existing systems | | |
| End-user representative | | real usage, validation | | |
```
Two questions decide the project's rhythm: **who validates a deliverable**, and **who arbitrates when two stakeholders disagree**. If the answer to either is "we'll see", that is risk #1 in the register — a project with no arbiter stalls at the first conflict, and the delay is invariably attributed to the supplier.

Agree the **escalation path** now, while everyone is friendly.

## Phase 2: Accesses & environments — start the clock immediately

The most common week-one loss is waiting for credentials. Request everything on day one, with dates:

```
| Item | Owner | Requested | Needed by | Received |
| Repository / source code access | | | | |
| Staging & production environments | | | | |
| Third-party accounts (payment, email, analytics, CRM) | | | | |
| Design files, brand assets, content | | | | |
| Existing documentation, data samples (anonymized) | | | | |
| VPN / SSO / device requirements | | | | |
```
Every line is a task with a date and a consequence if late (`/status` reports the outstanding ones every week until they're closed). Never let a missing access become a silent delay you absorb.

## Phase 3: The rules of engagement

- **Cadence**: a weekly written status (`/status`), a demo at each milestone, and one recurring call — short, with an agenda (`/meeting`).
- **Channels**: one channel of record for decisions (email or the tracker). Chat is for speed; decisions are written down or they didn't happen (`/decisions`).
- **Response expectations**: how fast the client answers a blocking question, and what you do when they don't (that rule prevents the "we were blocked for two weeks" conversation).
- **Definition of done**, agreed and written: code reviewed, tests passing, deployed to staging, acceptance criteria met, documented. Say it now, or "done" will mean four different things.
- **Change requests**: everything outside the written scope is quoted before work (`/change-request`). Say it warmly, once, at kickoff — it is much harder to introduce later.
- **Working assumptions**: hours, holidays, freeze periods, on-call expectations (there are none unless contracted).

## Phase 4: Technical kickoff

For a client codebase, spend the first day proving you can actually work:
1. Clone, install, run, test, and deploy to a non-production environment — following the README literally (`/devex-review` if it fails, and it usually does).
2. Map the stack, the deployment path, and who else touches production.
3. Run `/health` and `/cso` (or at least a dependency and secret scan) — you need to know what you're inheriting **before** you're the last one who touched it. Report critical findings immediately, as information, not as blame.
4. Set up the kit for the project: `npx claude-skills-kit init`, `/context-save`, and the `.claude/project/<slug>/` state.

For a new project: repository, CI skeleton, environments, and the contract (`/contract`) before feature work — so parallel work is possible from week one.

## Phase 5: Risks, on the table from day one

```
| Risk | Probability | Impact | Mitigation | Owner |
| ERP API undocumented | high | +2 weeks | spike in week 1, re-estimate after | supplier |
| Content delivered late | medium | slips launch | dates in the plan, weekly reporting | client |
| Single decision-maker unavailable in August | high | blocks acceptance | named backup, decisions batched before | client |
```
Naming a client-side risk at kickoff is professional; naming it for the first time when it materializes sounds like an excuse.

## Phase 6: The kickoff document

```
## Kickoff — <project>   <date>
Objective: <one sentence, the business outcome>
Scope reference: CDC v<n> · Proposal ref <n> (signed <date>)
People: <table>   Decision-maker: <name>   Arbitration: <path>
Cadence: <status day> · <demo per milestone> · <call>
Definition of done: <the agreed list>
Change requests: <the agreed process>
Accesses: <n>/<n> obtained — outstanding: <list with dates>
Risks: <top 3, with owners>
First milestone: <what, when, how it's validated>
```
Send it within 24 hours, and ask for a written "yes, that's right". That reply is worth more than the meeting.

## Rules
- No project starts without a named decision-maker and a named arbiter.
- Every access is a dated task with an owner, tracked weekly until closed.
- The definition of done is written and agreed at kickoff, never assumed.
- The change-request process is explained at kickoff, warmly, before there is anything to dispute.
- Prove you can build, run and deploy in the first days — not in the first sprint.
- Send the written recap within 24 hours and get it confirmed; an unconfirmed kickoff is a memory, not an agreement.
