---
description: Define, freeze, generate and enforce the API contract between layers — OpenAPI/GraphQL/typed schemas
argument-hint: "<feature or endpoint> [--from-code] [--generate] [--check]"
---

# /contract — API Contract

## Usage
```
/contract <feature>          — design the contract for new work
/contract --from-code        — extract the contract that current code actually implements
/contract --generate         — generate types/clients/validators from the contract
/contract --check            — verify code still matches the contract (drift detection)
```

## Overview
Two layers agree on a contract or they agree on nothing. This skill produces one artifact — machine-readable where the stack allows — that the backend implements, the frontend consumes, and CI enforces. It is the backbone of `/fullstack`, and it's useful alone: before writing an endpoint, or after inheriting one nobody documented.

---

## Phase 1: Choose the format (once per project)

Pick by what the project already uses; introduce nothing new without asking.

| Situation | Contract lives in |
|---|---|
| REST + OpenAPI already present | The existing `openapi.yaml` / generated spec |
| REST, TypeScript both sides | A shared types package + Zod (or equivalent) schemas exported from one module |
| REST, mixed languages | OpenAPI 3.1 as the source, generators per language |
| GraphQL | The SDL schema — it *is* the contract; enforce with codegen |
| tRPC / typed RPC | The router type — the contract is the compiler; document semantics alongside |
| Nothing formal, small surface | `.claude/contracts/<feature>.md` with the tables below, promoted to a spec when it grows |

Record the choice with `/decisions` — it's a boundary decision.

## Phase 2: Specify

For **each endpoint**, all of it. A blank cell is a bug someone will hit at 2am:

```
### POST /api/v1/subscriptions/:id/change-plan

Auth:        Bearer, scope `billing:write`, must own the subscription
Idempotent:  yes — Idempotency-Key header, 24h window
Request:     { planId: string (uuid, required), effective: "now" | "period_end" (default "now") }
Response 200:{ subscriptionId: string, planId: string, status: "active"|"pending", proratedCents: integer, effectiveAt: string (ISO 8601 UTC) }
Errors:
  400 VALIDATION_ERROR  { code, message, fields[] }   — unknown planId shape
  403 FORBIDDEN         — not the owner / missing scope
  404 NOT_FOUND         — subscription does not exist (do not leak existence to non-owners: return 404)
  409 PLAN_UNCHANGED    — already on that plan
  422 DOWNGRADE_BLOCKED { code, message, blockers[] } — usage exceeds target plan
  429 RATE_LIMITED      — Retry-After header
Concurrency: optimistic — 409 on stale `version`
```

And the **data model delta**: table, column, type, nullable, default, index, FK, and the migration's reversibility.

And the **client-side ownership**: which pieces are server state (cache key + invalidation events), which are URL state, which are local (see `/state`).

Naming rules — decide once, apply everywhere:
- One casing for the wire format (`snake_case` or `camelCase`), never both in one API.
- Money as integer minor units with the currency, never a float.
- Timestamps as ISO 8601 with an explicit timezone (UTC), never epoch-vs-string mixing.
- Enums exhaustively listed, with the client's behavior for an unknown future value.
- Nullable vs absent distinguished deliberately, and documented.

## Phase 3: Freeze

Present the contract for approval. Once approved:
- Commit it (it is a reviewable artifact).
- Version it: `v<n>` in the file, bumped on every amendment, with a changelog line per amendment.
- Any later change follows the amendment protocol: request → decision → bump → re-inform both layers.

## Phase 4 (`--generate`): Generate, don't hand-write

Wherever the stack supports it, derive code from the contract instead of duplicating it:
- OpenAPI → server stubs/validators and a typed client (`openapi-typescript`, `orval`, `oazapfts`, language-native generators)
- GraphQL → typed hooks/resolvers via codegen
- Zod/Pydantic schema → inferred static types on both sides, plus runtime validation at the boundary
- Mocks: generate MSW handlers or fixtures from the same source so the frontend can build before the API exists

Wire generation into the project's scripts so a stale generated file is a build failure, not a surprise.

## Phase 5 (`--from-code`): Extract what actually exists

For an undocumented API: read every handler, its validation, and its serializer; run the endpoints where possible and record the real payloads. Produce the contract from the **observed** behavior, then list where the code contradicts itself (two endpoints with different error envelopes, an optional field that is never absent, an enum with an undocumented value).

## Phase 6 (`--check`): Drift detection

1. Compare the contract against the implementation: response shapes, status codes, required fields, enum values.
2. Compare it against consumers: grep the client for every field it reads; a field read but not in the contract is a break waiting to happen.
3. Diff against the previous contract version and classify each change as **additive** (safe), **breaking** (needs a version/deprecation path), or **cosmetic**.
4. Output:

```
## Contract Check — <name> v<n>

| # | Kind | Point | Contract says | Code does | Impact |
|---|------|-------|---------------|-----------|--------|
| 1 | drift | GET /orders | `total_cents` integer | returns `total` float | every client breaks |
```

Fail loudly on breaking drift; suggest the deprecation path (keep the old field as an alias, ship both for a version, then remove).

## Rules
- The contract is written before the implementation, or extracted from it — never guessed from one side's code.
- Additive changes are safe; removals and renames are breaking and need a version, an alias window, and a `/decisions` entry.
- Errors are part of the contract. An endpoint with only its 200 documented is not documented.
- Never let two sources of truth exist (a spec *and* hand-written types) — generate one from the other.
- Wire the check into CI where the project has one; a contract nobody enforces is a comment.
