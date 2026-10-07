// node tools/i18n-check.mjs [i18nDir] [srcDir] — every locale has the same keys and placeholders,
// and every t('key') used in the code exists. Missing keys only show up at runtime otherwise.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [dir = 'src/i18n', src = 'src'] = process.argv.slice(2);
const errors = [];

const flat = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)]],
  );
const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

const locales = Object.fromEntries(
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return [f.slice(0, -5), Object.fromEntries(flat(JSON.parse(readFileSync(join(dir, f), 'utf8'))))];
      } catch (e) {
        errors.push(`${f}: invalid JSON (${e.message})`);
        return [f.slice(0, -5), {}];
      }
    }),
);
const names = Object.keys(locales);
if (!names.length) errors.push(`${dir}: no locale files`);

const all = new Set(names.flatMap((n) => Object.keys(locales[n])));
for (const key of all) {
  const missing = names.filter((n) => !(key in locales[n]));
  if (missing.length) errors.push(`"${key}" missing in ${missing.join(', ')}`);
  const shapes = new Set(names.filter((n) => key in locales[n]).map((n) => vars(locales[n][key])));
  if (shapes.size > 1) errors.push(`"${key}" has different {placeholders} across locales`);
}

const walk = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(astro|ts|mjs|js)$/.test(f) ? [p] : [];
  });
let used = 0;
for (const file of walk(src)) {
  for (const [, key] of readFileSync(file, 'utf8').matchAll(/\bt\(\s*['"`]([\w.]+)['"`]/g)) {
    used++;
    if (!all.has(key)) errors.push(`${file}: t('${key}') is not in any locale`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`ok: ${names.join(', ')} · ${all.size} keys · ${used} uses`);
