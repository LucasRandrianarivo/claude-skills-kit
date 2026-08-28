# Evals

Eight cases that check the behaviors this kit actually claims — the ones where an agent
without it reliably does the wrong thing.

```bash
claude plugin eval .                    # all cases, with a no-plugin baseline arm
claude plugin eval . --case db-*        # one case
claude plugin eval . --runs 5           # more runs per case (default 3)
claude plugin eval . --threshold 0.8    # non-zero exit below this score
```

Each case is a `prompt.md` (a realistic request, no repo scaffolding needed) and a
`graders/criteria.md` rubric with explicit must / must-not lists and a three-point scale.
The runner also executes a **baseline arm without the plugin**, so the number that matters
is the delta: a case where the baseline already scores 1.0 is not testing anything.

| Case | What it checks | The wrong answer it catches |
|---|---|---|
| `debug-root-cause` | Evidence before hypotheses | Patching the symptom, adding a retry |
| `db-slow-query` | Index column order, keyset pagination | Caching over the query; index on the sort column alone |
| `webhook-idempotency` | Signature on raw body, unique-constraint dedupe, store-then-schedule ordering | Commit-then-enqueue, which loses events silently |
| `auth-object-level` | Ownership filter inside the query | Fetch by id and return the row (IDOR) |
| `cache-authenticated` | Never shared-cache identity-dependent data | `s-maxage` on an account page |
| `estimate-unknown` | A range, and a spike instead of a number for the unknown | One confident figure for undocumented integration work |
| `change-request-defect` | A defect is never a change request | Quoting the client for fixing your own defect |
| `write-unsourced-claim` | Accuracy gates the edit | Polishing prose around an unsourced 40% |

## Writing a new case

Keep the prompt realistic and self-contained, and make the rubric decide on **observable
behavior**, not on wording. A good rubric names the wrong answer explicitly — that is what
makes the grade reproducible across runs and models.

Prefer cases where the failure is expensive and quiet: data loss, a cross-tenant read, a
number nobody sourced. A case whose failure is merely inelegant will score noise.

## Status

These cases are authored but **not yet executed**: `claude plugin eval` is in early access
and was unavailable on the account used to write them, so the suite has never been run and
its scores are unknown. Treat it as ready to run, not as passing. The first run should be
expected to correct some rubrics — a grader that every arm passes, baseline included, is
measuring nothing and should be tightened or dropped.
