# Rule: Expertise — Answer From Mechanism, Not From Memory

## Status: Always Active

This project's skills carry **field notes** in `.claude/references/`: dense, domain-specific knowledge — how the thing actually works, the symptom→cause→fix tables, the traps that look correct, and the numbers worth knowing.

They exist for two situations:
1. **Executing a skill** — consult the matching notes before diagnosing or prescribing.
2. **Answering a question** — when the user asks *about* a domain rather than asking for work ("why is our list endpoint slow?", "should we use JWT or sessions?", "what breaks if we cache this?"), answer at the depth of the notes, not at the depth of a summary.

---

## The reference map

| Domain | Notes | Used by |
|---|---|---|
| Databases, indexes, EXPLAIN, locks, migrations | `references/database.md` | `/db`, `specialist-database`, `specialist-data-migration` |
| Rendering, reactivity, bundles, CSS layout | `references/frontend.md` | `/component`, `/web-vitals`, `/responsive`, `/state`, `/a11y` |
| Access control, injection, secrets, supply chain | `references/security.md` | `/security-review`, `/cso`, `/auth`, `specialist-security` |
| Retries, idempotency, delivery, ordering, backpressure | `references/distributed.md` | `/integrate`, `/webhook`, `/payments`, `/jobs` |
| HTTP semantics, caching, CDN, cookies, CORS | `references/http.md` | `/nginx`, `/cache`, `/api-design`, `/seo` |
| Containers, Kubernetes, proxies, deploys, CI | `references/devops.md` | `/docker`, `/k8s`, `/nginx`, `/cicd`, `/deploy` |
| Test levels, false greens, flakes, data | `references/testing.md` | `/testing`, `/test`, `/qa` |
| LLM features: reliability, injection, evals, cost | `references/llm.md` | `/llm`, `/integrate` |
| Mobile: offline, process death, permissions, release | `references/mobile.md` | `/mobile`, `/mobile-release` |
| Boundaries, coupling, sync/async, failure design | `references/architecture.md` | `/architecture`, `/adr`, `code-architect` |

## How to answer a domain question

1. **Read the relevant notes** before answering. They contain the specifics — a summary from memory is exactly what this rule exists to prevent.
2. **Answer with the mechanism first**: what is actually happening, then why it produces the symptom. A recommendation without a mechanism can't be checked, adapted, or argued with.
3. **Name the trap.** Most of these domains have a version of the answer that looks right and is wrong (retrying a write without an idempotency key; caching an authenticated response; `add_header` in a nested location). Say which one applies here.
4. **Give the verification**: the command, the query, the header, the measurement that turns the answer from plausible to established (the `evidence` rule applies to answers, not only to work).
5. **Say what would change the answer** — the volume, the concurrency, the team size, the constraint. Advice with no stated conditions is advice that will be misapplied.
6. **Check the project before generalizing.** The notes describe the domain; this repository has its own stack, conventions and constraints. Read the relevant code before prescribing.

## What the notes are not

- **Not a substitute for live sources on versioned facts.** Pricing, API versions, deprecation dates, current defaults of a library: fetch them (`WebSearch`/`WebFetch`) and cite. The notes carry durable mechanisms, not release-note detail.
- **Not authoritative over the codebase.** If the repository does something differently and it works, understand why before "correcting" it.
- **Not legal, medical or financial advice.** `/rgpd` and `/payments` describe technical obligations and mechanisms; the organization's counsel decides the rest.
- **Not complete.** When a question falls outside them, say so plainly and reason from first principles — labelled as such.

## Keeping them true

When work in this repository proves a note wrong, incomplete, or missing a trap that cost real time: update the note in the same change, and log it with `/learn`. Field notes that aren't maintained become folklore, which is the thing they were written to replace.
