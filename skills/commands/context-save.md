---
description: Save the session's working context to .claude/context/ so a future session can resume without loss
argument-hint: "[title]"
---

# /context-save — Save Working Context

## Usage
```
/context-save            — save current working context, title inferred from the task
/context-save <title>    — save with an explicit title
```

**Iron rule: capture state, change nothing.** This command never modifies code, never commits, never stages. It reads state and writes exactly one file under `.claude/context/`.

## Argument Parsing

Parse `$ARGUMENTS`: if non-empty, use it as the title. Otherwise infer a concise title (3–6 words) from the current work. **Infer, don't interrogate** — only ask the user if the title genuinely cannot be inferred from the conversation.

---

## Phase 1: Gather Repo State

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status --short
git diff --stat && git diff --cached --stat
git log --oneline -10
```

Record the branch, the HEAD SHA, and the list of modified files (staged + unstaged). The HEAD SHA is what lets `/context-restore` diff "then" against "now" — never omit it.

## Phase 2: Summarize the Session

From the conversation and the gathered state, write down — concretely, not vaguely:

1. **Task state** — what is being built/fixed, and how far it got (working? half-wired? failing on X?).
2. **Key decisions made** — each choice AND its reason. "Chose polling over websockets — the API has no push endpoint" is restorable; "discussed architecture" is not.
3. **Files touched + why** — one line per file: what changed in it and its role in the task.
4. **Next steps** — numbered, in priority order, each an action with a file path or command, not an intention.
5. **Open questions** — anything undecided, blocked, or awaiting the user; include approaches that were tried and failed (a future session must not re-try them).
6. **Relevant command outputs** — paste the actual output that defines the current state: the failing test, the error message, the benchmark number. Trim to the meaningful lines, but paste real output — a summary of an error is not an error.

### What makes a context restorable

Every claim must be verifiable later: anchor to file paths, commit SHAs, and re-runnable commands. `/context-restore` will re-check each claim against the repo — write claims it can check. Keep the whole file under ~150 lines: context is for resuming, not archiving the chat.

## Phase 3: Write the File

Path: `.claude/context/<slug>.md` (create directories if needed).

- Slug: lowercase the title, spaces → hyphens, strip everything outside `a-z0-9-`, cap at 50 chars.
- If the file already exists **for the same task**: update it in place and bump `updated` — a resumed task keeps one context file.
- If it exists for a **different** task: suffix `-2`, `-3`, … Never silently overwrite someone else's context.

File format:

```markdown
---
title: <human title>
status: in-progress | blocked | ready-for-review
branch: <branch>
head: <full HEAD SHA at save time>
created: <ISO 8601>
updated: <ISO 8601>
files:
  - path/to/file1
  - path/to/file2
---

## Task

<1–3 sentences: goal and current progress>

## Decisions

- <choice> — <reason>

## Files Touched

- `path/to/file1` — <what changed and why>

## Next Steps

1. <action, with file path or command>
2. ...

## Open Questions

- <undecided item / blocker / failed approach not to retry>

## Session Outputs

```text
<pasted verbatim output: failing test, error, benchmark>
```
```

The `files` list comes from `git status --short` plus files changed in unpushed commits relevant to the task. Relative paths from the repo root.

## Output

```
CONTEXT SAVED
════════════════════════════════════════
Title:    <title>
File:     .claude/context/<slug>.md
Branch:   <branch> @ <short SHA>
Modified: <N> files
Status:   <status>
════════════════════════════════════════

Resume later with /context-restore <slug>.
```

---

## Rules

- **The frontmatter `updated` field is the authoritative recency signal** — not file mtime, which drifts across copies and checkouts.
- **Always record `branch` and `head`** — cross-branch and cross-machine restore depends on them.
- Uncommitted work is fragile: if `git status` shows many unstaged changes, remind the user (once, one line) that the saved context describes uncommitted work that only exists in this working tree.
- Do not save secrets: if a command output pasted into Session Outputs contains a token/password, redact it.
