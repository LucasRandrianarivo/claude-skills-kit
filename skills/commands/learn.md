---
description: Manage project learnings — show, add, search, and distill .claude/learnings.jsonl
argument-hint: "[text | --search <term> | --distill]"
---

# /learn — Project Learnings Manager

## Usage
```
/learn                   — show recent learnings, grouped by theme
/learn <text>            — add a learning manually
/learn --search <term>   — search learnings
/learn --distill         — compress duplicates/stale entries, promote recurring ones to CLAUDE.md
```

The learnings file is `.claude/learnings.jsonl` — schema and write-triggers are defined in the `learnings` rule (skills/rules/learnings.md). `/debug` and `/investigate` append to it automatically; this command is how you read and maintain it.

**Iron rule: never lose an entry.** Distill moves entries to `.claude/learnings.archive.jsonl` — it never deletes outright.

## Argument Parsing

Parse `$ARGUMENTS`:
- **Empty** → Show recent
- **`--search <term>`** → Search
- **`--distill`** → Distill
- **Anything else** → Add, using the full text as the learning

---

## Show Recent (default)

1. Read `.claude/learnings.jsonl`. If missing or empty: "No learnings recorded yet. /debug and /investigate log automatically; add one manually with `/learn <text>`." and exit.
2. Parse each line as JSON (skip and count malformed lines — report the count if > 0).
3. Group by theme: primary key is `category`; entries sharing 2+ `tags` with another group may be merged under the dominant tag.
4. Show the 20 most recent, newest first within each group:

```
## Learnings (23 total, showing 20)

### auth (5)
- 2026-07-21  [bug-fix]  Login 500 on valid creds → missing await on bcrypt.compare (src/auth/login.ts)
- 2026-07-14  [gotcha]   JWT clock skew: CI containers drift up to 30s → allow 60s leeway

### build (3)
- ...

Tip: 3+ entries in one theme? Run /learn --distill to promote a convention.
```

---

## Add

Build a full schema entry from the user's text:

1. Infer `type` (`bug-fix` / `gotcha` / `config` / `performance` / `pattern`), `category`, and `tags` from the text. If the text names a file, set `file`.
2. Map the text onto `symptom` / `root_cause` / `fix`. If the text only carries an insight (no symptom→fix shape), put the insight in `root_cause` and set `symptom` to the situation it applies to.
3. Show the constructed entry to the user. If any inferred field was a guess (type or category ambiguous), ask before writing; otherwise append directly.
4. Append as a single JSON line (create `.claude/` if needed). Confirm: "Logged under <category> — <N> total learnings."

---

## Search

Case-insensitive substring match of `<term>` against `tags`, `symptom`, `root_cause`, `fix`, `category`, and `file`. Show all matches (newest first) in the Show-Recent line format, plus each entry's `prevention` if set. No matches: say so and suggest 2–3 nearby terms that DO appear in the file (from tags).

---

## Distill

Distillation keeps the knowledge base sharp: duplicates compress, stale entries retire, recurring lessons graduate into conventions.

### Step 1: Load and classify

Read every entry. Then classify:

| Class | Detection | Action |
|-------|-----------|--------|
| Duplicate | Same root cause, different phrasings (compare `root_cause` + `tags` semantically, not string-equal) | Keep the newest/most complete entry; archive the rest |
| Stale | `file` field points to a file that no longer exists, or the code pattern it describes is gone (verify with Grep) | Archive, noting why |
| Contradiction | Two entries give opposite guidance on the same subject | Keep the newest; archive the older with a `superseded` note |
| Recurring | 3+ live entries in one theme (same category, or same root-cause shape) | Candidate for promotion — Step 2 |
| Healthy | None of the above | Keep as-is |

### Step 2: Promote recurring lessons to CLAUDE.md

A lesson that keeps recurring is not a memory — it is a project convention that should be enforced at write-time, not re-discovered at debug-time.

For each recurring theme, draft ONE imperative convention line, e.g.:
```
- Always `await` bcrypt/argon2 calls — they return promises (3 bugs traced to this).
- All timestamps are stored UTC; convert at the display layer only.
```

Present all drafted conventions to the user with numbered options (add all / pick / skip). On approval, append them under a `## Conventions` section in CLAUDE.md (create the section if absent, never duplicate an existing line). The source entries stay in the learnings file, tagged `"promoted"` added to their `tags`.

### Step 3: Rewrite

1. Append every archived entry to `.claude/learnings.archive.jsonl`, each with an added `"archived_reason"` field (`duplicate` / `stale` / `superseded`).
2. Write the surviving entries back to `.claude/learnings.jsonl` (valid JSONL, one entry per line, chronological order preserved).
3. Verify: line count of survivors + line count of newly archived = original count. If not, stop and restore from the original content — never proceed with a lossy rewrite.

## Output (distill)

```
## Distill Report

Before: 47 entries    After: 31 live, 16 archived

| Action        | Count | Examples |
|---------------|-------|----------|
| Deduplicated  | 9     | "bcrypt await" ×4 → 1 |
| Stale         | 5     | src/legacy/sync.ts deleted |
| Superseded    | 2     | tailwind v3 config guidance |
| Promoted      | 3     | → CLAUDE.md ## Conventions |

CLAUDE.md: +3 convention lines (approved by user)
Archive: .claude/learnings.archive.jsonl (16 entries, reasons noted)
```

---

## Rules

- Malformed JSONL lines are never silently dropped: count them, report them, and leave them untouched in the file (distill moves them to the archive with reason `malformed`).
- Learnings are project-scoped — never copy entries between repositories.
- Writing CLAUDE.md always requires user approval; the learnings files never do.
- When ~200 live entries accumulate, suggest `--distill` proactively — a knowledge base nobody can skim is a knowledge base nobody reads.
