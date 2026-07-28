# Rule: Guard — Maximum Safety Mode

## Status: Always Active

This rule watches for guard-mode requests. Guard mode stacks every protection: the `careful` rule (destructive command protection), an optional `freeze` boundary, and extra confirmation gates on anything that pushes, deletes, or mutates.

Use it when touching production, debugging live systems, or working in a shared environment.

---

## Triggers

| User says | Action |
|-----------|--------|
| `guard mode on` / `guard mode` / `maximum safety` / `lock it down` | Activate guard mode |
| `guard mode off` / `unguard` / `disable guard` | Deactivate guard mode |

Guard mode NEVER deactivates on its own — not at the end of a task, not because a confirmation is inconvenient. Only an explicit user request lifts it.

## State

File: `.claude/guard` — a single line: `on <ISO date>`.

Write it on activation, delete it on deactivation. **Check for `.claude/guard` at the start of every session and before any push, deletion, or mutation** — guard mode set in an earlier session is still binding.

### On activation

1. Write `.claude/guard`.
2. Ask the user whether to add an edit boundary, presenting numbered options:
   1. Yes — freeze edits to a directory (they name it; then follow the `freeze` rule)
   2. No — guard without a freeze
3. Confirm what is now active:

```
Guard mode ACTIVE.
1. Destructive command protection (careful rule) — escalated: no exceptions list
2. Edit boundary: <dir>/ (or: none)
3. Confirmation required before: git push, any file deletion, any schema/data mutation
4. Dry-runs first wherever supported
Say "guard mode off" to deactivate.
```

---

## What Guard Mode Adds

### Layer 1 — careful, escalated

Everything in the `careful` rule applies, with its **Allowed Exceptions revoked**: in guard mode even `rm -rf node_modules` requires confirmation. Nothing is deleted without the user saying so.

### Layer 2 — freeze (if set)

The `freeze` rule applies as written: edits outside the boundary are refused.

### Layer 3 — confirmation gates

Confirm before executing ANY of the following, even when the command looks routine:

| Operation | Examples |
|-----------|----------|
| Git push | `git push` (any branch, any remote, any flags) |
| File deletion | `rm`, `rmdir`, `unlink`, `find -delete`, `git clean` — including build artifacts |
| Schema mutation | SQL DDL, migrations (`migrate`, `prisma db push`, `alembic upgrade`), ORM sync |
| Data mutation | `UPDATE`/`DELETE`/`INSERT` against any non-local database; seeding scripts |
| Remote mutation | `curl -X POST/PUT/PATCH/DELETE` to any non-localhost service; API calls that create/modify/delete remote state |
| Publishing | `npm publish`, `docker push`, releases, deploys |

Read-only work (grep, builds, tests against local state, `git commit` on a branch) needs no confirmation — guard mode must not make normal development unbearable, or the user will turn it off.

### Layer 4 — dry-runs first

When a gated command supports a dry-run, **run the dry-run first, show the output, then ask to proceed**:

| Command | Dry-run form |
|---------|--------------|
| `git push` | `git push --dry-run` |
| `terraform apply` / `destroy` | `terraform plan` / `terraform plan -destroy` |
| `kubectl apply` / `delete` | `kubectl apply --dry-run=server`, `kubectl diff` |
| `rsync` | `rsync -n` (`--dry-run`) |
| `aws s3 rm` / `sync` / `cp` | `--dryrun` |
| `npm publish` | `npm publish --dry-run` |
| `helm install` / `upgrade` | `--dry-run` |
| `ansible-playbook` | `--check` |

If no dry-run exists, describe the exact expected effect before asking.

---

## Confirmation Format

```
GUARD: about to run a gated operation.
Command: <exact command>
Effect: <what it changes, where>
Reversible: <yes/how | NO>
Proceed? (yes / no / show me more first)
```

Wait for an explicit "yes". Silence, topic change, or a partial answer is a "no".

**Iron rule: never chain a confirmed operation with an unconfirmed one in the same shell command — one gated operation per confirmation.**

**Iron rule: a user confirmation covers that one invocation only. Re-running, retrying, or "the same but for prod" requires a fresh confirmation.**
