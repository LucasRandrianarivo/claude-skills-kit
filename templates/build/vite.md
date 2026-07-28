---
description: Build pipeline for Vite — typecheck, lint, build, verify output
---

# /build — Build Pipeline (Vite)

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
npx eslint src/
```

If using `eslint.config.js` (flat config) or `.eslintrc.*`, the command is the same.

**On failure:**
- Read each warning/error with rule name
- Auto-fix what is safe: `npx eslint src/ --fix`
- Manually fix remaining errors
- Do NOT disable rules unless the rule is genuinely wrong for this case

**Report:**
```
Step 2 — ESLint: PASS / FAIL
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
npx vite build
```

**On failure — classify the error:**

| Error type | Fix approach |
|-----------|-------------|
| Type error | Should have been caught in Step 1. Fix the type |
| Import error | Missing module, wrong path. Check `resolve.alias` in `vite.config.ts` |
| Rollup error | Circular dependency, CommonJS/ESM mismatch. Check the dependency chain |
| Asset error | Missing file referenced in code. Check public/ and asset imports |
| Out of memory | Add `NODE_OPTIONS=--max_old_space_size=4096` or reduce bundle size |
| CSS error | PostCSS/Tailwind config issue, missing plugin, syntax error |
| Environment variable | `process.env` used instead of `import.meta.env`, or missing `VITE_` prefix |
| Plugin error | Vite plugin misconfigured or incompatible version |

**Report:**
```
Step 4 — Build: PASS / FAIL
Duration: <time>
Output: <dist/>
Bundle size: <if available>
Error: <if failed, root cause>
```

---

## Final Report

```
## Build Report

| Step | Status | Details |
|------|--------|---------|
| TypeScript | PASS/FAIL | <errors fixed or clean> |
| ESLint | PASS/FAIL | <errors fixed or clean> |
| Prettier | PASS/FAIL/SKIPPED | <files formatted or clean> |
| Build | PASS/FAIL | <duration, output size, or error> |

**Overall**: GREEN / RED
**Fixes applied**: <count>
**Files modified**: <list>
```

---

## Common Build Issues (Vite)

| Error | Cause | Fix |
|-------|-------|-----|
| `Module not found` | Wrong path or alias not configured | Check `resolve.alias` in `vite.config.ts` and `tsconfig.json` |
| `process is not defined` | Using `process.env` in browser | Replace with `import.meta.env` or add `define` |
| Circular dependency | Module A imports B, B imports A | Extract shared code into a third module |
| CommonJS module error | Dependency uses `require()` | Add to `optimizeDeps.include` |
| Prettier/ESLint conflict | Conflicting rules | Add `eslint-config-prettier` to ESLint extends |
| Large bundle warning | Chunk >500KB | Use dynamic `import()`, check large deps |
| CSS `@apply` error | Tailwind not processed | Check PostCSS config and Tailwind plugin |
