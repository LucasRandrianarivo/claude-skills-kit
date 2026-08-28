# Field notes — Frontend (rendering, reactivity, bundles, layout)

Consulted by `/component`, `/web-vitals`, `/responsive`, `/state`, `/a11y`, `specialist-frontend-perf`.

---

## The mental model

Everything the user perceives comes down to four costs:
1. **Bytes** — what must arrive before anything renders.
2. **Main thread** — parse, execute, hydrate, re-render, layout, paint. It is single-threaded; anything long blocks input.
3. **Round trips** — the dependency chain of requests (HTML → JS → API → image), each one at least one RTT.
4. **Layout stability** — content that moves after paint.

A framework choice changes *where* the cost lands, never that it exists. SSR moves the first render to the server and adds hydration; SPA removes the server render and pays it on the client; islands/RSC pay only for the interactive parts.

## Symptom → cause → confirm → fix

| Symptom | Cause | Confirm | Fix |
|---|---|---|---|
| Slow first paint on a fast connection | Render-blocking JS/CSS, or client-side data fetch before first paint | Network waterfall; disable JS and look | SSR/SSG the shell; preload the LCP resource; defer non-critical JS |
| LCP is an image and won't improve | Lazy-loaded above the fold, or discovered late (CSS background, JS-inserted) | LCP entry `.element` + its request start time | `fetchpriority="high"`, `<link rel=preload>`, real `<img>` with dimensions |
| Typing lags in a form | Every keystroke re-renders a large tree | Profiler: commit duration per keystroke | Move state down (uncontrolled or local), split components, debounce derived work |
| Everything re-renders on any change | Context value recreated each render; store selector returning a new object | React DevTools "why did this render" | Memoize the provider value; select primitives; split contexts |
| Scroll janks on a long list | Rendering all rows; heavy per-row work | Frames > 16ms in the performance panel | Virtualize; memoize rows; move formatting out of render |
| Layout shifts after load | Media without dimensions; fonts swapping; injected banners | Layout Shift entries with their source node | `aspect-ratio`/width+height; `size-adjust` fallback fonts; reserve space |
| Hydration mismatch / flash of wrong content | Server and client render differently: `Date.now()`, `localStorage`, locale, `window` checks | Console warning naming the node | Render the same on both, then correct in an effect; or defer that subtree |
| Bundle grew and nobody knows why | Whole-namespace import, a chart/icon/date lib in the entry chunk, duplicated dependency versions | Bundle analyzer, `npm ls <dep>` | Named imports, dynamic `import()` at the interaction boundary, dedupe versions |
| Works locally, breaks in production build | Dev-only behavior: double-invoked effects, unminified globals, source-map-only code, tree-shaking removing a side effect | Build and serve locally | Test the production build; mark side-effectful modules |
| Mobile Safari only bug | `100vh` including browser chrome; `-webkit` behaviors; input zoom under 16px; date parsing of non-ISO strings | Real device or simulator | `100dvh`/`svh`; 16px inputs; parse dates explicitly |

## Reactivity traps by framework

**React** — the render function must be pure; effects synchronize with the outside world, they are not lifecycle hooks. Derived values are computed during render, never stored in state and synced by an effect (that's the #1 cause of "one render behind" bugs). Stale closures in `setInterval`/event handlers capture the first render's variables — use a ref or the functional updater. `key` resets component state deliberately; changing it accidentally (index keys over a reordering list) loses input and scroll position. `useMemo`/`memo` everywhere is not optimization; it adds comparisons and hides the real cost.

**Vue** — reactivity tracks *access*; destructuring a reactive object loses it (`toRefs`). `ref` in template auto-unwraps, in JS it doesn't. Deep watchers on large objects are expensive; watch the specific source. `v-if` and `v-for` on the same element is an ordering bug waiting to happen. Props are one-way — mutating one works until it doesn't.

**Svelte** — runes (`$state`/`$derived`/`$effect`) vs legacy `$:` behave differently on assignment vs mutation; array methods that mutate need reassignment in legacy mode. Effects that write state they also read loop.

**Angular** — change detection runs on every event unless `OnPush`; a getter in a template runs on every cycle. Signals fix most of this, mixing signals with Zone.js does not.

## CSS layout — where the real bugs are

- **`min-width: auto` on flex/grid children** is why long text and tables overflow their container. `min-width: 0` (or `overflow: hidden`) on the child fixes ~80% of "mysterious horizontal scroll".
- `height: 100%` chains break unless every ancestor has a height; use flex/grid instead.
- Margin collapse only happens vertically, between block-level boxes, and not across flex/grid containers or padding/borders.
- Stacking contexts: `transform`, `filter`, `opacity < 1`, `will-change` all create one — that's why your modal is behind the header.
- `position: sticky` silently does nothing if an ancestor has `overflow: hidden/auto`, or if the element has no positioning offset.
- Percentage padding is relative to the **inline size** of the containing block — the aspect-ratio hack of the past, and a surprise in vertical contexts.
- Animate only `transform` and `opacity`; anything else lands on layout or paint, on the main thread.
- Container queries make a component responsive to its slot rather than the viewport — the correct tool for a card used in a sidebar and a full-width grid.

## Numbers worth knowing

- One frame = 16.7ms at 60Hz; a task over 50ms is "long" and blocks input.
- Good: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 — at the **75th percentile** of real users, on mobile.
- ~170KB of gzipped JS is roughly a second of parse+execute on a mid-range Android; that budget is the reason bundle size matters, not the download.
- Every non-preconnected origin costs a DNS + TCP + TLS round trip before its first byte.

## Where this gets decided wrong

- Adding a state library to fix a re-render problem caused by a context value.
- Shipping a UI library for three components, then styling around it.
- Measuring performance on a desktop, on localhost, in dev mode — three separate lies at once.
- Treating accessibility as an audit at the end; the semantics that make it work are the same ones that make selectors stable and tests readable.

## Where to check the current truth
Framework behavior and the Vitals thresholds themselves get revised. Fetch and cite these before stating a version-specific fact — the `expertise` rule requires it:
- Core Web Vitals thresholds — https://web.dev/articles/vitals
- MDN — https://developer.mozilla.org/en-US/docs/Web (CSS layout, HTML semantics)
- react.dev · vuejs.org · svelte.dev · angular.dev — the framework's own current guidance
- Baseline / caniuse — https://caniuse.com for whether a feature is safe to ship
