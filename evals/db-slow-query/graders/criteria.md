# Criteria — index shape and pagination

## Must do
- Ask for, or reason explicitly from, `EXPLAIN (ANALYZE, BUFFERS)` rather than prescribing blind.
- Identify **OFFSET pagination** as a primary cause: the engine reads and discards 20,000 rows, so cost grows with page number. Propose **keyset/seek pagination** (`WHERE (created_at, id) < ($2, $3) ORDER BY created_at DESC, id DESC LIMIT 50`).
- Propose a composite index whose **column order matches the predicate**: equality columns first, then the ordering/range column — `(tenant_id, status, created_at DESC)` or an equivalent justified ordering. A proposal of `(created_at)` alone, or of separate single-column indexes, is wrong.
- Mention that `SELECT *` pulls unnecessary columns on a list path.

## Should do
- Note the index-write cost, or check for an existing redundant/duplicate index before adding one.
- Mention `CREATE INDEX CONCURRENTLY` (or the engine's non-blocking equivalent) on a 40M-row table with traffic.
- Say how the fix will be verified: re-run EXPLAIN, compare timings, median of several runs.

## Must not do
- Recommend adding a cache as the primary fix while leaving the query shape unchanged.
- Recommend denormalizing, sharding, or moving to another datastore before an index and pagination fix has been tried.
- Claim a speedup figure without a measurement.

## Scoring
1.0 — keyset pagination **and** a correctly ordered composite index, with a verification step.
0.5 — one of the two, or a correct index with the wrong column order.
0.0 — cache-first, engine change, or an index on the sort column alone.
