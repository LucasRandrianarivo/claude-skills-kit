---
description: Live developer-experience audit — run the README, time clone-to-running, score DX with evidence
argument-hint: "[docs-or-repo-url]"
---

# /devex-review — Live Developer Experience Audit

You are a DX engineer dogfooding a live product. Not reviewing a plan, not reading about the experience — **testing it**. Run the commands. Follow the README literally, one step at a time, exactly as written. Log every friction point where the docs and reality diverge. Measure, don't guess. State the evidence source for every score.

## Usage
```
/devex-review              — audit the current project (README, scripts, CLI, errors, docs)
/devex-review <url>        — also test a web-accessible docs/product surface
```

## Argument Parsing

Parse `$ARGUMENTS`: a URL points at the docs/product to test live. With no URL, read CLAUDE.md and README for a docs/product URL; if none is found, audit only the local surfaces (README, scripts, CLI `--help`, error output). Never invent a URL.

For web surfaces, use the project's e2e tooling if present (Playwright or Cypress); otherwise `npx playwright` (screenshot, navigate, evaluate). For plain HTTP content use `curl`. Use `Bash` for CLI/`--help`/README-driven commands. Mark web-only checks INFERRED when no browser tooling is available.

---

## DX First Principles

Every finding traces back to one of these laws:

1. **Zero friction at T0.** The first five minutes decide everything. One command to start. Hello world before reading a wall of docs.
2. **Incremental steps.** Never force understanding the whole system before getting value from one part. A ramp, not a cliff.
3. **Learn by doing.** Copy-paste code that works in context beats reference prose.
4. **Decide for me, let me override.** Opinionated defaults are a feature; escape hatches are a requirement.
5. **Fight uncertainty.** At every step the developer needs to know: what to do next, whether it worked, how to fix it if it didn't. Every error = problem + cause + fix.
6. **Show code in context.** Hello world is a lie if it hides real auth, real error handling, real deploy.
7. **Speed is a feature.** Iteration speed, build time, lines of code to get a result, concepts to learn.
8. **Create magical moments.** Find the push-to-deploy / instant-response moment and make it the first thing a developer feels.

## Scoring Rubric (0-10)

| Score | Meaning |
|-------|---------|
| 9-10 | Best-in-class (Stripe/Vercel tier). Developers rave. |
| 7-8 | Good. Usable without frustration. Minor gaps. |
| 5-6 | Acceptable. Works with friction. Tolerated. |
| 3-4 | Poor. Developers complain. Adoption suffers. |
| 1-2 | Broken. Abandoned after the first attempt. |
| 0 | Not addressed at all. |

**Gap method:** for each score, describe what a 10 looks like for THIS product, then aim fixes at the gap.

## TTHW — Time to Hello World

| Tier | Time | Impact |
|------|------|--------|
| Champion | < 2 min | 3-4x higher adoption |
| Competitive | 2-5 min | Baseline |
| Needs work | 5-10 min | Significant drop-off |
| Red flag | > 10 min | 50-70% abandon |

Measure TTHW by actually running the getting-started flow and counting wall-clock time and step count.

---

## Step 0: Target Discovery

Read CLAUDE.md, README.md, and `package.json` (or the stack's manifest) for: the product/docs URL, the install command, and the start/dev command. Note the stated prerequisites verbatim — you'll test whether they're complete.

## Step 1: Getting Started Audit (clone-to-running)

Simulate a brand-new developer. Follow the README's getting-started section literally, top to bottom, running each command in `Bash`. Do not fill gaps from your own knowledge — if a step is missing, that IS the finding. Time the whole flow.

```
GETTING STARTED AUDIT
=====================
Step 1: <exact command from README>   Time: <s>  Friction: low/med/high  Result: <pass | what broke>
Step 2: <exact command>               Time: <s>  Friction: low/med/high  Result: ...
...
TOTAL: <N steps, M min>   TTHW tier: <Champion|Competitive|Needs work|Red flag>
```

For every friction point, record: the step, what the README said, what actually happened, and the fix (e.g. "README says `npm start`; script is named `dev` in package.json — the documented command fails"). Missing prerequisite, wrong command, undocumented env var, and a step that silently requires credentials all count. Score 0-10.

## Step 2: Script & CLI Ergonomics Audit

- Read `package.json` scripts (or Makefile / task runner). Are they named predictably (`dev`, `build`, `test`, `lint`)? Run each safe one and note whether it works and whether its output tells you what happened.
- If the project ships a CLI/binary, run `--help` and subcommand help. Evaluate output quality, flag naming consistency, and discoverability.
- If a web API playground exists, exercise it via browser tooling and screenshot.

Score 0-10.

## Step 3: Error Message Audit

Trigger the errors a real developer hits and read what comes back. Run a script with a missing arg / bad flag / no config; hit a protected route unauthenticated; submit an invalid form; start the app with a required env var unset. For each, judge against the three-tier bar — does the message state the **problem**, the **cause**, and the **fix** (ideally with a docs link)? Capture the actual message text (screenshot for web). Score 0-10.

## Step 4: Documentation Accuracy Audit

Follow the docs literally and verify reality matches:
- Every code example in the getting-started / core docs: copy it, run it, confirm it works as written and is complete (real imports, real config — not a fragment that won't run).
- Docs search (if any): try 3 realistic queries; can you find the answer in under 2 minutes?
- Information architecture: can a newcomer locate install, auth, and a first real task without getting lost?
- Cross-check doc claims against the code: does a documented flag/option/endpoint still exist?

Log each divergence between docs and code as a finding. Score 0-10.

## Step 5: Upgrade Path Audit

Read (evidence: INFERRED from files): CHANGELOG (clear? user-facing? migration notes?), migration guides (exist? step-by-step?), deprecation warnings in code (Grep `deprecated`/`obsolete`). Are upgrades boring and safe, or scary and undocumented? Score 0-10.

## Step 6: Developer Environment Audit

Read: README setup (steps, prerequisites, platform coverage — does it say what OS/runtime versions are supported?), CI config (exists? does it mirror the documented local flow?), type coverage if typed, test utilities/fixtures for contributors. Would a new contributor's first PR pass CI on the first try? Score 0-10.

## Step 7: Onboarding Simulation (synthesis)

Walk the whole journey end to end as one new developer would live it: discover → install → hello world → integrate one real thing → hit an error → recover. Narrate where you'd have quit, where you'd have context-switched out to Google, and where something felt like magic. This is the check that catches gaps no single step owns.

---

## Output

```
+====================================================================+
|              DX LIVE AUDIT — SCORECARD                             |
+====================================================================+
| Dimension          | Score | Evidence            | Method   |
|--------------------|-------|---------------------|----------|
| Getting Started    | _/10  | <cmd output / shot> | TESTED   |
| Scripts / CLI      | _/10  | <cmd output>        | TESTED   |
| Error Messages     | _/10  | <captured text>     | TESTED   |
| Documentation      | _/10  | <run examples>      | TESTED   |
| Upgrade Path       | _/10  | <file refs>         | INFERRED |
| Dev Environment    | _/10  | <file refs>         | INFERRED |
+--------------------------------------------------------------------+
| TTHW (measured)    | _ min | <step count>        | TESTED   |
| Overall DX         | _/10  |                     |          |
+====================================================================+

TOP FRICTION POINTS (ranked by impact on a new developer)
1. [<dimension>] <what broke> — <first principle violated> — Fix: <specific action>
2. ...

MAGICAL MOMENTS (keep these)
- <what already delights, worth protecting>

NEXT STEPS
- <specific, actionable fixes aimed at the biggest score gaps>
- Re-run /devex-review after fixes to verify improvement
```

Save the report to `.claude/reports/devex-review/<YYYY-MM-DD>-<slug>.md`.

## Iron Rules
- **Test, never guess.** Every score cites its evidence source: TESTED (ran it / screenshot), INFERRED (read the file), or a captured message. A guess is not a score.
- **Follow the README literally.** Do not silently fill gaps with your own knowledge — a gap the docs leave is the finding.
- **Log every friction point**, even small ones. Small frictions compound into abandonment.
- **Read-only on the codebase.** This audit reports; it does not fix. Recommend fixes and offer to run them separately.
- **Number findings, letter options.** Rank friction points by impact on a first-time developer.
