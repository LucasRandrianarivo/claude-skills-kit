---
description: Core Web Vitals & bundle budget — measure LCP/INP/CLS, find the real cause, fix, re-measure
argument-hint: "[route] [--budget] [--compare <ref>] [--report-only]"
---

# /web-vitals — Frontend Performance

## Usage
```
/web-vitals                    — measure the main routes, diagnose, fix the top offenders
/web-vitals /product/123       — one route
/web-vitals --budget           — set/enforce a performance budget, no fixes
/web-vitals --compare main     — measure this branch against another ref
/web-vitals --report-only      — measure and diagnose, change nothing
```

## Overview
`/benchmark` tracks whether numbers moved. This skill explains **why** they moved and fixes it. It measures the three Core Web Vitals that decide perceived speed — **LCP** (loading), **INP** (responsiveness), **CLS** (stability) — plus the bundle budget that drives all three, and never accepts a fix that isn't re-measured.

Iron rule, inherited from `/debug`: **no optimization without a measured cause.** A guessed bottleneck fixed is a regression waiting to happen.

---

## Phase 1: Baseline

1. Build the app the way production builds it (`build` script, production mode, minified) — dev-server numbers are fiction.
2. Serve the production build locally; note the URL.
3. Pick routes: `$ARGUMENTS`, else the entry route plus the two heaviest routes by bundle size, plus any route touched by the current branch.
4. Measure each route **cold** and **warm**, at desktop and at mobile emulation with 4× CPU throttling and Slow 4G — the mobile numbers are the ones users feel.

Use what the project has, in this order: an existing Lighthouse CI config → `npx lighthouse <url> --output=json --preset=desktop` / mobile → a Playwright script reading `PerformanceObserver` entries (`largest-contentful-paint`, `layout-shift`, `event` with `duration`) and `performance.getEntriesByType('navigation'|'resource')`.

Record, per route:

| Metric | Good | Needs work | Poor |
|---|---|---|---|
| LCP | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| TTFB | ≤ 0.8s | ≤ 1.8s | > 1.8s |
| Total JS (gzip) | ≤ 170KB | ≤ 300KB | > 300KB |

Lab measurements are noisy: run each route 3× and use the **median**. A single run proves nothing.

## Phase 2: Attribute — find the actual cause

For each metric that isn't Good, identify the mechanism. Do not skip to fixes.

**LCP** — identify the LCP element (`PerformanceObserver` entry `.element`), then classify the delay:
- TTFB-bound → server/SSR/data-fetch waterfall, no caching, cold function
- Resource-load-bound → hero image unoptimized, not preloaded, lazy-loaded above the fold, wrong format/size, font blocking render
- Render-delay-bound → client-side data fetch before first paint, render-blocking JS/CSS, hydration gating content

**INP** — capture the slowest interactions (long `event` entries + Long Animation Frames). Classify:
- Input delay → main thread busy at click time (hydration, big JSON parse, third-party script)
- Processing → a handler doing heavy sync work, an expensive state update fanning out, a re-render of a large subtree
- Presentation delay → layout thrash (read/write cycles), heavy CSS, a giant DOM

**CLS** — list every shift with its source node and score:
- Images/iframes/ads without dimensions or `aspect-ratio`
- Fonts swapping (`font-display`, missing `size-adjust`)
- Content injected above existing content (banners, toasts, skeleton→content size mismatch)
- Animating `top/left/height` instead of `transform`

**Bundle** — build with a stats/visualizer output when available (`rollup-plugin-visualizer`, `webpack-bundle-analyzer`, `next build` output, `vite build --mode production` + `--sourcemap`). Then list:
- The 10 largest modules in the entry chunk
- Duplicated dependencies (two versions of the same lib) and duplicated polyfills
- Heavy libs pulled in whole for one function (moment, lodash, date-fns default import, icon packs, chart libs)
- Anything server-only, dev-only, or test-only leaking into the client bundle

## Phase 3: Report

```
## Web Vitals — <route> (mobile, throttled, median of 3)

| Metric | Value | Rating | Cause | Fix | Est. gain |
|---|---|---|---|---|---|
| LCP | 4.1s | poor | hero <img> 1.4MB PNG, no preload | AVIF/WebP + width hints + preload | ~1.6s |
| INP | 380ms | needs work | filter handler re-renders 900-row table | memoize row + virtualize list | ~250ms |
| CLS | 0.18 | needs work | banner injected above fold | reserve height | 0.18 → ~0 |

Bundle: 412KB gz entry — top offenders: <lib> 96KB, <lib> 61KB (duplicated), icons 40KB
```

Rank fixes by **gain ÷ risk**, not by how interesting they are.

## Phase 4: Fix

Unless `--report-only`, apply the ranked fixes one at a time, re-measuring after each. Standard moves, cheapest first:

- **Images**: modern format, correct intrinsic size, `width`/`height` or `aspect-ratio`, `loading="lazy"` below the fold only, `fetchpriority="high"` + `<link rel=preload>` for the LCP image, responsive `srcset`.
- **Fonts**: self-host, subset, `font-display: swap`, preload the one font used above the fold, `size-adjust`/fallback metrics to kill the swap shift.
- **JS**: route-level code splitting, dynamic `import()` for below-the-fold and modal-only code, tree-shakeable imports (`import { x } from 'lib'`, never the whole namespace), drop a heavy dependency for a native API when the used surface is small, move work off the main thread or to the server.
- **Data**: parallelize request waterfalls, fetch on the server where the framework allows, cache with proper headers, stream/suspend rather than blocking the whole page on the slowest query.
- **Rendering**: virtualize long lists, memoize expensive subtrees, split state so a keystroke doesn't re-render the page, debounce/transition non-urgent updates, `content-visibility: auto` for offscreen sections.
- **Third parties**: audit every script; load non-critical ones after interaction; a tag manager pulling 200KB is a product decision — surface it, don't silently keep it.

After each fix: re-run the measurement, record the delta. **A fix that doesn't move the metric gets reverted**, not kept "because it's cleaner".

## Phase 5: Budget & guard

With `--budget`, or after fixing:

1. Write the agreed thresholds where the stack enforces them — `lighthouserc.json` assertions, `budget.json`, `bundlesize`/`size-limit` config, or a CI step failing on regression.
2. Keep the budget honest: set it at *current + small headroom*, not at an aspirational number nobody will defend.
3. Record the run in `.claude/reports/web-vitals-<date>.md` so the next run has a comparison point (same shape as `/benchmark` reports).

## Rules
- Median of 3 runs, production build, throttled mobile — anything else is not a measurement.
- Never report a gain you did not measure after the change.
- Never optimize a route no user hits; check the routes that actually matter first.
- Never trade correctness for a metric (removing a11y-relevant markup, dropping error boundaries, shipping stale cached data) — flag the tradeoff instead.
- Third-party and design decisions (a hero video, an analytics suite) are reported with their cost, not silently removed.
