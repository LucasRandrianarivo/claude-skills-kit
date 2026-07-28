---
description: Scaffold a feature for React + Vite following project conventions
argument-hint: "<feature description>"
---

# /scaffolder — Feature Scaffolding (React + Vite SPA)

## Usage
```
/scaffolder <feature-name> [options]
```

## Overview
Scaffold a complete feature for a React + Vite SPA. Reads existing code first, then generates files matching project conventions.

---

## Phase 1: Analyze

1. Parse `$ARGUMENTS` for feature name and options (`--no-hook`, `--no-service`)
2. Read the project to understand conventions:
   - **Router**: React Router v6? TanStack Router? Check `main.tsx` or `App.tsx`
   - **Folder structure**: `pages/` + `components/`? Feature-based (`features/<name>/`)?
   - **Naming**: kebab-case files? PascalCase components? camelCase hooks?
   - **Data fetching**: React Query? SWR? Plain fetch? Axios?
   - **State management**: Zustand? Redux? Context?
   - **Styling**: Tailwind? CSS Modules? Styled components?
3. Read `CLAUDE.md` for additional conventions
4. Present the plan and confirm before creating files

## Phase 2: Plan

```
src/pages/<Feature>/
  <Feature>Page.tsx         — Page component (lazy loaded, default export)
src/components/<Feature>/
  <Feature>List.tsx         — List component (named export)
  <Feature>Detail.tsx       — Detail component (named export)
  <Feature>Form.tsx         — Create/Edit form (named export)
src/hooks/use<Feature>.ts   — Data hook (named export)
src/services/<feature>.service.ts — API calls (named exports)
src/types/<feature>.types.ts      — TypeScript interfaces (named exports)
```

Adapt to match existing patterns. If the project uses feature-based folders, put everything under `features/<feature>/`.

## Phase 3: Generate

**Router integration** — Add to existing router config (do NOT create a new router). Use `React.lazy()` for the page import. Wrap in `<Suspense>`.

**<Feature>Page.tsx** — Default export (required for `React.lazy`). Uses the custom hook for data. Renders loading/error/content states.

**<Feature>List.tsx / <Feature>Detail.tsx** — Presentational components. Receive typed props. Use router's `Link` component. Named exports.

**use<Feature>.ts** — If project uses React Query: wraps `useQuery`/`useMutation` with proper query keys and invalidation. If plain fetch: manages `useState`/`useEffect` cycle. Returns `{ data, isLoading, error }`. Named export.

**<feature>.service.ts** — Pure async functions using `import.meta.env.VITE_API_URL`. Functions: `get<Feature>List()`, `get<Feature>ById()`, `create<Feature>()`, `update<Feature>()`. Named exports.

**<feature>.types.ts** — Interfaces: `<Feature>Data`, `Create<Feature>Payload`, `Update<Feature>Payload`. Named exports.

Each generated file must match the project's style: indentation, quotes, semicolons, import order.

## Phase 4: Report

```
## Scaffold Report

**Feature**: <name>
**Stack**: React + Vite SPA

**Files created**:
| File | Purpose |
|------|---------|
| src/pages/<Feature>/<Feature>Page.tsx | Page (lazy loaded) |
| src/components/<Feature>/<Feature>List.tsx | List component |
| src/hooks/use<Feature>.ts | Data hook |
| src/services/<feature>.service.ts | API layer |
| src/types/<feature>.types.ts | TypeScript types |

**Router updated**: <file> — added lazy route for `/<feature>`

**Next steps**:
1. Define types in `<feature>.types.ts`
2. Ensure `VITE_API_URL` is set in `.env`
3. Build UI in the component files
4. Run `/test` when ready
```

---

## Rules

- **Read before writing**: Read at least 2 existing features to learn conventions
- **Lazy loading**: Pages must use `React.lazy()` or router lazy config
- **Named exports** for components/hooks. Default export only for pages (React.lazy needs it)
- **`import.meta.env.VITE_`** for env vars — never `process.env`
- **Match the router**: Use the same library and pattern as existing routes
- **Match the codebase** exactly: style, naming, structure
- **Do not install dependencies** without asking
