---
description: Build a React Native screen or feature — navigation, states, platform differences, performance, accessibility, tests
argument-hint: "<screen or feature> [--ios-only] [--android-only]"
---

# /mobile — Feature (React Native)

## Usage
```
/mobile <screen or feature>
/mobile order history with pull-to-refresh and offline cache
```

## Overview
Mobile punishes what the web forgives: no network, a cold start, a 60Hz frame budget, a notch, a back button that must do the right thing, and two platforms that disagree. This skill builds a React Native feature that handles those by construction — in your app's existing idiom.

Field notes: `.claude/references/mobile.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Read the app first

- **Navigation**: React Navigation (which navigators, typed params?) or Expo Router. Where does this screen register, and what does the back gesture do from it?
- **Data**: TanStack Query / RTK Query / Apollo / hand-rolled; the offline story (persisted cache? queue of pending mutations?)
- **UI**: the design system in use (NativeWind, Tamagui, Restyle, styled-components, plain `StyleSheet`), the spacing/typography tokens, the existing primitives (Button, ListItem, EmptyState)
- **Native modules** already present (camera, notifications, storage, maps) — reuse before adding
- **New architecture / Hermes / RN version** — it constrains which libraries are viable
- **Tests**: Jest + React Native Testing Library, Detox/Maestro for e2e

## Phase 2: Design the screen

```
Screen: <name>
Route:  <navigator + params, typed>
Data:   <queries, cache keys, invalidation>
States: loading · empty · error · offline · refreshing · ideal
Back:   <what hardware back / swipe does>
Platform deltas: <iOS vs Android differences you must handle>
```

## Phase 3: Build

- **Lists**: `FlatList`/`FlashList` with `keyExtractor`, stable item components (memoized), `getItemLayout` when rows are fixed height. Never `.map()` a long list into a `ScrollView`.
- **Every state rendered**: skeleton on load, empty with a call to action, error with retry, an **offline** state that says so and serves cached data when available, pull-to-refresh wired to the query layer.
- **Safe areas & insets**: `SafeAreaView`/`useSafeAreaInsets` for notches, home indicators, and the Android navigation bar. Nothing important within 8px of an edge.
- **Keyboard**: `KeyboardAvoidingView` (behavior differs per platform), inputs scrolled into view, a dismiss gesture, `returnKeyType` chaining between fields.
- **Touch targets** ≥ 44×44pt; `hitSlop` for small icons; visible pressed feedback (`Pressable` states, ripple on Android).
- **Platform differences**, handled explicitly: back handling, shadows vs elevation, date/time pickers, permissions flows, status-bar style, haptics.
- **Permissions**: request in context with an explanation, handle "denied" and "never ask again", and provide a path to settings. Never crash on a denial.
- **Performance**: keep work off the JS thread; animations via Reanimated on the UI thread; avoid re-rendering the list on every keystroke; images sized and cached (`expo-image`/`FastImage`); watch the cold-start cost of imports at module scope.
- **Accessibility**: `accessibilityLabel`/`accessibilityRole`/`accessibilityState` on every interactive element; test with VoiceOver and TalkBack; respect the OS font scale (no fixed-height text containers); honor reduce-motion.
- **Offline**: reads from cache with a staleness indicator; writes either blocked with a clear message or queued with an explicit sync state — never silently lost.

## Phase 4: Test

- Unit/component: RNTL, query by accessible label/role, cover each state (loading, empty, error, offline).
- E2E where the project has Detox/Maestro: the primary flow on both platforms.
- Manual matrix before calling it done: smallest supported device, a notched device, largest font scale, dark mode, airplane mode, and a cold start.

## Phase 5: Verify & report

Run typecheck, lint, tests; launch on an iOS simulator **and** an Android emulator (a feature verified on one platform is verified on half the app).

```
Screen: <name> (<files>)
States: loading ✓ empty ✓ error ✓ offline ✓ refresh ✓
Platform: iOS ✓ Android ✓   Safe areas ✓  Keyboard ✓  Back ✓
A11y: labels ✓ roles ✓ font scale ✓   Perf: list virtualized ✓ animations on UI thread ✓
Tests: <n>
```

## Rules
- Never ship a screen verified on one platform only.
- Never add a native dependency without asking — it changes the build, the permissions, and the store review.
- Never assume network: every fetch has a failure state the user can act on.
- Respect the OS font scale and reduce-motion; a fixed-height text row breaks accessibility settings.
- Reuse the app's primitives and tokens; a second Button is a bug.
