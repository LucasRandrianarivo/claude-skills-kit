---
description: Build, audit and fix the CI/CD pipeline for any provider — coverage, speed, secrets, deploy gates
argument-hint: "[--audit] [--add <lint|test|build|deploy>] [--fix]"
---

# /cicd — Pipeline (Generic)

## Usage
```
/cicd                      — detect the CI provider, audit the pipeline, fix the top issues
/cicd --audit              — audit only
/cicd --add test           — add a missing stage
```

## Overview
Provider-agnostic. A pipeline must catch what review can't, be fast enough that nobody bypasses it, and never become a path into your infrastructure. This skill finds your provider, audits against those three goals, and fixes what it can with the project's own commands.

Field notes: `.claude/references/devops.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Detect the provider and the current state

Look for: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/config.yml`, `bitbucket-pipelines.yml`, `azure-pipelines.yml`, `.drone.yml`, `buildkite/`, `.woodpecker.yml`, or a platform config (Vercel, Netlify, Cloudflare, Render, Fly, Railway) that builds on push.

If there is **no CI**, say so plainly and propose the smallest useful pipeline for the detected provider (or for the repo host), then build it.

Read the project's real commands from `package.json` scripts / Makefile / `pyproject.toml` / `go.mod` / `composer.json`. The pipeline runs what developers run.

## Phase 2: Audit against four questions

**1. Does it catch anything?**
- lint · typecheck · unit tests · build · (e2e where it exists) · migrations applied at least once
- Are these *required* to merge, or advisory checks nobody reads?

**2. Is it fast enough to respect?**
- Dependency caching keyed on the lockfile
- Parallel jobs instead of one long sequential script
- Superseded runs cancelled
- Monorepo: only affected packages built
- If the median run exceeds ~10 minutes, that's a finding — people start merging on red.

**3. Is it safe?**
- Least-privilege tokens; no long-lived cloud keys where the provider supports OIDC/short-lived credentials
- Secrets never echoed, never passed to untrusted code, never available to fork/external contributions
- Third-party build plugins/actions pinned to an immutable reference
- Dependency and secret scanning present (`npm audit`, `pip-audit`, `govulncheck`, a secret scanner)

**4. Is it honest?**
- No step allowed to fail silently
- Installs use the lockfile (`ci`/`--frozen-lockfile`/`--immutable`)
- CI's runtime versions match production's
- Flaky tests are fixed or quarantined **explicitly**, never re-run until green by default

## Phase 3: Deploys

- One clear path from a green build to an environment; staging automatic, production behind an explicit gate (approval, protected branch/tag, or manual trigger) unless the user chose continuous deployment.
- The deployed revision is logged, so `/canary` can compare and rollback has a target.
- The rollback command is written down next to the deploy definition.

## Phase 4: Fix & verify

Apply fixes smallest-blast-radius first: caching → parallelization → missing coverage → permissions/secrets → deploy gates.

Verify with a **real run**: push a branch, watch the pipeline, compare duration before/after, and confirm the required checks match the job names.

## Phase 5: Report

```
## CI/CD Audit — <provider>

Config: <file(s)>   Median run: <before> → <after>
Coverage: lint <✓/✗> typecheck <✓/✗> test <✓/✗> build <✓/✗> e2e <✓/✗> scan <✓/✗>

| # | Severity | Where | Issue | Fix |
|---|----------|-------|-------|-----|

Deploy: <staging auto | prod gated by X>   Rollback: <documented command>
```

🔴 security hole or a gate that doesn't block · 🟡 slow, flaky, or missing coverage · 🔵 ergonomics.

## Rules
- CI runs the same commands as local development; fix divergence rather than duplicating logic.
- Never weaken or skip a check to get green.
- Never store long-lived cloud credentials where the provider offers short-lived identity.
- Verify every pipeline change with an actual run.
- Production deploys keep a human gate unless the user explicitly says otherwise.
