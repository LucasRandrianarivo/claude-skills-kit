---
description: Search — engine choice, indexing pipeline, relevance, typos, facets, permissions, and measuring result quality
argument-hint: "[--design] [--audit] [--relevance] [--reindex]"
---

# /search — Search & Relevance

## Usage
```
/search --design            — choose the approach and design the pipeline
/search --audit             — audit an existing search implementation
/search --relevance         — improve result quality, measurably
/search --reindex           — build a safe, repeatable reindex path
```
Field notes: `.claude/references/database.md`.

## Overview
Search fails quietly: users type a product name, get nothing, and leave. Nobody files a bug. So the discipline here is **measurement first** — a search you can't evaluate is a search you can't improve.

The second failure is architectural: a search index is a **derived** store. It will drift from the database, and the only real defense is a reindex that is routine, not an emergency.

---

## Phase 1: Choose the engine by what you actually need

| Situation | Use |
|---|---|
| Filtered lists, exact/prefix matching, modest volume | **Your database.** Postgres `tsvector` + GIN, `pg_trgm` for fuzzy, `unaccent` for accents. No new infrastructure, transactional consistency |
| Typo tolerance, instant search-as-you-type, facets, easy relevance tuning | **Meilisearch / Typesense** — small operational cost, excellent defaults |
| Large corpora, complex analyzers, aggregations, multi-tenant scale | **Elasticsearch / OpenSearch** — powerful, and a real operational commitment |
| Semantic/"meaning" queries, Q&A over documents | **Vector search + hybrid** (never pure vector: it loses on names, SKUs, error codes) |

Start with Postgres unless a requirement rules it out. Most "we need Elasticsearch" moments are a missing GIN index and no ranking function. Record the decision (`/decisions`) — an engine is a one-way-ish door.

## Phase 2: The indexing pipeline

1. **Define the document**: what a search result *is* (a product with its brand and category text, not a row). Denormalize into it what users search by.
2. **Keep it fresh**: index on write, through the **outbox** pattern (`references/distributed.md`) — indexing inside the request handler means a failed index write either breaks the request or silently drops the document. Both happen.
3. **Full reindex must be a routine command**: idempotent, resumable, and safe to run in production. Use an alias/swap (index into `products_v2`, then flip the alias) so there is never an empty-index window.
4. **Deletions and permission changes propagate** — the classic leak is a document removed from the database but still returned by search, or a private document indexed publicly.
5. **Analyzers matter more than the engine**: language-specific stemming, `unaccent`/folding, stop words, and — critically — how you tokenize identifiers (SKUs, references, emails). Splitting `AB-1234` into two tokens is why nobody can find it.

## Phase 3: Relevance (`--relevance`)

Measure before tuning:
- Build a **judgment set**: 30–50 real queries (from analytics; the zero-result and zero-click ones first) with the results a human considers correct.
- Track **zero-result rate**, **click-through position**, and **query reformulation rate** — the last one is the honest signal that results were wrong.
- Then tune: field weights (title > description), exact-match and phrase boosts, recency/popularity boosts, typo tolerance thresholds (never on short tokens or codes), and synonyms for the vocabulary your users actually use versus the one your catalog uses.
- Re-run the judgment set after every change. Relevance tuning without it is guessing, and each change will silently break a case someone else fixed last month.

## Phase 4: The user-facing behaviors that matter

Empty state that suggests something (popular queries, categories) instead of a void; typo tolerance with a "did you mean"; facets that reflect *filtered* counts and never lead to zero results; highlighting of matched terms; stable pagination (cursor, not offset — results shift as data changes); debounced as-you-type with cancellation of superseded requests; and a fast path — search feels broken above ~300ms.

## Phase 5: Permissions and multi-tenancy

Filter **in the query**, never after retrieval — post-filtering breaks pagination and counts, and one forgotten path leaks. The tenant/permission dimension belongs in the index and in every query, exactly as it does in the database. Test with a second tenant's user: search must return nothing of theirs.

## Phase 6: Report

```
## Search — <scope>
Engine: <x> — chosen because <one line>   Documents: <n>   Index size: <n>
Pipeline: write path <outbox/direct> · full reindex <command> · alias swap ✓ · deletes propagate ✓
Quality: zero-result rate <%> · judgment set <n> queries · precision@5 <before>→<after>
Latency: p50 <n>ms · p95 <n>ms
Permissions: filtered in-query ✓ · cross-tenant test ✓
| # | Severity | Issue | Fix |
```

## Rules
- Try the database first; adopting a search engine is an operational decision, not a default.
- A search index is derived: the reindex path is built and tested before launch, not after the drift.
- Never post-filter for permissions; filter in the query.
- Never tune relevance without a judgment set and a before/after measurement.
- Watch the zero-result queries — they are the only bug report you will get.
- Index writes go through the outbox or a reconciliation sweep; a dropped index write must be recoverable.
