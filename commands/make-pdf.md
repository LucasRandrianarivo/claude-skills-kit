---
description: Convert markdown to a publication-quality PDF with proper print CSS, then verify nothing was lost
argument-hint: "<file.md> [output.pdf] [--toc] [--watermark <text>]"
---

# /make-pdf — Markdown → Publication-Quality PDF

## Usage
```
/make-pdf <file.md>                    — PDF next to the source file
/make-pdf <file.md> <out.pdf>          — explicit output path
/make-pdf <file.md> --toc              — add a table of contents
/make-pdf <file.md> --watermark DRAFT  — diagonal watermark on every page
```

**Iron rule: verify the output.** A PDF that silently dropped a section, truncated a code block, or garbled text is worse than no PDF — the reader trusts it. Phase 4 is not optional.

## Argument Parsing

Parse `$ARGUMENTS`: first `.md` path is the source (must exist — error out if not); optional second path is the output (default: source name with `.pdf`); flags: `--toc`, `--watermark <text>`.

---

## Phase 1: Pick the Toolchain

Try in order; use the first that works, and tell the user which one ran:

| Priority | Tool | Check | Notes |
|----------|------|-------|-------|
| 1 | `npx md-to-pdf` | `npx -y md-to-pdf --version` | Chrome-based; full CSS control via frontmatter/config; best typography |
| 2 | `pandoc` | `pandoc --version` | Needs a PDF engine (`pdflatex`, `wkhtmltopdf`, or `weasyprint`) |
| 3 | Chrome headless | Find the binary: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`, `google-chrome`, or `chromium` | Render md → HTML yourself (e.g. `npx -y marked`), wrap with the print CSS, then `--headless --print-to-pdf=<out> <html>` |

If none is available, stop and tell the user the smallest install that unblocks (usually Node for option 1).

## Phase 2: The Print-CSS Quality Bar

Whatever the toolchain, the output must meet ALL of these. This is what separates a document from a print dump:

| Requirement | Implementation |
|-------------|----------------|
| Page geometry | 1in margins, letter (or a4 if the user's locale suggests it) |
| Running header/footer | Document title top; `Page N of M` bottom. md-to-pdf: `headerTemplate`/`footerTemplate` with `<span class="pageNumber">`/`<span class="totalPages">` |
| No orphan headings | A heading never sits alone at the bottom of a page: `h1,h2,h3 { break-after: avoid; }` |
| Code blocks don't overflow | `pre { white-space: pre-wrap; overflow-wrap: break-word; font-size: 9.5px; }` — long lines wrap, never bleed off the page. Short blocks also get `break-inside: avoid` |
| Image sizing | `img { max-width: 100%; break-inside: avoid; }` — scaled to the content box, never truncated. Very wide diagrams: note to the user they may deserve a landscape page |
| Tables | `thead { display: table-header-group; }` so headers repeat across page breaks; `tr { break-inside: avoid; }` |
| Smart typography | Curly quotes, en/em dashes, ellipses (md-to-pdf: `marked_options: { smartypants: true }`; pandoc: `+smart`) |
| Body text | A clean readable stack (e.g. Helvetica/Arial), ~11pt, `line-height: 1.5`, left-aligned (not justified — justification without hyphenation makes rivers) |
| Copy-paste fidelity | Selecting text in the PDF must yield clean words — no letter-spaced "S a i l i n g" (caused by aggressive letter-spacing in heading CSS; avoid `letter-spacing` > 0.05em) |

Reference config for md-to-pdf — write it as a `pdf-config.js` (or inline frontmatter in a copy of the source, never mutate the user's file):

```js
module.exports = {
  pdf_options: {
    format: "letter",
    margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
    displayHeaderFooter: true,
    headerTemplate: `<style>section{margin:0 auto;font-size:8px;color:#666;}</style><section><span class="title"></span></section>`,
    footerTemplate: `<section style="margin:0 auto;font-size:8px;color:#666;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></section>`,
  },
  marked_options: { smartypants: true },
  css: `
    body { font-family: Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
    h1, h2, h3 { break-after: avoid; }
    h1 { break-before: page; }             /* chapter breaks — drop for single-section memos */
    pre { white-space: pre-wrap; overflow-wrap: break-word; font-size: 9.5px;
          background: #f6f6f6; padding: 8px; break-inside: avoid; }
    img { max-width: 100%; break-inside: avoid; }
    thead { display: table-header-group; }
    tr, blockquote { break-inside: avoid; }
  `,
};
```

- `--toc`: md-to-pdf has no native TOC — generate one (linked heading list) and prepend it to a working copy of the markdown. pandoc: `--toc`.
- `--watermark <text>`: add to the CSS a fixed, rotated, ~10%-opacity element on every page:
  `body::before { content: "DRAFT"; position: fixed; top: 40%; left: 20%; transform: rotate(-45deg); font-size: 120px; color: rgba(0,0,0,0.08); z-index: -1; }` (replace content with the given text).
- Only apply `h1 { break-before: page; }` when the document has multiple H1 chapters — a memo with one H1 gets a blank first-page break otherwise. Never break before the very first H1.
- Mermaid fences: if the source contains ` ```mermaid ` blocks, pre-render them to SVG (`/diagram` Phase 3 tooling) and substitute images in the working copy — otherwise they print as raw code.

## Phase 3: Generate

```bash
npx -y md-to-pdf <working-copy.md> --config-file pdf-config.js
```

or the pandoc / Chrome fallback with the same quality bar (pandoc: `-V geometry:margin=1in --pdf-engine=<engine> -f markdown+smart`). Work on a temp copy when you had to inject frontmatter, a TOC, or rendered diagrams — the user's source file stays untouched. Confirm the output file exists and is non-trivial in size.

## Phase 4: Verify by Extracting Text Back

```bash
pdftotext <out.pdf> - > /tmp/pdf-extract.txt
```

Then check, and report each result:

1. **Headings survived**: every heading text from the source markdown appears in the extract. A missing heading = a dropped or unrendered section — find out why before delivering.
2. **Tail intact**: the last non-empty line of source content appears in the extract (catches truncated renders).
3. **No fragmentation**: grep the extract for letter-spaced words (`grep -E '\b([A-Za-z] ){3,}[A-Za-z]\b'`). Hits mean broken copy-paste — fix the CSS (letter-spacing, ligatures) and regenerate.
4. **Volume sanity**: extracted word count within ~15% of the source's (code blocks and TOC shift it; investigate anything beyond that).
5. **Page count sanity**: `pdfinfo` (or the generator's output) — 1 page for a 5,000-word doc or 40 pages for a memo means a layout bug.

If `pdftotext` is unavailable (install: poppler / poppler-utils), say so, do the page-count and file-size sanity checks, and flag the verification as partial — do not claim the PDF is verified.

## Output

```
## PDF Generated

Source:    <file.md> (<words> words, <headings> headings)
Output:    <out.pdf> (<pages> pages, <size>)
Toolchain: md-to-pdf | pandoc (<engine>) | chrome-headless
Options:   toc: yes/no · watermark: <text>/none · chapter breaks: yes/no

Verification:
- [x] All <N> headings present in extracted text
- [x] Tail of document intact
- [x] No letter-spacing fragmentation
- [x] Word count: <n> extracted vs <m> source (−4%)
- [x] Page count sane (<pages>)
```

Any unchecked box: explain what failed, what you changed, and regenerate — do not deliver a PDF with a failed verification.
