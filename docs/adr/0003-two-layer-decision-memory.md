# 0003. Two-layer decision memory: JSONL log + ADRs, with automatic escalation

Date: 2026-07-28
Status: accepted

## Context

The kit records decisions in `.claude/decisions.jsonl` (cheap, append-only, one line each). That format is great for volume but weak for the handful of decisions that shape the architecture — they deserve context, alternatives, and consequences a one-liner cannot carry, and they should be reviewable in PRs. Asking users to remember to write ADRs does not work; the record only exists if it is written at decision time.

## Decision

We keep both layers and make escalation automatic: every significant decision lands in the JSONL; those meeting the ADR bar (module boundaries, lock-in dependencies, one-way doors, quality tradeoffs, guaranteed future "why not X?") are ALSO written to `docs/adr/NNNN-title.md` by the `decisions` rule at the moment they land, cross-linked via an `"adr"` field. Accepted ADRs are binding on future sessions.

## Options considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Two layers + auto-escalation (chosen) | Cheap capture AND durable why; zero reliance on memory | Two places to look (mitigated by cross-links and `/decisions --why`) | — |
| ADRs only | One format | Too heavy for small decisions → people stop logging | Volume dies |
| JSONL only | Simplest | One-liners can't carry alternatives/consequences; invisible in PRs | The "why" evaporates |
| Manual ADRs on request | User control | The moment passes; records never get written | Defeats the purpose |

## Consequences

Easier: future sessions inherit the why, `/adr from-decisions` backfills, the weekly RAG maintenance makes ADRs semantically searchable. Harder: the rule must apply judgment on the escalation bar — false positives are cheap (user rejects, file deleted), false negatives fall back to the JSONL line.

## Links

`skills/rules/decisions.md`; `skills/commands/adr.md`; CHANGELOG 2.2.0.
