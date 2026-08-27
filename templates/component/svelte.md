---
description: Build a production-grade Svelte component — states, a11y, responsive, typed props, tests
argument-hint: "<component name and behavior> [--no-test]"
---

# /component — Production Component (Svelte)

## Usage
```
/component <name> <what it does>
/component DataTable sortable, paginated, selectable rows
```

## Overview
Svelte makes it easy to ship a component that only handles the happy path. This skill builds the other 80%: every state designed, keyboard-operable, an API that can't be misused, and a test that proves it — in your codebase's idiom (runes or stores, whichever the neighbors use).

Field notes: `.claude/references/frontend.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Read the codebase first

From the three closest components, extract:
- **Svelte version and idiom**: runes (`$props`, `$state`, `$derived`, `$effect`, snippets) vs legacy (`export let`, `$:`, slots, `createEventDispatcher`)
- **File layout**: `lib/components/<Name>.svelte`, `$lib` aliases, index barrels
- **Typing**: `lang="ts"`, `interface Props`, generics on the component
- **Styling**: scoped `<style>`, Tailwind, `:global()` usage, CSS custom properties as the theming API
- **Data**: SvelteKit `load` functions vs in-component fetch — follow the project's split; components generally receive data
- **Primitives to reuse**: Button, Spinner, EmptyState, Field
- **Tests**: Testing Library for Svelte, Vitest setup, Playwright component tests

Report what you found, propose files, confirm anything ambiguous.

## Phase 2: Design the API before the markup

```
<Name>
Purpose:  <one sentence>
Props:    <name: type — required? default?>
Events:   <callback props (runes) or dispatched events (legacy)>
Slots:    <snippets / slots and their parameters>
Bindable: <what supports bind:>
Owns:     <internal state>
```

- Prefer callback props (`onselect`) in runes code; `createEventDispatcher` only in legacy codebases that use it everywhere.
- `$bindable()` only where two-way binding is genuinely the ergonomic choice; otherwise one-way data + a callback.
- Collapse mutually exclusive booleans into a `variant` union.
- Spread rest props onto the root element (`{...rest}`) so callers can pass `id`, `aria-*`, `class`, and handlers.
- Expose theming through CSS custom properties rather than a dozen style props.

## Phase 3: Every state, designed

Loading (skeleton matching the loaded dimensions — no layout shift), empty (why + next action), error (human message + retry), partial/stale, ideal — plus overflow: long strings, 3 items, 3000 items, missing optional fields, RTL.

Interaction states: hover, focus-visible, active, disabled, selected, read-only.

## Phase 4: Accessibility, in the build not after

- Semantic elements first; ARIA only when nothing native fits. Svelte's compiler a11y warnings are findings, never noise to silence.
- Accessible name on every control; icon-only buttons describe the action.
- Keyboard: Tab reaches it, Enter/Space activate, Escape dismisses, arrows drive composite widgets, focus visible, no unintended trap.
- Follow the WAI-ARIA authoring pattern for menu/tabs/combobox/dialog; consider `<dialog>` and popover natives before hand-rolling.
- `aria-live` for async results; `aria-expanded`/`aria-selected`/`aria-invalid` for state.
- Contrast ≥ 4.5:1 text / ≥ 3:1 boundaries in both themes; honor `prefers-reduced-motion` (and `transition:` directives).

## Phase 5: Implement

- Match neighbors' formatting exactly.
- Derived values with `$derived`/`$:` — never an effect that writes state you could derive (see `/state`).
- `$effect`/`onMount` only to sync with something outside Svelte; always return the cleanup.
- Keyed `{#each ... (item.id)}` whenever the list can reorder or items carry state.
- Long lists: virtualize with the project's existing solution.
- Extract a subcomponent when a block owns state or the markup exceeds ~40 lines; keep one concept per file.
- Responsive by construction: fluid layout, project breakpoints, target size ≥ 24×24px.

## Phase 6: Tests

```
describe('<Name>')
  renders the ideal state with the given props
  renders empty state with the call-to-action
  renders error state and calls the retry callback
  calls <callback> with the expected payload on user interaction
  is operable by keyboard
  has no axe violations (if wired up)
```

Query by role and accessible name; drive with real user events.

## Phase 7: Verify & report

Run `svelte-check`, lint, the new tests; render at 375px and 1440px in both themes; report files, API signature, states covered, a11y checks, test count, and reused primitives.

## Rules
- Reuse before creating; never silence a compiler a11y warning to get green.
- Never add a dependency without asking.
- Never leave a state undesigned; no `any` in the props type.
- Ask once, with concrete options, when the design is ambiguous.
