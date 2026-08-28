---
description: Deliver the project — handover package, documentation, runbook, access transfer, training, warranty and sign-off
argument-hint: "[--client] [--internal] [--handover]"
---

# /delivery — Handover & Sign-Off

## Usage
```
/delivery                  — assemble the full delivery package
/delivery --client         — client handover (docs, training, access, sign-off)
/delivery --handover       — internal handover to another team (ops, support, maintenance)
```

## Overview
The gap between "it works in production" and "it's delivered" is where projects rot: nobody knows how to restart it, the domain is in a freelancer's account, the only person who understands the migration left, and the client's team was never trained. This skill closes that gap with a checklist that assumes **the person taking over knows nothing and cannot ask you**.

Saved to `.claude/project/<slug>/delivery.md`.

---

## Phase 1: Preconditions

Delivery does not start until:
- [ ] Acceptance passed (`/validate`): no S1/S2 open, reserves listed with dates
- [ ] Production deployed and stable (`/deploy` → `/canary` green over the watch window)
- [ ] Backups running **and a restore verified** — an untested backup is not a backup
- [ ] Monitoring and alerting live, with a named recipient
- [ ] Security pass done on the delivered scope (`/security-review`, `/cso` if the CDC required it)
- [ ] No credentials in the repository or in any delivered document

Missing items are listed as blockers with an owner, not quietly skipped.

## Phase 2: The delivery package

### Documentation
| Document | Contains | For |
|---|---|---|
| README | Clone → run → test → build, verified from a clean machine | Any developer |
| Architecture | Components, data flows, external dependencies, a diagram (`/diagram`) | Maintainer |
| ADRs (`docs/adr/`) | Why the structuring decisions were made | Future maintainer |
| Runbook | Deploy, rollback, restart, restore, rotate a key, common incidents with their fix | Ops / on-call |
| API documentation | The contract, generated from the source of truth (`/contract`) | Integrators |
| User guide | The main flows, in the user's language, with screenshots | End users |
| Admin guide | User management, configuration, exports, back-office | Client admin |

Each document is verified by **doing what it says** — a README nobody ran is fiction. Follow it from a clean state, note every friction point, fix the document (`/devex-review` does this systematically).

### Environments & access
```
| Item | Where | Owner after delivery | Transferred |
| Production hosting | <provider/account> | client | ✓ |
| Domain & DNS | <registrar> | client | ✓ |
| TLS certificates | <source, auto-renew?> | client | ✓ |
| Repository | <url> | client org | ✓ |
| CI/CD | <provider> | client | ✓ |
| Third-party APIs | <vendors, whose account, who pays> | client | ✓ |
| Secrets | <vault/manager — never in a document> | client | ✓ |
| Monitoring / error tracking | <tools> | client | ✓ |
```

**Everything moves to accounts the client owns.** A production system depending on a provider's personal account is a delivery defect, not a detail. Rotate every credential that was shared during the project, and say so.

### Code & data
- Tagged release matching the accepted build; changelog (`/release-notes`)
- Migrations reversible and documented; seed/reference data included
- Test suite green on the delivered commit, with the command to run it
- Licenses of dependencies reviewed against the project's constraints

## Phase 3: Training & transfer

- A live session per audience (end users, admins, maintainers) with a scenario, not a slideshow — they do the operations themselves.
- Record it, or write the equivalent short guide; six months later, the recording is the only surviving memory.
- The maintainer session covers, at minimum: deploy, rollback, restore from backup, read the logs, rotate a key, and the three most likely incidents from the runbook.
- Collect the questions asked — every one of them is a hole in the documentation. Fix them before sign-off.

## Phase 4: Warranty & support

State plainly, in writing:
```
Warranty:     <n months> on defects against the CDC, from <date>
Covered:      S1/S2 defects on delivered requirements; the reserves listed in acceptance
Not covered:  new requests, third-party changes, environment changes made by the client
Response:     S1 <delay> · S2 <delay> · S3 <next release>
Channel:      <how to report, where it's tracked>
Change requests: quoted separately (→ /cdc amendment)
```

## Phase 5: Sign-off

```
## Delivery — <project>
CDC v<n> · Accepted <date> (<verdict>) · Build <sha> · Tag <version>

Delivered: <deliverable list from CDC §7, each ✓ with its location>
Reserves:  <S3 defects, fix deadlines>
Access:    <n>/<n> transferred (see table)
Training:  <sessions held, dates, attendees>
Warranty:  <period, scope, channel>
Left undone / deferred: <what, why, where it's tracked>

Signed: <client> ____________  <supplier> ____________  Date: ______
```

Then run `/retro` on the project itself: what was estimated vs actual, what churned, what to change on the next one. And log the durable lessons with `/learn` — a delivery that teaches nothing is a delivery half-used.

## Rules
- Never deliver with an untested backup, an unverified README, or credentials in a document.
- Every access moves to a client-owned account; every shared credential is rotated at handover.
- Documentation is verified by execution, not by review.
- Deferred items are listed explicitly with where they're tracked — silence about them is how disputes start.
- Warranty scope is written down before sign-off, not negotiated after the first incident.
- The person taking over knows nothing and cannot ask you: read every document with that assumption before delivering.
