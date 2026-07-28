# Rule: Decisions — Decision Log

## Status: Always Active

This rule maintains a durable log of significant decisions made during development sessions. Six months from now, "why is this a monorepo?" should have an answer that isn't archaeology. Entries are appended when decisions are made and consulted before revisiting settled questions.

---

## Storage

File: `.claude/decisions.jsonl`

Each line is a self-contained JSON object:

```json
{"date":"2025-01-15","decision":"Use TanStack Query for all server state; no Redux","context":"Choosing state management for the orders module","alternatives":"Redux Toolkit + RTK Query; SWR; hand-rolled fetch hooks","rationale":"Caching/invalidation built in, team knows it, one less store to sync","session":"2025-01-15-orders-module"}
```

## Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | `YYYY-MM-DD` | Yes | When the decision was made |
| `decision` | string | Yes | The decision itself, stated as a fact ("Use X", "Drop Y", "Accept Z") |
| `context` | string | Yes | What question or task forced the decision |
| `alternatives` | string | Yes | Options considered and rejected (semicolon-separated); `"none"` if there were none |
| `rationale` | string | Yes | Why this option won — the tradeoff, not a sales pitch |
| `session` | string | Yes | Session identifier: `<date>-<task-slug>` (e.g. `2025-01-15-orders-module`) |

---

## When to Write

Append an entry whenever a **significant** decision is made:

1. **Architecture choice** — pattern, layering, module boundary, sync vs async
2. **Dependency added or replaced** — library, framework, service, tool
3. **API shape** — endpoint contract, naming scheme, versioning, breaking change accepted
4. **Tradeoff accepted** — known limitation shipped deliberately (perf, coverage, edge case)
5. **Scope cut** — feature or requirement dropped or deferred, and why
6. **Data model change** — table added, column semantics, migration strategy
7. **Convention established** — naming, file layout, error handling policy other code should follow

**Do NOT log:**
- Implementation details with no alternative worth naming (variable names, loop shape)
- Decisions the user reversed within the same session (log only the final state)
- Anything containing a secret — the `redact` rule applies to log entries too

**The test:** would a teammate (or future session) plausibly ask "why did we do it this way?" If yes, log it.

## Writing Discipline

- One JSON object per line, valid JSONL — no pretty-printing, no trailing commas
- Keep every field one line and factual. No hedging, no narrative — the `/decisions --why` command reconstructs the story later from this plus git history
- Append-only: never edit or delete existing entries. If a decision is reversed, append a NEW entry whose `decision` states the reversal and whose `context` names the entry it supersedes
- Log at the moment the decision lands (user approves, or you commit to an approach), not in a batch at session end
- Ensure `.claude/` exists before writing (create if not)

## When to Read

Consult `.claude/decisions.jsonl`:

1. **Before proposing an architecture or dependency change** — check whether this ground is already settled; do not silently relitigate a logged decision
2. **At the start of `/feat`** — scan for decisions touching the feature's area
3. **When the user asks "why …"** about past design — answer from the log via `/decisions --why <term>` before guessing from code
4. **When something looks wrong on purpose** — a logged tradeoff explains deliberate weirdness; check before "fixing" it

If a new decision contradicts a logged one, say so explicitly to the user, and log the reversal once confirmed.
