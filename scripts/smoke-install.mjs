#!/usr/bin/env node
// Install the kit into throwaway fixtures and assert what each stack should get.
//
//   node scripts/smoke-install.mjs
//
// Catches the class of bug that only appears at install time: a stack detected
// wrongly, a variant that stops resolving, a profile that installs the wrong
// set, or a CLAUDE.md pointing at skills the project doesn't have.

import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const INSTALLER = join(ROOT, 'bin', 'install.js');

const CASES = [
  {
    name: 'Next.js + Tailwind + Vitest, full profile',
    files: {
      'package.json': { name: 'shop', dependencies: { next: '15.0.0', react: '19.0.0', tailwindcss: '3.4.0' }, devDependencies: { vitest: '2.0.0' } },
      'tsconfig.json': {},
    },
    args: [],
    expect: {
      variants: { 'component.md': 'component/react.md', 'build.md': 'build/nextjs.md', 'test.md': 'test/vitest.md', 'design-review.md': 'design-review/tailwind.md', 'debug.md': 'debug/nextjs-app.md' },
      present: ['db.md', 'auth.md', 'proposal.md', 'jobs.md', 'k8s.md'],
      references: 11,
      routingHas: ['/db', '/proposal', '/jobs'],
    },
  },
  {
    name: 'SvelteKit web + Expo mobile in one repo',
    files: { 'package.json': { name: 'mono', dependencies: { '@sveltejs/kit': '2.0.0', vite: '5.0.0', expo: '52.0.0' } } },
    args: [],
    // The web framework must win the framework slot; Expo still gets its mobile skill.
    expect: { variants: { 'component.md': 'component/svelte.md', 'build.md': 'build/vite.md', 'mobile.md': 'mobile/expo.md' } },
  },
  {
    name: 'Pure Flutter project',
    files: { 'pubspec.yaml': null },
    args: [],
    expect: { variants: { 'mobile.md': 'mobile/flutter.md' }, absent: ['component.md'] },
  },
  {
    name: 'Fastify API, narrow profile (data,security)',
    files: { 'package.json': { name: 'api', dependencies: { fastify: '4.0.0' } } },
    args: ['--profile', 'data,security'],
    expect: {
      present: ['db.md', 'payments.md', 'auth.md', 'rgpd.md'],
      absent: ['proposal.md', 'jobs.md', 'k8s.md', 'a11y.md'],
      // A narrow profile must never advertise skills it did not install.
      routingLacks: ['/proposal', '/jobs', '/a11y', '/k8s'],
    },
  },
  {
    name: 'GitLab CI detected over GitHub Actions',
    files: { 'package.json': { name: 'x', dependencies: { express: '4.0.0' } }, '.gitlab-ci.yml': null },
    args: [],
    expect: { variants: { 'cicd.md': 'cicd/gitlab-ci.md' } },
  },
];

let failures = 0;
const fail = (name, msg) => { console.log(`  ✗ ${name}\n      ${msg}`); failures++; };

for (const testCase of CASES) {
  const dir = mkdtempSync(join(tmpdir(), 'kit-smoke-'));
  try {
    for (const [file, content] of Object.entries(testCase.files)) {
      mkdirSync(join(dir, file, '..'), { recursive: true });
      writeFileSync(join(dir, file), content === null ? 'name: fixture\n' : JSON.stringify(content));
    }
    const out = execFileSync(process.execPath, [INSTALLER, 'init', ...testCase.args], { cwd: dir, encoding: 'utf8' });
    const problems = [];
    const e = testCase.expect;

    for (const [file, variant] of Object.entries(e.variants || {})) {
      if (!out.includes(variant)) problems.push(`expected ${file} from ${variant}; installer said: ${out.split('\n').find((l) => l.includes(file)) || '(nothing)'}`);
    }
    for (const file of e.present || []) {
      if (!existsSync(join(dir, '.claude/commands', file))) problems.push(`missing .claude/commands/${file}`);
    }
    for (const file of e.absent || []) {
      if (existsSync(join(dir, '.claude/commands', file))) problems.push(`unexpected .claude/commands/${file}`);
    }
    if (e.references && existsSync(join(dir, '.claude/references'))) {
      const n = execFileSync('ls', [join(dir, '.claude/references')], { encoding: 'utf8' }).trim().split('\n').length;
      if (n !== e.references) problems.push(`expected ${e.references} field notes, found ${n}`);
    }
    const claudeMd = existsSync(join(dir, 'CLAUDE.md')) ? readFileSync(join(dir, 'CLAUDE.md'), 'utf8') : '';
    for (const token of e.routingHas || []) {
      if (!claudeMd.includes(token)) problems.push(`CLAUDE.md should mention ${token}`);
    }
    for (const token of e.routingLacks || []) {
      if (claudeMd.includes(`\`${token}\``)) problems.push(`CLAUDE.md advertises ${token}, which this profile does not install`);
    }

    if (problems.length) fail(testCase.name, problems.join('\n      '));
    else console.log(`  ✓ ${testCase.name}`);
  } catch (err) {
    fail(testCase.name, (err.stderr?.toString() || err.message).trim().split('\n').slice(0, 3).join('\n      '));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\n  ${failures === 0 ? `✓ ${CASES.length} install scenarios pass` : `✗ ${failures} scenario(s) failed`}\n`);
process.exit(failures === 0 ? 0 : 1);
