---
description: Restore a saved working context, re-verify its claims against the current repo, and resume
argument-hint: "[slug or fragment]"
---

# /context-restore — Restore Saved Context

## Usage
```
/context-restore              — list saved contexts; load if only one exists
/context-restore <fragment>   — load the context whose slug/title matches the fragment
```

**Iron rule: the repo is the source of truth, not the saved file.** Files change between save and restore. Every claim in the saved context is re-verified against current state before you act on it. A restore that skips verification resumes work on a world that no longer exists.

## Argument Parsing

Parse `$ARGUMENTS`: empty → list mode; otherwise match the fragment (case-insensitive) against filenames and frontmatter titles in `.claude/context/`. One match → load it. Multiple → show the list and ask by number. Zero → show the list and say nothing matched.

---

## Phase 1: List

Read every `.claude/context/*.md`, parse frontmatter, sort by `updated` (frontmatter, not mtime — mtime drifts), newest first:

```
SAVED CONTEXTS
════════════════════════════════════════
#  Updated      Title                  Branch        Status
─  ───────────  ─────────────────────  ────────────  ────────────
1  2026-07-27   auth refactor          feat/auth     in-progress
2  2026-07-24   csv import edge cases  main          blocked
════════════════════════════════════════
```

- No contexts: "No saved contexts yet. Run /context-save first." — exit.
- Exactly one: load it directly.
- Several and no argument: ask which to load (numbered).

## Phase 2: Verify Claims Against Reality

Read the chosen file. Then check each category of claim against the current repo — do not present the saved content until you know what still holds:

| Saved claim | Verification |
|-------------|--------------|
| `branch` | Compare to current branch. Different → note it; the user may want to switch before continuing. |
| `head` SHA | `git log <head>..HEAD --oneline` — every commit since the save. Also confirm the SHA exists (`git cat-file -t <head>`); if not (rebase/gc), say the diff baseline is lost. |
| `files` list | Each file: still exists? Changed since the save? `git diff <head> --stat -- <file>` (plus `git status` for uncommitted drift). |
| Next steps | For each: was it already done? Check the code — search for the change the step describes before assuming it is still pending. |
| Open questions | Still open? A question answered by a commit since the save is resolved — cite the commit. |
| Session outputs | If a failing test/command was pasted: offer to re-run it — the single fastest way to learn whether the world moved. |

Produce a verification table:

```
| Claim                              | At save          | Now              | Verdict     |
|------------------------------------|------------------|------------------|-------------|
| branch feat/auth                   | feat/auth        | main             | drifted     |
| src/auth/login.ts modified         | uncommitted      | committed a1b2c3 | done        |
| Step 1: add refresh-token endpoint | pending          | absent from code | still true  |
| Failing: auth.test.ts (expiry)     | 2 failures       | re-ran: 0        | resolved    |
```

Verdicts: `still true` / `drifted` (changed, needs re-reading) / `done` (already completed) / `resolved` / `unverifiable` (say why).

## Phase 3: Summarize and Resume

```
RESUMING: <title>
════════════════════════════════════════
Saved:   <updated> on <branch> @ <short head>
Since:   <N> commits, <M> of <K> saved files changed
════════════════════════════════════════

### Still true
<claims and next steps that survived verification>

### Changed since save
<what drifted and what that invalidates — e.g. "step 3 obsolete: endpoint was added in a1b2c3">

### Resume point
<the first remaining next step, adjusted for drift>
```

Then ask, numbered:
1. Continue with the resume point
2. Show the full saved file
3. Just needed the context — stop here

If steps were found `done`, update the saved file: check them off (or move to a `## Done` list) and bump `updated`, so the next restore starts from truth.

---

## Edge Cases

| Situation | Handling |
|-----------|----------|
| `.claude/context/` missing entirely | Same as "no contexts" — suggest `/context-save`, exit |
| File without frontmatter (hand-written or legacy) | Load it anyway; verify what you can from its prose; note that branch/SHA verification is unavailable |
| Saved branch was deleted | Say so; the work either merged (check `git log --all --grep` and merged branches) or was abandoned — find out which before proposing a resume point |
| `head` SHA no longer exists (rebase, gc, different clone) | Diff baseline lost — fall back to verifying files by content (does the described change exist in the code?) instead of by diff |
| Context older than ~30 days | Warn before verifying: high drift is likely; ask whether to verify in full or just skim the summary |
| Two contexts describe the same task | Load the newest; mention the older one exists (it may hold decisions the newer save dropped) |
| Session Outputs contain a failing command | Re-running it is the best single verification — do it (read-only commands only; ask before anything mutating) |

## Rules

- **Never start executing next steps before the verification table is shown.** The user decides on a verified picture, not a stale one.
- Cross-branch restore is normal — a context saved on one branch is often resumed from another. Flag the branch difference, don't block on it.
- If verification shows that MOST claims drifted (e.g. a big merge landed), say plainly that this context is mostly historical and recommend a fresh look rather than mechanical resumption.
- Verification commands must be read-only (`git log`, `git diff`, `grep`, test runs the user approves). Restore never mutates the working tree.
- This command modifies nothing except the saved context file itself (status/`updated` bookkeeping).
- Save the counterpart state with `/context-save`; log durable decisions rediscovered during verification via `/learn` so they outlive both files.

## Completion Status

End the session by naming one of:

- **RESUMED** — context loaded, verified, user picked a resume point; work continues from it.
- **CONTEXT ONLY** — user just wanted the summary; saved file untouched beyond bookkeeping.
- **STALE** — most claims drifted; recommended a fresh start and (with user approval) set the saved file's `status` to `stale` so future lists show it honestly.
