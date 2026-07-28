---
description: Build pipeline for any stack — discover checks, run in order, fix at first failure
---

# /build — Build Pipeline (Generic)

## Usage
```
/build
```

## Overview
Stack-agnostic quality gate. Discovers the project's checks, runs them in order, stops at the first failure, fixes, and re-runs from that step.

---

## Phase 1: Discover the pipeline

Assemble the pipeline from what exists, in this order:

| Step | Discovery |
|------|-----------|
| 1. Typecheck | `tsconfig.json` → `npx tsc --noEmit`; `mypy.ini`/`pyproject [tool.mypy]` → `mypy` |
| 2. Lint | `eslint` config → `npx eslint .`; `ruff`/`flake8`, `golangci-lint`, `clippy` |
| 3. Format check | `prettier` → `npx prettier --check .`; `black --check`, `gofmt -l` |
| 4. Tests | the `/test` discovery rules (package.json scripts, Makefile, language convention) |
| 5. Build | `package.json` `build` script; `make build`; `go build ./...`; `cargo build`; `docker build` if Dockerfile is the artifact |

Also check CI config (`.github/workflows/*.yml`) — the local pipeline should mirror what CI enforces, so a green local run means a green CI run.

## Phase 2: Execute

Run each step in order. **A step must pass before moving to the next.**

**On failure:**
1. Read every error: file, line, message
2. Fix the source properly (never `@ts-ignore`, `eslint-disable`, `--no-verify`, or skipping tests)
3. Re-run the failed step until clean, then continue

## Phase 3: Report

```
## Build Report
| Step | Status | Notes |
|------|--------|-------|
| Typecheck | PASS/FAIL/— | <errors fixed> |
| Lint | PASS/FAIL/— | |
| Format | PASS/FAIL/— | |
| Tests | PASS/FAIL/— | <pass/fail counts> |
| Build | PASS/FAIL/— | <artifact + size> |

Verdict: GREEN — safe to commit / RED — <what remains>
```

**Iron rule: never report GREEN if any discovered step was skipped — mark it `—` and say why.**
