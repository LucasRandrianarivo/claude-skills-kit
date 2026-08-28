---
description: Responsive audit and fix — 320px→4K, fluid type/space, container queries, touch targets, real-device checks
argument-hint: "[route or component] [--report-only] [--widths 320,768,1440]"
---

# /responsive — Responsive Design Audit & Fix

## Usage
```
/responsive                      — audit the routes changed on this branch
/responsive /dashboard           — one route
/responsive src/components/Nav   — one component, everywhere it renders
/responsive --widths 320,390,768,1024,1440,2560
/responsive --report-only
```

## Overview
"Responsive" is not "it has breakpoints". It's: no horizontal scroll at 320px, no orphaned layout at 2560px, text that stays readable at 200% zoom, tap targets a thumb can hit, and no content that only exists on desktop. This skill checks all of that against **the project's own scale** (Tailwind breakpoints, MUI theme, custom tokens) rather than inventing new numbers.

Field notes: `.claude/references/frontend.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Learn the project's scale

1. Read the breakpoint source of truth: `tailwind.config.*` (`screens`), theme `breakpoints`, SCSS/CSS custom properties, or the framework default. Never introduce a new breakpoint that isn't in it.
2. Read the spacing/type scale and the container widths.
3. Detect the approach in use: utility classes, media queries, container queries (`@container`), CSS grid `auto-fit`, JS-measured layout. Mixed approaches are a finding.
4. Pick widths: `--widths`, else `320, 390, 768, 1024, 1440, 2560`. 320px is not optional — it is still the narrowest common viewport.

## Phase 2: Capture

Screenshot each in-scope route at every width, plus:
- **Landscape phone** (844×390) — the viewport that breaks fixed-height heroes and modals
- **200% and 400% zoom** at 1280px, which WCAG treats as a reflow requirement (1.4.10)
- **Both themes** if the app has dark mode

Use the project's e2e tooling (Playwright `setViewportSize`, Cypress `cy.viewport`) or `npx playwright screenshot --viewport-size`.

## Phase 3: Findings

| Check | Failure |
|---|---|
| **Horizontal overflow** | `document.scrollingElement.scrollWidth > innerWidth` at any width. Find the culprit node: `[...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth)` |
| **Fixed widths** | `width: 640px` on a content container, fixed-width tables, `min-width` on a card larger than 320px minus padding |
| **Unwrapped text** | `white-space: nowrap` on user content, long URLs/emails/IDs without `overflow-wrap: anywhere`, unbreakable table cells |
| **Images/media** | Missing `max-width: 100%`, no `srcset`/`sizes`, no `aspect-ratio`, videos that don't scale |
| **Tables** | A data table with no small-screen strategy (horizontal scroll container, stacked rows, or priority columns) |
| **Touch targets** | Interactive elements < 24×24 CSS px (WCAG 2.2 — 2.5.8); < 44×44 for primary mobile actions; targets closer than 8px apart |
| **Hover-only affordances** | Actions revealed only on `:hover` — unreachable on touch. Needs a persistent or focus-triggered equivalent |
| **Viewport units** | `100vh` on mobile (browser chrome) — use `100dvh`/`100svh`; `vw` on text sizes without a clamp |
| **Fluid type** | Font sizes jumping between breakpoints instead of `clamp()`; line length outside 45–85 characters at any width |
| **Sticky/fixed elements** | A sticky header eating a phone's landscape viewport; a fixed footer covering the focused input (WCAG 2.4.11); missing `env(safe-area-inset-*)` on notched devices |
| **Content parity** | Content or actions present on desktop and silently dropped on mobile (`hidden md:block` on something essential) |
| **Breakpoint drift** | Media queries using values absent from the project's scale, or the same layout expressed with three different breakpoint sets |
| **Grid behavior** | Fixed column counts instead of `repeat(auto-fit, minmax(...))`; a 4-column grid that becomes 4 unreadable slivers at 768px |
| **Zoom reflow** | Content lost or requiring 2-D scrolling at 400% zoom |
| **Modals/drawers** | Dialogs taller than the viewport with no internal scroll; full-screen sheets missing on mobile |
| **Input zoom (iOS)** | Font-size < 16px on inputs, which force-zooms Safari |

## Phase 4: Report

```
## Responsive Audit — <scope>

Breakpoints (project): <sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536>
Widths tested: 320 · 390 · 768 · 1024 · 1440 · 2560 · landscape · 200% · 400%

| # | Severity | Width | Where | Issue | Fix |
|---|----------|-------|-------|-------|-----|
| 1 | 🔴 | 320px | OrdersTable.tsx:60 | table forces 780px, page scrolls sideways | wrap in overflow-x container + stack under md |
```

- 🔴 Unusable at a real viewport: horizontal scroll, clipped content, an unhittable control, content missing on mobile.
- 🟡 Usable but wrong: cramped spacing, line length off, awkward wrapping, breakpoint drift.
- 🔵 Polish: rhythm, optical alignment, oversized whitespace at 2560px.

## Phase 5: Fix

Order matters — fix the layout system before patching instances:

1. **Kill the overflow at its source**: replace fixed widths with `max-width` + `width: 100%`, add `min-width: 0` to flex/grid children whose content refuses to shrink (the single most common cause of mobile overflow).
2. **Make the primitive responsive, not the page**: if three pages patch the same card, fix the card.
3. **Prefer intrinsic layout over breakpoints**: `grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))`, `flex-wrap`, `clamp()` for type and spacing. Breakpoints then handle only the genuine layout changes.
4. **Container queries** for components reused in different-width slots — a card in a sidebar and in a full-width grid shouldn't depend on the viewport.
5. **Tables**: horizontal scroll with a visible affordance, or stacked key/value rows under the breakpoint, or priority columns. Pick one and apply it consistently.
6. **Touch targets**: grow the hit area (padding, `::before` overlay), never just the icon.
7. Use the project's tokens for every value you write. A new magic number is a finding, not a fix.

Re-capture every fixed width and prove the issue is gone.

## Phase 6: Guard

- Add an overflow assertion to an existing e2e spec: at 320px, assert `scrollWidth <= clientWidth` for each main route.
- If the project has visual regression tooling, add the narrow width to the matrix.
- Record the run in `.claude/reports/responsive-<date>.md`.

## Rules
- Never add a breakpoint that isn't in the project's scale without flagging it as a design decision.
- Never fix an overflow with `overflow-x: hidden` on `body` — that hides the symptom and silently clips content.
- Never drop content to make mobile fit; reflow it, or raise the tradeoff with the user.
- Test 320px and 400% zoom every time; they catch what 375px hides.
- If nothing is wrong, say exactly `NO RESPONSIVE FINDINGS` and stop.
