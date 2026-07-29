# Changelog

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
