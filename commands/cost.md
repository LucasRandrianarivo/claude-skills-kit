---
description: Cloud & infrastructure cost — attribute spend, find the waste, decide what to cut, and keep it from creeping back
argument-hint: "[--audit] [--attribute] [--forecast] [--optimize]"
---

# /cost — Infrastructure Cost

## Usage
```
/cost --audit          — where the money goes, and what's waste
/cost --attribute      — attribute spend to teams, features or customers
/cost --optimize       — the ranked cut list, with the risk of each
/cost --forecast       — what this change/growth will cost
```

## Overview
Cloud spend grows by accretion: a dev environment nobody turned off, a log pipeline ingesting debug output, an over-provisioned cluster sized during an incident two years ago, an LLM feature whose context tripled. Nobody decided any of it.

The rule that makes this tractable: **attribute first, optimize second.** Untagged, unattributed spend cannot be reduced, only guessed at — and the guesses always cut the wrong thing.

---

## Phase 1: See it

1. Pull the actual bill by service and by month — the trend matters more than the total. What grew, and did anything explain it?
2. **The usual top five**, in the order they're usually wrong: compute (over-provisioned, idle, non-production running 24/7), data egress and inter-AZ traffic (invisible until it isn't), storage (snapshots and old backups nobody expires, logs kept "just in case"), managed data services (over-sized instances, unused replicas), observability (log/metric ingestion priced per GB — frequently the second-largest line and always a surprise), plus LLM/API tokens for AI features.
3. **Unit economics**: cost per active user, per order, per tenant, per 1000 requests. A total that rises with a growing product is fine; a *unit* cost that rises is the actual signal.

## Phase 2: Attribute (`--attribute`)

Without tags there is no accountability. Enforce a tag policy in IaC (`/iac`): `env`, `service`, `team`, `cost-center` — with a policy check that fails the plan when a resource is untagged. Then split shared costs (clusters, databases, CDN) by a defensible key (requests, storage, pod resource requests) and publish the breakdown where the teams who spend it can see it. Visibility alone typically removes the easiest 10–20%, because someone recognizes their forgotten environment.

## Phase 3: The waste checklist

| Category | Look for |
|---|---|
| Idle | Non-production running nights and weekends; unattached volumes and IPs; load balancers with no targets; old snapshots; stopped instances still holding storage |
| Over-provisioned | Instances/pods at <20% of requested resources for a month; a database sized for a peak that never came; replicas serving nothing |
| Storage | No lifecycle rules; backups kept forever; logs at debug level in production; multiple copies of the same objects |
| Network | Cross-AZ chatter between services that should be co-located; egress via the internet where a private endpoint exists; a CDN not caching (every miss is origin egress) |
| Observability | Ingesting every debug line; high-cardinality metrics; long retention on data nobody queries after a week |
| Pricing model | On-demand for steady baseline load (committed use/reserved/savings plans); no spot for interruptible work; oversized serverless memory |
| Data transfer between clouds | Anything crossing providers — usually an architecture accident |
| AI | Full context sent every call, no prompt caching, the biggest model for classification (`/llm --cost`) |

## Phase 4: Decide, with the risk stated (`--optimize`)

```
| # | Action | Monthly saving | Effort | Risk | Reversible |
| 1 | Stop non-prod outside business hours | €1,850 | S | none (scheduled) | instantly |
| 2 | Log level to info; 14-day retention | €1,200 | S | less forensic depth on old incidents | yes |
| 3 | Right-size the API pods to measured p95 | €900 | M | tighter headroom on a traffic spike | yes |
| 4 | 1-year commitment on the steady baseline | €2,400 | S | locks the baseline for a year | no |
```
Rank by saving ÷ (effort × risk). Do the reversible ones first. And say plainly when a saving isn't worth it: engineering time spent shaving €50/month is a loss, and reliability traded for cost is a decision the team must make consciously — never silently.

Commitments (reserved/savings plans) come last, after right-sizing: committing to your current waste locks it in for a year.

## Phase 5: Keep it from creeping back

- **Budgets and anomaly alerts** per environment and per service, routed to the team that owns them, not to a mailbox.
- **Cost in the pull request** (Infracost or equivalent) so a €4k/month resource is visible at review, not on the invoice.
- Schedules for non-production; lifecycle rules on every bucket; retention set on every log and metric stream.
- A recurring review (monthly), with the unit-economics number as the headline — that's the one that catches a regression while it's small.

## Report

```
## Cost Audit — <period>
Total: <€> (<±%> vs previous)   Unit: <€ per active user> (<±%>)
Top lines: compute <€> · data <€> · storage <€> · observability <€> · AI <€> · egress <€>
Untagged/unattributed: <%>
Identified waste: <€>/month across <n> items
Cut list: see the table above — reversible actions total <€>/month
Guardrails: budget alerts ✓ · PR cost estimates ✓ · schedules ✓ · retention policies ✓
```

## Rules
- Attribute before optimizing; an untagged estate can only be cut blindly.
- Report unit cost alongside total cost — growth is not the same as waste.
- State the risk and the reversibility of every proposed cut; never trade reliability for cost silently.
- Right-size before committing; commitments freeze whatever you had.
- Never delete data, snapshots or logs to save money without confirming retention obligations (`/rgpd`) and the restore path (`/db`).
- Verify each saving after it lands — a claimed saving that doesn't show up on the next bill wasn't real.
