# /design-review — Visual Audit (Tailwind CSS)

## Usage
```
/design-review [file, route, or component]
```

## Overview
Audit a component or page for visual consistency, Tailwind CSS best practices, and design token adherence. Read the code, compare against the project's design system, and report issues with fixes.

---

## Phase 1: Scope

1. Parse `$ARGUMENTS` for the target: file path, route, or component name
2. Read the target file and identify:
   - Tailwind utility classes used
   - Custom CSS or inline styles that bypass Tailwind
   - Component structure and layout approach
3. Read the project's design configuration:
   - Check `tailwind.config.ts` (or `.js`) for custom theme extensions
   - Check CSS custom properties in global styles (`globals.css`, `index.css`)
   - Identify the `cn()` / `clsx()` / `cva()` utility for conditional classes
   - Check if using a component library (shadcn/ui, Headless UI, Radix)

## Phase 2: Audit

Check each category. For each issue found, note the file, line, and fix.

### Token Consistency
- [ ] Colors use Tailwind config tokens, not arbitrary values (`bg-primary` not `bg-[#3b82f6]`)
- [ ] Spacing follows the Tailwind scale (4, 8, 12, 16, 20, 24...) — no arbitrary `p-[13px]`
- [ ] Font sizes use the scale (`text-sm`, `text-base`, `text-lg`), not arbitrary values
- [ ] Border radius uses config values (`rounded-md`, `rounded-lg`), not arbitrary
- [ ] Shadows use predefined (`shadow-sm`, `shadow-md`), not custom box-shadow
- [ ] CSS custom properties defined in the theme are used consistently

### Utility Class Quality
- [ ] No duplicate or conflicting classes (`p-4 p-6` — which one wins?)
- [ ] No overly long class strings — extract to `cn()` or component when >8 utilities
- [ ] Responsive prefixes are mobile-first (`sm:`, `md:`, `lg:`) — base = mobile
- [ ] Dark mode uses `dark:` variant consistently (if the project supports dark mode)
- [ ] Hover/focus states are defined for interactive elements (`hover:`, `focus:`, `focus-visible:`)
- [ ] No `!important` via `!` prefix unless absolutely necessary

### Layout Patterns
- [ ] Flexbox/Grid used via Tailwind utilities, not raw CSS
- [ ] Consistent gap usage: `gap-4`, not mixed margin approaches
- [ ] Container uses `max-w-*` or `container` class consistently
- [ ] Consistent section spacing: same vertical padding between major sections

### Component Patterns
- [ ] Buttons: consistent sizing, color, and hover state across the app
- [ ] Cards: consistent padding, border, shadow, radius
- [ ] Forms: consistent input styling, label positioning, error message placement
- [ ] If using `cva()` / `class-variance-authority`: variants are complete and consistent

### Responsive Design
- [ ] Layout stacks vertically on mobile (base), horizontal on larger screens (`md:flex-row`)
- [ ] Text sizes adapt: smaller on mobile, larger on desktop
- [ ] Touch targets are at least 44x44px on mobile (`min-h-11 min-w-11`)
- [ ] Hidden/shown elements use `hidden md:block` pattern correctly
- [ ] No horizontal overflow on mobile — check wide elements (tables, code blocks)

### Accessibility
- [ ] Sufficient color contrast (avoid light text on light bg)
- [ ] Focus ring visible: `focus:ring-2 focus:ring-offset-2` or `focus-visible:outline`
- [ ] Interactive elements have clear hover/active states
- [ ] `sr-only` class used for screen-reader-only labels where visual label is absent

## Phase 3: Fix

For each issue found:
1. Provide the exact code change
2. Keep changes minimal — only fix the visual/design issue
3. Do not change functionality or business logic
4. Use the project's existing Tailwind config tokens

## Phase 4: Report

```
## Design Review Report

**Target**: <file or route>
**Styling**: Tailwind CSS <version>
**Config**: <custom theme / default>
**Utility helper**: <cn / clsx / cva / none>

### Issues Found

| # | Category | Issue | Severity | File:Line |
|---|----------|-------|----------|-----------|
| 1 | Token | Arbitrary color `bg-[#3b82f6]` instead of `bg-primary` | Medium | src/Page.tsx:42 |
| 2 | Responsive | Missing mobile stack for flex row | High | src/Grid.tsx:9 |
| 3 | A11y | Missing focus ring on button | Medium | src/Button.tsx:15 |

### Fixes Applied
- <file>: <what changed>

### Summary
- Issues found: <count>
- Fixed: <count>
- Remaining (needs user input): <count>
- Overall consistency: Good / Needs work / Poor
```

---

## Tailwind Token Reference

### Default Spacing Scale
| Class | Value | Class | Value |
|-------|-------|-------|-------|
| `1` | 4px | `8` | 32px |
| `2` | 8px | `10` | 40px |
| `3` | 12px | `12` | 48px |
| `4` | 16px | `16` | 64px |
| `5` | 20px | `20` | 80px |
| `6` | 24px | `24` | 96px |

### Breakpoints (mobile-first)
| Prefix | Min-width |
|--------|-----------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |
