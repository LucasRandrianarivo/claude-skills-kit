---
description: Build, audit and fix the GitLab CI pipeline — stages, caching, rules, protected variables, environments
argument-hint: "[--audit] [--add <lint|test|build|deploy|release>] [--fix]"
---

# /cicd — Pipeline (GitLab CI)

## Usage
```
/cicd                      — audit .gitlab-ci.yml, report and fix the top issues
/cicd --audit              — audit only
/cicd --add test           — add a missing stage
/cicd --add deploy         — add a deploy job with an environment and a manual gate
```

## Overview
A pipeline must catch what review can't, stay fast enough that nobody bypasses it, and never leak a protected variable. This skill audits and fixes `.gitlab-ci.yml` using the project's real commands, and keeps merge-request pipelines cheap.

Field notes: `.claude/references/devops.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Read what exists

1. Read `.gitlab-ci.yml` and every `include:` (local, project, template, remote) — the effective pipeline is the merged document.
2. Note: stages, `rules`/`only`, images, runners/tags, cache and artifacts, `needs`, environments, protected/masked variables.
3. Read the project's own scripts; the pipeline must run the same commands developers run.
4. If `glab` is available, check recent pipelines for duration and flaky jobs.

## Phase 2: Audit

| Area | Findings to look for |
|---|---|
| **Coverage** | No MR pipeline; lint/typecheck/test/build not all present; migrations never exercised; e2e absent |
| **Rules** | Legacy `only/except` mixed with `rules`; duplicate pipelines (branch + MR) running the same jobs twice — use `workflow:rules` |
| **Variables** | Secrets as plain (unmasked, unprotected) CI/CD variables; secrets echoed in `script:`; `CI_JOB_TOKEN` used where a narrower token fits |
| **Caching** | No `cache:key:files:` tied to the lockfile; caching `node_modules` instead of the store; cache shared across incompatible jobs; `policy` not set (pull vs pull-push) |
| **Artifacts** | Build output not passed to later stages via artifacts; no `expire_in`, filling storage; failed e2e artifacts (screenshots, traces) not uploaded with `when: on_failure` |
| **Speed** | Strict stage ordering where `needs:` would create a DAG; no `interruptible: true` so superseded pipelines keep running; monorepo jobs without `rules:changes` |
| **Correctness** | `allow_failure: true` hiding real failures; installs without a frozen lockfile; runner image version drifting from production |
| **Deploys** | No `environment:` declared (so no deployment history, no rollback UI); production deploy without `when: manual` or a protected branch/environment; deploy jobs runnable from unprotected branches |
| **Runners** | Untagged jobs on shared runners with unexpected images; `docker:dind` privileged without need |

## Phase 3: The shape to converge on

```yaml
workflow:                     # one pipeline per change, never branch+MR duplicates
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

stages: [quality, test, build, deploy]

default:
  image: <the runtime version production uses>
  interruptible: true
  cache:
    key: { files: [<lockfile>] }
    paths: [<package manager store>]
    policy: pull

quality:  # lint + typecheck — fastest signal
test:     # unit/integration; junit + coverage reports for MR widgets
build:    # production build; artifacts for the deploy stage
deploy:   # environment: { name: production, url: ... }; when: manual on prod
```

Fix rules:
- Frozen-lockfile installs, project commands, production-matching image versions.
- `needs:` to unlock parallelism; `interruptible: true` everywhere safe.
- Report artifacts wired to GitLab's MR widgets (`artifacts:reports:junit`, `coverage_report`) so failures are visible without opening logs.
- `rules:changes` (or a changed-path job) for monorepos.
- Secrets: masked **and** protected variables, scoped to a protected environment; prefer OIDC/ID tokens (`id_tokens:`) for cloud auth over long-lived keys.
- Never `allow_failure: true` on a quality gate.

## Phase 4: Deploy jobs

- Declare `environment:` (name + url) for every deploy — it's what gives you deployment history and a rollback target.
- Production: protected environment, protected branch/tag, `when: manual`, and a documented rollback job (a manual job that redeploys the previous tag beats a wiki page).
- Log the deployed revision (`$CI_COMMIT_SHA`) so `/canary` can compare.

## Phase 5: Verify

1. Validate the merged YAML with GitLab's CI Lint (`glab ci lint`, or the project's `/ci/lint` endpoint).
2. Run one real pipeline on a branch and read it end to end.
3. Report the before/after duration and the job DAG.
4. Confirm the MR's required approvals/checks reference the jobs you actually created.

## Phase 6: Report

```
## CI/CD Audit — GitLab CI

Stages: <list>   Median MR pipeline: <before> → <after>
| # | Severity | Job | Issue | Fix |
|---|----------|-----|-------|-----|
| 1 | 🔴 | deploy:prod | unprotected variable DEPLOY_KEY, runnable from any branch | protect+mask, protected environment, when: manual |

Coverage: lint ✓ typecheck ✓ test ✓ build ✓ e2e ✗   Duplicate pipelines: fixed ✓
```

## Rules
- CI runs the same commands as local development.
- Never weaken a check to get green; `allow_failure` on a gate is a lie told daily.
- Protected + masked variables only, scoped to protected environments; prefer short-lived ID tokens.
- Every change verified by a real pipeline run before it's called done.
- Production deploys keep a human gate unless the user explicitly chose continuous deployment.
