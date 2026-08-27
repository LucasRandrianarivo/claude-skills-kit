---
description: Observability — structured logs, metrics, traces, error tracking, alerts and SLOs that page a human only when it matters
argument-hint: "[--audit] [--instrument <service>] [--alerts] [--slo]"
---

# /observability — Logs, Metrics, Traces, Alerts

## Usage
```
/observability --audit          — what can we actually see today, and what can't we?
/observability --instrument api — add structured logging, metrics and tracing to a service
/observability --alerts         — build alerts that are worth waking someone for
/observability --slo            — define SLIs/SLOs and an error budget
```

## Overview
The question this skill answers: **when it breaks at 3am, can someone find out why without reading the source?** Most projects have logs nobody can query, no request correlation, alerts on CPU nobody acts on, and no alert on the thing that actually breaks — the checkout failing for 4% of users.

Three signals, each answering a different question: **logs** (what happened in this request), **metrics** (how often, how fast, across all requests), **traces** (where the time went across services). You need all three, and you need them joined by a correlation id.

Field notes: `.claude/references/devops.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Audit what exists

1. Inventory: logging library and format, metrics backend, tracing, error tracker (Sentry/Rollbar/Bugsnag), uptime checks, dashboards, alert rules, on-call rotation.
2. Then run the honest test — take a recent real incident (or invent a plausible one) and try to answer, using only what's deployed:
   - Which requests failed, and for which users?
   - Was it one endpoint or everything?
   - Did it start with a deploy? Which one?
   - Where did the time go — app, database, a third party?
   - How many users were affected, and for how long?
   Each unanswerable question is a finding, and it names exactly what to add.

## Phase 2: Structured logs

- **JSON, one event per line**, to stdout — the platform ships them. Never a hand-formatted string a human parses.
- **Every log line carries context**: `timestamp`, `level`, `message`, `service`, `env`, `version` (the deployed SHA), `request_id`/`trace_id`, `user_id`/`tenant_id` where lawful, plus event-specific fields as **fields, not interpolated text** (`{"order_id": 42}`, never `"order 42 failed"`).
- **Correlation id** generated at the edge (or accepted from the caller: `traceparent`), propagated through every call, job, and outbound request, and returned in the response header. Without it, logs are a pile, not a story.
- **Levels that mean something**: `error` = a human must eventually look; `warn` = degraded but handled; `info` = business events (order placed, user registered); `debug` = off in production. If everything is `error`, nothing is.
- **Never log**: passwords, tokens, API keys, full card numbers, session cookies, raw PII beyond what's lawful and necessary. Redact at the logger, not at the call site — the `redact` rule applies (see also `/rgpd` for retention).
- Log **decisions and failures**, not "entering function". A log line should let you reconstruct why the system chose what it did.

## Phase 3: Metrics that matter

Instrument the **RED** signals per endpoint/job, and **USE** for resources:

| Signal | Metric |
|---|---|
| **R**ate | requests/sec by route and status class |
| **E**rrors | 5xx rate, 4xx rate separately, unhandled exception count |
| **D**uration | latency **histogram** (p50/p95/p99) — never an average, which hides every outage |
| Saturation | queue depth, pool utilization, memory, event-loop lag |
| Business | the 3–5 numbers that mean the product works: signups, orders placed, payments succeeded, messages delivered |

Business metrics are the ones that catch the outages infrastructure metrics miss: the servers are green and orders dropped to zero.

Keep cardinality under control: no user id, order id, or raw path in a metric label — that's what logs and traces are for.

## Phase 4: Traces

- Adopt **OpenTelemetry** unless the project already has something equivalent — it's vendor-neutral and every backend ingests it.
- Auto-instrument the framework, HTTP client, and database first; that alone answers "app or database?".
- Add manual spans around the parts you'd otherwise guess about: third-party calls, queue publish/consume, expensive computations, cache lookups.
- Propagate context across async boundaries and job queues — a trace that stops at the queue is a trace that stops at the interesting part.
- Sample: keep 100% of errors and slow requests, sample the rest (head or tail sampling) to control cost.

## Phase 5: Alerts worth waking for

The rule: **alert on symptoms users feel, page only for what needs a human now.**

| Tier | Example | Where it goes |
|---|---|---|
| **Page** | Checkout error rate > 5% for 5 min · service down · payment webhooks failing · error budget burning fast | On-call, now |
| **Ticket** | Disk at 80% · certificate expiring in 14 days · a job's backlog growing steadily | Work queue |
| **Dashboard only** | CPU, memory, request counts | Nowhere — look when investigating |

Every alert must have: a **runbook link** (what to check, what to do — see `/incident`), a threshold justified by data rather than a round number, a duration window that survives a blip, and an owner. An alert nobody can act on gets deleted — alert fatigue is what makes the real page get ignored.

Also alert on **absence**: no orders in 30 minutes during business hours, a cron that didn't run, a queue that stopped consuming. Silence is a failure mode too.

## Phase 6: SLOs (`--slo`)

Pick 2–4 user-facing SLIs (availability of the main flow, latency p95 of the key endpoint, success rate of the critical job), set an SLO you'd actually defend (99.9% is 43 min/month — be honest about the cost), and derive the **error budget**. Then use it: budget spent → reliability work takes priority over features. An SLO with no consequence is decoration.

## Phase 7: Report

```
## Observability Audit — <project>

Logs: <format, backend, correlation ✓/✗, retention>
Metrics: RED ✓/✗ · business metrics <list> · cardinality risk <n>
Traces: <otel/none> · db+http instrumented ✓/✗ · async propagation ✓/✗
Errors: <tracker> · release tagged ✓/✗ · source maps ✓/✗
Alerts: <n> page · <n> ticket · <n> with a runbook · <n> deleted as noise
SLOs: <list, with error budget>

Incident questions answerable today: <n>/5
| # | Severity | Gap | Question it leaves unanswerable | Fix |
```

## Rules
- No correlation id, no observability — fix that before adding dashboards.
- Never log a credential or unnecessary PII; redact centrally, and set a retention.
- Latency is a histogram; an average latency chart is a finding.
- Every alert has a runbook and an owner, or it is deleted.
- Instrument the business, not just the infrastructure — green servers with zero orders is the outage you'll miss.
- Verify by generating a real error and a slow request, then finding both through the tooling. Untested instrumentation is a guess.
