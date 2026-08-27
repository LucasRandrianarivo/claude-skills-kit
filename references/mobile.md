# Field notes — Mobile (React Native, Expo, Flutter)

Consulted by `/mobile`, `/mobile-release`, `/component`, `/notifications`.

---

## What makes mobile different (and what it punishes)

- **The network is hostile**: it disappears mid-request, comes back on a different IP, and is slow on the exact screen you tested on WiFi. Every fetch needs an offline story.
- **The process dies**: the OS kills backgrounded apps without warning. State that only exists in memory is gone; unfinished work must be resumable.
- **The user is interrupted**: calls, notifications, app switching. Anything assuming an uninterrupted flow breaks.
- **Updates are slow**: a bad build lives on devices until users update. This is why server-side feature flags matter far more than on the web.
- **Permissions are one-shot in practice**: a denied permission is rarely re-granted. Ask in context, after the value is obvious.

## Symptom → cause → fix

| Symptom | Cause | Fix |
|---|---|---|
| List stutters when scrolling | Rendering all rows, or heavy work per row | `FlatList`/`FlashList`/`ListView.builder` with stable keys, memoized rows, `getItemLayout` |
| Animation janks only in release on Android | Work on the JS thread; bridge traffic per frame | Reanimated on the UI thread; avoid per-frame state updates |
| App white-screens after backgrounding | Process killed; state assumed to persist | Persist and rehydrate; handle "cold start into a deep screen" |
| Works in Expo Go, crashes in a build | Native module not in the runtime, or a config plugin missing | Development build; verify the module is in the binary |
| OTA update bricks some users | JS bundle assumes native code that build doesn't have | Gate on runtime version; native changes require a store build |
| Keyboard covers the input | No avoiding view / wrong behavior per platform | `KeyboardAvoidingView` (iOS: padding, Android: height) or the framework's inset API |
| Layout wrong on a notched device | No safe-area handling | `useSafeAreaInsets` / `SafeArea`; never hardcode status-bar height |
| Text truncated for some users | System font scale ignored; fixed-height containers | Honor text scaling; let containers grow |
| Push notifications silently stop | Token rotated/invalid and never refreshed or removed | Refresh on launch, delete on logout, prune invalid tokens from provider feedback |
| Slow cold start | Heavy work at module scope; huge JS bundle; synchronous storage reads at boot | Lazy-import screens; defer non-critical init; measure TTI on a mid-range device |
| Crash only on old Android | API level differences, missing runtime permission, 32-bit | Test the minimum supported version, not just the newest |

## Storage & offline

- Secure storage (Keychain / Keystore) for tokens; never `AsyncStorage`/`SharedPreferences` for credentials.
- A local database (SQLite/WatermelonDB/Realm/Drift/Isar) beats a pile of key-value writes once you have lists and relations — and it survives process death.
- Sync design: last-write-wins is a decision with consequences (silent data loss); a queue of intent-based mutations with conflict handling is the honest version. Show sync state in the UI — users tolerate "pending", not silent loss.
- Migrations exist on the client too, and you cannot force everyone to upgrade: old schema versions live in the wild for years.

## Release reality

- Version + build number both increase, every submission. A reused build number is rejected at upload.
- Test the **upgrade path** (install the previous store version, then upgrade): local DB migrations, persisted caches and stored tokens must survive. This is the most-skipped test and the one that breaks returning users.
- Staged/phased rollout for production, always. Halting a rollout is the only fast rollback you have.
- Server-side feature flags are the real kill switch — Apple's review clock is not a rollback plan.
- Store review rejections cluster around: missing permission usage strings, an account-deletion path that doesn't exist, sign-in requirements without an alternative, private API usage, and misleading screenshots.
- Crash-free sessions rate is the release health metric to watch; set the threshold that halts the rollout before you ship.

## Platform differences that actually bite

Back navigation (Android hardware back must do something sensible everywhere), shadows vs elevation, date/time pickers, permission dialog behavior and the "never ask again" state, notification channels on Android vs categories on iOS, background execution limits (Android Doze, iOS background modes), file paths, and keyboard behavior. Verify on both platforms every time — "it works" from one simulator is half a claim.

## Where this gets decided wrong

- Treating the mobile app as a web page in a shell, then discovering offline, permissions and process death at once.
- Adding a native dependency casually — it changes the build, the review, and the OTA story.
- Testing only on the newest flagship simulator, where every performance problem is invisible.
- Shipping without a server-side flag on a risky feature, then waiting days for a fix build.
