# Changelog

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
