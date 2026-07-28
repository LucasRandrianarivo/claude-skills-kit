# Rule: Freeze — Directory-Scoped Edit Lock

## Status: Always Active

This rule watches for freeze requests. When a freeze is active, ALL file edits are restricted to one directory subtree for the rest of the session.

---

## Triggers

| User says | Action |
|-----------|--------|
| `freeze to <dir>` / `/freeze <dir>` | Activate a freeze on `<dir>` |
| `freeze edits to <dir>` / `only edit <dir>` | Activate a freeze on `<dir>` |
| `unfreeze` / `/unfreeze` / `lift the freeze` | Deactivate the freeze |
| `freeze to <other-dir>` while a freeze is active | Replace the boundary (confirm first) |

## State

File: `.claude/freeze` — a single line containing the frozen directory, relative to the project root (e.g. `src/modules/auth`).

The file is the source of truth. It survives across turns and sessions: **check for `.claude/freeze` before every Edit or Write**, not just after seeing a freeze request in the conversation. A freeze set in an earlier session is still binding.

### On activation

1. Resolve the requested directory relative to the project root. If it does not exist, ask the user to confirm the path (present the closest existing candidates as numbered options).
2. Write the normalized path (no trailing slash) as the only line of `.claude/freeze` (create `.claude/` if needed).
3. Confirm: "Freeze active: edits restricted to `<dir>/`. Say `unfreeze` to lift it."

### On deactivation

Delete `.claude/freeze` and confirm the freeze is lifted. Only the user can unfreeze — never lift the freeze on your own because an edit would be convenient.

---

## Enforcement

Before every Edit or Write, if `.claude/freeze` exists and is non-empty:

1. Resolve the target file path to project-root-relative form.
2. The edit is allowed only if the path is inside the frozen subtree. Compare with a path separator appended to the boundary so `src` never matches `src-old`.
3. If outside, REFUSE the edit:

```
BLOCKED by freeze: <file> is outside the frozen directory (<dir>/).
The freeze restricts all edits to <dir>/ for this session.
Say "unfreeze" to lift it, or "freeze to <other-dir>" to move the boundary.
```

Then explain what you would have changed and why, so the user can decide whether to unfreeze or handle it differently. Do not silently skip the change.

### Always-allowed paths

| Path | Reason |
|------|--------|
| `.claude/freeze` | Needed to change or lift the freeze itself |
| `.claude/*.jsonl` (learnings, decisions logs) | Session state, not project code |

### Bash is covered too

The freeze is about intent, not just the Edit/Write tools. Do not route around it with shell commands: no `sed -i`, `tee`, `>`/`>>` redirection, `mv`, `cp`, `patch`, or heredoc writes targeting files outside the boundary. Read-only commands (`cat`, `grep`, `git diff`, builds, tests) are unaffected.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Edit target is the frozen directory itself (a file directly in it) | Allowed |
| New file creation outside the boundary | Blocked — same rule as edits |
| `git commit` / `git add` of files outside the boundary | Allowed — the freeze governs *modifying* files, not committing pre-existing changes |
| Generated files (lockfiles, build output) touched by a build command | Allowed — the freeze targets deliberate source edits |
| The fix genuinely requires touching a file outside the boundary | Refuse, explain the dependency, and ask: 1) unfreeze, 2) widen the freeze, 3) skip that change |
| `.claude/freeze` contains a path that no longer exists | Warn the user, ask whether to unfreeze or set a new boundary |

**Iron rule: never edit outside the frozen subtree without the user lifting or widening the freeze first — no exceptions for "small" or "obviously safe" changes.**

This is an accident guard for scoped work (e.g. debugging one module without "fixing" unrelated code), not a security boundary.
