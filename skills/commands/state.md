---
description: Frontend state architecture — audit or design the server/client state split, caching, invalidation and forms
argument-hint: "[feature or module] [--design] [--report-only]"
---

# /state — State Architecture

## Usage
```
/state                     — audit the current state layer, report the drift, fix the top issues
/state orders              — scope to one feature/module
/state --design            — design the state layer for a new feature before writing it
/state --report-only       — audit only
```

## Overview
Most frontend bugs that survive code review are state bugs: stale data after a mutation, two sources of truth disagreeing, a loading flag that lies, a form that loses input on re-render. They are architectural, not local — so this skill works on the **layer**, not on a component.

The organizing principle: **server state and client state are different problems.** Server state is a cache of someone else's data (it goes stale, it needs invalidation, it can fail). Client state is yours (it's synchronous, it's truth). Code that mixes them produces both classes of bug at once.

---

## Phase 1: Map what exists

1. Detect the tools in play: TanStack Query / SWR / RTK Query / Apollo / urql / Relay (server state); Redux / Zustand / Jotai / Recoil / MobX / Pinia / NgRx / signals / Context (client state); React Hook Form / Formik / VeeValidate / native (forms); the router's own state (search params, loaders).
2. Grep the scope for every state holder: `useState`, `useReducer`, store slices, contexts, module-level singletons, refs used as state, `localStorage`/`sessionStorage` reads, URL params.
3. Classify each into exactly one bucket:

| Bucket | Definition | Belongs in |
|---|---|---|
| **Server state** | Data owned by the backend, mirrored client-side | The query/cache layer — never a manual store |
| **URL state** | State that must survive reload, be shareable, and work with back/forward (filters, tabs, pagination, selected id) | Router / search params |
| **Client state** | Truly local UI truth (open/closed, hovered, draft input, wizard step) | Component state, or the smallest store that covers its consumers |
| **Form state** | Draft values + validation + submission status | The form library, not a global store |
| **Session state** | Auth identity, permissions, feature flags, theme | One provider, read-only downstream |
| **Derived** | Computable from the above | Nothing — compute it |

4. Draw the map: which component owns each piece, who writes it, who reads it.

## Phase 2: Findings

Look for these — in priority order, because this is the order they hurt:

1. **Server state copied into client state** — `useEffect` fetching into `useState`, or a query result pushed into a Redux slice. Two sources of truth, guaranteed staleness, manual loading/error flags that go wrong.
2. **Missing or wrong invalidation** — a mutation succeeds and nothing refetches; or everything refetches. List every mutation and the exact keys it must invalidate.
3. **Cache keys that don't encode their inputs** — a key missing the filter/locale/user id, so two different requests share one cache entry.
4. **Global state that shouldn't be global** — a store slice with a single consumer; a context whose value changes on every render and re-renders half the tree.
5. **State that should be in the URL** — filters/tab/page kept in memory, so reload loses the view and the state can't be linked or restored.
6. **Derived state stored** — a `total`, a `filteredList`, or an `isValid` kept in state and updated by hand, going out of sync the first time someone forgets.
7. **Effect chains** — `useEffect` that sets state that triggers another effect. Each hop is a render and a chance to desync.
8. **Loading/error flags that lie** — one `isLoading` for three requests; errors swallowed; no distinction between "loading" and "refetching" so the UI flashes.
9. **Optimistic updates without rollback** — the happy path is written, the failure path isn't.
10. **Race conditions** — an out-of-order response overwriting a newer one (no request cancellation, no key-based dedupe).
11. **Unbounded growth** — caches, subscriptions, listeners, intervals never cleaned up.
12. **Persistence without a version** — a store hydrated from `localStorage` with no schema version, breaking on the next shape change.

## Phase 3: Report

```
## State Audit — <scope>

Server state: <tool or "hand-rolled">   Client state: <tool>   Forms: <tool>

| # | Severity | Where | Bucket error | Symptom the user sees | Fix |
|---|----------|-------|--------------|----------------------|-----|
| 1 | 🔴 | useOrders.ts:22 | server state in useState | list still shows a deleted order until reload | move to the query layer, invalidate on delete |
```

- 🔴 Produces wrong data on screen (staleness, desync, race).
- 🟡 Correct today, structurally fragile (global-by-default, derived stored, effect chains).
- 🔵 Ergonomics (naming, colocation, boilerplate).

## Phase 4: Fix

Apply in this order — each step makes the next smaller:

1. Move server state to the query layer. Delete the hand-rolled `useEffect` + `useState` + `isLoading` triad; let the library own loading, error, refetch, dedupe, and cancellation.
2. Fix cache keys so they encode every input the request depends on.
3. Attach invalidation to every mutation, and prove it: perform the mutation, assert the affected views update without a reload.
4. Push shareable state to the URL, with the router's own API. Verify back/forward and reload.
5. Delete stored derived state; compute at read time, memoize only when a measurement says to.
6. Collapse effect chains into a single derivation or an event handler.
7. Scope stores down: a slice with one consumer becomes local state; a context that re-renders too widely gets split or memoized.
8. Add the failure paths: rollback for optimistic updates, error surfaces for every mutation, empty/loading/error states for every query consumer.

## Phase 5 (`--design`): Design before writing

For a new feature, output the plan first — no code until it's agreed:

```
## State Design — <feature>

| Piece | Bucket | Owner | Key / shape | Invalidated by | Persisted? |
|---|---|---|---|---|---|
| order list | server | useOrders(filters) | ['orders', filters] | create/update/delete order | no |
| filters | URL | route search params | ?status=&page= | — | via URL |
| row selection | client | OrdersTable | Set<id> | cleared on filter change | no |

Failure paths: <what the user sees on each error>
Race handling: <cancellation / key strategy>
```

## Rules
- Never introduce a new state library to fix a state bug — first prove the bug isn't a bucket error. Adding a dependency is a `/decisions` -worthy call, and it needs the user's agreement.
- Never keep two sources of truth "temporarily"; pick one in the same change.
- Every fix must be demonstrated against the symptom: reproduce the stale/desynced view, apply the fix, show it correct.
- Colocate by default: state lives at the lowest common ancestor of its readers, and moves up only when a real reader forces it.
- Respect the project's existing choices — if it uses Zustand, fix the architecture in Zustand rather than rewriting it in something you prefer.
