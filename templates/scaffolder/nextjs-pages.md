# /scaffolder — Feature Scaffolding (Next.js Pages Router)

## Usage
```
/scaffolder <feature-name> [options]
```

## Overview
Scaffold a complete feature for Next.js Pages Router. Reads existing code first, then generates files matching project conventions.

---

## Phase 1: Analyze

1. Parse `$ARGUMENTS` for feature name and options (`--no-api`, `--no-hook`, `--static`)
2. Read the project to understand conventions:
   - **Folder structure**: Pages in `pages/`? Nested or flat?
   - **Component location**: `components/` at root? `src/components/`? Co-located?
   - **Naming**: kebab-case files? PascalCase components? camelCase hooks?
   - **Data fetching**: `getServerSideProps`? `getStaticProps`? Client-side SWR/React Query?
   - **Styling**: Tailwind? CSS Modules? Styled components?
3. Read `CLAUDE.md` for additional conventions
4. Present the plan and confirm before creating files

## Phase 2: Plan

```
pages/<feature>/
  index.tsx          — List page (default export + getServerSideProps)
  [id].tsx           — Detail page (default export + getServerSideProps)
components/<Feature>/
  <Feature>List.tsx  — List component (named export)
  <Feature>Detail.tsx — Detail component (named export)
  <Feature>Form.tsx  — Create/Edit form (named export)
hooks/use<Feature>.ts       — Client-side logic (named export)
services/<feature>.service.ts — API calls + data mapping (named exports)
types/<feature>.types.ts     — TypeScript interfaces (named exports)
pages/api/<feature>/
  index.ts           — GET list, POST create
  [id].ts            — GET one, PUT update, DELETE
```

Adapt paths to match existing project patterns.

## Phase 3: Generate

**pages/<feature>/index.tsx** — Default export page component. `getServerSideProps` fetches data, returns `{ props: { items } }`. Uses `InferGetServerSidePropsType` for type safety. Renders the list component.

**pages/<feature>/[id].tsx** — Default export detail page. `getServerSideProps` extracts `id` from `context.params`, fetches item, returns `{ notFound: true }` if missing.

**<Feature>List.tsx / <Feature>Detail.tsx** — Presentational components. Receive typed props. Use `next/link` for navigation. Named exports.

**use<Feature>.ts** — Uses `useRouter` from `next/router` (NOT `next/navigation`). Manages loading/error state for mutations. Named export.

**<feature>.service.ts** — Pure async functions calling `/api/<feature>`. Handles response parsing and error throwing. Named exports.

**<feature>.types.ts** — Interfaces: `<Feature>Data`, `Create<Feature>Payload`, `Update<Feature>Payload`. Named exports.

**API routes** (optional) — Check `req.method` to handle GET/POST/PUT/DELETE. Return with `res.status(200).json()`.

Each generated file must match the project's style: indentation, quotes, semicolons, import order.

## Phase 4: Report

```
## Scaffold Report

**Feature**: <name>
**Stack**: Next.js Pages Router

**Files created**:
| File | Purpose |
|------|---------|
| pages/<feature>/index.tsx | List page + GSSP |
| pages/<feature>/[id].tsx | Detail page + GSSP |
| components/<Feature>/<Feature>List.tsx | List component |
| hooks/use<Feature>.ts | Client-side hook |
| services/<feature>.service.ts | API calls |
| types/<feature>.types.ts | TypeScript types |

**Next steps**:
1. Define types in `<feature>.types.ts`
2. Implement API routes or connect to backend
3. Build UI in the component files
4. Run `/test` when ready
```

---

## Rules

- **Read before writing**: Read at least 2 existing pages to learn conventions
- **Default exports** for page files in `pages/` only — everything else uses named exports
- **No `app/` directory** — Pages Router. All routes in `pages/`
- **`next/router`** not `next/navigation` — `useRouter` from `next/router`
- **`getServerSideProps`** must return `{ props: { ... } }` — always verify the shape
- **Match the codebase** exactly: style, naming, structure
- **Do not install dependencies** without asking
