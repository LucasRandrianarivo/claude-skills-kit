---
description: Transactional email & push — deliverability (SPF/DKIM/DMARC), templates, preferences, retries, and not becoming spam
argument-hint: "[--email] [--push] [--audit] [--deliverability]"
---

# /notifications — Email & Push

## Usage
```
/notifications --email <type>     — build a transactional email (verify, reset, receipt…)
/notifications --push             — build push notifications (web/mobile)
/notifications --audit            — audit the existing notification stack
/notifications --deliverability   — DNS/auth/reputation check for email
```

## Overview
The password-reset email that lands in spam is a broken login flow. The push notification sent at 3am is an uninstall. Notifications look trivial and fail in ways nobody watches: unauthenticated domains, no bounce handling, no preferences, no retry, and no way to know whether anything arrived.

---

## Phase 1: Deliverability first (`--deliverability`)

If the domain isn't authenticated, nothing else matters — the best email in the world goes to spam.

| Record | What it does | Check |
|---|---|---|
| **SPF** | Lists who may send for the domain | One TXT record, ≤10 DNS lookups, ends `~all` or `-all` |
| **DKIM** | Cryptographically signs the message | Provider's key published; signature aligned with the From domain |
| **DMARC** | Tells receivers what to do on failure, and reports | Start `p=none` with `rua=` reporting, then move to `quarantine`/`reject` |
| **Dedicated sending domain** | `mail.example.com` or a subdomain | Never send transactional mail from a shared/free domain |
| **Reverse DNS / MX** | Sanity | Set by the provider |

Rules that keep you out of the spam folder: **separate transactional and marketing streams** (different subdomains, ideally different providers) so a campaign's complaints can't kill your password resets; warm up a new domain gradually; keep complaint rate < 0.1% and bounce rate < 2%; never send to a purchased or scraped list.

## Phase 2: Sending

- Use a provider (Postmark/SES/SendGrid/Resend/Mailgun) — self-hosted SMTP for transactional mail is a reputation project, not a feature.
- **Send asynchronously**, from a job/queue: a request handler that waits on an email provider fails the request when the provider is slow. Retries with backoff, a dead-letter queue, and an alert when the queue grows (`/observability`).
- **Idempotency**: one email per event, keyed on the event id — a retried job must not send a second receipt.
- Every send is recorded: recipient, template, event id, provider message id, status. Without the message id you cannot answer "did they get it?".
- Consume the provider's **webhooks** (delivered, bounced, complained, opened) through `/webhook`: hard bounces suppress the address permanently, complaints unsubscribe immediately. An app that keeps mailing bounced addresses loses its domain reputation.

## Phase 3: Content that works

- **Plain-text alternative** for every HTML email — some clients and most spam filters want it.
- Table-based, inline-CSS HTML with a ~600px width; test in the clients your users actually use. Dark mode inverts backgrounds — check it.
- A real `From` name and a **monitored** `Reply-To`; `no-reply@` is a last resort, never for a conversation-shaped email.
- Subject and preheader carry the meaning; the email is readable with images blocked.
- One clear action per email; the link works without JavaScript and doesn't expire faster than the user reads (`/auth` sets the token rules).
- **Localized** per the recipient's locale (`/i18n`), including dates and currency — the notification surface is where localization is usually forgotten.
- Legal footer where required, and a working unsubscribe for anything non-transactional. Never put marketing content in a transactional email — it re-classifies the whole stream.

## Phase 4: Push

- **Ask permission in context**, after the user has a reason to say yes — a permission prompt on first launch is a permanent no (`/mobile`).
- Deep link to the exact screen; a notification that opens the home screen wastes the interruption.
- Respect quiet hours and the user's timezone; batch instead of firing per event; collapse/replace keys so 12 updates don't produce 12 notifications.
- Handle token lifecycle: register, refresh, and **delete on logout or uninstall** (the provider tells you when a token is invalid — remove it or you'll be sending to nothing forever).
- Payloads carry no sensitive content: notifications appear on lock screens.
- Web push additionally: VAPID keys stored as secrets, graceful handling of denied permission, and a fallback for browsers that don't support it.

## Phase 5: Preferences & the audit

- One preference center: per-category opt-in/out, honored **server-side at send time**, with transactional messages (security, receipts, legal) explicitly exempt and labelled as such.
- Preferences and consent are personal data (`/rgpd`): retention, export and deletion apply.

```
## Notifications Audit

Email provider: <x>   SPF ✓ DKIM ✓ DMARC <p=none>   Streams separated: ✓/✗
Async send ✓ · retries <n> · DLQ ✓ · bounce/complaint webhooks ✓ · suppression list ✓
Templates: <n> · plain-text alternative <n>/<n> · localized <n>/<n>
Push: permission in context ✓ · deep links ✓ · token cleanup ✓ · quiet hours ✓
Preferences: <categories> honored server-side ✓
Observability: delivery rate <%> · bounce <%> · complaint <%> · alerting on drops ✓/✗

| # | Severity | Issue | Effect | Fix |
|---|----------|-------|--------|-----|
| 1 | 🔴 | no DMARC, resets sent from the marketing subdomain | password resets land in spam | authenticate + split streams |
```

## Rules
- Never send from an unauthenticated domain, and never mix marketing with transactional streams.
- Never send synchronously from a request handler.
- Never mail an address that hard-bounced or complained — suppression is permanent.
- Every notification is idempotent per event; a retry never duplicates a receipt.
- Never put sensitive content in a push payload or an email subject.
- Test against real inboxes and a real device before declaring it done; a rendered preview is not a delivery test.
