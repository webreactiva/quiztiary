// node .claude/skills/quiztiary-setup/scripts/apply.mjs '<answers json>'
// Validates the host's answers and writes quiztiary.config.mjs (always the full file, with its
// comments) plus the secrets in .env (merging, never dropping other lines).
// Every field is optional: missing ones keep the current config value.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const answers = JSON.parse(process.argv[2] ?? '{}');
const current = (await import(pathToFileURL(resolve('quiztiary.config.mjs')))).default;
const ac = answers.colors ?? {};
const colors = { ...current.colors, ...ac, light: { ...current.colors.light, ...ac.light }, dark: { ...current.colors.dark, ...ac.dark } };
const filter = { prompt: null, threshold: null, ...current.filter, ...answers.filter };
const c = { ...current, ...answers, colors, filter };
delete c.env;

const errors = [];
const need = (ok, msg) => ok || errors.push(msg);
need(typeof c.name === 'string' && c.name.trim(), 'name must not be empty');
need(/^[a-z0-9][a-z0-9-]*$/.test(c.slug), `slug "${c.slug}" must be lowercase letters, digits or dashes`);
need(existsSync(`src/i18n/${c.locale}.json`), `locale "${c.locale}" needs src/i18n/${c.locale}.json`);
need(existsSync(`src/lib/judges/${c.ai}.ts`), `ai "${c.ai}" needs src/lib/judges/${c.ai}.ts`);
need(existsSync(`src/badges/themes/${c.badges}.mjs`), `badges "${c.badges}" needs src/badges/themes/${c.badges}.mjs`);
need(Array.isArray(c.releaseDelay) && c.releaseDelay.length === 2 && c.releaseDelay[0] >= 0 && c.releaseDelay[1] >= c.releaseDelay[0], 'releaseDelay must be [min, max] seconds');
// Public URL strategies are the keys of STRATEGIES in src/lib/public-url.ts; read them from there
// so a strategy a host adds is accepted here too.
const strategies = [...readFileSync('src/lib/public-url.ts', 'utf8').matchAll(/^ {2}(\w+): async/gm)].map((m) => m[1]);
need(strategies.includes(c.publicUrl), `publicUrl must be one of ${strategies.join(', ')} (a fixed URL goes in env.PUBLIC_URL)`);
const HEX = /^#[0-9a-f]{6}$/i;
for (const k of ['accent', 'onAccent', 'gold', 'success']) need(HEX.test(c.colors[k]), `colors.${k} must be #rrggbb`);
for (const mode of ['light', 'dark']) {
  for (const k of ['bg', 'text', 'muted', 'card', 'cardText', 'line']) need(HEX.test(c.colors[mode][k]), `colors.${mode}.${k} must be #rrggbb`);
}
need(typeof c.audience === 'string' && c.audience.trim(), 'audience must not be empty');
need(c.filter.prompt === null || (typeof c.filter.prompt === 'string' && c.filter.prompt.trim()), 'filter.prompt must be null (judge default) or a non-empty English sentence');
need(c.filter.threshold === null || (typeof c.filter.threshold === 'number' && c.filter.threshold >= 0 && c.filter.threshold <= 1), 'filter.threshold must be null (judge default) or a number from 0 to 1');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

// WCAG asks 4.5:1 for normal text. Warn, the host decides.
const lum = (hex) =>
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const pairs = [
  ['button text (onAccent on accent)', c.colors.onAccent, c.colors.accent],
  ['card text (light)', c.colors.light.cardText, c.colors.light.card],
  ['card text (dark)', c.colors.dark.cardText, c.colors.dark.card],
  ['page text (light)', c.colors.light.text, c.colors.light.bg],
  ['page text (dark)', c.colors.dark.text, c.colors.dark.bg],
];
for (const [what, fg, bg] of pairs) {
  const r = ratio(fg, bg);
  if (r < 4.5) console.warn(`warn: ${what} ${fg} on ${bg} is ${r.toFixed(2)}:1, below 4.5:1`);
}

const pal = (p) => `{ ${['bg', 'text', 'muted', 'card', 'cardText', 'line'].map((k) => `${k}: ${q(p[k])}`).join(', ')} }`;
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
writeFileSync(
  'quiztiary.config.mjs',
  `// Everything a host can customize lives in this file. The quiztiary-setup skill writes it for you.
// Secrets never go here: the panel password and AI keys live in .env (see .env.example).
export default {
  // Shown in the page title and headings.
  name: ${q(c.name.trim())},
  // Prefix for the browser storage keys and the database file (<slug>.db). Lowercase, no spaces.
  slug: ${q(c.slug)},
  // Active language: a file in src/i18n/. Only one is active at a time.
  locale: ${q(c.locale)},
  // Who is asking. The AI judge reads it to understand the questions (in English).
  audience: ${q(c.audience.trim())},
  // How badges are rolled: a file in src/lib/judges/. 'random' needs no AI; 'jev' needs JEV_API_KEY; 'clef' needs CLOUDFLARE_API_TOKEN.
  ai: ${q(c.ai)},
  // What an AI judge rejects as not a question (spam, insults, greetings, gibberish…). Each judge
  // ships wording tuned to its model; override it here. \`prompt\`: in English, what to reject.
  // \`threshold\`: 0–1, reject above it (1 rejects nothing). null keeps the judge's default.
  filter: { prompt: ${c.filter.prompt === null ? 'null' : q(c.filter.prompt.trim())}, threshold: ${c.filter.threshold ?? 'null'} },
  // Badge theme: a file in src/badges/themes/.
  badges: ${q(c.badges)},
  // Seconds a question waits, at random within this range, before it reaches the panel.
  // It hides who wrote what from the timing. Raise it for very small groups.
  releaseDelay: [${c.releaseDelay[0]}, ${c.releaseDelay[1]}],
  // Where the panel QR points: 'cloudflare' reads the quick tunnel URL from cloudflared,
  // 'origin' uses the address the panel is opened from. PUBLIC_URL in .env always wins.
  publicUrl: ${q(c.publicUrl)},
  // Interface colours. Badges keep their own palettes. \`light\` and \`dark\` follow the visitor's
  // system setting; cards stay light in both, so \`cardText\` is usually the same dark ink.
  colors: {
    accent: ${q(c.colors.accent)}, // buttons, links, the favicon
    onAccent: ${q(c.colors.onAccent)}, // text on buttons
    gold: ${q(c.colors.gold)}, // shiny and legendary borders
    success: ${q(c.colors.success)}, // the "answered" tag
    light: ${pal(c.colors.light)},
    dark: ${pal(c.colors.dark)},
  },
};
`,
);

// .env: set the given keys, keep every other line as it was.
const env = answers.env ?? {};
if (Object.keys(env).length) {
  const lines = existsSync('.env') ? readFileSync('.env', 'utf8').split('\n') : readFileSync('.env.example', 'utf8').split('\n');
  for (const [k, v] of Object.entries(env)) {
    if (!/^[A-Z_]+$/.test(k) || /[\n\r]/.test(v)) {
      console.error(`refusing to write env ${k}`);
      process.exit(1);
    }
    const i = lines.findIndex((l) => l.replace(/^#\s*/, '').startsWith(`${k}=`));
    if (i >= 0) lines[i] = `${k}=${v}`;
    else lines.push(`${k}=${v}`);
  }
  writeFileSync('.env', lines.join('\n'));
}

console.log(`ok: ${c.name} · ${c.locale} · ${c.ai}${c.filter.prompt || c.filter.threshold !== null ? ' (custom filter)' : ''} · ${c.badges} · delay ${c.releaseDelay.join('-')}s · ${c.publicUrl}${Object.keys(env).length ? ` · .env: ${Object.keys(env).join(', ')}` : ''}`);
