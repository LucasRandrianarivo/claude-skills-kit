---
description: Write or edit the documents this kit produces — proposals, specs, reports, docs, release notes — and score them before they go out
argument-hint: "[file or subject] [--edit] [--score] [--register client|team|public]"
---

# /write — Prose Quality

## Usage
```
/write --edit proposal.md      — rewrite an existing draft
/write --score status.md       — score it and say what to fix, change nothing
/write release notes for 3.2   — draft from the repository's own history
/write --register client       — set the audience (client · team · public)
```

## Overview
This kit produces a lot of prose: proposals, cahiers des charges, status reports, ADRs, release notes, documentation, PR descriptions, incident postmortems. Bad prose in those documents is not a style problem — an ambiguous scope line costs a change request, a vague status report costs trust, an unclear ADR gets re-litigated in six months.

Two failure modes, and they need opposite fixes:
- **Vagueness** — text that commits to nothing. The dominant failure in professional writing, and the expensive one.
- **AI tells** — throat-clearing openers, tricolon rhythm, "it's not just X, it's Y", uniform sentence length, adverb padding. Cheap to fix, and increasingly what makes a reader stop trusting a document.

**Accuracy outranks both.** A document that reads beautifully and states something untrue is a worse document than a clumsy accurate one. The score below is weighted accordingly.

---

## Phase 1: Establish audience and purpose

```
Document: <what it is>
Reader:   <who — sponsor, developer, auditor, user>
They need to: <decide X | do Y | understand Z>
Register: <client (formal, no jargon) | team (direct, technical) | public (accessible)>
Constraint: <length, contractual weight, legal review needed>
```
A sponsor reads for budget, date and risk. A developer reads for how and why. The same content, written once for both, serves neither — say which one it's for, and put the other in an appendix.

## Phase 2: The rules that carry the weight

1. **Every claim is checkable.** Name the thing, the number, the date, the file. "Significant improvement" is not a claim, it's a mood. If you can't source it, don't write it (the `evidence` rule applies to prose too).
2. **The point goes first.** Decision, then reasoning. Bad news in the first paragraph, never buried at the bottom (`/status`).
3. **Active voice with a real subject.** "The migration will be applied on 14 March" hides who applies it. Passive is acceptable when the actor is genuinely irrelevant or unknown — that is rarer than it appears.
4. **Concrete over abstract.** Replace "the solution", "the platform", "leverage", "streamline" with what it actually is and does.
5. **One idea per sentence, one subject per paragraph.** Sentences over ~25 words usually contain two.
6. **Vary the rhythm.** Uniform sentence length is the clearest signature of generated text. Read it aloud; where it sounds metronomic, break it.
7. **Cut the throat-clearing.** "It's worth noting that", "In today's landscape", "Let's dive in", "At the end of the day". Delete and start at the second sentence.
8. **Adverbs and intensifiers are usually a weak verb wearing a disguise.** "Significantly improved" → the number.
9. **Structure serves the reader, not the writer.** Bullets for parallel items, a table for comparisons, prose for reasoning. A page of bullets is a page with the thinking left out.
10. **Say the trade-off.** A recommendation with no stated cost reads as sales copy and gets discounted as such.

**When these rules do not apply** — say so rather than following them off a cliff: legal and contractual text (precision beats elegance, and the boilerplate is boilerplate for a reason), technical specifications (repetition is a feature; consistent terminology beats varied wording), error messages and UI copy (their own constraints), and anything a regulator or a lawyer must approve.

## Phase 3: The AI tells worth hunting

Not because a machine wrote it — because these patterns are imprecise:
- Openers that delay the point: "In an era where…", "As we all know…"
- The tricolon reflex: everything arriving in threes. Two items is usually the honest count.
- "It's not just X — it's Y" and its cousins.
- False balance: "While some argue… others contend…" with no position taken.
- Meta-commentary: "In this section we will explore…". Explore it.
- Closing summaries that repeat what the reader just read.
- Uniform paragraph length, every one three to four sentences.
- The pull-quote sentence written to be quoted rather than to be true.

Judgment applies: an em-dash is not a crime, and three items are fine when there are three things. Rewrite what is imprecise, not what merely resembles a pattern.

## Phase 4: Score it (`--score`)

Score each dimension 1–10, with the evidence for the score:

| Dimension | Asks | Weight |
|---|---|---|
| **Accuracy** | Is every claim true and checkable? Any number, date or name you cannot source? | ×2 |
| **Specificity** | Named things, or abstractions? Could a competitor publish this unchanged? | ×1 |
| **Directness** | Does the point come first? Is the ask explicit? | ×1 |
| **Structure** | Does the shape match how the reader reads? Right form for the content? | ×1 |
| **Register** | Right for this audience — no jargon at a sponsor, no hand-holding at an engineer? | ×1 |

Maximum 60 (accuracy counts double). **Below 42/60, revise before sending. Any Accuracy below 7 is a stop — fix it regardless of the total**, because a polished document with an unverified claim is the one that costs you.

```
Accuracy    6/10  ×2 = 12   "improved performance by 40%" — no measurement referenced
Specificity 7/10       = 7   "the platform" appears 5×; name it
Directness  9/10       = 9
Structure   8/10       = 8
Register    8/10       = 8
                        44/60 — but Accuracy 6 is a stop: source the 40% or cut it.
```

## Phase 5: Edit (`--edit`)

Work in this order — each pass makes the next smaller:
1. **Truth pass**: verify every claim, number and name. Cut or source what you can't stand behind.
2. **Structure pass**: is the point first? Does each section earn its place? Delete whole paragraphs before polishing sentences.
3. **Sentence pass**: active voice, one idea, real subjects, concrete nouns.
4. **Cut pass**: remove 10% without losing content. There is always 10%.
5. **Read-aloud pass**: rhythm, and the sentences you stumble on.
6. Re-score. Report before/after per dimension.

Show the diff for anything contractual or client-facing — the author decides what ships, and a rewrite that changed a commitment is a change they must see.

## Rules
- Never invent a number, a reference, a quote, or a client name to make a document stronger.
- Accuracy is the gate; style is what comes after it passes.
- Preserve the author's voice when editing — this is not a house-style conversion unless asked.
- Never apply the style rules to legal, contractual, or specification text without saying what you changed and why.
- Score before sending anything client-facing; below the threshold it gets another pass, not a caveat.
- Say plainly when a document's problem is that it has nothing to say — no amount of editing fixes a missing decision.
