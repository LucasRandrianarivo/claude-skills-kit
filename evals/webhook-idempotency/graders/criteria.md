# Criteria — a webhook that cannot lose or double-apply an event

## Must do
- **Verify the signature against the raw body** (no JSON body-parser before verification), and reject on failure.
- **Deduplicate by the provider's event id with a unique constraint**, not with a select-then-insert check.
- Get the **store-then-schedule ordering right**: persisting the dedupe row and committing *before* the work is scheduled loses events, because the vendor's later retries short-circuit to 200. Accept a transactional outbox, an enqueue inside the same transaction, or a `pending` row plus a sweeper — and reject the naive commit-then-enqueue.
- **Return 5xx when the event could not be durably stored or scheduled**, so the vendor retries.
- Guard the state transition (`UPDATE ... WHERE status = 'pending'`) or otherwise make provisioning idempotent, so a duplicate delivery cannot grant access twice.
- Respond fast and do the work asynchronously, not inline in the request.

## Should do
- Re-fetch the object from Stripe by id rather than trusting the payload's amounts.
- Note that events can arrive out of order, and handle or detect stale ones.
- Keep the webhook secret in configuration, never in code.

## Must not do
- Return 200 for an event it failed to persist or schedule.
- Process the payment inline and rely on the vendor's retry as the error handling.
- Trust `req.body` after a JSON parser for signature verification.

## Scoring
1.0 — signature on raw body, unique-constraint dedupe, correct store/schedule ordering with 5xx on failure, guarded transition.
0.5 — signature and dedupe present, but the ordering or the failure response is wrong.
0.0 — no signature verification, or inline processing with no dedupe.
