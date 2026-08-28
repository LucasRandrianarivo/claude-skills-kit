---
description: Engineering retrospective — what shipped, churned, and broke; themes and top 3 process improvements
argument-hint: "[--week | --sprint | <since-date>]"
---

# /retro — Engineering Retrospective

## Usage
```
/retro                — last 7 days
/retro --week         — last 7 days (explicit)
/retro --sprint       — last 14 days
/retro 2026-01-01     — everything since a date (YYYY-MM-DD)
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **Empty or `--week`**: 7-day window
- **`--sprint`**: 14-day window
- **A date `YYYY-MM-DD`**: window starts there
- Anything else → show usage and stop

**Midnight-aligned windows.** Compute an absolute start date at local midnight and pass `--since="YYYY-MM-DDT00:00:00"` to git — a bare date means "now minus N days at the current wall-clock time", which silently drops the first morning of the window.

Report all times in the user's local timezone.

---

## Phase 1: Guard against an empty or stale window

`git fetch origin <base>` (detect the base branch as in `/ship`; if fetch fails, proceed against the last-known state and disclose "offline run — window not freshness-verified" in the report).

Check `git log -1 --format=%ci origin/<base>`. If the newest commit predates the entire window, **stop and say so**: either today's date is wrong in this session or the local repo is far behind the remote. **Never fabricate a narrative from zero commits** — an empty window produces the sentence "No commits on `<base>` in this window", not a plausible-sounding retro.

## Phase 2: Gather raw data

Identify the operator: `git config user.name` is **"you"**; every other author is a teammate. Then collect (independent commands — run together):

```bash
# Commits: hash, author, date, subject + per-commit stats
git log origin/<base> --since="<start>" --format="%h|%aN|%ai|%s" --shortstat --no-merges
# Per-commit file breakdown (test vs production LOC: test paths match test/|spec/|__tests__|\.test\.|\.spec\.)
git log origin/<base> --since="<start>" --format="COMMIT:%h|%aN" --numstat
# Hotspots: most-changed files
git log origin/<base> --since="<start>" --format="" --name-only | grep -v '^$' | sort | uniq -c | sort -rn | head -20
# Per-author commit counts
git shortlog origin/<base> --since="<start>" -sn --no-merges
# PR references in subjects
git log origin/<base> --since="<start>" --format="%s" | grep -oE '#[0-9]+' | sort -u
# Breakage signals: reverts and fixes
git log origin/<base> --since="<start>" --oneline --grep="revert" --grep="hotfix" -i
```

Local knowledge bases (each optional — skip silently if absent):
- **`.claude/learnings.jsonl`** — bugs/fixes learnings logged during the window; filter by timestamp
- **`.claude/decisions.jsonl`** — decisions made during the window
- **`CHANGELOG.md`** — releases cut in the window (version headers with in-window dates)
- **Previous retro snapshot** — newest `.claude/reports/retro/*-retro.json`, for trend deltas

## Phase 3: Compute the metrics

| Metric | Source |
|--------|--------|
| Features shipped | CHANGELOG entries + merged `feat:` PRs in window |
| Commits / contributors / PRs referenced | git log, shortlog |
| LOC + / − / net | shortstat totals |
| Test LOC ratio | test-file insertions ÷ total insertions, from numstat |
| Releases cut | version headers or tags in window |
| Active days | distinct commit dates |
| Fix ratio | `fix:`-typed commits ÷ all typed commits |
| Learnings / decisions logged | jsonl entry counts in window |

Beware raw LOC: AI-assisted work inflates it. Ten lines of a good fix outrank ten thousand lines of scaffold — lead with features shipped, treat LOC as context.

**Commit type breakdown** — categorize by conventional prefix and render a bar chart:

```
feat:      20  (40%)  ████████████████████
fix:       27  (54%)  ███████████████████████████
refactor:   2  ( 4%)  ██
```

Flag a fix ratio above 50%: "ship fast, fix fast" — usually a review-gap signal.

**If multiple contributors**: add a leaderboard (you first, labeled "You (<name>)", then teammates by commits descending) with commits, +/− LOC, and top directory each.

## Phase 4: What shipped / what churned / what broke

**Shipped.** The 3–5 most substantial deliveries: from CHANGELOG entries, `feat:` clusters, and the biggest coherent diffs. For each: what it is, who shipped it, why it matters. Crown a **Ship of the period** — the single highest-impact delivery.

**Churned.** Files that kept coming back:
- Any file changed 5+ times in the window (from the hotspot list)
- **Fix-chains**: 2+ `fix:` commits touching the same file/subsystem after its `feat:` landed — name the chain (`feat abc123 → fix def456 → fix 789abc`) and what each fix corrected
- Distinguish healthy churn (an actively built feature) from unhealthy churn (repeated repair of the same landing) — say which is which and why

**Broke.** Evidence of production or mainline pain:
- `revert`/`hotfix` commits — for each, what broke, how long until the fix, what the fix was
- Same-day `fix:` following a merge (landed broken)
- Cross-reference `.claude/learnings.jsonl`: learnings logged during the window often name the root cause a commit message hides — quote them

**Themes.** Step back from the item level: 2–4 sentences on where the effort actually went this period (which subsystems, build vs fix vs polish), and whether that matches where it was supposed to go. Use `.claude/decisions.jsonl` to check: were this period's decisions executed, reversed, or silently ignored?

## Phase 5: Trends vs last retro

If a prior snapshot exists in `.claude/reports/retro/`, show deltas:

```
                 Last     Now      Delta
Commits:         32   →   47       ↑47%
Test ratio:      22%  →   41%      ↑19pp
Fix ratio:       54%  →   30%      ↓24pp (improving)
Features:        3    →   5        ↑2
```

If none: "First retro recorded — run again next period for trends."

## Phase 6: Write and save the report

Write the full report to `.claude/reports/retro/<YYYY-MM-DD>-retro.md` and a machine snapshot to `.claude/reports/retro/<YYYY-MM-DD>-retro.json` (window, the Phase 3 metrics, per-author stats — the input Phase 5 needs next time). Print the report in full.

## Output

```markdown
<One-line summary: "Week of <date>: N commits (M contributors), X features, Y% tests, fix ratio Z%">

# Engineering Retro: <start> → <end>

## Summary
<metrics table from Phase 3>

## Trends vs Last Retro
<Phase 5, or the first-retro note>

## What Shipped
<3–5 deliveries + Ship of the period>

## What Churned
<hotspot files with counts · fix-chains with commit trails · healthy vs unhealthy verdict>

## What Broke
<reverts/hotfixes with timelines · landed-broken merges · learnings quoted — or "No breakage signals this period">

## Themes
<where the effort went, and whether decisions logged were actually executed>

## Team
<only if multiple contributors: leaderboard, then per teammate 2–3 sentences,
one specific commit-anchored praise, one specific growth suggestion — data, not vibes>

## Top 3 Wins
1–3. <highest-impact things shipped: what, who, why it matters>

## Top 3 Process Improvements
1–3. <specific and commit-anchored, each with the evidence that motivates it and
     the concrete first step — e.g. "5 fix commits on checkout.ts within 2 days of
     the feature landing → run /review before merging checkout changes">

Report saved: .claude/reports/retro/<date>-retro.md
```

Rules for the narrative: anchor every claim in a commit, file, or jsonl entry — no generic praise, no generic advice. Improvements must be adoptable this week, and at least one should attack the biggest item in "What Broke". If something recurring belongs in the knowledge base, append it to `.claude/learnings.jsonl` and say so.
