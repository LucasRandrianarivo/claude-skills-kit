---
description: Systematically QA a web app — exercise every page, form, and state; fix what breaks
argument-hint: "[url] [--report-only] [--quick|--exhaustive] [--regression] [scope hint]"
---

# /qa — Systematic Web App QA (Test → Fix → Verify)

## Usage
```
/qa                          — diff-aware: test pages affected by the current branch
/qa <url>                    — full QA of the app at <url>
/qa --report-only            — find and document bugs, never fix (report-only mode)
/qa --quick                  — smoke test: homepage + top 5 nav targets
/qa --exhaustive             — also fix low/cosmetic issues
/qa --regression             — compare against .claude/reports/qa/baseline.json
/qa <url> focus on billing   — scope testing to a feature area
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **URL** (`http://...`): the target app. No URL + on a feature branch → diff-aware mode.
- **`--report-only`**: document issues with evidence, never touch source code. Skips the clean-tree check and Phases 5-6 entirely.
- **Tier**: `--quick` fixes critical/high only; default (standard) adds medium; `--exhaustive` adds low/cosmetic.
- **`--regression`**: after testing, diff results against the saved baseline.
- **Free text**: scope hint — restrict exploration to the named feature/pages.

---

## Phase 0: Setup

**1. Pick the browser tooling.** Use the project's e2e tooling if present (check for `playwright.config.*` or `cypress.config.*` and existing specs — reuse their base URL, auth helpers, and fixtures). Otherwise use `npx playwright`: for interactions (click, fill, console capture) write a short throwaway Node script using Playwright's API (`chromium.launch()`); for static capture use `npx playwright screenshot --viewport-size=<w>,<h> <url> <out.png>`. For plain HTTP checks (status codes, redirects, API endpoints) use `curl`.

**2. Find the running app.** Read `package.json` scripts / README for the dev port, then probe: `curl -s -o /dev/null -w "%{http_code}" http://localhost:{3000,4000,5173,8080}`. If nothing responds, ask the user for the URL or whether to start the dev server.

**3. Clean working tree (skip if `--report-only`).** Run `git status --porcelain`. If dirty, stop and ask the user (numbered options): 1) commit current changes first, 2) stash and pop after, 3) abort. Each fix must land as its own atomic commit on a clean base.

**4. Output directory.** `mkdir -p .claude/reports/qa/screenshots`. The report is written incrementally to `.claude/reports/qa/<YYYY-MM-DD>-<domain-or-branch>.md`.

## Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| Diff-aware | no URL, on a feature branch | Map `git diff main...HEAD --name-only` to affected routes (route/controller files → paths, components → pages rendering them, styles → pages including them, API handlers → hit with curl). Test those pages + adjacent ones. If no routes are identifiable from the diff, fall back to Quick — backend and config changes still affect app behavior; never skip browser testing. |
| Full | URL given | Visit every reachable page. Document well-evidenced issues. |
| Quick | `--quick` | Homepage + top 5 nav targets: loads? console errors? broken links? |
| Regression | `--regression` | Full run, then diff against `baseline.json`: fixed / new / score delta. |

---

## Phase 1: Orient

1. Load the target URL; screenshot; capture console errors and failed network requests.
2. Map the navigation: extract links from the rendered DOM. For SPAs the link list is sparse — enumerate nav elements (buttons, menu items) from the DOM instead, and cross-check against the router config in source (`app/`/`pages/` dirs, route files).
3. Detect the framework (note in report): `__next` markers → Next.js, `csrf-token` meta → Rails, `wp-content` → WordPress, client-side routing → SPA.
4. Build the visit list. **Depth judgment:** spend time on core flows (dashboard, checkout, search, settings) over static pages (about, terms).

## Phase 2: Explore

At each page: screenshot, then run the checklist. **Check the console after every interaction** — JS errors that don't surface visually are still bugs.

| # | Check | How |
|---|-------|-----|
| 1 | Visual scan | Screenshot; look for layout breaks, clipped text, broken images, overlap |
| 2 | Interactive elements | Click every button, link, control. Does each do what it says? |
| 3 | Forms | Fill and submit: happy path, empty submit, invalid input, edge cases (very long text, special characters, `<script>` strings, negative numbers) |
| 4 | Navigation | All paths in and out: breadcrumbs, back button, deep links, mobile menu |
| 5 | States | Empty state, loading state, error state, full/overflow state |
| 6 | Console | New JS errors or failed (4xx/5xx) requests after interactions? |
| 7 | Responsive | Re-check at 375x812 (mobile) and 768x1024 (tablet); no horizontal overflow, touch targets ≥ 44px |
| 8 | Auth boundaries | Behavior when logged out; different roles if test accounts exist |

**Auth:** if the user gave credentials, log in through the UI (never write real passwords in the report — use `[REDACTED]`). If 2FA/CAPTCHA blocks you, ask the user to complete it and continue.

## Issue Taxonomy

**Severity ladder:**

| Severity | Definition | Examples |
|----------|------------|----------|
| critical | Blocks a core workflow, causes data loss, or crashes the app | Form submit errors out, checkout broken, data deleted without confirmation |
| high | Major feature broken or unusable, no workaround | Search returns wrong results, upload silently fails, auth redirect loop |
| medium | Works but with noticeable problems, workaround exists | Page load > 5s, missing validation but submit works, layout broken on mobile only |
| low | Minor cosmetic or polish issue | Typo in footer, 1px misalignment, inconsistent hover state |

**Categories:**

| Category | What to look for |
|----------|-----------------|
| Visual/UI | Layout breaks (overlap, clipped text, horizontal scrollbar), broken/missing images, wrong z-index, font/color inconsistencies, animation jank, alignment off-grid, dark mode/theme issues |
| Functional | Broken links (404, wrong destination), dead buttons, missing/wrong/bypassed form validation, incorrect redirects, state not persisting (refresh, back button), race conditions (double-submit, stale data), wrong search results |
| UX | Confusing navigation (dead ends, no breadcrumbs), missing loading indicators, slow interactions (> 500ms, no feedback), vague error messages ("Something went wrong"), no confirmation before destructive actions, inconsistent patterns across pages |
| Content | Typos/grammar, outdated text, leftover lorem ipsum/placeholders, truncation without ellipsis, wrong labels, missing or unhelpful empty states |
| Performance | Page load > 3s, janky scrolling, layout shift after load, > 50 requests on one page, large unoptimized images, blocking JS |
| Console/Errors | Uncaught JS exceptions, failed requests (4xx/5xx), deprecation warnings, CORS errors, mixed content, CSP violations |
| Accessibility | Missing alt text, unlabeled inputs, broken keyboard navigation, focus traps, missing/incorrect ARIA, insufficient contrast, content unreachable by screen reader |

## Phase 3: Document

Document each issue **immediately when found** — don't batch. Number issues `ISSUE-001`, `ISSUE-002`, ...

- **Interactive bugs**: screenshot before the action, perform it, screenshot the result, write repro steps referencing both.
- **Static bugs**: one screenshot showing the problem plus a description.
- **Verify before documenting:** retry once to confirm it's reproducible, not a fluke.
- **Depth over breadth:** 5-10 well-evidenced issues beat 20 vague ones.

## Health Score

Each category starts at 100; deduct per finding: critical -25, high -15, medium -8, low -3 (floor 0). Console: 0 errors = 100, 1-3 = 70, 4-10 = 40, more = 10. Links: -15 per broken link.

| Category | Console | Links | Visual | Functional | UX | Performance | Content | Accessibility |
|----------|---------|-------|--------|-----------|----|-----------|---------|---------------|
| Weight | 15% | 10% | 10% | 20% | 15% | 10% | 5% | 15% |

`score = Σ (category_score × weight)`. Record the baseline score before any fixing.

---

## Phase 4: Triage

Sort issues by severity, then select by tier: Quick → critical + high; Standard → + medium; Exhaustive → all. Issues unfixable from source (third-party widget bugs, infrastructure) are **deferred** regardless of tier.

**If `--report-only`: stop here and jump to Phase 7.** Never read source to suggest fixes; report what's broken, that's the job.

## Phase 5: Fix Loop

For each selected issue, in severity order:

**Iron rule: no fix without root cause.** Follow the `/debug` discipline — reproduce, trace the failing path in source, name the exact cause (file:line), and only then change code. A fix without a diagnosis is a new bug waiting to happen.

1. **Locate**: grep for error messages, component names, route definitions. Only touch files directly related to the issue.
2. **Fix**: the minimal change that resolves the root cause. No drive-by refactors, no unrelated "improvements".
3. **Commit**: `git add <changed files>` + `git commit -m "fix(qa): ISSUE-NNN — short description"`. One commit per fix, never bundled.
4. **Re-test**: reload the affected page, take an after-screenshot, re-check the console.
5. **Classify**: `verified` (re-test confirms, no new errors) / `best-effort` (applied but not fully verifiable) / `reverted` (regression detected → `git revert HEAD`, mark deferred).
6. **Regression test** (verified fixes with JS behavior only — skip pure CSS): read 2-3 neighboring test files and match their conventions exactly; set up the precondition that triggered the bug, perform the action, assert correct behavior (never just "doesn't throw"). Comment: `// Regression: ISSUE-NNN — found by /qa on <date>`. Commit separately: `test(qa): regression test for ISSUE-NNN`. If the project has no test framework, note it and skip. Never modify existing tests or CI config.

**Self-regulation.** Every 5 fixes (or after any revert), stop and evaluate: each revert +15%, each fix touching > 3 files +5%, touching unrelated files +20%, all remaining issues low severity +10%. Above 20% → stop, show the user what's done, ask whether to continue. Hard cap: 50 fixes.

## Phase 6: Final Pass

Re-run QA on all affected pages and recompute the health score. **If the final score is worse than the baseline, warn prominently — something regressed.**

## Phase 7: Report

Save the baseline for future regression runs to `.claude/reports/qa/baseline.json`:

```json
{ "date": "YYYY-MM-DD", "url": "...", "branch": "...", "healthScore": 0,
  "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }],
  "categoryScores": { "console": 0, "links": 0, "visual": 0, "functional": 0, "ux": 0, "performance": 0, "content": 0, "accessibility": 0 } }
```

Write the report to `.claude/reports/qa/<YYYY-MM-DD>-<domain-or-branch>.md`:

```
# QA Report: <app>

| Field | Value |
|-------|-------|
| Date / URL / Branch / Commit | ... |
| Mode / Tier / Scope | full | quick | diff-aware / standard / ... |
| Pages visited / Screenshots | N / N |
| Framework | <detected> |

## Health Score: <N>/100
| Console | Links | Visual | Functional | UX | Performance | Content | Accessibility |
|---------|-------|--------|-----------|----|-----------|---------|---------------|
| N | N | N | N | N | N | N | N |

## Top 3 Things to Fix
1. ISSUE-NNN: <title> — <one line>
...

## Summary
| Severity | Found | Fixed | Deferred |
|----------|-------|-------|----------|
| critical / high / medium / low | ... | ... | ... |

## Issues
### ISSUE-001: <short title>
- Severity: ... | Category: ... | URL: ...
- Description: <expected vs actual>
- Repro: 1. ... 2. ... 3. Observe: ...  (screenshots: .claude/reports/qa/screenshots/issue-001-*.png)
- Fix: verified | best-effort | reverted | deferred — commit <sha>, files <list>   (omit in --report-only)

## Regression vs Baseline   (only with --regression)
| Metric | Baseline | Current | Delta |
Fixed since baseline: ... / New since baseline: ...

## Ship Readiness
Health score <before> → <after>. QA found N issues, fixed M, deferred K.
```

End with the one-line PR summary: "QA found N issues, fixed M, health score X → Y." In `--report-only` mode, end with the issue count and suggest `/qa` for the fix loop.

---

## Iron Rules

1. **Repro is everything.** Every issue gets at least one screenshot. No exceptions.
2. **Test like a user.** Realistic data, complete workflows end-to-end. In report-only mode, never read source code.
3. **No fix without root cause.** (Phase 5 — the `/debug` iron rule.)
4. **One commit per fix.** Revert immediately on regression.
5. **Never include credentials** in reports or repro steps — `[REDACTED]`.
6. **Never refuse the browser.** Even for backend-only diffs, open the app and verify behavior — unit tests are not a substitute for this command.
7. **Write incrementally.** Append issues to the report as found; never delete accumulated screenshots or old reports.
