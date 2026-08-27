#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

// ── Paths ──────────────────────────────────────────────────────────────────────
const PKG_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PKG_ROOT, 'skills');
const TEMPLATES_DIR = path.join(PKG_ROOT, 'templates');
const REFERENCES_DIR = path.join(PKG_ROOT, 'references');
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
    'plan-devex-review', 'autoplan', 'office-hours', 'architecture',
  ],
  ship: [
    'ship', 'deploy', 'canary', 'release-notes', 'retro', 'pr-review',
  ],
  quality: [
    'qa', 'health', 'benchmark', 'devex-review', 'cso', 'investigate',
    'testing', 'upgrade', 'refactor',
  ],
  design: [
    'design-system', 'design-variants', 'design-html',
  ],
  knowledge: [
    'learn', 'decisions', 'context-save', 'context-restore',
    'document', 'diagram', 'make-pdf', 'scrape', 'skillify', 'rag', 'adr',
  ],
  frontend: [
    'a11y', 'web-vitals', 'responsive', 'state', 'seo', 'i18n',
  ],
  agentic: [
    'fullstack', 'contract', 'orchestrate',
  ],
  api: [
    'api-scout', 'integrate', 'webhook', 'api-refresh', 'notifications',
  ],
  platform: [
    'nginx', 'docker', 'git', 'observability', 'incident', 'env',
    'k8s', 'iac', 'cost',
  ],
  backend: [
    'jobs', 'cache', 'realtime', 'search', 'files', 'api-design',
  ],
  product: [
    'flags', 'analytics', 'llm',
  ],
  pro: [
    'proposal', 'estimate', 'kickoff', 'status', 'change-request', 'invoice',
    'meeting', 'tech-debt', 'interview', 'onboarding',
  ],
  data: [
    'db', 'payments',
  ],
  security: [
    'auth', 'rgpd',
  ],
  mobile: [
    'mobile-release',
  ],
  project: [
    'project', 'brainstorm', 'cdc', 'roadmap', 'exec-plan', 'validate', 'delivery',
  ],
};

// Stack-aware template categories that belong to a profile group. Categories
// absent from this map (debug, test, build, design-review, scaffolder) are
// installed for every profile.
const TEMPLATE_GROUPS = {
  component: 'frontend',
  cicd: 'platform',
  mobile: 'mobile',
};

const RULE_GROUPS = {
  core: ['careful', 'learnings', 'greeting', 'evidence', 'expertise'],
  guard: ['freeze', 'guard', 'redact', 'decisions'],
};

function resolveProfile(profile) {
  const parts = profile.split(',').map((p) => p.trim()).filter(Boolean);
  const commands = new Set();
  const rules = new Set();
  const groups = new Set();

  for (const part of parts) {
    if (part === 'full') {
      Object.keys(GROUPS).forEach((g) => groups.add(g));
      Object.keys(RULE_GROUPS).forEach((g) => groups.add(g));
      Object.values(GROUPS).forEach((g) => g.forEach((c) => commands.add(c)));
      Object.values(RULE_GROUPS).forEach((g) => g.forEach((r) => rules.add(r)));
    } else if (GROUPS[part] || RULE_GROUPS[part]) {
      groups.add(part);
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
  groups.add('core');
  return { commands, rules, groups };
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
    mobile: null,
    ci: null,
  };

  // ── CI provider (independent of the language ecosystem) ────────────────────
  if (exists('.github/workflows')) stack.ci = 'github-actions';
  else if (exists('.gitlab-ci.yml')) stack.ci = 'gitlab-ci';
  else if (exists('Jenkinsfile')) stack.ci = 'jenkins';
  else if (exists('.circleci/config.yml')) stack.ci = 'circleci';
  else if (exists('bitbucket-pipelines.yml')) stack.ci = 'bitbucket';
  else if (exists('azure-pipelines.yml')) stack.ci = 'azure';

  // ── Flutter (no package.json) ──────────────────────────────────────────────
  if (exists('pubspec.yaml')) stack.mobile = 'flutter';

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
    } else if (stack.mobile === 'flutter') {
      stack.language = 'dart';
      stack.test = 'flutter-test';
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

  // ── Mobile ─────────────────────────────────────────────────────────────────
  if (has('expo')) stack.mobile = 'expo';
  else if (has('react-native')) stack.mobile = 'react-native';
  // Only claim the framework slot when no web framework was detected — a
  // monorepo root holding both (SvelteKit + Expo) keeps its web framework so
  // the web-facing variants (build, component, debug) stay correct.
  if (stack.mobile && stack.framework === 'node') stack.framework = stack.mobile;

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

    case 'component': {
      const candidates = [];
      if (['next', 'remix', 'react-vite', 'astro', 'react-native', 'expo'].includes(stack.framework)) {
        candidates.push('react.md');
      }
      if (['nuxt', 'vue-vite'].includes(stack.framework)) candidates.push('vue.md');
      if (stack.framework === 'sveltekit') candidates.push('svelte.md');
      // A pure Flutter project builds widgets through /mobile; a JS project that
      // merely vendors a Flutter app still gets its own component skill.
      if (stack.mobile === 'flutter' && stack.language === 'dart') return null;
      return pickVariant(category, candidates);
    }

    case 'cicd': {
      const candidates = [];
      if (stack.ci === 'github-actions') candidates.push('github-actions.md');
      if (stack.ci === 'gitlab-ci') candidates.push('gitlab-ci.md');
      return pickVariant(category, candidates);
    }

    case 'mobile': {
      // Mobile-only: no variant (not even generic) for a non-mobile project.
      if (!stack.mobile) return null;
      const candidates = [];
      if (stack.mobile === 'expo') candidates.push('expo.md');
      if (stack.mobile === 'react-native') candidates.push('react-native.md');
      if (stack.mobile === 'flutter') candidates.push('flutter.md');
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

function buildSkillRoutingBlock(stack, installedRules, installedCommands) {
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

  // Each row lists the commands it points at: only the installed ones are
  // rendered, and a row whose commands are all absent is dropped entirely — so
  // a narrow profile never points Claude at a skill the project doesn't have.
  const has = (c) => installedCommands.has(c);
  const routingRows = [
    ['Run a whole project (idea → delivery)', [['project', '`/project` (then `/brainstorm`, `/cdc`, `/roadmap`, `/exec-plan`, `/validate`, `/delivery`)']]],
    ['Quote or estimate work', [['proposal', '`/proposal`'], ['estimate', '`/estimate`']]],
    ['Start an engagement', [['kickoff', '`/kickoff`']]],
    ['Report progress to a client or sponsor', [['status', '`/status`']]],
    ['Handle a scope change', [['change-request', '`/change-request`']]],
    ['Prepare billing', [['invoice', '`/invoice`']]],
    ['Run a meeting that produces decisions', [['meeting', '`/meeting`']]],
    ['Make the case for fixing technical debt', [['tech-debt', '`/tech-debt`']]],
    ['Hire or onboard a developer', [['interview', '`/interview`'], ['onboarding', '`/onboarding`']]],
    ['Turn an idea into a spec', [['spec', '`/spec`']]],
    ['Review a plan before building', [['autoplan', '`/autoplan`'], ['plan-ceo-review', '`/plan-ceo-review`'], ['plan-eng-review', '`/plan-eng-review`'], ['plan-design-review', '`/plan-design-review`'], ['plan-devex-review', '`/plan-devex-review`']]],
    ['Build a feature end-to-end', [['feat', '`/feat` (one layer)'], ['fullstack', '`/fullstack` (db + api + client, contract-first)']], ' or '],
    ['Agree an API shape between layers', [['contract', '`/contract`']]],
    ['Design the system (boundaries, failure modes)', [['architecture', '`/architecture`']]],
    ['Run wide repetitive work with many agents', [['orchestrate', '`/orchestrate`']]],
    ['Build a UI component, then audit it', [['component', '`/component`'], ['a11y', '`/a11y`'], ['responsive', '`/responsive`']]],
    ['Frontend quality', [['a11y', '`/a11y`'], ['responsive', '`/responsive`'], ['web-vitals', '`/web-vitals`'], ['state', '`/state`']]],
    ['SEO & internationalization', [['seo', '`/seo`'], ['i18n', '`/i18n`']]],
    ['Mobile work', [['mobile', '`/mobile`'], ['mobile-release', '`/mobile-release`']]],
    ['Use a third-party API', [['api-scout', '`/api-scout` (choose)'], ['integrate', '`/integrate` (build)'], ['webhook', '`/webhook` (inbound)']], ' → '],
    ['Keep integrations current', [['api-refresh', '`/api-refresh`']]],
    ['Schema, migrations, slow queries', [['db', '`/db`']]],
    ['Background jobs & queues', [['jobs', '`/jobs`']]],
    ['Caching', [['cache', '`/cache`']]],
    ['Realtime / live updates', [['realtime', '`/realtime`']]],
    ['Search', [['search', '`/search`']]],
    ['Uploads & media', [['files', '`/files`']]],
    ['Design an API others consume', [['api-design', '`/api-design`']]],
    ['Auth & permissions', [['auth', '`/auth`']]],
    ['Payments & billing', [['payments', '`/payments`']]],
    ['Email & push', [['notifications', '`/notifications`']]],
    ['GDPR/RGPD compliance', [['rgpd', '`/rgpd`']]],
    ['AI / LLM features', [['llm', '`/llm`']]],
    ['Feature flags & experiments', [['flags', '`/flags`']]],
    ['Product analytics', [['analytics', '`/analytics`']]],
    ['Debug an issue', [['debug', '`/debug` (code)'], ['investigate', '`/investigate` (any anomaly)']], ' or '],
    ['Review code', [['review', '`/review` (local diff)'], ['pr-review', '`/pr-review` (pull request)']], ' or '],
    ['Security audit', [['security-review', '`/security-review` (diff)'], ['cso', '`/cso` (full codebase)']], ' or '],
    ['QA a web app', [['qa', '`/qa`']]],
    ['Run tests / build', [['test', '`/test`'], ['build', '`/build`']]],
    ['Decide what to test, write what is missing', [['testing', '`/testing`']]],
    ['Upgrade a framework or dependency', [['upgrade', '`/upgrade`']]],
    ['Restructure code safely', [['refactor', '`/refactor`']]],
    ['Design work', [['design-system', '`/design-system`'], ['design-variants', '`/design-variants`'], ['design-html', '`/design-html`'], ['design-review', '`/design-review`']]],
    ['CI/CD, containers, server, git', [['cicd', '`/cicd`'], ['docker', '`/docker`'], ['nginx', '`/nginx`'], ['git', '`/git`']]],
    ['Ship & deploy', [['ship', '`/ship`'], ['deploy', '`/deploy`'], ['canary', '`/canary`']]],
    ['Logs, metrics, traces, alerts', [['observability', '`/observability`']]],
    ['Production is broken right now', [['incident', '`/incident`']]],
    ['Config & secrets', [['env', '`/env`']]],
    ['Kubernetes & infrastructure as code', [['k8s', '`/k8s`'], ['iac', '`/iac`']]],
    ['Infrastructure cost', [['cost', '`/cost`']]],
    ['Docs, diagrams, PDF', [['document', '`/document`'], ['diagram', '`/diagram`'], ['make-pdf', '`/make-pdf`']]],
    ['Knowledge & memory', [['learn', '`/learn`'], ['decisions', '`/decisions`'], ['context-save', '`/context-save`'], ['context-restore', '`/context-restore`']]],
    ['Health & retro', [['health', '`/health`'], ['retro', '`/retro`']]],
  ]
    .map(([label, items, join]) => {
      const present = items.filter(([c]) => has(c)).map(([, text]) => text);
      return present.length ? `| ${label} | ${present.join(join || ', ')} |` : null;
    })
    .filter(Boolean);

  return [
    '',
    ROUTING_START,
    '## Skill routing (claude-skills-kit)',
    '',
    'This project uses **claude-skills-kit** — structured skills for the whole job:',
    'project mode (brainstorm → cahier des charges → roadmap → execution → acceptance',
    '→ delivery), fullstack orchestration, frontend, mobile, API integration, CI/CD,',
    'containers, git, review, ship and deploy.',
    '',
    '| When the user wants to | Use |',
    '| --- | --- |',
    ...routingRows,
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

function upsertClaudeMd(stack, installedRules, installedCommands, counts) {
  heading('CLAUDE.md');
  const claudeMdPath = path.join(CWD, 'CLAUDE.md');
  const block = buildSkillRoutingBlock(stack, installedRules, installedCommands);

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

  heading('Field notes (installed to .claude/references/)');
  for (const file of walkDir(REFERENCES_DIR).sort()) {
    const name = file.replace(/\.md$/, '');
    const h1 = (() => {
      try {
        const l = fs.readFileSync(path.join(REFERENCES_DIR, file), 'utf8').split('\n').find((x) => x.startsWith('# '));
        return l ? l.replace(/^#\s*/, '') : '';
      } catch { return ''; }
    })();
    console.log(`  ${SYM.arrow} ${name}`);
    if (h1) console.log(`      ${h1}`);
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
    const templates = Object.keys(TEMPLATE_GROUPS)
      .filter((cat) => TEMPLATE_GROUPS[cat] === g)
      .map((cat) => `/${cat}*`);
    const names = GROUPS[g].map((c) => `/${c}`).concat(templates);
    console.log(`  ${g} — ${names.join(' ')}`);
  }
  console.log('  * stack-aware: installed as the variant matching your project');
  console.log('\n  Combine groups: npx claude-skills-kit init --profile core,ship,quality\n');
}

function findSkillSource(name) {
  for (const sub of ['commands', 'agents', 'rules']) {
    const p = path.join(SKILLS_DIR, sub, `${name}.md`);
    if (fs.existsSync(p)) return { src: p, sub };
  }
  // Field notes live in references/<name>.md and install alongside the skills.
  const refPath = path.join(REFERENCES_DIR, `${name}.md`);
  if (fs.existsSync(refPath)) return { src: refPath, sub: 'references' };

  // Stack-aware categories live in templates/<name>/ — resolve the variant that
  // matches this project so `add component` works like `init` would have.
  const catDir = path.join(TEMPLATES_DIR, name);
  if (fs.existsSync(catDir) && fs.statSync(catDir).isDirectory()) {
    const variant = resolveTemplateVariant(name, detectStack());
    if (variant) {
      return { src: path.join(catDir, variant), sub: 'commands', variant: `${name}/${variant}` };
    }
    return { unavailable: true };
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
    if (found.unavailable) {
      log(SYM.skip, `${name}  (stack-aware skill with no variant for this project)`);
      continue;
    }
    const dest = path.join(CWD, '.claude', found.sub, `${name}.md`);
    const label = found.variant
      ? `.claude/${found.sub}/${name}.md  ${SYM.arrow}  ${found.variant}`
      : `.claude/${found.sub}/${name}.md`;
    counts.track(installFile(found.src, dest, label));
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
  log(SYM.arrow, `Mobile:     ${stack.mobile || '—'}`);
  log(SYM.arrow, `CI:         ${stack.ci || 'not detected'}`);
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
  const installedCommands = new Set();

  heading('Installing stack-aware skills');
  for (const cat of templateCategories) {
    const catGroup = TEMPLATE_GROUPS[cat];
    if (catGroup && !profile.groups.has(catGroup)) {
      log(SYM.skip, `${cat}  (not in profile "${FLAG_PROFILE}")`);
      continue;
    }
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
    installedCommands.add(cat);
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
      if (sub === 'commands') installedCommands.add(name);
    }
  }

  // ── 3b. Field notes (domain references consulted by the skills) ──────────
  const referenceFiles = walkDir(REFERENCES_DIR);
  if (referenceFiles.length > 0) {
    heading(`Installing field notes ${SYM.arrow} .claude/references/`);
    for (const relFile of referenceFiles.sort()) {
      const src = path.join(REFERENCES_DIR, relFile);
      const dest = path.join(CWD, '.claude', 'references', relFile);
      counts.track(installFile(src, dest, `.claude/references/${relFile}`));
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
  upsertClaudeMd(stack, installedRules, installedCommands, counts);

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

// ── setup-rag: one-command local RAG (Docker Chroma + MCP + hook + policy) ─────

const { execSync, spawnSync } = require('child_process');
const os = require('os');

function sh(cmd, opts) {
  return execSync(cmd, Object.assign({ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }, opts)).trim();
}
function trySh(cmd) {
  try { return sh(cmd); } catch { return null; }
}

const RAG_CONTAINER = 'claude-rag';
const RAG_DATA_DIR = path.join(os.homedir(), '.claude', 'rag-server');
const RAG_POLICY_START = '<!-- claude-skills-kit:rag:start -->';
const RAG_POLICY_END = '<!-- claude-skills-kit:rag:end -->';

function ragPolicyBlock(port) {
  return [
    '', RAG_POLICY_START,
    '## Local RAG — MCP server « rag » (shared, always available)',
    '',
    `A user-scoped MCP server named \`rag\` exposes a shared local vector store (Chroma in Docker on \`localhost:${port}\`, container \`${RAG_CONTAINER}\`, local ONNX embeddings — no API key, nothing leaves the machine). All sessions across all projects talk to this single server. Use it as persistent semantic memory:`,
    '',
    '**Query it** (`chroma_query_documents`, after `chroma_list_collections` if unsure) when the user asks a knowledge question the current repo cannot answer (past audits, vendor docs, decisions, cross-project learnings), or says "search the RAG / qu\'est-ce qu\'on sait sur…".',
    '',
    '**Index into it** (`chroma_add_documents`) when a durable document is produced or analyzed, or on request. Chunk 500–1500 chars, stable prefixed ids (`<source-slug>-<n>`), metadata `{"source","project","date"}` — upsert so re-indexing never duplicates.',
    '',
    '**Conventions**: one collection per corpus (kebab-case); always fill the `project` metadata field; check existing collections before creating; never delete a collection another project may use without asking; code stays out (use Grep on the repo); never index secrets or .env contents.',
    '',
    '**Discussions**: the `discussions` collection is fed automatically by a PostCompact hook (compaction summaries, secret-redacted, archived in `~/.claude/discussions/`). Query it for "what did we say about…", "where were we on…" — filter by `project` metadata when relevant.',
    '',
    `**If the server is down**: \`docker start ${RAG_CONTAINER}\` (requires Docker running).`,
    RAG_POLICY_END, '',
  ].join('\n');
}

function ragHookCommand(dockerPath) {
  return `d=${dockerPath}; "$d" ps -q --filter name=${RAG_CONTAINER} --filter status=running 2>/dev/null | grep -q . && exit 0; "$d" start ${RAG_CONTAINER} >/dev/null 2>&1 && echo "{\\"systemMessage\\":\\"RAG: container ${RAG_CONTAINER} restarted\\"}" || echo "{\\"systemMessage\\":\\"RAG unavailable — start Docker, then: docker start ${RAG_CONTAINER}\\"}"`;
}

function cmdSetupRag() {
  const remove = args.includes('--remove');
  const port = flagValue('--port') || '8765';
  const userSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const userClaudeMdPath = path.join(os.homedir(), '.claude', 'CLAUDE.md');

  console.log('\n  claude-skills-kit — local RAG setup');
  console.log('  ===================================');

  const dockerPath = trySh('command -v docker');
  const claudePath = trySh('command -v claude');

  if (remove) {
    heading('Removing local RAG');
    if (dockerPath) {
      trySh(`docker rm -f ${RAG_CONTAINER}`);
      log(SYM.ok, `container ${RAG_CONTAINER} removed (data kept in ${RAG_DATA_DIR})`);
    }
    if (claudePath) {
      trySh('claude mcp remove --scope user rag');
      log(SYM.ok, 'MCP server "rag" unregistered');
    }
    if (fs.existsSync(userClaudeMdPath)) {
      const md = fs.readFileSync(userClaudeMdPath, 'utf8');
      if (md.includes(RAG_POLICY_START)) {
        const pattern = new RegExp(`\\n?${RAG_POLICY_START}[\\s\\S]*?${RAG_POLICY_END}\\n?`);
        fs.writeFileSync(userClaudeMdPath, md.replace(pattern, '\n'), 'utf8');
        log(SYM.ok, 'RAG policy removed from ~/.claude/CLAUDE.md');
      }
    }
    if (fs.existsSync(userSettingsPath)) {
      try {
        const st = JSON.parse(fs.readFileSync(userSettingsPath, 'utf8'));
        if (st.hooks && st.hooks.SessionStart) {
          st.hooks.SessionStart = st.hooks.SessionStart.filter(
            (e) => !JSON.stringify(e).includes(RAG_CONTAINER));
          if (st.hooks.SessionStart.length === 0) delete st.hooks.SessionStart;
        }
        if (st.hooks && st.hooks.PostCompact) {
          st.hooks.PostCompact = st.hooks.PostCompact.filter(
            (e) => !JSON.stringify(e).includes('index-discussion'));
          if (st.hooks.PostCompact.length === 0) delete st.hooks.PostCompact;
        }
        if (st.hooks && Object.keys(st.hooks).length === 0) delete st.hooks;
        fs.writeFileSync(userSettingsPath, JSON.stringify(st, null, 2), 'utf8');
        log(SYM.ok, 'SessionStart + PostCompact hooks removed');
      } catch { log(SYM.err, 'could not parse ~/.claude/settings.json — hooks left as is'); }
    }
    const indexer = path.join(os.homedir(), '.claude', 'bin', 'index-discussion.py');
    if (fs.existsSync(indexer)) {
      fs.unlinkSync(indexer);
      log(SYM.ok, 'discussion indexer removed (archives kept in ~/.claude/discussions/)');
    }
    console.log('\n  Done. Delete the data with: rm -rf ' + RAG_DATA_DIR + '\n');
    return;
  }

  // ── 1. Preflight ─────────────────────────────────────────────────────────
  heading('Preflight');
  if (!dockerPath) {
    log(SYM.err, 'docker not found — install Docker Desktop (or docker engine) first');
    process.exit(1);
  }
  if (!trySh('docker info --format ok')) {
    log(SYM.err, 'Docker daemon is not running — start Docker, then re-run this command');
    process.exit(1);
  }
  log(SYM.ok, `docker  (${dockerPath})`);
  const py = trySh('command -v python3');
  if (!py) {
    log(SYM.err, 'python3 not found — needed for the chroma-mcp bridge');
    process.exit(1);
  }
  log(SYM.ok, `python3 (${py})`);
  log(claudePath ? SYM.ok : SYM.skip, `claude CLI ${claudePath ? `(${claudePath})` : 'not found — MCP registration will be printed for manual setup'}`);

  // ── 2. Chroma server container ───────────────────────────────────────────
  heading('Chroma server (Docker)');
  const existing = trySh(`docker ps -aq --filter name=^${RAG_CONTAINER}$`);
  if (existing) {
    trySh(`docker start ${RAG_CONTAINER}`);
    log(SYM.ok, `container ${RAG_CONTAINER} already exists — started`);
  } else {
    if (FLAG_DRY) {
      log(SYM.arrow, `would run chromadb/chroma on port ${port} (dry-run)`);
    } else {
      try {
        sh(`docker run -d --name ${RAG_CONTAINER} --restart unless-stopped -p ${port}:8000 -v "${RAG_DATA_DIR}:/chroma/chroma" chromadb/chroma`);
        log(SYM.ok, `container ${RAG_CONTAINER} running on localhost:${port} (data: ${RAG_DATA_DIR}, restarts automatically)`);
      } catch (e) {
        log(SYM.err, 'docker run failed:');
        console.error(`    ${(e.stderr || e.message || '').toString().trim().split('\n')[0]}`);
        console.error(`    If the port is taken, retry with: npx claude-skills-kit setup-rag --port <other>\n`);
        process.exit(1);
      }
    }
  }

  // ── 3. chroma-mcp bridge ─────────────────────────────────────────────────
  heading('MCP bridge (chroma-mcp)');
  if (!FLAG_DRY && !trySh('python3 -m pip show chroma-mcp')) {
    log(SYM.arrow, 'installing chroma-mcp via pip (one-time, may take a minute)...');
    sh('python3 -m pip install --quiet chroma-mcp certifi', { stdio: 'ignore' });
  }
  const scriptsDir = trySh(`python3 -c "import sysconfig; print(sysconfig.get_path('scripts'))"`);
  let mcpBin = trySh('command -v chroma-mcp') ||
    (scriptsDir && fs.existsSync(path.join(scriptsDir, 'chroma-mcp')) ? path.join(scriptsDir, 'chroma-mcp') : null);
  if (!mcpBin && !FLAG_DRY) {
    log(SYM.err, 'chroma-mcp not found after install — check `python3 -m pip install chroma-mcp`');
    process.exit(1);
  }
  log(SYM.ok, `chroma-mcp (${mcpBin || 'dry-run'})`);

  // ── 4. Register MCP server (user scope) ──────────────────────────────────
  heading('Claude Code MCP registration');
  const cert = trySh(`python3 -c "import certifi; print(certifi.where())"`);
  const envFlags = (cert ? `-e SSL_CERT_FILE=${cert} ` : '') + '-e ANONYMIZED_TELEMETRY=False';
  const addCmd = `claude mcp add --scope user ${envFlags} -- rag ${mcpBin} --client-type http --host localhost --port ${port} --ssl false`;
  if (!claudePath) {
    log(SYM.arrow, 'run this manually once the claude CLI is installed:');
    console.log(`\n    ${addCmd}\n`);
  } else if (FLAG_DRY) {
    log(SYM.arrow, 'would register MCP server "rag" (dry-run)');
  } else {
    trySh('claude mcp remove --scope user rag');
    sh(addCmd);
    log(SYM.ok, 'MCP server "rag" registered (user scope — available in every project)');
  }

  // ── 5. SessionStart hook (auto-heal) ─────────────────────────────────────
  heading('SessionStart hook');
  if (FLAG_DRY) {
    log(SYM.arrow, 'would add auto-heal hook to ~/.claude/settings.json (dry-run)');
  } else {
    let st = {};
    try { st = JSON.parse(fs.readFileSync(userSettingsPath, 'utf8')); } catch { /* new file */ }
    st.hooks = st.hooks || {};
    st.hooks.SessionStart = st.hooks.SessionStart || [];
    if (JSON.stringify(st.hooks.SessionStart).includes(RAG_CONTAINER)) {
      log(SYM.skip, 'hook already present');
    } else {
      st.hooks.SessionStart.push({
        hooks: [{ type: 'command', command: ragHookCommand(dockerPath), timeout: 15, statusMessage: 'Checking RAG server…' }],
      });
      fs.mkdirSync(path.dirname(userSettingsPath), { recursive: true });
      fs.writeFileSync(userSettingsPath, JSON.stringify(st, null, 2), 'utf8');
      log(SYM.ok, 'auto-heal hook added (restarts the container at session start if needed)');
    }
  }

  // ── 5b. Discussion capture (PostCompact → RAG) ───────────────────────────
  heading('Discussion capture');
  const indexerSrc = path.join(PKG_ROOT, 'assets', 'index-discussion.py');
  const indexerDest = path.join(os.homedir(), '.claude', 'bin', 'index-discussion.py');
  if (FLAG_DRY) {
    log(SYM.arrow, 'would install PostCompact hook + indexer (dry-run)');
  } else {
    fs.mkdirSync(path.dirname(indexerDest), { recursive: true });
    fs.copyFileSync(indexerSrc, indexerDest);
    let st = {};
    try { st = JSON.parse(fs.readFileSync(userSettingsPath, 'utf8')); } catch { /* new file */ }
    st.hooks = st.hooks || {};
    st.hooks.PostCompact = st.hooks.PostCompact || [];
    if (JSON.stringify(st.hooks.PostCompact).includes('index-discussion')) {
      log(SYM.skip, 'PostCompact hook already present');
    } else {
      const cert = trySh(`python3 -c "import certifi; print(certifi.where())"`);
      st.hooks.PostCompact.push({
        hooks: [{
          type: 'command',
          command: `${cert ? `SSL_CERT_FILE=${cert} ` : ''}CLAUDE_RAG_PORT=${port} /usr/bin/env python3 ${indexerDest}`,
          timeout: 120,
          async: true,
          statusMessage: 'Indexing discussion into the RAG…',
        }],
      });
      fs.writeFileSync(userSettingsPath, JSON.stringify(st, null, 2), 'utf8');
      log(SYM.ok, 'every compaction summary is now archived (~/.claude/discussions/) and indexed (collection "discussions") — no conversation is lost');
    }
  }

  // ── 6. Usage policy in global CLAUDE.md ──────────────────────────────────
  heading('Usage policy (~/.claude/CLAUDE.md)');
  if (FLAG_DRY) {
    log(SYM.arrow, 'would write RAG usage policy (dry-run)');
  } else {
    const md = fs.existsSync(userClaudeMdPath) ? fs.readFileSync(userClaudeMdPath, 'utf8') : '# Global instructions (all projects)\n';
    if (md.includes(RAG_POLICY_START)) {
      const pattern = new RegExp(`${RAG_POLICY_START}[\\s\\S]*?${RAG_POLICY_END}`);
      fs.writeFileSync(userClaudeMdPath, md.replace(pattern, ragPolicyBlock(port).trim()), 'utf8');
      log(SYM.ok, 'policy refreshed');
    } else {
      fs.writeFileSync(userClaudeMdPath, md + ragPolicyBlock(port), 'utf8');
      log(SYM.ok, 'policy appended — loaded by every session in every project');
    }
  }

  // ── 7. Smoke test ────────────────────────────────────────────────────────
  heading('Smoke test');
  if (!FLAG_DRY) {
    let ok = false;
    for (let i = 0; i < 10 && !ok; i++) {
      ok = !!trySh(`curl -s --max-time 2 http://localhost:${port}/api/v2/heartbeat`);
      if (!ok) spawnSync('sleep', ['1']);
    }
    log(ok ? SYM.ok : SYM.err, ok ? 'Chroma server responds' : `server not responding on port ${port} — check \`docker logs ${RAG_CONTAINER}\``);
  }

  console.log('\n  Done! Open a new Claude Code session anywhere and try:');
  console.log('  “indexe docs/ dans une collection <project>-docs” or /rag status');
  console.log('  Remove everything with: npx claude-skills-kit setup-rag --remove\n');
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
    case 'setup-rag':
      cmdSetupRag();
      break;
    default:
      console.error(`\n  ${SYM.err} Unknown command: ${COMMAND}`);
      console.error('    Usage: npx claude-skills-kit <init|list|add|remove|update|setup-rag> [options]\n');
      process.exit(1);
  }
}

main();
