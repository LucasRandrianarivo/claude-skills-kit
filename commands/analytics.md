---
description: Product analytics — tracking plan, event taxonomy, identity, implementation, privacy, and metrics people trust
argument-hint: "[--plan] [--implement <event>] [--audit] [--funnel <flow>]"
---

# /analytics — Product Instrumentation

## Usage
```
/analytics --plan             — design the tracking plan for the product or a feature
/analytics --implement signup — instrument a flow correctly
/analytics --audit            — audit existing tracking: gaps, duplicates, drift, privacy
/analytics --funnel checkout  — instrument and analyze a funnel
```

## Overview
Analytics fails in one of two ways: **nothing is tracked**, so decisions are opinions; or **everything is tracked inconsistently**, so numbers disagree, nobody trusts them, and decisions are opinions anyway. The fix for both is the same: a small, named, documented set of events that answer specific questions.

Start from the question, never from the event. "How many people finish onboarding, and where do they drop?" produces four good events. "Let's track everything" produces four hundred nobody can use.

---

## Phase 1: The tracking plan (`--plan`)

```
| Question we must answer | Event | Properties | Trigger (exactly when) | Owner |
| Where do users drop in signup? | signup_step_completed | step, method, is_invited | server, after the step persists | growth |
```

Rules that make the data usable later:
- **Naming convention, fixed once**: `object_action` in snake_case, past tense (`order_placed`, `invite_sent`). Half a schema in camelCase and half in Title Case is a permanent tax on every query.
- **Properties over event proliferation**: one `order_placed` with `payment_method`, not three events. Properties are filterable; event names are not.
- **Every event has a documented trigger.** "Button clicked" vs "action succeeded" are different numbers, and the difference is the bug behind most funnel disagreements.
- **Prefer server-side** for anything that must be correct — money, conversions, state changes. Ad blockers, network failures, and closed tabs eat 10–30% of client-side events. Track intent client-side, outcomes server-side.
- Define the **core metrics** (activation, retention, the one number the team steers by) in terms of these events, in writing. A metric that isn't defined by events will be computed three different ways.

## Phase 2: Identity — the part that breaks silently

- One **stable user id** (your own, not the provider's) attached to every server event.
- An **anonymous id** before signup, and a documented **alias/merge** on signup so pre-signup activity connects to the account. Getting this wrong makes every acquisition funnel wrong, and it's invisible until someone checks.
- Multi-tenant products need `tenant_id` on every event — otherwise you can't answer anything per account.
- Never use an email address as the identifier (it changes, and it's personal data everywhere it lands).

## Phase 3: Implement

- One thin wrapper module around the SDK: it owns the event name constants, injects common properties (user, tenant, plan, app version, locale, environment), and is the only place that talks to the vendor. Swapping providers then costs one file instead of two hundred call sites.
- **Types over strings**: a union type / enum of event names with typed properties, so a typo is a compile error rather than a silent data gap.
- Fire events **where the outcome is known** (after the API confirms), not in the click handler.
- Never block the UI on a tracking call; never let a tracking failure break a flow.
- **Test environments never write to production analytics** — enforce it in config (`/env`), not by remembering.

## Phase 4: Privacy (`/rgpd` applies fully)

Analytics is personal data processing. Non-negotiables: **no tracker fires before consent** where consent is required; no PII in event properties (no emails, names, addresses, free-text that might contain them); no full URLs carrying tokens or ids in query strings; IP anonymization where the provider offers it; a documented retention; and the analytics provider in the processor inventory with its DPA and data region. Session recording captures form input — mask fields or don't use it.

## Phase 5: Audit (`--audit`)

```
## Analytics Audit
Provider: <x>   Events defined: <n>   Events actually firing: <n>   Undocumented: <n>
| # | Issue | Effect | Fix |
| 1 | signup_completed fires client-side in the click handler | ~18% under-counted, and counts failures as successes | move server-side, after persistence |
| 2 | two naming conventions in use | queries silently miss half the data | migrate to one, alias the old |
| 3 | no anonymous→user alias | acquisition funnel unattributable | implement alias at signup |
```
Check: events in the plan but never firing; events firing but not in the plan; the same concept under two names; properties that changed type mid-history (the killer for time-series); duplicate fires from re-renders or retries; and whether the core metrics can actually be computed from what's collected.

## Phase 6: Funnels (`--funnel`)

Instrument each step as its own event with a shared `flow_id`, so you can measure drop-off *and* re-entry. Then read it honestly: a funnel with a step whose trigger is "page viewed" and a next step whose trigger is "request succeeded" is comparing two different things. Segment before concluding — an average that hides a broken mobile flow is worse than no number.

## Rules
- Start from the question; an event with no question behind it is noise with a maintenance cost.
- One naming convention, one wrapper module, typed event names.
- Outcomes are tracked server-side; client-side numbers are always under-counts and must be labelled as such.
- Never put PII in event properties; never fire trackers before consent.
- Every event's trigger is documented — undocumented triggers are how two teams get two numbers.
- Never let analytics break or slow a user flow.
