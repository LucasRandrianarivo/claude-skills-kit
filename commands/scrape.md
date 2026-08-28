---
description: Pull structured data from a web page — curl first, Playwright for JS pages; JSON/CSV/markdown out
argument-hint: "<what to scrape> [--format json|csv|md] [--out file]"
---

# /scrape — Pull Structured Data from a Web Page

One entry point for getting data off the web. Static pages via `curl` + parsing (fast, cheap); JS-rendered pages via Playwright (fallback). Read-only by contract. Polite by default.

## Usage
```
/scrape top stories on news.ycombinator.com
/scrape product names + prices on example.com/products --format csv
/scrape https://example.com/table --format md --out data.md
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **Intent** (free text): what data, from where. If missing, ask once: "What do you want to scrape? One line, e.g. 'product names + prices on example.com/products'." Do not ask multiple clarifying questions up front — later questions are cheaper inside the loop.
- **`--format`**: `json` (default), `csv`, or `md` (markdown table).
- **`--out <file>`**: write the result to a file; otherwise emit it in the reply.

---

## Phase 0: Guardrails

**Refuse mutating intents.** If the intent implies writes — *submit, post, send, log in, click X that mutates, fill the form, delete, create, order, book* — stop: "/scrape is read-only. I can automate that flow separately if you ask, but not under /scrape." Do not proceed.

**Politeness contract (non-negotiable):**
1. Check `curl -s <origin>/robots.txt` first. If the target path is disallowed for `*`, tell the user and stop — do not offer workarounds.
2. Rate limit: max ~1 request/second; `sleep 1` between paginated fetches.
3. Send an honest `User-Agent` (e.g. `claude-scrape/1.0`); never spoof a browser UA to evade blocks.
4. **Never bypass auth walls, paywalls, CAPTCHAs, or bot checks.** If content requires login, report that and stop — do not accept credentials to scrape someone else's gated content. (The user's own app behind their own login is `/qa` territory.)

## Phase 1: Static Path (try first)

```bash
curl -sL -A "claude-scrape/1.0" "<url>" -o /tmp/scrape-page.html
```

1. Check the payload: does the HTML actually contain the target data? Grep for a known-visible string. An empty `<div id="root">`/`<div id="app">` shell means JS-rendered → Phase 2.
2. **Look for structured data before parsing markup** — it's more stable than selectors:
   - JSON-LD: `<script type="application/ld+json">`
   - Embedded state: `__NEXT_DATA__`, `window.__INITIAL_STATE__`
   - An underlying JSON API: check whether the page fetches from an obvious `/api/...` endpoint you can curl directly (same politeness rules).
3. Otherwise parse the HTML: identify the repeating element for rows (list items, table rows, cards), extract fields per row. Use a small Node script (`node -e` with regex/string parsing, or the project's cheerio/jsdom if installed) — not brittle one-line greps for anything nontrivial.
4. Iterate: try an extraction, inspect the output, refine. **3-4 failed attempts → Phase 2** or the failure protocol.

## Phase 2: Browser Path (JS-rendered fallback)

Use the project's Playwright if configured; otherwise `npx playwright` via a short Node script:

```js
// /tmp/scrape.mjs — adjust selectors per target
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(process.argv[2], { waitUntil: 'networkidle' });
const items = await page.$$eval('<row-selector>', rows =>
  rows.map(r => ({ /* field: r.querySelector('...')?.textContent.trim() */ })));
console.log(JSON.stringify({ items, count: items.length }));
await browser.close();
```

Tips: `waitUntil: 'networkidle'` for late-loading content; scroll for lazy lists (`page.mouse.wheel`); a cheaper trick — watch the page's own network responses (`page.on('response')`) and lift the JSON the app fetched instead of parsing DOM.

## Phase 3: Pagination

If the intent spans multiple pages:
1. Find the mechanism: `?page=N` / `?offset=N` URLs, a rel="next" link, or a "Load more" button (browser path).
2. Loop with `sleep 1` between requests; stop when a page yields zero new items, the next link disappears, or a user-stated cap is hit.
3. **No stated cap → default to 5 pages** and tell the user how to raise it. Never crawl unbounded.
4. Deduplicate rows across pages on a stable key before output.

## Phase 4: Output

Normalize to a stable shape — consumers should be able to treat it as data:

- **json** (default): one document, `{ "items": [...], "count": N, "source": "<url>", "scraped_at": "<ISO>" }`. Emit it in a fenced block with no prose interleaved (callers pipe to `jq`), or to `--out`.
- **csv**: header row from the item keys; quote fields containing commas/quotes/newlines; one file or fenced block.
- **md**: a markdown table, keys as columns. For > 50 rows, prefer `--out` and show the first 10 as a preview.

Missing fields are `null`/empty — never silently drop a row because one field failed to parse.

**Data hygiene (apply before emitting):**

| Rule | Detail |
|------|--------|
| Trim | Strip leading/trailing whitespace and collapse internal runs from every text field |
| URLs | Resolve relative links against the page origin — emit absolute URLs only |
| Numbers | Parse prices/counts to numbers where the intent implies math (`"$1,299.00"` → `1299.00`), keep the raw string in a sibling field if lossy |
| Dates | Normalize to ISO 8601 when the source format is unambiguous; otherwise keep raw |
| Encoding | Decode HTML entities (`&amp;`, `&#8217;`); output UTF-8 |
| Keys | Stable snake_case field names derived from the intent, identical across rows and pages |
| Sanity check | Eyeball 2-3 rows against the live page before declaring done — count and spot-check, don't assume |

## Failure Protocol

If extraction doesn't yield a sensible shape after honest attempts on both paths:
- Report what you tried, what came back, and what's blocking (lazy-loaded, obfuscated markup, paywalled, bot-blocked).
- **Do NOT ship a partial or fabricated result and call it done.**
- Ask (numbered options): 1) try a different selector/strategy, 2) different page/source for the same data, 3) stop.

## Repeatable?

If this scrape worked and looks like something the user will run again, offer once: "Say `/skillify` to save this as a permanent command — same output, no rediscovery next time." One line, no selling.

## Output Summary

After the data, one short line: source, rows extracted, pages fetched, path used (static/browser), output location. Nothing more — the data is the product.

---

## Iron Rules

1. **Read-only.** No form submissions, no state mutation, no logins.
2. **Polite.** robots.txt respected, ~1 req/s, honest User-Agent, bounded pagination.
3. **Never bypass access controls.** Auth walls, paywalls, CAPTCHAs: report and stop.
4. **Static before browser.** curl is 100x cheaper; escalate only on evidence the page is JS-rendered.
5. **Structured sources before selectors.** JSON-LD / embedded state / underlying APIs outlive markup changes.
6. **Data out, not prose.** One clean document in the requested format; logs stay out of it.
