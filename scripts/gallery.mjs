// npm run gallery [-- theme] — every badge of a theme in every rarity and accessory, as a static
// page (designs/<theme>.html) and loose SVGs (designs/<theme>/), to review a theme by eye.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import config from '../quiztiary.config.mjs';
import { RARITIES, svg } from '../src/badges/render.mjs';

const name = process.argv[2] ?? config.badges;
const theme = (await import(pathToFileURL(resolve(`src/badges/themes/${name}.mjs`)))).default;
const m = JSON.parse(readFileSync(`src/i18n/${config.locale}.json`, 'utf8'));
const label = (rarity, acc) => [m.rarities[rarity], ...acc.map((a) => m.accessories[a].name)].join(' + ');
const VARIANTS = [
  ['common', []],
  ['shiny', []],
  ['legendary', []],
  ['common', ['crown']],
  ['common', ['bounce']],
  ['legendary', ['crown', 'bounce']],
];

mkdirSync(`designs/${name}`, { recursive: true });
const sections = Object.entries(theme.badges).map(([id, b]) => {
  for (const r of RARITIES) writeFileSync(`designs/${name}/${id}-${r}.svg`, svg(b, { rarity: r, size: 256 }));
  const text = b.text[config.locale] ?? { name: id, kind: '' };
  const figures = VARIANTS.map(
    ([r, acc]) => `<figure class="${r}">${svg(b, { rarity: r, accessories: acc, size: 128 })}<figcaption>${label(r, acc)}</figcaption></figure>`,
  ).join('');
  return `<section><h2>${text.name} <small>${text.kind}</small></h2><p class="hint">${b.hint}</p><div class="row">${figures}</div></section>`;
});

const file = `designs/${name}.html`;
writeFileSync(
  file,
  `<!doctype html>
<html lang="${config.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${theme.name} · ${m.gallery.title}</title>
<style>
  :root { --bg: #f4efe6; --fg: #2b2118; --card: #fffaf2; --line: #e2d6c3; --gold: ${config.colors.gold}; }
  @media (prefers-color-scheme: dark) { :root { --bg: #17140f; --fg: #efe6d8; --line: #3a3127; } }
  body { margin: 0; padding: 24px 16px; background: var(--bg); color: var(--fg); font: 15px/1.4 ui-monospace, Menlo, monospace; }
  h1 { margin: 0 0 4px; } body > p { margin: 0 0 24px; opacity: .7; }
  h2 { font-size: 16px; margin: 24px 0 4px; } h2 small { font-weight: normal; opacity: .6; margin-left: 8px; }
  .hint { margin: 0 0 8px; font-size: 13px; opacity: .6; }
  .row { display: flex; flex-wrap: wrap; gap: 12px; }
  figure { margin: 0; padding: 10px; background: var(--card); border: 2px solid var(--line); border-radius: 6px; text-align: center; }
  figure.shiny { border-color: var(--gold); }
  figure.legendary { border-color: var(--gold); box-shadow: 0 0 0 2px var(--gold), 0 0 18px #ffd54a88; }
  figcaption { color: #2b2118; font-size: 12px; opacity: .7; margin-top: 4px; }
  svg { display: block; image-rendering: pixelated; }
</style></head><body>
<h1>${theme.name}</h1>
<p>${m.gallery.summary.replace('{badges}', Object.keys(theme.badges).length)}</p>
${sections.join('\n')}
</body></html>
`,
);
console.log(`ok: ${resolve(file)}`);
