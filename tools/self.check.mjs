// node tools/self.check.mjs — the tools check themselves. A checker that never fails is worse than
// none: it says "ok" while things break. Each checker must reject a known-bad fixture.
// When a tool gets a new rule, add the fixture that proves the rule here.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  const good = { hint: 'Asks why something works', crownY: 0, palette: { k: '#000000' }, shiny: { k: '#ffffff' }, text: {}, rows: Array(16).fill(row) };
  const theme = (badges) => `export default { name: 'T', badges: ${JSON.stringify(badges)} };`;
  const cases = {
    'good.mjs': [theme({ a: good, b: good }), 0],
    'narrow.mjs': [theme({ a: good, b: { ...good, rows: [...good.rows.slice(1), '.'.repeat(15)] } }), 1],
    'colour.mjs': [theme({ a: good, b: { ...good, rows: [...good.rows.slice(1), 'z'.repeat(16)] } }), 1],
    'hint.mjs': [theme({ a: good, b: { ...good, hint: '' } }), 1],
    'alone.mjs': [theme({ a: good }), 1],
  };
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
  checks += 4;

  console.log(`ok: ${checks} self-checks`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
