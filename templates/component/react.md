---
description: Build a production-grade React component — states, a11y, responsive, typed API, tests
argument-hint: "<component name and behavior> [--no-test] [--story]"
---

# /component — Production Component (React)

## Usage
```
/component <name> <what it does>
/component DataTable sortable, paginated, selectable rows
/component --story           — also generate a story file if the project uses Storybook
/component --no-test         — skip the test file (not recommended)
```

## Overview
A component isn't done when it renders the happy path. It's done when every state it can be in is designed, it's usable from a keyboard, its API can't be misused, and a test proves it. This skill builds that component — in **your** codebase's idiom, not a generic tutorial one.

---

## Phase 1: Read the codebase first

Never write before reading three neighbors. From the closest existing components, extract:

- **File layout**: `components/<Name>.tsx`? `components/<Name>/index.tsx` + `<Name>.test.tsx`? feature-scoped?
- **Export style**: named vs default; barrel files or direct imports
- **Props idiom**: `type Props` vs `interface`, destructuring, `PropsWithChildren`, `forwardRef` usage, `ComponentPropsWithoutRef<'button'>` spreading
- **Styling**: Tailwind (and whether `cva`/`clsx`/`tailwind-merge` is used), CSS Modules, styled-components, a UI library's `sx`/`styled`
- **Primitives to reuse**: does a `Button`, `Spinner`, `EmptyState`, `Field`, or `Dialog` already exist? Reuse beats re-create — always.
- **Data access**: does this component fetch (query hook) or receive data via props? Follow the project's split.
- **Tests**: Testing Library conventions, custom `render` wrapper with providers, `userEvent` version.

Report what you found in two lines, then propose the file list and wait for a go if anything is ambiguous.

## Phase 2: Design the API before the markup

```
<Name>
Purpose:   <one sentence — if it takes two, split the component>
Props:     <name: type — required? default? why it exists>
Events:    <onX handlers, their payloads>
Slots:     <children / render props / composition points>
Owns:      <its own internal state>
Does NOT: <what stays the caller's job>
```

API rules:
- **Controlled or uncontrolled, explicitly** — if it can be both, `value` + `defaultValue` + `onChange`, and document which wins.
- No boolean explosion: three mutually exclusive booleans (`isPrimary`, `isDanger`, `isGhost`) become one `variant` union.
- Make illegal states unrepresentable in the type: a discriminated union beats optional fields that only make sense together.
- Spread the native props of the element it renders (`...rest`) and forward `ref` when a caller might need focus/measure.
- Never accept a prop for something the caller can do with composition (`children`, a slot) — but do accept it when the alternative is copy-paste at every call site.

## Phase 3: Every state, designed

The five states are mandatory. A component missing one has a bug waiting:

| State | Requirement |
|---|---|
| **Loading** | Skeleton matching the loaded layout's dimensions (no layout shift), or the project's spinner. Never a bare "Loading…" if the project has a skeleton primitive. |
| **Empty** | Explains *why* it's empty and what to do next — with the primary action if there is one. Never a blank box. |
| **Error** | Human message + a retry affordance. Never a raw error string or a swallowed failure. |
| **Partial/degraded** | Some data, some missing; stale-while-revalidating; optimistic pending. |
| **Ideal** | The happy path — plus the *overflow* case: long strings, 3 items, 3000 items, missing optional fields, RTL text. |

Interaction states too: hover, focus-visible, active, disabled, selected, read-only.

## Phase 4: Accessibility, in the build not after

- Semantic element first (`button`, `a`, `input`, `dialog`, `ul/li`) — ARIA only when nothing native fits.
- Accessible name for every control; icon-only buttons get an `aria-label` describing the **action**.
- Keyboard: Tab reaches it, Enter/Space activate, Escape dismisses, arrows navigate composite widgets, focus is visible and never trapped unintentionally.
- If it's a menu/tabs/combobox/dialog, follow the WAI-ARIA authoring pattern for that widget — or use the project's headless primitive (Radix/Headless UI) rather than hand-rolling it.
- State changes that matter are announced (`aria-live` for async results, `aria-expanded`/`aria-selected`/`aria-invalid` for widget state).
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for boundaries and focus rings, in both themes.
- Respect `prefers-reduced-motion` for any animation.

## Phase 5: Implement

- Match the neighbors' formatting exactly; import order, quote style, and naming come from the codebase, not from habit.
- Keep render pure: no fetching in render, no mutation of props, no `Date.now()`/`Math.random()` in render output that must be stable.
- Effects only for synchronization with an external system. Derived values are computed, not stored (see `/state`).
- Memoize only where a measurement or an obvious hot path justifies it — `memo`/`useMemo`/`useCallback` everywhere is noise that hides the real hot spot.
- Long lists: virtualize with whatever the project already uses; never render 3000 rows because the demo data had 12.
- Responsive by construction: fluid containers, container queries or the project's breakpoints, no fixed pixel widths for text content, target size ≥ 24×24px.
- Extract a subcomponent when a block has its own state or exceeds ~40 lines of JSX; keep one exported concept per file.

## Phase 6: Tests

Test behavior through the public surface — never internals:

```
describe('<Name>')
  renders the ideal state with the given data
  renders empty state with the call-to-action
  renders error state and retries on click
  calls onX with the expected payload when the user does Y   (userEvent, not fireEvent)
  is operable by keyboard: tab to it, activate, escape
  has no axe violations                                       (if jest-axe/axe is available)
```

Query by role and accessible name (`getByRole('button', { name: /save/i })`) — a test that needs a `data-testid` for a control is telling you the control has no accessible name.

## Phase 7: Verify & report

1. Typecheck, lint, and run the new test file. Fix what you broke.
2. Render it in the app (or the story) at 375px and 1440px, light and dark.
3. Report:

```
Created:  <files>
API:      <props signature>
States:   loading ✓ empty ✓ error ✓ ideal ✓ overflow ✓
A11y:     keyboard ✓ name ✓ contrast ✓
Tests:    <n> passing
Reused:   <existing primitives used instead of new code>
```

## Rules
- Reuse before creating: if a primitive exists, use it and extend it — a second Button is a bug.
- Never add a dependency without asking.
- Never leave a state undesigned "for now" — an unhandled empty list ships as a blank screen.
- No `any` in the props type; no `@ts-ignore` to make the API compile.
- If the design is ambiguous (spacing, tone, behavior on overflow), ask once with concrete options rather than inventing a third design language.
