---
description: Payments & billing — checkout, subscriptions, webhooks as the source of truth, idempotency, refunds, reconciliation
argument-hint: "[--build <flow>] [--audit] [--subscriptions] [--reconcile]"
---

# /payments — Payments & Billing

## Usage
```
/payments --build checkout       — implement a payment flow
/payments --subscriptions        — subscription lifecycle (trial, upgrade, dunning, cancel)
/payments --audit                — audit an existing payment integration
/payments --reconcile            — reconcile your records against the provider's
```

## Overview
Payment bugs are the only bugs that take money from real people. The three that cause the most damage are always the same: **charging twice** (a retry without an idempotency key), **granting access without payment** (trusting the client's success redirect), and **losing state** (a webhook dropped, so a paid customer stays locked out).

The rule that prevents all three: **the provider's webhook is the source of truth, never the browser redirect.** The user's session can close, their network can drop, their tab can be killed at exactly the wrong moment — the webhook still arrives.

Builds on `/integrate` (client, retries, secrets) and `/webhook` (signature, dedupe, ordering); this skill adds the money-specific correctness.

Field notes: `.claude/references/distributed.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Establish the model

1. Provider and mode: Stripe/Adyen/Mollie/PayPal/Braintree · hosted checkout vs embedded elements vs full API.
2. **Never touch raw card data** unless the project genuinely has PCI DSS scope — hosted fields or a hosted page keep you in SAQ-A. If a request asks you to accept raw PAN, say clearly what that entails before building it.
3. Money representation: **integer minor units + currency code**, everywhere, on the wire and in the database. Never a float, never an amount without its currency.
4. What you sell: one-off · subscription · usage-based · marketplace split. Each has a different state machine — write it down before coding.
5. Tax, invoicing and legal obligations: VAT/sales tax computed where? Invoice numbering sequential and immutable? Refund and cancellation policy? These are constraints, not features to add later.

## Phase 2: The payment state machine

Model it explicitly; every transition is guarded in the database:

```
pending ─▶ processing ─▶ succeeded ─▶ [refunded | partially_refunded | disputed]
   │            │
   └────────────┴─▶ failed ─▶ (retry → processing)
```

Rules:
- Transitions are `UPDATE ... WHERE status = <expected>` — never read-then-write. Two webhooks arriving at once must not both grant access.
- **Provisioning is idempotent and tied to the payment id**: granting a subscription twice for one payment must be impossible (unique constraint on `payment_id`).
- Terminal states are terminal: a `succeeded` payment never silently returns to `pending` because a late webhook arrived out of order — compare the provider's event timestamp/version.

## Phase 3: The flow, done correctly

1. **Create the intent server-side**, with the amount computed **on the server** from the cart/plan — never from a client-supplied price. Client-supplied amounts are how you sell a €900 item for €9.
2. **Idempotency key** on every create/charge/refund call, derived from your own order id — so a retry (network blip, worker restart, user double-click) can never produce a second charge.
3. **Client confirms** via the provider's SDK/hosted page (SCA/3DS handled by the provider, not by you).
4. **The redirect is UI only**: it shows a spinner or an optimistic "thank you", and the page polls your API for the *authoritative* state. It never grants anything.
5. **The webhook grants**: on `payment_succeeded`, verify the signature, dedupe by event id, **re-fetch the object from the provider by id** (never trust the payload's amounts), check the amount and currency match the order, then transition the state machine and provision — all idempotently.
6. **Failure paths are designed**: card declined (with the provider's reason mapped to a human message), 3DS abandoned, insufficient funds, expired card, network timeout with unknown outcome → resolve by querying the provider, never by assuming.
7. **Never store** PAN, CVV, or full card data. Store the provider's token/customer id, brand, last4, expiry.

## Phase 4 (`--subscriptions`): Lifecycle

Everything above, plus the states that only exist over time:

| Event | What must happen |
|---|---|
| Trial start/end | Access granted without payment; converts or downgrades exactly once |
| Renewal succeeded | Period extended; invoice stored |
| **Renewal failed (dunning)** | Retry schedule, customer notified, access rules during grace, final downgrade — the most-skipped flow, and where revenue quietly leaks |
| Upgrade / downgrade | Proration computed by the provider; effective date explicit; entitlements change at the right moment |
| Cancellation | At period end vs immediate; access until when; data retention after (`/rgpd`) |
| Payment method expiring | Proactive notification before it fails |
| Refund / chargeback | Access revoked or not — decide deliberately, and handle the dispute deadline |

Entitlements are derived from subscription state in **one** place, checked server-side on every protected action (`/auth`). Never scatter `if (user.plan === 'pro')` across the codebase.

## Phase 5: Testing money

- Provider **sandbox** with their test cards: success, decline, insufficient funds, 3DS required, 3DS failed, expired.
- **Webhook replay**: send the same event twice, out of order, and after a delay — assert exactly one provisioning.
- **The double-click test**: fire the create call twice concurrently; assert one charge (this is what the idempotency key is for, and it's the test people skip).
- **Amount tampering**: submit a modified price from the client; assert the server rejects it.
- Refunds, partial refunds, and the resulting entitlement change.
- Never point tests at live keys; a test-mode key is enforced by config (`/env`), not by discipline.

## Phase 6 (`--reconcile`): Prove the books match

Once a payment integration is live, drift is guaranteed unless it's checked. A recurring job (or a manual run) that compares, over a window: provider-succeeded payments vs your `succeeded` records, amounts and currencies, refunds, and subscription statuses. Report every mismatch with its id — a customer charged without access, or with access without a charge, is a real person either way.

## Report

```
## Payments — <provider>

Mode: <hosted checkout>   Money: integer minor units + currency ✓
Truth: webhook ✓ (redirect is UI-only ✓)   Idempotency: <key strategy> ✓
State machine: guarded transitions ✓   Provisioning unique per payment ✓
Amounts: server-computed ✓   Re-fetched from provider in the webhook ✓
Failure paths: declined ✓ 3DS abandoned ✓ dunning ✓ unknown-outcome resolution ✓
Tests: <n> (double-charge ✓ replay ✓ tampering ✓)   Reconciliation: <cadence>
PCI: <SAQ-A — no card data touched>
```

## Rules
- The webhook is the source of truth; the browser redirect grants nothing, ever.
- Every create/charge/refund carries an idempotency key derived from your own id.
- Amounts and currency are computed and verified server-side, and re-checked against the provider before provisioning.
- Integer minor units, always. A float in a money path is a 🔴 finding.
- Never store raw card data; never log payloads containing payment credentials.
- Never test against live keys, and never "quickly try" a charge in production.
- When money and access disagree, stop and surface it — never auto-correct a customer's balance without a human decision.
