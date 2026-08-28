---
description: Generate release notes from undocumented merged changes and sync README/docs to what shipped
argument-hint: "[--since <tag|date>] [--notes-only]"
---

# /release-notes — Post-Ship Documentation Update

## Usage
```
/release-notes                    — document everything since the last release/tag
/release-notes --since v1.4.0    — explicit starting point (tag, SHA, or YYYY-MM-DD)
/release-notes --notes-only      — generate release notes, skip the doc-sync pass
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **`--since <ref>`**: a tag, SHA, or date; use as the range start
- **`--notes-only`**: run Phases 1–3 only

## Overview

Code merges faster than docs get written. This command closes the gap after the fact: find what shipped since the last documented release, write release notes worth reading, and update every doc whose claims the changes invalidated.

Mostly automated. Make obvious factual updates directly; stop only for risky or subjective ones.

| Auto-apply | Ask first |
|-----------|-----------|
| Factual corrections clearly from the diff | Narrative/positioning changes |
| Adding items to tables and lists | Removing any section |
| Updating paths, counts, version numbers | Security-model descriptions |
| Fixing stale cross-references | Rewrites > ~10 lines in one section |
| Minor release-note wording polish | Anything whose relevance is ambiguous |

**Iron rule: never clobber existing CHANGELOG entries.** Edit wording in place with exact-match Edits — never Write/regenerate the file, never delete or reorder entries. Existing entries were written from the actual diff; they are history, not drafts.

---

## Phase 1: Determine the undocumented range

Find the last *documented* point, first match wins:
1. `git describe --tags --abbrev=0` → last release tag
2. The newest version header in `CHANGELOG.md` → the commit that introduced it
3. `--since` argument
4. None of the above → ask the user for a starting point (offer "last 30 days" as a default)

Then gather, on the base branch (detect it as in `/ship`; `git fetch origin` first):

```bash
git log <since>..HEAD --oneline --no-merges
git diff <since>...HEAD --stat
git diff <since>...HEAD --name-only
```

If the range is empty: "Everything since <since> is documented — nothing to do." and exit.

Classify the commits: **new features** (new files, commands, endpoints, capabilities), **changed behavior** (modified APIs, config, defaults), **fixes**, **removed functionality**, **infrastructure** (build/CI/tests — usually not user-facing).

## Phase 2: Coverage map (blast-radius analysis)

Before writing anything, map what shipped against what's documented. Extract every public-surface change from the diff — new/renamed/removed commands, CLI flags, exported functions, endpoints, config keys, env vars — and check each against the docs in four quadrants:

- **Reference** — what it is (README tables, API docs)
- **How-to** — how to use it for a task (examples, workflows)
- **Tutorial** — step-by-step for newcomers (getting-started guides)
- **Explanation** — why it works this way (architecture docs, design rationale)

```
Coverage map:
  [entity]        reference  how-to  tutorial  explanation
  /new-command    README     —       —         —
  --new-flag      README     README  —         —
  FooProcessor    —          —       —         —
```

Zero coverage = **critical gap** (fix in Phase 4); reference-only = **common gap** (list in the output). Also scan docs containing ASCII/Mermaid diagrams: flag diagram entities the code renamed, split, or removed — **flag only, never auto-edit diagrams**; they need human judgment.

## Phase 3: Generate the release notes

Write one entry covering the whole range. Every commit from Phase 1 must map to at least one bullet (infrastructure commits may share a single "internal" line or a "For contributors" subsection).

```markdown
## [X.Y.Z] - YYYY-MM-DD

<1–3 sentence headline: the release's main story, in user terms.>

### Added
- <feature — what you can now do, with the command/flag/link that unlocks it>
### Changed
- <behavior change — what's different and who is affected>
### Fixed
- <bug — symptom fixed, not internal cause>
### Removed
- <removed surface — and the migration path if one exists>
```

**Quality bar — score every bullet 0–3, rewrite anything under 2:**
- +1 answers *what changed* (names the feature/fix)
- +1 answers *why you care* (user impact, pain removed)
- +1 answers *how to use it* (command, flag, or doc link)

Voice: "You can now…", never "Refactored the…". A bullet that reads like a commit message fails the bar.

**Destinations:**
- `CHANGELOG.md` exists → insert the entry below the header (respect the iron rule for existing entries)
- The repo uses release tags → also offer `gh release create vX.Y.Z --notes-file <tmpfile>` (or `gh release edit` if the release exists with thin notes)
- Neither → create `CHANGELOG.md` with a standard header and this first entry

If `--notes-only`: commit the notes (Phase 6 rules) and stop here.

## Phase 4: Per-file documentation audit

Discover docs: `find . -maxdepth 2 -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*"`. Read each file fully before touching it, and cross-reference against the range diff:

| File | Check |
|------|-------|
| README.md | Features/capabilities list complete? Install/setup steps still correct? Examples and usage still valid? |
| ARCHITECTURE.md | Components and diagrams match the code? Be conservative — update only what the diff clearly contradicts. |
| CONTRIBUTING.md | Walk the setup as a brand-new contributor: would every command succeed? Test instructions current? |
| CLAUDE.md | Project-structure tree matches reality? Listed commands/scripts accurate against package.json (or equivalent)? |
| Any other .md | Determine its purpose and audience, then check whether the diff contradicts anything it claims. |

Classify each needed change as **auto-apply** or **ask** per the table in the Overview, then: apply the auto changes with Edit; for each "ask" item present the file, the issue, your recommended edit, and numbered options (apply / adjust / skip). Fill Phase 2's critical gaps here — at minimum a reference entry for every new public surface.

Every edit gets a one-line summary of *what specifically changed* — "README.md: added `--since` flag to the options table, updated command count 8 → 9", never just "updated README".

## Phase 5: Cross-doc consistency and discoverability

1. README's feature list vs CLAUDE.md's description — do they agree?
2. CHANGELOG's newest version vs the version file/tag — same number?
3. Architecture component names vs the code — any renamed entities left behind?
4. **Discoverability**: every doc file must be reachable by link from README.md or CLAUDE.md. Flag orphans and offer to add a link.

Auto-fix factual mismatches (a version number, a count); ask for narrative contradictions.

## Phase 6: Commit and report

If nothing changed: "All documentation is current." and exit.

Stage modified files **by name** (never `git add -A`), one commit:

```
docs: release notes and doc sync for vX.Y.Z
```

If on the base branch with branch protection, create a `docs/release-vX.Y.Z` branch and open a PR via `gh pr create`; otherwise commit directly and push.

## Output

```
RELEASE NOTES — vX.Y.Z (<since> → HEAD, N commits)
══════════════════════════════════════════════════
Notes:      CHANGELOG.md entry <added | updated> · GitHub release <created | updated | n/a>

Doc health:
  README.md        Updated  (<what>)
  ARCHITECTURE.md  Current
  CONTRIBUTING.md  Updated  (<what>)
  CLAUDE.md        Current
  <other.md>       Skipped — does not exist

Coverage gaps remaining:
  <entity> — has reference, no how-to example        ← common gap
  <entity> — undocumented                            ← critical gap (user skipped)
Diagram drift:
  <doc>: "<OldName>" renamed to "<NewName>" in code — diagram needs a human pass

Committed: <sha> (<direct | PR: url>)
```

If all coverage is complete: "Coverage: every shipped surface is documented." Cross-reference: run this after `/ship` merges, or let `/deploy` remind you.
