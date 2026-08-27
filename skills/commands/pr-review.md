---
description: Review a PR before landing — dispatch specialist agents by diff, merge into a ship/block verdict
argument-hint: "[<number|url>] [--all-specialists] [--<specialist>]"
---

# /pr-review — Pre-Landing PR Review

Reviews a pull request (or the current branch against its base) before it lands. Complementary to `/review`, which reviews local diffs phase by phase: `/pr-review` reviews the whole branch, dispatches specialist review agents based on what the diff touches, and merges all findings into one severity-ranked report ending in a ship/block verdict.

## Usage
```
/pr-review                    — review the current branch vs its base branch
/pr-review 123                — review PR #123 via gh
/pr-review <pr-url>           — review the PR at that URL via gh
/pr-review --all-specialists  — force-dispatch all ten specialists
/pr-review --security         — force-include one specialist (also: --red-team,
                                --performance, --api-contract, --data-migration,
                                --maintainability, --testing, --accessibility,
                                --frontend-perf, --integration)
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **No arguments**: review the current branch against its base.
- **A number or PR URL**: run `gh pr view <arg> --json number,title,body,baseRefName,headRefName`. If the PR's head branch is not checked out, run `gh pr checkout <number>`. If the working tree is dirty, stop and ask the user first, presenting numbered options: 1) stash and checkout, 2) abort.
- **`--<specialist>`**: force-include that specialist regardless of detection.
- **`--all-specialists`**: dispatch all ten specialists.

---

## Phase 1: Establish the Diff

1. Detect the base branch: `gh pr view --json baseRefName -q .baseRefName` if a PR exists; else `git symbolic-ref refs/remotes/origin/HEAD | sed 's|refs/remotes/origin/||'`; else `main`, then `master`.
2. Run `git fetch origin <base> --quiet`.
3. Compute `DIFF_BASE=$(git merge-base origin/<base> HEAD)` — diffing against the merge base excludes commits that landed on the base after this branch was created.
4. Run `git diff "$DIFF_BASE" --stat`. If empty, report "Nothing to review — no diff against <base>." and stop.
5. Record `DIFF_LINES` (insertions + deletions) and the changed-file list (`git diff "$DIFF_BASE" --name-status`).

## Phase 2: Scope Check (informational)

Did they build what was requested — nothing more, nothing less?

1. Gather stated intent: PR title/body (`gh pr view --json title,body` if a PR exists), commit messages (`git log origin/<base>..HEAD --oneline`, skipping WIP/fixup/merge/typo noise), and `TODOS.md` if present.
2. Compare intent against the changed files and diff content.
3. Output — this section never blocks the review:

```
Scope Check: CLEAN | DRIFT DETECTED | REQUIREMENTS MISSING
Intent:    <1-line summary of what was requested>
Delivered: <1-line summary of what the diff actually does>
[Drift: each change unrelated to the stated intent]
[Missing: each stated requirement not addressed in the diff]
```

## Phase 3: Critical Pass (main agent)

Read the FULL diff before flagging anything — never flag an issue the diff already addresses. Then apply this checklist. Cite `file:line` for every finding. Only flag real problems.

### Critical categories

| Category | What to look for |
|----------|-----------------|
| SQL & data safety | String interpolation in SQL (parameterize instead); check-then-set that should be an atomic `WHERE` + update; validation-bypassing direct DB writes; N+1 from missing eager loading |
| Race conditions | Read-check-write without a uniqueness constraint or retry-on-duplicate; find-or-create without a unique index; status transitions not guarded by `WHERE old_status = ?` |
| LLM output trust boundary | LLM-generated values (emails, URLs, names) persisted or mailed without format validation; structured tool output written to DB without shape checks; LLM-generated URLs fetched without an allowlist (SSRF); LLM output stored in vector DBs unsanitized (stored prompt injection) |
| Shell injection | `exec`/`system`/`subprocess` with shell interpolation of variables — use argument arrays; `eval` on generated code |
| Unsafe HTML | `dangerouslySetInnerHTML`, `v-html`, `.html_safe`, `innerHTML` on user-controlled data |
| Enum completeness | New enum value / status string / type constant: Grep for sibling values, then READ every consumer (switches, filter arrays, allowlists, `if/else` chains) and verify the new value is handled — this requires reading code OUTSIDE the diff |

### Informational categories

| Category | What to look for |
|----------|-----------------|
| Async/sync mixing | Blocking I/O or `sleep` inside async handlers — blocks the event loop |
| Column/field name safety | ORM query column names that don't match the actual schema (silently return empty) |
| Time window safety | Date-key lookups assuming "today" covers 24h; mismatched time buckets between related features |
| Type coercion at boundaries | Values crossing language→JSON→language boundaries where numeric vs string changes hashes or comparisons |
| Version/changelog | Version mismatch between PR title and VERSION/CHANGELOG; changelog entries describing changes inaccurately |
| CI/CD & distribution | Workflow changes: tool versions, artifact paths, `${{ secrets.X }}` not hardcoded; version tag format consistency (`v1.2.3` vs `1.2.3`); publish idempotency |
| Completeness gaps | 80-90% implementations where 100% is a modest addition; missing negative-path tests that mirror happy-path structure |

**Confidence.** Every finding carries a confidence score 1-10. 9-10 = verified by reading the code, could demonstrate the bug. 7-8 = high-confidence pattern match. 5-6 = show with the caveat "medium confidence — verify". 1-4 = suppress from the main report (appendix only).

**Evidence gate.** Before promoting any finding, quote the specific line(s) that motivate it (`file:line` + verbatim text). If the claim is "field X doesn't exist", quote the class where it would live; if "race between A and B", quote both A and B. Cannot quote the motivating line → force confidence to 4 and suppress. Never claim "likely handled" or "probably tested" — read and cite the handling code or flag it as unverified.

## Phase 4: Specialist Dispatch

**If `DIFF_LINES` < 50 and no force flags:** skip specialists, print "Small diff (N lines) — specialists skipped." and go to Phase 5.

### Selection

Inspect the changed-file list and diff content, then select:

| Signal in the diff | Dispatch |
|--------------------|----------|
| Always (any diff ≥ 50 lines) | `specialist-maintainability` |
| Test files changed, OR new/changed behavior with no test changes | `specialist-testing` |
| SQL files, `migrations/`, `db/migrate/`, schema files, ALTER/CREATE statements | `specialist-data-migration` |
| Route/controller/handler files, API response shapes, OpenAPI/GraphQL schemas, serializers, webhook payloads | `specialist-api-contract` |
| Loops over collections, DB queries, HTTP calls in iteration, list endpoints, frontend bundles | `specialist-performance` |
| Auth/session/permission code, user input handling, file uploads, crypto, secrets | `specialist-security` AND `specialist-red-team` |
| `DIFF_LINES` > 200 (even without auth signals) | `specialist-red-team` |
| Components, pages/templates, styles, or any markup rendering interactive elements | `specialist-accessibility` |
| Components/routes, client data fetching, images/fonts, bundler config, or a new client dependency | `specialist-frontend-perf` |
| Outbound HTTP/SDK calls, webhook receivers, OAuth/token handling, API keys or integration config | `specialist-integration` |

Print the selection: "Dispatching N specialists: [names]. Skipped: [names] (signal not detected)."

### Dispatch

Launch all selected specialists **except red-team** in parallel (one message, multiple Agent calls, foreground). Each specialist prompt contains:

1. The diff command: `DIFF_BASE=$(git merge-base origin/<base> HEAD) && git diff "$DIFF_BASE"`
2. Stack context: detected from lockfiles/manifests (`package.json` → node, `Gemfile` → ruby, `pyproject.toml`/`requirements.txt` → python, `go.mod` → go, `Cargo.toml` → rust).
3. "Apply your checklist to this diff. Return your standard findings table. If nothing is wrong, return exactly `NO FINDINGS`."

**Red-team runs AFTER the others complete** — its prompt additionally includes the merged findings so far, with the instruction: "These issues were already found. Your job is to find what the specialists MISSED." (Also trigger red-team late if any specialist returned a 🔴 finding, even when it wasn't selected in the table above.)

If a specialist fails or times out, note it and continue — partial results beat no results.

## Phase 5: Merge Findings

1. **Collect** all findings from Phase 3 and every specialist. Discard `NO FINDINGS` responses.
2. **Deduplicate** by fingerprint `file:line:category`. When two sources report the same fingerprint: keep the higher-confidence version, tag it `confirmed by <specialist> + <specialist>`, and raise confidence by 1 (cap 10).
3. **Gate**: confidence ≥ 7 shown normally; 5-6 shown with a "verify" caveat; ≤ 4 moved to the appendix.
4. **Rank**: 🔴 first, then 🟡, then 🔵; within a severity, confidence descending.

---

## Output

```
## PR Review: <branch or PR #> → <base>

Scope Check: <CLEAN | DRIFT DETECTED | REQUIREMENTS MISSING> (details above)
Specialists: <dispatched names> | Skipped: <names>

| # | Severity | Confidence | Source | File:Line | Issue | Fix |
|---|----------|------------|--------|-----------|-------|-----|
| 1 | 🔴 | 9/10 | security | src/api/auth.ts:42 | ... | ... |
| 2 | 🟡 | 8/10 | performance | src/jobs/sync.ts:88 | ... | ... |
| 3 | 🔵 | 7/10 | maintainability | src/util/dates.ts:15 | ... | ... |

**Severity legend:**
- 🔴 Critical — bug, vulnerability, or data-loss risk; must fix before merge
- 🟡 Warning — real issue; should fix before or immediately after merge
- 🔵 Suggestion — improvement; fix opportunistically

### Verdict: SHIP | SHIP WITH FOLLOW-UPS | BLOCK

<one line naming the finding that decides the verdict>

Appendix (low confidence, not actioned): <count> findings
```

**Verdict rules:**
- **BLOCK** — any unresolved 🔴. Name each blocking finding and its fix. Suggest `/fix-review` to apply fixes, then re-run `/pr-review`.
- **SHIP WITH FOLLOW-UPS** — no 🔴, but 🟡 findings remain. Record the follow-ups (below).
- **SHIP** — only 🔵 findings or none.

The verdict line must point at a specific finding, not a vibe: "BLOCK — auth.ts:42 lets any user read any tenant's orders", never "block because it's safer".

### Follow-up TODOs

For 🟡/🔵 findings not fixed now, offer to append them to `TODOS.md` (create it if missing) in this canonical format, under a `## Review Follow-ups` section, sorted P0 first:

```markdown
### <Title>

**What:** One-line description of the fix.

**Why:** The concrete problem it solves (cite the review finding file:line).

**Context:** Enough detail that someone picking this up in 3 months understands the current state and where to start.

**Effort:** S / M / L / XL
**Priority:** P0 / P1 / P2 / P3 / P4
**Depends on:** <prerequisites, or "None">
```

Priorities: P0 blocking next release, P1 this cycle, P2 when P0/P1 clear, P3 nice-to-have, P4 someday. 🟡 findings map to P1-P2; 🔵 to P3-P4. When an item is later completed, move it to a `## Completed` section with `**Completed:** (YYYY-MM-DD)` appended.

## Suppressions — do NOT flag

- Anything already addressed elsewhere in the diff (read the FULL diff first)
- Harmless redundancy that aids readability
- "Add a comment explaining this threshold" — thresholds change during tuning, comments rot
- Consistency-only changes with no behavioral benefit
- Edge cases the input can never produce in practice
- Tests exercising multiple guards at once — tests don't need to isolate every guard
- Empirically tuned thresholds and eval constants

**Iron rule: this command reviews and reports — it never commits, pushes, or merges.** Fixing is `/fix-review`'s job; landing is `/ship`'s job.
