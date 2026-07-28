---
description: Architecture Decision Records — create, list, supersede, and promote decisions into docs/adr/
argument-hint: "[new <title>|list|show <n>|status <n> <state>|from-decisions|index]"
---

# /adr — Architecture Decision Records

## Usage
```
/adr new <title>            — write a new ADR from the decision at hand
/adr list                   — table of all ADRs with status
/adr show <n>               — display one ADR
/adr status <n> <state>     — accepted | superseded-by-<m> | deprecated | rejected
/adr from-decisions         — promote significant .claude/decisions.jsonl entries into ADRs
/adr index                  — index all ADRs into the RAG (collection <repo>-adr)
```

## Why ADRs

`.claude/decisions.jsonl` captures every decision cheaply. ADRs are the durable layer above it: **the decisions that will make someone ask "why on earth is it built this way?" in a year**. They live in the repo (`docs/adr/`), travel with the code, and get reviewed in PRs.

**Promote to an ADR when** the decision: shapes module boundaries or data flow; picks a technology/dependency with lock-in; is a one-way door (hard to reverse); trades off two qualities (speed vs consistency, cost vs latency); or contradicts an obvious default (the "why not X?" question is guaranteed).

**Keep in the jsonl when**: naming, scope cuts, small library picks, anything a `git log` would explain.

---

## Conventions

- Directory: `docs/adr/` (create on first use; if the repo already keeps ADRs elsewhere — `doc/adr`, `adr/`, `docs/decisions/` — **use the existing location**)
- Filename: `NNNN-kebab-title.md`, NNNN = zero-padded next number (scan existing files, never reuse a number)
- One decision per ADR. ADRs are **immutable once accepted** — a change of mind is a NEW ADR that supersedes the old one, never an edit

## Template

```markdown
# NNNN. <Title — an assertion, e.g. "Use one shared Chroma server for all sessions">

Date: <ISO date>
Status: accepted
<!-- accepted | superseded by [NNNN](NNNN-slug.md) | deprecated | rejected -->

## Context

<The forces at play: the problem, constraints (technical, team, deadline),
and why a decision was needed NOW. Facts, not opinions. 3-10 lines.>

## Decision

<What we decided, in active voice: "We will…". The single sentence someone
quotes in a code review.>

## Options considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| <chosen one> | | | — |
| <alternative> | | | <the killer reason> |

## Consequences

<What becomes easier, what becomes harder, what we now must do (migrations,
conventions to hold, revisit-when triggers). Include the negative ones —
an ADR with no downsides is marketing, not a record.>

## Links

<Related ADRs, the decisions.jsonl entry, PRs, issues, benchmarks.>
```

---

## new

1. Identify the decision: from the current conversation if one was just made, else ask the user for the context
2. **Interrogate before writing** — an ADR without real alternatives is worthless. If the conversation doesn't contain at least one seriously-considered alternative and the reason it lost, ask for them
3. Determine the next number, write the file from the template
4. Append a one-line reference to `.claude/decisions.jsonl` (schema per the decisions rule, with `"adr": "NNNN"`) so the two layers cross-link
5. If a RAG is available (`rag` MCP server), offer to `/adr index`
6. Report the path and a 2-line summary

## list

Scan the ADR directory; output:

```
| # | Title | Status | Date |
```

Flag gaps in numbering and ADRs whose status line is missing.

## status

Update the Status line of ADR `<n>`. For `superseded-by-<m>`: also verify ADR `<m>` exists and add a back-link ("Supersedes [NNNN]") in it. **Never edit any other section of an accepted ADR.**

## from-decisions

1. Read `.claude/decisions.jsonl`; select entries matching the promotion criteria above that have no `"adr"` field
2. Present the candidates as a short list; ask the user which to promote
3. For each chosen one, run the `new` flow seeded with the entry's context/alternatives/rationale, and write the `"adr"` back-reference

## index

Index every ADR into the RAG collection `<repo>-adr` (chunk per section, stable ids `adr-NNNN-<section>`, metadata `{"source","project","date","status"}`), so `/rag search "pourquoi <sujet>"` finds the why from any session.

---

**Iron rule: an ADR records why, not how.** Implementation details live in the code and docs; the ADR is the part `git log` cannot tell you. When reviewing or writing code that contradicts an accepted ADR, stop and surface it — either the code is wrong or a superseding ADR is due.
