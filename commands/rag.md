---
description: Use the shared local RAG — status, index documents, semantic search across projects
argument-hint: "[status|index <path> [collection]|search <query> [collection]|collections]"
---

# /rag — Shared Local Semantic Memory

## Usage
```
/rag status                        — server health, collections, document counts
/rag collections                   — list collections with counts
/rag index <path> [collection]     — index a file or directory of documents
/rag search <query> [collection]   — semantic search (all collections if omitted)
```

## Prerequisite

This command uses the `rag` MCP server installed by `npx claude-skills-kit setup-rag` (Chroma in Docker, local embeddings). If the MCP tools are unavailable, tell the user to run that setup command and stop.

## Argument Parsing

Parse `$ARGUMENTS`: first word is the subcommand (default `status`). Remaining words are the path/query and optional collection name.

---

## status

1. `chroma_list_collections`; for each, get the document count
2. If the call fails: run `docker ps --filter name=claude-rag` — if the container is down, `docker start claude-rag`, wait 3 s, retry once; if Docker itself is down, tell the user to start it
3. Report:

```
## RAG status
Server: UP (localhost:<port>)  ·  Collections: <n>  ·  Documents: <total>
| Collection | Docs | Last indexed (max date metadata) |
```

## collections

List every collection with its count and the distinct `project` metadata values found in a sample. Flag empty collections.

## index

1. Resolve the target: a single file, or every `*.md`/`*.txt`/`*.rst` under the directory (recursively). **Never index**: source code, `.env` files, lockfiles, `node_modules`, anything matching secret patterns (keys, tokens, connection strings) — skip and report skipped files
2. Choose the collection: the one given, else infer `<repo-name>-docs`; check `chroma_list_collections` first and reuse an existing collection rather than creating a near-duplicate name
3. For each document: split into chunks of 500–1500 characters on paragraph boundaries; ids `<file-slug>-<chunk-n>` (stable — re-indexing the same file must overwrite, not duplicate); metadata `{"source": "<relative path>", "project": "<repo name>", "date": "<ISO today>"}`
4. Upsert via `chroma_add_documents`, then verify with one `chroma_query_documents` sanity query
5. Report: files indexed, chunks written, files skipped and why

## search

1. `chroma_query_documents` with the query, `n_results: 5`, on the given collection — or on each collection when none is given (then merge and rank by distance)
2. Present results with their `source` metadata so the user can open the original:

```
## RAG results for: "<query>"
1. <source> (<collection>, distance <d>)
   <snippet>
```

3. If the best distance is poor (> ~1.3), say so honestly — do not present weak matches as answers.

**Iron rule: RAG results are leads, not truth.** When a result will drive a decision, open the source file and verify the claim is still current before acting on it.
