---
description: Caching strategy — what to cache where, invalidation, stampede protection, keys, TTL/SWR, CDN and correctness
argument-hint: "[--design] [--audit] [--invalidate <resource>]"
---

# /cache — Caching

## Usage
```
/cache --design <resource>    — decide the caching strategy for something specific
/cache --audit                — audit existing caching for correctness and effectiveness
/cache --invalidate orders    — design the invalidation for a resource
```
Field notes: `.claude/references/http.md`, `.claude/references/distributed.md`.

## Overview
A cache trades **freshness for speed and load**, and every cache bug is a bug about that trade being unstated. Before adding one, two questions: **why is the underlying thing slow** (a cache over a missing index is a bug with a delay), and **how stale may this be** (a number in seconds, agreed — not "shouldn't matter").

The highest-severity caching bug in web applications is not staleness. It's **serving one user's data to another**. Everything below is ordered accordingly.

---

## Phase 1: Establish the layers

Cache at the outermost layer that can answer correctly. Each layer is cheaper than the one behind it:

| Layer | Good for | Beware |
|---|---|---|
| Browser | Static assets, user-specific data on the same device | You cannot invalidate it — TTL is a promise you can't retract |
| CDN / edge | Public pages, assets, public API responses | Personalized content leaking into a shared cache |
| Reverse proxy | Same, self-hosted | Same, plus `Vary` handling |
| Application (Redis/Memcached) | Query results, computed values, sessions, rate limits | Stampede, unbounded keys, no eviction policy |
| In-process memory | Tiny hot values, config | Inconsistent across instances; invisible in a multi-pod deploy |
| Database / materialized view | Expensive aggregates | Refresh strategy is now your problem |

## Phase 2: Correctness rules (before performance)

1. **Never cache a response that depends on identity in a shared cache.** Mark it `private`/`no-store`, and make sure the CDN's cache key or bypass rules agree. Verify with an anonymous request after an authenticated one — if you get personalized content, stop everything and fix that first.
2. **The key encodes every input**: resource id, tenant, user (when applicable), locale, currency, feature-flag variant, API version, and any query parameter that changes the result. A missing dimension serves the wrong variant — silently, and only to some users.
3. **Never cache errors** the way you cache success (or cache them very briefly and deliberately) — a cached 500 turns a blip into an outage.
4. Cached values are **derived**, never the source of truth. There must always be a path that works with the cache empty, and it must be exercised (a cold start is a fire drill you get for free).
5. Personal data in a cache has a retention and a deletion path too (`/rgpd`).

## Phase 3: Invalidation

Pick one and write it down:

- **TTL only** — simplest, honest: "this may be up to N seconds stale". Correct for most read-heavy public data.
- **TTL + explicit invalidation on write** — invalidate (or update) on every mutation path. The trap: *every* path, including admin tools, jobs, migrations and the vendor webhook.
- **Key versioning** — embed a version/updated-at in the key (`orders:v3:42`, `user:42:profile:<updated_at>`); the old entry ages out on its own. Avoids the "delete every derived key" problem.
- **Tag/group invalidation** — where the cache supports it; otherwise maintain a set of keys per entity (and remember that set is itself state that can drift).

Never build "invalidate everything on any write" — it's a cache that doesn't cache, plus a stampede generator.

## Phase 4: Stampede, staleness, memory

- **Stampede**: a hot key expires and every concurrent request recomputes it. Fix with single-flight (a lock so one request computes and others wait), or by refreshing before expiry (**stale-while-revalidate**: serve the stale value, refresh in the background). Add jitter to TTLs so ten thousand keys don't expire in the same second.
- **Negative caching**: cache "not found" briefly, or a missing key becomes a free DoS against your database.
- **Eviction**: set `maxmemory` and a policy (`allkeys-lru` for a cache; `noeviction` only for a data store — the two must not share an instance, and mixing them is how sessions get evicted under load).
- **TTL on everything.** A key with no TTL and no invalidation is a memory leak that also serves stale data forever.
- Compress or trim large values; a 5MB cached page evicts thousands of useful keys.

## Phase 5: Measure

A cache is justified by numbers, not by intuition:
```
Hit rate: <%> (per key family — a global rate hides a useless cache)
Latency: p95 <with> vs <without>
Origin load: <requests/s before> → <after>
Staleness window: <agreed seconds>   Memory: <used>/<max>, evictions/s
```
Below ~70–80% hit rate for a read-heavy resource, the cache is usually keyed wrong or the TTL is too short — investigate rather than raising the TTL blindly. A cache with a great hit rate on a query that was never slow is complexity with no payoff: remove it.

## Phase 6: Audit output

```
## Cache Audit
| # | Severity | Where | Issue | Fix |
|---|----------|-------|-------|-----|
| 1 | 🔴 | CDN rule /account/* | authenticated page cacheable by shared cache | private + bypass on session cookie; purge |
| 2 | 🟡 | product cache key | missing locale | include locale in the key |
```
🔴 = wrong data to the wrong user, or a cache that can't be bypassed. 🟡 = staleness beyond the agreed window, stampede risk, unbounded growth. 🔵 = tuning.

## Rules
- Fix the underlying slowness first when it's fixable — a cache over a missing index hides a problem that returns on every miss.
- Never cache identity-dependent data in a shared cache; verify it, don't assume it.
- Every cached entry has a key that encodes all its inputs, a TTL, and a stated staleness budget.
- Every cache must have a documented, tested invalidation path — and a working cold-start path.
- Report hit rate and latency before/after; a cache that doesn't move either gets deleted.
