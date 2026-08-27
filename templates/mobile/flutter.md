---
description: Build a Flutter screen or feature — routing, states, platform differences, performance, accessibility, tests
argument-hint: "<screen or feature> [--ios-only] [--android-only]"
---

# /mobile — Feature (Flutter)

## Usage
```
/mobile <screen or feature>
/mobile order history with pull-to-refresh and offline cache
```

## Overview
Flutter gives you one codebase and two sets of platform expectations. This skill builds a feature that handles the states mobile actually has — offline, permission-denied, cold start, large font scale — in your app's existing idiom (Riverpod/Bloc/Provider, GoRouter or Navigator 2.0).

Field notes: `.claude/references/mobile.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Read the app first

- **State management**: Riverpod, Bloc/Cubit, Provider, GetX — match it exactly; mixing paradigms is the most common source of unmaintainable Flutter code.
- **Routing**: GoRouter/auto_route/Navigator — where the route registers, how params are typed, what back does.
- **Theming**: `ThemeData`, design tokens, existing widgets to reuse.
- **Data**: repository pattern? Dio/http client? local cache (Isar/Drift/Hive/shared_preferences)?
- **Platform channels / plugins** already present — reuse before adding.
- **Tests**: `flutter_test` widget tests, `integration_test`, mocktail/mockito conventions.

## Phase 2: Design the screen

```
Screen: <name>
Route:  <path + typed params>
State:  <provider/bloc, its states: loading/data/empty/error/offline>
States rendered: loading · empty · error · offline · refreshing · ideal
Platform deltas: <Cupertino vs Material where the app cares>
```

## Phase 3: Build

- **Lists**: `ListView.builder`/`SliverList` with keys; never build a long list eagerly. `const` constructors wherever possible — they're free performance.
- **Every state as a widget branch** (sealed state class / `AsyncValue.when`): skeleton or shimmer on load, empty with a call to action, error with retry, offline served from cache, `RefreshIndicator` for pull-to-refresh.
- **Safe areas**: `SafeArea`, `MediaQuery.viewInsets` for the keyboard; nothing critical under a notch or the home indicator.
- **Text scaling**: honor `MediaQuery.textScaler` — no fixed-height boxes around text; test at the largest system font size.
- **Touch targets** ≥ 48dp (Material) / 44pt (Cupertino), with visible feedback (`InkWell` ripple / `CupertinoButton` opacity).
- **Performance**: keep `build()` cheap and side-effect free; avoid rebuilding whole subtrees (`const`, selectors, `ValueListenableBuilder`); heavy work off the UI isolate (`compute`); cached, resolution-appropriate images; watch jank with the performance overlay.
- **Permissions**: request in context with an explanation; handle denied and permanently-denied with a settings path.
- **Accessibility**: `Semantics` labels for icon-only controls, `excludeSemantics` where decorative, meaningful reading order; test with TalkBack and VoiceOver; respect reduce-motion.
- **Offline**: cached reads with a staleness indicator; writes queued or explicitly blocked — never silently dropped.
- **Errors**: no raw exception text in the UI; log the detail, show a human message with a retry.

## Phase 4: Test

- Widget tests for every state branch; `pumpAndSettle` discipline; golden tests if the project uses them.
- `integration_test` for the primary flow where present.
- Manual matrix: smallest supported device, largest font scale, dark mode, airplane mode, cold start, permission denied — on **both** platforms.

## Phase 5: Verify & report

`flutter analyze`, `dart format --set-exit-if-changed`, `flutter test`; run on an iOS simulator and an Android emulator.

```
Screen: <name> (<files>)
States: loading ✓ empty ✓ error ✓ offline ✓ refresh ✓
Platforms: iOS ✓ Android ✓   Safe areas ✓  Text scale ✓  Targets ≥48dp ✓
A11y: semantics ✓ screen readers ✓   Perf: const widgets ✓ builder lists ✓
Tests: <n> widget, <n> integration
```

## Rules
- Match the app's state-management paradigm exactly; never introduce a second one.
- Never add a plugin without asking — it affects the native build and store review.
- Never ship verified on one platform only.
- Honor system text scaling and reduce-motion.
- `flutter analyze` clean before done; a suppressed lint needs a stated reason.
