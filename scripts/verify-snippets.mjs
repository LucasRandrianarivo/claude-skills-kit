#!/usr/bin/env node
// Verify every executable snippet shipped in the kit.
//
// The skills tell people to run this code, so it has to actually be valid.
// This walks skills/, templates/ and references/, extracts fenced code blocks
// that declare a language, and runs the real checker for that language.
//
//   node scripts/verify-snippets.mjs            # check everything available
//   node scripts/verify-snippets.mjs --list     # list blocks without checking
//
// Exit code is non-zero when a block fails, so it can gate CI.

import { readFileSync, writeFileSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DIRS = ['skills', 'templates', 'references'];
const LIST_ONLY = process.argv.includes('--list');

// ── Placeholders ──────────────────────────────────────────────────────────────
// Skills use <angle-bracket> placeholders for values the reader supplies. They
// are documentation, not defects — substitute something syntactically valid so
// the surrounding structure can still be checked.
const SUBSTITUTIONS = {
  nginx: [[/<[^>\s]+>/g, 'placeholder'], [/\bplaceholder:placeholder-slim\b/g, 'placeholder']],
  dockerfile: [[/<runtime>:<pinned-minor>-slim/g, 'node:22-slim'], [/<[^>\s]+>/g, 'placeholder']],
  bash: [[/<[^>\n]+>/g, 'PLACEHOLDER']],
  yaml: [[/<[^>\n]+>/g, 'placeholder']],
  json: [],
  js: [],
};

function substitute(lang, code) {
  return (SUBSTITUTIONS[lang] || []).reduce((acc, [re, to]) => acc.replace(re, to), code);
}

// ── Block extraction ──────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

function extract(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const blocks = [];
  let open = null;
  lines.forEach((line, i) => {
    const fence = line.match(/^```(\w+)?\s*$/);
    if (!fence) { if (open) open.code.push(line); return; }
    if (open) { blocks.push({ ...open, code: open.code.join('\n') }); open = null; return; }
    open = { file, line: i + 1, lang: (fence[1] || '').toLowerCase(), code: [] };
  });
  return blocks;
}

// ── Checkers ──────────────────────────────────────────────────────────────────
const TMP = mkdtempSync(join(tmpdir(), 'kit-verify-'));
const has = (bin) => { try { execSync(`command -v ${bin}`, { stdio: 'ignore' }); return true; } catch { return false; } };

/** nginx fragments are not whole configs — wrap them in the context they belong to. */
function wrapNginx(code, stubs = '') {
  // Decide the context from the snippet itself, then add any stubs at http level
  // so a `location` fragment still gets its enclosing `server` block.
  const topLevel = code.replace(/^\s*#.*$/gm, '');
  const hasHttpLevel = /^\s*(map|upstream|server)\s/m.test(topLevel);
  const inner = hasHttpLevel ? code : `server {\n listen 8080;\n${code}\n}`;
  const body = stubs ? `${stubs}\n${inner}` : inner;
  return `daemon off;\npid ${TMP}/nginx.pid;\nerror_log ${TMP}/error.log;\nevents { worker_connections 16; }\nhttp {\n access_log off;\n client_body_temp_path ${TMP}/cbt;\n proxy_temp_path ${TMP}/pt;\n fastcgi_temp_path ${TMP}/ft;\n uwsgi_temp_path ${TMP}/ut;\n scgi_temp_path ${TMP}/st;\n${body}\n}\n`;
}

const CHECKERS = {
  nginx: {
    available: () => has('nginx'),
    run(code) {
      // Snippets referencing an include we don't ship can't resolve it here.
      // A snippet may `include` a file the reader creates; substitute an
      // equivalent directive so the surrounding structure is still checked.
      let cleaned = code.replace(/^[ \t]*include\s+snippets\/[^;]+;.*$/gm, '  add_header X-Verify snippet always;');
      // Fragments reference upstreams defined in a neighbouring snippet: stub
      // any that this fragment does not define itself.
      const declared = new Set([...cleaned.matchAll(/^\s*upstream\s+(\S+)\s*\{/gm)].map((m) => m[1]));
      const referenced = new Set([...cleaned.matchAll(/proxy_pass\s+https?:\/\/([A-Za-z0-9_.-]+)/g)].map((m) => m[1]));
      const stubs = [...referenced].filter((u) => !declared.has(u) && !/\./.test(u))
        .map((u) => `upstream ${u} { server 127.0.0.1:3000; }`).join('\n');
      const path = join(TMP, 'nginx.conf');
      writeFileSync(path, wrapNginx(cleaned, stubs));
      execFileSync('nginx', ['-t', '-c', path], { stdio: 'pipe' });
    },
  },
  bash: {
    available: () => has('bash'),
    run(code) {
      const path = join(TMP, 'snippet.sh');
      writeFileSync(path, `#!/usr/bin/env bash\n${code}\n`);
      execFileSync('bash', ['-n', path], { stdio: 'pipe' });
      if (has('shellcheck')) {
        // Only real errors: these are illustrative commands, not scripts.
        execFileSync('shellcheck', ['-S', 'error', '-s', 'bash', path], { stdio: 'pipe' });
      }
    },
  },
  json: { available: () => true, run: (code) => { JSON.parse(code); } },
  yaml: {
    available: () => has('python3'),
    run(code) {
      const path = join(TMP, 'snippet.yaml');
      writeFileSync(path, code);
      execFileSync('python3', ['-c', `import yaml,sys; list(yaml.safe_load_all(open(sys.argv[1])))`, path], { stdio: 'pipe' });
    },
  },
  js: {
    available: () => true,
    run(code) {
      const path = join(TMP, 'snippet.js');
      writeFileSync(path, code);
      execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
    },
  },
  dockerfile: {
    // The registry is unreachable from this sandbox, so a real build is not
    // possible; this is a structural lint of the rules the skill itself states.
    available: () => true,
    run(code) {
      const lines = code.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
      const stages = new Map();
      const problems = [];
      let current = null;
      for (const line of lines) {
        const from = line.match(/^FROM\s+(\S+)(?:\s+AS\s+(\S+))?/i);
        if (from) {
          const base = from[1];
          current = (from[2] || '').toLowerCase();
          // `FROM deps AS prod-deps` builds on an earlier stage — not an image to pin.
          const isStageRef = stages.has(base.toLowerCase());
          if (current) stages.set(current, base);
          if (!isStageRef && (/:latest$/i.test(base) || !/[:@]/.test(base))) {
            problems.push(`unpinned base image: ${base}`);
          }
          continue;
        }
        const copyFrom = line.match(/^COPY\s+--from=(\S+)/i);
        if (copyFrom) {
          const src = copyFrom[1].toLowerCase();
          if (!stages.has(src) && !/^\d+$/.test(src)) problems.push(`COPY --from=${copyFrom[1]} references an undefined stage`);
          if (/node_modules/.test(line) && /^deps$/.test(src)) problems.push('runtime copies node_modules from the full-install stage (devDependencies)');
        }
        if (/^(CMD|ENTRYPOINT)\s/i.test(line) && !/\[/.test(line)) problems.push(`shell-form ${line.split(/\s/)[0]} does not forward SIGTERM`);
      }
      if (!/^USER\s/im.test(code)) problems.push('no USER directive: container runs as root');
      if (problems.length) throw new Error(problems.join('; '));
    },
  },
};

// ── Run ───────────────────────────────────────────────────────────────────────
const files = DIRS.flatMap((d) => walk(join(ROOT, d)));
const blocks = files.flatMap(extract).filter((b) => b.lang && CHECKERS[b.lang]);
const skippedLangs = new Set(files.flatMap(extract).filter((b) => b.lang && !CHECKERS[b.lang]).map((b) => b.lang));

if (LIST_ONLY) {
  for (const b of blocks) console.log(`${relative(ROOT, b.file)}:${b.line}  [${b.lang}]  ${b.code.split('\n')[0].slice(0, 60)}`);
  process.exit(0);
}

const results = { pass: 0, fail: 0, skip: 0 };
const failures = [];
const byLang = {};

for (const b of blocks) {
  const checker = CHECKERS[b.lang];
  byLang[b.lang] = byLang[b.lang] || { pass: 0, fail: 0, skip: 0 };
  if (!checker.available()) { results.skip++; byLang[b.lang].skip++; continue; }
  try {
    checker.run(substitute(b.lang, b.code));
    results.pass++; byLang[b.lang].pass++;
  } catch (err) {
    results.fail++; byLang[b.lang].fail++;
    const detail = (err.stderr?.toString() || err.message || '').trim().split('\n').slice(0, 4).join('\n      ');
    failures.push(`${relative(ROOT, b.file)}:${b.line}  [${b.lang}]\n      ${detail}`);
  }
}

console.log('\n  Snippet verification');
console.log('  ' + '─'.repeat(20));
for (const [lang, r] of Object.entries(byLang).sort()) {
  console.log(`  ${lang.padEnd(11)} ${String(r.pass).padStart(3)} pass  ${String(r.fail).padStart(2)} fail${r.skip ? `  ${r.skip} skipped (checker unavailable)` : ''}`);
}
if (skippedLangs.size) console.log(`  (not executable, not checked: ${[...skippedLangs].sort().join(', ')})`);

if (failures.length) {
  console.log('\n  Failures\n  ' + '─'.repeat(8));
  for (const f of failures) console.log(`  ${f}\n`);
}
console.log(`\n  ${results.fail === 0 ? '✓ all executable snippets valid' : `✗ ${results.fail} invalid snippet(s)`}  (${results.pass} passed, ${results.skip} skipped)\n`);
rmSync(TMP, { recursive: true, force: true });
process.exit(results.fail === 0 ? 0 : 1);
