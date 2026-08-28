---
description: Technical debt — inventory it, cost it in business terms, prioritize, and negotiate the time to fix it
argument-hint: "[--inventory] [--cost] [--pitch] [--plan]"
---

# /tech-debt — Debt Inventory & Negotiation

## Usage
```
/tech-debt --inventory     — find and classify the debt, with evidence
/tech-debt --cost          — what it costs per month, in time and risk
/tech-debt --pitch         — the case for fixing it, for a non-technical decision-maker
/tech-debt --plan          — a repayment plan that fits inside normal delivery
```

## Overview
"We need to refactor" loses every argument against "we need this feature". Not because stakeholders are short-sighted, but because one side is quantified and the other isn't. This skill quantifies the debt — **in delay, risk and money** — and turns it into a proposal a non-technical person can decide on.

The framing that works: debt isn't mess, it's a **loan**. It bought speed at some point, that was often the right call, and it now charges interest. The question is never "is this ugly" — it's "what is the interest, and is refinancing worth it now?"

---

## Phase 1: Inventory with evidence (`--inventory`)

Opinion doesn't survive a budget conversation; data does. Gather:

| Signal | Command / source | What it shows |
|---|---|---|
| Churn hotspots | `git log --format= --name-only --since=1.year | sort | uniq -c | sort -rn | head -20` | Files changed constantly — where the cost is paid |
| Bug density | `git log --oneline --since=1.year -- <path> | grep -ci fix` | Where defects cluster |
| Ownership risk | `git shortlog -sn -- <path>` | A file only one person can touch |
| Coupling | Imports crossing module boundaries | Why every change spreads |
| Coverage of the risky paths | Test report on the hotspots | Where a change is a gamble |
| Dependency risk | `/api-refresh`, `/upgrade --assess` | EOL runtimes, CVEs, majors behind |
| Operational pain | Incident history (`/incident`), deploy failure rate | What wakes people up |
| Onboarding friction | `/devex-review` score | Time from clone to first change |

The intersection is what matters: **high churn × high bug density × low coverage** is your debt, ranked. Everything else is aesthetics, and aesthetics don't get funded (`/health` produces this dashboard on a schedule).

## Phase 2: Cost it (`--cost`)

Convert each item into a monthly number, with the arithmetic shown:

```
| Debt | Interest paid monthly | Evidence | Risk if untouched |
| Order module: 4 devs afraid to touch it, no tests | ~6 days/month of extra caution + rework | 11 fix-commits in 3 months, 3 regressions | a bug in checkout that nobody can fix quickly |
| Node 16 (EOL) | 0 today | — | no security patches; a CVE becomes an emergency; blocks 3 library upgrades |
| Manual deploy, 40 min | 3 days/month across the team | deploy log | releases are batched, so each one is riskier |
| No staging environment | 1–2 days/month of production incidents | incident log | every deploy is the test |
```

Two categories, and they argue differently:
- **Interest** (recurring cost): multiply days by cost, and it becomes an ROI calculation.
- **Risk** (probability × impact): a low-probability event with a very high cost. Never inflate it — one exaggerated risk claim discredits the whole list.

## Phase 3: Make the case (`--pitch`)

Two paragraphs, no jargon, decision-ready:

```
Today, changing the order module takes 3 days for what should take half a day, because
it has no tests and four systems depend on it directly. That's about 6 developer-days a
month, and it's why the last two releases each carried a regression.

Two weeks of work would bring it to the level of the rest of the codebase. It pays for
itself in about two and a half months, and it removes the main source of regressions in
checkout. I propose we do it during the <X> phase, where the feature work is lighter, and
I'll report the effect on delivery time after a month.
```

What makes it land: their language (delay, risk, cost — not coupling and cyclomatic complexity), a **payback period**, a *bounded* proposal (two weeks, not "an ongoing refactoring effort"), and a **measurable** promise you'll come back and report on.

What sinks it: asking for a rewrite (`/refactor --strangler` exists so you don't have to), asking for an open-ended allocation, or moralizing about the past. The debt was often a correct trade at the time — say so; it makes you credible.

## Phase 4: Repay it inside normal delivery (`--plan`)

The debt that gets fixed is the debt attached to feature work:
1. **Boy-scout rule, scoped**: when you touch a file for a feature, improve that file — bounded, in a separate commit (`/refactor`).
2. **A standing allocation** (e.g. 15–20% of each sprint) is worth negotiating once rather than fighting for per item.
3. **Attach the repayment to the feature it blocks**: "this feature needs the order module split anyway; that's 3 of the 8 days" — funded work with a business reason.
4. **Never mix** the refactor and the feature in one commit — that's how a debt-repayment gets blamed for a regression, and how the next one gets refused.
5. Fix the **dangerous** debt first (security, EOL runtimes, data-loss risk), not the annoying debt.
6. **Report the effect** afterwards: lead time, regression count, deploy duration. A repayment whose benefit was measured makes the next one an easy yes; one that was never measured makes it a hard no.

Also: stop adding to it silently. New debt taken deliberately gets a `/decisions` entry ("shipped without X because Y; cost to fix later ≈ Z") so it's a recorded loan, not a surprise.

## Rules
- Every debt item carries evidence and a monthly cost; unquantified debt does not get funded, and shouldn't.
- Speak in delay, risk and money — never in complexity metrics — to a non-technical audience.
- Propose bounded work with a payback period, never an open-ended refactoring budget.
- Fix dangerous debt before annoying debt.
- Never mix debt repayment with feature changes in the same commit.
- Measure and report the effect afterwards; that measurement is what buys the next repayment.
- Record new debt deliberately taken, with its future cost — an unrecorded shortcut is the debt nobody can argue for later.
