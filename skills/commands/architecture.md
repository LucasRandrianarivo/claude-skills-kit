---
description: System design — boundaries, data ownership, sync vs async, failure behavior, and the decisions that are hard to reverse
argument-hint: "<system or change> [--review] [--adr] [--diagram]"
---

# /architecture — System Design

## Usage
```
/architecture <what you're building>   — design it
/architecture --review                 — review the current architecture as it really is
/architecture --adr                    — turn the decisions into ADRs
/architecture --diagram                — produce the diagram, from the code
```
Field notes: `.claude/references/architecture.md`.

## Overview
Architecture is the set of decisions that are **expensive to reverse**. The job isn't to design the best system — it's to identify the one-way doors, make those deliberately, and keep everything else cheap to change.

Complements `/spec` (what to build) and `/plan-eng-review` (is the plan feasible). This is where the boundaries, the data ownership and the failure behavior get decided.

---

## Phase 1: Constraints before design

Design without these is fiction. Write them down, and mark each as measured or assumed:
```
Load:        <requests/s, peak vs average, growth over 12 months>
Data:        <volume, growth, retention, what's personal (/rgpd)>
Latency:     <what the user must feel fast, and the budget for it>
Availability:<what breaks if this is down for an hour; the real target, with its cost>
Consistency: <what must be correct immediately; what can be eventually consistent>
Team:        <how many people, what they know, who operates it at 3am>
Constraints: <budget, existing systems, compliance, deadlines>
```
The team line is not filler: an architecture nobody on the team can operate is a bad architecture, whatever the diagram looks like.

## Phase 2: Boundaries and data ownership

1. Decompose by **business capability**, never by technical layer.
2. For each component: **what data does it own** (single writer), what it reads from others, and how it gets it (call, event, copy).
3. Test each boundary: *can this component change its data model without coordinating with anyone?* If not, it isn't a boundary — merge it or fix the coupling.
4. Name the coupling you're accepting — temporal, data, deployment, semantic (`references/architecture.md`) — because each one has a known cost, and unnamed coupling is the cost you pay by surprise.

**Modular monolith is the default** below roughly 30 engineers: modules with explicit interfaces and no cross-module table access. Extract a service when a specific, observed pressure demands it (different scaling profile, deploy contention between teams, a compliance boundary) — never because the diagram looks better. A shared database between services is a distributed monolith with extra latency.

## Phase 3: Sync vs async, per interaction

Synchronous when the caller needs the result to answer the user, and the call is fast and safe to retry. Asynchronous for everything slow, retry-prone, or third-party — with the outbox pattern so state changes and messages can't disagree (`references/distributed.md`).

Async is a **product** decision too: the user's action succeeds before the work does. Design what they see meanwhile, and what happens when it fails an hour later. A queue without that visible state machine just moves the failure somewhere the user can't see.

## Phase 4: Failure behavior — the section that gets skipped

For **every** dependency, write the row:

| Dependency | Timeout | Retry | Circuit breaker | Degraded behavior |
|---|---|---|---|---|
| Payment provider | 10s | 3, jitter, idempotency key | yes | queue and inform; never double-charge |
| Recommendations | 200ms | none | yes | hide the section |

"The site is down because the recommendation service is down" is a design defect. The critical path uses only what it must; everything else is optional, cached, or asynchronous. Add bulkheads (separate pools for critical and non-critical work) so a slow third party can't consume every worker, and give the caller a timeout budget larger than the sum of its callees'.

## Phase 5: The one-way doors

List them explicitly, because these are the only decisions worth slowing down for: the data model and its ownership, the public API shape (`/api-design`), a vendor with proprietary identifiers or no export, the language/runtime, the tenancy model (shared schema vs schema-per-tenant vs database-per-tenant — nearly impossible to change later), and anything that touches personal data retention.

For each: the options considered, the decision, why, what it costs to leave, and what would make you revisit it. That's an ADR (`/adr`), and it's the document that stops the same argument from recurring every six months.

## Phase 6: Review an existing system (`--review`)

Derive the architecture from the **code**, not from the wiki: imports across module boundaries, network calls, shared tables, shared queues. Then compare it to the diagram people believe in — the gap between the two is the finding.

```
## Architecture Review — <system>
Real boundaries (from code): <list>   Claimed boundaries: <list>   Gap: <what>
| # | Severity | Finding | Consequence | Fix |
| 1 | 🔴 | services A and B write the same table | neither can change its schema; a deploy of A breaks B | one owner + an API or event |
| 2 | 🟡 | no timeout on the search call | a slow search takes the product page down | timeout + degraded mode |

One-way doors taken without an ADR: <list — write them now>
Failure table: <n>/<n> dependencies have a defined degraded behavior
```

## Phase 7: Document it so it survives

A diagram whose arrows don't say *what flows and who owns it* is decoration. Produce: the boundary map with data ownership, the sync/async choices with reasons, the failure table, and the ADRs for the one-way doors. Then verify the diagram against the code (`/diagram` can generate it from what's actually there).

## Rules
- Every component has exactly one owner per fact; two writers to the same data is the finding, not a detail.
- Every dependency has a timeout, a retry policy, and a written degraded behavior.
- Boundaries are validated by the "can it change alone?" test, not by the diagram.
- One-way doors get an ADR with the rejected options; everything else stays cheap to change.
- Design for current traffic ×10, not ×1000 — and say so, rather than quietly building for a scale that won't arrive.
- Review the architecture from the code; a diagram is a claim until it is checked.
