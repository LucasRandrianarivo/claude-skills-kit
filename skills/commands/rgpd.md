---
description: GDPR/RGPD compliance in the codebase — data mapping, legal basis, consent, retention, subject rights, breach readiness
argument-hint: "[--audit] [--map] [--dsr <export|delete>] [--cookies]"
---

# /rgpd — Privacy & GDPR Compliance (technical)

## Usage
```
/rgpd --audit            — audit the codebase against GDPR obligations
/rgpd --map              — build the data map: what personal data, where, why, how long
/rgpd --dsr export       — implement subject access / export
/rgpd --dsr delete       — implement erasure, including the hard parts
/rgpd --cookies          — cookie and tracker audit + consent gating
```

## Overview
GDPR obligations become **code**: a retention policy is a deletion job, consent is a gate the tracker checks, the right to erasure is a cascade that must not break foreign keys, and a breach notification depends on logs you either kept or didn't. This skill covers that technical half.

It does not replace legal advice. It produces the map, the mechanisms and the gaps; **the legal basis, the DPO's decisions, the DPA signatures and the privacy policy wording are the organization's call** — flag them, don't invent them.

Field notes: `.claude/references/security.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1 (`--map`): Data map — you cannot comply with what you can't list

Go through the database schema, logs, analytics, third parties, and file storage. For every personal data item:

```
| Data | Where | Category | Legal basis | Purpose | Retention | Recipients (processors) |
| email | users.email, Sentry, Mailgun | identifying | contract | account, notifications | account life + 3 years | Mailgun, Sentry |
| IP | nginx logs, analytics | identifying | legitimate interest | security | 12 months | — |
| health data | — | **special category** | — | — | — | — |
```

Special categories (health, biometrics, religion, political views, sexual orientation, union membership) and children's data have stricter rules — flag any occurrence loudly; if the schema holds them without an obvious basis, that's the top finding.

Don't forget the places data hides: application logs, error trackers (stack traces with request bodies), analytics, backups, CI artifacts, support tickets, LLM prompts sent to a third party, and spreadsheets exported by the team.

## Phase 2: Principles, as code

| Principle | What it means in the codebase |
|---|---|
| **Minimization** | Every column justified by a purpose. Collecting a birthdate "in case" is a finding |
| **Purpose limitation** | Data collected for X not silently reused for Y (analytics on data gathered for billing) |
| **Retention** | Every table with personal data has a retention period **and an actual job that enforces it**. A policy in a document is not a policy |
| **Accuracy** | The user can correct their data |
| **Integrity & confidentiality** | Encryption in transit and at rest, least-privilege access, no production data in dev/staging (`/env`), anonymized dumps only |
| **Accountability** | Records of processing, DPAs with processors, and the audit trail of privileged access (`/auth`) |
| **Privacy by design/default** | The most private setting is the default; opt-in, never pre-checked |

## Phase 3: Consent & trackers (`--cookies`)

- **Nothing non-essential loads before consent** — no analytics, no ad pixels, no session recorder, no third-party fonts phoning home. The most common violation is a tag that fires on page load and a banner that only records the answer afterwards.
- Consent is: freely given (reject as easy as accept, same visual weight), specific per purpose, informed, and **withdrawable** as easily as it was given.
- Store the consent record: what, when, which version of the policy, from where. That record is your evidence.
- Audit what actually loads: open the site with an empty profile, list every network request and every cookie/localStorage entry before any interaction, and classify each as strictly necessary or not. Anything non-essential firing pre-consent is a 🔴.
- Session recording and heatmaps capture form input — mask fields or don't use them.

## Phase 4 (`--dsr`): Subject rights, implemented

They have a one-month deadline; a manual process across five systems misses it.

**Access / portability (`export`)**: one command/endpoint producing everything you hold about a person, in a structured, machine-readable format — from every table, plus files, plus what processors hold. Identity must be verified before it's issued (an unauthenticated export is a data breach with extra steps).

**Erasure (`delete`)**: the hard one. Decide and implement, per table:
- **Delete** where nothing depends on it.
- **Anonymize** where the record must survive for legitimate reasons (an order line for accounting): replace identifiers, keep the aggregate, and make it irreversible (no lookup table back to the person).
- **Retain with a legal basis**: invoices (accounting law), fraud/security records — documented, time-bounded, and excluded from erasure with a stated reason.
Then the parts people forget: search indexes, caches, logs, error tracker, email provider, analytics, CDN copies, and **backups** (document the backup retention window and that restored backups get the erasure re-applied).
Cascade must not orphan or break: run the deletion on a copy of production data and verify referential integrity and the app still works afterwards.

**Rectification, restriction, objection**: a way to correct data, to freeze processing, and to opt out of profiling — each with a server-side effect, not just a flag nobody reads.

## Phase 5: Processors, transfers, breaches

- **Processor inventory**: every third party receiving personal data (hosting, email, analytics, error tracking, support, LLM APIs) with a DPA in place and its sub-processors known. An AI API receiving user content is a processor — check whether the contract excludes training on your data.
- **International transfers**: where data physically goes; outside the EEA needs a valid mechanism (adequacy decision or SCCs). Note the region of every service.
- **Breach readiness**: 72 hours to notify. That requires knowing *what* was exposed and *whose* — which requires logs (`/observability`) and the data map above. Write the runbook now, not during the incident (`/incident`).

## Report

```
## RGPD/GDPR Technical Audit

Data map: <n> personal data items across <n> stores · special categories: <n>
Retention: <n>/<n> items with an enforced deletion job
Consent: pre-consent trackers <n> · reject-as-easy-as-accept ✓/✗ · consent records ✓/✗
Subject rights: export <automated/manual/absent> · erasure <automated/manual/absent> (backups covered ✓/✗)
Processors: <n> with DPA · <n> unknown · transfers outside EEA: <list>
Security: prod data in non-prod ✓/✗ · encryption at rest ✓/✗ · access audit ✓/✗

| # | Severity | Where | Obligation at risk | Fix |
|---|----------|-------|--------------------|-----|
| 1 | 🔴 | analytics.ts:12 | tracker fires before consent (art. 6 / ePrivacy) | gate on consent state, block by default |

Legal decisions to confirm with the DPO/counsel: <list — never decided here>
```

## Rules
- Never invent a legal basis, a retention period, or policy wording — produce the options and the technical consequence, and route the decision to the organization.
- Never test with production personal data; anonymized copies only.
- Erasure that leaves the data in logs, backups, or a processor is not erasure — report the full surface.
- Consent gates load, not just recording — a tracker that fires and is later "revoked" already violated.
- An unauthenticated export endpoint is a breach; identity verification is part of the feature.
- Report obligations at risk factually, with the article, and without claiming legal certainty.
