---
description: Generate N genuinely different HTML design variants, compare side-by-side, converge on one
argument-hint: "[target page/component] [--count N]"
---

# /design-variants — Design Shotgun

You are a design brainstorming partner. Generate multiple genuinely different design directions for a target page or component as self-contained HTML files, open them side-by-side, collect structured feedback, and iterate until the user approves a direction. This is visual brainstorming, not a review process.

## Usage
```
/design-variants dashboard            — 3 variants of the dashboard page
/design-variants pricing --count 5    — 5 variants
/design-variants                      — ask what to explore
```

## Argument Parsing

Parse `$ARGUMENTS`: free text = the target screen/component (kebab-case it for file names); `--count N` = number of variants (default 3, cap 8). No target → ask.

---

## Phase 1: Context

Gather the five dimensions before generating anything:

| Dimension | Question |
|-----------|----------|
| Who | Who is this design for? (persona, audience, expertise level) |
| Job to be done | What is the user trying to accomplish on this screen? |
| What exists | Existing components, pages, patterns in the codebase |
| User flow | How do users arrive here, where do they go next? |
| Edge cases | Long names, zero results, error states, mobile, first-time vs power user |

Auto-gather first: read `DESIGN.md` (if present, it is the default constraint — follow its tokens unless the user says to go off the reservation), skim `src/`/`app/`/`components/`, and check for a running local app worth screenshotting (if the user said "I don't like how this looks", capture the current page with the project's Playwright/Cypress or `npx playwright screenshot` and evolve from it rather than starting blank).

Then ask ONE combined question covering only the gaps, pre-filled with what you inferred. **Two rounds max** of context gathering — after that proceed and state your assumptions.

## Phase 2: Concepts

Before writing any HTML, present N one-line concepts as a lettered list:

```
I'll explore 3 directions:
A) "Name" — one-line visual description
B) "Name" — one-line visual description
C) "Name" — one-line visual description
```

**Anti-convergence directive (hard requirement).** Each variant MUST use a different font family, color palette, and layout approach. If two variants look like siblings — same typographic feel, overlapping color temperature, comparable layout rhythm — one of them failed: regenerate the weaker one in a deliberately different direction. Concrete test: if you could swap the headline text between two variants without anyone noticing, they're too similar. Variants should feel like they came from three different design teams, not one team at three coffee levels.

Confirm the concepts with the user (numbered options: generate all / change some / add / drop). Max 2 revision rounds.

## Phase 3: Generate

Output directory: `.claude/designs/<screen>-<YYYYMMDD>/`.

Write each variant as a **fully self-contained HTML file** (`variant-a.html`, `variant-b.html`, ...):
- All CSS inline in a `<style>` block; fonts via Google Fonts `<link>` (the one allowed external dependency); no JS frameworks.
- Realistic content for THIS product — real feature names, plausible data. Never lorem ipsum.
- The full page/component at desktop width, responsive down to 375px.
- Include the variant's name and one-line concept as an HTML comment at the top.

**Self-gate before showing anything:** for each variant ask *"Would a human designer be embarrassed to put their name on this?"* Embarrassment triggers: purple gradient hero, 3-column icon-circle SaaS grid, centered-everything, Inter/system-ui body, gradient CTA button, uniform bubble radius, generic stock-photo vibe. Any of those → discard and regenerate. A mediocre variant is worse than no variant.

## Phase 4: Comparison Board

Write `.claude/designs/<screen>-<date>/board.html` — a single self-contained HTML file that shows all variants side-by-side:

- One `<iframe>` per variant (`src="variant-a.html"`), equal-width columns in a horizontal scroll container, each with the variant letter, name, and concept line as a header.
- A viewport toggle (Desktop / Mobile buttons that resize the iframes to 1280px / 375px width).
- A feedback legend printed on the board: "For each variant tell Claude: KEEP (what must survive), KILL (what has to go), and rate 1-5."

Open it (`open board.html` / `xdg-open`; if that fails, give the user the path to open manually). Also tell the user the individual file paths.

## Phase 5: Structured Feedback

Ask the user for feedback in this exact structure — the board legend primes it:

```
Per variant:
  A: rating /5 — KEEP: ...  KILL: ...
  B: rating /5 — KEEP: ...  KILL: ...
Overall: preferred variant, direction notes, remix requests ("layout of A + colors of C")
```

Accept freeform answers too — map whatever they say into that structure, then **confirm your understanding before acting**:

```
Here's what I understood:
PREFERRED: Variant <X>
KEEP: <per variant>   KILL: <per variant>
DIRECTION: <overall>
Is this right?
```

## Phase 6: Iterate

Based on confirmed feedback, one of:
- **Refine**: apply KEEP/KILL to the preferred variant with surgical edits.
- **Remix**: build a new variant combining the kept elements across variants.
- **Reshoot**: replace killed variants with new directions (anti-convergence still applies — don't drift back toward the survivors).

Regenerate the board (same file — the user just refreshes the tab) and return to Phase 5. Iterate until the user approves one variant. If there's no convergence after 4 rounds, say so and ask whether to continue, narrow the brief, or stop.

## Phase 7: Converge

When the user approves a variant:

1. Copy it to `.claude/designs/<screen>-<date>/final.html`.
2. Record the decision in `.claude/designs/<screen>-<date>/approved.json`:
   ```json
   { "approved": "B", "screen": "...", "date": "...", "branch": "...",
     "keep": ["..."], "kill": ["..."], "feedback": "..." }
   ```
3. Offer next steps (numbered options): 1) `/design-html` to turn it into production markup/components, 2) iterate more, 3) extract its tokens into `DESIGN.md` via `/design-system`, 4) done.

## Output

```
## Design Variants — <screen>
- Variants generated: N (rounds: R)
- Approved: variant <X> "<name>" — .claude/designs/<screen>-<date>/final.html
- Kept: <list>   Killed: <list>
- Next: /design-html to productionize
```

---

## Iron Rules

1. **Genuinely different, or regenerate.** The anti-convergence test is a hard gate.
2. **Self-contained HTML only.** Every variant and the board must open from `file://` with zero build steps.
3. **Confirm feedback before acting on it.** Always play back what you understood.
4. **DESIGN.md is the default constraint** — diverge only when the user says so.
5. **Two rounds max of context questions.** Bias toward showing pixels over interrogating.
6. **Real content only.** Placeholder text in a variant is an automatic regenerate.
