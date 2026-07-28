# claude-skills-kit

The complete skills kit for [Claude Code](https://claude.ai/code) — **40+ production-ready commands, subagents, and rules** covering the full dev lifecycle: spec → plan reviews → code → debug → QA → review → security → ship → deploy → retro. Auto-detected for your stack, zero dependencies, plain markdown you can edit.

![npx claude-skills-kit init — stack detection and skill installation demo](https://raw.githubusercontent.com/LucasRandrianarivo/claude-skills-kit/main/docs/demo.gif)

## Install

```bash
npx claude-skills-kit init
```

The installer detects your stack (Next.js, Remix, Astro, SvelteKit, Nuxt, Angular, Vue, React+Vite, NestJS, Fastify, Express — plus Python/Go/Rust projects) and installs the right variant of each stack-aware skill, with a generic fallback so **no stack is ever left without a skill**.

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
                                     ▼      specialists)
                             /debug /test /build /qa
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

### Ship & operate

| Command | What it does |
|---|---|
| `/ship` | Full ship workflow: sync base, quality gate, adversarial self-review, version bump, changelog, PR — **never skips the test gate** |
| `/deploy` | Ship + deploy via your project's detected mechanism, then hand off to `/canary` |
| `/canary` | Post-deploy monitoring: poll health, compare against baseline, PASS/DEGRADED/FAIL with rollback steps |
| `/release-notes` | Post-ship docs: generate release notes from git history, update docs where the surface changed |
| `/retro` | Engineering retrospective: what shipped, what churned, what broke, top process improvements |

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

### Subagents

Core agents — used by `/feat`, `/review`, `/build`:

| Agent | Role |
|---|---|
| `code-architect` | Validate architecture, placement, dependency direction (read-only) |
| `code-reviewer` | Structured 4-phase review with severity scoring |
| `build-validator` | Run the full quality gate |
| `test-runner` | Execute tests, diagnose failures |
| `scaffolder` | Generate files following project conventions |

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

### Rules (always active)

| Rule | What it does |
|---|---|
| `careful` | Block destructive commands — filesystem, DB, git, docker, **and cloud CLIs** (terraform destroy, aws s3 rb, ...) |
| `redact` | Secret protection: 35 detection patterns (AWS, GitHub, Stripe, JWT, PEM, connection strings...) — never written, always `<REDACTED>` |
| `freeze` | "freeze to `<dir>`" scopes all edits to that subtree for the session |
| `guard` | Maximum-safety mode: careful escalated + freeze + confirmation gates + dry-run-first |
| `learnings` | Log bugs/fixes to `.claude/learnings.jsonl`; consult them before debugging |
| `decisions` | Auto-log significant decisions to `.claude/decisions.jsonl` |
| `greeting` | "Bonjour" lists all available skills dynamically |

Rules are activated through `@.claude/rules/*.md` imports in the managed CLAUDE.md block, so they actually load every session.

## Profiles

Install only what you need — combine groups freely:

```bash
npx claude-skills-kit init --profile core            # the essential v1 set
npx claude-skills-kit init --profile core,ship,plan  # + ship & plan reviews
npx claude-skills-kit init                           # full (default)
```

| Group | Contents |
|---|---|
| `core` | feat, review, compact, simplify, security-review, fix-review + stack-aware debug/test/build/design-review/scaffolder |
| `plan` | spec, the 4 plan reviews, autoplan, office-hours |
| `ship` | ship, deploy, canary, release-notes, retro, pr-review |
| `quality` | qa, health, benchmark, devex-review, cso, investigate |
| `design` | design-system, design-variants, design-html |
| `knowledge` | learn, decisions, context-save/restore, document, diagram, make-pdf, scrape, skillify |
| `guard` | freeze, guard, redact, decisions rules |

## Stack detection

The installer reads your project files and picks the right template variant:

| Signal | Detected |
|---|---|
| `package.json` deps | Next.js (App/Pages router), Remix, Astro, SvelteKit, Nuxt, Angular, React+Vite, Vue+Vite, NestJS, Fastify, Hono, Express |
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
│   ├── commands/          ← all slash commands (42 in full profile)
│   ├── agents/            ← 12 subagents with proper frontmatter
│   ├── rules/             ← 7 rules, imported by CLAUDE.md
│   ├── context/           ← saved working contexts (/context-save)
│   ├── reports/           ← QA, health, retro, benchmark, security reports
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
