---
description: Build an Expo screen or feature — Expo Router, states, native modules, EAS-compatible config, a11y, tests
argument-hint: "<screen or feature> [--ios-only] [--android-only]"
---

# /mobile — Feature (Expo)

## Usage
```
/mobile <screen or feature>
/mobile push-notification settings screen with permission flow
```

## Overview
Expo removes most native build friction — and adds its own rules: what works in Expo Go vs a development build, what requires a config plugin, and what breaks EAS Update. This skill builds a feature that respects them, in your app's existing idiom.

Field notes: `.claude/references/mobile.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Read the app first

- **Router**: Expo Router (file-based — where does this route file go? what's the layout/stack?) or React Navigation.
- **SDK version** and whether the app runs in Expo Go, a development build, or both — this decides which native modules are available.
- **Config**: `app.json`/`app.config.ts` — plugins, permissions strings, scheme, EAS project, runtime version policy.
- **Data layer, design system, existing primitives** — reuse before creating.
- **Updates**: is EAS Update in use? Then native-affecting changes need a new build, not an OTA push — call that out early.

## Phase 2: Design the screen

```
Route:  app/<path>.tsx  (+ layout implications)
Data:   <queries, cache keys, invalidation, offline behavior>
States: loading · empty · error · offline · refreshing · ideal
Native: <expo-* modules needed — available in Expo Go? plugin required?>
Permissions: <which, with the in-context explanation and the denied path>
```

If a needed module requires a config plugin or a new native build, say so **before** writing code — it changes the release path.

## Phase 3: Build

- Prefer `expo-*` modules over community equivalents when both exist (they track SDK versions and EAS builds).
- **Lists**: FlashList/FlatList with stable keys and memoized rows; never map a long list into a ScrollView.
- **Every state rendered**: skeleton, empty with a call to action, error with retry, offline state served from cache, pull-to-refresh.
- **Safe areas** via `react-native-safe-area-context`; keyboard handling per platform; touch targets ≥ 44×44pt with `hitSlop`.
- **Images**: `expo-image` with proper `contentFit`, cache policy, and sized sources.
- **Permissions**: request in context after explaining why; handle denied/never-ask-again with a path to settings; declare the usage strings in `app.config`.
- **Animations** with Reanimated on the UI thread; honor reduce-motion.
- **Accessibility**: labels, roles, state; VoiceOver + TalkBack; OS font scaling; dark mode via the app's theme.
- **Offline**: cached reads with staleness shown; writes queued or clearly blocked — never silently dropped.
- **Env/secrets**: public config via `expo-constants`/`EXPO_PUBLIC_*` only for non-secrets; real secrets stay server-side (a mobile bundle is readable).

## Phase 4: Test

- Component tests with RNTL covering each state.
- E2E with Maestro/Detox if present.
- Manual: iOS simulator + Android emulator, smallest device, largest font scale, dark mode, airplane mode, cold start, and a permission-denied run.

## Phase 5: Verify & report

`npx expo-doctor`, typecheck, lint, tests; run on both platforms; if a native module or config plugin changed, confirm a development/EAS build is required and say so.

```
Route: <path> (<files>)
States: loading ✓ empty ✓ error ✓ offline ✓
Native: <modules> — Expo Go compatible: <yes/no>   New build required: <yes/no>
Permissions: <list> — in-context ✓ denied path ✓
A11y ✓  Platforms: iOS ✓ Android ✓   Tests: <n>
```

## Rules
- Never add a native module or config plugin without asking — it forces a new build and can affect store review.
- Never put a secret in the app config or bundle; `EXPO_PUBLIC_*` is public by definition.
- Never ship a feature verified on one platform only.
- State clearly when a change cannot ship via EAS Update and needs a store build.
- Reuse the app's primitives, tokens, and query layer.
