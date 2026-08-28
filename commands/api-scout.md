---
description: Find and evaluate the public/open APIs that can serve a need — capability, pricing, limits, auth, freshness, ToS — with a scored recommendation
argument-hint: "<what you need> [--free-only] [--self-host] [--top N]"
---

# /api-scout — Public API Discovery & Evaluation

## Usage
```
/api-scout <capability you need>
/api-scout geocoding for european addresses, 50k lookups/month
/api-scout --free-only          — only APIs with a usable free tier
/api-scout --self-host          — include self-hostable/open-source alternatives
/api-scout --top 3              — how many candidates to evaluate deeply (default 4)
```

## Overview
"Which API should we use?" is a decision that outlives the sprint: it sets your cost curve, your uptime ceiling, your data-residency story, and how hard it is to leave. This skill searches the live market, evaluates candidates against **your** constraints, and produces a scored recommendation you can defend — not a link dump.

It ends where `/integrate` begins.

---

## Phase 1: Turn the need into requirements

Before searching, pin down what actually disqualifies a candidate:

```
Capability:   <the operation you need, precisely>
Volume:       <requests/month, peak rate>
Latency:      <acceptable p95, sync or batch>
Data:         <what you send — PII? payment data? health data?>
Residency:    <EU/US constraints, GDPR, no-training clauses>
Budget:       <€/month ceiling, and what happens above it>
Coverage:     <geographies, languages, formats you must support>
Reliability:  <SLA needed? degradation acceptable?>
Exit cost:    <how coupled can we afford to be?>
```

Anything unstated becomes an assumption printed in the report.

## Phase 2: Search the live market

Never answer from memory — API pricing, limits and even existence change monthly. Search now, with `WebSearch`/`WebFetch`, and cover these lanes:

| Lane | Where to look |
|---|---|
| **Registries** | APIs.guru (OpenAPI directory), public-apis lists, ProgrammableWeb-style directories, RapidAPI Hub, Postman Public API Network |
| **Marketplace/native** | The cloud providers you already run on (their managed service is often the cheapest path), your existing vendors' adjacent products |
| **Open source / self-host** | The self-hostable equivalent (Nominatim vs a geocoding SaaS, Meilisearch vs a search API) — `--self-host` makes this mandatory |
| **Open data** | Government/public datasets and their official APIs — often free, authoritative, and rate-limited |
| **Aggregators** | Unified APIs that wrap many vendors (one integration, more coupling, extra latency) |
| **What the ecosystem uses** | The library/framework your stack already integrates with — an existing SDK is a real cost saving |

Collect 6–12 candidates, then shortlist `--top N` (default 4) against the hard disqualifiers.

## Phase 3: Evaluate each candidate against the primary sources

For each shortlisted API, read the vendor's own pages (pricing, docs, status, ToS) — not a blog summary:

| Dimension | What to record |
|---|---|
| Capability fit | Does it do the exact operation, at the coverage you need? Note the gaps |
| Pricing | Free tier limits, price per unit at your volume, overage behavior, annual commitments, hidden per-seat/per-project fees |
| Rate limits | Documented RPS/quota, burst policy, how to raise it |
| Auth | Key · OAuth2 · HMAC · mTLS — and whether it's usable from your runtime |
| API quality | OpenAPI/GraphQL schema published? Idempotency? Cursor pagination? Sane errors? Webhooks? |
| Freshness | Last API version/changelog entry, deprecation policy, breaking-change history |
| SDKs | Official SDK for your language, its maintenance state (last release, open issues) |
| Reliability | Public status page, historical incidents, SLA (and whether it has teeth) |
| Data & legal | Where data is processed, retention, sub-processors, training on your data, GDPR/DPA availability, attribution requirements |
| Lock-in | Proprietary identifiers, exportability, a migration path to a competitor |
| Support | Docs quality, sandbox, community size, response channel |

Where a claim is missing or unverifiable, write `unknown` — never fill a gap with a plausible guess.

## Phase 4: Score & recommend

Weight the dimensions by *this* project's constraints (state the weights), then:

```
## API Scout — <capability>

Requirements: <volume · latency · residency · budget · coverage>

| Candidate | Fit | Cost @<volume> | Limits | Auth | Freshness | Lock-in | Score |
|---|---|---|---|---|---|---|---|
| <A> | full | €120/mo | 50 rps | OAuth2 | active, v3 2026-05 | medium | 8.4 |
| <B> | partial (no <x>) | free ≤10k | 5 rps | key | last change 2023 | low | 6.1 |
| <C> self-hosted | full | infra ~€40/mo + ops | none | none | active | none | 7.2 |

**Recommendation: <A>** — <two sentences: why it wins, and what it costs you>
**Runner-up: <C>** — pick this instead if <the condition that flips the decision>
**Rejected:** <name> — <the disqualifier, one line each>

Risks: <price cliff at X volume · single region · no SLA on the free tier>
Exit plan: <what a migration to the runner-up would cost>
Unknowns: <what could not be verified, and how to verify it — usually a sandbox test>
```

## Phase 5: Prove it before committing

For the recommendation, run the cheapest possible reality check before the integration lands:
1. Sign up for the sandbox/free tier.
2. Make the three calls the feature actually needs and record real payloads (redacted) — docs lie, payloads don't.
3. Measure latency from your infra's region, and confirm the rate-limit headers exist.
4. Then hand off: `/integrate <chosen api> <what you need>`.

Log the choice with `/decisions` (options considered, why this one) — a vendor choice is exactly the kind of decision the log exists for, and it escalates to an ADR when it's a one-way door.

## Rules
- Search the live web every run. Never quote pricing, limits, or availability from memory — those are the fields that change fastest.
- Cite the URL for every price and limit in the table; an uncited number is an unknown.
- Always evaluate at least one self-hostable or open-data alternative before recommending a paid SaaS.
- Never recommend an API whose ToS conflicts with the data being sent (PII, payment, health) — that's a disqualifier, not a tradeoff.
- Name the disqualifier for every rejected candidate; "worse" is not a reason.
- The recommendation includes its exit cost. An integration you can't leave is a decision, not a default.
