---
description: Incident response — triage, mitigate, communicate, then a blameless postmortem with real action items
argument-hint: "<what is broken> [--postmortem] [--sev 1|2|3]"
---

# /incident — Incident Response

## Usage
```
/incident checkout returns 500 for ~30% of users
/incident --sev 1 site down
/incident --postmortem        — write the postmortem for a resolved incident
```

## Overview
An incident is not a debugging session: the goal is **stop the bleeding first, understand later**. The most expensive mistake teams make is root-causing a live outage while users keep failing. This skill enforces the order — mitigate, then diagnose — and turns the aftermath into changes that actually land.

Complements `/investigate` (root cause, no time pressure) and `/canary` (post-deploy watch).

---

## Phase 1: Declare & size (2 minutes, not 20)

```
Incident: <one line, in user terms — "checkout fails", not "500 in OrderService">
Severity: SEV1 (users cannot use the product / data at risk)
          SEV2 (major feature broken or degraded for many)
          SEV3 (limited impact, workaround exists)
Started:  <first bad signal, from monitoring — not when someone noticed>
Impact:   <who, how many, what they can't do, money at risk>
Roles:    Lead: <who decides> · Comms: <who updates> · Scribe: <timeline>
```

Write a timeline from the first minute. Every action and its timestamp. Memory is unreliable during an incident and the postmortem depends on this.

## Phase 2: Mitigate — before understanding

Ask one question: **what makes users work again fastest?** In order of preference:

1. **Roll back** the last deploy. If the incident started within an hour of a release, this is the answer until proven otherwise. Don't argue about whether that deploy is the cause — roll back, then check.
2. **Feature flag off** the suspect path.
3. **Fail over / restart** the sick component; scale out if it's saturation.
4. **Shed load**: rate-limit, queue, or disable an expensive non-critical feature to protect the critical one.
5. **Fix forward** only when rollback is impossible (a migration already ran) — and then with the smallest possible change.

Two rules while mitigating: change **one thing at a time** and record it, or you'll never know what worked. And never delete evidence — capture logs, metrics screenshots, a failing request, and the current config **before** restarting anything.

If data is being corrupted, stop writes first. Corrupted data outlives an outage.

## Phase 3: Communicate

Users forgive outages; they don't forgive silence.

- **First update within 15 minutes** of declaring, even with nothing to say beyond "we're on it".
- Then every 30 min for SEV1, every hour for SEV2 — on the status page and wherever your users actually look.
- Say: what's broken (in their terms), who's affected, what to do meanwhile, when the next update comes. Never a cause you haven't confirmed, never an ETA you can't defend.
- Internal channel gets the technical detail; the public channel gets the impact.
- Resolution message names the fix and what comes next.

## Phase 4: Diagnose (once users are served)

Now the `/investigate` discipline applies: evidence before hypotheses.
1. What changed? Deploys, config flags, migrations, third-party status pages, traffic shape, certificate expiries, cron runs — in the incident window.
2. Correlate the first bad signal with those changes, using the correlation id to follow one failing request end to end (`/observability`).
3. Form the cheapest test that distinguishes between the top two hypotheses, and run it in staging or on a replica — never experiment on the live incident once it's mitigated.
4. Confirm the root cause by **reproducing** it. "Probably the cache" is not a root cause; it's a guess that will produce a second incident.

## Phase 5: Resolve

- Ship the real fix through the normal gate (tests, review, `/ship`) unless the incident is still active.
- Verify with the same signal that told you it was broken — the metric returns to baseline and stays there for a full watch window (`/canary`).
- Un-shed the load, re-enable the flag, remove temporary hacks **and track them**: an emergency workaround left in place is next quarter's incident.
- Close only when the symptom is gone and the mitigation is removed or made permanent deliberately.

## Phase 6 (`--postmortem`): Blameless, and actionable

```markdown
# Postmortem — <incident> (<SEV>, <date>)

## Impact
<users affected · duration · what they couldn't do · money/data impact>

## Timeline
| Time | Event | Who |
| 14:02 | Deploy v2.31 released | CI |
| 14:09 | Error rate crosses 5%, no alert fired | — |
| 14:22 | Reported by a customer                | support |

## Root cause
<the mechanism, not the person: what condition made the failure possible>

## What went well / what went badly
Detection: <how long, and why not sooner>
Mitigation: <what worked, what wasted time>

## Contributing factors
<the missing alert · the untested rollback · the migration ordering · the alert nobody owned>

## Action items
| # | Action | Type (prevent/detect/mitigate) | Owner | Due | Tracked |
| 1 | Alert on checkout error rate with a runbook | detect | <who> | <date> | #1234 |
```

Rules for the postmortem: **blameless** — name systems and gaps, never people; "human error" is never a root cause, it's a signal that the system allowed the error. Every action item has an owner, a due date, and a ticket, or it doesn't exist. At least one item must improve **detection time**, since that's usually the biggest lever.

Then: log the durable lessons with `/learn`, record structural decisions with `/decisions`, and feed the missing alerts back into `/observability`.

## Rules
- Mitigate before diagnosing. Always.
- One change at a time, each recorded with its timestamp.
- Capture evidence before restarting anything.
- Never announce a cause you haven't confirmed, or an ETA you can't defend.
- Never close an incident with an emergency workaround untracked.
- Postmortems are blameless and produce owned, dated, tracked actions — or they're theatre.
