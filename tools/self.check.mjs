// node tools/self.check.mjs — the tools check themselves. A checker that never fails is worse than
// none: it says "ok" while things break. Each checker must reject a known-bad fixture.
// When a tool gets a new rule, add the fixture that proves the rule here.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const run = (...args) => spawnSync('node', args, { encoding: 'utf8' });
const tmp = mkdtempSync(join(tmpdir(), 'quiztiary-self-'));
let checks = 0;

try {
  // Every step in verify points to a script that exists.
  const verify = readFileSync('tools/verify.mjs', 'utf8');
  for (const [, script] of verify.matchAll(/'node', '(tools\/[\w.-]+)'/g)) {
    assert.ok(existsSync(script), `verify runs ${script}, which does not exist`);
    checks++;
  }

  // badges-check rejects a wrong row width, an unknown colour key and a missing hint.
  const row = '.'.repeat(16);
  // The good fixture names itself in the active locale, so it stays valid whatever the host picks.
  const locale = existsSync('quiztiary.config.mjs') ? (await import(pathToFileURL(resolve('quiztiary.config.mjs')))).default.locale : 'en';
  const text = { [locale]: { name: 'Owl', kind: 'Asks why' } };
  const good = { hint: 'Asks why something works', crownY: 0, palette: { k: '#000000' }, shiny: { k: '#ffffff' }, text, rows: Array(16).fill(row) };
  const theme = (badges) => `export default { name: 'T', badges: ${JSON.stringify(badges)} };`;
  const cases = {
    'good.mjs': [theme({ a: good, b: good }), 0],
    'narrow.mjs': [theme({ a: good, b: { ...good, rows: [...good.rows.slice(1), '.'.repeat(15)] } }), 1],
    'colour.mjs': [theme({ a: good, b: { ...good, rows: [...good.rows.slice(1), 'z'.repeat(16)] } }), 1],
    'hint.mjs': [theme({ a: good, b: { ...good, hint: '' } }), 1],
    'alone.mjs': [theme({ a: good }), 1],
    'unnamed.mjs': [theme({ a: good, b: { ...good, text: {} } }), 1],
  };
  // An inactive theme without the active locale is valid (warning only) when checked with others.
  writeFileSync(join(tmp, 'other.mjs'), theme({ a: { ...good, text: {} }, b: { ...good, text: {} } }));
  writeFileSync(join(tmp, 'good2.mjs'), theme({ a: good, b: good }));
  const both = run('tools/badges-check.mjs', join(tmp, 'other.mjs'), join(tmp, 'good2.mjs'));
  assert.equal(both.status, 0, `badges-check should accept an unnamed inactive theme:\n${both.stdout}${both.stderr}`);
  checks++;

  for (const [name, [src, status]] of Object.entries(cases)) {
    writeFileSync(join(tmp, name), src);
    const r = run('tools/badges-check.mjs', join(tmp, name));
    assert.equal(r.status, status, `badges-check on ${name} should exit ${status}:\n${r.stdout}${r.stderr}`);
    checks++;
  }

  // i18n-check rejects a missing key, mismatched placeholders and an unknown t() key.
  const i18n = (locales, code) => {
    const d = mkdtempSync(join(tmp, 'i18n-'));
    mkdirSync(join(d, 'locales'));
    mkdirSync(join(d, 'src'));
    for (const [l, m] of Object.entries(locales)) writeFileSync(join(d, 'locales', `${l}.json`), JSON.stringify(m));
    writeFileSync(join(d, 'src', 'page.astro'), code);
    return run('tools/i18n-check.mjs', join(d, 'locales'), join(d, 'src')).status;
  };
  assert.equal(i18n({ en: { a: { b: 'Hi {n}' } }, es: { a: { b: 'Hola {n}' } } }, "t('a.b')"), 0, 'i18n-check accepts matching locales');
  assert.equal(i18n({ en: { a: 'x', b: 'y' }, es: { a: 'x' } }, ''), 1, 'i18n-check catches a missing key');
  assert.equal(i18n({ en: { a: 'Hi {n}' }, es: { a: 'Hola {m}' } }, ''), 1, 'i18n-check catches placeholder drift');
  assert.equal(i18n({ en: { a: 'x' }, es: { a: 'x' } }, "t('nope')"), 1, 'i18n-check catches an unknown key');
  const locales2 = { en: { a: 'x' }, es: { a: 'x' } };
  assert.equal(i18n(locales2, "---\nconst x = 1;\n---\n<h1>{t('a')}</h1><button title={t('a')}>🔄</button><style>p{color:red}</style>"), 0, 'i18n-check accepts translated markup and bare symbols');
  assert.equal(i18n(locales2, '<p>Hello there</p>'), 1, 'i18n-check misses literal text in markup');
  assert.equal(i18n(locales2, '<textarea placeholder="Write here"></textarea>'), 1, 'i18n-check misses a literal placeholder');
  assert.equal(i18n(locales2, '<script>el.innerHTML = `<span>Locked</span>`;</script>'), 1, 'i18n-check misses literal text built by a script');
  checks += 8;

  // boundaries-check rejects a badge id outside the themes and an AI SDK outside the judges.
  const boundaries = (file, code) => {
    const d = mkdtempSync(join(tmp, 'src-'));
    mkdirSync(join(d, 'badges/themes'), { recursive: true });
    mkdirSync(join(d, 'lib/judges'), { recursive: true });
    writeFileSync(join(d, 'badges/themes/t.mjs'), theme({ zebra: good, yak: good }));
    mkdirSync(join(d, file, '..'), { recursive: true });
    writeFileSync(join(d, file), code);
    return run('tools/boundaries-check.mjs', d).status;
  };
  assert.equal(boundaries('lib/judges/x.ts', "import OpenAI from 'openai';"), 0, 'an AI SDK inside judges is fine');
  assert.equal(boundaries('pages/x.astro', "const b = 'zebra';"), 1, 'boundaries-check misses a badge id in a page');
  assert.equal(boundaries('lib/x.ts', "import OpenAI from 'openai';"), 1, 'boundaries-check misses an AI SDK outside judges');
  checks += 3;

  // The types step regenerates Astro's ambient types first: a fresh clone has no .astro/.
  assert.match(verify, /astro sync[^']*tsc --noEmit/, 'types step must run astro sync before tsc');
  checks++;

  // The types step really fails on a type error (astro build alone does not check types).
  const ts = mkdtempSync(join(tmp, 'ts-'));
  writeFileSync(join(ts, 'bad.ts'), "export const x: number = 'a';\n");
  writeFileSync(join(ts, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true }, files: ['bad.ts'] }));
  assert.notEqual(spawnSync('npx', ['tsc', '-p', ts]).status, 0, 'tsc accepts a type error');
  checks++;

  // The browser driver reports script errors and failed requests (when Chrome is available).
  const { launch } = await import('./lib/browser.mjs');
  const page = await launch();
  if (page) {
    try {
      await page.goto(`data:text/html,<img src="http://127.0.0.1:9/missing.png"><img src="http://example.invalid/x.png"><script>throw new Error('boom')</script>`);
      await page.waitFor(() => true);
      await new Promise((r) => setTimeout(r, 300));
      assert.ok(page.errors.some((e) => e.includes('boom')), 'browser misses a thrown error');
      assert.ok(page.errors.some((e) => e.includes('missing.png')), 'browser misses a failed request');
      assert.ok(page.errors.some((e) => e.startsWith('third-party request: http://example.invalid')), 'browser misses a third-party request');
      checks += 3;
    } finally {
      page.close();
    }
  }

  console.log(`ok: ${checks} self-checks`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
