#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

// ── Paths ──────────────────────────────────────────────────────────────────────
const PKG_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PKG_ROOT, 'skills');
const TEMPLATES_DIR = path.join(PKG_ROOT, 'templates');
const CWD = process.cwd();

// ── CLI flags ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const FLAG_FORCE = args.includes('--force');
const FLAG_DRY = args.includes('--dry-run');

// ── Symbols ────────────────────────────────────────────────────────────────────
const SYM = {
  ok: '\u2713',      // ✓
  skip: '\u2298',    // ⊘
  err: '\u2717',     // ✗
  arrow: '\u2192',   // →
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function log(symbol, msg) {
  console.log(`  ${symbol} ${msg}`);
}

function heading(title) {
  console.log(`\n  ${title}`);
  console.log('  ' + '─'.repeat(title.length));
}

/**
 * Recursively collect every file under `dir`, returning paths relative to `dir`.
 */
function walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const child of walkDir(full)) {
        results.push(path.join(entry.name, child));
      }
    } else {
      results.push(entry.name);
    }
  }
  return results;
}

/**
 * Copy a single file from `src` to `dest`, respecting --force / --dry-run and
 * the "never overwrite" policy.  Returns a status string for the summary.
 */
function installFile(src, dest, label) {
  const exists = fs.existsSync(dest);

  if (exists && !FLAG_FORCE) {
    log(SYM.skip, `${label}  (already exists)`);
    return 'skipped';
  }

  if (FLAG_DRY) {
    log(SYM.arrow, `${label}  (dry-run)`);
    return 'dry';
  }

  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  log(SYM.ok, label);
  return 'installed';
}

// ── Stack detection ────────────────────────────────────────────────────────────

function detectStack() {
  const pkgPath = path.join(CWD, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return null;
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return null;
  }

  const allDeps = Object.assign(
    {},
    pkg.dependencies || {},
    pkg.devDependencies || {},
  );

  const has = (name) => name in allDeps;
  const ver = (name) => allDeps[name] || '';

  // ── Framework ──────────────────────────────────────────────────────────────
  let framework = 'node'; // fallback
  let nextRouterVariant = null;

  if (has('next')) {
    framework = 'next';
    // Determine App Router vs Pages Router based on semver.
    // next >=13.4 defaults to App Router.
    const raw = ver('next').replace(/[\^~>=<\s]/g, '');
    const major = parseInt(raw.split('.')[0], 10);
    const minor = parseInt((raw.split('.')[1] || '0'), 10);
    if (major > 13 || (major === 13 && minor >= 4)) {
      nextRouterVariant = 'app';
    } else {
      nextRouterVariant = 'pages';
    }
  } else if (has('react') && has('vite')) {
    framework = 'react-vite';
  } else if (has('express')) {
    framework = 'express';
  }

  // ── UI library ─────────────────────────────────────────────────────────────
  let ui = 'none';
  if (has('antd')) ui = 'antd';
  else if (has('tailwindcss')) ui = 'tailwind';
  else if (has('@chakra-ui/react')) ui = 'chakra';

  // ── Test framework ─────────────────────────────────────────────────────────
  let test = null;
  if (has('vitest')) test = 'vitest';
  else if (has('jest')) test = 'jest';

  // ── Styling ────────────────────────────────────────────────────────────────
  let styling = null;
  if (has('styled-components')) styling = 'styled-components';
  else if (has('tailwindcss')) styling = 'tailwindcss';
  else if (has('@emotion/react')) styling = 'emotion';

  return { framework, nextRouterVariant, ui, test, styling, name: pkg.name || 'unknown' };
}

// ── Template variant mapping ───────────────────────────────────────────────────

function resolveTemplateVariant(category, stack) {
  switch (category) {
    case 'debug': {
      if (stack.framework === 'next') {
        return stack.nextRouterVariant === 'app' ? 'nextjs-app.md' : 'nextjs-pages.md';
      }
      if (stack.framework === 'react-vite') return 'react-vite.md';
      if (stack.framework === 'express') return 'node-express.md';
      return null;
    }

    case 'test': {
      if (stack.test === 'vitest') return 'vitest.md';
      if (stack.test === 'jest') return 'jest.md';
      return null;
    }

    case 'build': {
      if (stack.framework === 'next') return 'nextjs.md';
      if (stack.framework === 'react-vite') return 'vite.md';
      return null;
    }

    case 'design-review': {
      if (stack.ui === 'antd') return 'antd.md';
      if (stack.ui === 'tailwind') return 'tailwind.md';
      if (stack.ui === 'chakra') return 'chakra.md';
      return null; // no UI lib → skip entirely
    }

    case 'scaffolder': {
      if (stack.framework === 'next') {
        return stack.nextRouterVariant === 'app' ? 'nextjs-app.md' : 'nextjs-pages.md';
      }
      if (stack.framework === 'react-vite') return 'react-vite.md';
      return null;
    }

    default:
      return null;
  }
}

// ── Skill routing block for CLAUDE.md ──────────────────────────────────────────

function buildSkillRoutingBlock(stack) {
  const lines = [
    '',
    '## Skill routing',
    '',
    'This project uses **claude-skills-kit** — structured skills for debugging,',
    'code-review, testing, builds, and more.',
    '',
    '| Task | Command |',
    '| --- | --- |',
    '| Debug an issue | `/project:debug` |',
    '| Code review | `/project:review` |',
    '| Run & validate build | `/project:build` |',
    '| Design / UI audit | `/project:design-review` |',
    '| Scaffold a feature | `/project:scaffolder` |',
    '| Run tests | `/project:test` |',
    '',
    `Detected stack: **${stack ? stack.framework : 'unknown'}**` +
      (stack && stack.ui !== 'none' ? ` + **${stack.ui}**` : '') +
      (stack && stack.test ? ` + **${stack.test}**` : ''),
    '',
  ];
  return lines.join('\n');
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  console.log('\n  claude-skills-kit installer');
  console.log('  ==========================');

  if (FLAG_DRY) {
    console.log('  (dry-run mode — no files will be written)\n');
  }
  if (FLAG_FORCE) {
    console.log('  (force mode — existing files will be overwritten)\n');
  }

  // ── 1. Detect stack ──────────────────────────────────────────────────────
  const stack = detectStack();

  if (!stack) {
    console.error(`\n  ${SYM.err} No package.json found in ${CWD}`);
    console.error('    Run this command from the root of a Node.js project.\n');
    process.exit(1);
  }

  heading('Detected stack');
  log(SYM.arrow, `Project:    ${stack.name}`);
  log(SYM.arrow, `Framework:  ${stack.framework}${stack.nextRouterVariant ? ` (${stack.nextRouterVariant} router)` : ''}`);
  log(SYM.arrow, `UI library: ${stack.ui}`);
  log(SYM.arrow, `Tests:      ${stack.test || 'not detected'}`);
  log(SYM.arrow, `Styling:    ${stack.styling || 'not detected'}`);

  const counts = { installed: 0, skipped: 0, dry: 0, warned: 0 };

  function track(status) {
    if (status === 'installed') counts.installed++;
    else if (status === 'skipped') counts.skipped++;
    else if (status === 'dry') counts.dry++;
  }

  // ── 2. Create directory structure ────────────────────────────────────────
  heading('Creating directories');
  const dirs = [
    path.join(CWD, '.claude', 'commands'),
    path.join(CWD, '.claude', 'agents'),
    path.join(CWD, '.claude', 'rules'),
  ];
  for (const dir of dirs) {
    const rel = path.relative(CWD, dir);
    if (fs.existsSync(dir)) {
      log(SYM.skip, `${rel}/  (already exists)`);
    } else if (FLAG_DRY) {
      log(SYM.arrow, `${rel}/  (dry-run)`);
    } else {
      fs.mkdirSync(dir, { recursive: true });
      log(SYM.ok, `${rel}/`);
    }
  }

  // ── 3. Copy generic skills ──────────────────────────────────────────────
  const skillSubdirs = ['commands', 'agents', 'rules'];
  for (const sub of skillSubdirs) {
    const srcDir = path.join(SKILLS_DIR, sub);
    const files = walkDir(srcDir);
    if (files.length === 0) continue;

    heading(`Installing generic skills ${SYM.arrow} .claude/${sub}/`);
    for (const relFile of files) {
      const src = path.join(srcDir, relFile);
      const dest = path.join(CWD, '.claude', sub, relFile);
      const label = `.claude/${sub}/${relFile}`;
      track(installFile(src, dest, label));
    }
  }

  // ── 4. Copy template-based skills ───────────────────────────────────────
  const templateCategories = ['debug', 'test', 'build', 'design-review', 'scaffolder'];
  const unknownStack =
    stack.framework === 'node' &&
    stack.ui === 'none' &&
    !stack.test;

  heading('Installing template skills');

  if (unknownStack) {
    log(SYM.err, 'Could not confidently detect a known framework stack.');
    log(SYM.arrow, 'Only generic skills were installed. You can add template skills manually');
    log(SYM.arrow, `from: ${TEMPLATES_DIR}`);
    counts.warned++;
  } else {
    for (const cat of templateCategories) {
      const variant = resolveTemplateVariant(cat, stack);
      if (!variant) {
        log(SYM.skip, `${cat}  (no matching variant for this stack)`);
        continue;
      }

      const src = path.join(TEMPLATES_DIR, cat, variant);
      if (!fs.existsSync(src)) {
        log(SYM.skip, `${cat}/${variant}  (template not found in package)`);
        continue;
      }

      // Template skills go into .claude/commands/<category>.md
      const dest = path.join(CWD, '.claude', 'commands', `${cat}.md`);
      const label = `.claude/commands/${cat}.md  ${SYM.arrow}  ${cat}/${variant}`;
      track(installFile(src, dest, label));
    }
  }

  // ── 5. Create empty learnings file ──────────────────────────────────────
  heading('Learnings file');
  const learningsPath = path.join(CWD, '.claude', 'learnings.jsonl');
  if (fs.existsSync(learningsPath) && !FLAG_FORCE) {
    log(SYM.skip, '.claude/learnings.jsonl  (already exists)');
    counts.skipped++;
  } else if (FLAG_DRY) {
    log(SYM.arrow, '.claude/learnings.jsonl  (dry-run)');
    counts.dry++;
  } else {
    const dir = path.dirname(learningsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(learningsPath, '', 'utf8');
    log(SYM.ok, '.claude/learnings.jsonl');
    counts.installed++;
  }

  // ── 6. Append skill routing to CLAUDE.md ────────────────────────────────
  heading('CLAUDE.md');
  const claudeMdPath = path.join(CWD, 'CLAUDE.md');

  if (fs.existsSync(claudeMdPath)) {
    const content = fs.readFileSync(claudeMdPath, 'utf8');
    if (content.includes('Skill routing')) {
      log(SYM.skip, 'CLAUDE.md already contains skill routing block');
      counts.skipped++;
    } else if (FLAG_DRY) {
      log(SYM.arrow, 'Would append skill routing to CLAUDE.md  (dry-run)');
      counts.dry++;
    } else {
      fs.appendFileSync(claudeMdPath, buildSkillRoutingBlock(stack), 'utf8');
      log(SYM.ok, 'Appended skill routing block to CLAUDE.md');
      counts.installed++;
    }
  } else if (FLAG_DRY) {
    log(SYM.arrow, 'Would create CLAUDE.md with skill routing  (dry-run)');
    counts.dry++;
  } else {
    fs.writeFileSync(claudeMdPath, `# ${stack.name}\n${buildSkillRoutingBlock(stack)}`, 'utf8');
    log(SYM.ok, 'Created CLAUDE.md with skill routing block');
    counts.installed++;
  }

  // ── 7. Summary ──────────────────────────────────────────────────────────
  heading('Summary');
  if (FLAG_DRY) {
    log(SYM.arrow, `Would install: ${counts.dry} file(s)`);
    log(SYM.arrow, `Already exist: ${counts.skipped} file(s)`);
  } else {
    log(SYM.ok, `Installed: ${counts.installed} file(s)`);
    log(SYM.skip, `Skipped:   ${counts.skipped} file(s)`);
  }
  if (counts.warned > 0) {
    log(SYM.err, `Warnings:  ${counts.warned}`);
  }
  console.log('\n  Done! Run your skills with /project:<skill-name> in Claude Code.\n');
}

main();
