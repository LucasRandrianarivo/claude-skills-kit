---
description: Acceptance / recette — validate the delivery against the CDC requirement by requirement, with a defect grid and a sign-off verdict
argument-hint: "[phase or milestone] [--uat] [--regression] [--report-only]"
---

# /validate — Acceptance Testing (Recette)

## Usage
```
/validate                    — validate the current phase against the CDC
/validate phase 2
/validate --uat              — produce the user acceptance script for a human tester
/validate --regression       — re-run a previous acceptance round after fixes
```

## Overview
Acceptance is not "the tests pass". It's: **every requirement in the CDC is demonstrated to be satisfied, in a production-like environment, by exercising it** — and everything that isn't gets a defect with a severity that decides whether delivery proceeds.

The CDC's F-xx/N-xx identifiers are the checklist. Nothing is accepted that wasn't specified; nothing specified is skipped.

Saved to `.claude/project/<slug>/validation-<phase>-<date>.md`.

---

## Phase 1: Set the stage

1. Read the CDC (current version, including amendments) and select the requirements in scope for this phase.
2. Establish the environment: staging or a production-like build, **with realistic data volumes** — a list that works with 12 rows and dies at 12,000 is a defect acceptance is meant to find.
3. Prepare the test identities: each role in the CDC (admin, standard user, unauthenticated, a user with no data), because permission defects only appear across roles.
4. Note the build under test: commit SHA, version, environment URL. An acceptance report without a build reference can't be reproduced.

## Phase 2: Execute, requirement by requirement

For each requirement, run its acceptance criteria **as written in the CDC**, and record evidence:

```
| Req | Criterion | Steps | Expected | Observed | Verdict | Evidence |
| F-01 | Reset link valid 1h, single-use | request reset · use link · reuse link | 2nd use rejected | 2nd use logs in | ✗ | screenshot, 14:22 |
```

Cover, for every functional requirement:
- The **nominal** path.
- The **error** paths the CDC specifies (and the ones it should have: wrong input, expired session, denied permission, missing data).
- The **limits**: empty state, one item, many items, maximum field lengths, special characters, a second language if the CDC requires one.
- **Concurrency** where it matters: two users acting on the same object.

And for every non-functional requirement, run its stated verification method — not a proxy for it:
- Performance → the load/measurement the CDC specified (`/web-vitals`, `/benchmark`)
- Accessibility → `/a11y` at the specified level
- Security → `/security-review` on the delivery scope, `/cso` if the CDC demands a full audit
- Compatibility → the device/browser matrix as written
- Availability/backup → an actual **restore test**, not a backup that exists

## Phase 3: Defect grid

Every failure becomes a defect with a severity that is agreed **before** the round, not argued after:

| Severity | Definition | Effect on acceptance |
|---|---|---|
| **S1 Blocking** | A specified requirement cannot be used; data loss; security hole | Blocks acceptance |
| **S2 Major** | Requirement works only partially, or with a workaround that isn't acceptable | Blocks acceptance unless explicitly waived, in writing |
| **S3 Minor** | Cosmetic or edge-case defect, workaround exists | Accepted with reserve, fixed in the warranty window |
| **S4 Remark** | Suggestion, out of CDC scope | Recorded as a change-request candidate |

Each defect: requirement ID · steps to reproduce · expected vs observed · environment · severity · evidence. A defect nobody can reproduce is a defect nobody will fix — reproduce it twice before filing.

**Out-of-scope requests** discovered during acceptance are logged as S4/change requests against the CDC, not as defects. That distinction is what keeps a delivery from being held hostage by new ideas.

## Phase 4: Verdict

```
## Acceptance — <project> / phase <n>
Build: <sha> · Env: <url> · Date: <date> · CDC v<n>

Requirements: <n> tested · <n> ✓ · <n> ✗ · <n> not testable (<why>)
Defects: S1 <n> · S2 <n> · S3 <n> · S4 <n>

| Req | Verdict | Defect |
|-----|---------|--------|

Verdict: ACCEPTED | ACCEPTED WITH RESERVES | REFUSED
Reserves: <S3 defects accepted, with their fix deadline>
Blocking: <S1/S2 defects that must be fixed and re-validated>
Next round: <date, scope — only the failed requirements plus a regression pass>
```

`ACCEPTED WITH RESERVES` is the honest common case: no S1/S2, some S3 fixed under warranty. Say which, with dates.

## Phase 5: Re-validation (`--regression`)

After fixes:
1. Re-run **only** the failed requirements — plus a regression pass over the requirements whose code the fixes touched (ask what changed; don't guess).
2. A fix that breaks a previously-passing requirement is an S1 regression, whatever its original severity.
3. Update the same report with round 2, keeping round 1's history — the trend across rounds is what tells you whether the delivery is converging.

## Phase 6: UAT script (`--uat`)

Produce a script a non-technical tester can follow without help: numbered steps in the user's language, the expected result at each step, a place to note what they saw, and the test accounts. No jargon, no assumed context, one flow per page.

## Rules
- Test against the CDC as written; if a criterion is ambiguous, raise it as a question — never interpret it in the delivery's favor.
- Evidence for every verdict: screenshot, log, command output, timestamp.
- Never mark a requirement passed on code reading; acceptance is about executing the system.
- Realistic data volumes and every role, always.
- New requests during acceptance are change requests against the CDC, not defects.
- The verdict is stated plainly, including when it's REFUSED. A delivery declared accepted while S1 defects stand is a bigger problem than the defects.
