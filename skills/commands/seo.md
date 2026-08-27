---
description: Technical SEO — indexability, metadata, structured data, sitemaps, canonicals, i18n signals, Core Web Vitals link
argument-hint: "[url or route] [--audit] [--fix] [--sitemap]"
---

# /seo — Technical SEO

## Usage
```
/seo --audit             — audit the site's technical SEO
/seo /products/[slug]    — audit one route template
/seo --fix               — apply the fixes
/seo --sitemap           — generate/repair sitemap and robots
```

## Overview
Technical SEO is not content strategy — it's making sure a crawler can **reach, render, understand and prefer** the right version of each page. This skill audits the machine-readable layer: indexability, metadata, structured data, canonicals, sitemaps, and the rendering mode your framework actually ships.

It stops at the technical boundary: keyword and content decisions belong to the people who know the market.

---

## Phase 1: Establish how pages are rendered

This determines everything else. For each route type, identify: **SSR / SSG / ISR / client-only**. A client-only route ships an empty shell — Google may render it eventually, most other crawlers and social scrapers will not.

Verify rather than assume: `curl -s <url> | grep -o '<title>[^<]*'` and check whether the main content is in the HTML source. If the content only exists after hydration, that's finding #1.

## Phase 2: Indexability

| Check | Failure |
|---|---|
| `robots.txt` reachable, not blocking what you want indexed | A staging `Disallow: /` copied to production — the classic catastrophe |
| `<meta name="robots">` / `X-Robots-Tag` per route | `noindex` left on a template after a launch; or indexable staging/preview domains |
| Canonical URL on every page, self-referencing by default | Duplicate content across `?utm=`, trailing slash, http/https, www/non-www variants |
| One host, one protocol, consistent trailing-slash policy, 301 for the rest | Split ranking signals across duplicates |
| Pagination and faceted URLs controlled | Infinite crawl space from filter combinations |
| Status codes honest: 404 returns 404, not a 200 "not found" page | Soft 404s indexed as real pages |
| Redirect chains ≤ 1 hop, no loops | Crawl budget and latency wasted |
| Auth-gated content not exposed to crawlers by a bypass | Private content indexed |

## Phase 3: Per-page metadata

Per route template, not per page — the template is what must be correct:
- **Title**: unique, descriptive, front-loaded; generated from the page's data, never a constant across a template.
- **Meta description**: unique, written for a human clicking; absent is better than duplicated boilerplate.
- **Open Graph + Twitter cards**: `og:title`, `og:description`, `og:image` (absolute URL, correct dimensions), `og:url`, `og:type`. Verify the image resolves publicly — a broken share preview is the most visible SEO bug there is.
- **`<html lang>`** correct per locale; `hreflang` + `x-default` on multilingual routes, reciprocal across all versions (see `/i18n`).
- **Heading structure**: exactly one meaningful `h1` per page, no skipped levels — this overlaps `/a11y`, and both benefit.
- **Images**: descriptive `alt`, dimensions set, lazy only below the fold (also `/web-vitals`).

## Phase 4: Structured data

Add the schema.org types the page actually is — Product, Article, BreadcrumbList, Organization, FAQPage, Event, LocalBusiness — as **JSON-LD**, generated from the same data the page renders (never a hand-written duplicate that drifts).

Rules: no markup for content that isn't visible on the page; required properties present; prices/availability/dates real and current; validate with the Rich Results Test / schema validator before claiming it's done.

## Phase 5: Sitemaps & discovery (`--sitemap`)

- `sitemap.xml` generated from the same source of truth as the routes — not maintained by hand.
- Only canonical, indexable, 200-returning URLs. A sitemap listing redirects or noindex pages is a negative signal.
- `lastmod` accurate (from real content updates, not the build timestamp).
- Split by type and paginate above 50k URLs / 50MB with a sitemap index.
- Referenced from `robots.txt`; submitted in Search Console where the project has one.
- Internal linking: every important page reachable within 3 clicks from the home page; no orphan pages only present in the sitemap.

## Phase 6: Speed & rendering signals

Core Web Vitals are a ranking input and they're already covered — run `/web-vitals` and reference the result rather than duplicating the work here. What SEO adds: check that the **crawler's** experience matches the user's — no content behind an interaction, no critical text rendered in images, no infinite scroll without paginated URLs a crawler can follow.

## Phase 7: Report

```
## SEO Audit — <site>

Rendering: <route type → SSR/SSG/CSR>   Indexable pages: <n>   In sitemap: <n>

| # | Severity | Where | Issue | Effect | Fix |
|---|----------|-------|-------|--------|-----|
| 1 | 🔴 | robots.txt | Disallow: / on production | the entire site is de-indexed | remove; verify in Search Console |

Metadata: titles <n>/<n> unique · descriptions <n>/<n> · OG images valid <n>/<n>
Structured data: <types> — valid ✓/✗
Canonicals: <n> missing · duplicates found: <list>
Vitals: see /web-vitals report <date>
```

🔴 = pages that can't be indexed or are indexed wrong (blocked, noindex, soft 404, duplicate canonical). 🟡 = weakened signals (missing metadata, broken OG image, stale sitemap). 🔵 = polish.

## Rules
- Verify with the rendered HTML (`curl`, not the browser's inspector), because that's what a crawler sees first.
- Never add structured data for content that isn't on the page — it's a manual-action risk, not a shortcut.
- Never index staging, preview or duplicate hosts; check for them explicitly.
- One canonical version per page, and every variant redirects to it with a 301.
- Don't guess at rankings or traffic effects; report the technical defect and what it prevents.
- Content and keyword decisions are the user's call — flag opportunities, don't rewrite their copy.
