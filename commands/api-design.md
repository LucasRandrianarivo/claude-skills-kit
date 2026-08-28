---
description: Design your own public/partner API — resources, errors, pagination, versioning, rate limits, auth, docs and DX
argument-hint: "[--design <surface>] [--review] [--rest|--graphql] [--docs]"
---

# /api-design — Designing an API Others Consume

## Usage
```
/api-design --design billing     — design a new API surface
/api-design --review             — review an existing API against the rules below
/api-design --graphql            — GraphQL-specific design and pitfalls
/api-design --docs               — generate/repair the reference documentation
```
Field notes: `.claude/references/http.md`. Internal cross-layer contracts: `/contract`. Consuming someone else's API: `/integrate`.

## Overview
An API you publish is a promise you can't easily take back: every field name, error shape and default becomes something a client depends on. This skill designs that surface deliberately — consistency over cleverness, because the cost of an API is paid by the people integrating with it, not by the team writing it.

---

## Phase 1: REST or GraphQL — decide once, for a reason

**REST** when: resources are stable, clients are diverse, HTTP caching matters, and integrators expect `curl` to work. **GraphQL** when: clients need wildly different shapes of the same graph, over-fetching is real and measured, and you can operate persisted queries, depth/complexity limits and per-field authorization. **RPC** (tRPC, gRPC) when both ends are yours and evolve together — not for a public API.

The honest default for a public/partner API is REST + JSON. GraphQL's costs are real: caching moves from HTTP to your application, N+1 becomes a per-field problem (DataLoader is mandatory), and an unbounded query is a denial-of-service the client writes for you.

## Phase 2: The resource surface

- **Nouns, plural, hierarchical**: `/v1/customers/{id}/invoices`. Verbs only for genuine actions that aren't a resource state change (`POST /invoices/{id}/send`) — and be consistent about which.
- **Consistent casing** on the wire — pick `snake_case` or `camelCase` and never mix. Mixed casing is the single most-reported friction in API reviews.
- **Ids are opaque strings**, prefixed if it helps (`cus_`, `inv_`) — never expose sequential integers you'd rather not have counted, and never make clients parse ids.
- **Money**: integer minor units + currency code. **Time**: RFC 3339 UTC. **Enums**: documented exhaustively, with a stated rule for how clients should treat unknown future values (ignore, not crash).
- **Nullable vs absent** decided deliberately and documented; don't return `null`, `""` and omission for the same concept.
- Expansion instead of chatty round trips (`?expand=customer`), and sparse fields (`?fields=`) where payloads are large — both optional, both documented.

## Phase 3: The parts clients actually struggle with

**Errors** — one envelope for the whole API, forever:
```json
{ "error": { "type": "validation_error", "code": "amount_too_small",
             "message": "Amount must be at least 100.", "param": "amount",
             "request_id": "req_01H..." } }
```
A **stable machine code** (clients branch on it), a human message (never the only signal), the offending field, and the request id that appears in your logs. Correct HTTP status: 400/401/403/404/409/422/429, and 5xx only when it's your fault. Never 200 with an error body.

**Pagination** — cursor-based by default (`?limit=&starting_after=`), returning `has_more` and the next cursor. Offset pagination degrades and skips/duplicates rows when data changes underneath. Cap `limit`, and document the default.

**Idempotency** — every unsafe endpoint accepts an `Idempotency-Key` and returns the original result on replay. This is what lets clients retry safely, and its absence is what causes duplicate charges in *their* system, which becomes your support ticket.

**Rate limits** — documented, returned in headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`), and 429 with `Retry-After`. Limit by key and by endpoint class; the expensive endpoints need it most.

**Filtering, sorting, search** — a small, documented set of parameters. Don't accept arbitrary query DSLs from the internet.

**Long operations** — 202 + a status resource, or a webhook. Never a request that holds for a minute.

**Webhooks**, if you emit them: signed (HMAC over the raw body + timestamp), documented event types with versioned payloads, at-least-once with retries and a replay tool, and a way for the integrator to see delivery attempts (`/webhook` covers the receiving side; you owe them the same guarantees).

## Phase 4: Versioning & evolution

- **Additive changes are free** (new optional field, new endpoint, new enum value *if* you documented the unknown-value rule). Everything else is breaking.
- Choose one mechanism: URL version (`/v1/`, simple and visible) or a date/header version pin (fine-grained, more machinery). Never mix.
- **Breaking changes need**: a new version, both live during a deprecation window with an announced sunset date, a migration guide, `Deprecation`/`Sunset` headers on the old surface, and metrics on who is still calling it — because "we announced it" is not the same as "nobody uses it".
- Never quietly change a default, a rounding rule, a sort order, or an error code. Those break clients silently, which is worse than an error.

## Phase 5: Auth, safety, documentation

Auth: API keys (server-to-server, scoped, rotatable, with prefixes so leaks are detectable in scanners) or OAuth2 when third parties act for users. Separate test and live credentials that are visually distinguishable. Enforce scopes per endpoint and re-check ownership per object (`/auth`).

Docs are the product: an **OpenAPI/GraphQL schema generated from the code** (`/contract`), a quickstart that works in five minutes with a copy-pasteable `curl`, real request/response examples for success **and** each error, and a sandbox with test data. A changelog integrators can subscribe to. If the only way to learn the API is to read your handlers, it isn't documented.

## Phase 6: Review output

```
## API Design Review — <surface>
Style: REST/JSON · casing <snake_case> consistent ✓ · versioning <URL /v1>
| # | Severity | Endpoint | Issue | Who it breaks | Fix |
| 1 | 🔴 | GET /orders | offset pagination, no cap | clients silently skip rows as data shifts | cursor pagination, cap limit at 100 |

Errors: one envelope ✓ · machine codes ✓ · request_id ✓
Idempotency: <endpoints> ✓   Rate limits: headers ✓   Long ops: 202 + status ✓
Docs: schema generated ✓ · quickstart tested ✓ · errors documented ✓ · changelog ✓
```

## Rules
- Consistency beats elegance: one casing, one error envelope, one pagination style, one versioning mechanism, across the whole surface.
- Every unsafe endpoint supports idempotency keys; every list endpoint is cursor-paginated and capped.
- Errors carry a stable machine code and a request id; a human-readable message is never the only signal.
- Additive changes only, or a version with a sunset date, a migration guide, and usage metrics on the old surface.
- Documentation is generated from the source of truth and tested by following it literally (`/devex-review`).
- Design against a real client: write the integration snippet first, and fix what's awkward before shipping the endpoint.
