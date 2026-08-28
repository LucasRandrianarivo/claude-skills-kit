---
description: Scope change (avenant) — qualify, quantify, price, present options, get written approval before any work
argument-hint: "<the request> [--quick] [--log]"
---

# /change-request — Scope Change

## Usage
```
/change-request add multi-currency support
/change-request --quick        — the 5-line version for a small request
/change-request --log          — list all change requests and their status
```
Field notes: `.claude/references/consulting.md`.

## Overview
Unpriced scope change is the single biggest destroyer of project margin — not because of any one request, but because each one is small, defensible and unrecorded. Twenty of them are 30% of the budget and an argument at the end.

This skill makes the process **routine and unemotional**: a request arrives, it gets qualified, quantified and priced, and the client chooses. Presented as options rather than refusals, it reads as professionalism. The rule is simple and absolute: **no work starts on a change before it is approved in writing.**

---

## Phase 1: Qualify — is this actually a change?

Compare the request against the signed CDC, requirement by requirement. Three outcomes, and getting this right matters more than the price:

| Verdict | Means | Response |
|---|---|---|
| **In scope** | The CDC covers it, even implicitly | Do it. Say it's included — that builds credit for the times it isn't |
| **Ambiguity** | The CDC could be read both ways | Say so honestly. Propose splitting the cost, or absorb a small one deliberately and *record that you did* |
| **Out of scope** | Genuinely new | Change request |
| **Defect** | The delivered thing doesn't meet an accepted criterion | Not a change request — it's a fix, at your cost (`/validate` severity applies) |

Never classify a defect as a change request. It is transparent, it damages trust, and it usually costs more than the fix.

## Phase 2: Quantify — including the parts that aren't code

Estimate with `/estimate`, and include what a change specifically adds:
- The work itself, plus tests, review, deployment.
- **Rework**: what already-built things must change (a new field touches the schema, the API, the form, the export, the tests).
- **Regression risk** on what's already accepted — sometimes the real cost.
- **Documentation and training** updates.
- **Schedule impact**, which is not the same as effort: 3 days of work can push the milestone by two weeks if it lands on the critical path or forces a re-validation.

## Phase 3: Write it

```markdown
# Change request #<n> — <title>
Project <name> · CDC v<n> · <date> · Requested by <name> on <date>

## Request
<What the client asked for, in their words. Then, in one line, what it means technically.>

## Why it isn't in the current scope
<Reference the CDC section and the "not included" list. Factual, one or two lines, no defensiveness.>

## Impact
| | Effort | Price | Schedule | Risk |
| Option A — minimal: <what it does and doesn't do> | 3d | €2,100 | +3 days | low |
| Option B — recommended: <the version that will actually satisfy the need> | 6d | €4,200 | +1 week | low |
| Option C — deferred to phase 2 | 0 now | — | none now | the need persists until then |

Also affected: <milestones that move, work that must be redone, acceptance dates>

## Recommendation
<One option, with the reason in terms of their objective — not yours.>

## Decision needed by <date>
After this date the impact grows because <the team moves to X / it forces rework of Y>.

Approved: ____________________  Date: __________
```

Always include **the option of not doing it** (or deferring it). It reframes the conversation from "will you accept the price" to "which of these do you want", and it is often the honest recommendation.

## Phase 4: Approval and execution

1. **Written approval before work.** A signature, or an email saying "we approve option B, €4,200, +1 week". A verbal yes in a call is not approval — send the recap and get "confirmed" in writing (`/decisions`).
2. On approval: amend the CDC (a row in its amendment table, version bump), update the roadmap and the exec plan, and re-baseline the dates that moved.
3. On refusal: record it. Six months later, "why doesn't it do X?" has a documented answer.
4. On "do it now, we'll sort the paperwork later": that is the sentence that precedes every payment dispute. Answer warmly and firmly — a one-line email confirming the option and the price is enough, and takes two minutes.

## Phase 5: The log (`--log`)

Keep the running record in `.claude/project/<slug>/change-requests.md`, and surface it in every `/status`:

```
| # | Request | Date | Status | Effort | Price | Schedule | CDC v |
| 1 | Multi-currency | 12/03 | approved | 6d | €4,200 | +1w | v3 |
| 2 | Export to Excel | 19/03 | quoted, awaiting decision | 2d | €1,400 | +2d | — |
| 3 | Dashboard redesign | 21/03 | refused by client | 12d | €8,400 | +3w | — |
| — | Small adjustments absorbed | — | goodwill | ~3d | €0 | — | — |
```
That last line matters: tracking what you absorbed makes goodwill **visible** instead of invisible, and it is the most persuasive line in the room when the next request arrives.

## Rules
- No work on a change before written approval. No exceptions, however small, however friendly.
- A defect is never a change request.
- Always price the schedule impact separately from the effort — they are different numbers and clients conflate them.
- Always offer the option of deferring or not doing it.
- Record refusals and absorbed changes, not only approvals.
- Every approved change amends the CDC and re-baselines the plan the same day — otherwise the plan and the contract diverge, and the acceptance argument is already lost.
