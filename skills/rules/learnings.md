# Rule: Learnings — Bug & Fix Knowledge Base

## Status: Always Active

This rule maintains a persistent knowledge base of bugs, fixes, and gotchas discovered during development. Entries are logged after each debug session and consulted at the start of new ones.

---

## Storage

File: `.claude/learnings.jsonl`

Each line is a self-contained JSON object:

```json
{"timestamp":"2025-01-15T14:30:00Z","type":"bug-fix","category":"auth","file":"src/auth/login.ts","symptom":"Login returns 500 on valid credentials","root_cause":"bcrypt compare was awaited incorrectly — missing await on async compare","fix":"Added await to bcrypt.compare() call on line 42","tags":["async","bcrypt","auth"],"prevention":"Always await bcrypt methods — they return promises"}
```

## Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | ISO 8601 string | Yes | When the learning was recorded |
| `type` | enum | Yes | `bug-fix`, `gotcha`, `config`, `performance`, `pattern` |
| `category` | string | Yes | Module or area (e.g., `auth`, `api`, `build`, `deploy`) |
| `file` | string | No | Primary file involved |
| `symptom` | string | Yes | What the user observed / what went wrong |
| `root_cause` | string | Yes | Why it happened |
| `fix` | string | Yes | What was done to resolve it |
| `tags` | string[] | Yes | Searchable keywords |
| `prevention` | string | No | How to avoid this in the future |

## Types

| Type | When to log |
|------|-------------|
| `bug-fix` | After fixing a bug during `/debug` or development |
| `gotcha` | When discovering a non-obvious behavior or footgun |
| `config` | When a configuration issue causes problems |
| `performance` | When diagnosing/fixing a performance issue |
| `pattern` | When discovering a pattern that should be reused |

---

## When to Write

Log a learning entry after:

1. **Fixing a bug** — any bug resolved during `/debug` or development
2. **Discovering a gotcha** — non-obvious behavior that caused confusion
3. **Resolving a config issue** — environment, build, or deploy configuration
4. **Finding a performance issue** — slow queries, memory leaks, bundle size
5. **Establishing a pattern** — a new pattern that other code should follow

**Do NOT log:**
- Trivial typo fixes
- Simple syntax errors
- Issues that are one-off and project-unrelated

## When to Read

Consult `.claude/learnings.jsonl` at the start of:

1. **`/debug`** — search learnings by tags matching the current error
2. **`/feat`** — search learnings by category matching the feature area
3. **Any error diagnosis** — check if this symptom has been seen before

### Search Strategy

When consulting learnings:
1. Read the file
2. Parse each JSON line
3. Search by:
   - `tags` matching keywords from the current error message
   - `category` matching the current module/area
   - `symptom` containing similar error text
   - `file` matching the currently affected file
4. If a match is found, apply the known fix before trying other approaches

## Maintenance

- The file is append-only — never edit or delete existing entries
- If the file grows beyond 200 entries, the oldest entries may be archived
- Ensure the `.claude/` directory exists before writing (create if not)
- Each entry must be valid JSON on a single line (JSONL format)
