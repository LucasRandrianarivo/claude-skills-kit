---
description: Convert a chosen mock/variant into production-quality HTML/CSS or framework components
argument-hint: "[path to mock/variant or screen description]"
---

# /design-html — Design Finalization

Turn an approved design (a `/design-variants` winner, a mockup image, or a described screen) into production-quality markup: real semantic HTML, responsive behavior, and an accessibility pass — as vanilla HTML/CSS or as a component in the project's framework if one is detected.

## Usage
```
/design-html                                  — auto-detect the latest approved variant
/design-html .claude/designs/pricing-*/final.html
/design-html mockup.png                       — implement from an image
/design-html "dark dashboard with sidebar"    — freeform: design and build live
```

## Argument Parsing

Parse `$ARGUMENTS`: a file path (`.html` variant or image) = the visual reference; free text = freeform mode; empty = auto-detect below.

---

## Phase 1: Input Detection

Check sources in order:

1. **Approved variant**: `ls -t .claude/designs/*/approved.json` — if found, read it and use the linked `final.html` as the reference. If a previously finalized output also exists for this screen, ask: evolve it (preserve manual edits, apply changes on top) or start fresh?
2. **Provided path**: HTML → read it as the reference; image → view it and describe layout, colors, typography, and component structure as your implementation spec.
3. **Freeform**: no reference. Ask about purpose/audience, visual feel (dark/light, playful/serious, dense/spacious), and content structure — then design directly. If the product has no design system at all, suggest running `/design-system` or `/design-variants` first, but don't block.

Always read `DESIGN.md` and the project tokens file if they exist — **their tokens override any values extracted from the reference** for system-level properties (brand colors, font families, spacing scale).

Output a context summary: mode (approved-variant | image | freeform | evolve), reference path, tokens source, screen name.

## Phase 2: Output Format

Detect the project's framework:

```bash
grep -o '"react"\|"vue"\|"svelte"\|"@angular/core"\|"solid-js"\|"preact"' package.json 2>/dev/null | head -1
```

- **Framework detected** → ask (numbered options): 1) vanilla HTML — self-contained preview file (recommended first pass), 2) framework component — native to the project (follow-up: TypeScript or JavaScript, unless the project already answers that).
- **No framework** → vanilla HTML, no question.

For framework output, study 2-3 existing components first and match the project's conventions exactly: file placement, styling approach (CSS modules / Tailwind / styled / cva), props patterns, naming. The component must look like it was written by the same team.

## Phase 3: Build

Vanilla output goes to `.claude/designs/<screen>-<date>/finalized.html`; framework output goes into the project tree at the conventional location.

**Always include:**
- **Semantic HTML5**: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`, `<button>` for actions, `<a>` for navigation, real `<table>` for tabular data, `<label>` wired to every input. Divs are a last resort, not a default.
- **Design tokens as CSS custom properties** — from DESIGN.md/tokens file, or extracted from the reference.
- **Fonts** via Google Fonts `<link>` (vanilla) or the project's existing font pipeline (framework).
- **Responsive behavior**: mobile-first; verify at 375, 768, 1024, 1440px; fluid layout via flex/grid; no fixed pixel heights on text containers — heights come from content; `overflow-x: auto` wrappers on wide tables/code, never a horizontally scrolling page.
- **Dark mode** via `prefers-color-scheme` (plus the project's theme attribute if it has one).
- **Motion respect**: `prefers-reduced-motion` guard on any animation.
- **Real content** from the reference or the product domain. Never lorem ipsum, "Your text here", or stock-photo placeholder divs.

**Never include (AI-slop blacklist):** purple/blue gradients as default, generic 3-column feature grids, center-everything layouts, decorative blobs/waves not in the reference, "Get Started"/"Learn More" CTAs not from the reference, rounded-corner-card-with-shadow as the default component, emoji as visual elements, cookie-cutter left-text/right-image heroes.

## Phase 4: Accessibility Pass

Run this checklist against the built output before showing it:

| Check | Requirement |
|-------|-------------|
| Headings | Single `<h1>`, no skipped levels |
| Landmarks | header/nav/main/footer present; ARIA only where semantics don't suffice |
| Images | Meaningful `alt` text; `alt=""` for decorative |
| Forms | Every input labeled; errors announced next to the field, not only by color |
| Keyboard | Everything reachable by Tab in logical order; no focus traps; visible `:focus-visible` styles |
| Contrast | Text ≥ 4.5:1 (3:1 for large text) — check both themes |
| Touch targets | ≥ 44x44px on interactive elements |
| Clickability | Clickable things look clickable without hover — shape, color, underline |

Fix everything found; note anything intentionally deferred.

## Phase 5: Verify + Refine

**Verification screenshots.** Using the project's e2e tooling (Playwright/Cypress) or `npx playwright screenshot --viewport-size=<w>,<h> "file://<path>" <out.png>`, capture 375, 768, and 1440px. Inspect all three for text overflow, element overlap, and responsive breakage; fix before presenting. If no browser tooling is available, say so and skip.

**Refinement loop:**

```
LOOP:
  1. Open the file (or the dev server route for framework output); show the
     reference alongside for comparison when one exists.
  2. Ask: "What needs to change? Say 'done' when satisfied."
  3. "done" / "ship it" / "looks good" → exit loop.
  4. Apply feedback with surgical Edit-tool changes — never regenerate the
     whole file (the user may have hand-edited it).
  5. Re-screenshot the affected viewport(s) to confirm.
```

Max 10 iterations; then ask whether to keep going or call it done.

## Phase 6: Save + Next Steps

- Write `.claude/designs/<screen>-<date>/finalized.json`: `{ "source": "<reference path|null>", "mode": "...", "output": "<path>", "format": "vanilla|react|vue|svelte", "iterations": N, "date": "...", "branch": "..." }`.
- If no `DESIGN.md` exists, offer to extract the tokens (colors, fonts, spacing, radius, shadows) from the built output into one — future design commands then stay style-consistent automatically.
- Offer (numbered options): 1) copy/wire into the codebase (vanilla mode), 2) build the next screen (one screen per invocation — rerun for each), 3) `/design-review` to audit it against the design system, 4) done.

## Output

```
## Design Finalized — <screen>
- Mode: <approved-variant | image | freeform | evolve>  Format: <vanilla | framework>
- Output: <path>   Iterations: N
- Accessibility: <pass | deferred items listed>
- Verified at: 375 / 768 / 1440   Dark mode: yes/no
- Next: <suggestion>
```

---

## Iron Rules

1. **Fidelity to the reference over code elegance.** When an approved mock exists, match it — if that takes `width: 312px` instead of a grid class, that's correct. Cleanup happens at component-extraction time.
2. **Surgical edits in the refinement loop.** Edit, never rewrite — manual user edits must survive.
3. **Real content only.** Placeholder text is a defect, not a shortcut.
4. **Semantics are non-negotiable.** A `<div onclick>` where `<button>` belongs fails the accessibility pass.
5. **One screen per invocation.** Multi-page designs = one `/design-html` run per page.
