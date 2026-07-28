---
description: Codify the last successful workflow from this conversation into a reusable command
argument-hint: "[name for the new command]"
---

# /skillify — Codify a Workflow into a Permanent Command

The productivity multiplier. This conversation just discovered how to do something the hard way — a scrape, a deploy dance, a data fix, a multi-step diagnostic. `/skillify` writes it down as a command file in `.claude/commands/` so the next invocation is a slash command, not a rediscovery. Every successful workflow becomes a one-time cost.

**Capture while fresh.** The exact commands, selectors, URLs, flags, and gotchas are in this conversation right now. Tomorrow they're gone. That is the entire reason this command exists.

## Usage
```
/skillify                  — codify the most recent successful workflow
/skillify sync-fixtures    — same, with a chosen command name
```

---

## Phase 1: Provenance Guard

Walk back through the conversation (at most ~10 assistant turns) for the most recent **bounded, successful, repeatable** workflow:

- **Bounded**: you can identify where it started (the user's ask) and where it ended (the result the user accepted).
- **Successful**: it produced a result the user did not subsequently invalidate ("that's wrong", "retry").
- **Repeatable**: a multi-step flow someone would plausibly run again — not a one-off answer, not a single trivial command.

If none exists, refuse: "No recent completed workflow found in this conversation to codify. Run the workflow first, then say /skillify." **Do not synthesize a command from chat fragments or from imagination.** If the candidate is several turns back with unrelated discussion since, confirm once: "The last complete workflow was '<one-line summary>' a few turns back — skillify that one?"

## Phase 2: Name + Scope Proposal

Extract from the workflow and propose in one message:

- **Name**: `$ARGUMENTS` if given, else derive — lowercase, digits, dashes, ≤ 32 chars, starts with a letter, verb-noun preferred (`sync-fixtures`, `deploy-staging`, `scrape-hn`). Check for collision: `ls .claude/commands/` — an existing file with that name means overwrite (ask) or rename.
- **One-line description** for the frontmatter (imperative, ≤ 100 chars).
- **Parameterization**: list what varied vs what's fixed. Anything the user might change next time (a URL, a date, an environment name, a record ID) becomes an argument; everything discovered-and-stable (selectors, endpoints, flag combos, workaround order) is hardcoded.

Confirm with the user (numbered options): 1) proceed as proposed, 2) rename, 3) change what's parameterized, 4) cancel.

## Phase 3: Synthesize the Command File

**Use only the final working steps** — the commands and edits that produced the accepted result. Drop:
- Failed attempts (the four selectors tried before the working one, the flag that errored)
- Unrelated commands from surrounding turns
- All conversation prose and your own reasoning

But **keep the gotchas as instructions**: if attempt #3 only worked after discovering "the API 429s without a sleep" or "the build must run before the copy step", write that discovery into the file as a warning or an explicit step. The failure is dropped; the lesson is kept.

Write to `.claude/commands/<name>.md` in the kit command format:

```markdown
---
description: <one-line summary>
argument-hint: "<args>"        # omit if no arguments
---

# /<name> — <Title>

<2-3 sentences: what this does, what it produces, where the output goes.
Codified from a working session on <YYYY-MM-DD>. No conversation context.>

## Usage
​```
/<name> <example-args>
​```

## Argument Parsing
Parse `$ARGUMENTS`: <each argument, its default, how it substitutes into the steps>

## Steps
1. <exact command / action, with discovered values inlined>
   - <gotcha discovered during the session, stated as an instruction>
2. ...

## Verify
<how to check it worked — the observable success signal from the session>

## Output
<the exact shape of the result to report>
```

Generalization rules:
- Substitute parameterized values with `$ARGUMENTS`-derived placeholders; keep every discovered constant literal (exact selector, exact endpoint, exact flag order).
- Steps must be executable by a fresh session with zero context from this conversation. If a step depends on something ambient (an env var, a tunnel, a running server), add an explicit precondition check as step 1.
- Include the failure protocol if one emerged ("if X returns 401, re-auth with Y first").
- Keep it tight: this is a durable artifact, not a transcript.

## Phase 4: Verify Before Committing

**Iron contract: never write a half-broken command to disk.** A broken command in `.claude/commands/` makes future sessions reach for the wrong tool and erodes trust.

1. Draft the file content (don't write it yet — show it in chat).
2. **Dry-check**: re-read the draft as if you were a fresh session. Can every step run without this conversation's context? Are all placeholders defined by Argument Parsing? Any command referencing a temp file or session state that won't exist?
3. **Live-check when safe**: if the workflow is read-only or idempotent (a scrape, a status check, a report), actually re-run the core step from the draft to confirm it still works. If it mutates state (deploys, data fixes), do NOT re-run — flag it as verified-by-review only.
4. Fix what the checks surface, max two revision rounds. If it still can't stand alone, report why and stop — nothing lands on disk.

## Phase 5: Approval Gate + Commit

Show the final draft and ask (numbered options): 1) commit it, 2) edit something first, 3) discard. Only on approval, write `.claude/commands/<name>.md`.

Then verify the landing: confirm the file exists and re-read it once for frontmatter validity. If the repo tracks `.claude/` in git, offer to commit: `chore: add /<name> command (codified from session)`.

End with one line: "Command `/<name>` written to .claude/commands/. Next time, it's a slash command."

## Output

```
## Skillified: /<name>
- Source workflow: <one-line summary of what was codified>
- File: .claude/commands/<name>.md
- Arguments: <list or "none">
- Verified: live-run | review-only (mutating workflow)
- Gotchas preserved: <count>
```

---

## Iron Rules

1. **Only codify what actually happened and worked.** No provenance, no command.
2. **Final steps only, lessons kept.** Failed attempts are dropped; their discoveries become instructions.
3. **Fresh-session test.** Every step must run without this conversation in context.
4. **Never re-run mutating steps to verify.** Deploys and data fixes are verified by review, and say so.
5. **No half-broken artifacts.** Draft → check → approve → write, in that order. On failure, nothing is written.
