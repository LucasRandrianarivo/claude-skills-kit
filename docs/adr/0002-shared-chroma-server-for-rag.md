# 0002. Use one shared Chroma server in Docker for the local RAG

Date: 2026-07-28
Status: accepted

## Context

`setup-rag` (2.1.0) gives every Claude Code session a local semantic memory. Users commonly run several sessions in parallel across projects. Chroma's embedded mode (one `PersistentClient` per process over the same SQLite directory) produces `database is locked` failures under concurrent writers — observed in testing.

## Decision

We run a single Chroma server container (`claude-rag`, `--restart unless-stopped`, data volume under `~/.claude/rag-server`) and register the MCP bridge as an HTTP client. All sessions are clients of one coordinated writer.

## Options considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Shared Docker server (chosen) | Real write coordination; survives reboots; one datastore | Requires Docker running | — |
| Embedded per-session SQLite | No Docker dependency | Lock conflicts with parallel sessions — the primary use case | Verified failure mode |
| Cloud vector DB (Supabase/Pinecone) | No local service | Account, API key, data leaves the machine | Violates the local-only promise (ADR 0001) |

## Consequences

Easier: parallel sessions, one source of truth, `docker start claude-rag` is the whole recovery story. Harder: Docker becomes a prerequisite for the RAG feature (and only for it); a SessionStart hook auto-heals the container. Embeddings still run client-side (local ONNX), so the server stores but never phones home.

## Links

CHANGELOG 2.1.0; `bin/install.js` `cmdSetupRag()`.
