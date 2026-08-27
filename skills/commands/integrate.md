---
description: Integrate any third-party API end-to-end — auth, typed client, retries, rate limits, secrets, tests, docs
argument-hint: "<api name or docs url> <what you need from it> [--sandbox] [--no-sdk]"
---

# /integrate — Third-Party API Integration

## Usage
```
/integrate stripe subscriptions and invoices
/integrate https://api.vendor.com/docs  pull orders nightly
/integrate --sandbox            — wire the sandbox/test environment only
/integrate --no-sdk             — raw HTTP client instead of the vendor SDK
```

## Overview
Every API integration fails the same way: it works in the demo, then dies in production on a 429, a 3-hour token expiry, a retry that double-charges, or a key committed to git. This skill builds the integration that survives those — for **any** REST/GraphQL/webhook API, vendor SDK or raw HTTP.

The output is not "a function that calls the API". It's a client with an auth strategy, a resilience policy, typed boundaries, secrets handled properly, and tests that don't hit the vendor.

---

## Phase 1: Read the API before writing anything

Fetch the actual documentation (`WebFetch`/`WebSearch`, or the OpenAPI/GraphQL schema if published — `/openapi.json`, `/.well-known/`, the vendor's spec repo). Record, in this order:

| Question | Why it changes the code |
|---|---|
| **Auth scheme** | API key header · Basic · Bearer/JWT · OAuth2 (which grant?) · HMAC-signed request · mTLS |
| **Token lifetime & refresh** | Short-lived tokens need a refresh path *and* concurrency-safe caching |
| **Base URLs** | Sandbox vs production, region-specific hosts |
| **Rate limits** | Requests/second, burst, per-key vs per-account, and the headers that expose remaining quota |
| **Pagination** | Cursor · page/offset · link header · `has_more` — and the max page size |
| **Error model** | Status codes, error envelope, retryable vs terminal, vendor-specific codes |
| **Idempotency** | Does it support an idempotency key? Without one, retries on writes are dangerous |
| **Webhooks** | Does it push? Signature scheme? (then also run `/webhook`) |
| **Versioning** | Header, path, or account-pinned version; deprecation policy |
| **SDK** | Official SDK: maintained? last release? does it cover what you need? |
| **Sandbox** | Test credentials, test data, and what sandbox does *not* simulate |
| **Terms** | Rate/scope limits, data-retention or PII constraints, attribution requirements |

Report this table before writing code. If the docs contradict the observed behavior later, the observation wins — and gets recorded.

## Phase 2: Decide the shape

Present the decision, briefly, then proceed:

- **SDK vs raw HTTP**: use the official SDK when it's actively maintained and covers the surface — retries, pagination and auth come free. Go raw when the SDK is stale, huge, or wraps two endpoints you need. `--no-sdk` forces raw.
- **Where it lives**: one module owning all calls to this vendor (`services/<vendor>/`, `lib/integrations/<vendor>/`), never `fetch` calls sprinkled across handlers.
- **Server-only**: third-party keys never reach the browser or the mobile bundle. If the client needs the data, it goes through your own endpoint.
- **Sync vs queued**: anything slow, rate-limited, or retryable belongs in a job/queue, not in a request handler.

Adding a dependency (SDK) requires the user's agreement, and gets a `/decisions` entry.

## Phase 3: Build the client

A vendor module with these parts, in the project's idiom:

1. **Config & secrets** — read from the environment (`process.env`/settings), validated at startup with a clear failure message. Never a literal key, never a key in a config file, never a key in a test fixture. Add the variable names (values redacted) to `.env.example` and the deploy docs.
2. **Auth** — one place that produces the credential for every call. For OAuth2/JWT: cache the token with its expiry, refresh **before** expiry with a margin, and guard the refresh against a thundering herd (single-flight). For HMAC: sign per request, with the vendor's exact canonicalization.
3. **Transport** — one wrapper around every call carrying: base URL by environment, timeouts (**always** — connect and total), a correlation/request id header, and structured logging of method, path, status, duration, and rate-limit headers. Never log request/response bodies containing credentials or PII.
4. **Resilience policy** — explicit, not implicit:
   - Retry only what is retryable: 429, 502/503/504, connection resets. **Never** blindly retry 4xx.
   - Exponential backoff with jitter; honor `Retry-After` when present; cap attempts (3–5) and total time.
   - Write requests retry **only** with an idempotency key; without one, surface the failure instead of risking a double charge.
   - A circuit breaker (or at minimum a failure-rate log + alarm) when the vendor is down, so your app degrades instead of hanging.
5. **Rate limiting** — a client-side limiter set below the documented quota; queue rather than burst; track the vendor's remaining-quota headers.
6. **Pagination** — one iterator/generator that handles the vendor's scheme once; callers never hand-roll page loops. Guard against infinite loops (max pages, cursor-repeat detection).
7. **Typed boundary** — the vendor's payload is untrusted input: parse and validate it at the edge (Zod/Pydantic/DTO) into **your** domain types. Never let a vendor's field names and casing leak through your whole codebase; map once. An unknown enum value degrades, never crashes.
8. **Errors** — translate vendor errors into your own error type with: retryable flag, user-safe message, vendor code kept for logs. Never surface a raw vendor error to end users.

## Phase 4: Test without touching the vendor

- Record real sandbox responses once (redacted) as fixtures; tests run against them via the project's mocking layer (MSW, `nock`, `responses`, `httpretty`, or a fake transport).
- Cover: success, pagination across ≥2 pages, 401 (refresh path), 429 (backoff + Retry-After), 500 (retry then give up), timeout, malformed payload, unknown enum value, idempotent retry.
- Keep **one** optional live smoke test against sandbox, skipped unless credentials are present — never in the default suite, never against production.

## Phase 5: Wire it in & document

1. Connect the client to the actual feature; keep the vendor module free of business logic.
2. Where the API pushes events, run `/webhook` for the inbound side.
3. Document in the repo (README section or `docs/integrations/<vendor>.md`): what it's used for, required env vars (names only), sandbox setup, rate limits, the retry policy, what happens when the vendor is down, and where the fixtures live.
4. Record the version/date of the API you built against — `/api-refresh` needs it.
5. Log a `/decisions` entry: vendor chosen, SDK-or-raw, and the alternative rejected.

## Phase 6: Report

```
## Integration: <vendor>

Auth: <scheme> (refresh: <yes/no>)   Env: <VAR names>   Version pinned: <v/date>
Client: <path>   SDK: <name@version | raw HTTP>
Resilience: timeout <n>s · retries <n> on <codes> · backoff+jitter · Retry-After ✓ · idempotency <yes/no>
Rate limit: <documented> → client cap <set>
Pagination: <scheme>, iterator ✓
Validation: vendor payload → domain types ✓ (unknown enum: degrade)
Tests: <n> (fixtures, no live calls) · live smoke: <skipped unless creds>
Docs: <path>
Not covered: <endpoints/features deliberately left out>
```

## Rules
- Secrets never in code, tests, fixtures, logs, or reports — the `redact` rule applies to every output here.
- Never retry a non-idempotent write without an idempotency key.
- Never call a vendor's production API from tests or from a local experiment "just to see".
- Never let a vendor's shape become your domain model; map at one boundary.
- Timeouts are mandatory on every call; an integration without one hangs your whole service.
- If the vendor's docs and behavior disagree, trust the observed behavior and write it down in the integration doc.
