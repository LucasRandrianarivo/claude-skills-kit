---
description: Build a production-grade UI component in any framework — states, a11y, responsive, typed API, tests
argument-hint: "<component name and behavior> [--no-test]"
---

# /component — Production Component (Generic)

## Usage
```
/component <name> <what it does>
/component DataTable sortable, paginated, selectable rows
```

## Overview
Framework-agnostic. A component is done when every state it can be in is designed, it's operable from a keyboard, its API can't be misused, and a test proves it. Discover the project's framework and conventions first, then build in **its** idiom.

Field notes: `.claude/references/frontend.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Discover the project's idiom

1. Identify the framework and version from the manifest (`package.json`, `pyproject.toml`, `composer.json`, `*.csproj`) and from the file extensions in the components directory.
2. Read the three closest existing components and extract: file layout, export style, how props/inputs are declared and typed, how events are emitted, how children/slots are composed, how styles are attached, how data reaches the component.
3. Inventory reusable primitives (button, spinner, empty state, field, dialog) — reuse beats re-create.
4. Find the test convention: framework, renderer, query style, provider wrapper.

Report the conventions you found in two lines, propose the file list, and confirm anything ambiguous before writing.

## Phase 2: Design the API before the markup

```
<Name>
Purpose:  <one sentence — two sentences means two components>
Inputs:   <name: type — required? default? why>
Outputs:  <events/callbacks and payloads>
Slots:    <composition points>
Owns:     <internal state>
Does NOT: <what stays the caller's job>
```

- Controlled or uncontrolled, decided explicitly and documented.
- Mutually exclusive booleans become one variant union; illegal states unrepresentable in the type.
- Pass through native attributes of the underlying element so callers can set ids, ARIA, and handlers.
- Prefer composition over a configuration prop that exists only to avoid a slot.

## Phase 3: Every state, designed

| State | Requirement |
|---|---|
| Loading | Skeleton with the loaded layout's dimensions — no layout shift |
| Empty | Explains why, and offers the next action |
| Error | Human message and a retry path |
| Partial / stale | Some data, refreshing, optimistic pending |
| Ideal | Happy path **plus** overflow: long strings, 3 items, 3000 items, missing optional fields, RTL |

Interaction states: hover, focus-visible, active, disabled, selected, read-only.

## Phase 4: Accessibility, in the build not after

- Native semantics first; ARIA only when nothing native fits.
- Every control has an accessible name; icon-only controls name the action.
- Keyboard: reachable by Tab, activated by Enter/Space, dismissed by Escape, composite widgets driven by arrows, focus always visible, no unintended trap.
- Follow the WAI-ARIA authoring pattern for the widget type, or use an existing accessible primitive.
- Announce async results and expose widget state programmatically.
- Contrast ≥ 4.5:1 text / ≥ 3:1 boundaries in every theme; honor reduced-motion preferences.

## Phase 5: Implement

- Match the neighbors' formatting, naming, and import conventions exactly.
- Keep rendering pure; side effects only to synchronize with external systems, and always cleaned up.
- Derived values are computed, never stored (see `/state`).
- Virtualize long lists; don't render 3000 rows because the fixture had 12.
- Responsive by construction: fluid containers, the project's breakpoints, no fixed widths for text, target size ≥ 24×24px.
- Split out a subcomponent when a block owns its own state or grows past ~40 lines of markup.

## Phase 6: Tests

```
<Name>
  renders the ideal state
  renders empty state with its call-to-action
  renders error state and retries
  emits <event> with the expected payload on user interaction
  is operable by keyboard
  has no accessibility violations (if the project has a checker)
```

Query by role and accessible name; drive with real user interactions, not internal method calls.

## Phase 7: Verify & report

Run the project's typecheck, lint, and the new test file; render at 375px and 1440px in each theme; then report files created, the API signature, states covered, a11y checks passed, tests added, and which existing primitives you reused instead of writing new code.

## Rules
- Reuse before creating. A second Button is a bug.
- Never add a dependency without asking.
- Never leave a state undesigned — an unhandled empty list ships as a blank screen.
- No escape hatches in the type surface to make the API compile.
- Ask once, with concrete options, when the design is ambiguous.
