---
description: Build pipeline for Next.js — typecheck, lint, build, verify output
---

# /build — Build Pipeline (Next.js)

## Usage
```
/build
```

## Overview
Run the full build pipeline step by step. Stop at the first failure, diagnose, fix, and re-run from that step.

---

## Pipeline

Execute each step in order. Each step must pass before moving to the next.

### Step 1: Type Check
```bash
npx tsc --noEmit
```

**On failure:**
- Read each error: file, line, message
- Classify: missing type, wrong type, import issue, config issue
- Fix the source file (not by adding `@ts-ignore`)
- Re-run until clean

**Report:**
```
Step 1 — TypeScript: PASS / FAIL
Errors: <count>
Fixed: <list of fixes>
```

### Step 2: Lint
```bash
npx next lint
```

**On failure:**
- Read each warning/error with rule name
- Auto-fix what is safe: `npx next lint --fix`
- Manually fix remaining errors
- Do NOT disable rules unless the rule is genuinely wrong for this case

**Report:**
```
Step 2 — Lint: PASS / FAIL
Errors: <count>  Warnings: <count>
Fixed: <list of fixes>
```

### Step 3: Format Check
```bash
npx prettier --check .
```

If Prettier is not installed, skip this step and note it.

**On failure:**
- Run `npx prettier --write .` to auto-format
- Verify no logic changes were introduced (format only)

**Report:**
```
Step 3 — Prettier: PASS / FAIL / SKIPPED
Files reformatted: <count>
```

### Step 4: Build
```bash
npx next build
```

**On failure — classify the error:**

| Error type | Fix approach |
|-----------|-------------|
| Type error | Should have been caught in Step 1. Fix the type |
| Import error | Missing module, wrong path, or server/client boundary violation |
| Dynamic import error | `next/dynamic` or `React.lazy` failing — check default export |
| Image optimization error | Check `next.config.js` image domains, file existence |
| Route conflict | Duplicate pages/routes. Check `app/` and `pages/` for overlaps |
| Out of memory | Add `NODE_OPTIONS=--max_old_space_size=4096` or reduce bundle size |
| API route error | Syntax or runtime error in `app/api/` or `pages/api/` route handlers |
| Middleware error | `middleware.ts` has issues — check matcher config and edge runtime compatibility |

**Report:**
```
Step 4 — Build: PASS / FAIL
Duration: <time>
Pages: <count>
Output: <.next/>
Error: <if failed, root cause>
```

---

## Final Report

```
## Build Report

| Step | Status | Details |
|------|--------|---------|
| TypeScript | PASS/FAIL | <errors fixed or clean> |
| Lint | PASS/FAIL | <errors fixed or clean> |
| Prettier | PASS/FAIL/SKIPPED | <files formatted or clean> |
| Build | PASS/FAIL | <duration, page count, or error> |

**Overall**: GREEN / RED
**Fixes applied**: <count>
**Files modified**: <list>
```

---

## Common Build Issues (Next.js)

| Error | Cause | Fix |
|-------|-------|-----|
| `Module not found` | Wrong import path or missing dependency | Check path, run `npm install` if needed |
| `'use client'` directive issue | Client component imported in server context incorrectly | Add directive or restructure imports |
| `generateStaticParams` error | Dynamic route can't generate params at build time | Check data source, add fallback |
| ESLint `react-hooks/exhaustive-deps` | Missing dependency in useEffect | Add the dependency or memoize |
| Prettier/ESLint conflict | Conflicting formatting rules | Ensure `eslint-config-prettier` is in ESLint extends |
| Build output too large | Large dependencies bundled client-side | Use `next/dynamic`, tree-shake, check `import` specificity |
| Edge runtime incompatibility | Using Node.js API in middleware or edge route | Replace with edge-compatible alternative |
