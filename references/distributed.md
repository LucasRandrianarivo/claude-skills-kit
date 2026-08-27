# Field notes — Distributed behavior (retries, delivery, ordering, consistency)

Consulted by `/integrate`, `/webhook`, `/payments`, `/jobs`, `/fullstack`, `specialist-integration`.

---

## The three laws you keep rediscovering

1. **Every network call has three outcomes, not two**: success, failure, and *unknown*. The unknown one (timeout after the request was processed) is where double charges, duplicate emails and lost orders come from.
2. **At-least-once is what you get; exactly-once is what you build.** Queues, webhooks and retries all deliver more than once. Exactly-once *processing* is achievable — with idempotency keys and unique constraints — exactly-once *delivery* is not.
3. **Order is not guaranteed** unless something enforces it. Two events sent in order can arrive reversed, and the "updated" webhook can land before the "created" one.

Design every remote interaction as if all three are true, because they are.

## Retries — the rules

| Situation | Retry? |
|---|---|
| Connection refused / reset, DNS failure | Yes |
| Timeout on a **read** (GET) | Yes |
| Timeout on a **write** with an idempotency key | Yes |
| Timeout on a write **without** an idempotency key | **No** — resolve by querying, or fail loudly |
| 429 | Yes, honoring `Retry-After` |
| 500 / 502 / 503 / 504 | Yes, with backoff |
| 400 / 401 / 403 / 404 / 422 | No — retrying a validation error is just load |

Always: exponential backoff **with jitter** (synchronized retries are how a recovering service is knocked over again — the thundering herd), a bounded attempt count, and a bounded total time. Every call has a timeout: connect and total. A missing timeout is not "no limit", it's "the OS default", which is minutes — long enough to exhaust the worker pool.

**Circuit breaker**: after N consecutive failures, stop calling for a window and fail fast. Without it, a dependency's outage becomes your outage as every request queues behind a dying call.

## Idempotency — how to actually get it

- Derive the key from **your own** identifier (order id + operation), not from a random UUID generated at call time — a retry must produce the *same* key.
- Server side: store the key with the result; a repeat returns the stored result rather than re-executing.
- In your own database: a unique constraint is the idempotency mechanism. `INSERT … ON CONFLICT DO NOTHING` then check what happened, rather than "select, then insert if absent".
- State transitions guard themselves: `UPDATE … SET status='paid' WHERE id=? AND status='pending'` — zero rows updated means someone else already did it, which is the correct outcome, not an error.

## Delivery patterns

**Transactional outbox** — the standard fix for "the database committed but the message never sent". Write the message into an `outbox` table **in the same transaction** as the state change; a relay publishes it and marks it sent, retrying forever. Nothing is committed that isn't scheduled, and nothing is published that didn't commit.

**Inbox / dedupe table** — on the consuming side, record the message id with a unique constraint before processing; duplicates short-circuit.

**Saga / compensation** — when a workflow spans services and cannot be one transaction, each step has an explicit compensating action, and the workflow state is persisted at every step. "We'll roll back if something fails" without persisted state is a wish.

**Two-phase commit across services**: essentially never the answer in an application; the operational cost exceeds the benefit. Prefer outbox + idempotent consumers.

## Ordering

- Guarantee it with a **partition key** (same key → same partition/queue → sequential processing), not by hoping.
- Otherwise, make handlers **order-independent**: compare the event's version/timestamp against stored state and drop the stale one. This is usually cheaper than enforcing global ordering.
- Never rely on wall-clock timestamps from different machines to order anything: clocks drift, NTP steps, and a "future" timestamp is normal. Use a monotonic sequence, a version column, or the provider's own event ordering.

## Backpressure and queues

- An unbounded queue is a memory leak with a schedule. Bound it, and decide what happens when it's full: block, shed, or spill.
- Consumer slower than producer is a design fact to measure, not a bug to discover in production. Watch **queue depth and age of the oldest message** — depth alone hides a slow drain.
- Poison messages need a retry cap and a dead-letter queue with an alert. A message retrying forever occupies the worker and hides everything behind it.
- Visibility timeout / lease must exceed the worst-case processing time, or two workers will process the same message — which is fine if you're idempotent, and a disaster if you're not.

## Caching in a distributed system

- **Stampede**: a hot key expires and 500 requests recompute it at once. Fix with a lock/single-flight, or by refreshing before expiry (stale-while-revalidate).
- Cache invalidation on write is a two-system consistency problem — prefer short TTLs plus explicit invalidation, and accept the staleness window explicitly rather than pretending it's zero.
- Never cache an authenticated response in a shared cache without a per-user key. This is the single highest-severity caching bug: one user's data served to another.

## Failure modes worth designing for

| Failure | Design response |
|---|---|
| Dependency slow (not down) | Timeout + circuit breaker; slow is worse than down because it consumes your capacity |
| Partial write (2 of 3 systems updated) | Outbox, or a reconciliation job that detects and repairs drift |
| Duplicate processing | Idempotency (assume it will happen) |
| Retry storm after an outage | Jitter + capped concurrency on recovery |
| Clock skew | Never compare timestamps across machines for correctness |
| Cache down | Serve from source degraded, don't fail the request |

## Where this gets decided wrong

- Treating a queue as a guarantee of exactly-once and skipping the dedupe table.
- Adding retries without idempotency — turning a transient failure into duplicate money movement.
- Building a saga where a single transaction in one database would have done.
- Monitoring throughput but not queue age, so a stalled consumer is invisible until customers complain.
