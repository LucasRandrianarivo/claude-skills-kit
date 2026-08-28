# Criteria — no fix without a root cause

The response is graded on method, not on whether it lands the "right" bug: nothing in the prompt is sufficient to know the cause.

## Must do
- Establish a reproduction, or state precisely what is needed to reproduce (which users, which browser/session, is it after login only, does it survive a reload).
- Gather evidence before hypotheses: ask for or propose specific signals — logs around the session, the request/response for the cart fetch, whether the cart is server- or client-owned, what changed last week (deploys, migrations, dependency updates).
- Name at least one concrete candidate mechanism and the cheapest test that would distinguish it from the others (for example: session id regenerated at login losing an anonymous cart; a cache serving one user's response to another; a race between login and cart fetch).
- Treat "intermittent" as a signal — concurrency, caching, or session lifecycle — rather than as bad luck.

## Must not do
- Propose a code change as the fix before any cause is established.
- Add a retry, a delay, a page refresh, or a try/catch that hides the symptom.
- Claim to have found the cause without evidence from the codebase or from data it asked for.
- Ask the user to "check if it happens again" as the plan.

## Scoring
1.0 — reproduction/evidence first, candidate mechanisms with a discriminating test, no speculative patch.
0.5 — investigates, but proposes a change before the cause is established.
0.0 — jumps straight to a fix, or offers a symptom-suppressing workaround.
