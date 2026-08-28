---
description: Git operations done safely — branch hygiene, conflict resolution, history rewrite, bisect, recovery, hooks, GitHub/GitLab flows
argument-hint: "<what you need: conflict | clean-history | bisect | recover | branch | undo>"
---

# /git — Git Operations

## Usage
```
/git conflict              — resolve a merge/rebase conflict correctly
/git clean-history         — tidy a branch before review (squash, reorder, reword)
/git bisect <bad> <good>   — find the commit that introduced a bug
/git recover               — recover lost commits/branches/stashes
/git undo                  — undo the last operation safely
/git branch <name>         — start work following the repo's branching convention
```

## Overview
Git's dangerous operations are dangerous only when done blind. This skill does them with the safety rails: know the state before acting, prefer reversible moves, never rewrite what others have pulled, and always leave a recovery path.

**Non-negotiable rule: never rewrite history on a branch someone else may have checked out** (shared branches, `main`, an open PR's branch owned by someone else). On your own unmerged branch, rewriting is normal hygiene.

---

## Phase 1: Establish the state (always, before anything)

```bash
git status -sb                       # branch, upstream, staged/unstaged
git log --oneline -10 --graph --all  # where HEAD is and what's around it
git stash list                       # uncommitted work parked earlier
git remote -v && git branch -vv      # tracking relationships
```
Report the state in two lines before proposing an action. If the working tree is dirty and the operation touches HEAD, stash or commit first — and say which.

## Conflict resolution

1. `git status` — list the conflicted paths; classify each: **content** (both edited the same lines), **structural** (rename/delete vs edit), **generated** (lockfile, snapshot, build output).
2. For each content conflict, read *both* sides plus the base: `git log --merge -p <file>` shows the commits that touch it. Understand what each side intended — a conflict resolved by picking a side at random is a silent regression.
3. **Generated files are never merged by hand**: regenerate them with the project's tool (`npm install` for a lockfile, the migration/codegen command, snapshot update) after resolving the sources.
4. Resolve, then `git add <file>`, then continue (`git rebase --continue` / `git merge --continue`).
5. **Verify before finishing**: build + tests. A merge that compiles is not a merge that works — conflicts commonly drop a line from each side.
6. Escape hatch: `git rebase --abort` / `git merge --abort` returns to the pre-conflict state. Use it when the conflict shows the two sides diverged semantically; that's a conversation, not a text merge.

`git rerere` (`git config rerere.enabled true`) records resolutions and replays them — worth enabling on a long-lived branch that rebases repeatedly.

## Clean history (own branch only)

Before review, a branch should read as a sequence of intentional changes:
```bash
git rebase -i $(git merge-base origin/main HEAD)   # squash fixups, reword, reorder
git commit --fixup <sha> && git rebase -i --autosquash <base>   # the safer path
```
- Squash "wip", "fix typo", "oops" into the commit they belong to.
- Each surviving commit: builds, passes tests, and does one thing.
- Rewrite messages to the repo's convention (check `git log` for Conventional Commits or a ticket-prefix style).
- Push with `--force-with-lease`, **never** `--force`: it refuses when someone else pushed in the meantime.
- Before starting: `git branch backup/<name>` — a free undo.

## Bisect

```bash
git bisect start <bad-sha> <good-sha>
git bisect run <command that exits non-zero on the bug>
```
- Write the test command **first**, and verify it fails on `bad` and passes on `good`. A flaky command makes bisect confidently wrong.
- Automate with `bisect run`; manual bisect on more than ~8 steps invites mistakes.
- `git bisect skip` for commits that can't build.
- End with `git bisect reset`, then read the culprit commit in full: `git show <sha>`.

## Recovery

Almost nothing is lost within the reflog window (~90 days by default):
```bash
git reflog                          # every position HEAD has held
git reflog show <branch>            # per-branch history, including deletions
git checkout -b rescue <sha>        # resurrect a commit or a deleted branch
git fsck --lost-found               # dangling commits (after a hard reset)
git stash list && git stash show -p stash@{n}
```
- Deleted branch → find its tip in `git reflog` and re-create it.
- Bad `reset --hard` → `git reset --hard HEAD@{n}` from the reflog.
- Dropped stash → `git fsck --unreachable | grep commit`, then `git stash apply <sha>`.
- Committed a secret → recovery is *not* a rewrite: **rotate the secret first** (it's public the moment it's pushed), then clean history with `git filter-repo` and coordinate the force-push with everyone. Never assume a rewrite un-leaks a credential.

## Undo, by situation

| Situation | Safe move |
|---|---|
| Wrong message on the last commit | `git commit --amend` (unpushed only) |
| Committed too early | `git reset --soft HEAD~1` (keeps changes staged) |
| Want the change gone but the commit kept | `git revert <sha>` — the only safe undo on a shared branch |
| Staged the wrong file | `git restore --staged <file>` |
| Discard local changes to a file | `git restore <file>` (destructive — confirm first) |
| Pulled a mess | `git reset --hard origin/<branch>` after saving work (`git stash` or a backup branch) |

## Branching & platform flow

1. Read the convention before naming: recent branches (`git branch -a --sort=-committerdate | head -20`), CONTRIBUTING, PR templates.
2. Branch from an up-to-date base: `git fetch origin && git switch -c <name> origin/<default>`.
3. Keep up to date the way the repo does — merge the base in (safe, preserves others' checkouts) or rebase (clean history, own branch only). Follow the repo's stated convention; don't impose one.
4. **GitHub**: `gh pr create --fill --base <default>`, `gh pr checks`, `gh pr view --json`. **GitLab**: `glab mr create --fill`, `glab mr checks`. Follow the repo's PR/MR template; hand review off to `/pr-review` and release to `/ship`.
5. Never merge your own PR when the repo requires review; never push directly to a protected branch.

## Rules
- Show the state before acting, and state the recovery path with every destructive command.
- `--force-with-lease`, never `--force`.
- Never rewrite history that others may have pulled (`main`, shared branches, someone else's PR branch).
- Never commit generated files by hand-merging them; regenerate.
- A resolved conflict is verified by a build and tests, not by the absence of markers.
- Secrets in history: rotate first, clean second — in that order, always.
