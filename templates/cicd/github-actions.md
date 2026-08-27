---
description: Build, audit and fix the GitHub Actions pipeline — caching, matrix, permissions, secrets, deploy gates
argument-hint: "[--audit] [--add <lint|test|build|deploy|release>] [--fix]"
---

# /cicd — Pipeline (GitHub Actions)

## Usage
```
/cicd                      — audit the existing workflows, report and fix the top issues
/cicd --audit              — audit only
/cicd --add test           — add a missing stage
/cicd --add deploy         — add a deploy job with an environment gate
```

## Overview
A pipeline has three jobs: catch what a reviewer can't, be fast enough that nobody skips it, and never become an attack path into your repo. Most workflows fail at least two. This skill audits and fixes yours, using the project's real commands — never a template pasted from a blog.

Field notes: `.claude/references/devops.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Read what exists

1. List `.github/workflows/*.yml`. For each: triggers, jobs, runners, permissions, secrets used, concurrency, caching.
2. Read the project's actual scripts (`package.json` scripts, Makefile, `pyproject.toml`, `go.mod`) — the pipeline must run **the same commands a developer runs**, not a parallel reality.
3. Check recent runs if `gh` is available (`gh run list --limit 20`): duration trend, flakiness, which job fails most.

## Phase 2: Audit

| Area | Findings to look for |
|---|---|
| **Coverage** | No CI at all on PRs; lint/typecheck/test/build not all represented; e2e never run; migrations never applied in CI |
| **Trigger safety** | `pull_request_target` with a checkout of the PR head (**critical** — runs untrusted code with secrets); workflows triggered on `issue_comment` without an author check |
| **Permissions** | No top-level `permissions:` block (defaults are too broad); `contents: write` where read suffices; `GITHUB_TOKEN` handed to third-party actions unnecessarily |
| **Action pinning** | Third-party actions referenced by tag or branch instead of a commit SHA; unmaintained actions |
| **Secrets** | Secrets exposed to fork PRs; secrets echoed or passed as command args visible in logs; a single all-powerful deploy secret instead of OIDC |
| **Caching** | No dependency cache; a cache key that never invalidates (missing lockfile hash); caching `node_modules` instead of the package manager's store |
| **Speed** | Everything in one sequential job; no `concurrency` group so superseded runs keep burning minutes; full matrix on every PR; no path filters for a monorepo |
| **Correctness** | `continue-on-error` hiding failures; tests run without `--ci`/deterministic flags; no `--frozen-lockfile`/`npm ci`; version drift between CI's runtime and production's |
| **Deploys** | Deploy triggered without an environment protection rule; no rollback path; the same workflow deploying to prod on any branch |
| **Feedback** | Failures without logs a reviewer can act on; no artifact upload for failed e2e (screenshots, traces) |

## Phase 3: The shape to converge on

```yaml
name: CI
on:
  pull_request:
  push: { branches: [main] }

permissions:
  contents: read           # least privilege at the top; widen per-job only where needed

concurrency:               # supersede stale runs on the same ref
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:                 # lint + typecheck: fastest signal, runs first
  test:                    # unit/integration, with the dependency cache
  build:                   # production build; upload the artifact if a later job needs it
  e2e:                     # only where it exists; upload traces/screenshots on failure
```

Rules for the fixes you apply:
- Use the project's package manager and lockfile install (`npm ci`, `pnpm i --frozen-lockfile`, `yarn --immutable`, `uv sync --frozen`, `go mod download`).
- Cache the package manager's store with a key containing the lockfile hash; add a restore-key prefix.
- Pin third-party actions to a full commit SHA with the version in a comment; official `actions/*` may use a major tag if the repo already does.
- One `permissions:` block at the top (`contents: read`), widened per job (`id-token: write` for OIDC, `pull-requests: write` for a commenting job).
- Prefer **OIDC** over long-lived cloud credentials for deploys; if the repo must use secrets, scope them to a protected environment.
- Matrix only where it earns its cost (multiple supported runtimes/OS); PRs can run the primary combination and full matrix on `main`.
- In monorepos, add `paths:`/`paths-ignore:` filters or a changed-package detection step.
- Never `continue-on-error` on a quality gate. If a step is advisory, say so in its name and keep it out of the required checks.

## Phase 4: Deploy jobs

- Gate production behind a GitHub **Environment** with required reviewers; staging can auto-deploy from `main`.
- Deploy only from a tag or `main`, never from an arbitrary branch.
- Make the deploy step idempotent and log the deployed revision (SHA) so `/canary` and rollback have something to reference.
- State the rollback command in the workflow's own comments — the moment you need it, nobody reads the docs.

## Phase 5: Verify

1. `actionlint` if available (or the GitHub-provided schema validation) — syntax errors here cost a full push cycle.
2. Push to a branch and watch one real run (`gh run watch`), or trigger via `workflow_dispatch`.
3. Compare timing before/after; report the delta.
4. Confirm required checks in branch protection match the job names you created (a renamed job silently un-protects the branch).

## Phase 6: Report

```
## CI/CD Audit — GitHub Actions

Workflows: <n>   Median PR duration: <before> → <after>
| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| 1 | 🔴 | ci.yml:12 | pull_request_target + checkout of PR head, secrets available | switch to pull_request, or checkout the base and never run PR code |

Coverage: lint ✓ typecheck ✓ test ✓ build ✓ e2e ✗  Deploy gate: environment ✓
```

🔴 = a security hole or a gate that doesn't actually block. 🟡 = slow/flaky/incomplete coverage. 🔵 = ergonomics.

## Rules
- CI runs the same commands as local development; if they diverge, fix the divergence, don't duplicate the logic.
- Never weaken a check to make the pipeline green — a skipped test in CI is a lie told daily.
- Never expose secrets to workflows triggered by fork PRs.
- Every change is verified by an actual run before you call it done.
- Deploy credentials are scoped to an environment; production deploys require a human gate unless the user explicitly chose continuous deployment.
