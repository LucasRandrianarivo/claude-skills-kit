---
description: Database work — schema design, migrations, indexes, query optimization, backup/restore, seeding
argument-hint: "[--schema <feature>] [--migrate] [--optimize] [--audit] [--backup]"
---

# /db — Database

## Usage
```
/db --schema orders          — design the schema for a feature (tables, keys, indexes, constraints)
/db --migrate                — write and verify a migration, up and down
/db --optimize               — find and fix the slow queries
/db --audit                  — full review: schema, indexes, constraints, N+1, backups
/db --backup                 — verify backups actually restore
```

## Overview
The database outlives every rewrite of the code on top of it. A missing constraint becomes corrupt data nobody can un-corrupt; a missing index becomes a 3am outage; a migration that locks a hot table becomes downtime. This skill treats the schema as the durable asset it is.

Works with the project's own tooling — Prisma, Drizzle, TypeORM, Sequelize, Knex, Django, Rails, SQLAlchemy, Alembic, Flyway, raw SQL — detected before anything is written.

---

## Phase 1: Detect

1. Engine and version: PostgreSQL · MySQL/MariaDB · SQLite · SQL Server · MongoDB (document-model rules differ — say so and adapt).
2. Access layer: ORM/query builder, its migration tool, and where migrations live.
3. Existing conventions: naming (singular/plural, snake/camel), primary-key type (bigint identity, UUIDv4, UUIDv7/ULID), timestamps, soft deletes, tenancy column, enum handling.
4. Current schema: read the migrations or introspect. Never design against an imagined schema.

## Phase 2 (`--schema`): Design

For each table:

| Decision | The rule that matters |
|---|---|
| **Primary key** | Follow the project's. New projects: bigint identity for internal ordering, UUIDv7/ULID when ids are exposed or generated client-side. Random UUIDv4 as a clustered PK fragments the index — know the cost before choosing it. |
| **Foreign keys** | Declared, with an explicit `ON DELETE` (`RESTRICT` by default, `CASCADE` only where the child truly cannot outlive the parent). An FK column is indexed — most engines do **not** do it for you. |
| **NOT NULL** | The default. Nullable is a decision that needs a reason, because every consumer must then handle absence. |
| **Uniqueness** | Every business-unique rule becomes a unique constraint (partial/filtered where it applies to a subset). Application-level checks race; constraints don't. |
| **Money** | `numeric`/`decimal` or integer minor units — never float. Store the currency next to the amount. |
| **Time** | `timestamptz` (UTC). Naive local timestamps are a bug with a delay fuse. |
| **Enums** | Native enum (safe, migration-costly) vs check constraint vs lookup table. Pick per how often values change, and document how unknown values are handled. |
| **Text** | No arbitrary `varchar(255)` folklore — length limits express business rules or they don't exist. |
| **JSON** | For genuinely open-ended data only. Anything queried, filtered or joined belongs in a column. |
| **Soft delete** | If used, it applies everywhere: every query filters it, every unique constraint accounts for it (partial unique index on `deleted_at IS NULL`). |
| **Tenancy** | Multi-tenant: the tenant column is in every table, every index prefix, and every query — enforced by RLS or a repository layer, not by discipline. |

Output the design as DDL (or the ORM schema) plus the index list, and state the queries each index serves.

## Phase 3 (`--migrate`): Migrate safely

1. **Write both directions.** A migration with no tested `down` is a one-way door.
2. **Test on data**, not on an empty schema: restore a copy (anonymized), run up → down → up, and check row counts and constraints at each step.
3. **Locking**: adding a nullable column is cheap; adding `NOT NULL` with a default rewrites the table on older engines; adding a unique index locks writes unless created concurrently (`CREATE INDEX CONCURRENTLY` on Postgres, `ALGORITHM=INPLACE` on MySQL). Know which one you're doing on a table with traffic.
4. **Expand → migrate → contract** for anything breaking: add the new column, backfill in batches, dual-write, switch reads, *then* drop the old one — in separate deploys. Never rename a column that live code reads.
5. **Backfills** run in batches with a bounded transaction, are resumable, and log progress. A single `UPDATE` over 40M rows is an outage.
6. **Deploy ordering** is part of the migration: state whether the old code runs against the new schema (it must, during rollout).
7. Destructive changes (drop column/table, type narrowing) need explicit confirmation and a data-retention answer.

## Phase 4 (`--optimize`): Make it fast, with evidence

1. Find the real offenders: the engine's slow-query log, `pg_stat_statements`, the ORM's query log in a dev run, or APM traces. **Never optimize a query nobody runs.**
2. `EXPLAIN (ANALYZE, BUFFERS)` before touching anything. Read it: sequential scan on a large table, nested loop over a big set, sort spilling to disk, estimated vs actual rows off by orders of magnitude (stale statistics).
3. Fix in this order: **query shape** (unnecessary joins, `SELECT *`, missing `LIMIT`, OFFSET pagination on deep pages → keyset pagination) → **index** (composite in the right column order: equality first, then range; covering index to avoid the heap fetch; partial index for a filtered subset) → **schema** (denormalize only with a measured reason) → **cache** (last, because a cache over a bad query hides it).
4. **N+1**: the classic ORM failure. Find it by counting queries in a request, not by reading code; fix with eager loading/joins, and add a test that asserts the query count.
5. Re-run `EXPLAIN ANALYZE` and report before/after timings. An index that doesn't change the plan gets dropped — every index costs write throughput.

## Phase 5 (`--audit`): Full review

| # | Check | Failure it prevents |
|---|---|---|
| 1 | Every FK indexed | Slow joins and cascading deletes locking parents |
| 2 | Business-unique rules backed by constraints | Duplicate rows created by concurrent requests |
| 3 | No nullable column that code treats as always-present | Silent `null` propagation |
| 4 | Unused/duplicate indexes removed | Write amplification |
| 5 | Deep-page pagination uses keyset, not OFFSET | Linear slowdown at page 500 |
| 6 | No unbounded query (`LIMIT` on every list path) | One customer's data volume taking the app down |
| 7 | Connection pool sized against the engine's max connections | Pool exhaustion under load |
| 8 | Long transactions kept short; no user input inside one | Lock pile-ups |
| 9 | Migrations reversible and applied in CI | Undeployable schema |
| 10 | PII columns identified, with retention and encryption decided (`/rgpd`) | Compliance exposure |
| 11 | Secrets and connection strings from the environment only | Credential leak |
| 12 | Backup schedule **and a restore test with a measured RTO** | The backup that never restored |

## Phase 6 (`--backup`): Prove the restore

A backup is a hypothesis until you restore it. Restore the most recent backup to a scratch database, run the app's migrations check, count key tables, and record how long it took. Report RPO (data you'd lose) and RTO (time to be back). Then say plainly whether the current setup meets what the project claims.

## Report

```
## Database — <scope>
Engine: <postgres 16>  Access: <prisma 5>  Migrations: <n> pending

| # | Severity | Object | Issue | Evidence | Fix |
|---|----------|--------|-------|----------|-----|
| 1 | 🔴 | orders.customer_id | FK with no index; delete of a customer scans 4M rows | EXPLAIN: Seq Scan, 2.1s | create index concurrently |

Migration: up ✓ down ✓ re-up ✓ on a data copy · lock profile: <none/brief/table rewrite>
Queries: <before> → <after> (EXPLAIN ANALYZE, median of 3)
Backup: restore verified <date> · RPO <n>h · RTO <n>min
```

## Rules
- Never write a migration without its reverse, and never trust one that hasn't run against real data.
- Never add an index without naming the query it serves, and never keep one that doesn't change the plan.
- Constraints in the database, not only in the application — the application is not the only writer.
- Optimize only what a measurement identified; report before/after or don't claim a gain.
- Destructive operations need explicit confirmation and a retention answer.
- Never run any of this against production data without the user's explicit instruction; anonymized copies for everything else.
