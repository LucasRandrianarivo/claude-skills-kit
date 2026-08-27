---
description: Prepare billing — milestone or time-based statement, reconciled against the contract, with unbilled work surfaced
argument-hint: "[--milestone <n>] [--period <month>] [--recap]"
---

# /invoice — Billing Preparation

## Usage
```
/invoice --milestone 2     — bill a completed and accepted milestone
/invoice --period 2026-03  — bill a time & materials period
/invoice --recap           — where the project stands financially: billed, unbilled, absorbed
```
Field notes: `.claude/references/consulting.md`.

## Overview
This prepares the **statement of what is billable and why** — the part that requires knowing the project. Issuing the legal invoice is your accounting system's job; this skill makes sure that invoice is correct, defensible, and doesn't quietly leave money on the table.

The two failures it prevents: billing a milestone the client hasn't accepted (which triggers a dispute instead of a payment), and finishing a project having never billed the approved change requests.

---

## Phase 1: Establish what is billable

Read the contract terms (from `/proposal`) and the project state:

**Milestone billing** — a milestone is billable when its acceptance condition is met, and only then:
```
Milestone <n>: <name>
Deliverables: <from CDC §7>            Delivered: <date>
Acceptance: <accepted <date> | with reserves | pending since <date>>
Amount: <€> (<%> of the phase, per the proposal)
```
If acceptance is pending, say so and either bill per the contract (many contracts allow tacit acceptance after N days — check yours, and reference the clause) or chase the acceptance first. Never bill a milestone that has open S1/S2 defects (`/validate`) — you will be paid later, not sooner.

**Time & materials** — reconcile the time log against the work actually done (`git log`, tasks closed, `/status` reports), then present it in terms the client recognizes:
```
| Item | Days | Rate | Amount | Evidence |
| Order module (F-04, F-05) | 6.5 | €650 | €4,225 | milestones/PRs, status W11–W12 |
| ERP integration spike | 1.0 | €650 | €650 | report delivered 14/03 |
```
A T&M invoice that lists dates without deliverables invites scrutiny; one that maps days to outcomes gets paid.

## Phase 2: The sweep for unbilled work — do this every time

This is where the money is:
- **Approved change requests** delivered but never added to an invoice (`/change-request --log`). This is the most common omission by far.
- Out-of-scope work absorbed as goodwill: not billed, but **stated** in the recap. Invisible goodwill buys nothing.
- Expenses the contract makes rebillable: licences, third-party services, travel.
- Support or maintenance beyond the included volume in a retainer.
- Work performed while waiting on a client dependency (billable in T&M; in fixed price it's a schedule claim, not a billing one).

## Phase 3: Reconcile before issuing

```
## Billing statement — <project>, <milestone|period>

Contract: <ref> · <fixed per phase | T&M capped at €X> · Terms: net 30
Billable now:      €<n>   (<milestone n accepted <date> | <n> days in <period>>)
Change requests:   €<n>   (CR#1 approved <date>, delivered <date>)
Expenses:          €<n>   (<rebillable per §6>)
Total (excl. VAT): €<n>

Already billed: €<n> of €<n> contracted (<%>)
Delivered but not yet billable: <what, and what unlocks it>
Absorbed (goodwill, not billed): <n> days — <what>
Cap status (T&M): €<n> of €<n> — <n>% remaining, <at this burn rate, reached around <date>>
```

Checks before it goes out: does the total match the contract and the approved CRs? Is the reference the client's PO/project code (a missing reference is the most common reason an invoice sits in someone's inbox)? Are the payment terms and bank details right? Is it going to the person who *pays*, not only to the person you work with?

## Phase 4: The conversation around it

- **Never let an invoice be the first news** of a change request's cost — it was approved in writing weeks earlier (`/change-request`), and the invoice merely reflects it.
- **Cap approaching (T&M)**: warn at ~70% and again at ~85%, in `/status`, with a projection — never at 100%. Hitting a cap unannounced is a trust failure, not a billing one.
- **Overdue**: a factual reminder at the due date, then escalation to the sponsor. The rule for what happens if it stays unpaid (work continues or pauses) was set in the proposal — apply it as agreed, calmly, not as a threat invented in the moment.
- **Deliverables and IP transfer on full payment**, if that's what the contract says. Say it once, at the right moment, without drama.

## Phase 5: The financial recap (`--recap`)

At each phase end and at project close (`/delivery`):
```
Contracted: €<n> (initial €<n> + CRs €<n>)
Billed: €<n>   Paid: €<n>   Outstanding: €<n> (<n> days overdue: €<n>)
Days: sold <n> · consumed <n> · absorbed <n>   Effective rate: €<n>/day vs €<n> quoted
Margin signal: <on/over/under budget> — cause: <estimate miss · scope absorbed · client delays>
```
That effective-rate line is the one to carry into the next `/estimate` and the next `/proposal`. A project that felt fine and returned €430/day on a €650 rate has something to teach — usually about absorbed scope.

## Rules
- Never bill a milestone before its acceptance condition is met; check the contract's tacit-acceptance clause rather than improvising.
- Never bill an approved change request as a surprise, and never fail to bill one.
- Record absorbed work even though it isn't billed — it's the evidence behind your next negotiation.
- Warn before the cap is reached, in the status report, with a projection.
- Every line maps to a deliverable or an approved request; a bare list of days invites a dispute.
- Apply the agreed late-payment rule as written; decide the policy at contract time, never mid-conflict.
