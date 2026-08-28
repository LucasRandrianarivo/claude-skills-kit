---
description: Feature flags & experiments — rollout, kill switches, targeting, A/B tests, and paying down flag debt
argument-hint: "[--add <flag>] [--audit] [--experiment] [--cleanup]"
---

# /flags — Feature Flags & Experiments

## Usage
```
/flags --add checkout-v2      — add a flag with its rollout and removal plan
/flags --audit                — audit existing flags: stale, risky, untested paths
/flags --experiment           — design an A/B test that can actually conclude
/flags --cleanup              — remove flags whose decision has been made
```

## Overview
Feature flags decouple **deploy** from **release**, which is the single biggest lever on shipping safely — and they are the fastest way to rot a codebase if nobody removes them. Two rules carry most of the value: **every flag has a removal date at creation**, and **the off path is tested, not assumed**.

For mobile, flags are more than convenience: they are the only rollback that doesn't wait for app review (`references/mobile.md`).

---

## Phase 1: Know which kind you're adding

| Kind | Lifetime | Owner | Removal |
|---|---|---|---|
| **Release flag** | Days–weeks | The shipping engineer | Deleted right after full rollout |
| **Kill switch** | Permanent | The service owner | Never — but tested regularly |
| **Experiment** | The test's duration | Product/data | Deleted when the decision is made |
| **Permission / entitlement** | Permanent | Product | Not a flag — it's authorization (`/auth`), keep it out of the flag system |
| **Ops toggle** (degrade a feature under load) | Permanent | Ops | Documented in the runbook (`/incident`) |

Mislabeling is what creates flag debt: an experiment left running for a year, a release flag that became permanent configuration nobody understands.

## Phase 2: Implement it well

- **One evaluation point per decision**, as high in the stack as possible. A flag checked in eleven places has eleven code paths, and the eleventh is the one nobody tested.
- **Default is the safe value** — if the flag service is unreachable, the app serves the old behavior. Never let a flag lookup fail the request; cache the last known values and set a timeout.
- **Deterministic bucketing**: hash `(flagKey, stableUserId)` so a user gets the same variant on every request and every device. Random assignment per request makes an inconsistent product and an unanalyzable experiment.
- **Server-side evaluation** for anything security- or price-relevant. A client-side flag is a suggestion — it is visible in the bundle and modifiable by the user, so it never gates access to data (`/auth`).
- **Emit the exposure event** (who saw which variant, when) at the point of evaluation — an experiment without exposure logging cannot be analyzed correctly.
- **Both paths must work**: run the test suite with the flag on *and* off for the critical ones. "It's behind a flag" is not a substitute for tests; it's a reason to have two.

## Phase 3: Roll out

1. Off in production; deploy the code.
2. Internal users → 1% → 5% → 25% → 50% → 100%, each step held long enough for the metrics to speak (`/observability`).
3. Watch, at every step: error rate, latency, and the **business metric the feature is supposed to move** — plus a guardrail metric it must not break (checkout conversion, signup rate).
4. Any regression → flip off first, investigate second (`/incident`). The whole point of the flag is that this costs seconds.
5. At 100% and stable: **delete the flag and the old path** within the agreed window. This is the step everyone skips, and it is the entire reason flags get a bad reputation.

## Phase 4: Experiments (`--experiment`)

Before starting, write down all of it — an experiment defined after the data arrives is a story, not a result:
```
Hypothesis: <change> will increase <primary metric> by <effect size> because <reason>
Primary metric: <one — not three>
Guardrails: <metrics that must not degrade>
Unit: user (not session — a user must not switch variants)
Sample size: <n per arm, from the baseline rate and the effect you'd act on>
Duration: <≥ 1–2 full business cycles, i.e. whole weeks>
Decision rule: <what result ships, what result reverts> — decided now
```
Then the discipline: no peeking-and-stopping when it looks good (that inflates false positives), no adding metrics after the fact, no reading a segment you didn't pre-register, and count the **novelty effect** — a change often lifts numbers for a week because it's new. If the result is flat, the honest conclusion is "no measurable effect", and shipping it anyway is a product decision, not a data one.

Most teams don't have the traffic for meaningful A/B tests on small effects — say so when that's the case, and prefer a staged rollout with guardrails.

## Phase 5: Audit & cleanup (`--audit`, `--cleanup`)

```
## Flags Audit
| Flag | Kind | Age | State | Eval points | Removal due | Verdict |
| checkout-v2 | release | 214d | 100% on | 7 | overdue | delete flag + old path |
| new-pricing | experiment | 63d | 50/50 | 2 | concluded 30d ago | ship winner, delete |
```
Findings: flags older than their window; flags at 0% or 100% for months (a decision already made — the code just doesn't know); flags whose off path no longer compiles or is untested; client-side flags gating anything sensitive; nested flags (a combinatorial explosion nobody has tested); and flags with no owner.

Cleanup is a code change, not a config change: delete the flag, delete the dead branch, delete the tests for the dead branch, and check nothing else read that key.

## Rules
- Every flag is created with an owner, a kind, and a removal date. No exceptions for "temporary".
- The default value is the safe one, and the app works when the flag service does not.
- Bucketing is deterministic per user; exposure is logged where the flag is evaluated.
- Never gate data access or pricing with a client-side flag.
- Both branches are tested while the flag exists.
- An experiment's metric, sample size, duration and decision rule are written before it starts — and the flag is deleted once the decision is made.
