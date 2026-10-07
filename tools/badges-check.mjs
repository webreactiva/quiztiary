// node tools/badges-check.mjs [theme.mjs…] — validates badge themes (all of src/badges/themes by default).
// A theme is pixel art as data: if it passes here, the engine can draw it, roll it and name it.
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = 'src/badges/themes';
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(DIR).filter((f) => f.endsWith('.mjs')).map((f) => `${DIR}/${f}`);

const config = existsSync('quiztiary.config.mjs') ? (await import(pathToFileURL(resolve('quiztiary.config.mjs')))).default : {};
const render = existsSync('src/badges/render.mjs') ? await import(pathToFileURL(resolve('src/badges/render.mjs'))) : null;
const locales = existsSync('src/i18n') ? readdirSync('src/i18n').filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : [];

const errors = [];
const warnings = [];
let total = 0;

for (const file of files) {
  const fail = (msg) => errors.push(`${file}: ${msg}`);
  let theme;
  try {
    theme = (await import(pathToFileURL(resolve(file)))).default;
  } catch (e) {
    fail(`does not load: ${e.message}`);
    continue;
  }
  if (!theme || typeof theme.badges !== 'object') {
    fail('needs `export default { name, badges: { … } }`');
    continue;
  }
  const entries = Object.entries(theme.badges);
  if (entries.length < 2) fail(`needs at least 2 badges, has ${entries.length}`);
  if (typeof theme.name !== 'string' || !theme.name) fail('needs a `name`');

  for (const [id, b] of entries) {
    total++;
    const bad = (msg) => fail(`${id}: ${msg}`);
    if (!/^[a-z][a-z0-9-]*$/.test(id)) bad('id must be lowercase letters, digits or dashes');
    if (typeof b.hint !== 'string' || b.hint.length < 10) bad('`hint` must describe (in English) which kind of question earns it');
    const palette = b.palette ?? {};
    for (const [k, v] of Object.entries(palette)) {
      if (k.length !== 1 || k === '.') bad(`palette key "${k}" must be a single character other than "."`);
      if (!/^#[0-9a-f]{6}$/i.test(v)) bad(`palette.${k} must be a #rrggbb colour, is ${v}`);
    }
    for (const k of Object.keys(b.shiny ?? {})) if (!(k in palette)) bad(`shiny.${k} is not in the palette`);
    if (!b.shiny || !Object.keys(b.shiny).length) bad('`shiny` must recolour at least one palette key');
    if (!Array.isArray(b.rows) || b.rows.length !== 16) bad(`rows must be 16 lines, has ${b.rows?.length}`);
    (b.rows ?? []).forEach((row, y) => {
      if (row.length !== 16) bad(`row ${y} must be 16 pixels, has ${row.length} ("${row}")`);
      for (const c of row) if (c !== '.' && !(c in palette)) bad(`row ${y} uses "${c}", which is not in the palette`);
    });
    if (!Number.isInteger(b.crownY) || b.crownY < 0 || b.crownY > 13) bad('`crownY` must be the first row of the head (0–13)');

    const text = b.text ?? {};
    // The active locale is required only in the active theme (or a theme checked on its own);
    // a new language should not force translating themes nobody uses.
    const active = files.length === 1 || file.endsWith(`/${config.badges}.mjs`);
    const want = config.locale && active ? [config.locale] : [];
    for (const l of want) if (!text[l]?.name || !text[l]?.kind) bad(`text.${l} needs { name, kind } (active locale)`);
    for (const l of new Set([...locales, config.locale].filter(Boolean))) if (!want.includes(l) && !text[l]) warnings.push(`${file}: ${id} has no text.${l}`);

    if (render && !errors.length) {
      for (const rarity of ['common', 'shiny', 'legendary']) {
        try {
          const out = render.svg(b, { rarity, accessories: ['crown', 'bounce'] });
          if (out.includes('undefined')) bad(`${rarity} svg contains "undefined"`);
        } catch (e) {
          bad(`${rarity} svg throws: ${e.message}`);
        }
      }
    }
  }
}

for (const w of warnings) console.warn(`warn: ${w}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`ok: ${files.length} theme(s), ${total} badges`);
