# Field notes — Professional practice (client work, pricing, scope)

Consulted by `/proposal`, `/estimate`, `/kickoff`, `/status`, `/change-request`, `/invoice`, `/tech-debt`, `/cdc`, `/delivery`.

---

## The mental model

A client project fails commercially long before it fails technically. The three mechanisms, in order of how much money they destroy:

1. **Unpriced scope change.** Small additions, each "quick", none re-quoted. The budget is consumed by work nobody agreed to pay for, and the argument happens at the end, when goodwill is lowest.
2. **The estimate treated as a commitment.** A number given to be helpful becomes a deadline, then a breach.
3. **No named decision-maker.** Work waits on validations nobody is empowered to give; the delay is invisible in the plan and blamed on the supplier.

Every practice below exists to defuse one of those.

## Pricing models — what each one actually transfers

| Model | Who carries the risk | Use when | Trap |
|---|---|---|---|
| **Fixed price** (forfait) | You | Scope is genuinely closed and specified | Any imprecision in the spec is a loss you fund. Needs a written CDC and a change-request process, or it is a slow bleed |
| **Time & materials** (régie) | Client | Scope is exploratory or shifting | The client feels unbounded exposure — cap it per period and report burn weekly, or trust erodes |
| **Capped T&M** | Shared | Most real projects | Only works if you stop at the cap and re-decide. A cap you silently exceed is a fixed price you priced badly |
| **Milestone/deliverable** | Shared | Clear phases with acceptance | Acceptance criteria must be written per milestone or the last one never closes |
| **Retainer** | Shared | Ongoing maintenance/support | Define what's included, the response times, and what rolls over — or it becomes unlimited support |
| **Value/outcome** | You | Rare: the outcome is measurable and you control the levers | You rarely control the levers |

The honest default for a project with a real spec: **fixed price per phase**, re-quoted between phases. It gives the client budget certainty and you the right to re-price when reality changes.

## Estimation — why they're wrong, structurally

- **The planning fallacy**: people estimate the path where nothing goes wrong. That path has never happened.
- **What's forgotten is not the coding**: it's review, fixes, deployment, environments, meetings, waiting for the client, integration surprises, and the last 10% of polish. Typically 40–60% of real elapsed effort.
- **A number without a range is read as a promise.** Give a range with the assumptions that would move it, or give the range you'd bet your own money on.
- **Reference class beats decomposition alone**: "the last three projects like this took 8–14 weeks" is better evidence than a sum of optimistic tasks. Use both, and reconcile the gap out loud.
- **Productive time is ~3.5 days per person-week**, not 5. Meetings, context switching, support and review are not free.
- **Estimate uncertainty, not just effort**: mark each item known / unclear / unknown. Unknowns get a spike, never a number.
- The estimate degrades the moment scope moves — so re-estimate at each phase gate, and say so when you first give the number.

## Scope — the mechanics of creep

Creep is rarely one big request. It's: a "small" addition during a demo, a field added to a form, an extra role, "can it also work on mobile", a third-party integration that turned out to be two. Each is defensible alone; together they are 30% of the budget.

The only defense that works is **procedural, not confrontational**: everything outside the written scope becomes a change request with a price and a schedule impact, presented as *options* rather than refusals. The client decides what they want to buy. Said early and warmly, this reads as professionalism; said for the first time at the end, it reads as a dispute.

Two things make it painless: an **explicit non-scope list** in the CDC (the three things the client most likely assumes are included), and a **standing line in every status report** for pending change requests.

## Client dependencies are project risks

Content, accesses, credentials, validations, third-party contacts, test data — every one of these is a task with an owner and a date, and the supplier's plan slips when they're late. Put them in the plan **with the delay they cause**, report them weekly while they're outstanding, and never let a late client input become a silent supplier delay. This single practice prevents most end-of-project disputes about who caused the slip.

## Communication rules that hold up

- **Bad news travels immediately.** A slip reported the day it's known is a problem; the same slip revealed at the deadline is a breach of trust that outlives the project.
- **Never report a percentage you can't defend.** "80% done" means nothing; "5 of 7 milestones accepted, the 6th is in acceptance" means something.
- **One channel of record.** Decisions taken in a call are not decisions until they're written down and sent (`/decisions`).
- **Match the register to the audience**: the sponsor wants budget, date and risk; the product owner wants scope and trade-offs; the technical contact wants detail. The same update, three framings.
- **Never let a technical contact's request bypass the contract** — route it through the change-request process, politely, every time.

## Payment hygiene

Deposit before starting (30% is common), then milestone-linked invoicing so the receivable never gets far ahead of the delivery. Net-30 terms, late-payment interest stated (legally due in many jurisdictions, and worth stating even if you rarely charge it), and a written rule about what happens when an invoice is overdue — work continues or it pauses, decided in advance, not in anger. Deliverables and IP transfer on **full payment**; say so in the proposal.

## Where this gets decided wrong

- Quoting fixed price on a spec written by the client in prose, with no non-scope list.
- Giving an off-the-cuff estimate in a meeting; it is now the budget.
- Absorbing small changes to be nice, then discovering the margin is gone and having no record of why.
- Reporting green until the week the deadline is missed.
- Starting without a deposit, an access list, or a named decision-maker.

## Where to check the current truth
Everything commercial here is jurisdiction- and contract-specific. Fetch and cite these before stating a version-specific fact — the `expertise` rule requires it:
- The signed contract and CDC for this engagement — they outrank any general practice
- Local law on payment terms and late-payment interest (in France: Code de commerce, art. L441-10)
- Your professional body or accountant for invoicing, VAT and IP-transfer specifics
- Never state a legal obligation from these notes — route it to counsel (`/rgpd` follows the same rule)
