# Field notes — Databases (PostgreSQL / MySQL)

Consulted by `/db`, `specialist-database`, `specialist-data-migration`, `/fullstack`.
Use it to **answer questions** in this domain, not only to execute a checklist: state the mechanism, then the trap, then how to verify.

---

## The mental model

A query is answered by a **plan**, chosen by a **cost estimate**, computed from **statistics**. Almost every "the database is slow" problem is one of four things:
1. The plan is wrong because the statistics are stale or the predicate isn't sargable.
2. There is no index that matches the predicate's **shape** (not just its columns).
3. The query is executed N times instead of once (N+1).
4. The query is fine and the *concurrency* is the problem (locks, pool exhaustion, long transactions).

Everything below hangs off that split. Diagnose which of the four before touching anything.

## Symptom → cause → confirm → fix

| Symptom | Most likely cause | Confirm with | Fix |
|---|---|---|---|
| Endpoint fast in dev, slow in prod | Fixture volume vs real volume; plan flips at scale | `EXPLAIN (ANALYZE, BUFFERS)` on prod-like data | Index matching the predicate; keyset pagination |
| Query got slow "suddenly" | Stale statistics after a bulk load; plan flip | `EXPLAIN` estimated vs actual rows (off by >10×) | `ANALYZE <table>`; check autovacuum settings |
| Index exists but isn't used | Predicate not sargable (`WHERE lower(email) = …`, `col + 0`, implicit cast), or the index doesn't lead with the equality column | `EXPLAIN` shows Seq Scan | Expression index, or rewrite the predicate; fix column order |
| List endpoint degrades with page number | `OFFSET n` reads and discards n rows | Time page 1 vs page 500 | Keyset: `WHERE (created_at, id) < (?, ?) ORDER BY … LIMIT n` |
| One request issues hundreds of queries | N+1: lazy relation per row | Count queries per request (ORM log / APM span count) | Eager load / join; assert query count in a test |
| Writes hang under load | Lock contention: long transaction, or an update ordering deadlock | `pg_locks` + `pg_stat_activity` (`wait_event_type='Lock'`) | Shorten transactions; always update rows in a consistent order |
| "Duplicate row" bugs under concurrency | Check-then-insert; app-level uniqueness | Two concurrent requests in a test | Unique constraint + handle the violation |
| Counter/balance drifts | Read-modify-write in the app | Concurrent test | `UPDATE … SET x = x + ? WHERE …`, or `SELECT … FOR UPDATE` |
| Connections exhausted | Pool > server max, or connections held during external calls | `SELECT count(*) FROM pg_stat_activity` | Size the pool; never hold a connection across an HTTP call; PgBouncer |
| Deployment locks the site | DDL taking an ACCESS EXCLUSIVE lock behind a long query | Staging rehearsal with concurrent load | `CREATE INDEX CONCURRENTLY`; `SET lock_timeout`; split the migration |
| Table bloats, disk grows, scans slow | Dead tuples not vacuumed (Postgres MVCC), long-running transactions blocking cleanup | `pg_stat_user_tables.n_dead_tup` | Fix the long transaction first; tune autovacuum for hot tables |

## Index selection — the rules that actually decide

- **Column order in a composite index**: equality predicates first, then the range/sort column. `WHERE tenant_id = ? AND created_at > ?` wants `(tenant_id, created_at)` — the reverse is nearly useless.
- **An index serves a query only if the leading columns match**. `(a, b, c)` serves `a`, `a,b`, `a,b,c` — never `b` alone.
- **Covering**: adding the selected columns (`INCLUDE`) lets the engine skip the heap fetch. Worth it on hot read paths only; it costs write throughput.
- **Partial index** for a filtered subset (`WHERE deleted_at IS NULL`, `WHERE status = 'pending'`) — small, hot, and exactly matches the query the app runs constantly.
- **Every index costs every write.** A table with 9 indexes writes 10 things per insert. Drop unused ones (`pg_stat_user_indexes.idx_scan = 0` over a real period).
- **Foreign keys are not indexed automatically** in Postgres or MySQL/InnoDB (the FK *constraint* is; the referencing column may not be). A missing one turns a parent delete into a full scan of the child.
- **UUIDv4 as a clustered/primary key** fragments B-trees and kills insert locality — UUIDv7/ULID keep time ordering. In MySQL InnoDB, where the PK *is* the clustering key, this matters even more.

## Reading `EXPLAIN` in 30 seconds

1. Read the **innermost** node first; that's where the time starts.
2. Compare `rows=` (estimate) with `actual rows` — a big gap means bad statistics, and every decision above it is suspect.
3. `Seq Scan` on a large table with a selective predicate → missing/unusable index.
4. `Nested Loop` where the outer side has many rows → the inner side runs that many times.
5. `Sort … Disk` or `external merge` → `work_mem` too small, or you're sorting more than you need.
6. `Buffers: read=` high means it went to disk; `hit=` means cache. A "slow query" that's all `read` is often a cold-cache artifact — measure twice.
7. Filter rows removed by a filter node: the index found rows the query then threw away → the index doesn't match the real predicate.

## Isolation & anomalies (what your default level actually gives you)

| Level | Prevents | Still possible |
|---|---|---|
| Read Committed (Postgres/MySQL default) | Dirty reads | Non-repeatable reads, phantoms, **lost updates via read-modify-write** |
| Repeatable Read (MySQL default) | + non-repeatable reads | Write skew (Postgres RR = snapshot isolation) |
| Serializable | All of it | Serialization failures you **must retry** |

The practical consequence: at the default level, "check then act" is never safe. Enforce with a constraint, an atomic `UPDATE … WHERE <expected state>`, or explicit locking. This one rule prevents most data-corruption bugs in web apps.

## Migration traps

- Adding a column with a default: instant on modern Postgres (11+) and MySQL 8; a full table rewrite on older versions.
- `NOT NULL` on an existing column: needs a backfill + a validated check constraint to avoid a long lock (Postgres: add `CHECK … NOT VALID`, `VALIDATE`, then set `NOT NULL`).
- `CREATE INDEX CONCURRENTLY` can't run in a transaction — most migration tools wrap everything in one. Know your tool's escape hatch, and know it can leave an **invalid index** on failure that must be dropped.
- Renaming anything is a two-deploy operation (expand → migrate → contract). A rename in one deploy breaks every instance of the old code still running.
- Enum values can be added but not removed in Postgres without a type swap; MySQL enum changes rewrite the table.
- Always set `lock_timeout` and `statement_timeout` for migrations so a blocked DDL fails fast instead of queueing every subsequent query behind it — that queue is the outage, not the DDL.

## Numbers worth knowing

- Index lookup on a warm B-tree: microseconds. Sequential scan of 1M rows: tens to hundreds of ms. Network round trip in the same region: ~0.5–2ms — so 200 sequential queries cost more than the queries.
- A single connection ≈ several MB of server memory in Postgres; hundreds of idle connections is a problem, not a scale plan.
- Autovacuum defaults are tuned for small tables; a 100M-row table needs its own settings.

## Where this gets decided wrong

- Adding a cache instead of an index — the cache hides a query that will still be there when it misses.
- Denormalizing before measuring, then owning two sources of truth forever.
- Choosing a document store to avoid migrations, then rebuilding joins in the application.
- Trusting the ORM's default fetching strategy; it's optimized for demos, not for your page.
