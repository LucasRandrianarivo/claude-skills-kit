# Field notes — LLM features in products

Consulted by `/llm`, `/integrate`, `specialist-security`, `/cost`.

---

## The mental model

An LLM call is a **non-deterministic, high-latency, priced-per-token network call whose input is untrusted and whose output is untrusted**. Every engineering decision follows from those four properties:
- Non-deterministic → you need evals, not unit tests, and a fallback for bad output.
- High latency → stream, or make it asynchronous; never block a page render on it.
- Priced per token → context size is a cost line, and caching is a real optimization.
- Untrusted in and out → prompt injection is an injection class, and output is user input to your next system.

## Getting reliable output

- **Structured output over parsing prose**: use the provider's JSON-schema/tool-calling mode. Validate against your own schema anyway (Zod/Pydantic) and handle the failure — the model can return valid JSON that is semantically wrong.
- **One job per call.** A prompt doing extraction + classification + writing fails at whichever part is hardest, and you can't tell which. Split, then compose.
- **Put the instruction after the data** for long contexts, and keep the format specification adjacent to the output requirement.
- **Few-shot examples beat adjectives.** "Be concise" is weak; two examples of the exact output shape are strong.
- **Temperature 0 doesn't mean deterministic** (batching, model updates, and sampling implementation all vary). Version-pin the model and treat outputs as a distribution.
- **Long context degrades**: information in the middle is used less reliably than at the ends. Retrieve less, better — dumping 200 documents is worse than retrieving 5 relevant ones.

## Prompt injection — the security model

Anything the model reads is instructions to it: a web page it fetched, a PDF a user uploaded, a PR comment, a support ticket, an email. Defenses are architectural, not phrasing:
1. **Never grant the model authority it can be talked into misusing.** Tools enforce their own permission checks on the *action* and the *session's* rights — never on what the prompt says.
2. **Treat output as untrusted input**: no `eval`, no shell, no SQL built from it, no fetching its URLs without an allowlist, no rendering as HTML without sanitizing.
3. **Isolate untrusted content** in the prompt (delimit it and say it is data), while knowing this is mitigation, not a boundary.
4. **Human confirmation for irreversible actions** (sending mail, moving money, deleting, publishing).
5. Retrieved content that gets stored in a vector DB is stored injection — sanitize at ingestion, not just at query time.

## Evals — the thing teams skip and then regret

A prompt change is a deploy with no test. Build the smallest useful harness early:
- A dataset of 20–100 real inputs with known-good expectations (start with the cases that failed in production).
- Graders per case: exact/schema match where possible, then rules, then LLM-as-judge for open-ended output (with the judge's own prompt versioned, and spot-checked by a human).
- Run it on every prompt or model change; track pass rate per category over time. Without this, "the new model is better" is a vibe.
- Log every production call's input, output, model, prompt version, latency, tokens and cost — the eval dataset comes from these logs.

## Cost & latency

- Cost is dominated by **input** tokens in most RAG/agent designs; the retrieved context is the bill.
- **Prompt caching** (where the provider offers it): put the stable prefix — system prompt, schema, examples — first and unchanged; put the variable part last. This is the single biggest lever on both cost and time-to-first-token.
- Route by difficulty: a small/fast model for classification and extraction, a large one for reasoning-heavy steps. Measure quality per task before assuming you need the biggest model.
- **Stream** so time-to-first-token is what the user feels; do the rest asynchronously with a job (`/jobs`) when it's long.
- Set a per-request token cap and a per-user/per-day budget with an alert. An agent loop with no cap is an unbounded invoice.
- Retries: LLM APIs rate-limit and time out like any vendor (`/integrate`) — backoff with jitter, and never silently retry a call that already had a side effect.

## RAG, when it's the answer

Retrieval helps when the answer exists in a corpus and must be current or private. It does not fix reasoning. The failure modes, in order of frequency: **bad chunking** (splitting mid-argument, no overlap, no metadata), **retrieval that matches words rather than intent** (hybrid keyword+vector beats pure vector for names, ids and codes), **too many chunks** (dilutes the context), and **no citation** (users can't verify, and you can't debug). Measure retrieval separately from generation — if the right chunk wasn't retrieved, the prompt is not the problem.

## Product rules that matter more than the model

- Tell the user what is AI-generated, and make correction easy.
- Never let generated content reach a customer unreviewed in high-stakes contexts (legal, medical, financial, HR).
- Log enough to explain a specific answer to a specific user later.
- Personal data sent to a provider is a processor relationship: check the DPA, retention, and training-exclusion terms (`/rgpd`).
- Have a fallback path when the provider is down or slow — a feature that only exists when a third party is healthy needs a degraded mode.

## Where this gets decided wrong

- Fine-tuning before trying better retrieval and better prompts — expensive, slow to iterate, and usually unnecessary.
- Building an autonomous agent loop where a deterministic workflow with one LLM step would be more reliable and 10× cheaper.
- Shipping without evals, then discovering the regression from a customer.
- Trusting the model's confidence: fluency and correctness are unrelated.

## Where to check the current truth
Models, prices, context limits and caching rules change monthly — never answer these from memory. Fetch and cite these before stating a version-specific fact — the `expertise` rule requires it:
- Anthropic documentation — https://docs.claude.com (models, pricing, prompt caching, tool use)
- OWASP Top 10 for LLM Applications — https://genai.owasp.org
- The provider's own changelog before pinning or migrating a model
