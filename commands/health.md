---
description: Code quality dashboard — hotspots, coverage, deps, debt, dead files, lint; graded with trends
---

# /health — Code Quality Dashboard

## Usage
```
/health    — measure the codebase, grade each area, compare against the last run,
             report the top 5 remediations
```

**Iron rule: measure, don't fix.** This command produces a dashboard and recommendations only. The user decides what to act on (then `/fix-review`, `/review`, or targeted work).

---

## Phase 1: Detect the Toolchain

If CLAUDE.md contains a `## Health Stack` section, use those exact commands — do not second-guess them. Otherwise auto-detect:

| Area | Detection |
|------|-----------|
| Lint | `eslint.config.*` / `.eslintrc*` → `npx eslint .`; `biome.json` → `npx biome check .`; `pyproject.toml` with ruff → `ruff check .`; `Cargo.toml` → `cargo clippy` |
| Tests + coverage | `package.json` scripts `test`/`coverage`; `pytest --cov`; `cargo tarpaulin`; `go test -cover ./...` |
| Dead code | knip in devDependencies → `npx knip`; `vulture` for Python; else heuristic (Phase 2.5) |
| Dependencies | lockfile type → `npm outdated` + `npm audit` (or pnpm/yarn/bun/pip/cargo/go equivalents) |

**Wrap, don't replace**: run the project's own tools and report what they say. Never substitute your own reading of the code for a tool's output. If a tool is missing, mark the area `SKIPPED (reason)` — **skipped is not failed** and must not drag the grade down.

## Phase 2: Collect Metrics

Run each area independently. Capture exit code, counts, and the last ~30 lines of output for anything that fails.

### 2.1 Size × churn hotspots
```bash
git log --since="6 months ago" --format= --name-only | grep -v '^$' | sort | uniq -c | sort -rn | head -30
```
For each of the top 30 churned files that still exist, get `wc -l`. Hotspot score = commits × KLOC. Report the top 10: files that are both large AND frequently changed are where bugs live and refactors pay off. Exclude lockfiles, generated files, and vendored code.

### 2.2 Test coverage (if obtainable)
Run the project's coverage command. If no coverage tooling is configured, or the run would take more than ~2 minutes, mark `SKIPPED` and note how to enable it. Record: overall %, and the 5 least-covered source files.

### 2.3 Dependency freshness & audit
Record: number of packages ≥1 major version behind, and vulnerabilities by severity (`npm audit --json` or equivalent). A critical vulnerability is an automatic F for this area.

### 2.4 TODO/FIXME debt
```bash
grep -rn -E "TODO|FIXME|HACK|XXX" --include="*.{ts,tsx,js,jsx,py,rs,go,rb,java,php}" src/ app/ lib/ 2>/dev/null | wc -l
```
Adjust paths/extensions to the repo. Sample the 5 oldest via `git blame` — a 2-year-old FIXME is either dead or a real risk; name which.

### 2.5 Dead file candidates
Prefer the project's tool (knip, vulture). Heuristic fallback: source files whose basename is imported nowhere (`grep -r "basename" --include="*.<ext>" -l`). Report heuristic results as **candidates, never certainties** — dynamic imports, entry points, and config conventions produce false positives.

### 2.6 Lint status
Run the detected linter. Record error count and warning count separately.

## Phase 3: Grade Each Area

| Area | A | B | C | D | F |
|------|---|---|---|---|---|
| Hotspots | No top-10 hotspot > 400 lines | 1–2 files > 400 lines | 3–4 | 5+ or any > 1000 lines | Top hotspot > 1500 lines and still churning |
| Coverage | ≥ 80% | ≥ 65% | ≥ 50% | ≥ 30% | < 30% |
| Dependencies | 0 vulns, < 5 majors behind | 0 high/critical vulns | Moderate vulns or 10+ majors behind | High vulns | Any critical vuln |
| TODO debt | < 10 | < 25 | < 50 | < 100 | ≥ 100 |
| Dead files | 0 candidates | 1–3 | 4–10 | 11–25 | > 25 |
| Lint | 0 errors, 0 warnings | 0 errors, < 10 warnings | 0 errors, ≥ 10 warnings | < 10 errors | ≥ 10 errors |

Overall grade = mean of graded areas (A=4 … F=0), rounded to letter ± sign. Skipped areas are excluded from the mean entirely. **Be honest**: all tests passing with 100 lint errors is not a healthy codebase — never round up to tell a nicer story.

## Phase 4: Trend vs Last Run

Read the most recent report in `.claude/reports/health/` (sorted by filename date). Each report embeds a machine-readable score block (below) — parse it and compute per-area deltas.

- First run: state "First health check — no trend data yet. Run /health again after changes to track progress."
- Any area that dropped: name the specific new errors/warnings/files that caused the drop, from the tool output — not just the delta.

## Phase 5: Top 5 Remediations

Rank by `(4 − area grade points) × leverage` — the worst-graded areas with the cheapest concrete fix first. Each remediation must name a command or a file, not a wish:

```
1. [HIGH]  Fix 3 lint errors (Lint: D)          → npx eslint . --fix, then review src/api.ts:55
2. [HIGH]  Upgrade lodash (critical CVE)         → npm audit fix / bump in package.json
3. [MED]   Split src/orders/service.ts (1240 ln, 41 commits/6mo — top hotspot)
4. [MED]   Delete 4 dead-file candidates          → verify then rm (list)
5. [LOW]   Burn down 12 TODOs in src/legacy/      → oldest is 14 months (blame: <sha>)
```

## Output

Print the dashboard, then write the full report to `.claude/reports/health/<YYYY-MM-DD>-health.md` (create directories if needed).

````
# Code Health — <project> @ <branch> — <date>

| Area          | Grade | Trend | Detail                          |
|---------------|-------|-------|---------------------------------|
| Hotspots      | B     | =     | top: src/orders/service.ts (1240 ln, 41 commits) |
| Coverage      | C     | ↓ −4% | 58% overall, worst: src/sync/   |
| Dependencies  | A     | ↑     | 0 vulns, 3 majors behind        |
| TODO debt     | B     | =     | 18 markers, oldest 14 months    |
| Dead files    | B     | new   | 2 candidates                    |
| Lint          | D     | ↓     | 3 errors, 27 warnings           |

**Overall: C+**  (previous run: B−, <date>)

## Regressions
<what got worse and exactly why, with tool output excerpts>

## Top 5 remediations
<ranked list from Phase 5>

## Scores
```json
{"date":"<ISO>","branch":"<branch>","overall":2.3,"hotspots":3,"coverage":2,"dependencies":4,"debt":3,"dead":3,"lint":1,"skipped":[]}
```
````

The final ```json block is what the next run's Phase 4 parses — always include it, with `null` for skipped areas.
