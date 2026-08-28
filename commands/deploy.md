---
description: Run /ship, then deploy via the project's detected deploy mechanism, then verify with /canary
argument-hint: "[--no-ship] [url]"
---

# /deploy — Ship, Deploy, Verify

## Usage
```
/deploy               — run /ship, deploy, then hand off to /canary
/deploy --no-ship     — deploy the current pushed state without re-running /ship
/deploy <url>         — same, and use <url> as the production URL for verification
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **`--no-ship`**: skip Phase 1; require a clean tree and a pushed branch, else stop
- **A URL**: record as the production URL for Phase 5 and save it into `.claude/deploy.json`

## Overview

Deploys are irreversible in a way commits are not: users see the result immediately. So this workflow is automated but honest — it verifies before, deploys deliberately, and verifies after.

| Stop for | Never stop for |
|----------|----------------|
| First run in a repo (confirm the detected deploy mechanism) | Choosing between equivalent commands (auto-detect) |
| Deploy config changed since last confirmed run | Progress waits (poll and narrate) |
| /ship stopped (its gates are this workflow's gates too) | |
| The deploy command/workflow fails (offer rollback) | |

**Iron rule: never deploy a branch that hasn't passed /ship's test gate.** `--no-ship` skips re-running the pipeline, not the requirement — if the last gate result for this HEAD is unknown, run the gate.
**Iron rule: never force-push, never bypass CI to deploy faster.**

---

## Phase 1: Ship

Unless `--no-ship`: run the full `/ship` workflow (`skills/commands/ship.md`). If `/ship` stops for any reason, this workflow stops with it — fix, then re-run `/deploy`.

If `--no-ship`: verify `git status` is clean and `HEAD` matches `origin/<branch>`. If not, tell the user to `/ship` first and stop.

## Phase 2: Load or detect the deploy mechanism

Read `.claude/deploy.json`. If it exists and its `fingerprint` still matches (see Phase 3), skip to Phase 4.

Otherwise detect, collecting ALL matches (a repo can have several signals — the user picks):

| Mechanism | Detection signals | Deploy action |
|-----------|-------------------|---------------|
| `vercel` | `vercel.json`, `.vercel/` | `vercel deploy --prod` |
| `netlify` | `netlify.toml` | `netlify deploy --prod` |
| `github-actions` | Workflow in `.github/workflows/` whose name/content matches deploy/release/cd — note whether it triggers on push to base or on `workflow_dispatch` | Merge/push to base, or `gh workflow run <file>` |
| `docker-registry` | `Dockerfile` + a registry reference (compose file, workflow, or README) | `docker build` + `docker push <registry>/<image>:<tag>`, then the project's rollout step if one is documented |
| `script` | `package.json` script named `deploy`/`release`, or a `deploy*.sh` / Makefile `deploy` target (rsync/ssh setups live here) | Run that script |

Also collect the **production URL** (from a passed argument, CLAUDE.md, README, or platform config) and a **health endpoint** if the codebase defines one (`/health`, `/healthz`, `/api/health`, `/status` — grep the router/server code, don't guess).

## Phase 3: Confirm on first run, then remember

**First run (or config changed):** present what was detected and what will happen, then ask — numbered options:

```
DEPLOY PLAN — first run for this repo
═════════════════════════════════════
Mechanism:   <name> (detected from <file>)
Command:     <exact command / workflow file>
Prod URL:    <url | not found — verification will be limited>
Health:      <endpoint | none detected>
Sequence:    1. /ship (done)  2. <deploy action>  3. wait + watch  4. /canary

1) Correct — deploy and remember this choice
2) Use a different mechanism: <list the other detected candidates>
3) Let me describe my deploy setup (free text)
4) Abort
```

On confirmation, write `.claude/deploy.json`:

```json
{
  "mechanism": "github-actions",
  "command": "gh workflow run deploy.yml",
  "workflow": ".github/workflows/deploy.yml",
  "production_url": "https://app.example.com",
  "health_endpoint": "/health",
  "confirmed_at": "2026-01-15T10:00:00Z",
  "fingerprint": "<sha256 of the deploy-relevant config files>"
}
```

Compute `fingerprint` by hashing the files the mechanism depends on (the workflow file, `vercel.json`, the deploy script, the Dockerfile — whichever apply, concatenated). On every later run, recompute and compare: **match** → deploy silently with the saved config; **mismatch** → say "your deploy configuration changed since I last confirmed it", re-detect, and re-confirm. Never silently deploy through a changed pipeline.

## Phase 4: Deploy

Announce what's happening before each step — the user should never stare at silence.

- **CLI platforms (vercel/netlify)**: run the saved command, stream output, capture the deployment URL it prints.
- **github-actions**:
  - Push-triggered: if the PR from `/ship` must merge first, ask before merging (`gh pr merge --squash --delete-branch` — merging is the one irreversible step this workflow adds). After merge or push, find the run: `gh run list --branch <base> --limit 5 --json databaseId,headSha,status` matched on the deployed SHA.
  - Dispatch-triggered: `gh workflow run <file>` then find the new run the same way.
  - Poll `gh run view <id> --json status,conclusion` every 30 seconds, progress note every 2 minutes, 20-minute timeout.
- **docker-registry**: build with a tag derived from the version or SHA, push, then run the documented rollout step. Never `latest`-only if a version tag is available.
- **script**: run it, stream output, respect its exit code.

**On failure**: show the actual error (workflow log excerpt via `gh run view <id> --log-failed`, or the command's stderr). Then ask — numbered options: 1) investigate the logs together, 2) roll back (see `/canary`'s rollback playbook), 3) retry once if the failure looks transient (network, rate limit). Never retry a merge; never retry a deploy more than once without a diagnosis.

**On timeout**: report how long it's been, where to look (Actions tab, platform dashboard), and ask whether to keep waiting or stop.

## Phase 5: Hand off to /canary

Once the deploy reports success:

1. Give the platform a propagation window: 60 seconds for CDN-style platforms (vercel/netlify), none for direct mechanisms that block until live.
2. Run `/canary <production_url>` (`skills/commands/canary.md`) with the URL and health endpoint from `.claude/deploy.json`. Canary owns the verification loop, the verdict, and the rollback recommendation.
3. If no production URL is known (library, CLI tool, internal service without HTTP surface): skip canary with "Nothing to probe — deploy is done; verify through your own channels", and say exactly what was deployed (mechanism + version/SHA).

## Output

```
DEPLOY REPORT
═════════════
Shipped:    <version or SHA> (<branch> → <base>)  [via /ship | --no-ship]
Mechanism:  <mechanism> (<command>)
Deploy:     SUCCESS in <duration> | FAILED (<reason>) | ROLLED BACK
Canary:     <handed off to /canary | skipped: <reason>>
Config:     .claude/deploy.json <created | reused | re-confirmed (config changed)>
```

On success, close with the canary verdict once it reports. On failure, close with what was attempted, the error evidence, and the chosen recovery path.
