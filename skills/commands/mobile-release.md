---
description: Ship a mobile app to the stores — versioning, signing, builds, store metadata, staged rollout, OTA updates, rollback
argument-hint: "[--platform ios|android|both] [--track internal|beta|production] [--ota]"
---

# /mobile-release — Store Release

## Usage
```
/mobile-release                     — full release: version, build, upload, submit
/mobile-release --track beta        — internal/TestFlight/closed testing only
/mobile-release --ota               — over-the-air JS update instead of a store build
/mobile-release --platform android
```

## Overview
A mobile release is irreversible in a way a web deploy is not: users hold the binary, review takes days, and a bad build lives on devices until they update. So the order is: decide **what** can ship how (OTA vs store), verify on real builds, roll out **staged**, and know the rollback move before you start.

---

## Phase 0: OTA or store build?

Answer this first — it decides everything else.

| Change | Ships how |
|---|---|
| JS/Dart-only logic, UI, copy, assets already bundled | OTA update (EAS Update, CodePush) if the app uses one |
| New native module, permission, config plugin, SDK upgrade, app icon/name, entitlement | **Store build** — an OTA cannot carry it |
| Anything changing the runtime version | Store build |

An OTA that assumes native code the installed binary lacks crashes every device that receives it. When in doubt, build.

## Phase 1: Pre-flight

1. **Green gate**: tests, analyzer/typecheck, lint all pass on the release commit. No release from a dirty tree.
2. **Version**: bump the marketing version (semver) **and** the build number (must be strictly increasing per platform — a repeated build number is rejected on upload).
3. **Changelog**: what changed, in user language, for the store's "what's new".
4. **Store requirements** current: privacy manifest / data-safety form, required screenshots for current device sizes, target SDK/API level minimums, permission usage strings that actually describe the use.
5. **Config**: production API endpoints, analytics/crash reporting keys, no debug flags, no dev menu, logging at production level. Verify by reading the release config, not by trusting the default.
6. **Secrets**: signing credentials in the CI/secret store, never in the repo. A committed keystore or `.p8` is a `/security-review` incident, not a footnote.

## Phase 2: Build

- Use the project's real pipeline: EAS Build, Fastlane, Xcode/Gradle via CI, or `flutter build ipa/appbundle`. Never hand-build a release on a laptop when CI can do it reproducibly.
- iOS: correct bundle id, provisioning profile, and capabilities; archive → `.ipa`.
- Android: **App Bundle** (`.aab`) for Play, signed with the upload key; Play App Signing handles the rest.
- Record the exact commit SHA in the build metadata — a release you can't map to a commit can't be debugged.

## Phase 3: Verify the real artifact

The build is not the app until it runs as installed:
1. Install the actual release artifact (TestFlight build / internal-track APK-from-bundle) on a real device — not the debug build.
2. **Cold start** from a fresh install: onboarding, permissions, login, the primary flow.
3. **Upgrade path**: install the *previous* store version, then upgrade to this one — local database migrations, persisted caches, and stored tokens must survive. This is the test people skip and the one that bricks returning users.
4. Offline behavior, deep links, push notifications, and the permission-denied path.
5. Crash/analytics reporting: confirm events reach the dashboard from the release build with the correct version tag.

## Phase 4: Submit & roll out staged

- **iOS**: upload, fill the "what's new", answer export-compliance, submit for review. Use phased release (7-day ramp) for production.
- **Android**: upload to a testing track first, then production with a **staged rollout** (start at 5–10%).
- Never ship 100% on day one for a release touching payments, auth, or data migration.
- Watch, don't assume: crash-free-sessions rate, ANRs, the new version's error rate vs the previous one, store reviews, and the funnel of the changed feature. Hold the rollout if crash-free rate drops.

## Phase 5: Rollback plan (decided before submission)

| Situation | Move |
|---|---|
| Bad JS-only bug, app uses OTA | Publish the previous OTA bundle — minutes |
| Bad native bug, staged rollout | **Halt the rollout** (Play) / pause phased release (App Store) immediately |
| Already at 100% | Expedited review with a fix build; server-side feature flag off, if the feature is flagged |
| Data-corrupting bug | Server-side kill switch first, then the fix build |

The lesson embedded here: **flag risky mobile features server-side**, because that's the only rollback that doesn't need Apple's or Google's clock.

## Phase 6: Report

```
## Mobile Release — v<version> (<build number>)

Commit: <sha>   Type: <store build | OTA>   Platforms: <ios/android>
Gate: tests ✓ analyze ✓ lint ✓
Verified on device: cold start ✓ upgrade from v<prev> ✓ offline ✓ deep links ✓ push ✓
Rollout: iOS phased ✓ · Android staged 10% ✓
Monitoring: crash-free <baseline>% · watch window <n>h
Rollback: <the exact move for this release>
Store status: <in review | released>
```

## Rules
- Never publish an OTA update that assumes native code the installed binary doesn't have.
- Never skip the upgrade-from-previous-version test.
- Signing keys and store credentials live in the secret store; a key in the repo blocks the release.
- Always stage the rollout for production, and always know the rollback before submitting.
- Version + build number increase every submission; never reuse a build number.
- Release from a green, tagged commit — never from a dirty working tree.
