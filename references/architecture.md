# Field notes — System architecture

Consulted by `/architecture`, `/adr`, `code-architect`, `/plan-eng-review`, `/fullstack`.

---

## The mental model

Architecture is the set of decisions that are **expensive to reverse**. Everything else is implementation. So the job is not to design the best system — it's to identify which decisions are one-way doors, make those deliberately, and keep the rest cheap to change.

Three questions decide most designs:
1. **Who owns each piece of data?** (One writer per fact, or you will have two truths.)
2. **What must be consistent *now*, and what can be eventually consistent?** (This decides sync vs async, and therefore the failure modes.)
3. **What happens when each dependency is slow or down?** (A design without an answer per dependency is a design that fails as a unit.)

## Coupling — the only real currency

| Kind | Cost |
|---|---|
| **Temporal** (A must be up when B runs) | Every dependency multiplies downtime. Async + queue removes it, at the price of eventual consistency |
| **Data** (two components read the same table) | The schema can never change safely. This is why "shared database between services" recreates a monolith with network latency |
| **Deployment** (must ship together) | If two things always deploy together, they are one thing — stop pretending otherwise |
| **Semantic** (both must agree what a "user" is) | The unavoidable one; make it explicit with a contract (`/contract`) |

The useful test for a boundary: **can this component's data model change without coordinating with anyone else?** If not, it isn't a boundary — it's a seam you drew on a diagram.

## Monolith vs services — the honest version

A modular monolith is the correct default for almost every team under ~30 engineers. It gives boundaries (modules with explicit interfaces, no cross-module table access) without distributed-systems tax. Services buy: independent deployment, independent scaling, and team autonomy — and cost: network failure modes, distributed transactions you now have to avoid, observability across processes, and an integration environment.

Split a service out when a **specific, observed** pressure demands it: a component with a wildly different scaling profile, a team blocked by another's deploy cadence, or a compliance boundary. Not because the diagram looks better. And when you split, split by **business capability with its own data**, never by technical layer (a "database service" is a distributed monolith).

## Sync vs async

Call synchronously when the caller needs the result to answer the user **and** the operation is fast and idempotent-safe. Everything else — email, invoicing, exports, third-party calls, anything slow or retry-prone — belongs in a job (`/jobs`) with an outbox (`references/distributed.md`).

The consequence people underestimate: async means the user's action succeeds before the work does. That's a **product** decision (what does the user see meanwhile? what if it fails an hour later?), not just a technical one. Design the visible state machine, not only the queue.

## State, caching and the truth

- One source of truth per fact. A cache, a search index, a read model and a data warehouse are all *derived*, and every one of them needs a rebuild path. If you can't rebuild it from the source, it's not derived — it's a second primary store, and it will drift.
- Idempotent, replayable derivation beats incremental patching: "rebuild the index from scratch" should be a routine command, not an emergency.
- Prefer a boring database until measurements say otherwise. Most "we need a queue/cache/search engine" moments are a missing index (`references/database.md`).

## Failure design

For each dependency, write the answer: timeout, retry policy, circuit breaker, and **degraded behavior**. "The site is down because the recommendation service is down" is a design defect, not bad luck. The pattern that prevents it: critical path uses only what it must; everything else is optional, cached, or asynchronous.

Bulkheads: separate pools/workers for critical and non-critical work, so a slow third party can't consume every worker. Timeouts everywhere, decreasing as you go deeper (a caller's budget must exceed the sum of its callees' or it will time out first and waste the work).

## Evolution over prediction

- Build for the traffic you have times ~10, not times 1000. The design that survives is the one you can change.
- Reversible decisions: make them fast, don't gate them on consensus. One-way doors (data model, public API shape, a vendor with proprietary identifiers, a language/runtime choice): slow down, write the ADR (`/adr`), list what you'd have to do to leave.
- The strangler-fig pattern is how large systems actually get replaced: route a slice at a time through the new implementation behind an interface, keep both live, delete the old when traffic is zero. Big-bang rewrites fail for the same reason every time — the old system's behavior was never fully known.

## Documenting it so it survives

A diagram of boxes with no arrows labeled with *what flows and who owns it* is decoration. What a future maintainer needs: the boundaries and their data ownership, the sync/async choices and why, the failure behavior per dependency, and the decisions that were considered and rejected (`/adr` — the rejected option is the part people forget and re-litigate).

## Where this gets decided wrong

- Microservices chosen for a team of five, then all deployed together anyway.
- A message queue introduced without an outbox, so events are lost whenever the database commit and the publish disagree.
- Sharing a database across services "temporarily".
- Designing for a scale that never arrives, while the actual bottleneck (one missing index, one N+1) sits untouched.
- Treating the architecture diagram as the truth instead of the code — verify the diagram against the imports and the network calls before trusting it.

## Where to check the current truth
Patterns are stable; the trade-offs are context-dependent, so read the current debate rather than a summary. Fetch and cite these before stating a version-specific fact — the `expertise` rule requires it:
- martinfowler.com — https://martinfowler.com (strangler fig, microservice trade-offs)
- Microservice patterns — https://microservices.io/patterns/
- ADR practice — https://adr.github.io
- AWS Builders' Library — https://aws.amazon.com/builders-library/
