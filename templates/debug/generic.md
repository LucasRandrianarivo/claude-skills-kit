---
description: Structured 4-phase debugging for any stack — no fix without root cause
argument-hint: "<bug description>"
---

# /debug — Structured Debugging (Generic)

## Usage
```
/debug <bug description, error message, or reproduction steps>
```

## Overview
Stack-agnostic structured debugging. Every bug goes through 4 mandatory phases.

**Iron rule: no fix without root cause identified.**

Before starting, read `.claude/learnings.jsonl` — if a similar bug was solved before, start from that learning.

---

## Phase 0: Discover the stack

Since this project's stack was not auto-detected, discover it first:

1. Identify the language and runtime: look for `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `composer.json`, `Makefile`, `Dockerfile`
2. Identify how the project runs: scripts in `package.json`, `Makefile` targets, `docker-compose.yml`, README instructions
3. Identify where logs/errors surface: stdout, log files, browser console, CI output

## Phase 1: Reproduce

1. Get the exact error — full message, stack trace, and the input/action that triggers it
2. Reproduce it locally: run the failing command/flow yourself
3. If not reproducible: gather more context (environment, data, timing) before proceeding — **never fix a bug you cannot see**

Output:
```
## Reproduction
Command/action: <what triggers it>
Error: <exact message>
Frequency: always / intermittent (<conditions>)
```

## Phase 2: Analyze

1. Read the stack trace bottom-up: find the deepest frame in project code (not dependencies)
2. Trace the data flow: where does the failing value come from? Walk backwards from the error site to the entry point
3. Establish the scope: one code path or several? One environment or all? Since when (use `git log` on the involved files)?

## Phase 3: Hypothesize

Formulate 2–3 hypotheses ranked by probability. For each:

| # | Hypothesis | Probability | Cheapest test |
|---|-----------|-------------|---------------|
| 1 | ... | high | ... |
| 2 | ... | medium | ... |

Test the cheapest-to-verify hypothesis first (a log line, a targeted test, `git bisect` if a regression). Iterate until one hypothesis is **confirmed by evidence**.

## Phase 4: Fix

Only after root cause is confirmed:

1. Fix the root cause, not the symptom (no defensive `try/catch` burying, no `|| default` masking)
2. Add or update a test that fails without the fix and passes with it
3. Run the surrounding test suite to check for regressions
4. Re-run the original reproduction to confirm the bug is gone

## Phase 5: Learn

Append one line to `.claude/learnings.jsonl`:
```json
{"date":"<ISO date>","type":"bug","symptom":"<short>","root_cause":"<short>","fix":"<short>","files":["..."]}
```
