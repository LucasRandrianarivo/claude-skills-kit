# claude-skills-kit

Production-ready skills, agents, and rules for [Claude Code](https://claude.ai/code). Structured debugging, 4-phase code review, build validation, design audits, and more — auto-detected for your stack.

## Install

```bash
npx claude-skills-kit init
```

The installer detects your stack (Next.js, Vite, antd, Tailwind, Chakra, Vitest, Jest...) and installs the right variant for each skill.

## What you get

### Commands (slash skills)

| Command | What it does |
|---|---|
| `/feat` | Full feature orchestration: analysis, plan, code, test, review |
| `/review` | 4-phase code review: quality, readability, architecture, security |
| `/compact` | Code quality review only (dead code, duplication, typing) |
| `/simplify` | Readability review only (nesting, conditions, abstractions) |
| `/security-review` | Security audit (auth, validation, injection, data protection) |
| `/fix-review` | Auto-fix all issues found by `/review` |
| `/debug` | Structured debugging in 4 phases with iron rule: no fix without root cause |
| `/test` | Run tests, diagnose failures, propose fixes |
| `/build` | Build pipeline: lint, typecheck, format, build |
| `/design-review` | Visual audit: screenshot, detect UI issues, fix, verify |

### Agents

| Agent | Role |
|---|---|
| `code-architect` | Validate architecture, file placement, dependency direction |
| `code-reviewer` | Detailed code review with severity scoring |
| `build-validator` | Run the full build pipeline |
| `test-runner` | Execute tests and diagnose failures |
| `scaffolder` | Generate files for new features following project conventions |

### Rules (always active)

| Rule | What it does |
|---|---|
| `careful` | Block destructive commands (rm -rf, DROP TABLE, git push --force) |
| `learnings` | Log bugs/fixes to `.claude/learnings.jsonl` for cross-session learning |
| `greeting` | "Bonjour" lists all available skills dynamically |

## Stack detection

The installer reads your `package.json` and picks the right template:

| Detected | Debug variant | Test variant | Build variant | Design review | Scaffolder |
|---|---|---|---|---|---|
| Next.js App Router | `nextjs-app` | vitest/jest | `nextjs` | antd/tailwind/chakra | `nextjs-app` |
| Next.js Pages Router | `nextjs-pages` | vitest/jest | `nextjs` | antd/tailwind/chakra | `nextjs-pages` |
| React + Vite | `react-vite` | vitest/jest | `vite` | antd/tailwind/chakra | `react-vite` |
| Node.js backend | `node-express` | vitest/jest | — | — | — |

## File structure after install

```
your-project/
├── .claude/
│   ├── commands/
│   │   ├── feat.md
│   │   ├── review.md
│   │   ├── compact.md
│   │   ├── simplify.md
│   │   ├── security-review.md
│   │   ├── fix-review.md
│   │   ├── debug.md          ← stack-specific
│   │   ├── test.md           ← stack-specific
│   │   ├── build.md          ← stack-specific
│   │   └── design-review.md  ← UI-lib-specific
│   ├── agents/
│   │   ├── code-architect.md
│   │   ├── code-reviewer.md
│   │   ├── build-validator.md
│   │   ├── test-runner.md
│   │   └── scaffolder.md     ← stack-specific
│   ├── rules/
│   │   ├── careful.md
│   │   ├── learnings.md
│   │   └── greeting.md
│   └── learnings.jsonl
└── CLAUDE.md                  ← skill routing appended
```

## Options

```bash
npx claude-skills-kit init              # auto-detect and install
npx claude-skills-kit init --force      # overwrite existing files
npx claude-skills-kit init --dry-run    # preview without writing
```

## How it works

### `/debug` — Structured debugging

Every bug goes through 4 mandatory phases:

1. **Reproduce** — Confirm the bug exists, get the exact error
2. **Analyze** — Trace the data flow, identify the scope
3. **Hypothesize** — Formulate 2-3 hypotheses ranked by probability
4. **Fix** — Only after root cause is confirmed

**Iron rule: no fix without root cause identified.**

### `/review` — 4-phase code review

| Phase | Focus | Output |
|---|---|---|
| 1. Quality | Dead code, duplication, naming, typing, error handling | Score /10 |
| 2. Readability | Nesting, conditions, clarity, abstractions | Score /10 |
| 3. Architecture | File placement, dependencies, patterns | Score /10 |
| 4. Security | Auth, validation, injection, data protection | Score /10 |

### Learnings system

After each `/debug`, Claude logs what went wrong in `.claude/learnings.jsonl`. Next time you debug, it reads past learnings first — so it never makes the same mistake twice.

### Skill routing

The installer adds routing rules to your `CLAUDE.md` so Claude automatically invokes the right skill:

- "ca marche pas" → `/debug`
- "ajoute une feature" → `/feat`
- "review mon code" → `/review`
- "lance les tests" → `/test`

## Customize

Every installed file is a plain markdown file in your `.claude/` directory. Edit them freely to match your project's conventions, add project-specific rules, or extend the methodology.

## Uninstall

Just delete the files from `.claude/`. No global state, no dependencies, no lock-in.

## Contributing

PRs welcome. To add support for a new framework or UI library:

1. Add a template variant in `templates/<category>/<variant>.md`
2. Update the detection logic in `bin/install.js`
3. Update the README stack detection table

## License

MIT
