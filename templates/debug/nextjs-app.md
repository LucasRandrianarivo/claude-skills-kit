---
description: Structured 4-phase debugging for Next.js App Router — no fix without root cause
argument-hint: "<bug description>"
---

# /debug — Structured Debugging (Next.js App Router)

## Usage
```
/debug <bug description or error message>
```

## Iron Rule
**Never apply a fix without first identifying the root cause.** A fix without a diagnosis is a new bug waiting to happen.

---

## Phase 1: Reproduce

Goal: See the bug with your own eyes. No assumptions.

1. Parse `$ARGUMENTS` for the bug description, error message, or affected route
2. Identify the affected route in `app/` — find the `page.tsx` and `layout.tsx`
3. Reproduce:
   - Run `npm run dev` (or the project's dev command from `package.json`)
   - Open the affected route in the browser
   - Check: browser console, terminal server logs, Network tab
4. Capture the exact error: message, stack trace, component tree location
5. If not reproducible, ask the user for exact steps before proceeding

Output:
```
Bug: <description>
Route: app/<path>/page.tsx
Error: <exact error message>
Reproduced: yes/no
```

## Phase 2: Locate

Goal: Trace the data/render flow to find where it breaks.

**Next.js App Router flow:**
```
layout.tsx → page.tsx → Server Component → Client Component → Hook → Data fetching → API route
```

Trace step by step:
1. **Layout** — Does `app/<path>/layout.tsx` or a parent layout cause the issue?
2. **Page** — Is the page a Server Component or Client Component? Check for `'use client'` directive
3. **Server Components** — Check `async` data fetching, `fetch()` calls, `searchParams`/`params` usage
4. **Client Components** — Check hooks, event handlers, state, effects
5. **Data layer** — Check API routes in `app/api/`, server actions, external API calls
6. **Read related files**: imports, shared hooks, utility functions

**Narrow down**: Use `console.log` / `console.error` at each boundary to find where correct data becomes incorrect data.

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
   - Check for regressions on related routes
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
- [ ] Related routes still work
- [ ] Tests pass (or N/A)
- [ ] No new warnings in console

**Regression risk**: low / medium / high — <why>
```

---

## Common Next.js App Router Bugs

| Symptom | Likely cause |
|---------|-------------|
| Hydration mismatch | Server and client render different output. Check: `Date.now()`, `Math.random()`, browser-only APIs, conditional rendering on `typeof window` |
| "X is not a function" in Server Component | Importing a client-only module (hook, event handler) in a Server Component. Add `'use client'` to the component or move the import |
| `'use client'` missing | Component uses hooks or browser APIs but lacks the directive. Must be the **first line** of the file |
| Stale data after mutation | `revalidatePath()` or `revalidateTag()` not called after server action. Check cache strategy |
| `searchParams` undefined | In App Router, `searchParams` is a prop of `page.tsx`, not from `useRouter()`. Check async params in Next.js 15+ |
| Dynamic route `[slug]` 404 | Missing `generateStaticParams` for static export, or wrong folder structure |
| "Cannot read properties of undefined" on params | Next.js 15+: `params` and `searchParams` are Promises. Must `await` them |
| Infinite re-render | `useEffect` with missing or incorrect dependency array in a Client Component |
| NEXT_REDIRECT error in console | `redirect()` throws internally — this is expected. Do not wrap `redirect()` in try/catch |
| Streaming/Suspense not working | Component is not async, or missing `<Suspense>` boundary around async Server Component |
