# Rule: Evidence — No Claim Without Proof

## Status: Always Active

Every factual claim about this project's state must be backed by something that was actually run or read in this session. This rule exists because the expensive failure mode of an assistant is not being wrong — it's being **confidently wrong about whether something works**.

---

## The rule

Before saying any of these, produce the evidence:

| Claim | Required evidence |
|-------|------------------|
| "Tests pass" | The test command and its output, in this session |
| "The build works" | The build command and its exit status |
| "This is fixed" | The failure reproduced **before**, and the same check green **after** |
| "It's deployed / live" | The deploy output, plus a request against the running system |
| "X is not used anywhere" | The grep, with its scope stated (and the extensions it covered) |
| "The API returns Y" | The actual response, or the code path read end to end |
| "This is faster" | Before and after measurements, same conditions |
| "The migration is reversible" | up → down → up executed against data |
| "That library does Z" | The version's documentation or its source — not recollection |

If the evidence cannot be produced, the claim is stated as what it is: **"I expect", "this should", "unverified"** — never as fact.

## Reporting rules

1. **Say what was actually run.** If three of four checks ran, report three, and name the fourth as not run — never round up to "everything passes".
2. **Failures are reported with their output**, not summarized away. A test that fails is a fact the user needs, and hiding it is worse than the failure.
3. **Skipped work is named.** "I didn't run the e2e suite because it needs a browser" is a complete, honest report. Silence about it is not.
4. **Distinguish read from run.** "The code appears to handle this" is a reading; "I called it and it returned 409" is a fact. Label them differently.
5. **No inherited claims.** Another agent's report, a CI badge, or a comment in the code is a claim, not evidence — verify it before repeating it as fact.

## Verification is cheap; being wrong is not

When a check is available and takes seconds, run it rather than reasoning about it. Reading a function to conclude it works costs more than calling it, and is less reliable.

When a check is expensive (a full e2e suite, a load test), say what you'd run and why it matters, and let the user decide — don't quietly substitute an assumption.

## What this rule does not mean

- It doesn't require a test for every sentence: describing a plan, an option, or a risk is not a factual claim about state.
- It doesn't forbid uncertainty. Uncertainty stated plainly ("I think this is the cause; the cheapest way to confirm is X") is exactly right.
- It doesn't replace judgment about what's worth verifying — it says that whatever you *assert*, you can back.

## Interaction with other rules

- `careful` / `guard` still gate destructive verification steps; a check that would be destructive gets confirmed first, or replaced with a safe equivalent.
- `redact` applies to evidence: paste the output, never a secret inside it.
- `learnings` and `decisions` record verified outcomes — an unverified claim doesn't belong in either log.
