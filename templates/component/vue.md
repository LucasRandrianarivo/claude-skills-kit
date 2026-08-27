---
description: Build a production-grade Vue 3 component — states, a11y, responsive, typed props, tests
argument-hint: "<component name and behavior> [--no-test] [--story]"
---

# /component — Production Component (Vue 3)

## Usage
```
/component <name> <what it does>
/component DataTable sortable, paginated, selectable rows
```

## Overview
A component is done when every state is designed, it works from the keyboard, its API can't be misused, and a test proves it. This skill builds that component in **your** codebase's idiom — Composition API or Options API, whichever the neighbors use.

---

## Phase 1: Read the codebase first

From the three closest components, extract:
- **SFC conventions**: `<script setup lang="ts">` vs `defineComponent`; block order (`script`/`template`/`style`); `<style scoped>` vs global vs Tailwind classes
- **Props/emits idiom**: `defineProps<Props>()` with type-only declaration vs runtime object; `withDefaults`; `defineEmits<{...}>()` naming (`update:modelValue`, kebab vs camel)
- **v-model style**: `defineModel()` (Vue 3.4+) vs `modelValue` + `update:modelValue`
- **Composables**: existing `use*` in `composables/`, and the project's data-fetching convention (Pinia store, `useFetch`/`useAsyncData` in Nuxt, TanStack Query for Vue)
- **Primitives to reuse**: `BaseButton`, `AppSpinner`, `EmptyState`, `FormField` — reuse beats re-create
- **Tests**: Vue Test Utils vs Testing Library for Vue, `mount` vs `shallowMount`, global plugin setup

Report what you found, propose the file list, and confirm anything ambiguous.

## Phase 2: Design the API before the template

```
<Name>
Purpose:  <one sentence>
Props:    <name: type — required? default?>
Emits:    <event(payload) and when it fires>
Slots:    <default / named / scoped, with their slot props>
Exposes:  <defineExpose surface, if any>
Owns:     <internal state>
```

- Prefer **slots over props** for content; props for data and configuration.
- Mutually exclusive booleans collapse into one `variant` union type.
- Never mutate a prop — emit and let the parent own it (or use `defineModel` for two-way binding).
- Fall through native attributes (`inheritAttrs` + `v-bind="$attrs"` on the right element) so callers can pass `id`, `aria-*`, and handlers.

## Phase 3: Every state, designed

Loading (skeleton with the loaded layout's dimensions), empty (explains why + next action), error (human message + retry), partial/stale, ideal — plus overflow: long strings, 3 items, 3000 items, missing optional fields, RTL.

Interaction states: hover, focus-visible, active, disabled, selected, read-only.

## Phase 4: Accessibility, in the build not after

- Semantic elements first; ARIA only when nothing native fits.
- Accessible name for every control; icon-only buttons carry an action label.
- Keyboard: Tab reaches it, Enter/Space activate, Escape dismisses, arrows drive composite widgets, focus visible and never accidentally trapped.
- Use the WAI-ARIA authoring pattern for menus/tabs/comboboxes/dialogs, or the project's headless primitive (Radix Vue, Headless UI) rather than hand-rolling.
- `aria-live` for async results; `aria-expanded`/`aria-selected`/`aria-invalid` for widget state.
- Contrast ≥ 4.5:1 text / ≥ 3:1 boundaries, both themes; honor `prefers-reduced-motion`.

## Phase 5: Implement

- Match neighbors' formatting exactly.
- Computed for derived values — never a `watch` that writes a ref you could compute (see `/state`).
- `watch`/`watchEffect` only to sync with something outside Vue; always clean up (`onUnmounted`, `watch` stop handles, `AbortController`).
- Extract a composable when logic is reusable or the `<script setup>` block exceeds ~80 lines; extract a subcomponent when a template block has its own state.
- `v-for` always with a stable `:key`; never `v-if` and `v-for` on the same element.
- Long lists: virtualize with the project's existing solution.
- Responsive by construction: fluid layout, project breakpoints, target size ≥ 24×24px.

## Phase 6: Tests

```
describe('<Name>')
  renders the ideal state with the given props
  renders empty state with the call-to-action
  renders error state and re-emits retry
  emits <event> with the expected payload on user interaction
  is operable by keyboard
  has no axe violations (if the project has axe wired up)
```

Query by role and accessible name; drive with real user events, not by calling component methods.

## Phase 7: Verify & report

Typecheck (`vue-tsc`), lint, run the new tests, render at 375px and 1440px in both themes, then report files created, the props/emits signature, states covered, a11y checks, test count, and which existing primitives you reused.

## Rules
- Reuse before creating; a second BaseButton is a bug.
- Never add a dependency without asking.
- Never mutate props; never leave a state undesigned.
- No `any` in props/emits types.
- Ask once, with concrete options, when the design is ambiguous.
