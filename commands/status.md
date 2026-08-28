---
description: Client/stakeholder status report — what shipped, what's next, budget & schedule health, blockers, decisions needed
argument-hint: "[weekly|milestone] [--internal] [--red]"
---

# /status — Status Report

## Usage
```
/status                  — this period's report from the project state and git history
/status milestone        — end-of-milestone report with the demo and acceptance ask
/status --red            — how to report a project that is off track (the hardest one, and the most important)
```
Field notes: `.claude/references/consulting.md`.

## Overview
The status report is where trust is built or lost. Its job is not to reassure — it's to make sure **no one is surprised**. A slip reported the day it's known is a problem the client helps solve; the same slip revealed at the deadline is a breach of trust that outlives the project.

Two rules carry it: **never report a percentage you can't defend**, and **every blocker names who must act, and by when**.

---

## Phase 1: Gather the facts, not the feelings

From the project state and the repository — not from memory:
- Merged work since the last report (`git log --since=<date> --no-merges`), mapped to CDC requirement ids and roadmap items.
- Milestone/task status from `.claude/project/<slug>/exec-*.md` (done · in progress · blocked).
- Days consumed vs planned; budget consumed vs planned.
- Open change requests and their status.
- Client-side dependencies still outstanding, with how long they've been waiting.
- Anything discovered that changes the plan (an unknown that resolved badly, a third-party surprise).

## Phase 2: The report

```markdown
# <Project> — status, week <n>   <date>

## Health
Schedule: 🟢 on track | 🟡 at risk | 🔴 late — <one sentence saying why>
Budget:   <n>/<n> days consumed (<%>) for <%> of scope delivered
Next milestone: <name> — <date> (<unchanged | moved from <date> because <reason>>)

## Delivered this period
- <in outcome terms: "users can now reset their password", not "merged PR #42">
- <demo link / staging URL where it can be seen>

## In progress
- <item> — <expected completion>

## Blocked / waiting on you        ← the most important section
| # | What we need | From whom | Asked on | Impact if it arrives after <date> |
| 1 | Product photos for the catalogue | <name> | 12/03 (14 days ago) | pushes the launch by the same number of days |

## Decisions needed from you
| # | Decision | Options | Our recommendation | Needed by |

## Change requests
| # | Request | Status | Effort | Price | Schedule impact |
| 1 | Multi-currency support | quoted, awaiting signature | 6d | €4,200 | +1 week |

## Next period
- <what will be done, specifically enough to be checked next week>

## Risks
<only the ones that changed, with what you're doing about them>
```

Send it on the same day each week, whether or not there is news. A report that appears only when there's good news is a signal by its absence.

## Phase 3: Reporting honestly (`--red`)

A project that is late is reported **red, early, with a plan** — never amber for three weeks in a row before turning red the week of the deadline.

The structure that works:
1. **The fact, first sentence.** "The launch date of 14 June is no longer achievable; the realistic date is 28 June."
2. **The cause, factually and without blame** — including when the cause is on the client's side ("the catalogue content arrived 14 days after the planned date"), stated as a fact, evidenced by the earlier reports where you flagged it. This is precisely why the weekly blocked-section exists.
3. **The options, with their costs**: cut scope to hold the date, move the date, add resources (with the honest ramp-up cost and the fact that it rarely accelerates a project that's already late).
4. **Your recommendation**, and what you need decided, by when.
5. **What you've changed** so it doesn't repeat.

Never dress a red as an amber. And never announce a slip and a plan in the same breath as a request for more money without separating the two conversations — first the situation, then the commercial consequence (`/change-request`).

## Phase 4: Milestone reports

Add: what is being submitted for acceptance, the acceptance criteria it meets (CDC ids), how to validate it (`/validate` script or UAT link), the delay for raising defects, and what invoicing this triggers (`/invoice`). Make the ask explicit — "please confirm acceptance by <date>, after which we proceed to phase <n+1>".

## Rules
- Same day, every period, news or not.
- Percentages only when defensible; prefer "5 of 7 milestones accepted".
- Every blocker names the person, the date it was requested, and the consequence.
- Bad news goes in the first paragraph, never at the bottom.
- Never report green when a slip is known — the report is a record, and a false green is the thing that ends engagements.
- Keep it to one page: the sponsor reads health, blockers and decisions. Detail goes in the appendix or the tracker.
