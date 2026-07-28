---
description: Full ship workflow — sync base, test gate, adversarial self-review, version bump, changelog, PR
argument-hint: "[--no-pr] [--draft]"
---

# /ship — Full Ship Workflow

## Usage
```
/ship            — full workflow: gate, review, version, changelog, commit, push, open PR
/ship --no-pr    — everything except PR creation (commit + push only)
/ship --draft    — open the PR as a draft
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **`--no-pr`**: stop after Phase 8 (push); skip PR creation
- **`--draft`**: pass `--draft` to `gh pr create` in Phase 9
- Both flags may combine with nothing else; unknown arguments → show usage and stop

## Overview

Non-interactive by default: the user said `/ship`, so ship. Run straight through and end with the PR URL.

| Stop for | Never stop for |
|----------|----------------|
| Currently on the base branch (abort) | Uncommitted changes (always include them) |
| Merge conflicts that can't be trivially resolved | Patch-level version bump (auto-pick) |
| In-branch test/lint/build failures | CHANGELOG content (generate from the diff) |
| Critical findings from the adversarial review | Commit message approval (auto-commit) |
| Plan items NOT DONE with no user decision | Multi-file changesets (auto-split into logical commits) |
| Minor/major version bump (ask) | |

**Iron rule: never force-push.** Plain `git push` only, always.
**Iron rule: never skip the test gate.** If tests fail and the failure is caused by this branch, stop. There is no flag, argument, or user hurry that overrides this.

---

## Phase 1: Detect base branch and pre-flight

1. Detect the base branch, first match wins:
   - `gh pr view --json baseRefName -q .baseRefName` (a PR already exists)
   - `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`
   - `git symbolic-ref refs/remotes/origin/HEAD | sed 's|refs/remotes/origin/||'`
   - `git rev-parse --verify origin/main` → `main`; else `origin/master` → `master`; else `main`
2. If the current branch IS the base branch, **abort**: "You're on `<base>`. Ship from a feature branch (create one with `git switch -c`)."
3. Run `git status`, `git log <base>..HEAD --oneline`, and `git diff <base>...HEAD --stat` to understand what's being shipped. Uncommitted changes are always included — commit them in Phase 7, don't ask.
4. If there are no commits ahead of base AND no uncommitted changes, inform the user and exit.

## Phase 2: Sync the base branch

Merge base into the feature branch BEFORE testing, so the gate runs against the merged state:

```bash
git fetch origin <base> && git merge origin/<base> --no-edit
```

- **Conflicts in generated/bookkeeping files** (CHANGELOG ordering, lockfiles, version files): resolve them yourself, state what you did.
- **Any other conflict**: **STOP.** Show the conflicting files and hunks. Never guess a semantic merge.
- Already up to date: continue silently.

## Phase 3: Quality gate (tests + lint + build)

Detect the project's commands — read `CLAUDE.md` first, then the tool config (`package.json` scripts, `Makefile`, `pyproject.toml`, `Cargo.toml`, `go.mod`…). Run whatever exists of: **test**, **lint/typecheck**, **build**. Show real output, not summaries of your expectations.

**If a test fails**, triage ownership before stopping:

| Classification | Evidence | Action |
|---------------|----------|--------|
| In-branch | Failing test file or the code it tests was modified on this branch, or the failure traces to the branch diff | **STOP.** Fix before shipping. No exceptions. |
| Pre-existing | Neither the test nor the tested code changed on this branch, and the failure is unrelated to any branch change | Ask the user: 1) fix it now (separate `fix:` commit), 2) record it and ship anyway, 3) skip |
| Ambiguous | Can't tell | Treat as in-branch. Safer to stop the developer than to ship a broken test. |

If there is no test command at all, tell the user plainly ("shipping without a test gate — this branch is unverified") and continue. Never invent a fake green.

**Re-verification rule:** if ANY code changes after this phase (review fixes, plan-gap fixes), re-run the gate before pushing. "Should still pass" is not evidence; stale output is not evidence.

## Phase 4: Adversarial self-review

Review the full diff (`git diff $(git merge-base origin/<base> HEAD)`) as an attacker and a chaos engineer, not as the author. Fresh eyes: forget why you wrote each line and ask how it fails in production.

Hunt for, in order of damage:

| Target | What to look for |
|--------|-----------------|
| Silent corruption | Logic that produces wrong results without erroring |
| Trust boundaries | Unvalidated input crossing into queries, shell, HTML, file paths |
| Security holes | Auth bypass, secrets in the diff, injection, permission gaps |
| Race conditions | Concurrent access, double-submit, check-then-act windows |
| Swallowed failures | catch-and-ignore, missing error paths, failing promises |
| Resource leaks | Unclosed handles/connections, unbounded retries, growing caches |
| Edge cases | null/empty/huge input, timeouts, partial failure of a dependency |

Rules for findings:
- Classify each as **FIXABLE** (you know the fix) or **INVESTIGATE** (needs human judgment).
- Every finding must quote the motivating line(s) — `file:line` plus the verbatim code. If you cannot quote the line that makes it a bug, it is unverified: demote it to a "possible" note, never a blocking finding.
- LOC is not a proxy for risk — a 5-line auth change deserves the same hostility as a 500-line feature.
- No compliments. Just the problems.

Then: auto-fix FIXABLE findings (commit as `fix: pre-ship review fixes`, then **re-run Phase 3**). Present INVESTIGATE findings to the user with numbered options (fix / ship anyway / discuss) and wait. End the review with one line: `Recommendation: <ship as-is | fix X first> because <the single strongest finding, or the no-fix rationale>` — generic reasons like "safer" don't qualify.

For a deeper multi-pass review, suggest `/review` — but this pass always runs regardless.

## Phase 5: Plan completion audit (if a plan exists)

Look for a spec/plan: an active plan file from this conversation, or the newest relevant file in `.claude/plans/`, `docs/specs/`, `specs/`, or a `PLAN.md`/`SPEC.md` touched recently. Validate relevance by reading the first 20 lines; skip with "No plan file detected" if nothing matches.

1. **Extract actionable items**: checkboxes, numbered implementation steps, imperative statements ("Add X to Y"), named files, test requirements, data-model changes. Ignore context/background sections, open questions ("TBD"), and explicitly deferred scope ("Future:", "Out of scope:"). Cap at 50 items.
2. **Classify each against the diff** (`git diff <base>...HEAD`):

| Verdict | Standard |
|---------|----------|
| DONE | Clear evidence in the diff — cite the file(s). A file being touched is not enough; the described functionality must be present. |
| CHANGED | Goal achieved by a different approach — note the difference. Be generous here. |
| PARTIAL | Work started, not finished (e.g. model exists, controller missing) |
| NOT DONE | Verified absent from the diff |
| UNVERIFIABLE | The diff can't prove it (external system, other repo) — cite the manual check the user must perform |

   Be conservative with DONE, generous with CHANGED, honest with UNVERIFIABLE. Code that *handles* a deliverable is not the deliverable.
3. **Gate**: any NOT DONE → ask the user: 1) stop and implement, 2) ship anyway and record as deferred, 3) intentionally dropped. Any UNVERIFIABLE → list each with its specific manual check; the user confirms per item, never as a blanket "yes to all". PARTIAL-only or all DONE/CHANGED → continue, note it in the PR body.

## Phase 6: Version bump

Detect the versioning scheme, first match wins:
- **`package.json` `version` field** (or `Cargo.toml`, `pyproject.toml` equivalent) → bump there; also update a lockfile version stanza if the package manager keeps one
- **`VERSION` file** → bump there, keep the existing digit format
- **Git tags only** (`git describe --tags --abbrev=0` succeeds, no version file) → don't write anything now; record the next tag name for the PR body and suggest tagging on merge
- **Nothing** → skip with "No versioning scheme detected."

Decide the level from the diff: **patch** for fixes/tweaks with no feature signal (auto-pick, don't ask); **minor** when there's a feature signal (new route/page/command/module, migration) — ask; **major** only for breaking changes — always ask. If the version was already bumped on this branch, keep it and reuse it downstream.

## Phase 7: CHANGELOG

If `CHANGELOG.md` exists (create one with a `# Changelog` header if the project versions releases but has none):

1. Enumerate every commit: `git log <base>..HEAD --oneline`. This list is your checklist.
2. Read the full diff to know what each commit actually did — don't trust messages alone.
3. Group into themes, then write ONE entry for the new version, inserted below the file header:
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD
   ### Added      — new features
   ### Changed    — changes to existing behavior
   ### Fixed      — bug fixes
   ### Removed    — removed features
   ```
   Only include sections that apply. If earlier entries on this branch covered part of the work, merge them into this single entry.
4. **Voice**: lead with what the user can now *do* — "You can now filter orders by carrier", not "Refactored OrderFilterService". No internal bookkeeping (tracking files, CI plumbing) in user-facing bullets.
5. **Cross-check**: every commit from step 1 maps to at least one bullet. If the branch spans K themes, the entry reflects all K.

Never ask the user to describe the changes — infer from the diff.

## Phase 8: Commit and push

Group outstanding changes into logical, bisectable commits — one coherent change per commit, not one file per commit:

- Order: infrastructure/config → core logic (with its tests) → UI/entry points (with their tests) → version + CHANGELOG **always last**
- Code and its test file travel in the same commit; each commit must stand alone (no imports of code that arrives in a later commit)
- Small diff (< 50 lines, < 4 files): a single commit is fine
- Messages: `<type>: <summary>` (feat/fix/chore/refactor/docs/test), body optional
- Stage files by name — never `git add -A` or `git add .`

Push with upstream tracking: `git push -u origin <branch>`. If the branch is already up to date on the remote, skip the push. **Never `--force` or `--force-with-lease`** — if the push is rejected, fetch and reconcile with a merge, or stop and explain.

If `--no-pr`: print the ship summary (below) and stop here.

## Phase 9: Open the PR

Idempotency first: `gh pr view --json url,state`. If an open PR exists, **update** its body (`gh pr edit --body-file`) with this run's fresh results — never append to stale content. Otherwise create it:

```bash
gh pr create --base <base> --title "<type>: <summary>" --body-file <tmpfile> [--draft]
```

PR body template (omit sections that don't apply):

```markdown
## Summary
<Group every substantive commit into labeled sections (e.g. **Feature**, **Fixes**,
**Infrastructure**). Every commit except the version/changelog bookkeeping commit
must appear in exactly the section it belongs to — if a commit's work isn't
reflected here, you missed it.>

## Test Results
<Command(s) run + pass/fail counts from Phase 3. Note lint/build results.
If shipped without a test gate, say so explicitly.>

## Review
<Adversarial findings from Phase 4: what was auto-fixed, what the user decided,
or "No issues found." Include the final Recommendation line.>

## Plan Completion
<Checklist summary from Phase 5: N done / M changed / K deferred, with deferred
items listed. Omit if no plan file.>

## Version
<old → new, and where it lives (package.json / VERSION / next tag).>
```

If `gh` is unavailable or unauthenticated: print the branch name and remote URL, tell the user to open the PR via the web UI, and don't treat it as a failure — the code is pushed.

## Re-run behavior

Re-running `/ship` means "run the whole checklist again". Every *verification* (gate, review, plan audit) runs on every invocation; only *actions* are idempotent: skip the version bump if already bumped, skip the push if already pushed, edit the PR instead of creating a second one. Never skip a verification because a prior run performed it.

## Output

```
SHIP SUMMARY
════════════
Branch:    <branch> → <base>
Gate:      tests <pass/fail/none> · lint <pass/fail/none> · build <pass/fail/none>
Review:    <N findings — M auto-fixed, K user-decided | clean>
Plan:      <X/Y done | no plan file>
Version:   <old> → <new> (<scheme>)
Commits:   <N> pushed
PR:        <url | skipped (--no-pr) | draft: url>

Next: /deploy to ship it to production, /release-notes to sync docs.
```
