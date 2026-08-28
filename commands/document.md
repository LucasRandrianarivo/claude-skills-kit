---
description: Generate missing documentation for a feature, module, or project using the Diátaxis framework
argument-hint: "[feature | module | path]"
---

# /document — Diátaxis Documentation Writer

## Usage
```
/document <target>   — document a feature, module, or directory
/document            — document the project (audit-first, fill the biggest gaps)
```

**Iron rule: research the whole, then write the parts.** Read the full surface of the target before writing a single line. Documentation written from a partial reading describes half the feature — worse than no documentation, because readers trust it.

## Argument Parsing

Parse `$ARGUMENTS`: a path → that directory/file is the scope; a feature/module name → locate it (Glob/Grep) and confirm the file set with the user; empty → whole project, prioritized by the Phase 1 gap audit.

---

## Phase 1: Audit What Exists

1. Inventory current docs: `README.md`, `docs/`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, wiki links, JSDoc/docstrings density in the target files.
2. Detect the project's documentation convention:
   - A docs framework config (Docusaurus, VitePress, MkDocs, Nextra) → follow its structure and sidebar.
   - A `docs/` directory → plain markdown there, matching existing naming.
   - Neither → README sections for small surface, `docs/` for anything over ~2 pages.
   - Heavy inline-doc culture (JSDoc/docstrings everywhere) → API reference belongs inline, prose docs elsewhere.
3. Output the gap list: for each part of the target, what exists, what is stale (contradicts current code), what is missing.

## Phase 2: Interview the Code

The quality of the docs is proportional to how well you understand the code. Do not rush this.

1. **Entry points**: main/index files, exported surface, CLI commands, routes/endpoints. This defines what a reader can actually call.
2. **Public API**: for every exported symbol in scope — signature, parameter types, defaults, constraints, return shape. Pull from code, not memory.
3. **Data flow**: trace how data moves through the target (input → transform → storage/output). This becomes the explanation doc and any diagram (`/diagram` for architecture visuals).
4. **Tests**: read them — tests reveal intended behavior, edge cases, and real usage patterns that the implementation alone hides.
5. **Design comments**: grep for `NOTE:`, `WHY:`, `DESIGN:`, ADRs — the raw material for explanation docs.

Build a concept map before writing:

```
Target:           <name>
Purpose:          <one sentence — what problem it solves>
Key concepts:     <the 3–5 things a reader must understand>
Public surface:   <functions / commands / endpoints / options>
Dependencies:     <what it needs>       Dependents: <what relies on it>
Edge cases:       <from tests and error handling>
Design decisions: <non-obvious "why" choices>
```

## Phase 3: Diátaxis Partition

Four quadrants, four different readers. Not every entity needs all four:

| Entity type | Tutorial | How-to | Reference | Explanation |
|-------------|----------|--------|-----------|-------------|
| User-facing feature | ✅ | ✅ | ✅ | maybe |
| CLI command / flag | maybe | ✅ | ✅ | ❌ |
| Internal module / architecture | ❌ | ❌ | ✅ | ✅ |
| Config option | ❌ | ✅ | ✅ | ❌ |
| API endpoint | maybe | ✅ | ✅ | ❌ |
| Design pattern / philosophy | ❌ | ❌ | ❌ | ✅ |
| Multi-step workflow | ✅ | ✅ | ❌ | maybe |

Output the plan (entity × quadrant, new/update/skip). If it exceeds 5 documents, confirm scope with the user before writing.

## Phase 4: Write — Reference First

Write in this order: reference → explanation → how-to → tutorial. Reference establishes the vocabulary everything else uses.

### Reference (information-oriented: complete, factual)
Structure: one-paragraph intro → complete API/interface listing → options table (type, default, effect) → 2–3 working examples → related links.
- Every claim traceable to code. "Accepts a string" is insufficient — "string, max 256 chars, must match `^[a-z-]+$`" is reference-grade.
- Examples must run if copy-pasted.
- No "why" here — link to the explanation.

### Explanation (understanding-oriented: the why)
Structure: the problem (concrete failure modes without this design) → the approach (with a Mermaid diagram for architecture) → trade-offs → alternatives considered (from comments/ADRs/git history).
- Lead with the problem, not the solution.
- "We chose X over Y because Z" is the gold standard. Every design trades something — name it.

### How-to (task-oriented: accomplish a goal)
Structure: title starting with "How to" → prerequisites (specific: versions, tools, state) → numbered steps with exact commands → verification ("how do I know it worked") → troubleshooting (from error-handling code and tests).
- Every step actionable: "Run X", "Add Y to Z" — never "consider whether…".
- Troubleshooting is mandatory if the task can fail.

### Tutorial (learning-oriented: zero to working example)
Structure: what you'll build → prerequisites → steps, each producing a visible result → "What you built" recap with links onward.
- **Time to first result ≤ 3 steps.** If the reader hasn't seen something work by step 3, restructure.
- Exact commands the reader will type — no "run the appropriate command".
- If a step commonly fails, show the error and its fix inline.

## Phase 5: Placement & Cross-Linking

1. Place per the Phase 1 convention (README section / `docs/` / inline JSDoc / framework pages + sidebar entry).
2. Cross-link the quadrants: reference ↔ how-to both directions, tutorials link to both.
3. Discoverability: every new doc reachable within 2 clicks from README. Update the README doc index / framework sidebar.
4. Check for broken links: grep new files for `](` targets and verify each target exists.

## Phase 6: Quality Gates

Run all three before presenting. Fix failures, don't note them.

| Gate | Checks |
|------|--------|
| Accuracy | Every example compiles/runs as written; every signature matches the code; every command produces the described output; no references to renamed/removed symbols |
| Completeness | Reference covers 100% of the public surface in scope; how-tos cover the top 3 tasks; tutorial reaches a result in ≤3 steps; explanations name trade-offs |
| Voice | Written for a smart reader who hasn't seen the code; jargon glossed on first use; active voice, short sentences; "You can now…", not "The system provides…" |

## Output

```
## Documentation Generated

Scope: <target>

| File | Quadrant | New/Updated | Description |
|------|----------|-------------|-------------|
| docs/reference-widgets.md | Reference | new | Widget API: types, defaults, examples |
| ...  |          |             |             |

Coverage: <N>/<M> public surface items documented
Gates: accuracy ✅ · completeness ✅ · voice ✅
Entry points updated: README.md (doc index), <sidebar/config if any>
```

Do not commit unless the user asks; if asked, stage the new files by name (never `git add -A`) and scan the staged content for anything secret-shaped before committing.
