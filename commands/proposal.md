---
description: Commercial proposal / devis — scope, options, pricing model, assumptions, exclusions, terms, validity
argument-hint: "<client or project> [--fixed|--tm|--retainer] [--options N]"
---

# /proposal — Proposal & Quote (devis)

## Usage
```
/proposal <project>
/proposal --fixed            — fixed-price per phase (default for a specified scope)
/proposal --tm               — time & materials, capped
/proposal --retainer         — ongoing engagement
/proposal --options 3        — present tiered options (recommended)
```
Field notes: `.claude/references/consulting.md`.

## Overview
The proposal is where the project's economics are decided. Two things separate a proposal that protects both sides from one that becomes a dispute: **what is explicitly not included**, and **what happens when something changes**. Everything else is presentation.

Builds on `/estimate` (the numbers) and `/cdc` (the scope). Feeds `/kickoff` once signed.

---

## Phase 1: Qualify before writing

Don't produce a proposal for a project you can't scope. Establish, and write down the answers:
- **The problem and its business value** — in their words. A proposal that restates the client's problem better than they did wins on that alone.
- **The decision-maker** and the buying process (who signs, what budget cycle, what else they're comparing).
- **Budget range and deadline** — ask directly. "We don't have one" means the number exists and isn't shared; propose options at different levels and let the answer emerge.
- **Constraints**: existing systems, in-house team, compliance, who maintains it afterwards.
- **Red flags worth declining or re-framing**: no named decision-maker, a fixed price on an unwritten scope, a deadline set before the scope, "just like X but simpler", or a client who has already fired two suppliers.

## Phase 2: Choose the pricing model deliberately

| Model | When | What you must add |
|---|---|---|
| **Fixed per phase** | Scope specified (`/cdc`) | A change-request clause, or every imprecision is your loss |
| **Capped T&M** | Exploratory or shifting scope | Weekly burn reporting, and an actual stop at the cap |
| **Milestones** | Clear phases | Written acceptance criteria per milestone |
| **Retainer** | Ongoing work/support | Included volume, response times, rollover rule |

Quote **per phase** whenever the project has more than one: it gives the client budget certainty and gives you the right to re-price when phase 1 teaches you what phase 2 really is. Say that reasoning out loud in the document — it reads as competence, not as hedging.

## Phase 3: Write it

```markdown
# Proposal — <project>
For <client> · <date> · Valid until <date + 30d> · Ref <n>

## 1. Your context and objective
<Their problem, their words, the business outcome. Two paragraphs, no jargon.>

## 2. What we propose
<The solution in outcome terms. What they will be able to do that they can't today.>

## 3. Scope
### Included — by phase, with the deliverable of each
### Not included   ← the three things they most likely assume are in. Be specific.
### Assumptions    ← what must be true; each one is a price condition

## 4. Approach & planning
Phases, milestones, what they see at each one, and **what we need from you and by when**
(content, accesses, validations — with the delay caused if late).

## 5. Options
| | Essential | Recommended | Complete |
|---|---|---|---|
| Scope | … | … | … |
| Price | €X | €Y | €Z |
| Delivery | … | … | … |
Three options make the conversation "which one" instead of "yes or no", and let the
client self-select on budget without negotiating your rate.

## 6. Price and terms
Model: <fixed per phase / capped T&M at €<rate>/day>
Schedule: 30% on order · <n>% per milestone · balance on acceptance
Terms: net 30 · late-payment interest per <applicable rate> · prices exclude VAT
Included: <warranty period, support, training>  Excluded: <hosting, licences, third-party fees>
Change requests: quoted separately before any work — never absorbed silently
IP: transfers on full payment · <open-source components listed>

## 7. Why us
<Two comparable references with an outcome, not a feature list.>

## 8. Next step
<One concrete action with a date. Never end a proposal with "let us know".>
```

## Phase 4: Pressure-test before sending

- Is every number traceable to `/estimate`, with its assumptions carried across?
- Does "not included" contain the three most likely assumptions? (If it's empty, the proposal is a liability.)
- Is there a change-request mechanism, and does the client's obligations list have **dates**?
- Would you accept this contract if you were the client — and would you still accept it if the project ran 30% over?
- Is the validity date set? An old quote resurfacing at today's costs is a real loss.
- Does it survive being read only in parts — the sponsor reads sections 1, 5 and 6.

## Phase 5: After sending

Follow up once, with a deadline of your own. Negotiate on **scope**, not on rate: a discount teaches the client your price was arbitrary; removing a phase teaches them your work has value. If they cut the budget, cut the scope visibly and re-issue — never keep the scope and absorb it.

On acceptance: signed proposal + `/cdc` become the contractual basis, and `/kickoff` starts.

## Rules
- Never quote fixed price on a scope that isn't written down; propose a paid framing phase instead.
- "Not included" is mandatory and specific.
- Every price condition (assumption, client obligation, validity date) is in the document, not in the conversation.
- Every proposal states how changes are handled, before there are any.
- Never present one option where three would let the client choose.
- Never invent a reference, a certification, or a capability you don't have.
