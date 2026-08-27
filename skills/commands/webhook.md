---
description: Build or harden inbound webhooks — signature verification, idempotency, replay, ordering, retries, observability
argument-hint: "<vendor or endpoint> [--audit] [--vendor stripe|github|gitlab|...]"
---

# /webhook — Inbound Webhook Integration

## Usage
```
/webhook stripe                 — build the Stripe webhook receiver
/webhook --audit                — audit the webhook endpoints that already exist
/webhook github push events     — a specific vendor + event set
```

## Overview
A webhook endpoint is a public, unauthenticated-by-default POST route that a third party hammers with retries. It is the most commonly under-built surface in a codebase: no signature check, no idempotency, no ordering guarantee, business logic inline, and a timeout that makes the vendor retry the same event forever.

This skill builds (or fixes) the receiver so it's safe, idempotent, and observable.

Field notes: `.claude/references/distributed.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Read the vendor's delivery contract

From the vendor docs, record:

| Question | Consequence |
|---|---|
| **Signature scheme** | HMAC-SHA256 over raw body + timestamp (Stripe/GitHub style)? Public-key signature? A shared secret in a header? |
| **Signed payload construction** | Exactly which bytes are signed — raw body, timestamp-prefixed, sorted headers. Getting this wrong = every event rejected |
| **Timestamp tolerance** | The replay window the vendor recommends (typically 5 minutes) |
| **Retry policy** | How many times, over how long, on which status codes — this sets your idempotency requirement |
| **Delivery guarantees** | At-least-once (assume yes), ordering (assume none), duplicates (assume yes) |
| **Event envelope** | Event id, type, created-at, versioning, whether the payload is complete or a pointer to fetch |
| **IP allowlist** | Published ranges, if any |
| **Timeout** | How fast you must respond (usually a few seconds) before the vendor calls it a failure |

## Phase 2: Build the receiver

The endpoint does five things and nothing else:

1. **Read the raw body** — before any JSON parsing or body-mutating middleware. Signature verification runs on bytes, not on a re-serialized object. In Express: `express.raw({type:'application/json'})` on this route only; in Next.js App Router: `await req.text()`; in Django/Rails: the raw body accessor. **This is the #1 cause of "signature always invalid".**
2. **Verify the signature** — with a constant-time comparison (`crypto.timingSafeEqual`, `hmac.compare_digest`). Reject with 401 on mismatch. Verify the timestamp is inside the tolerance window to block replays. The secret comes from the environment, per environment.
3. **Persist and deduplicate atomically** — in **one transaction**: insert the vendor's event id plus the raw payload into a table with a **unique constraint** on that id, status `pending`. A duplicate-key violation means the event is already stored: return 200 immediately. Never dedupe with a check-then-insert; let the constraint decide.
4. **Hand it to the worker without losing it** — the ordering here is the whole game. Committing the dedupe row and *then* enqueueing means a crash or a broker failure in between turns every vendor retry into an instant 200 while nothing ever processes the event: silent data loss, and the vendor has stopped retrying. Pick one of:
   - **Transactional outbox (default)**: the enqueue is a row written in the *same* transaction as the event; a relay/poller ships outbox rows to the queue and retries until they land. Nothing is committed that isn't scheduled.
   - **Queue first, then commit**: enqueue inside the transaction and commit only on a successful enqueue — safe only if the worker tolerates an event it can't find yet (retry on miss).
   - **Commit `pending`, enqueue, then mark `queued`** — with a **sweeper** that re-enqueues rows still `pending` after N minutes. The sweeper is what makes this option correct; without it, it is the bug above.
   In every case: if the event could not be durably stored **and** scheduled, return 5xx so the vendor retries. The handler still answers in milliseconds — processing stays in the worker, because doing it inline turns the vendor's retry policy into your outage amplifier.
5. **Return the right status** — 2xx for "received" (even for event types you ignore); 401 for bad signature; 4xx for permanently malformed payloads (retrying won't help); 5xx only for genuine transient failures you want retried.

## Phase 3: Process safely (the worker)

- **Idempotent handlers**: processing the same event twice must be harmless. Guard state transitions with the state itself (`WHERE status = 'pending'`), not with a prior read.
- **Out-of-order events**: never assume `created` arrives before `updated`. Compare the vendor's timestamp/version against your stored state and drop stale updates.
- **Payload is untrusted input**: validate its shape at the boundary; an unknown event type or enum value is logged and skipped, never a crash.
- **Don't trust the payload's data**: for anything security- or money-relevant, re-fetch the object from the vendor's API by id — the webhook tells you *what changed*, the API tells you *what it is*.
- **Failure path**: retries with backoff, a dead-letter store after N attempts, and an alert. A silently dropped event is a data-loss bug.
- **Ignore unknown types explicitly** — a log line, not an exception.

## Phase 4: Test

- Unit: valid signature accepted; tampered body rejected; expired timestamp rejected; duplicate event id short-circuits; unknown event type ignored; out-of-order update dropped.
- **The loss window**: make the enqueue fail after the event row is written, then assert either that the transaction rolled back (vendor retries and succeeds) or that the sweeper/outbox picks the event up. This is the test that proves the ordering above.
- Use the vendor's fixtures/CLI where one exists (`stripe trigger`, GitHub's redelivery, a signed-payload generator) — never paste a live production event into a test.
- Local delivery: the vendor CLI's forwarding, or a tunnel — document the exact command in the integration doc.
- Load: confirm the endpoint returns within the vendor's timeout under a burst.

## Phase 5 (`--audit`): Audit existing endpoints

Grep for webhook routes (`/webhook`, `/hooks`, `/callback`, vendor names) and check each against this table:

| # | Endpoint | Signature | Raw body | Replay window | Dedupe | Async | Ignores unknown | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | POST /api/webhooks/stripe | ✗ none | n/a | ✗ | ✗ | inline | crashes | 🔴 |

Also check the **store-then-enqueue ordering**: a dedupe row committed before the enqueue, with no outbox and no sweeper, is 🔴 — the next vendor retry short-circuits to 200 and the event is gone.

🔴 for: no signature verification, signature over a re-serialized body, non-constant-time comparison, no dedupe on a state-changing handler, secrets in code, or processing inline with a slow handler.

## Phase 6: Report

```
## Webhook: <vendor>

Endpoint: <method path>   Secret: <ENV_VAR name>
Signature: <scheme> · constant-time ✓ · replay window <n>m ✓
Dedupe: unique(<event_id>) ✓   Storage: <table>
Store→enqueue: <outbox | enqueue-in-transaction | pending+sweeper> ✓ (loss window tested ✓)
Processing: async via <queue> · retries <n> · DLQ <where>
Idempotency: state-guarded transitions ✓   Ordering: timestamp-guarded ✓
Unknown types: logged & ignored ✓
Tests: <n>   Local delivery: <command>
Observability: <what is logged/alerted>
```

## Rules
- Never process an unverified payload — signature first, always, on raw bytes.
- Never compare signatures with `==`; always constant-time.
- Never trust webhook payload data for money or permissions; re-fetch by id.
- Never do the work inline if it can exceed the vendor's timeout.
- Never return 2xx for an event you failed to persist **or failed to schedule** — either one silently drops it, and the vendor stops retrying.
- Secrets live in the environment, differ per environment, and never appear in logs or reports.
