---
description: LLM features in production — prompt & context design, structured output, evals, cost/latency, prompt injection, fallbacks
argument-hint: "[--build <feature>] [--audit] [--evals] [--rag] [--cost]"
---

# /llm — AI Features

## Usage
```
/llm --build support-summary   — build an LLM feature properly
/llm --audit                   — audit an existing AI feature
/llm --evals                   — build the eval harness (do this before tuning prompts)
/llm --rag                     — retrieval design and diagnosis
/llm --cost                     — cost and latency pass
```
Field notes: `.claude/references/llm.md`. Security model: `.claude/references/security.md`.

## Overview
An LLM call is a non-deterministic, high-latency, per-token-priced network call whose **input and output are both untrusted**. Build accordingly: structured output with validation, evals instead of unit tests, a fallback when it fails, and a security model that never gives the model authority it can be talked into misusing.

The most common product failure isn't a bad model — it's shipping without evals, so nobody can tell whether the last prompt change helped.

---

## Phase 1: Decide whether the LLM is the right tool

Say it plainly when it isn't: deterministic extraction from structured data, exact arithmetic, permission decisions, and anything requiring a guaranteed format are cheaper and more reliable as code. Good fits: open-ended text (summarize, rewrite, classify with fuzzy boundaries), natural-language interfaces, and turning messy input into structure — where a human would also be approximate, and where a wrong answer is recoverable.

Then choose the **cheapest shape** that works: a single call with good context beats a chain; a chain beats an agent loop. Every added autonomy multiplies latency, cost, and failure modes.

## Phase 2: Build the call

1. **Structured output**: the provider's JSON-schema/tool mode, then validate against your own schema (Zod/Pydantic) — and design what happens when validation fails (one retry with the error, then a deterministic fallback; never a silent empty result).
2. **Context**: put the stable prefix (system prompt, schema, examples) first and unchanged so **prompt caching** applies; put variable data last. This is the biggest single lever on cost and time-to-first-token.
3. **One job per call.** Split extraction, classification and writing; compose them in code, where you can test each.
4. **Version the prompt** in the repository (not in a dashboard nobody diffs), and log the version with every call.
5. **Pin the model**, including its version; a silent provider upgrade changes behavior. Re-run evals before moving.
6. **Stream** user-facing generations; move anything long to a job with a visible status (`/jobs`).
7. **Fail gracefully**: timeout, retries with jitter for 429/5xx (never a blind retry after a side effect), and a degraded path when the provider is down — a feature that requires a healthy third party needs a stated behavior when it isn't.

## Phase 3: Security (non-negotiable)

Prompt injection is untrusted input reaching an interpreter that holds your privileges. Everything the model reads — retrieved documents, web pages, user files, tickets, PR comments — can carry instructions.

- Tools enforce **their own** authorization on the action and the session's rights; the prompt never grants permission.
- Treat output as user input: no `eval`, no shell, no SQL string-building, no fetching model-supplied URLs without an allowlist (SSRF), no rendering as raw HTML.
- Irreversible actions (send, pay, delete, publish) require human confirmation.
- Never place secrets in a prompt; assume anything in the context can be echoed back to the user.
- Retrieved content stored in a vector DB is *stored* injection — sanitize at ingestion.
- Personal data sent to a provider makes them a processor: DPA, retention, training-exclusion (`/rgpd`).

## Phase 4: Evals (`--evals`) — before prompt tuning, not after

1. Dataset: 20–100 real inputs, starting with the ones that failed in production. Keep it in the repo, versioned.
2. Graders per case, cheapest first: schema/exact match → rule-based assertions → LLM-as-judge (versioned judge prompt, spot-checked by a human).
3. Run on every prompt, model or retrieval change; report pass rate **per category**, and treat a category regression as a failing test.
4. Log every production call — input, output, model, prompt version, latency, tokens, cost, and user feedback. That log is where the next eval cases come from.

Without this, "the new prompt is better" is an opinion and every change is a coin flip.

## Phase 5: RAG (`--rag`), when retrieval is the answer

Retrieval fixes *knowledge*, not *reasoning*. Diagnose in this order, because the fix is different for each: **was the right chunk retrieved?** (if not, the prompt is irrelevant — fix chunking, hybrid keyword+vector, metadata filters) → **was it used?** (too many chunks dilute; the middle of a long context is used least) → **was the generation faithful?** (require citations and check them).

Chunking is the most under-rated variable: split on structure, keep overlap, carry metadata (source, section, date, permissions), and never split mid-argument. Filter by **permission at query time** — a RAG system that retrieves documents the user may not read is a data leak with a friendly interface.

## Phase 6: Cost & latency (`--cost`)

Measure per feature: tokens in/out, cost per call, p50/p95 latency, and calls per user per day. Then: cache the stable prefix, route easy tasks to a smaller model (measure quality per task first), trim retrieved context, cap output length, and set a per-user and per-day budget with an alert. An agent loop without a hard step and token cap is an unbounded invoice — set both.

## Phase 7: Report

```
## LLM Feature — <name>
Shape: <single call | chain | agent>   Model: <pinned id>   Prompt: v<n> (in repo)
Output: schema-validated ✓ · fallback on failure <what>
Security: tool authz ✓ · output treated as untrusted ✓ · human gate on <actions> ✓
Evals: <n> cases · pass <%> (per category) · run on every prompt change ✓
Cost: <$/call> · p95 <n>s · caching <hit %> · budget cap ✓
Degraded mode: <what users get when the provider is down>
```

## Rules
- No LLM feature ships without evals — a prompt change is a deploy with no test otherwise.
- Validate every output against a schema, and design the failure path.
- The model never holds authority a prompt can unlock; tools check permissions themselves.
- Never send secrets in a prompt, and never trust model-supplied URLs, code, or SQL.
- Pin the model and version the prompt in the repository; re-run evals before changing either.
- Tell the user what is AI-generated, keep correction easy, and never auto-publish generated content in high-stakes contexts.
