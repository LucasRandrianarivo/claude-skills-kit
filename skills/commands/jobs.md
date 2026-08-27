---
description: Background jobs & queues — idempotency, retries, DLQ, scheduling, backpressure, poison messages, observability
argument-hint: "[--build <job>] [--audit] [--schedule] [--dlq]"
---

# /jobs — Background Jobs & Queues

## Usage
```
/jobs --build send-invoice     — implement a job correctly
/jobs --audit                  — audit existing jobs and workers
/jobs --schedule               — cron/scheduled jobs: locking, drift, timezones
/jobs --dlq                    — dead-letter handling and replay
```
Field notes: `.claude/references/distributed.md`.

## Overview
A background job is a distributed system with one worker. Everything from `references/distributed.md` applies: **at-least-once delivery, no ordering, and unknown outcomes**. The failures are always the same — the job runs twice and sends two emails, it fails forever and blocks the queue, or the enqueue was lost because it happened outside the transaction.

---

## Phase 1: Detect and classify

1. Runner in use: BullMQ/Sidekiq/Celery/RQ/Que/Oban/Temporal/SQS+Lambda/pg-boss/cron. Note whether the broker persists (Redis without AOF loses jobs).
2. Classify each job — the class decides the guarantees it needs:

| Class | Example | Requirement |
|---|---|---|
| **At-least-once, idempotent** | Recompute a projection, sync a cache | Just retry |
| **Side-effecting** | Send an email, charge a card, call a vendor | Idempotency key + dedupe record |
| **Ordered** | Apply a sequence of state changes | Partition by entity id, or version-guard |
| **Scheduled** | Nightly report, expiry sweep | Distributed lock + catch-up policy |
| **Long-running** | Export, import, migration | Chunked, resumable, progress-reporting |

## Phase 2: Enqueue correctly

- **Never enqueue outside the transaction that created the state.** The job starts, reads the row, and it isn't there yet — or the transaction rolls back and the job runs anyway. Use the **transactional outbox**, or enqueue after commit *with* a reconciliation sweeper.
- Pass **identifiers, not payloads**. A job carrying a serialized object works until the shape changes and old messages are in flight. Pass the id; load fresh.
- Payloads must be forward/backward compatible for the duration of a deploy: old workers will receive new messages and vice versa.
- Never put secrets or personal data in a payload that persists in the broker.

## Phase 3: Execute safely

1. **Idempotent by construction**: guard on state (`UPDATE … WHERE status='pending'`), or record a unique `(job_type, entity_id, operation)` before the side effect.
2. **Timeout every external call**, and set the job's own timeout below the visibility/lease timeout — otherwise a second worker picks it up while the first is still running.
3. **Retries**: exponential backoff with jitter, a bounded count, and a distinction between retryable (network, 5xx, lock timeout) and terminal (validation, 404, business rule) failures. A terminal failure retried 25 times is noise that hides the real ones.
4. **Chunk long work** and make it resumable: process in batches, commit progress, and design so a restart continues rather than restarts.
5. **Never hold a database transaction across an external call** — that's how a slow vendor exhausts the connection pool.
6. Concurrency limits per job type, and per tenant where one customer's volume can starve the rest.

## Phase 4: Failures — DLQ and poison messages (`--dlq`)

- After N attempts, move to a dead-letter queue **with the failure reason and the full context**, and alert. A DLQ nobody looks at is a data-loss log.
- Provide a replay path: fix the cause, then re-enqueue from the DLQ — idempotency is what makes replay safe.
- A poison message (fails deterministically, blocks a partition) must be moved aside, not retried forever. Ordered queues need this explicitly, or one bad message stops the entity's entire stream.
- Distinguish **failed** (retryable, in progress) from **abandoned** (terminal) in your own records, so a human can see what actually didn't happen.

## Phase 5: Scheduled jobs (`--schedule`)

- **Distributed lock** or a single-scheduler design: multiple instances of the app means multiple triggers of the same cron. This is the most common scheduled-job bug.
- **Timezone and DST**: a job at 02:30 runs twice or not at all on DST days. Schedule in UTC and convert for business meaning; state the intent (`"09:00 Paris time"`) in the code.
- **Catch-up policy**: if the scheduler was down for 3 hours, does the job run once, run for each missed slot, or skip? Decide it explicitly.
- **Overlap**: what if the previous run is still going? Skip, queue, or cancel — never "hope it's fast".
- Alert on **absence**: a cron that stopped running is silent by nature. Record last-success and alert when it ages past the interval (`/observability`).

## Phase 6: Observability & the audit

Every job records: id, type, entity, attempt number, duration, outcome, and correlation id from the request that enqueued it. Metrics: **queue depth, age of the oldest message, processing rate, failure rate, DLQ size**. Depth alone lies — a queue at depth 100 draining in 2 seconds is fine; at depth 5 with a 40-minute-old head, something is stuck.

```
## Jobs Audit

Runner: <x>   Queues: <list>   Workers: <n>   Broker persistence: <yes/no>
| # | Severity | Job | Issue | Consequence | Fix |
|---|----------|-----|-------|-------------|-----|
| 1 | 🔴 | send-invoice | enqueued before commit, no outbox | invoices never sent when the tx rolls back | outbox table + relay |

Idempotent: <n>/<n> side-effecting jobs · DLQ: ✓ with alert · Scheduled: locked ✓ · Oldest-message alert: ✓
```

## Rules
- Assume every job runs at least twice; make that harmless before shipping it.
- Enqueue inside the transaction (outbox) or reconcile — never "enqueue and hope".
- Pass ids, never serialized domain objects.
- Every retry policy distinguishes retryable from terminal; unbounded retries are forbidden.
- A DLQ without an alert and a replay path is not error handling.
- Scheduled jobs are locked, timezone-explicit, and alerted on absence.
