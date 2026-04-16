# /design-review — Visual Design Audit

## Usage
```
/design-review <url>          — audit the page at the given URL
/design-review <url> --fix    — audit and auto-fix issues
```

## Overview

A 4-phase visual audit workflow. Takes a screenshot, audits design quality, reports issues, and optionally fixes them. Uses the `webapp-testing` skill for screenshots and browser interaction.

---

## Phase 1: Capture and Audit

### 1a. Take Screenshot

Use the webapp-testing skill to:
1. Navigate to the provided URL
2. Take a full-page screenshot
3. Display the screenshot for analysis

If no URL is provided, ask the user for one.

### 1b. Visual Audit

Analyze the screenshot against these criteria:

| Category | What to check |
|----------|--------------|
| **Spacing** | Consistent margins/padding, proper whitespace, alignment of elements, grid consistency |
| **Colors** | Contrast ratios (WCAG AA minimum), consistent palette usage, hover/focus state colors |
| **Typography** | Font hierarchy (h1 > h2 > h3), consistent sizes, line height, letter spacing, readability |
| **Components** | Visual consistency between similar elements, proper states (hover, active, disabled, error) |
| **Images** | Proper sizing, aspect ratios, alt text presence, loading states, broken images |
| **Responsive** | Layout at current viewport, overflow issues, truncated text, overlapping elements |
| **Accessibility** | Focus indicators, sufficient contrast, touch target sizes (min 44x44px) |
| **Alignment** | Elements that should be aligned but are not, inconsistent centering |

## Phase 2: Report

Output findings in a structured format:

```
## Design Review: <URL>

### Screenshot
[displayed above]

| # | Severity | Category | Element | Issue | Fix |
|---|----------|----------|---------|-------|-----|
| 1 | 🔴 | Contrast | Login button text | Ratio 2.1:1, needs 4.5:1 | Change text to #FFFFFF |
| 2 | 🟡 | Spacing | Card grid | Inconsistent gap (16px / 24px) | Standardize to 24px |
| 3 | 🟡 | Typography | Section headers | h3 larger than h2 | h2: 24px, h3: 20px |
| 4 | 🔵 | Alignment | Footer links | 3px offset from grid | Align to 8px grid |

**Severity:**
- 🔴 Accessibility violation or broken layout — must fix
- 🟡 Visual inconsistency — should fix
- 🔵 Polish/refinement — nice to have

Score: X/10
```

## Phase 3: Fix (if --fix)

If `--fix` flag is present:

1. For each 🔴 and 🟡 finding:
   - Locate the relevant source file (CSS, component, template)
   - Apply the minimal style/markup change to fix the issue
   - Do NOT redesign — only fix the specific reported issue
2. Skip 🔵 findings (report only)
3. If a fix requires a design decision between valid options, ask the user

**Fix rules:**
- Prefer fixing in the component/style closest to the issue
- Do not add inline styles if the project uses CSS classes/modules
- Follow the project's existing styling patterns (read CLAUDE.md)
- Preserve existing responsive behavior

## Phase 4: Verify (if --fix)

After applying fixes:

1. Use webapp-testing skill to take a new screenshot
2. Display the before/after comparison
3. Verify each fix visually:

```
## Verification

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 1 | Contrast on login button | ✅ Fixed | Now 7.2:1 ratio |
| 2 | Card grid spacing | ✅ Fixed | Consistent 24px gap |
| 3 | Header font sizes | ✅ Fixed | Proper hierarchy |

Before score: X/10
After score: Y/10
```

If any fix did not resolve the issue or caused a regression, flag it for manual review.
