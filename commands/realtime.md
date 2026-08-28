---
description: Realtime features — WebSocket vs SSE vs polling, reconnection, presence, ordering, scaling across instances, backpressure
argument-hint: "[--build <feature>] [--audit] [--scale]"
---

# /realtime — Live Updates

## Usage
```
/realtime --build notifications   — implement a realtime feature
/realtime --audit                 — audit an existing realtime layer
/realtime --scale                 — make it work across multiple instances
```
Field notes: `.claude/references/distributed.md`, `.claude/references/http.md`.

## Overview
"Realtime" fails in three predictable ways: it works with one server and breaks with two (no shared pub/sub), it works on WiFi and breaks on mobile (no reconnection with state recovery), and it works with 10 users and melts with 10,000 (per-connection state, no backpressure).

The first decision decides most of the rest: **do you actually need a socket?**

---

## Phase 1: Choose the transport honestly

| Need | Use |
|---|---|
| Server → client only (feeds, notifications, progress, LLM streaming) | **SSE** — plain HTTP, auto-reconnect with `Last-Event-ID`, works through most proxies, no special infra |
| Bidirectional, low latency (chat, collaborative editing, games) | **WebSocket** |
| Updates every ≥10s, few clients, simple | **Polling** — boring, debuggable, and correct more often than teams admit |
| Data changes rarely but must feel instant | Polling with `ETag`/304, or SSE |

Prefer SSE when it fits: it's HTTP, so auth, proxies, load balancers, and observability all work the way the rest of your stack does. Choose a hosted realtime service (Pusher/Ably/Supabase Realtime/Centrifugo) when connections outnumber your appetite for operating them.

## Phase 2: Build the connection lifecycle

The part everyone under-builds. A connection is *not* a stable resource:

1. **Authenticate at connect**, and re-check authorization per subscription — a socket that authenticated 6 hours ago must not still be receiving a channel the user has since lost access to. Short-lived ticket/token for the handshake, and a server-side check on every `subscribe`.
2. **Reconnect with backoff and jitter**: mobile networks drop constantly. Without jitter, a server restart brings every client back in the same second and knocks it over again.
3. **Recover missed messages** — this is what separates a demo from a product. Either the client replays from a cursor (`Last-Event-ID`, a sequence number, a "since" query) or, on reconnect, it **refetches the current state** and resumes. Never assume the stream was continuous.
4. **Heartbeats both ways**: proxies kill idle connections (nginx `proxy_read_timeout`, cloud LBs at 60s). Ping/pong, or a comment frame for SSE, keeps them alive and detects half-open connections that TCP still thinks are fine.
5. **Clean up on disconnect**: subscriptions, presence entries, timers, and per-connection buffers. Leaks here are why memory grows for days and then falls over.

## Phase 3: Correctness of the stream

- **Order and duplication**: the same rules as any distributed delivery — include a sequence/version per entity and let the client drop stale updates. Never let the UI trust arrival order.
- **The event is a signal, not the truth**: for anything important, send an id and let the client fetch (or send the full state *with* a version). Payload-only updates drift from the database when one message is lost.
- **Optimistic UI + reconciliation**: apply locally, then reconcile with the authoritative update — including the case where the server rejects it (rollback path, `/state`).
- **Fan-out authorization**: every message is filtered by what *that* subscriber may see. A single broadcast that includes another tenant's row is a data leak with an audience.

## Phase 4: Scale across instances (`--scale`)

- With more than one app instance, a connection lives on one of them, so **publishing must go through a shared bus** (Redis pub/sub, NATS, a broker, or the hosted service). Publishing to local subscribers only is the "works on my single instance" bug.
- **Sticky sessions** are needed for WebSocket upgrades behind most load balancers — or use a service designed for it.
- Connections are memory: budget per connection (buffers, subscriptions, presence) and set a hard cap per instance. Know the number before the launch, not during it.
- **Backpressure**: a slow client must not grow an unbounded server-side buffer. Drop, coalesce (keep only the latest state per entity), or disconnect — decide which, per stream.
- **Coalesce and batch**: a cursor position or a progress bar does not need 60 messages per second; throttle to what the UI can render.
- Deploys drop every connection. With reconnection + state recovery that's invisible; without, it's an outage every deploy.

## Phase 5: Infrastructure

Nginx/proxies: `proxy_http_version 1.1`, the `Upgrade`/`Connection` headers with the `map` block, `proxy_buffering off` for SSE, and a `proxy_read_timeout` above your heartbeat interval (`references/devops.md`). Serverless platforms generally cannot hold connections — that constraint decides your architecture, so check it first.

## Phase 6: Report

```
## Realtime — <feature>
Transport: <SSE/WS/polling> — why: <one line>
Auth: at connect ✓ · per-subscription ✓ · re-checked on privilege change ✓
Reconnect: backoff+jitter ✓ · missed-message recovery: <cursor | refetch>
Ordering: <sequence/version guard>   Fan-out filtering: per-subscriber ✓
Scale: shared bus <x> ✓ · sticky ✓ · max connections/instance <n> · backpressure <policy>
Infra: heartbeat <n>s < proxy timeout <n>s ✓
Tested: server restart ✓ · network drop ✓ · slow consumer ✓ · two instances ✓
```

## Rules
- Prove you need a socket before opening one; polling and SSE solve most cases with less to break.
- Authorization is re-checked per subscription and on privilege change, never only at connect.
- Every client must survive a disconnect without losing state — reconnect *and* recover, or refetch.
- Never publish to local subscribers only when more than one instance exists.
- Every stream has a backpressure policy; unbounded per-connection buffers are forbidden.
- Test with the server restarted, the network dropped, and two instances running — those three find nearly every realtime bug.
