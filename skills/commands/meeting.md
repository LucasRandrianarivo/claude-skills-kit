---
description: Meetings that produce decisions — agenda, facilitation, written record, decisions and actions with owners
argument-hint: "[prepare|record|followup] <subject>"
---

# /meeting — Meeting Preparation & Record

## Usage
```
/meeting prepare <subject>    — agenda, objective, materials, the decision to be made
/meeting record               — turn raw notes into a decision-and-action record
/meeting followup             — check what was decided and what actually happened
```

## Overview
A meeting is expensive: eight people for an hour is a person-day. It's worth it only if it produces something a message couldn't — a **decision**, an alignment, or a resolution of conflicting views. Everything else is a status update in the wrong format.

Two rules do most of the work: **no agenda, no meeting**, and **a decision isn't a decision until it's written down and sent**.

---

## Prepare

```
Subject:   <one line>
Objective: <decide X | align on Y | unblock Z>   ← if you can't write it, cancel
Attendees: <who must be there — each one needed for a stated reason>
           <who is informed instead — send the record, not an invitation>
Duration:  <25 or 50 minutes; the default hour is a habit, not a requirement>
Materials: <sent 24h ahead — the document is read before, not presented during>
Decision:  <the exact question to be answered, and who has the authority to answer it>
```

The single most useful pre-check: **is the decision-maker in the room?** A meeting to make a decision without the person who can make it produces a second meeting.

For a client meeting, add: what you'll demo (rehearsed, on a known-good environment), what you'll ask them to decide, and what you need from them afterwards (`/status` carries the same items in writing).

## Facilitate

- Start with the objective and the decision to be made. End when it's made, even if that's at minute 12.
- Timebox each item; when one overruns, name it and park it — "we'll take this offline with <names>" — rather than letting it eat the agenda.
- **Separate the modes** out loud: gathering information, generating options, deciding. Groups fail when someone is deciding while someone else is still exploring.
- Ask the quietest expert directly; the person with the relevant knowledge is often not the person talking.
- **Disagreement is the value.** A meeting where everyone agrees immediately either had no need to happen or has an unspoken objection that will surface later, as a delay.
- When a decision can't be made: name what's missing, who gets it, and by when. That's a valid outcome — an undecided meeting with a next step beats a fake consensus.

## Record

Written the same day, sent to everyone, including those who weren't there:

```markdown
# <Subject> — <date>
Present: <names>   Objective: <the one from the agenda>

## Decisions
| # | Decision | Rationale | Who decided | Reversible? |
| 1 | Use provider X for payments | best fit at our volume; exit cost ~2 weeks | <sponsor> | with cost |

## Actions
| # | Action | Owner | Due | Tracked |
| 1 | Open the sandbox account and share credentials | <client contact> | 18/03 | status W12 |

## Open questions
| # | Question | Who resolves | By when |

## Not decided today, and why
<one line — this prevents the same conversation next month>
```

Then: significant decisions go to `/decisions` (and to `/adr` when architecture-shaping); client-side actions go into the next `/status` blocked/waiting section; anything that changes scope goes to `/change-request`.

**If it isn't in the record, it didn't happen.** A decision taken in a call and never written is a decision that will be re-litigated, usually at the worst moment. Send the record within 24 hours and ask for corrections — silence after a sent record is the confirmation you'll rely on later.

## Follow up

Before the next meeting on the same subject: what was decided, what was done, what slipped and why. A recurring meeting where the previous actions are never reviewed teaches everyone that actions are optional — and that is exactly how a project quietly stops moving.

## Rules
- No objective, no meeting. Send a written update instead.
- Materials go out 24 hours ahead; a document read aloud is a meeting wasted.
- The decision-maker attends, or the decision isn't on the agenda.
- Every action has one named owner and a date — "the team will" means nobody will.
- The record is written and sent the same day, to attendees and absentees alike.
- End early when the objective is met; the remaining time is a gift, not a slot to fill.
