---
description: Visual/UI audit for Chakra UI apps — theme tokens, spacing, states, consistency
argument-hint: "[url or route]"
---

# /design-review — Visual Audit (Chakra UI)

## Usage
```
/design-review [file, route, or component]
```

## Overview
Audit a component or page for visual consistency, Chakra UI best practices, and design token adherence. Read the code, compare against Chakra conventions, and report issues with fixes.

---

## Phase 1: Scope

1. Parse `$ARGUMENTS` for the target: file path, route, or component name
2. Read the target file and identify:
   - Which Chakra components are used (`Box`, `Flex`, `Stack`, `Button`, `Input`, `Modal`, etc.)
   - Style props used (color, spacing, layout)
   - Custom CSS or `sx` prop overrides
3. Read the project's theme configuration:
   - Look for custom theme in `theme/` or `styles/` directory (usually `extendTheme()`)
   - Check custom colors: `brand.500`, `brand.600`, semantic tokens
   - Check component style overrides (`components` key in theme)
   - Check if using `useColorModeValue` for dark mode support

## Phase 2: Audit

Check each category. For each issue found, note the file, line, and fix.

### Token Consistency
- [ ] Colors use theme tokens, not hardcoded hex (`color="brand.500"` not `color="#3182ce"`)
- [ ] Spacing uses Chakra scale (1=4px, 2=8px, 4=16px, 6=24px, 8=32px)
- [ ] Font sizes use the scale (`sm`, `md`, `lg`, `xl`, `2xl`), not pixel values
- [ ] Border radius uses tokens (`md`, `lg`, `xl`, `full`), not arbitrary values
- [ ] Shadows use tokens (`sm`, `md`, `lg`, `xl`), not custom CSS shadows
- [ ] Color mode: `useColorModeValue('gray.100', 'gray.700')` for values that change in dark mode

### Component Usage
- [ ] Layout uses `Box`, `Flex`, `Stack`, `Grid` — not raw `<div>` with style props
- [ ] `Stack` / `VStack` / `HStack` used for consistent spacing between children
- [ ] `Button`: uses `colorScheme` prop, not custom background
- [ ] `Input` / `Select` / `Textarea`: uses Chakra components with `variant` prop
- [ ] `Modal` / `Drawer` / `AlertDialog`: uses Chakra compound components (Header, Body, Footer)
- [ ] `Text` / `Heading`: uses Chakra typography, not raw `<p>` / `<h1>` with style props
- [ ] `useToast()` for notifications, not custom toast

### Style Props Pattern
- [ ] Uses style props (`bg`, `p`, `mx`, `fontSize`) over `sx` prop or `style` attribute
- [ ] Responsive values use object syntax: `fontSize={{ base: 'md', md: 'lg' }}`
- [ ] Responsive values use array syntax where simpler: `p={[4, 6, 8]}`
- [ ] No mixing of CSS-in-JS and Chakra style props in the same component
- [ ] Pseudo-props use Chakra syntax: `_hover={{ bg: 'gray.100' }}` not `onMouseEnter` + state

### Layout Patterns
- [ ] Page structure uses `Container maxW="container.xl"` or similar
- [ ] Consistent spacing: `Stack spacing={6}` or project standard for section gaps
- [ ] Card pattern: `Box` with `p`, `borderWidth`, `borderRadius`, `shadow` — consistent across pages
- [ ] Form layout: `FormControl` with `FormLabel`, `FormErrorMessage`, `FormHelperText`
- [ ] Grid uses `SimpleGrid columns={{ base: 1, md: 2, lg: 3 }}` for responsive layouts

### Responsive Design
- [ ] All layout values use responsive objects/arrays for key breakpoints
- [ ] Stack direction changes: `direction={{ base: 'column', md: 'row' }}`
- [ ] Font sizes scale down on mobile
- [ ] Modal/Drawer sizes adapt: `size={{ base: 'full', md: 'md' }}`
- [ ] Touch targets: buttons and inputs have at least `minH="44px"` on mobile
- [ ] Hidden content uses `display={{ base: 'none', md: 'block' }}`

### Accessibility
- [ ] Buttons have text content or `aria-label`
- [ ] Form fields use `FormControl` with `isRequired`, `isInvalid`
- [ ] Images use `alt` prop on Chakra `Image`
- [ ] `VisuallyHidden` used for screen-reader-only text
- [ ] Focus management: `Modal` and `Drawer` trap focus by default — do not override

## Phase 3: Fix

For each issue found:
1. Provide the exact code change
2. Keep changes minimal — only fix the visual/design issue
3. Do not change functionality or business logic
4. Use the project's existing Chakra theme tokens

## Phase 4: Report

```
## Design Review Report

**Target**: <file or route>
**UI Library**: Chakra UI <version>
**Theme**: <custom / default>
**Color mode**: <supported / not supported>

### Issues Found

| # | Category | Issue | Severity | File:Line |
|---|----------|-------|----------|-----------|
| 1 | Token | Hardcoded `#3182ce` instead of `brand.500` | Medium | src/Page.tsx:42 |
| 2 | Component | Raw `<div>` with flex instead of `HStack` | Low | src/Layout.tsx:18 |
| 3 | Responsive | Missing responsive fontSize | Medium | src/Hero.tsx:9 |

### Fixes Applied
- <file>: <what changed>

### Summary
- Issues found: <count>
- Fixed: <count>
- Remaining (needs user input): <count>
- Overall consistency: Good / Needs work / Poor
```

---

## Chakra UI Token Reference

### Spacing Scale
| Key | Value | Key | Value |
|-----|-------|-----|-------|
| `1` | 4px | `8` | 32px |
| `2` | 8px | `10` | 40px |
| `3` | 12px | `12` | 48px |
| `4` | 16px | `16` | 64px |
| `5` | 20px | `20` | 80px |
| `6` | 24px | `24` | 96px |

### Color Mode Pattern
Use `useColorModeValue(light, dark)`: bg `white`/`gray.800`, surface `gray.50`/`gray.700`, border `gray.200`/`gray.600`, text `gray.800`/`white`, brand `brand.500`/`brand.200`.

### Breakpoints
`base`: 0, `sm`: 480px, `md`: 768px, `lg`: 992px, `xl`: 1280px, `2xl`: 1536px
