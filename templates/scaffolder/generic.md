---
description: Scaffold a feature on any stack by replicating the project's own conventions
argument-hint: "<feature description>"
---

# /scaffolder — Feature Scaffolding (Generic)

## Usage
```
/scaffolder <feature description>
```

## Overview
Stack-agnostic scaffolding: learn the project's conventions from its own code, then generate the files for a new feature that look like a longtime team member wrote them.

**Iron rule: convention comes from the codebase, not from your defaults.**

---

## Phase 1: Learn the conventions

1. Read `CLAUDE.md` and any `docs/`/`CONTRIBUTING.md` conventions
2. Find the 2–3 most recently touched features similar to the request (`git log --name-only`) and read them fully
3. Extract the pattern:
   - Directory layout per feature (flat? by-type? by-domain?)
   - File naming (kebab/camel/Pascal, suffixes like `.service`, `.controller`, `_test`)
   - How modules expose their API (index files? explicit exports?)
   - Test placement (colocated? `tests/` mirror?) and test style
   - Error handling, validation, and typing idioms

## Phase 2: Plan the files

List every file to create/modify with its role:

```
## Scaffold plan for: <feature>
| File | Role | Modeled after |
|------|------|---------------|
| ... | ... | <existing file used as reference> |
```

Confirm the plan matches the user's intent before writing if the feature is large (> 5 files).

## Phase 3: Generate

1. Create each file by adapting the reference file's structure — same imports style, same ordering, same idioms
2. Wire the feature in (routes, module registration, DI, exports) exactly where sibling features are wired
3. Include the same test skeletons sibling features have, with one meaningful assertion each (no empty tests)

## Phase 4: Verify

1. Run the typecheck/lint/build discovered from the project (see `/build`)
2. Run the tests touching the new feature
3. Report:

```
## Scaffolded: <feature>
Created: <n> files    Modified: <n> files
Verification: typecheck PASS/FAIL · lint PASS/FAIL · tests PASS/FAIL
Next steps: <what the user must fill in — business logic, copy, config>
```
