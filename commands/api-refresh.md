---
description: Keep every integration current — inventory APIs/SDKs in use, detect version drift, deprecations and breaking changes, produce a migration plan
argument-hint: "[vendor] [--inventory] [--check] [--plan] [--apply]"
---

# /api-refresh — API & SDK Freshness

## Usage
```
/api-refresh                 — full pass: inventory → check → plan
/api-refresh stripe          — one vendor
/api-refresh --inventory     — just map what this project integrates with
/api-refresh --check         — just detect drift and deprecations
/api-refresh --plan          — produce the migration plan, change nothing
/api-refresh --apply         — execute the plan's safe items, one vendor at a time
```

## Overview
Integrations rot silently. A pinned API version gets sunset, an SDK goes two majors behind, a field you read is deprecated, an auth scheme is retired — and nothing breaks until the day the vendor turns it off. This skill finds that decay **before** the vendor's deadline, and turns it into a ranked, executable migration plan.

Every claim here comes from a live source (vendor changelog, deprecation page, registry metadata), never from memory.

---

## Phase 1: Inventory — what do we actually integrate with?

Build the real list; do not trust the README.

1. **From the manifest**: every dependency that is a vendor SDK or HTTP client wrapper (`package.json`, `requirements.txt`/`pyproject.toml`, `go.mod`, `composer.json`, `Gemfile`, `pom.xml`). Record installed vs latest.
2. **From the code**: grep for outbound base URLs and version markers — `https://api.`, `api-version`, `/v1/`, `Stripe-Version`, `X-API-Version`, GraphQL endpoints, webhook receivers (inbound integrations count).
3. **From config**: env var names pointing at vendors, service configs, terraform/compose service definitions.
4. **From the docs the kit already keeps**: `docs/integrations/*`, `.claude/decisions.jsonl` vendor entries, contract artifacts.

```
| Vendor | Kind | Pinned version | SDK@installed | Latest | Where | Criticality |
|---|---|---|---|---|---|---|
| Stripe | REST + webhook | 2024-06-20 | stripe@14.2.0 | 18.x | services/billing/ | payments — critical |
```

Criticality = what breaks for users if this vendor's call fails. It drives the ranking later.

## Phase 2: Check — fetch the live truth per vendor

For each vendor, read the primary sources now (`WebFetch`/`WebSearch`): changelog, API version/upgrade page, deprecation notices, status/announcement blog, and the SDK's releases/CHANGELOG on its repo.

Record:

| Signal | What to capture |
|---|---|
| **Current API version** | vs the version you're pinned to, and how many versions behind |
| **Deprecations** | Endpoints, fields, params, auth schemes marked deprecated — **with their sunset dates** |
| **Breaking changes** | Between your version and current: removals, renames, type/nullability changes, new required params, error-shape changes |
| **Sunset deadlines** | Hard dates. These set the priority order, not your preferences |
| **SDK majors** | How many majors behind, and each major's migration guide |
| **Auth changes** | Retired schemes (basic → OAuth), new required scopes, key rotation policies |
| **New capabilities** | Something that would let you delete code (a batch endpoint, a webhook you're polling for) |
| **Security advisories** | CVEs in the SDK/transitive deps (`npm audit`, `pip-audit`, `govulncheck`, GitHub advisories) |

Then check **your** usage against it: for every deprecated field/endpoint, grep the codebase for actual call sites. A deprecation you don't use is noise; one you use daily is work.

## Phase 3: Report the drift

```
## API Freshness — <project>

| # | Vendor | Issue | Sunset | Used here | Effort | Risk if ignored |
|---|--------|-------|--------|-----------|--------|-----------------|
| 1 | Stripe | API 2024-06-20 → 2026-08; `charges.*` removed | 2026-11-01 | services/billing/charges.ts:40 (12 calls) | M | payments stop working |
| 2 | Twilio | SDK 4 → 7, auth token → API key | none | 3 call sites | S | none yet, growing |
| 3 | <lib> | CVE-2026-xxxx, high | — | transitive | S | vulnerable in prod |

Deadline board: <sorted by sunset date — the only ordering that matters>
```

Severity:
- 🔴 **Dated**: a sunset date exists and you use the removed surface. Schedule it now; the date is not negotiable.
- 🟡 **Drifting**: majors behind, deprecated-but-alive usage, auth scheme on the way out.
- 🔵 **Opportunity**: newer API that removes code you maintain (polling → webhook, N calls → one batch call).

## Phase 4: Plan

One migration unit per vendor, never a "upgrade everything" PR:

```
### <Vendor>: <from> → <to>   [🔴 sunset 2026-11-01]

Blast radius: <files, endpoints, jobs, webhooks>
Breaking changes affecting us: <list, each with its call sites>
Steps:
  1. Pin/bump the SDK; read the migration guide's breaking-change list end to end
  2. Update the client module (auth, params, response mapping) — one module, per /integrate
  3. Update the typed boundary + fixtures to the new payload shapes
  4. Re-record sandbox fixtures; run the integration tests
  5. Verify in sandbox against the *new* API version before switching production's pin
  6. Roll out: <flag / staged / version-pin flip>, with the rollback move stated
Verification: <the command and the sandbox call that prove it>
Rollback: <how, and how fast>
```

Sequence the units by sunset date first, criticality second, effort last.

## Phase 5 (`--apply`): Execute, one vendor at a time

1. One vendor per branch/PR. Never mix two vendor migrations — a failure must be attributable.
2. Apply the plan's steps; re-record fixtures rather than hand-editing them.
3. Run: unit + integration tests, typecheck, lint, and the sandbox smoke test against the new version.
4. Where the vendor supports it, test with the new API version pinned in a non-production environment for a full cycle before flipping production.
5. Hand off to `/pr-review` (the `specialist-integration` and `specialist-api-contract` agents apply directly) and `/ship`.
6. Update `docs/integrations/<vendor>.md` with the new pinned version and date; log a `/decisions` entry.

## Phase 6: Make it recurring

Freshness is a habit, not a project:
- Write the report to `.claude/reports/api-refresh-<date>.md` so the next run diffs against it.
- Enable the ecosystem's automation where the repo has CI: Dependabot/Renovate for SDKs, `npm audit`/`pip-audit`/`govulncheck` in the pipeline (see `/cicd`).
- Add the earliest sunset date to the report header so it's visible at a glance next run.

## Rules
- Every version number, deprecation and sunset date comes from a live vendor source, cited. Never from memory — this is exactly the data that goes stale.
- A deprecation you don't call is reported but never scheduled; grep before ranking.
- Never bump a major "because it's newer": each bump needs a reason (sunset, CVE, capability) and a verification step.
- Never mix vendors in one migration.
- Never flip a production API version pin without a sandbox run on that exact version.
- Security advisories jump the queue, regardless of sunset dates.
