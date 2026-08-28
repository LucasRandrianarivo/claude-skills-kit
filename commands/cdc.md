---
description: Write the cahier des charges / requirements spec — scope, functional & technical requirements, acceptance criteria, deliverables, budget
argument-hint: "<project or feature> [--light] [--client] [--from-brainstorm]"
---

# /cdc — Cahier des Charges (Requirements Specification)

## Usage
```
/cdc <project>
/cdc customer portal v1
/cdc --light             — the 2-page version for internal work
/cdc --client            — the client-facing version (scope, deliverables, price, planning)
/cdc --from-brainstorm   — build on the latest /brainstorm output
```

## Overview
The document that answers, before anyone writes code: **what** is being built, **for whom**, **how we'll know it's done**, and **what's explicitly not included**. It's the reference the delivery is validated against (`/validate`), and the thing that makes scope creep a conversation instead of a surprise.

Written in the user's language, saved to `.claude/project/<slug>/cdc.md`, and versioned — every change after sign-off is an amendment with a date and a reason.

---

## Phase 1: Gather (ask, don't invent)

Ask the questions whose answers change the document. Batch them; at most 6 at a time. Anything unanswered becomes an explicit **assumption** in the document — never a silent guess.

Context · users · the problem today · success metrics · constraints (budget, deadline, team, existing systems, legal/RGPD) · integrations · volumes · non-goals.

## Phase 2: Write the document

```markdown
# Cahier des charges — <project>
Version <n> · <date> · Status: DRAFT | VALIDATED | AMENDED

## 1. Context & objective
Why this project exists, the problem it solves, the business objective and its metric.

## 2. Scope
### In scope
### Out of scope        ← as important as "in"; this is what stops scope creep
### Assumptions & dependencies   ← what we're taking as given, and who owns it

## 3. Users & use cases
| Profile | Needs | Volume | Main use case |

## 4. Functional requirements
| ID | Requirement | Priority (MoSCoW) | Acceptance criteria | Source |
| F-01 | A user can reset their password by email | Must | Given a registered email, a reset link is received within 2 min and is valid for 1h, single-use | Client, 12/03 |

Every requirement: uniquely identified, testable, and traceable to who asked for it.
"The interface must be modern" is not a requirement — turn it into something observable or drop it.

## 5. Non-functional requirements
| ID | Category | Requirement | How it's verified |
| N-01 | Performance | Product list p95 < 800ms at 500 concurrent users | Load test before delivery |
| N-02 | Accessibility | WCAG 2.2 AA on the main flows | /a11y audit |
| N-03 | Security | Auth, roles, RGPD compliance, data retention | /security-review + /cso |
| N-04 | Availability | 99.5% business hours, RTO 4h, RPO 24h | Runbook + restore test |
| N-05 | Compatibility | Last 2 versions of Chrome/Safari/Firefox/Edge, iOS 16+, Android 10+ | Device matrix |

## 6. Technical solution
Architecture, chosen stack (with the reason), integrations and their APIs, hosting,
environments (dev/staging/prod), data model outline, and the migration/reprise strategy if replacing something.

## 7. Deliverables
| Deliverable | Format | Delivered when |
| Application in production | URL + access | Phase 4 |
| Source code | Git repository, MIT/proprietary | Continuous |
| Technical documentation | README, ADRs, runbook | Delivery |
| User documentation / training | PDF or session | Delivery |
| Support & warranty | <n> months bug-fix warranty | After acceptance |

## 8. Planning
Phases, milestones, dependencies, and the client's own obligations (content, access,
validations) with the delay they cause if late. → detailed by /roadmap

## 9. Acceptance (recette)
How delivery is validated: the acceptance protocol, who signs, the delay for
raising defects, the severity grid, and what "accepted" means contractually. → executed by /validate

## 10. Budget & terms   (--client)
Estimate per phase or per deliverable, what's included, what's billed extra
(a change request is billed as a change request), payment schedule.

## 11. Risks
| Risk | Probability | Impact | Mitigation | Owner |

## 12. Amendments
| Date | Version | Change | Reason | Impact on planning/budget |
```

`--light` keeps sections 1, 2, 4, 5, 7, 9 only. `--client` drops section 6's internals and keeps 10.

## Phase 3: Pressure-test before sign-off

Before presenting it, check every line against these:
- Is each requirement **testable**? If you can't write its acceptance test, it isn't a requirement.
- Is anything in "in scope" without a matching deliverable, or vice versa?
- Do the non-functional requirements have a **verification method**? An unverifiable NFR is decoration.
- Is every dependency on the client (content, accesses, decisions) written down **with its deadline**?
- Does "out of scope" contain the three things the client will most likely assume are included?
- Are the assumptions listed where the answers were missing?
- Would a developer who never attended a meeting be able to build from this?

## Phase 4: Sign-off & amendments

1. Present the document; list the open questions separately, ranked by what they block.
2. On validation: status → VALIDATED, version 1, date recorded. Optionally file it as a GitHub/GitLab issue or a doc in the repo.
3. **Every later change is an amendment**: a row in section 12 with its planning and budget impact, and a version bump. Never edit a validated requirement silently — that is exactly the drift the document exists to prevent.
4. Hand off: `/roadmap` for the phasing, then `/exec-plan` per phase.

## Rules
- Requirements are testable and identified (F-xx / N-xx); the IDs are used by `/exec-plan` and `/validate`.
- Never invent an answer to an unanswered question — write it as an assumption, visibly.
- "Out of scope" is mandatory and specific.
- Every non-functional requirement states how it will be verified.
- After validation, changes are amendments with an impact — never silent edits.
- Write it in the user's language; keep the vocabulary the client uses, not the team's jargon.
