# 0001. Ship methodology as plain markdown — no runtime infrastructure

Date: 2026-07-28
Status: accepted

## Context

v2.0.0 ported the full methodology of gstack, whose skills depend on a TypeScript browser daemon, Supabase telemetry, host adapters, and per-host preamble scripts. We had to decide whether to port that infrastructure or only the methodology. The kit's promise since 1.0.0 is `npx claude-skills-kit init` with zero dependencies and no lock-in.

## Decision

We ship every skill as a plain markdown file that relies only on Claude Code native capabilities (Bash, file tools, MCP, `npx`-invocable standard tooling). No daemons, no telemetry, no accounts, no background processes installed by `init`.

## Options considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Markdown only (chosen) | Zero install friction, editable by users, nothing to maintain per-OS | Some gstack features (persistent browser, telemetry dashboards) cannot be replicated | — |
| Port gstack's TS runtime | Feature parity incl. browser daemon | Huge maintenance surface, platform bugs, breaks the zero-dependency promise | Cost dwarfs the value; Playwright via npx covers the browser needs |
| Hybrid (markdown + optional daemon) | Best of both | Two codepaths to test and document | Complexity without a demanded feature |

## Consequences

Easier: installs stay instant and auditable; users customize by editing files. Harder: anything requiring persistent state between sessions must live in files (`.claude/*.jsonl`, `docs/adr/`) or in explicitly opt-in externals (see ADR 0002). Revisit if Claude Code gains a first-party background-service API.

## Links

CHANGELOG 2.0.0; gstack comparison in the v2 PR body.
