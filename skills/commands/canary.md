---
description: Post-deploy canary — poll health endpoints, compare against baseline, report PASS/DEGRADED/FAIL
argument-hint: "[url] [--duration 10m] [--baseline] [--quick] [--pages /,/dashboard]"
---

# /canary — Post-Deploy Canary Monitor

## Usage
```
/canary <url>                      — monitor for 10 minutes after a deploy
/canary <url> --duration 5m       — custom duration (1m–30m)
/canary <url> --baseline          — capture a baseline BEFORE deploying
/canary <url> --quick             — single-pass health check, no monitoring loop
/canary <url> --pages /,/login    — monitor specific pages instead of auto-discovery
/canary                            — resolve the URL from .claude/deploy.json
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **URL**: the deployment to watch. If absent, read `production_url` from `.claude/deploy.json`; if that's absent too, ask.
- **`--duration Nm`**: monitoring window, default 10 minutes, clamp to 1–30
- **`--baseline`**: capture-and-stop mode (Phase 2)
- **`--quick`**: one check cycle, then verdict
- **`--pages a,b,c`**: explicit page paths; otherwise auto-discover

You are the safety net between "shipped" and "verified". Deploys pass CI and still break in production — a missing env var, stale CDN assets, a migration that's slow on real data. Catch it in the first 10 minutes, not 10 hours.

**Iron rule: read-only.** Observe and report. Don't modify code or infrastructure unless the user explicitly pivots to fixing.
**Iron rule: every alert carries evidence.** A number, a curl output excerpt, a log line, or a screenshot path — no vibes-based alerts.

---

## Phase 1: Setup and target discovery

```bash
mkdir -p .claude/reports/canary
```

Assemble the probe list:
1. **Health endpoint** from `.claude/deploy.json` (`health_endpoint`), or detect from the code (grep the router for `/health`, `/healthz`, `/api/health`, `/status`). Health endpoints are probe #1 — they're built to answer this exact question.
2. **Pages**: from `--pages`, else auto-discover — fetch the homepage with `curl -sL`, extract the top 5 internal links from the HTML, always include `/`. Show the list; proceed unless the user objects.
3. **Logs, if accessible** (best-effort, never required): detect one of `vercel logs`, `netlify logs`, `gh run view` on the deploy run, `docker logs`/`kubectl logs`, or an ssh log path documented in CLAUDE.md. If none work, note "logs not accessible — HTTP signals only".

## Phase 2: Baseline (--baseline mode, run BEFORE deploying)

For each probe target, collect with curl:

```bash
curl -s -o /dev/null -w '%{http_code} %{time_total} %{size_download}' -L --max-time 15 <url><path>
```

Repeat 3 times per target and keep the median. Also fetch the body once and record a content marker (the `<title>`, or the first JSON keys for API endpoints). Write `.claude/reports/canary/baseline.json`:

```json
{
  "url": "https://app.example.com",
  "captured_at": "2026-01-15T10:00:00Z",
  "git_sha": "<HEAD at capture time>",
  "targets": {
    "/health": {"status": 200, "median_ms": 120, "marker": "{\"status\":\"ok\"}"},
    "/":       {"status": 200, "median_ms": 450, "marker": "<title>App</title>"}
  }
}
```

Then STOP: "Baseline captured. Deploy, then run `/canary <url>`."

**No baseline exists when monitoring starts?** Take a single pre-loop snapshot now and use it as the reference. Say so in the report — a same-deploy reference detects degradation *during* the window but not regressions *from* the deploy. Encourage `--baseline` before the next deploy.

## Phase 3: Monitoring loop

Every 60 seconds until the duration elapses (`--quick`: one iteration), for each target:

1. `curl -s -o /dev/null -w '%{http_code} %{time_total}' -L --max-time 15 <target>` — status + response time
2. Every 3rd check, fetch the body and verify the content marker still appears (catches error pages served with 200)
3. If logs are accessible: pull the last minute of logs and scan for `error`, `panic`, `exception`, `fatal`, 5xx access-log lines, and stack traces
4. If frontend pages are in scope and the project has e2e tooling (Playwright or Cypress), optionally load the page once mid-window to capture console errors; otherwise `npx playwright` works for a screenshot/console check. Skip silently if neither is practical — curl signals are the core loop.

Classify anything that differs from baseline:

| Alert | Trigger |
|-------|---------|
| CRITICAL | Target unreachable, 5xx, or content marker gone (error page) |
| HIGH | New error pattern in logs; status changed class (200 → 4xx); console errors not in baseline |
| MEDIUM | Response time > 2× baseline median |
| LOW | New 404s on discovered links; response time 1.5–2× baseline |

**Alert on changes, not absolutes.** A page that always took 900ms is not slow today. Three console errors in the baseline are fine if there are still three — ONE new error is the alert.
**Don't cry wolf.** Confirm CRITICAL/HIGH on the next check (or an immediate re-probe) before alerting — a single transient blip is noise. Two consecutive observations make a signal.

On a confirmed CRITICAL/HIGH, interrupt immediately with the alert block and ask — numbered options: 1) investigate now (stop the loop), 2) keep monitoring (might be transient), 3) roll back, 4) dismiss as false positive:

```
CANARY ALERT
════════════
Time:     check #N at <T>s
Target:   <url+path>
Type:     CRITICAL | HIGH | MEDIUM
Finding:  <what changed — specific>
Baseline: <value>   Current: <value>
Evidence: <curl output / log lines / screenshot path>
```

## Phase 4: Verdict and report

| Verdict | Standard |
|---------|----------|
| PASS | All targets healthy for the full window; no confirmed alerts; response times within 1.5× baseline |
| DEGRADED | Site up but measurably worse: MEDIUM/LOW alerts confirmed, or intermittent HIGH that self-recovered |
| FAIL | Any confirmed CRITICAL, or HIGH persisting to the end of the window |

Write `.claude/reports/canary/<date>-canary.md` and print:

```
CANARY REPORT — <url>
═════════════════════
Window:    <N> min · <M> checks · baseline from <captured_at | pre-loop snapshot>
Deploy:    <git SHA / version if known>

Target          Status     Resp (baseline)     Notes
/health         PASS       118ms (120ms)       —
/               PASS       470ms (450ms)       —
/dashboard      DEGRADED   1210ms (400ms)      3.0× baseline, persisted 4 checks

Alerts: <N> (<X> critical, <Y> high, <Z> medium) · Logs: <clean | N error lines | not accessible>

VERDICT: PASS | DEGRADED | FAIL
Evidence: <one line per finding backing the verdict>
```

**On FAIL, recommend rollback and spell out the steps** for this repo's deploy mechanism (from `.claude/deploy.json`):
- Merged PR deploy: `git revert <merge-sha> --no-edit && git push` (or a revert PR if the base branch is protected) — the pipeline redeploys the previous state
- vercel/netlify: promote the previous deployment (`vercel rollback` / platform dashboard "publish previous deploy")
- docker: re-tag and roll out the previous image tag
- script/ssh: re-run the deploy script from the previous release tag or SHA

Name the exact SHA/tag/deployment to roll back TO, not just the command shape. Offer to execute; don't execute unprompted.

**On PASS**, offer to refresh the baseline with this run's numbers (the new normal). On DEGRADED or FAIL, keep the old baseline.
