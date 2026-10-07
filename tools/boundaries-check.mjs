// node tools/boundaries-check.mjs [srcDir] — the seams that make Quiztiary swappable stay seams:
// no code outside src/badges/themes names a badge id, and no code outside src/lib/judges imports
// an AI SDK. Either one would make a theme or a judge impossible to swap without editing code.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const src = process.argv[2] ?? 'src';
const themesDir = join(src, 'badges/themes');
const judgesDir = join(src, 'lib/judges');
const AI_SDKS = /from\s+['"](@typesafe-ai\/|openai|@anthropic-ai\/|@ai-sdk\/|ai['"]|@google\/genai|@google\/generative-ai|ollama|@mistralai\/|cohere-ai)/;

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const ids = new Set();
for (const f of readdirSync(themesDir).filter((f) => f.endsWith('.mjs'))) {
  const theme = (await import(pathToFileURL(resolve(themesDir, f)))).default;
  for (const id of Object.keys(theme.badges)) ids.add(id);
}

const errors = [];
for (const file of walk(src).filter((f) => /\.(astro|ts|mjs|js)$/.test(f))) {
  const code = readFileSync(file, 'utf8');
  if (!file.startsWith(themesDir)) {
    for (const [, id] of code.matchAll(/['"`]([a-z][a-z0-9-]*)['"`]/g)) if (ids.has(id)) errors.push(`${relative('.', file)} names badge "${id}": read it from the theme instead`);
  }
  if (!file.startsWith(judgesDir) && AI_SDKS.test(code)) errors.push(`${relative('.', file)} imports an AI SDK: only judges in ${judgesDir} may`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`ok: ${ids.size} badge ids stay in themes, AI SDKs stay in judges`);
