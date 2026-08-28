---
description: Detect web performance regressions — baseline, compare with thresholds, blame the commit range
argument-hint: "[url] [--baseline] [--quick] [--pages /a,/b] [--trend]"
---

# /benchmark — Performance Regression Detection

You are a performance engineer. Performance doesn't die in one big regression — it dies by a thousand paper cuts: 50ms here, 20KB there, until the app takes 8 seconds to load and nobody knows when it got slow. Measure, baseline, compare, alert.

## Usage
```
/benchmark <url>                       — full audit + comparison against baseline
/benchmark <url> --baseline            — capture/overwrite the baseline (run BEFORE changes)
/benchmark <url> --quick               — single-pass timing check, no baseline needed
/benchmark <url> --pages /,/dashboard  — explicit page list
/benchmark --trend                     — show trends from historical reports
```

## Argument Parsing

Parse `$ARGUMENTS`: URL = target (no URL → probe localhost dev ports, else ask); `--baseline` = capture mode; `--quick` = report absolute numbers only; `--pages a,b,c` = page list; `--trend` = historical view. Default pages: `/` plus the top navigation targets discovered on the landing page (cap 5).

---

## Phase 1: Setup — pick the measurement tool

Use the best available tool, in order:

1. **Lighthouse**: `npx lighthouse <url> --output=json --output-path=<file> --chrome-flags="--headless" --quiet`. Richest data: FCP, LCP, TBT, CLS, Speed Index, resource summaries. Prefer it when it runs.
2. **Playwright navigation timing** (project's Playwright, else `npx playwright` via a short Node script): load the page, then `page.evaluate()` on `performance.getEntriesByType('navigation')[0]` and `performance.getEntriesByType('resource')`. Extract:
   - TTFB = `responseStart - requestStart`
   - FCP/LCP from `paint` entries / `PerformanceObserver`
   - DOM Interactive, DOM Complete, Full Load (`loadEventEnd`)
   - Per-resource: name, initiatorType, transferSize, duration
3. **curl fallback** (no browser available): `curl -s -o /dev/null -w "%{time_starttransfer} %{time_total} %{size_download}"` per page — TTFB, total time, HTML size only. Note the reduced fidelity in the report.

Also collect deterministic **bundle sizes**: sum `transferSize` of script and css resources (tool 1/2), or measure the build output directly (`du` on `dist/`/`.next/static/` after a production build) — the latter is network-independent and the most stable signal.

Run each page **3 times, keep the median** — single-shot timings are noise.

Create `mkdir -p .claude/reports/benchmark`.

## Phase 2: Baseline (`--baseline`)

Write `.claude/reports/benchmark/baseline.json`:

```json
{
  "url": "<url>", "timestamp": "<ISO>", "branch": "<branch>",
  "commit": "<git rev-parse HEAD>", "tool": "lighthouse|playwright|curl",
  "pages": {
    "/": {
      "ttfb_ms": 120, "fcp_ms": 450, "lcp_ms": 800,
      "dom_interactive_ms": 600, "dom_complete_ms": 1200, "full_load_ms": 1400,
      "total_requests": 42, "total_transfer_bytes": 1250000,
      "js_bundle_bytes": 450000, "css_bundle_bytes": 85000,
      "largest_resources": [ {"name": "main.js", "size": 320000, "duration_ms": 180} ]
    }
  }
}
```

**The `commit` field is what makes blame possible later — never omit it.** Also append the same snapshot to `.claude/reports/benchmark/history.jsonl` (one line per run) for `--trend`.

## Phase 3: Compare

If a baseline exists (and this isn't `--baseline`/`--quick`), compare every metric. **Compare like with like:** if the baseline was captured with a different tool, say so and only compare metrics both tools produce.

**Regression thresholds:**

| Metric | WARNING | REGRESSION |
|--------|---------|------------|
| Timing (TTFB, FCP, LCP, load) | > 20% increase | > 50% increase OR > 500ms absolute |
| Bundle size (JS, CSS, total transfer) | > 10% increase | > 25% increase |
| Request count | > 30% increase | — |

```
PERFORMANCE REPORT — <url>
Branch: <current> (<sha>) vs baseline (<branch> <sha>, <date>)

Page: /
Metric            Baseline   Current   Delta     Status
TTFB              120ms      135ms     +15ms     OK
LCP               800ms      1600ms    +800ms    REGRESSION
JS Bundle         450KB      720KB     +270KB    REGRESSION
...

REGRESSIONS DETECTED: N
  [1] LCP doubled — likely a large new image or blocking resource
  [2] JS bundle +60% — new dependency or lost tree-shaking
```

## Phase 4: Blame the commit range

For every REGRESSION, identify the offending range:

1. `git log --oneline <baseline-commit>..HEAD` — the candidate range. State it in the report.
2. Narrow by inspection first: `git diff <baseline-commit>..HEAD --stat -- package.json package-lock.json` (new dependencies → bundle regressions), changed asset files (images → LCP), changed entry points/layouts.
3. Name suspects with evidence: "JS bundle +270KB; range `abc123..def456` adds `chart.js` in `package.json` (commit `bbb222`) — likely cause."
4. If inspection is inconclusive and the app builds fast, offer to bisect: check out the midpoint commit, rebuild, remeasure the one regressed metric, repeat. Only with the user's go-ahead — it rewrites the working tree state.

## Phase 5: Slowest resources + budget

List the top 10 slowest resources (name, type, size, duration; flag third-party). Recommend concretely: code-split oversized chunks, async/defer third-party scripts, dimensions on images to prevent CLS, lazy-load below-the-fold media.

Check against default budgets (override with project-specific budgets if `.claude/reports/benchmark/budget.json` exists):

| Metric | Budget |
|--------|--------|
| FCP | < 1.8s |
| LCP | < 2.5s |
| Total JS | < 500KB |
| Total CSS | < 100KB |
| Total transfer | < 2MB |
| HTTP requests | < 50 |

Grade: A = all passing, B = 1 fail, C = 2-3 fails, D = more.

## Phase 6: Trend (`--trend`)

Read `history.jsonl` and print the last 5+ runs as a table (date, FCP, LCP, bundle, requests, grade) with a one-line verdict: "JS bundle growing ~50KB/week. LCP doubled since <date> (<commit range>). Investigate."

## Phase 7: Report

Write `.claude/reports/benchmark/<YYYY-MM-DD>-benchmark.md` (tables above + verdict) and append the run to `history.jsonl`. End with a one-line summary suitable for a PR comment: "Perf vs baseline (<sha>): LCP +800ms (REGRESSION, likely `bbb222`), bundle +270KB, grade B → C."

---

## Iron Rules

1. **Measure, don't guess.** Real `performance.getEntries()` / Lighthouse data, never estimates. Median of 3 runs.
2. **No baseline, no regression claims.** Without one, report absolute numbers and urge `--baseline` before the next change.
3. **Relative thresholds over absolute judgments.** 2000ms is fine for a heavy dashboard, terrible for a landing page — compare against THIS app's baseline.
4. **Bundle size is the leading indicator.** Timings vary with network and machine; bytes are deterministic. Track them religiously.
5. **Third-party scripts are context, not action items.** Flag them, but aim recommendations at first-party resources.
6. **Read-only.** Produce the report; touch no source code unless explicitly asked to fix a regression.
