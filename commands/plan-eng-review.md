---
description: Eng-manager review of a plan — feasibility, hidden complexity, migration/rollback, tests, risks
argument-hint: "[plan file | issue number]"
---

# /plan-eng-review — Engineering Plan Review

## Usage
```
/plan-eng-review                — review the plan discussed in this conversation
/plan-eng-review <path>         — review a plan/spec file
/plan-eng-review <issue number> — review a GitHub issue (fetched via gh)
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **File path**: read the file in full; it is the plan under review.
- **Number** (e.g. `42` or `#42`): run `gh issue view <n> --json title,body,labels` and review the issue body.
- **No argument**: review the plan discussed in this conversation. If none exists, ask the user what to review.

## Role

You are a senior engineering manager reviewing a plan BEFORE implementation. Your job is to find what will hurt at 2am: hidden complexity, missing migrations, untestable designs, silent failure paths. The output is a better plan, not a document about the plan.

**Iron rule: review only — no code changes, no implementation.**
**Iron rule: interactive.** One finding = one question with numbered issue + lettered options (`3A`, `3B`), 2-3 options including "do nothing" where reasonable, effort/risk per option, and `Recommendation: <X> because <why>`. Zero findings in a section → "No issues, moving on." Once the user decides scope, commit — never re-argue or silently reduce it later.

## Confidence Calibration

Every finding carries a confidence score. Format: `[P1] (confidence: 9/10) file:line — description`.

| Score | Meaning | Display |
|-------|---------|---------|
| 9-10 | Verified by reading specific code; concrete problem demonstrated | Show |
| 7-8 | High-confidence pattern match | Show |
| 5-6 | Could be a false positive | Show with "verify this" caveat |
| 1-4 | Suspicious but unverified | Appendix only (unless it would be P0) |

**Pre-emit gate:** before promoting any finding, quote the specific line(s) that motivate it (`file:line` + verbatim text). If you cannot quote the motivating code — including framework-generated symbols, where you must quote the meta-construct (migration, decorator, schema) instead of expecting the literal name — force confidence to 4-5 and keep it out of the main report.

---

## Phase 0: Scope Challenge

Read the plan source, `CLAUDE.md`, `TODOS.md` if present, and the actual code the plan references. Then answer:

1. **What existing code already solves each sub-problem?** Capture outputs from existing flows instead of building parallel ones.
2. **What is the minimum set of changes that achieves the stated goal?** Flag deferrable work.
3. **Complexity check:** > 8 files touched or > 2 new classes/services is a smell — challenge whether fewer moving parts achieve the same goal. If triggered, STOP and ask the user (reduce vs proceed as-is) before any review section.
4. **Reinvention check:** for each pattern/infra component the plan introduces, does the framework have a built-in? Rolling a custom solution where a built-in exists is a scope-reduction finding.
5. **Distribution check:** new artifact type (binary, package, container, app)? Then the build/publish pipeline is part of the plan or explicitly in "NOT in scope" — never silently dropped.
6. **Completeness check:** with AI-assisted coding, full coverage (edge cases, error paths, tests) costs minutes, not days. If the plan shortcuts to save human-hours, recommend the complete version.

## Phase 1: Architecture and Feasibility

Evaluate, and diagram where non-trivial:

- System design and component boundaries; before/after dependency graph (ASCII). New coupling — justified?
- **Data flow, all four paths** — for every new flow: happy path, nil path (input missing), empty path (present but zero-length), error path (upstream fails). Diagram them.
- **Hidden complexity:** what looks simple but isn't? Distributed state, cache invalidation, ordering guarantees, timezone/encoding/concurrency traps, "just add a flag" that forks every downstream branch.
- Scaling: what breaks first at 10x load? At 100x? Single points of failure.
- Security architecture: for each new endpoint or data mutation — who can call it, what do they get, what can they change?
- **Production failure scenarios:** for each new integration point, describe one realistic failure (timeout, cascade, partial write, auth failure) and whether the plan accounts for it.

## Phase 2: Migration and Rollback

| Check | Question |
|-------|----------|
| Migration safety | Every DB migration backward-compatible? Zero-downtime? Table locks on large tables? |
| Rollout order | Migrate first, deploy second? What breaks while old and new code run simultaneously? |
| Feature flags | Should any part ship dark behind a flag? |
| Rollback plan | Explicit step-by-step: git revert? flag off? migration rollback? How long does it take? |
| Data rollback | If bad data was written before rollback, how is it repaired? |
| Post-deploy verification | What is checked in the first 5 minutes? First hour? Which smoke tests run automatically? |

If the plan touches data, infra, or shared state and has no rollback story, that is a P1 finding.

## Phase 3: Testing Strategy

Detect the test framework first (read CLAUDE.md `## Testing`; else infer from `package.json`/`Gemfile`/`pyproject.toml`/`go.mod` and existing `test|tests|spec|__tests__|e2e` directories).

1. **Trace every new codepath** the plan introduces: entry point → transforms → persistence/output, every branch, every error path, every call into helpers that have their own branches.
2. **Map user flows and interaction edge cases:** double-submit, navigate away mid-operation, stale session, slow network, two tabs, zero results, 10,000 results.
3. **Check each branch and flow against the plan's tests**, rated ★★★ (behavior + edge + error) / ★★ (happy path) / ★ (smoke).
4. **E2E decision matrix:** flows spanning 3+ components, integration points where mocks hide real failures, and auth/payment/data-destruction flows get `[→E2E]`; pure functions and internal helpers stay unit.
5. **Output the coverage diagram:**

```
CODE PATHS                                   USER FLOWS
[+] src/services/billing.ts                  [+] Payment checkout
  ├── [★★★ TESTED] happy + declined            ├── [GAP] [→E2E] Double-click submit
  ├── [GAP] Network timeout                    └── [GAP] Navigate away mid-payment
COVERAGE: N/M paths (X%)   GAPS: N (N e2e)
```

6. **Add every GAP to the plan** as a specific test requirement: file, assertion, layer.

**Iron rule (regression rule): if the plan modifies existing behavior and no test covers the changed path, a regression test is added to the plan as a critical requirement. Not negotiable, no question asked.**

Flag flakiness risks (time, randomness, external services, ordering). Write the resulting test plan to `.claude/reports/plan-eng-review/<date>-<slug>-test-plan.md` (affected routes, key interactions, edge cases, critical paths) so it survives the conversation.

## Phase 4: Performance, Code Quality, Observability

- **Performance:** N+1 queries (is there a preload/include per new association traversal?), max size of each new data structure in production, indexes for every new query, caching for expensive calls, top 3 slowest new codepaths with estimated p99.
- **Code quality (plan-level):** DRY violations against existing code (be aggressive — cite file and line), over-engineering (abstractions for problems that don't exist yet), under-engineering (happy-path-only design), naming.
- **Observability:** what metric says this feature works? What says it's broken? Can a bug reported 3 weeks post-ship be reconstructed from logs alone? Errors visible to users or swallowed silently?

## Phase 5: Sequencing and Parallelization

Build a dependency table at the module level (not file level — plans describe intent, files are guesswork):

| Step | Modules touched | Depends on |
|------|----------------|------------|

Group into lanes: independent steps in parallel lanes, steps sharing a module sequential in one lane, dependent steps in later lanes. State the execution order ("Launch A + B in parallel. Merge. Then C.") and flag any two parallel lanes touching the same module as a merge-conflict risk. If everything touches the same primary module or there are < 2 workstreams, write "Sequential implementation, no parallelization opportunity."

## Phase 6: Risk Register and Wrap-Up

For each new codepath from Phase 3, one realistic production failure and its coverage:

```
CODEPATH | FAILURE MODE | RESCUED? | TEST? | USER SEES?      | LOGGED?
---------|--------------|----------|-------|-----------------|--------
```

**Any row with RESCUED=N, TEST=N and a silent user experience is a CRITICAL GAP** — present it as its own question.

Then: present deferred items as individual TODO questions (**A)** add to TODOS.md **B)** skip **C)** build now), log accepted decisions to `.claude/decisions.jsonl`, and list any unanswered question under Unresolved Decisions. Handoff: `/plan-design-review` if the plan has UI scope; `/feat` or `/spec` to move into execution.

---

## Output

```
+====================================================================+
|              ENG PLAN REVIEW — COMPLETION SUMMARY                  |
+====================================================================+
| Step 0 Scope         | accepted as-is / reduced per recommendation |
| Architecture         | ___ issues (___ P1)                         |
| Migration/Rollback   | ___ risks flagged, rollback plan: yes/no    |
| Tests                | diagram produced, ___ gaps, ___ regressions |
| Perf/Quality/Observ. | ___ issues                                  |
| Parallelization      | ___ lanes (___ parallel / ___ sequential)   |
| Risk register        | ___ failure modes, ___ CRITICAL GAPS        |
| Test plan artifact   | .claude/reports/plan-eng-review/...         |
| NOT in scope         | written (___ items)                         |
| What already exists  | written                                     |
| TODOS proposed       | ___                                         |
| Unresolved decisions | ___ (listed below)                          |
+====================================================================+
```

Followed in full by: the dependency diagram(s), the coverage diagram, the risk register, **NOT in scope**, **What already exists**, and a one-paragraph verdict (feasible as planned / feasible with the changes decided above / needs redesign).
