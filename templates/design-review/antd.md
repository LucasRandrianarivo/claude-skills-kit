# /design-review — Visual Audit (Ant Design)

## Usage
```
/design-review [file, route, or component]
```

## Overview
Audit a component or page for visual consistency, Ant Design best practices, and design token adherence. Read the code, compare against Ant Design conventions, and report issues with fixes.

---

## Phase 1: Scope

1. Parse `$ARGUMENTS` for the target: file path, route, or component name
2. Read the target file and identify:
   - Which Ant Design components are used (`Table`, `Form`, `Modal`, `Drawer`, `Tag`, `Button`, etc.)
   - How the antd theme is configured (check `ConfigProvider`, `theme` prop, or `themeConfig`)
   - Whether custom styles override antd defaults (CSS modules, styled-components, inline styles)
3. Read the project's theme configuration:
   - Look for `ConfigProvider` theme in the app root
   - Check `token` values: `colorPrimary`, `borderRadius`, `fontSize`, `colorBgContainer`
   - Check `components` overrides for specific component tokens

## Phase 2: Audit

Check each category. For each issue found, note the file, line, and fix.

### Token Consistency
- [ ] Colors use antd tokens, not hardcoded hex values (use `token.colorPrimary` not `#1890ff`)
- [ ] Spacing follows antd's 8px grid (margins/padding: 8, 16, 24, 32, 40, 48)
- [ ] Border radius uses `token.borderRadius` or `token.borderRadiusLG`
- [ ] Font sizes use antd scale: `token.fontSize`, `token.fontSizeLG`, `token.fontSizeHeading3`, etc.
- [ ] Shadows use `token.boxShadow`, `token.boxShadowSecondary`

### Component Usage
- [ ] `Table`: uses `columns` definition correctly, not manually building a grid
- [ ] `Form`: uses `Form.Item` with `name`, `rules`, and `label` — not raw inputs
- [ ] `Modal` / `Drawer`: uses antd component, not a custom overlay
- [ ] `Button`: uses `type` prop (`primary`, `default`, `text`, `link`), not custom styled buttons
- [ ] `Tag` / `Badge`: uses `color` prop or `status`, not custom background
- [ ] `Select` / `DatePicker`: uses antd version, not a third-party replacement
- [ ] `message` / `notification`: uses antd's API, not custom toast

### Layout Patterns
- [ ] Page uses `Space`, `Flex`, or `Row`/`Col` for layout, not raw `div` with flexbox
- [ ] Consistent gutter: `Row gutter={[16, 16]}` or project's standard
- [ ] Card-based sections use `Card` component with consistent padding
- [ ] View/Edit pattern: unified component that switches mode, not two separate pages

### Responsive Design
- [ ] `Col` uses responsive breakpoints: `xs`, `sm`, `md`, `lg`, `xl`
- [ ] Table uses `scroll={{ x: true }}` for horizontal overflow on mobile
- [ ] Drawer width adapts: full width on mobile, fixed on desktop
- [ ] Form layout switches: `vertical` on mobile, `horizontal` or `inline` on desktop

### Accessibility
- [ ] Buttons have text content or `aria-label`
- [ ] Form fields have labels (via `Form.Item label`)
- [ ] Images have `alt` text
- [ ] Interactive elements are keyboard-navigable (antd handles this by default)

## Phase 3: Fix

For each issue found:
1. Provide the exact code change
2. Keep changes minimal — only fix the visual/design issue
3. Do not change functionality or business logic
4. Use the project's existing antd theme tokens

## Phase 4: Report

```
## Design Review Report

**Target**: <file or route>
**UI Library**: Ant Design <version>
**Theme**: <custom / default>

### Issues Found

| # | Category | Issue | Severity | File:Line |
|---|----------|-------|----------|-----------|
| 1 | Token | Hardcoded color `#1890ff` | Medium | src/Page.tsx:42 |
| 2 | Component | Raw `<input>` instead of antd Input | High | src/Form.tsx:18 |
| 3 | Layout | Missing responsive Col breakpoints | Medium | src/Grid.tsx:9 |

### Fixes Applied
- <file>: <what changed>

### Summary
- Issues found: <count>
- Fixed: <count>
- Remaining (needs user input): <count>
- Overall consistency: Good / Needs work / Poor
```

---

## Ant Design Token Reference

### Core Tokens
| Token | Purpose | Default |
|-------|---------|---------|
| `colorPrimary` | Brand color, primary buttons | `#1677ff` |
| `colorSuccess` | Success states | `#52c41a` |
| `colorWarning` | Warning states | `#faad14` |
| `colorError` | Error states | `#ff4d4f` |
| `borderRadius` | Standard radius | `6` |
| `fontSize` | Base font size | `14` |
| `colorBgContainer` | Container background | `#ffffff` |
| `colorText` | Primary text | `rgba(0,0,0,0.88)` |
| `colorTextSecondary` | Secondary text | `rgba(0,0,0,0.65)` |
