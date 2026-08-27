---
description: Contract-first fullstack feature — DB → API → client built by parallel agents against one frozen contract, with gates
argument-hint: "<feature description> [--layers db,api,web,mobile] [--no-parallel]"
---

# /fullstack — Contract-First Fullstack Orchestration

## Usage
```
/fullstack <feature description>
/fullstack subscription billing page with plan change and invoice history
/fullstack --layers db,api,web        — restrict the layers
/fullstack --no-parallel              — build layers sequentially (easier to follow)
```

## Overview
`/feat` builds a feature in one pass. `/fullstack` builds a feature that spans layers — schema, API, client — where the expensive failure is **layer drift**: the API returns `total_cents`, the frontend reads `total`, and nobody notices until QA.

The method: **freeze the contract first, then let each layer be built against it, in parallel, by an agent that cannot change it.** The contract is the single source of truth; a layer that needs a change requests it, and the change is versioned, never silent.

You stay in control at four gates. Nothing crosses a gate without your go.

---

## Phase 1: Decompose (main agent)

1. Parse `$ARGUMENTS`. If the feature is vague, ask at most 3 questions — the contract depends on the answers.
2. Detect the stack per layer: database + migration tool, API framework + validation library, web framework + data-fetching layer, mobile if present.
3. Map the feature onto layers and list what each must deliver:

```
Feature: <name>
Layers:
  db     — <tables/columns/indexes/migration>
  api    — <endpoints, auth, validation, errors>
  web    — <routes, components, state, states>
  mobile — <screens, offline behavior>   (if applicable)
Out of scope: <explicitly what this does not do>
Risks: <one-way doors, data migration, breaking changes>
```

**Gate 1 — scope.** Present this. Do not proceed without agreement.

## Phase 2: Contract (via `contract-keeper`)

Delegate to the `contract-keeper` agent (or run `/contract` directly): produce the single artifact both sides build against.

The contract must specify, per endpoint:
- Method, path, auth requirement, and the permission that guards it
- Request shape with types, required/optional, and validation rules
- Response shape with types and nullability — **exact field names, exact casing**
- Every error case: status code, error envelope, and the message the user sees
- Pagination, sorting, filtering parameters
- Idempotency and concurrency semantics for anything that writes

Plus the data model delta (tables, columns, types, nullability, indexes, FKs) and the state/ownership split for the client (see `/state`).

Write it where the stack can enforce it: an OpenAPI/GraphQL schema, a shared types package, a Zod/Pydantic schema module, or `.claude/contracts/<feature>.md` when the project has nowhere better. **The contract is code if the stack allows it to be.**

**Gate 2 — contract freeze.** Present the contract. Once agreed, it is frozen: no layer may change it unilaterally.

## Phase 3: Build in parallel (specialized agents)

Dispatch one agent per layer, each with the frozen contract in its prompt and a hard boundary on what it may touch:

| Agent | Owns | May not touch |
|---|---|---|
| `backend-builder` | migrations, models, handlers, services, backend tests | client code, the contract |
| `frontend-builder` | routes, components, state layer, client tests | server code, the contract |
| `contract-keeper` | the contract artifact and generated types | implementation code |

Rules for the fan-out:
- Each agent receives: the contract, its layer's slice of the plan, the project conventions it must follow, and its file boundary.
- Agents **never** edit files outside their boundary. A cross-boundary need becomes a change request, not an edit.
- The frontend does not wait for the backend: it builds against the contract, using the project's mocking approach (MSW, fixtures, a typed stub) when the API isn't live yet.
- With `--no-parallel`, run the same agents sequentially — same boundaries, same contract.

### Change requests
When a layer discovers the contract is wrong (a field it can't produce, an error case nobody designed), it stops and emits:

```
CHANGE REQUEST — <layer>
Contract point: <endpoint/field>
Problem: <why it can't be built as specified>
Options: A) <option + cost>  B) <option + cost>
Recommendation: <one>
```

**Gate 3 — contract amendment.** You decide. On approval, `contract-keeper` updates the contract, bumps its version, and both layers are re-informed. Never let a layer "just adapt" silently — that is exactly the drift this skill exists to prevent.

## Phase 4: Integrate & verify (via `integration-verifier`)

Layers built in isolation are not a working feature. Verify the seam:

1. **Contract conformance** — every response the API actually returns matches the contract's shape and casing; every request the client actually sends matches too. Prove it by running the code, not by reading it.
2. **End-to-end path** — run the real flow against the real API (dev server + migrated database): create, read, update, delete, and the permission-denied path.
3. **Error paths** — force each documented error (validation, unauthorized, not found, conflict, server error) and confirm the client renders the designed state, not a crash or a blank screen.
4. **Empty and loading states** — verify with an empty dataset and with a throttled network.
5. **Migration safety** — apply the migration on a copy with data, roll it back, apply it again. Deploy ordering: does the new API work against the old schema, or does the migration need to land first?
6. **Regression** — run the full test suite plus typecheck and lint.

## Phase 5: Report

```
## Fullstack: <feature>

Contract:  <path> (v<n>, <n> amendments)
Layers:    db ✓  api ✓  web ✓  mobile —
Files:     <created> created · <modified> modified
Verify:    conformance ✓  e2e ✓  error paths ✓  migration up/down ✓  suite ✓ (<n> tests)
Amendments: <what changed after freeze and why>
Deploy order: <migration → api → client, or as required>
Follow-ups: <what was deliberately left out>
```

**Gate 4 — ship.** Present the report and hand off to `/pr-review` then `/ship`. Never self-merge.

## Rules
- **The contract is the only shared truth.** No layer infers a field name from another layer's code.
- **Boundaries are absolute.** An agent that edits outside its layer invalidates the parallelism; stop it and re-dispatch.
- Every amendment is logged (`/decisions`), and architecture-shaping ones become an ADR — a breaking API change is exactly that.
- Never mark a layer done on "it compiles". Done means: its slice of the contract is demonstrably satisfied at runtime.
- Never skip Gate 2 to "start coding" — an unfrozen contract makes the parallel build worse than a sequential one.
- If the feature touches only one layer, say so and use `/feat` instead. This skill's overhead only pays when layers must agree.
