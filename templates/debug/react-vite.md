---
description: Structured 4-phase debugging for React + Vite — no fix without root cause
argument-hint: "<bug description>"
---

# /debug — Structured Debugging (React + Vite SPA)

## Usage
```
/debug <bug description or error message>
```

## Iron Rule
**Never apply a fix without first identifying the root cause.** A fix without a diagnosis is a new bug waiting to happen.

---

## Phase 1: Reproduce

Goal: See the bug with your own eyes. No assumptions.

1. Parse `$ARGUMENTS` for the bug description, error message, or affected route/component
2. Identify the affected component or route — check `src/pages/`, `src/routes/`, or router config
3. Reproduce:
   - Run `npm run dev` (Vite dev server)
   - Open the affected route in the browser
   - Check: browser console, Network tab, React DevTools if available
4. Capture the exact error: message, stack trace, component tree location
5. If not reproducible, ask the user for exact steps before proceeding

Output:
```
Bug: <description>
Route/Component: <path>
Error: <exact error message>
Reproduced: yes/no
```

## Phase 2: Locate

Goal: Trace the data/render flow to find where it breaks.

**React + Vite SPA flow:**
```
Router (react-router / tanstack-router) → Page → Component → Hook → API call (fetch / axios)
```

Trace step by step:
1. **Router** — Is the route matched correctly? Check route config, params, loaders
2. **Page component** — Is it lazy-loaded? Does `React.lazy()` / dynamic import resolve?
3. **Component tree** — Trace props and context down. Where does data stop being correct?
4. **Hooks** — Check `useState`, `useEffect`, custom hooks, query hooks (React Query / SWR)
5. **API calls** — Check request URL, headers, payload, response parsing
6. **State management** — If using Zustand / Redux / Context, check store state

**Narrow down**: Use `console.log` at each boundary. Use React DevTools to inspect component props and state.

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
   - Check the browser — Vite HMR should apply changes instantly
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

## Common React + Vite Bugs

| Symptom | Likely cause |
|---------|-------------|
| `import.meta.env.VITE_X` is undefined | Env var must be prefixed with `VITE_`. Check `.env` file and restart dev server (env changes require restart) |
| HMR not updating | Vite HMR requires modules to have clean boundaries. Check: file exports a single component, no side effects at module scope. Try hard refresh |
| Lazy loading blank screen | `React.lazy(() => import('./Page'))` — the module must have a `default` export. Check for named-only exports |
| React Router loader error | Loader threw an error but no `errorElement` is defined. Check loader return value and add error boundaries |
| `useNavigate()` outside Router | Component using `useNavigate` / `useParams` is rendered outside `<RouterProvider>` or `<BrowserRouter>` |
| CORS error on API call | Dev server proxy not configured. Add proxy to `vite.config.ts` under `server.proxy` |
| White screen, no error | Check browser console for uncaught errors. Common: top-level import fails, circular dependency, missing env var |
| `process.env` is undefined | Vite uses `import.meta.env`, not `process.env`. Replace or add a `define` in `vite.config.ts` |
| Infinite re-render | `useEffect` dependency array missing, or new object/array reference created every render |
| Build works but dev breaks (or vice versa) | Vite dev uses ESM natively, build uses Rollup. Check: dynamic imports, CommonJS modules, conditional `require()` |
| Path alias not resolving | Alias defined in `tsconfig.json` but not in `vite.config.ts` `resolve.alias`. Both must match |
