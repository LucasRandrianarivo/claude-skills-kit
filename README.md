# claude-skills-kit

The complete skills kit for [Claude Code](https://claude.ai/code) — **98 production-ready commands, 20 subagents, 9 rules and 11 domain field-note references** covering the whole job: project mode (brainstorm → cahier des charges → roadmap → execution → acceptance → delivery), fullstack orchestration, frontend, mobile, database, auth, payments, jobs, cache, search, realtime, AI features, API integration, CI/CD, Kubernetes, Terraform, Nginx, git, observability, incidents, GDPR, ship & deploy — plus the professional layer: proposals, estimation, kickoff, status reporting, change requests, billing, hiring and onboarding. Auto-detected for your stack, zero dependencies, plain markdown you can edit.

![npx claude-skills-kit init — stack detection and skill installation demo](https://raw.githubusercontent.com/LucasRandrianarivo/claude-skills-kit/main/docs/demo.gif)

## Install

```bash
npx claude-skills-kit init
```

The installer detects your stack (Next.js, Remix, Astro, SvelteKit, Nuxt, Angular, Vue, React+Vite, NestJS, Fastify, Express, Expo/React Native/Flutter, GitHub Actions/GitLab CI — plus Python/Go/Rust projects) and installs the right variant of each stack-aware skill, with a generic fallback so **no stack is ever left without a skill**.

```bash
npx claude-skills-kit list                          # browse the full catalog
npx claude-skills-kit init --profile core,ship     # install only some groups
npx claude-skills-kit add make-pdf scrape          # add individual skills later
npx claude-skills-kit remove office-hours          # remove one
npx claude-skills-kit update                       # refresh installed skills
```

## The lifecycle

```
 idea ──▶ /spec ──▶ /autoplan ──▶ /feat ──▶ /review ──▶ /ship ──▶ /deploy ──▶ /canary ──▶ /retro
                (4 plan reviews)     │    (+ /pr-review
                                     ▼      10 specialists)
                             /debug /test /build /qa
```

…and the project-mode arc on top of it, when the work is a whole project rather than a change:

```
/project start
     │
/brainstorm ─▶ /cdc ─▶ /roadmap ─▶ /exec-plan ─▶ build ─▶ /validate ─▶ /delivery
   options      spec     phases       steps    (the loop   recette     handover
                                                 above)
     └── gate 0 ──── gate 1 ──── gate 2 ──── phase gates ──── gate 3 ──┘
```

## What you get

### Plan & spec — think before you build

| Command | What it does |
|---|---|
| `/spec` | Turn vague intent into a precise, executable spec in 5 phases; optionally file it as a GitHub issue |
| `/plan-ceo-review` | Founder-mode plan review: is this the right thing to build? Scope vs impact, cut list, one-way doors |
| `/plan-eng-review` | Eng-manager review: feasibility, hidden complexity, migration/rollback, sequencing, risk register |
| `/plan-design-review` | Designer's-eye review: UX flows, empty/loading/error states, consistency, accessibility |
| `/plan-devex-review` | DX review: API ergonomics, onboarding cost, error messages, docs impact |
| `/autoplan` | Runs all four plan reviews sequentially with principled auto-decisions → one consolidated plan |
| `/office-hours` | YC-style office hours: pitch mode (get challenged) or working session on your highest-leverage problem |

### Build & debug

| Command | What it does |
|---|---|
| `/feat` | Full feature orchestration: analysis, plan, code, tests, review |
| `/debug` | Structured 4-phase debugging — **iron rule: no fix without root cause** (stack-specific variants) |
| `/investigate` | Root-cause investigation for *any* anomaly: flaky CI, weird data, perf mystery — evidence before hypotheses |
| `/test` | Run tests, diagnose failures, fix (Vitest/Jest variants + generic) |
| `/build` | Build pipeline: typecheck, lint, format, build — stop at first failure, fix, resume |
| `/scaffolder` | Generate feature files following your project's own conventions |

### Review & security

| Command | What it does |
|---|---|
| `/review` | 4-phase review of local changes: quality, readability, architecture, security |
| `/pr-review` | Pre-landing PR review — dispatches **specialist subagents** based on what the diff touches, merges findings into one ship/block verdict |
| `/compact` | Code-quality pass only (dead code, duplication, typing) |
| `/simplify` | Readability pass only (nesting, conditions, abstractions) |
| `/security-review` | Security audit of changed code |
| `/cso` | Chief Security Officer mode: full-codebase audit — attack surface, dependencies, secrets, authz — with prioritized remediation plan |
| `/fix-review` | Auto-fix everything found by `/review`, then re-validate |

### QA, design & performance

| Command | What it does |
|---|---|
| `/qa` | Systematic web-app QA: exercise every page, form, and state; full issue taxonomy; fixes bugs (or `--report-only`) |
| `/design-review` | Visual audit of the running app: screenshot, detect, fix, verify (antd/tailwind/chakra variants + generic) |
| `/design-system` | Design consultation: propose a complete design system (type, color, spacing, motion) with an HTML preview to compare directions |
| `/design-variants` | Design shotgun: N genuinely different HTML variants + a side-by-side comparison board, iterate to convergence |
| `/design-html` | Turn the chosen mock into production-quality, accessible, responsive markup |
| `/benchmark` | Performance baselines and regression detection (Lighthouse/Playwright timings) |
| `/devex-review` | Live DX audit of your own project: follow the README literally, log every friction point, score it |
| `/health` | Code-quality dashboard: churn hotspots, dependency freshness, debt, dead files — with trend vs last run |

### Project mode — idea to delivery

| Command | What it does |
|---|---|
| `/project` | The thread through a whole project: persistent state in `.claude/project/<slug>/`, the right skill at every step, gates you decide |
| `/brainstorm` | Structured ideation: frame → diverge (8 lenses incl. *do nothing*, *buy*, *manual first*) → challenge → score → one recommendation with its riskiest assumption |
| `/cdc` | Cahier des charges: scope & non-scope, testable F-xx/N-xx requirements, acceptance criteria, deliverables, planning, budget, risks — versioned, with amendments |
| `/roadmap` | Phases, milestones, dependencies, critical path and a **capacity check** with the productivity assumption shown |
| `/exec-plan` | A phase → ordered ≤1-day tasks with done criteria, owners, parallelism and a binary gate (optionally emitted as GitHub/GitLab issues) |
| `/validate` | Acceptance (recette) against the CDC requirement by requirement, S1–S4 defect grid, ACCEPTED / WITH RESERVES / REFUSED verdict |
| `/delivery` | Handover: docs verified by execution, runbook, access transfer, credential rotation, training, warranty terms, sign-off |

### Fullstack & agent orchestration

| Command | What it does |
|---|---|
| `/fullstack` | Contract-first feature across db → api → client: freeze the contract, build layers **in parallel** with hard file boundaries, amend only through a gate, verify the seam at runtime |
| `/contract` | The API contract itself: define, freeze, version, generate types/clients/mocks from it, and detect drift (`--check`) |
| `/orchestrate` | Controlled fan-out for wide work: DAG → waves with no file overlap, dispatch specs, per-wave verification, boundary-breach handling, cost reported at each gate |

### Frontend

| Command | What it does |
|---|---|
| `/component` | A production component in your idiom — designed API, **all five states**, a11y built in, tests (React / Vue / Svelte variants + generic) |
| `/a11y` | WCAG 2.2 AA audit: automated pass **plus** the keyboard, screen-reader, contrast and zoom passes automation can't do — then fixes and re-verifies |
| `/responsive` | 320px → 4K, landscape, 200%/400% zoom: overflow hunting, fluid type, container queries, touch targets, content parity |
| `/web-vitals` | LCP/INP/CLS + bundle budget: measure (median of 3, throttled), **attribute the cause**, fix, re-measure, then set a budget CI can enforce |
| `/state` | The state layer: server vs client vs URL vs form state, cache keys, invalidation, effect chains, races — audit or design (`--design`) |

### Mobile

| Command | What it does |
|---|---|
| `/mobile` | A screen/feature built for mobile reality: offline, permissions denied, cold start, safe areas, font scale, platform parity (React Native / Expo / Flutter variants + generic) |
| `/mobile-release` | Store release: OTA-or-build decision, version/build numbers, signing, **upgrade-from-previous test**, staged rollout, and the rollback move decided up front |

### APIs — integrate anything, keep it current

| Command | What it does |
|---|---|
| `/api-scout` | Find and evaluate the public APIs that serve a need — registries, cloud-native, open-source self-host, open data — scored on cost, limits, freshness, lock-in, with cited sources |
| `/integrate` | Integrate any third-party API: auth (key/OAuth2/HMAC), typed boundary, timeouts, retries with jitter, idempotency, rate limiting, pagination, secrets, fixtures — no live-vendor tests |
| `/webhook` | Inbound webhooks done right: raw-body signature verification, replay window, dedupe by unique constraint, async processing, ordering, DLQ (`--audit` for existing ones) |
| `/api-refresh` | Freshness pass: inventory every integration, fetch **live** changelogs/deprecations, match them against your call sites, and produce a sunset-ordered migration plan |

### Platform — CI/CD, containers, server, git

| Command | What it does |
|---|---|
| `/cicd` | Pipeline audit & build — coverage, caching, permissions/OIDC, deploy gates (GitHub Actions / GitLab CI variants + generic) |
| `/docker` | Multi-stage Dockerfile & compose: cache-correct layer order, non-root, no secrets in layers, healthchecks, signals, size and scan report |
| `/nginx` | Reverse proxy, TLS, caching (never an authenticated response), compression, security headers, rate limiting, SPA/SSR routing — `nginx -t` before every reload |
| `/git` | The dangerous operations with rails: conflicts, history cleanup, bisect, recovery via reflog, safe undo per situation, GitHub/GitLab flows |

### Data, auth & money

| Command | What it does |
|---|---|
| `/db` | Schema design, migrations (expand→migrate→contract, lock profile, tested `down`), indexes, `EXPLAIN`-driven query optimization, N+1, and a **restore test** with measured RPO/RTO |
| `/auth` | Authn *and* authz: sessions vs tokens, cookie flags, password/MFA/reset rules, OAuth2+PKCE, and the object-level (IDOR) and deny-by-default checks where the real bugs are — with the negative tests |
| `/payments` | The webhook is the source of truth, never the redirect: idempotency keys, server-computed amounts, guarded state machine, dunning, refunds, reconciliation |
| `/rgpd` | Technical GDPR: data map, retention **jobs**, consent gating before load, export/erasure (backups and processors included), transfers, breach readiness |

### Run it in production

| Command | What it does |
|---|---|
| `/observability` | Structured logs with a correlation id, RED + business metrics, OpenTelemetry traces, alerts that page only for symptoms users feel, SLOs with an error budget |
| `/incident` | Mitigate first, diagnose second: severity, timeline, rollback/flag/shed, 15-minute comms cadence, then a blameless postmortem with owned, dated actions |
| `/env` | Config & secrets: classification, boot-time validation, `.env` hygiene, secret storage, and zero-downtime rotation |
| `/upgrade` | Framework and dependency majors — one per branch, migration guide filtered to your call sites, codemods reviewed, behavior changes exercised |

### Reach & quality

| Command | What it does |
|---|---|
| `/seo` | Technical SEO: indexability (the `Disallow: /` catastrophe), canonicals, per-template metadata, JSON-LD, sitemaps from the source of truth |
| `/i18n` | ICU messages (never concatenation), `Intl` formatting, locale routing, RTL, catalog drift, and the emails/exports everyone forgets |
| `/testing` | Test **strategy**: the level each behavior belongs at, the missing negative paths, flake elimination, and every new test proven to fail first |
| `/notifications` | Email deliverability (SPF/DKIM/DMARC, separated streams), async sending with bounce suppression, push permission timing and token lifecycle |

### Backend systems

| Command | What it does |
|---|---|
| `/jobs` | Queues done right: outbox instead of enqueue-and-hope, idempotent handlers, retryable vs terminal failures, DLQ with replay, scheduled-job locking and DST |
| `/cache` | What to cache where, keys that encode every input, invalidation strategy, stampede protection — and the rule that a shared cache never holds identity-dependent data |
| `/realtime` | SSE vs WebSocket vs polling, reconnection **with state recovery**, per-subscription authorization, shared bus across instances, backpressure |
| `/search` | Engine choice (start with Postgres), outbox-fed indexing, alias-swap reindex, relevance tuned against a judgment set, permission filtering in-query |
| `/files` | Presigned direct upload, validation on bytes not claims, re-encoded images, separate origin for user content, signed URLs — never "unguessable URL" as access control |
| `/api-design` | The API others consume: one error envelope with machine codes, cursor pagination, idempotency keys, rate-limit headers, versioning with a sunset path |

### Product engineering

| Command | What it does |
|---|---|
| `/llm` | AI features that hold up: structured output + validation, prompt injection as an architectural problem, **evals before prompt tuning**, cost/latency levers, degraded mode |
| `/flags` | Flags with an owner and a removal date, safe defaults, deterministic bucketing, staged rollout, and experiments whose decision rule is written before the data arrives |
| `/analytics` | A tracking plan that answers questions, one naming convention, server-side outcomes, anonymous→user aliasing, and no PII in properties |
| `/architecture` | Boundaries and data ownership, sync vs async, a failure table per dependency, and ADRs for the one-way doors |
| `/refactor` | Characterization tests first, one mechanical change per commit, strangler fig for subsystem replacement — behavior never changes inside a refactor |

### Infrastructure

| Command | What it does |
|---|---|
| `/k8s` | The five things that actually break: probes (liveness never checks a dependency), resources, rollouts that drop requests, config reload, autoscaling on the wrong metric |
| `/iac` | Terraform/OpenTofu: remote locked state, reading a plan for `destroy`/`replace` lines, module and provider pinning, drift, safe adoption of manual infra |
| `/cost` | Attribute before optimizing, unit economics, the waste checklist, and a cut list with the risk and reversibility of each item |

### Ship & operate

| Command | What it does |
|---|---|
| `/ship` | Full ship workflow: sync base, quality gate, adversarial self-review, version bump, changelog, PR — **never skips the test gate** |
| `/deploy` | Ship + deploy via your project's detected mechanism, then hand off to `/canary` |
| `/canary` | Post-deploy monitoring: poll health, compare against baseline, PASS/DEGRADED/FAIL with rollback steps |
| `/release-notes` | Post-ship docs: generate release notes from git history, update docs where the surface changed |
| `/retro` | Engineering retrospective: what shipped, what churned, what broke, top process improvements |

### Professional practice — client & team

| Command | What it does |
|---|---|
| `/proposal` | The commercial proposal (devis): pricing model chosen deliberately, tiered options, assumptions as price conditions, an explicit **not included** list, validity and terms |
| `/estimate` | Ranges not point estimates, the work everyone forgets (tests, review, deploy, edge cases, client waiting), reference-class cross-check, spikes for unknowns, honest re-estimation |
| `/kickoff` | Named decision-maker and arbiter, the access table with dates, cadence, definition of done, the change-request rule stated warmly on day one |
| `/status` | The weekly report that prevents surprises: defensible progress, budget burn, blockers naming who must act, decisions needed — and how to report red early |
| `/change-request` | Qualify (in scope · ambiguity · out of scope · **defect**), quantify including rework and schedule, three options, written approval before any work, and a log that makes absorbed goodwill visible |
| `/invoice` | Billing reconciled against the contract and acceptance, the sweep for unbilled change requests, cap warnings before the cap, and the effective-rate recap that feeds the next quote |
| `/meeting` | No objective, no meeting: agenda, the decision to be made, facilitation, and a same-day record of decisions and owned actions |
| `/tech-debt` | Debt inventoried with git evidence, costed in days and risk, pitched in business language with a payback period, repaid inside normal delivery |
| `/interview` | Signals defined before the first call, a fair timeboxed exercise that resembles the job, independent scoring on evidence, a decision rule agreed in advance |
| `/onboarding` | The cold walk before they arrive, a merged change on day one, the six-part codebase map, and the week-4 retro that is your best defect report |

### Knowledge & memory

| Command | What it does |
|---|---|
| `/learn` | Show, search, add, and distill project learnings (`.claude/learnings.jsonl`) |
| `/decisions` | List, search, log, and *explain* recorded decisions (`.claude/decisions.jsonl`) |
| `/context-save` / `/context-restore` | Save working context before ending a session; restore and re-verify it later |
| `/document` | Generate missing docs following the Diátaxis split (tutorial/how-to/reference/explanation) |
| `/diagram` | Description or code → validated Mermaid (or `--excalidraw` for editable output) |
| `/make-pdf` | Markdown → publication-quality PDF with print-CSS quality bar and verification pass |
| `/scrape` | Pull structured data from a web page (curl first, Playwright for JS-rendered), politely |
| `/skillify` | Meta-skill: codify the workflow you just did into a permanent reusable command |
| `/rag` | Shared local semantic memory: status, index documents, cross-project semantic search |
| `/adr` | Architecture Decision Records in `docs/adr/` — created **automatically** by the decisions rule when a significant decision lands; list, supersede, promote, RAG-index |

### Subagents

Core agents — used by `/feat`, `/review`, `/build`:

| Agent | Role |
|---|---|
| `code-architect` | Validate architecture, placement, dependency direction (read-only) |
| `code-reviewer` | Structured 4-phase review with severity scoring |
| `build-validator` | Run the full quality gate |
| `test-runner` | Execute tests, diagnose failures |
| `scaffolder` | Generate files following project conventions |

Fullstack agents — used by `/fullstack` and `/contract`, each with a **hard file boundary**:

| Agent | Owns | May not touch |
|---|---|---|
| `contract-keeper` | The contract artifact, its versions and amendments | Implementation code |
| `backend-builder` | Migrations, models, handlers, services, backend tests | Client code, the contract |
| `frontend-builder` | Routes, components, state, mocks, client tests | Server code, the contract |
| `integration-verifier` | Runtime verification of the seam (read-only on code) | Anything — it reports, never patches |

Specialist reviewers — dispatched automatically by `/pr-review` based on what the diff touches:

| Specialist | Triggers on |
|---|---|
| `specialist-security` | Auth, input handling, secrets |
| `specialist-red-team` | Same surface, attacker mindset: abuse cases, trust boundaries |
| `specialist-performance` | Loops, queries, allocations, N+1 |
| `specialist-api-contract` | Endpoint/API shape changes, breaking-change detection |
| `specialist-data-migration` | Migrations: reversibility, locks, data loss, deploy ordering |
| `specialist-maintainability` | Complexity, coupling, conventions |
| `specialist-testing` | Coverage of changed behavior, test quality, missing edge cases |
| `specialist-accessibility` | Any interactive markup: semantics, keyboard, focus, names, contrast (WCAG 2.2 AA) |
| `specialist-frontend-perf` | Bundle growth, render cost, LCP/INP/CLS impact of a change |
| `specialist-integration` | Third-party calls: timeouts, retries, idempotency, secrets, webhook verification |
| `specialist-database` | Schema constraints, indexes, N+1, transaction scope, locking, tenancy filters |

### Rules (always active)

| Rule | What it does |
|---|---|
| `careful` | Block destructive commands — filesystem, DB, git, docker, **and cloud CLIs** (terraform destroy, aws s3 rb, ...) |
| `redact` | Secret protection: 35 detection patterns (AWS, GitHub, Stripe, JWT, PEM, connection strings...) — never written, always `<REDACTED>` |
| `freeze` | "freeze to `<dir>`" scopes all edits to that subtree for the session |
| `guard` | Maximum-safety mode: careful escalated + freeze + confirmation gates + dry-run-first |
| `learnings` | Log bugs/fixes to `.claude/learnings.jsonl`; consult them before debugging |
| `decisions` | Auto-log significant decisions to `.claude/decisions.jsonl`; auto-escalate architecture-shaping ones into ADRs (`docs/adr/`); accepted ADRs are binding |
| `greeting` | "Bonjour" lists all available skills dynamically |
| `expertise` | Domain questions are answered from the field notes in `.claude/references/` — mechanism, trap, verification — never from vague recall |
| `evidence` | No claim without proof: "tests pass", "it's fixed", "not used anywhere" require the command that was run — skipped checks are named, never rounded up |

Rules are activated through `@.claude/rules/*.md` imports in the managed CLAUDE.md block, so they actually load every session.

### Field notes — the expertise layer

Eleven dense domain references install to `.claude/references/`. They are what turns a skill from a checklist into a specialist: the mechanism, the trap that looks correct, the symptom→cause→fix table, and the numbers worth knowing.

| Reference | Covers |
|---|---|
| `database.md` | Why a plan is chosen, index column order, reading `EXPLAIN`, isolation anomalies, migration lock profiles |
| `frontend.md` | Rendering costs, framework reactivity traps, hydration mismatches, the CSS rules behind most layout bugs (`min-width: auto`…) |
| `security.md` | Access control first (IDOR, mass assignment), injection by interpreter, auth traps, secrets, supply chain, LLM-specific |
| `distributed.md` | The three outcomes of a network call, retry rules, idempotency, outbox/inbox, ordering, backpressure |
| `http.md` | `Cache-Control` decoded, `Vary`, status codes that carry meaning, cookies, CORS without folklore, CDN behavior |
| `devops.md` | Container layers and PID 1, the Kubernetes failure table, proxy traps, deploy strategies, zero-downtime requirements |
| `testing.md` | Where false greens come from, what belongs at which level, the four causes of flakes |
| `llm.md` | Reliable output, prompt injection as an architecture problem, evals, cost/latency levers, RAG failure diagnosis |
| `mobile.md` | Process death, offline, permissions, the upgrade-path test, store review realities |
| `architecture.md` | Coupling as the currency, monolith vs services honestly, sync/async, failure design, strangler fig |
| `consulting.md` | Pricing models and who carries the risk, why estimates are structurally wrong, the mechanics of scope creep, communication and payment hygiene |

The always-active `expertise` rule maps each domain to its notes and requires answers to give the **mechanism, the trap, the verification, and what would change the answer** — read from the notes, not from memory. Live facts (pricing, versions, deprecations) are always fetched and cited.

## Local RAG — one-command semantic memory

```bash
npx claude-skills-kit setup-rag              # install everything
npx claude-skills-kit setup-rag --port 9000  # custom port
npx claude-skills-kit setup-rag --remove     # clean uninstall (data preserved)
```

One command gives every Claude Code session on your machine a **shared, 100% local semantic memory** — no API key, no account, nothing leaves your machine:

| Piece | What it does |
|---|---|
| Chroma server (Docker, auto-restart) | One shared vector store for all projects — parallel sessions are safely coordinated |
| Local ONNX embeddings | all-MiniLM-L6-v2 runs on your machine; downloaded once, zero cost |
| MCP server `rag` (user scope) | Index/query tools available in every project |
| SessionStart auto-heal hook | Restarts the container at session start if it's down |
| PostCompact discussion capture | Every compaction summary is secret-redacted, archived and indexed — **no conversation is lost** |
| Usage policy in `~/.claude/CLAUDE.md` | Claude knows *when* to query and index, with anti-duplication conventions |

Then in any session: `/rag index docs/`, `/rag search "how does pricing work"`, or just ask naturally — Claude queries it when the repo can't answer.

**Requirements**: Docker + Python 3. **What belongs in the RAG**: durable documents (audits, specs, vendor docs, post-mortems) — not code (agentic Grep beats embeddings for code) and never secrets.

## Profiles

Install only what you need — combine groups freely:

```bash
npx claude-skills-kit init --profile core                  # the essential v1 set
npx claude-skills-kit init --profile core,ship,plan        # + ship & plan reviews
npx claude-skills-kit init --profile core,frontend,api     # frontend + integrations
npx claude-skills-kit init --profile project,agentic       # run a whole project
npx claude-skills-kit init --profile data,security,platform # data & ops
npx claude-skills-kit init --profile backend,product        # services & product engineering
npx claude-skills-kit init --profile project,pro           # client work end to end
npx claude-skills-kit init                                 # full (default)
```

| Group | Contents |
|---|---|
| `core` | feat, review, compact, simplify, security-review, fix-review + stack-aware debug/test/build/design-review/scaffolder |
| `plan` | spec, the 4 plan reviews, autoplan, office-hours, architecture |
| `project` | project, brainstorm, cdc, roadmap, exec-plan, validate, delivery |
| `agentic` | fullstack, contract, orchestrate |
| `frontend` | a11y, responsive, web-vitals, state, seo, i18n + stack-aware component |
| `mobile` | mobile-release + stack-aware mobile (installed only for a mobile project) |
| `api` | api-scout, integrate, webhook, api-refresh, notifications |
| `platform` | nginx, docker, git, observability, incident, env, k8s, iac, cost + stack-aware cicd |
| `data` | db, payments |
| `backend` | jobs, cache, realtime, search, files, api-design |
| `product` | flags, analytics, llm |
| `pro` | proposal, estimate, kickoff, status, change-request, invoice, meeting, tech-debt, interview, onboarding |
| `security` | auth, rgpd |
| `ship` | ship, deploy, canary, release-notes, retro, pr-review |
| `quality` | qa, health, benchmark, devex-review, cso, investigate, testing, upgrade, refactor |
| `design` | design-system, design-variants, design-html |
| `knowledge` | learn, decisions, context-save/restore, document, diagram, make-pdf, scrape, skillify, rag, adr |
| `guard` | freeze, guard, redact, decisions rules |

## Stack detection

The installer reads your project files and picks the right template variant:

| Signal | Detected |
|---|---|
| `package.json` deps | Next.js (App/Pages router), Remix, Astro, SvelteKit, Nuxt, Angular, React+Vite, Vue+Vite, NestJS, Fastify, Hono, Express |
| `expo`, `react-native`, `pubspec.yaml` | Expo / React Native / Flutter → the matching `/mobile` and `/component` variants |
| `.github/workflows`, `.gitlab-ci.yml`, Jenkinsfile, CircleCI, Bitbucket, Azure | CI provider → the matching `/cicd` variant |
| UI libraries | antd, Tailwind, shadcn (`components.json`), Chakra, MUI, Bootstrap |
| Test tooling | Vitest, Jest, Mocha + Playwright/Cypress (e2e) |
| Lockfiles | bun / pnpm / yarn / npm |
| `turbo.json`, `nx.json`, workspaces | Monorepo mode |
| `pyproject.toml`, `go.mod`, `Cargo.toml`, `composer.json` | Python / Go / Rust / PHP — generic skill set |

Unknown stack? Every stack-aware category has a `generic.md` fallback that discovers your commands at runtime (package.json scripts, Makefile, CI config).

## File structure after install

```
your-project/
├── .claude/
│   ├── commands/          ← all slash commands (up to 104 in full profile)
│   ├── agents/            ← 20 subagents with proper frontmatter
│   ├── rules/             ← 9 rules, imported by CLAUDE.md
│   ├── references/        ← 11 domain field notes (the expertise layer)
│   ├── context/           ← saved working contexts (/context-save)
│   ├── project/           ← project-mode state: cdc.md, roadmap.md, exec-*.md, validation-*
│   ├── contracts/         ← frozen API contracts (/contract, /fullstack)
│   ├── reports/           ← QA, health, retro, benchmark, web-vitals, api-refresh reports
│   ├── learnings.jsonl    ← bug & fix knowledge base
│   └── decisions.jsonl    ← decision log
└── CLAUDE.md              ← managed skill-routing block (refreshed in place)
```

## Design principles

- **Plain markdown, no lock-in** — every skill is an editable file in your repo. Delete anything; nothing breaks.
- **Zero dependencies** — the installer is one Node script. No daemon, no telemetry, no accounts, no background processes.
- **Methodology over tooling** — skills encode *how to think* (root cause before fix, evidence before conclusion, convention from the codebase), so they work on any project.
- **Stack-aware, never stack-locked** — specific variants when detected, generic fallbacks always.
- **Memory built in** — learnings, decisions, and saved contexts persist across sessions in versionable JSONL/markdown.

## Customize

Every installed file is plain markdown in `.claude/`. Edit freely, or use `/skillify` to turn any workflow Claude just performed into a new permanent command.

## Uninstall

Delete the files from `.claude/` and the managed block from `CLAUDE.md`. No global state.

## Contributing

PRs welcome. To add support for a new framework or UI library:

1. Add a template variant in `templates/<category>/<variant>.md`
2. Update the detection logic in `bin/install.js`
3. Update the README stack detection table

## License

MIT
