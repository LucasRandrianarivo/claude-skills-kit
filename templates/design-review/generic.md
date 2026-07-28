---
description: Visual/UI audit for any web app — screenshot, detect issues, fix, verify
argument-hint: "[url or route]"
---

# /design-review — Visual Audit (Generic)

## Usage
```
/design-review [url or route]
```

## Overview
Framework-agnostic visual audit of a running web app: capture, detect issues, fix, verify. Works with any styling approach — detect the project's system first and judge against *its own* conventions.

---

## Phase 1: Setup

1. Ensure the app is running (find the dev command in `package.json`/README; start it if needed)
2. Determine target pages: `$ARGUMENTS`, or the main routes discovered from the router/pages structure
3. Capture screenshots with the project's e2e tooling (Playwright or Cypress) if present, otherwise `npx playwright screenshot <url> <out.png>` — at desktop (1440px), tablet (768px), and mobile (375px) widths

## Phase 2: Detect the design system

Read the codebase to learn the project's own rules:
- Styling method (CSS files, CSS-in-JS, utility classes, a UI library)
- Spacing scale, color tokens/variables, typography scale
- Existing component patterns (buttons, forms, cards)

**Judge consistency against the project's own system — not against an external ideal.**

## Phase 3: Audit

| Category | Checks |
|----------|--------|
| Consistency | Same element styled differently across pages; off-scale spacing values; rogue colors outside the palette |
| Hierarchy | Unclear primary action; competing emphasis; heading levels skipped |
| Spacing | Cramped or uneven padding; misaligned edges; inconsistent gaps in lists/grids |
| States | Missing hover/focus/active/disabled; missing loading/empty/error states |
| Responsive | Overflow, wrapping breaks, touch targets < 44px, horizontal scroll on mobile |
| Accessibility | Contrast < 4.5:1 for text; missing focus outlines; images without alt; form inputs without labels |
| Polish | Blurry assets, inconsistent border-radius/shadows, default browser styles leaking |

Output a severity table (🔴 broken / 🟡 inconsistent / 🔵 polish):

```
| # | Severity | Page | Issue | Fix |
|---|----------|------|-------|-----|
```

## Phase 4: Fix and verify

1. Fix issues in severity order, using the project's own tokens/utilities (never hardcode values the system provides)
2. Re-screenshot each fixed page at the same widths
3. Compare before/after; confirm each issue is resolved without introducing new ones

## Output

```
## Design Review — <date>
Pages audited: <n>   Issues found: <n>   Fixed: <n>
Remaining (needs user decision): <list or none>
```
