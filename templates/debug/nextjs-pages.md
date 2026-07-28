---
description: Structured 4-phase debugging for Next.js Pages Router — no fix without root cause
argument-hint: "<bug description>"
---

# /debug — Structured Debugging (Next.js Pages Router)

## Usage
```
/debug <bug description or error message>
```

## Iron Rule
**Never apply a fix without first identifying the root cause.** A fix without a diagnosis is a new bug waiting to happen.

---

## Phase 1: Reproduce

Goal: See the bug with your own eyes. No assumptions.

1. Parse `$ARGUMENTS` for the bug description, error message, or affected page
2. Identify the affected page in `pages/` — find the corresponding `.tsx`/`.jsx` file
3. Reproduce:
   - Run `npm run dev` (or the project's dev command from `package.json`)
   - Open the affected page in the browser
   - Check: browser console, terminal server logs, Network tab
4. Capture the exact error: message, stack trace, component location
5. If not reproducible, ask the user for exact steps before proceeding

Output:
```
Bug: <description>
Page: pages/<path>.tsx
Error: <exact error message>
Reproduced: yes/no
```

## Phase 2: Locate

Goal: Trace the data/render flow to find where it breaks.

**Next.js Pages Router flow:**
```
pages/<route>.tsx → getServerSideProps / getStaticProps → Component → Hook → API call (pages/api/)
```

Trace step by step:
1. **Data fetching** — Does `getServerSideProps` or `getStaticProps` return the correct shape? Log the `props` object
2. **Page component** — Does it receive and destructure props correctly? Check TypeScript types match actual data
3. **Child components** — Trace props down. Where does the data stop being correct?
4. **Hooks** — Check `useEffect`, `useState`, custom hooks. Are dependencies correct?
5. **API routes** — If the page calls `pages/api/`, check request/response format
6. **SSR vs client** — Does the bug appear only on first load (SSR) or only after navigation (client)?

**Narrow down**: Add `console.log` at each boundary. On server (`getServerSideProps`), logs appear in the terminal. On client, logs appear in the browser.

Output:
```
Root cause: <what is actually wrong and why>
Location: <file>:<line>
Evidence: <what you observed that confirms this>
```

## Phase 3: Fix

Goal: Minimal, targeted fix that addresses the root cause.

1. Confirm the root cause from Phase 2 — if uncertain, go back
2. Write the fix:
   - Change only what is necessary
   - Do not refactor unrelated code
   - Preserve existing conventions (read neighboring files)
3. Verify the fix:
   - Re-run the dev server
   - Confirm the original error is gone
   - Check for regressions on related pages
4. Run the project's test suite if available

**Rules:**
- One fix per bug. If you discover a second bug, note it but fix separately
- Never suppress errors (catch without handling, `// @ts-ignore` without comment)
- If the fix requires a dependency update, flag it to the user first

## Phase 4: Report

```
## Debug Report

**Bug**: <description>
**Root cause**: <explanation>
**Location**: <file(s)>

**Fix applied**:
- <file>: <what changed and why>

**Verification**:
- [ ] Error no longer occurs
- [ ] Related pages still work
- [ ] Tests pass (or N/A)
- [ ] No new warnings in console

**Regression risk**: low / medium / high — <why>
```

---

## Common Next.js Pages Router Bugs

| Symptom | Likely cause |
|---------|-------------|
| `getServerSideProps` returns undefined prop | Return shape must be `{ props: { ... } }`. Check you are not returning `{ data }` instead of `{ props: { data } }` |
| `window is not defined` | Code accessing `window` / `document` runs during SSR. Wrap in `useEffect` or `typeof window !== 'undefined'` check |
| `useRouter` wrong import | Pages Router uses `next/router`, not `next/navigation` (App Router). Check the import path |
| Props type mismatch | `getServerSideProps` returns different shape than component expects. Verify with `InferGetServerSidePropsType` |
| Hydration mismatch | Server and client render different HTML. Check: date formatting, locale-dependent values, browser-only conditional rendering |
| API route 405 Method Not Allowed | Handler does not check `req.method`. Ensure the correct HTTP method is handled |
| `getStaticPaths` missing for dynamic routes | Dynamic routes (`[id].tsx`) using `getStaticProps` require `getStaticPaths` with `fallback` setting |
| Stale data on navigation | Client-side navigation reuses cached page. Use `router.replace()` or add a `key` prop to force re-mount |
| Infinite re-render | `useEffect` dependency array missing or object/array reference changing every render |
| Custom `_app.tsx` not applying | Check that `_app.tsx` wraps `<Component {...pageProps} />` and is in the correct location |
