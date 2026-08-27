---
description: Build a mobile screen or feature in any framework — states, offline, permissions, platform parity, a11y, tests
argument-hint: "<screen or feature> [--ios-only] [--android-only]"
---

# /mobile — Feature (Generic)

## Usage
```
/mobile <screen or feature>
```

## Overview
Framework-agnostic mobile feature work. Mobile fails in ways the web doesn't: no network, denied permissions, cold starts, notches, system font scaling, a hardware back button, and two platforms with different expectations. Discover the project's framework and idiom first, then build for those realities.

---

## Phase 1: Discover the app's idiom

Identify the framework (React Native, Expo, Flutter, native iOS/Android, Kotlin Multiplatform, .NET MAUI) from the manifest and project files. Then read the three nearest screens and extract: routing/navigation, state management, data access and caching, the design system and reusable primitives, permission handling, and the test setup.

## Phase 2: Design the screen

```
Screen: <name>       Route: <path + params>
Data:   <source, cache, invalidation, offline behavior>
States: loading · empty · error · offline · refreshing · ideal
Back:   <what the hardware/gesture back does>
Permissions: <which, the in-context rationale, the denied path>
Platform deltas: <what differs between iOS and Android>
```

## Phase 3: Build

- Render **every** state; an unhandled empty list or a failed request must never show a blank screen or an endless spinner.
- Virtualize long lists; never render an unbounded collection eagerly.
- Respect safe areas, keyboard insets, and the system font scale; touch targets ≥ 44pt/48dp with visible feedback.
- Handle offline explicitly: cached reads with staleness shown, writes queued or clearly blocked — never silently lost.
- Request permissions in context, explain why, and handle denial (including permanently denied) with a path to settings.
- Keep the frame budget: heavy work off the UI thread, animations on the platform's optimized path, images sized and cached.
- Accessibility: labels and roles on every control, sensible reading order, screen-reader verification on both platforms, reduce-motion honored.
- Reuse the app's primitives, tokens, and data layer; adding a native dependency requires the user's agreement.

## Phase 4: Test

Component/widget tests for each state; an e2e run of the primary flow if the project has the tooling; and a manual matrix: smallest device, largest font scale, dark mode, airplane mode, cold start, permission denied — on both platforms.

## Phase 5: Verify & report

Run the project's analyzer/typecheck, lint, and tests; launch on an iOS and an Android device/emulator.

```
Screen: <name> (<files>)
States: loading ✓ empty ✓ error ✓ offline ✓
Platforms: iOS ✓ Android ✓   Safe areas ✓ Font scale ✓ Targets ✓
A11y ✓   Tests: <n>
```

## Rules
- Never ship a feature verified on one platform only.
- Never add a native dependency without asking.
- Never assume network availability or granted permissions.
- Honor system accessibility settings (font scale, reduce motion, screen readers).
- Reuse the app's existing primitives and conventions over introducing new ones.
