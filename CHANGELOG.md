# Changelog

## 3.4.0 — 2026-08-28

What three well-known third-party skills — Remotion's, stop-slop, ui-ux-pro-max — do better than this kit did, taken and adapted.

### Installable as a Claude Code plugin

`commands/`, `agents/` and `rules/` moved from `skills/` to the package root, which is the layout the plugin loader expects. The kit now installs either way:

```
/plugin marketplace add LucasRandrianarivo/claude-skills-kit
/plugin install claude-skills-kit@claude-skills-kit
```

Both `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` pass `claude plugin validate --strict`, and `claude plugin details` confirms the inventory: 98 skills, 20 agents, ~5.9k tokens of always-on context. The `npx claude-skills-kit init` route is unchanged and still adds what a plugin cannot: the always-active rules, the field notes, the stack-aware variants, and the `CLAUDE.md` routing block.

### `/write` — prose, scored before it ships

Borrowed from stop-slop's mechanic (a rubric with a threshold that forces a revision pass) and corrected on the point that mattered: **accuracy is weighted double and gates the score**, because a polished document with an unsourced number is the one that costs you. Covers the documents this kit already produces — proposals, CDC, status reports, ADRs, release notes, docs — with the AI tells worth hunting, and an explicit list of the text where these style rules do *not* apply (legal, contractual, specifications).

### Field notes now name their live sources

Every reference gained a **Where to check the current truth** section with canonical URLs — the lesson from Remotion's `/remotion-docs`, which fetches documentation rather than remembering it. This makes the `expertise` rule's "fetch versioned facts" actionable instead of aspirational: PostgreSQL and MySQL manuals, RFC 9110/9111, OWASP, the Kubernetes and Docker docs, `docs.claude.com` for model facts, the store review guidelines, and — for the commercial notes — the signed contract and local law, never the notes themselves.

### Composing with skills you did not write

New guidance in the `expertise` rule and the README: for a vendor's own product, install the vendor's skill (`npx skills add remotion-dev/skills`) rather than duplicating it; read any third-party skill before installing, because a `SKILL.md` runs with your permissions and one that ships a script runs that script; pin the version and re-read the diff on update. An installed skill is guidance, never authority over this project's rules.

### Not borrowed, deliberately

ui-ux-pro-max backs its skill with CSV data and a Python BM25 search script. It buys real retrieval, and it costs a runtime dependency and a supply-chain surface — the opposite of ADR-0001 (markdown only, no runtime infrastructure). Recorded here as a considered rejection rather than an oversight; revisit with a superseding ADR if a data-backed skill ever earns it.

## 3.3.1 — 2026-08-28

Verification, because the kit ships executable content.

- **`npm run verify`** (`scripts/verify-snippets.mjs`): extracts every fenced block that declares a language across `skills/`, `templates/` and `references/`, and runs the real checker — `nginx -t` for nginx, `bash -n` + shellcheck for shell, real parsers for JSON/YAML/JS, and a structural lint for the Dockerfile (stage references, exec-form `CMD`, non-root `USER`, no devDependencies in the runtime stage). 52 blocks, all passing.
- **`npm run smoke`** (`scripts/smoke-install.mjs`): installs into throwaway fixtures across five scenarios and asserts stack detection, the variant resolved, profile contents, and that a narrow profile's `CLAUDE.md` never advertises a skill it didn't install.
- **CI** (`.github/workflows/verify.yml`) runs both on every push, with the checkers installed.
- **Fixed by the new verifier**: the reverse-proxy snippet in `/nginx` referenced `$connection_upgrade` while its `map` lived in a separate fenced block — copied on its own it still failed `nginx -t`, which is exactly the error the surrounding text warned about. The `map`, `upstream` and `server` now ship as one snippet that passes `nginx -t` as written.

## 3.3.0 — 2026-08-27

The professional layer: the work around the code — client engagements and team practice.

### Added — client work (6 commands)

- **`/proposal`** — the commercial proposal (devis): qualification before writing, a pricing model chosen deliberately (fixed per phase, capped T&M, milestones, retainer — each with who carries the risk), tiered options so the conversation is "which one" rather than "yes or no", assumptions stated as price conditions, an explicit **not included** list, validity date and terms.
- **`/estimate`** — ranges instead of point estimates, the categories everyone forgets (tests, review, deployment, edge cases, client waiting time), a reference-class cross-check against the decomposition, spikes instead of numbers for unknowns, and re-estimation that never absorbs a slip by shrinking what remains.
- **`/kickoff`** — the named decision-maker and arbiter, the access table with dates and consequences, cadence and channels of record, the definition of done agreed in writing, the change-request process explained on day one, and a technical kickoff that proves you can build, run and deploy before the first sprint.
- **`/status`** — the report whose job is that nobody is surprised: defensible progress (milestones, not percentages), budget burn, a blockers section naming who must act and since when, decisions needed, and how to report a red project early with options rather than at the deadline.
- **`/change-request`** — qualification first (in scope · ambiguity · out of scope · **defect**, which is never a change request), quantification including rework and regression risk, schedule impact priced separately from effort, three options including deferral, written approval before any work, and a log that makes absorbed goodwill visible.
- **`/invoice`** — billing reconciled against the contract and actual acceptance, the sweep for approved change requests that were never billed, cap warnings before the cap is reached, and an effective-rate recap that feeds the next estimate.

### Added — team practice (4 commands)

`/meeting` (no objective, no meeting; the decision-maker attends or the decision isn't on the agenda; a same-day record of decisions and owned actions), `/tech-debt` (inventory from git evidence, cost in days and risk, a pitch in business language with a payback period, repayment inside normal delivery, effect measured afterwards), `/interview` (signals defined before the first call, a timeboxed exercise resembling the job, independent evidence-based scoring, a decision rule agreed in advance, and every candidate answered), `/onboarding` (the cold walk before arrival, a merged change on day one, the six-part codebase map, the 30-day arc and the week-4 retro).

### Added — `consulting.md` field notes

Pricing models and who carries the risk in each · why estimates are structurally wrong (the planning fallacy, the forgotten 40–60%, productive-time arithmetic) · the mechanics of scope creep and the only defense that works · client dependencies as project risks · communication rules · payment hygiene · where it usually gets decided wrong. Wired into the `expertise` rule's reference map.

### Installer

New profile group `pro`; routing rows for the ten new skills.

## 3.2.0 — 2026-08-27

The expertise release: 14 more skills, and a **field-notes layer** that turns the kit from a set of procedures into a set of specialists.

### Added — field notes (`.claude/references/`, 10 domains)

Dense domain references the skills consult and answer from: the mechanism that actually produces the behavior, the trap that looks correct, a symptom → cause → confirm → fix table, the numbers worth knowing, and where the decision usually goes wrong.

`database.md` (plan/statistics/index-order, reading EXPLAIN, isolation anomalies, migration lock profiles) · `frontend.md` (rendering costs, framework reactivity traps, hydration mismatches, the CSS rules behind most layout bugs) · `security.md` (access control first, injection by interpreter, auth traps, secrets, supply chain, LLM) · `distributed.md` (the three outcomes of a network call, retry rules, idempotency, outbox/inbox, ordering, backpressure) · `http.md` (Cache-Control decoded, Vary, status semantics, cookies, CORS, CDN) · `devops.md` (container layers and PID 1, the Kubernetes failure table, proxy traps, zero-downtime requirements) · `testing.md` (where false greens come from, level selection, the four causes of flakes) · `llm.md` (reliable output, injection as architecture, evals, cost levers, RAG diagnosis) · `mobile.md` (process death, offline, permissions, the upgrade-path test) · `architecture.md` (coupling as the currency, monolith vs services, failure design, strangler fig).

Twenty-one existing skills and eight stack-aware templates now point at their notes.

### Added — `expertise` rule (always active)

Maps every domain to its notes, and sets the standard for answering a question in one: **mechanism → the trap that applies here → the verification → what would change the answer**, read from the notes rather than recalled. Versioned facts (pricing, API versions, deprecations) are always fetched live and cited; the notes never override the repository's own reality.

### Added — backend systems (6 commands)

`/jobs` (outbox instead of enqueue-and-hope, idempotent handlers, retryable vs terminal, DLQ with replay, scheduled-job locking and DST), `/cache` (keys that encode every input, invalidation strategy, stampede protection, and never caching identity-dependent data in a shared cache), `/realtime` (transport chosen honestly, reconnection **with state recovery**, per-subscription authorization, shared bus across instances, backpressure), `/search` (start with Postgres, outbox-fed indexing, alias-swap reindex, relevance against a judgment set, permission filtering in-query), `/files` (presigned direct upload, validation on bytes, re-encoded images, separate origin, signed URLs), `/api-design` (one error envelope with machine codes, cursor pagination, idempotency keys, rate-limit headers, versioning with a sunset path).

### Added — product engineering (5 commands)

`/llm` (structured output + validation, prompt injection as an architectural problem, evals **before** prompt tuning, cost/latency levers, degraded mode), `/flags` (owner and removal date at creation, safe defaults, deterministic bucketing, staged rollout, pre-registered experiment decisions), `/analytics` (tracking plan from questions, one convention, server-side outcomes, anonymous→user aliasing, no PII), `/architecture` (boundaries and data ownership, sync vs async, a failure table per dependency, ADRs for one-way doors), `/refactor` (characterization tests first, one mechanical change per commit, strangler fig).

### Added — infrastructure (3 commands)

`/k8s` (probes — liveness never checks a dependency — resources, rollouts that drop zero requests, config reload, autoscaling on the right metric), `/iac` (remote locked state, reading a plan for destroy/replace, pinning, drift, safe adoption), `/cost` (attribute before optimizing, unit economics, the waste checklist, a cut list with risk and reversibility).

### Installer

Field notes install to `.claude/references/` and are listed by `list`; new profile groups `backend` and `product`; `platform`, `quality` and `plan` extended; `expertise` added to the core rules; routing rows for every new skill. Fixed: `remove <skill>` no longer deletes a shared field-notes file.

## 3.1.0 — 2026-08-27

Filling the gaps: the parts of a real product the kit didn't cover yet — the database, auth, money, running it in production, and the compliance and reach layers.

### Added — data, auth & money (4 commands, 1 agent)

- **`/db`**: schema design (keys, constraints, money and time types, tenancy), migrations with a tested `down` and a stated lock profile, expand→migrate→contract for breaking changes, `EXPLAIN`-driven optimization, N+1 hunting, and a **restore test** with measured RPO/RTO.
- **`/auth`**: sessions vs tokens with revocation as the deciding factor, cookie flags, session regeneration, Argon2id/bcrypt, reset and MFA flows, OAuth2 with PKCE and validated `state`/`nonce` — then the half that's usually missing: object-level (IDOR) checks, deny-by-default routes, one policy layer, and the negative test suite that proves it.
- **`/payments`**: the webhook is the source of truth and the redirect grants nothing; idempotency keys derived from your own ids, server-computed amounts re-verified against the provider, a guarded state machine, dunning, refunds, and reconciliation against the provider's books.
- **`/rgpd`**: data map, retention as an enforced job, consent gating *before* trackers load, export/erasure covering logs, backups and processors, transfers, and breach readiness — with legal decisions routed to the organization rather than invented.
- Agent **`specialist-database`** — schema constraints, indexes, N+1, transaction scope, locking, tenancy filters; `/pr-review` now dispatches **eleven** specialists.

### Added — running it in production (4 commands)

`/observability` (correlation ids, RED + business metrics, OpenTelemetry, alerts that page only for user-visible symptoms, SLOs with an error budget), `/incident` (mitigate before diagnosing, timeline, comms cadence, blameless postmortem with owned actions), `/env` (config classification, boot-time validation, secret storage, zero-downtime rotation), `/upgrade` (one major per branch, migration guide filtered to real call sites, behavior changes exercised).

### Added — reach & quality (4 commands)

`/seo` (indexability, canonicals, per-template metadata, JSON-LD, sitemaps from the source of truth), `/i18n` (ICU messages, `Intl` formatting, locale routing, RTL, catalog drift, the non-UI surfaces), `/testing` (which level each behavior belongs at, missing negative paths, flake elimination, every new test proven to fail first), `/notifications` (SPF/DKIM/DMARC, separated streams, async sending with bounce suppression, push permission timing and token lifecycle).

### Added — `evidence` rule (always active)

No claim without proof: "tests pass", "it's fixed", "it's deployed", "X isn't used anywhere" each require the command that was run in this session. Skipped checks are named rather than rounded up, failures are reported with their output, and another agent's report counts as a claim, not as evidence.

### Installer

New profile groups `data` and `security`; `quality`, `frontend`, `api` and `platform` extended; `evidence` added to the always-installed core rules; routing rows for every new skill.

## 3.0.0 — 2026-08-27

The fullstack release: from a dev-lifecycle kit to a kit that runs the whole job — a project from idea to delivery, a feature across every layer, the frontend, the mobile app, the integrations, and the platform underneath.

### Added — project mode (7 commands)

`/project` (persistent state in `.claude/project/<slug>/`, gates you decide, "what's next" routing), `/brainstorm` (frame → 8 divergence lenses → challenge → scored convergence), `/cdc` (cahier des charges with testable F-xx/N-xx requirements, non-scope, acceptance criteria, deliverables, budget, amendments), `/roadmap` (phases, critical path, honest capacity math), `/exec-plan` (≤1-day tasks with done criteria and binary gates, optional issue emission), `/validate` (acceptance against the CDC, S1–S4 defect grid, ACCEPTED / WITH RESERVES / REFUSED), `/delivery` (handover, access transfer, credential rotation, training, warranty, sign-off).

### Added — fullstack orchestration (3 commands, 4 agents)

- **`/fullstack`**: contract-first feature across db → api → client. The contract is frozen at a gate, layers are built **in parallel** by agents with hard file boundaries, and a layer that needs a change emits a change request instead of drifting silently.
- **`/contract`**: define, freeze, version, generate (types/clients/mocks) and drift-check the API contract — `--from-code` extracts one from an undocumented API.
- **`/orchestrate`**: controlled fan-out — DAG → waves with no file overlap, dispatch specs, orchestrator-run verification per wave, boundary-breach handling, cost reported at every gate.
- Agents `contract-keeper`, `backend-builder`, `frontend-builder`, `integration-verifier`.

### Added — frontend (4 commands + stack-aware `/component`)

`/a11y` (WCAG 2.2 AA: automated pass plus the keyboard/screen-reader/contrast/zoom passes automation misses), `/responsive` (320px → 4K, landscape, 200–400% zoom, touch targets, content parity), `/web-vitals` (measure → attribute the cause → fix → re-measure → budget), `/state` (server vs client vs URL vs form state, cache keys, invalidation, races), and `/component` with React / Vue / Svelte variants + generic: designed API, all five states, a11y in the build, tests.

### Added — mobile (1 command + stack-aware `/mobile`)

`/mobile` (React Native / Expo / Flutter variants + generic: offline, permissions, safe areas, font scale, platform parity) and `/mobile-release` (OTA-or-build decision, signing, the upgrade-from-previous test, staged rollout, rollback decided before submission).

### Added — APIs (4 commands, 1 agent)

`/api-scout` (find and score public APIs from live sources — registries, cloud-native, self-hostable, open data — with cited pricing and limits), `/integrate` (auth, typed boundary, timeouts, retries with jitter, idempotency, rate limits, pagination, secrets, fixture-based tests), `/webhook` (raw-body signature verification, replay window, dedupe by unique constraint, async processing, DLQ; `--audit` for existing endpoints), `/api-refresh` (inventory → live changelogs/deprecations matched to your call sites → sunset-ordered migration plan). Agent `specialist-integration`.

### Added — platform (3 commands + stack-aware `/cicd`)

`/cicd` (GitHub Actions / GitLab CI variants + generic: coverage, caching, least-privilege permissions/OIDC, deploy gates), `/docker` (multi-stage, cache-correct layers, non-root, no secrets in layers, healthchecks, signals, size/scan report), `/nginx` (reverse proxy, TLS, cache correctness, security headers, rate limiting, SPA/SSR routing), `/git` (conflicts, history hygiene, bisect, reflog recovery, safe undo, GitHub/GitLab flows).

### Added — review specialists

`specialist-accessibility`, `specialist-frontend-perf`, `specialist-integration` — `/pr-review` now dispatches **ten** specialists, with detection rules for interactive markup, client-side cost, and third-party calls.

### Installer

- New profile groups: `project`, `agentic`, `frontend`, `mobile`, `api`, `platform`.
- Stack detection: Expo / React Native / Flutter, and the CI provider (GitHub Actions, GitLab CI, Jenkins, CircleCI, Bitbucket, Azure).
- New stack-aware template categories `component`, `cicd`, `mobile` — gated by profile group, and `mobile` installs only for a mobile project.
- `list` shows the stack-aware skills that belong to each group; `init` reports the detected mobile framework and CI provider.

## 2.3.0 — 2026-07-29

No conversation is lost.

- **`setup-rag` now installs discussion capture**: a PostCompact hook feeds every compaction summary — already an LLM-distilled digest of the conversation, far better signal than raw transcripts — into the local RAG (collection `discussions`), secret-redacted, with a markdown archive in `~/.claude/discussions/`. Async: never blocks a session. Query from any project: "qu'est-ce qu'on s'était dit sur X ?". `--remove` cleans it up (archives kept).

## 2.2.0 — 2026-07-28

Architecture Decision Records, recorded automatically.

- **`/adr` command**: create (`new`, with a mandatory options-considered table), `list`, `show`, `status` (supersede with back-links, accepted ADRs immutable), `from-decisions` (promote significant `.claude/decisions.jsonl` entries), `index` (into the local RAG, collection `<repo>-adr`).
- **`decisions` rule upgraded**: architecture-shaping decisions (module boundaries, lock-in dependencies, one-way doors, quality tradeoffs) now auto-escalate into an ADR **the moment they land**, cross-linked with the JSONL entry; accepted ADRs are binding — Claude follows them or proposes a superseding ADR, never silently contradicts one.

## 2.1.0 — 2026-07-28

Local semantic memory (RAG) in one command.

- **`npx claude-skills-kit setup-rag`**: installs a shared local vector store — Chroma server in Docker (auto-restart, one server coordinating all parallel sessions), local ONNX embeddings (no API key), `rag` MCP server registered user-scope, SessionStart auto-heal hook, and a usage policy in `~/.claude/CLAUDE.md` (when to query/index, anti-duplication conventions, secrets excluded). `--port <n>` to customize, `--remove` for a clean uninstall (data preserved).
- **`/rag` command**: status, collections, `index <path>` (chunking, stable ids, metadata), `search <query>` (cross-collection semantic search with honest-distance reporting).

## 2.0.1 — 2026-07-28

Docs only: installer demo GIF in the README (also fixes the command count: 42 in full profile).

## 2.0.0 — 2026-07-28

The lifecycle release: from a review/debug kit to a complete dev-lifecycle kit.

### Added — 31 new commands

- **Plan & spec**: `/spec`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/plan-devex-review`, `/autoplan`, `/office-hours`
- **Ship & release**: `/ship`, `/deploy`, `/canary`, `/release-notes`, `/retro`, `/pr-review`
- **Quality**: `/qa`, `/health`, `/benchmark`, `/devex-review`, `/cso`, `/investigate`
- **Design**: `/design-system`, `/design-variants`, `/design-html`
- **Knowledge**: `/learn`, `/decisions`, `/context-save`, `/context-restore`, `/document`, `/diagram`, `/make-pdf`, `/scrape`, `/skillify`

### Added — 7 specialist review subagents

`specialist-security`, `specialist-red-team`, `specialist-performance`, `specialist-api-contract`, `specialist-data-migration`, `specialist-maintainability`, `specialist-testing` — dispatched automatically by `/pr-review` based on what the diff touches.

### Added — 4 new rules

`freeze` (scope edits to a directory), `guard` (maximum-safety mode), `redact` (secret detection before any write/commit/report), `decisions` (automatic decision logging to `.claude/decisions.jsonl`).

### Improved

- **Subagents now actually register**: all agent files gained the YAML frontmatter (`name`, `description`, `tools`) Claude Code requires.
- **Commands gained frontmatter** (`description`, `argument-hint`) so they show properly in `/help` and autocomplete.
- **Installer v2**: `list`, `add <skill>`, `remove <skill>`, `update` commands; `--profile` (core, plan, ship, quality, design, knowledge, guard, or full); managed CLAUDE.md block that refreshes in place; rules activated via `@.claude/rules/*.md` imports.
- **Stack detection v2**: Remix, Astro, SvelteKit, Nuxt, Angular, Vue, NestJS, Fastify, Hono; shadcn/MUI/Bootstrap; Playwright/Cypress; package manager, TypeScript, monorepo markers; Python/Go/Rust/PHP projects get the generic skill set instead of an error.
- **Generic fallback templates** for `/debug`, `/test`, `/build`, `/design-review`, `/scaffolder` — no stack is left without them.
- **Enriched `careful` rule** with cloud/infra destructive patterns (terraform destroy, aws s3 rb, dd/mkfs, chmod -R 777, ...).
- Fixed: template variants were silently skipped when a same-named generic command existed.

## 1.0.0

Initial release: `/feat`, `/review`, `/compact`, `/simplify`, `/security-review`, `/fix-review`, `/debug`, `/test`, `/build`, `/design-review`, 5 agents, 3 rules, stack auto-detection.
