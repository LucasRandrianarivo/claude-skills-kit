---
description: Scaffold a feature for Next.js App Router following project conventions
argument-hint: "<feature description>"
---

# /scaffolder — Feature Scaffolding (Next.js App Router)

## Usage
```
/scaffolder <feature-name> [options]
```

## Overview
Scaffold a complete feature for Next.js App Router. Reads existing code first, then generates files matching project conventions.

---

## Phase 1: Analyze

1. Parse `$ARGUMENTS` for feature name and options (`--no-api`, `--no-hook`)
2. Read the project to understand conventions:
   - **Folder structure**: How are routes organized in `app/`? Grouped? Parallel?
   - **Naming**: kebab-case folders? PascalCase components? camelCase hooks?
   - **Exports**: Named exports for components, default only for `page.tsx` / `layout.tsx`
   - **Data fetching**: Server Components with `fetch()`? Server Actions? React Query?
   - **Styling**: Tailwind? CSS Modules? Styled components?
3. Read `CLAUDE.md` for additional conventions
4. Present the plan and confirm before creating files

## Phase 2: Plan

```
app/<feature>/
  page.tsx              — Server Component (default export, async data fetching)
  loading.tsx           — Suspense fallback
  <Feature>Client.tsx   — Client Component ('use client', named export)
app/api/<feature>/
  route.ts              — API route handler (GET, POST)
hooks/use<Feature>.ts   — Client-side logic hook (named export)
services/<feature>.service.ts — Data fetching / business logic (named exports)
types/<feature>.types.ts      — TypeScript interfaces (named exports)
```

Adapt paths to match the project. If hooks live next to components, follow that. If services are in `lib/`, use `lib/`.

## Phase 3: Generate

**page.tsx** — Server Component. Fetches data with `async/await`, passes to Client Component via props. Uses `<Suspense>` boundary. Default export.

**<Feature>Client.tsx** — Starts with `'use client'` as first line. Receives `initialData` prop. Uses custom hook for client logic. Named export.

**use<Feature>.ts** — Manages client state (`useState`, `useEffect`) or wraps React Query. Returns `{ data, isLoading, error }`. Named export.

**<feature>.service.ts** — Pure async functions: `get<Feature>Data()`, `create<Feature>()`, `update<Feature>()`. No hooks, no React. Named exports.

**<feature>.types.ts** — Interfaces: `<Feature>Data`, `Create<Feature>Payload`, `Update<Feature>Payload`. Named exports.

**route.ts** (optional) — Exports `GET`, `POST` functions using `NextRequest` / `NextResponse`.

Each generated file must match the project's style: indentation, quotes, semicolons, import order.

## Phase 4: Report

```
## Scaffold Report

**Feature**: <name>
**Stack**: Next.js App Router

**Files created**:
| File | Purpose |
|------|---------|
| app/<feature>/page.tsx | Server Component page |
| app/<feature>/<Feature>Client.tsx | Client Component |
| hooks/use<Feature>.ts | Custom hook |
| services/<feature>.service.ts | Data layer |
| types/<feature>.types.ts | TypeScript types |

**Next steps**:
1. Define types in `<feature>.types.ts`
2. Implement fetching in `<feature>.service.ts`
3. Build UI in `<Feature>Client.tsx`
4. Run `/test` when ready
```

---

## Rules

- **Read before writing**: Read at least 2 existing features to learn conventions
- **Named exports** everywhere except `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- **`'use client'`** must be the first line in Client Components — before imports
- **No barrel exports** unless the project already uses them
- **Match the codebase** exactly: style, naming, structure
- **Do not install dependencies** without asking
