---
description: Root-cause investigation for any anomaly — evidence before hypotheses, cheapest test first
argument-hint: "<anomaly description>"
---

# /investigate — Root-Cause Investigation

## Usage
```
/investigate <anomaly>   — investigate any anomaly: a bug, weird data, a flaky CI job,
                           a performance mystery, config that works on one machine only
```

## Scope

`/debug` is the stack-specific workflow for reproducible code bugs — it knows the framework's failure modes. `/investigate` is stack-agnostic and broader: use it when the anomaly is not obviously a code bug — inconsistent data, intermittent failures, "it was working yesterday", performance drift, environment-dependent behavior. If mid-investigation the root cause turns out to be a plain code bug with a clean reproduction, hand off to `/debug` for the fix.

## Iron Rules

- **No conclusion without evidence that would convince a skeptic.** "Probably X" is not a finding. Every conclusion must cite the observation that proves it and rule out the nearest alternative explanation.
- **No fixes without root cause.** Fixing symptoms creates whack-a-mole debugging — every symptom fix makes the next anomaly harder to find.
- **Evidence before hypotheses.** Do not propose a single hypothesis until Phases 1–2 are complete.

---

## Phase 0: Prior Learnings

Read `.claude/learnings.jsonl` if it exists. Search entries whose `tags`, `symptom`, `category`, or `file` match the current anomaly. On a match, announce it — "Prior learning applied: <symptom> → <root_cause> (<date>)" — and test that known cause first: it is the cheapest hypothesis available.

## Phase 1: Evidence Collection

Gather facts before forming ANY hypothesis:

1. **Exact symptoms, verbatim.** Error messages, stack traces, wrong values, timings. Copy them — paraphrasing destroys evidence.
2. **Reproduction.** Can you trigger it deterministically? Run the failing command / query / job yourself. If not reproducible, capture frequency: how often, under what conditions.
3. **The path.** Trace the code path, data pipeline, or CI pipeline from symptom back to inputs. Read the actual files — never reason from memory of how it "should" work.
4. **Environment.** Where does it fail vs where does it work? (local / CI / prod, OS, versions, env vars, DB state.) A works-here-fails-there split is itself strong evidence.
5. **Blast radius.** What else is affected? One user or all? One file or a class of files?

If the user hasn't provided enough to start, ask ONE precise question at a time, presenting numbered options where possible.

Output:
```
Anomaly:            <one sentence>
Observed:           <verbatim evidence, with sources>
Reproduced:         yes (<command>) / intermittent (<frequency>) / no
Works/fails split:  <where it works vs where it fails>
```

## Phase 2: Timeline Reconstruction

Anomalies have a birthday. Find it.

| Source | Command |
|--------|---------|
| Code changes | `git log --oneline --since=<last-known-good> -- <affected paths>` |
| All recent changes | `git log --oneline -30` |
| Dependency changes | `git log -p --follow -- <lockfile>` (package-lock.json, bun.lock, poetry.lock, Cargo.lock…) |
| CI history | `gh run list --limit 30` — find the first red run and its commit |
| Config/env changes | `git log -p -- .env.example "*.config.*" Dockerfile "docker-compose*"` |
| Data | Timestamps on the first bad records (`created_at`, import/job logs) |

Output a timeline:
```
<date>  last confirmed good   (evidence: ...)
<date>  <change A>            (commit / deploy / import / dependency bump)
<date>  first observed bad    (evidence: ...)
```

For a regression, the root cause is almost always inside the window between "last good" and "first bad". Narrow that window before hypothesizing.

## Phase 3: Pattern Match

Check the anomaly against known shapes:

| Pattern | Signature | Where to look |
|---------|-----------|---------------|
| Race condition | Intermittent, timing/load-dependent | Concurrent access to shared state, async ordering |
| Null propagation | Type error far from the real cause | Missing guards on optional values upstream |
| State corruption | Inconsistent data, partial updates | Transactions, hooks, non-atomic multi-step writes |
| Integration failure | Timeouts, unexpected responses | External API contracts, service boundaries |
| Config drift | Works locally, fails elsewhere | Env vars, feature flags, DB state, versions |
| Stale cache | Old data, fixed by cache clear | CDN, HTTP cache, memoization, build cache |
| Partial migration | Some records good, some bad | Migration scripts, backfill boundaries, dual writes |
| Encoding / timezone | Off-by-hours, mangled strings | UTC vs local, locale, charset at boundaries |
| Flaky test | Passes on retry | Test-order dependence, shared fixtures, real time/network |

**Recurring anomalies in the same area are an architectural smell, not a coincidence** — check learnings and `git log` for prior fixes to the same files.

## Phase 4: Bisection

When the timeline window or the input space is large, bisect instead of staring:

| Strategy | When | How |
|----------|------|-----|
| Git bisect | Regression with a testable check | `git bisect start; git bisect bad; git bisect good <sha>`, test each midpoint (`git bisect run <cmd>` if scriptable) |
| Config bisect | Works in env A, fails in env B | Diff the two configs; apply half the differences at a time until the culprit key is isolated |
| Data bisect | Fails on some inputs | Binary-split the failing dataset/file; re-run each half; recurse into the failing half down to one record |
| Dependency bisect | Broke after an update | Diff lockfiles; revert half the changed packages at a time |
| Repetition | Intermittent | Run 20+ times, record pass/fail with conditions (order, parallelism, machine); correlate |

Each bisection step is evidence. Log the halving decisions — they form the skeptic-proof chain.

## Phase 5: Ranked Hypotheses — Cheapest Test First

Now, and only now, form hypotheses. List every plausible one:

```
| # | Hypothesis | Prediction if true | Test | Cost |
|---|-----------|--------------------|------|------|
| 1 | ...       | we would observe X | <command / log / assertion> | seconds |
| 2 | ...       | ...                | ...  | minutes |
```

Rules:
- **Order by test cost, not by likelihood.** A 10-second test of an unlikely hypothesis beats a 30-minute test of a likely one.
- Every test must be able to FALSIFY its hypothesis — a test that passes either way is not a test.
- Test one at a time. Record the result before moving on.
- **3-strike rule:** if 3 hypotheses fail, STOP. Present numbered options to the user:
  1. Continue — state the new hypothesis and why the failures point to it
  2. Escalate — this needs someone who knows the system
  3. Instrument and wait — add logging/metrics to catch the next occurrence

Red flags — slow down if you catch yourself:
- Proposing a fix before tracing the flow — you're guessing.
- "Quick fix for now" — there is no "for now".
- Each fix reveals a new problem elsewhere — wrong layer, not wrong code.

## Phase 6: Conclusion & Verification

A conclusion must pass the **skeptic test**: state the evidence chain such that someone who distrusts you would be forced to agree.

```
## Investigation Report

**Anomaly**: <what was observed>
**Root cause**: <what is actually wrong and why>
**Evidence chain**:
1. <observation> (source)
2. <bisection/test result that ruled out alternatives>
3. <confirming test: predicted X, observed X>
**Ruled out**: <nearest alternative explanations and what eliminated them>
**Fix / action**: <minimal fix applied, or recommended action if not a code fix>
**Verification**: <re-ran the original failing scenario — result>
**Regression guard**: <test added / monitor added / N/A with reason>
```

If a code fix was applied: re-run the original reproduction and the test suite. Never say "this should fix it" — show that it fixed.

## Phase 7: Log the Finding

Append one line to `.claude/learnings.jsonl` (create `.claude/` if needed):

```json
{"timestamp":"<ISO 8601>","type":"bug-fix","category":"<area>","file":"<primary file>","symptom":"<what was observed>","root_cause":"<why>","fix":"<what resolved it>","tags":["<keywords>"],"prevention":"<how to avoid recurrence>"}
```

Use type `gotcha` / `config` / `performance` when the finding is not a code bug. This file is what Phase 0 reads next time — a skipped log entry is a future investigation restarted from zero. Review accumulated findings with `/learn`.
