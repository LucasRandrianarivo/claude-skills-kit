#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

// ── Paths ──────────────────────────────────────────────────────────────────────
const PKG_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PKG_ROOT, 'skills');
const TEMPLATES_DIR = path.join(PKG_ROOT, 'templates');
const CWD = process.cwd();

// ── CLI parsing ────────────────────────────────────────────────────────────────
const rawArgs = process.argv.slice(2);
const COMMAND = rawArgs[0] && !rawArgs[0].startsWith('--') ? rawArgs[0] : 'init';
const args = rawArgs.filter((a) => a !== COMMAND);

let FLAG_FORCE = args.includes('--force');
const FLAG_DRY = args.includes('--dry-run');

function flagValue(name) {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  const eq = args.find((a) => a.startsWith(`${name}=`));
  return eq ? eq.split('=').slice(1).join('=') : null;
}

const FLAG_PROFILE = flagValue('--profile') || 'full';
const positional = args.filter((a, i) => {
  if (a.startsWith('--')) return false;
  const prev = args[i - 1];
  return !(prev === '--profile');
});

// ── Symbols ────────────────────────────────────────────────────────────────────
const SYM = {
  ok: '✓', // ✓
  skip: '⊘', // ⊘
  err: '✗', // ✗
  arrow: '→', // →
};

// ── Skill groups (profiles) ────────────────────────────────────────────────────
// Every generic command belongs to exactly one group. `--profile` accepts a
// comma-separated list of groups, or the meta-profiles `full` (everything,
// default) and `core` (the original v1 skill set).
const GROUPS = {
  core: [
    'feat', 'review', 'compact', 'simplify', 'security-review', 'fix-review',
  ],
  plan: [
    'spec', 'plan-ceo-review', 'plan-eng-review', 'plan-design-review',
    'plan-devex-review', 'autoplan', 'office-hours',
  ],
  ship: [
    'ship', 'deploy', 'canary', 'release-notes', 'retro', 'pr-review',
  ],
  quality: [
    'qa', 'health', 'benchmark', 'devex-review', 'cso', 'investigate',
  ],
  design: [
    'design-system', 'design-variants', 'design-html',
  ],
  knowledge: [
    'learn', 'decisions', 'context-save', 'context-restore',
    'document', 'diagram', 'make-pdf', 'scrape', 'skillify',
  ],
};

const RULE_GROUPS = {
  core: ['careful', 'learnings', 'greeting'],
  guard: ['freeze', 'guard', 'redact', 'decisions'],
};

function resolveProfile(profile) {
  const parts = profile.split(',').map((p) => p.trim()).filter(Boolean);
  const commands = new Set();
  const rules = new Set();

  for (const part of parts) {
    if (part === 'full') {
      Object.values(GROUPS).forEach((g) => g.forEach((c) => commands.add(c)));
      Object.values(RULE_GROUPS).forEach((g) => g.forEach((r) => rules.add(r)));
    } else if (GROUPS[part] || RULE_GROUPS[part]) {
      (GROUPS[part] || []).forEach((c) => commands.add(c));
      (RULE_GROUPS[part] || []).forEach((r) => rules.add(r));
    } else {
      console.error(`  ${SYM.err} Unknown profile group: "${part}"`);
      console.error(`    Valid: full, ${Object.keys(Object.assign({}, GROUPS, RULE_GROUPS)).join(', ')}`);
      process.exit(1);
    }
  }

  // Core rules are always active — every profile gets them.
  RULE_GROUPS.core.forEach((r) => rules.add(r));
  return { commands, rules };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function log(symbol, msg) {
  console.log(`  ${symbol} ${msg}`);
}

function heading(title) {
  console.log(`\n  ${title}`);
  console.log('  ' + '─'.repeat(title.length));
}

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

/** Parse the `description:` line of a file's YAML frontmatter, if any. */
function frontmatterDescription(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.startsWith('---')) {
      const h1 = content.split('\n').find((l) => l.startsWith('# '));
      return h1 ? h1.replace(/^#\s*/, '') : '';
    }
    const end = content.indexOf('\n---', 3);
    const fm = content.slice(3, end === -1 ? undefined : end);
    const m = fm.match(/^description:\s*(.+)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch {
    return '';
  }
}

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
  const exists = (p) => fs.existsSync(path.join(CWD, p));

  const stack = {
    name: path.basename(CWD),
    language: 'unknown',
    framework: null,
    nextRouterVariant: null,
    ui: 'none',
    test: null,
    e2e: null,
    styling: null,
    typescript: exists('tsconfig.json'),
    packageManager: null,
    monorepo: false,
  };

  // ── Package manager (lockfiles) ────────────────────────────────────────────
  if (exists('bun.lock') || exists('bun.lockb')) stack.packageManager = 'bun';
  else if (exists('pnpm-lock.yaml')) stack.packageManager = 'pnpm';
  else if (exists('yarn.lock')) stack.packageManager = 'yarn';
  else if (exists('package-lock.json')) stack.packageManager = 'npm';

  // ── Monorepo markers ───────────────────────────────────────────────────────
  stack.monorepo =
    exists('turbo.json') || exists('nx.json') || exists('lerna.json') ||
    exists('pnpm-workspace.yaml');

  // ── Non-Node ecosystems ────────────────────────────────────────────────────
  if (!exists('package.json')) {
    if (exists('pyproject.toml') || exists('requirements.txt')) {
      stack.language = 'python';
      stack.test = exists('pytest.ini') || exists('pyproject.toml') ? 'pytest' : null;
    } else if (exists('go.mod')) {
      stack.language = 'go';
      stack.test = 'go-test';
    } else if (exists('Cargo.toml')) {
      stack.language = 'rust';
      stack.test = 'cargo-test';
    } else if (exists('composer.json')) {
      stack.language = 'php';
    }
    return stack;
  }

  // ── Node ecosystem ─────────────────────────────────────────────────────────
  stack.language = 'node';
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(CWD, 'package.json'), 'utf8'));
  } catch {
    return stack;
  }
  stack.name = pkg.name || stack.name;
  if (pkg.workspaces) stack.monorepo = true;

  const allDeps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
  const has = (name) => name in allDeps;
  const ver = (name) => allDeps[name] || '';

  // ── Framework (ordered most-specific first) ────────────────────────────────
  if (has('next')) {
    stack.framework = 'next';
    const raw = ver('next').replace(/[\^~>=<\s]/g, '');
    const major = parseInt(raw.split('.')[0], 10);
    const minor = parseInt(raw.split('.')[1] || '0', 10);
    stack.nextRouterVariant =
      major > 13 || (major === 13 && minor >= 4) ? 'app' : 'pages';
  } else if (has('@remix-run/react') || has('@remix-run/node')) {
    stack.framework = 'remix';
  } else if (has('astro')) {
    stack.framework = 'astro';
  } else if (has('@sveltejs/kit')) {
    stack.framework = 'sveltekit';
  } else if (has('nuxt') || has('nuxt3')) {
    stack.framework = 'nuxt';
  } else if (has('@angular/core')) {
    stack.framework = 'angular';
  } else if (has('react') && has('vite')) {
    stack.framework = 'react-vite';
  } else if (has('vue') && has('vite')) {
    stack.framework = 'vue-vite';
  } else if (has('@nestjs/core')) {
    stack.framework = 'nestjs';
  } else if (has('fastify')) {
    stack.framework = 'fastify';
  } else if (has('hono')) {
    stack.framework = 'hono';
  } else if (has('express')) {
    stack.framework = 'express';
  } else {
    stack.framework = 'node';
  }

  // ── UI library ─────────────────────────────────────────────────────────────
  if (has('antd')) stack.ui = 'antd';
  else if (fs.existsSync(path.join(CWD, 'components.json')) && has('tailwindcss')) stack.ui = 'shadcn';
  else if (has('tailwindcss')) stack.ui = 'tailwind';
  else if (has('@chakra-ui/react')) stack.ui = 'chakra';
  else if (has('@mui/material')) stack.ui = 'mui';
  else if (has('bootstrap')) stack.ui = 'bootstrap';

  // ── Test frameworks ────────────────────────────────────────────────────────
  if (has('vitest')) stack.test = 'vitest';
  else if (has('jest')) stack.test = 'jest';
  else if (has('mocha')) stack.test = 'mocha';

  if (has('@playwright/test') || has('playwright')) stack.e2e = 'playwright';
  else if (has('cypress')) stack.e2e = 'cypress';

  // ── Styling ────────────────────────────────────────────────────────────────
  if (has('styled-components')) stack.styling = 'styled-components';
  else if (has('tailwindcss')) stack.styling = 'tailwindcss';
  else if (has('@emotion/react')) stack.styling = 'emotion';

  return stack;
}

// ── Template variant mapping ───────────────────────────────────────────────────
// Every category resolves to the most specific variant available, falling back
// to `generic.md` so no stack is ever left without the skill.

function pickVariant(category, candidates) {
  for (const c of candidates) {
    if (c && fs.existsSync(path.join(TEMPLATES_DIR, category, c))) return c;
  }
  return fs.existsSync(path.join(TEMPLATES_DIR, category, 'generic.md'))
    ? 'generic.md'
    : null;
}

function resolveTemplateVariant(category, stack) {
  switch (category) {
    case 'debug': {
      const candidates = [];
      if (stack.framework === 'next') {
        candidates.push(stack.nextRouterVariant === 'app' ? 'nextjs-app.md' : 'nextjs-pages.md');
      }
      if (stack.framework === 'react-vite') candidates.push('react-vite.md');
      if (['express', 'fastify', 'hono', 'nestjs'].includes(stack.framework)) {
        candidates.push('node-express.md');
      }
      return pickVariant(category, candidates);
    }

    case 'test': {
      const candidates = [];
      if (stack.test === 'vitest') candidates.push('vitest.md');
      if (stack.test === 'jest') candidates.push('jest.md');
      return pickVariant(category, candidates);
    }

    case 'build': {
      const candidates = [];
      if (stack.framework === 'next') candidates.push('nextjs.md');
      if (['react-vite', 'vue-vite', 'sveltekit', 'astro'].includes(stack.framework)) {
        candidates.push('vite.md');
      }
      return pickVariant(category, candidates);
    }

    case 'design-review': {
      const candidates = [];
      if (stack.ui === 'antd') candidates.push('antd.md');
      if (stack.ui === 'tailwind' || stack.ui === 'shadcn') candidates.push('tailwind.md');
      if (stack.ui === 'chakra') candidates.push('chakra.md');
      return pickVariant(category, candidates);
    }

    case 'scaffolder': {
      const candidates = [];
      if (stack.framework === 'next') {
        candidates.push(stack.nextRouterVariant === 'app' ? 'nextjs-app.md' : 'nextjs-pages.md');
      }
      if (stack.framework === 'react-vite') candidates.push('react-vite.md');
      return pickVariant(category, candidates);
    }

    default:
      return null;
  }
}

// ── CLAUDE.md block ────────────────────────────────────────────────────────────

const ROUTING_START = '<!-- claude-skills-kit:start -->';
const ROUTING_END = '<!-- claude-skills-kit:end -->';

function buildSkillRoutingBlock(stack, installedRules) {
  const stackLine = stack
    ? `Detected stack: **${stack.framework || stack.language}**` +
      (stack.ui !== 'none' ? ` + **${stack.ui}**` : '') +
      (stack.test ? ` + **${stack.test}**` : '') +
      (stack.e2e ? ` + **${stack.e2e}**` : '') +
      (stack.typescript ? ' + **TypeScript**' : '')
    : 'Detected stack: **unknown**';

  const ruleImports = installedRules
    .map((r) => `@.claude/rules/${r}.md`)
    .join('\n');

  return [
    '',
    ROUTING_START,
    '## Skill routing (claude-skills-kit)',
    '',
    'This project uses **claude-skills-kit** — structured skills for the full dev',
    'lifecycle: spec, plan reviews, coding, debugging, QA, review, ship, deploy.',
    '',
    '| When the user wants to | Use |',
    '| --- | --- |',
    '| Turn an idea into a spec | `/spec` |',
    '| Review a plan before building | `/autoplan` (or `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/plan-devex-review`) |',
    '| Build a feature end-to-end | `/feat` |',
    '| Debug an issue | `/debug` (code) or `/investigate` (any anomaly) |',
    '| Review code | `/review` (local diff) or `/pr-review` (pull request) |',
    '| Security audit | `/security-review` (diff) or `/cso` (full codebase) |',
    '| QA a web app | `/qa` |',
    '| Run tests / build | `/test`, `/build` |',
    '| Design work | `/design-system`, `/design-variants`, `/design-review` |',
    '| Ship & deploy | `/ship`, `/deploy`, `/canary` |',
    '| Docs, diagrams, PDF | `/document`, `/diagram`, `/make-pdf` |',
    '| Knowledge & memory | `/learn`, `/decisions`, `/context-save`, `/context-restore` |',
    '| Health & retro | `/health`, `/retro` |',
    '',
    stackLine,
    '',
    '### Active rules',
    '',
    ruleImports,
    ROUTING_END,
    '',
  ].join('\n');
}

function upsertClaudeMd(stack, installedRules, counts) {
  heading('CLAUDE.md');
  const claudeMdPath = path.join(CWD, 'CLAUDE.md');
  const block = buildSkillRoutingBlock(stack, installedRules);

  if (!fs.existsSync(claudeMdPath)) {
    if (FLAG_DRY) {
      log(SYM.arrow, 'Would create CLAUDE.md with skill routing  (dry-run)');
      counts.dry++;
    } else {
      fs.writeFileSync(claudeMdPath, `# ${stack.name}\n${block}`, 'utf8');
      log(SYM.ok, 'Created CLAUDE.md with skill routing block');
      counts.installed++;
    }
    return;
  }

  const content = fs.readFileSync(claudeMdPath, 'utf8');

  if (content.includes(ROUTING_START)) {
    // Managed block exists — refresh it in place.
    if (FLAG_DRY) {
      log(SYM.arrow, 'Would refresh managed skill-routing block  (dry-run)');
      counts.dry++;
    } else {
      const pattern = new RegExp(`${ROUTING_START}[\\s\\S]*?${ROUTING_END}`);
      fs.writeFileSync(claudeMdPath, content.replace(pattern, block.trim()), 'utf8');
      log(SYM.ok, 'Refreshed skill routing block in CLAUDE.md');
      counts.installed++;
    }
  } else if (content.includes('## Skill routing')) {
    // Legacy v1 unmanaged block — leave it, append nothing twice.
    log(SYM.skip, 'CLAUDE.md contains a legacy skill routing block (left untouched)');
    log(SYM.arrow, 'Tip: delete it and re-run init to get the managed v2 block');
    counts.skipped++;
  } else if (FLAG_DRY) {
    log(SYM.arrow, 'Would append skill routing to CLAUDE.md  (dry-run)');
    counts.dry++;
  } else {
    fs.appendFileSync(claudeMdPath, block, 'utf8');
    log(SYM.ok, 'Appended skill routing block to CLAUDE.md');
    counts.installed++;
  }
}

// ── Commands ───────────────────────────────────────────────────────────────────

function cmdList() {
  console.log('\n  claude-skills-kit — available skills');
  console.log('  ====================================');

  const sections = [
    ['commands', path.join(SKILLS_DIR, 'commands'), 'Slash commands'],
    ['agents', path.join(SKILLS_DIR, 'agents'), 'Subagents'],
    ['rules', path.join(SKILLS_DIR, 'rules'), 'Rules (always active)'],
  ];

  const groupOf = (name) => {
    for (const [g, names] of Object.entries(GROUPS)) {
      if (names.includes(name)) return g;
    }
    return '';
  };

  for (const [, dir, title] of sections) {
    heading(title);
    for (const file of walkDir(dir).sort()) {
      const name = file.replace(/\.md$/, '');
      const desc = frontmatterDescription(path.join(dir, file));
      const group = dir.endsWith('commands') ? groupOf(name) : '';
      console.log(`  ${SYM.arrow} /${name}${group ? `  [${group}]` : ''}`);
      if (desc) console.log(`      ${desc}`);
    }
  }

  heading('Stack-aware templates');
  for (const cat of fs.existsSync(TEMPLATES_DIR) ? fs.readdirSync(TEMPLATES_DIR).sort() : []) {
    const variants = walkDir(path.join(TEMPLATES_DIR, cat))
      .map((f) => f.replace(/\.md$/, ''))
      .join(', ');
    console.log(`  ${SYM.arrow} /${cat}  (variants: ${variants})`);
  }

  heading('Profiles');
  console.log(`  full (default) — everything`);
  console.log(`  core — the essential v1 set`);
  for (const g of Object.keys(GROUPS).filter((g) => g !== 'core')) {
    console.log(`  ${g} — ${GROUPS[g].map((c) => `/${c}`).join(' ')}`);
  }
  console.log('\n  Combine groups: npx claude-skills-kit init --profile core,ship,quality\n');
}

function findSkillSource(name) {
  for (const sub of ['commands', 'agents', 'rules']) {
    const p = path.join(SKILLS_DIR, sub, `${name}.md`);
    if (fs.existsSync(p)) return { src: p, sub };
  }
  return null;
}

function cmdAdd(names, counts) {
  heading('Adding skills');
  for (const name of names) {
    const found = findSkillSource(name);
    if (!found) {
      log(SYM.err, `${name}  (not found in kit — run \`list\` to see available skills)`);
      continue;
    }
    const dest = path.join(CWD, '.claude', found.sub, `${name}.md`);
    counts.track(installFile(found.src, dest, `.claude/${found.sub}/${name}.md`));
  }
}

function cmdRemove(names) {
  heading('Removing skills');
  for (const name of names) {
    let removed = false;
    for (const sub of ['commands', 'agents', 'rules']) {
      const p = path.join(CWD, '.claude', sub, `${name}.md`);
      if (fs.existsSync(p)) {
        if (FLAG_DRY) {
          log(SYM.arrow, `.claude/${sub}/${name}.md  (dry-run)`);
        } else {
          fs.unlinkSync(p);
          log(SYM.ok, `removed .claude/${sub}/${name}.md`);
        }
        removed = true;
      }
    }
    if (!removed) log(SYM.skip, `${name}  (not installed)`);
  }
}

function cmdInit() {
  console.log('\n  claude-skills-kit installer');
  console.log('  ==========================');

  if (FLAG_DRY) console.log('  (dry-run mode — no files will be written)');
  if (FLAG_FORCE) console.log('  (force mode — existing files will be overwritten)');

  const profile = resolveProfile(FLAG_PROFILE);

  // ── 1. Detect stack ──────────────────────────────────────────────────────
  const stack = detectStack();

  heading('Detected stack');
  log(SYM.arrow, `Project:    ${stack.name}`);
  log(SYM.arrow, `Language:   ${stack.language}${stack.typescript ? ' (TypeScript)' : ''}`);
  log(SYM.arrow, `Framework:  ${stack.framework || '—'}${stack.nextRouterVariant ? ` (${stack.nextRouterVariant} router)` : ''}`);
  log(SYM.arrow, `UI library: ${stack.ui}`);
  log(SYM.arrow, `Tests:      ${stack.test || 'not detected'}${stack.e2e ? ` + ${stack.e2e}` : ''}`);
  log(SYM.arrow, `Pkg mgr:    ${stack.packageManager || 'not detected'}${stack.monorepo ? '  (monorepo)' : ''}`);

  const counts = { installed: 0, skipped: 0, dry: 0, warned: 0 };
  counts.track = (status) => {
    if (status === 'installed') counts.installed++;
    else if (status === 'skipped') counts.skipped++;
    else if (status === 'dry') counts.dry++;
  };

  // ── 2. Template-based skills (resolved first: they take precedence over a
  //       same-named generic skill) ─────────────────────────────────────────
  const templateCategories = fs.existsSync(TEMPLATES_DIR)
    ? fs.readdirSync(TEMPLATES_DIR).filter((d) =>
        fs.statSync(path.join(TEMPLATES_DIR, d)).isDirectory())
    : [];
  const templateInstalled = new Set();

  heading('Installing stack-aware skills');
  for (const cat of templateCategories) {
    const variant = resolveTemplateVariant(cat, stack);
    if (!variant) {
      log(SYM.skip, `${cat}  (no matching variant for this stack)`);
      continue;
    }
    const src = path.join(TEMPLATES_DIR, cat, variant);
    const dest = path.join(CWD, '.claude', 'commands', `${cat}.md`);
    const label = `.claude/commands/${cat}.md  ${SYM.arrow}  ${cat}/${variant}`;
    counts.track(installFile(src, dest, label));
    templateInstalled.add(cat);
  }

  // ── 3. Generic skills, filtered by profile ───────────────────────────────
  const skillSubdirs = [
    ['commands', (name) => profile.commands.has(name) && !templateInstalled.has(name)],
    ['agents', () => true],
    ['rules', (name) => profile.rules.has(name)],
  ];

  const installedRules = [];
  for (const [sub, include] of skillSubdirs) {
    const srcDir = path.join(SKILLS_DIR, sub);
    const files = walkDir(srcDir);
    if (files.length === 0) continue;

    heading(`Installing ${sub} ${SYM.arrow} .claude/${sub}/`);
    for (const relFile of files.sort()) {
      const name = relFile.replace(/\.md$/, '');
      if (!include(name)) {
        log(SYM.skip, `${name}  (not in profile "${FLAG_PROFILE}")`);
        continue;
      }
      const src = path.join(srcDir, relFile);
      const dest = path.join(CWD, '.claude', sub, relFile);
      counts.track(installFile(src, dest, `.claude/${sub}/${relFile}`));
      if (sub === 'rules') installedRules.push(name);
    }
  }

  // ── 4. State files ───────────────────────────────────────────────────────
  heading('State files');
  for (const stateFile of ['learnings.jsonl', 'decisions.jsonl']) {
    const p = path.join(CWD, '.claude', stateFile);
    if (fs.existsSync(p)) {
      log(SYM.skip, `.claude/${stateFile}  (already exists)`);
      counts.skipped++;
    } else if (FLAG_DRY) {
      log(SYM.arrow, `.claude/${stateFile}  (dry-run)`);
      counts.dry++;
    } else {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, '', 'utf8');
      log(SYM.ok, `.claude/${stateFile}`);
      counts.installed++;
    }
  }

  // ── 5. CLAUDE.md ─────────────────────────────────────────────────────────
  upsertClaudeMd(stack, installedRules, counts);

  // ── 6. Summary ───────────────────────────────────────────────────────────
  heading('Summary');
  if (FLAG_DRY) {
    log(SYM.arrow, `Would install: ${counts.dry} file(s)`);
    log(SYM.arrow, `Already exist: ${counts.skipped} file(s)`);
  } else {
    log(SYM.ok, `Installed: ${counts.installed} file(s)`);
    log(SYM.skip, `Skipped:   ${counts.skipped} file(s)`);
  }
  console.log('\n  Done! Type / in Claude Code to see your skills, or run:');
  console.log('  npx claude-skills-kit list\n');
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  const counts = { installed: 0, skipped: 0, dry: 0 };
  counts.track = (status) => {
    if (status === 'installed') counts.installed++;
    else if (status === 'skipped') counts.skipped++;
    else if (status === 'dry') counts.dry++;
  };

  switch (COMMAND) {
    case 'init':
      cmdInit();
      break;
    case 'list':
      cmdList();
      break;
    case 'add':
      if (positional.length === 0) {
        console.error(`\n  ${SYM.err} Usage: npx claude-skills-kit add <skill> [<skill>...]\n`);
        process.exit(1);
      }
      cmdAdd(positional, counts);
      console.log('');
      break;
    case 'remove':
      if (positional.length === 0) {
        console.error(`\n  ${SYM.err} Usage: npx claude-skills-kit remove <skill> [<skill>...]\n`);
        process.exit(1);
      }
      cmdRemove(positional);
      console.log('');
      break;
    case 'update':
      console.log('\n  Re-running init with --force to refresh installed skills...');
      FLAG_FORCE = true;
      cmdInit();
      break;
    default:
      console.error(`\n  ${SYM.err} Unknown command: ${COMMAND}`);
      console.error('    Usage: npx claude-skills-kit <init|list|add|remove|update> [options]\n');
      process.exit(1);
  }
}

main();
