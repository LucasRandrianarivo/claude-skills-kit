---
description: List, search, log, and explain project decisions recorded in .claude/decisions.jsonl
argument-hint: "[--search <term>] [--log \"<decision>\"] [--why <term>]"
---

# /decisions — Decision Log Browser

## Usage
```
/decisions                     — list recent decisions, grouped by area
/decisions --search <term>     — search decisions by keyword
/decisions --log "<decision>"  — append a decision manually (prompts for details)
/decisions --why <term>        — reconstruct the full story of a past decision
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **No arguments**: list mode
- **`--search <term>`**: search mode; the term is everything after the flag
- **`--log "<decision>"`**: log mode; the quoted text is the decision statement
- **`--why <term>`**: story mode; the term identifies the decision to explain

The log lives at `.claude/decisions.jsonl` (schema: `date`, `decision`, `context`, `alternatives`, `rationale`, `session` — see the `decisions` rule). If the file does not exist or is empty and the mode is not `--log`, say so and point the user at `/decisions --log` and the automatic logging rule, then exit.

Read the file and parse each line as JSON. Skip (and count) malformed lines; report the count at the end if nonzero — never crash on one bad line.

---

## Mode 1: List (default)

Show the most recent decisions (up to 20), grouped by area.

**Area inference** — the schema has no area field; derive one by matching `decision` + `context` against these buckets (first match wins, top-down):

| Area | Keywords |
|------|----------|
| architecture | architecture, layer, module boundary, monorepo, microservice, pattern, refactor |
| api | api, endpoint, route, contract, rest, graphql, webhook, versioning |
| data | database, schema, table, column, migration, index, query, orm |
| dependencies | dependency, library, package, framework, upgrade, replace, adopt |
| build-deploy | build, ci, cd, deploy, pipeline, docker, release, environment |
| ui | ui, component, design, style, css, layout, ux |
| testing | test, coverage, e2e, mock, fixture |
| scope | scope, cut, defer, drop, postpone, mvp |
| general | (no match) |

## Output (list)

```
## Decision Log — <N> decisions (<oldest date> → <newest date>)

### architecture (3)
| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-01-15 | Use TanStack Query for all server state | Caching built in, one less store |

### dependencies (2)
...

Malformed lines skipped: <n>          ← only if nonzero
Details: /decisions --why <term> · Search: /decisions --search <term>
```

Order groups by most recent decision in each; within a group, newest first. Truncate `rationale` at ~80 chars in the table.

---

## Mode 2: Search (`--search <term>`)

Case-insensitive substring match of the term against `decision`, `context`, `alternatives`, and `rationale`. Newest first, no limit.

## Output (search)

```
## Decisions matching "<term>" — <N> found

| Date | Decision | Context | Session |
|------|----------|---------|---------|
| 2025-01-15 | <decision> | <context> | 2025-01-15-orders-module |

No matches → say so and show the 5 most recent decisions instead, so the user can recalibrate the term.
```

---

## Mode 3: Log (`--log "<decision>"`)

Append one entry manually. The decision statement comes from the argument; gather the rest by asking the user — one compact prompt, not an interrogation:

1. **context** — "What forced this decision?" (one line)
2. **alternatives** — "What else was considered?" (semicolon-separated, or `none`)
3. **rationale** — "Why did this option win?" (one line)

If the user's original message already contains any of these, do not re-ask for them — extract and confirm.

Then build the entry:
- `date`: today, `YYYY-MM-DD`
- `session`: `<date>-<current-task-slug>` (derive the slug from what this session is working on; `manual` if idle)
- Run the `redact` rule's secret scan on all fields before writing — **never log a secret**
- Ensure `.claude/` exists; append the entry as a single JSON line to `.claude/decisions.jsonl`

## Output (log)

```
Logged:
{"date":"...","decision":"...","context":"...","alternatives":"...","rationale":"...","session":"..."}

Entry #<N> in .claude/decisions.jsonl
```

---

## Mode 4: Why (`--why <term>`)

Reconstruct the full story of a past decision from the log plus git history.

### Phase 1: Find the thread

1. Search the log as in Mode 2. Collect ALL matching entries in chronological order — reversals and refinements are part of one story
2. If nothing matches, fall back to git only (Phase 2) and say the log has no entry — then suggest logging the conclusion with `/decisions --log` once reconstructed

### Phase 2: Correlate with git history

For each matching entry (and the term itself):

```bash
git log --all -i --grep="<term>" --oneline --date=short --pretty="%h %ad %s"
git log --all -S"<term>" --oneline --date=short --pretty="%h %ad %s"   # pickaxe: code that added/removed the term
git log --all --since="<entry date> - 3 days" --until="<entry date> + 7 days" --oneline --date=short
```

Cross-reference: commits within a week of an entry's date that touch the same area are candidates for "the implementation of this decision". Check `git log` on files the decision obviously concerns (e.g. `package.json` for a dependency decision, migration folders for a schema decision).

### Phase 3: Check current state

Verify whether the decision still holds in the code today (is the library still in `package.json`? does the pattern still exist?). A decision that history reversed without a log entry is a finding — report it.

## Output (why)

```
## Why: <term>

### Timeline
| Date | Event | Source |
|------|-------|--------|
| 2025-01-10 | Decision: <decision> | log entry (session <session>) |
| 2025-01-12 | Implemented in <short-sha> "<commit subject>" | git |
| 2025-03-02 | Revised: <decision> | log entry |

### The story
<3-8 sentences, chronological: what question came up (context), what was
considered (alternatives), what won and why (rationale), how it landed in
code (commits), and whether it still holds.>

### Current state
<Holds / Partially holds / Silently reversed> — <one-line evidence from the code>

### Sources
- Log entries: <count> (dates)
- Commits: <sha list>
```

**Iron rule: the story must distinguish what the log says (recorded fact) from what git suggests (inference). Never present an inference as a recorded decision.**
