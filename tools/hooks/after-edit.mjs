// Claude Code PostToolUse hook (Edit|Write): runs the fast checker for the file just touched,
// so a broken sprite or a missing translation shows up at once, not at the next verify.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const file = relative(process.cwd(), input.tool_input?.file_path ?? '');
const check = file.startsWith('src/badges/themes/')
  ? ['tools/badges-check.mjs', file]
  : file.startsWith('src/i18n/') || /\.(astro|ts|mjs)$/.test(file) && file.startsWith('src/')
    ? ['tools/i18n-check.mjs']
    : file.startsWith('tools/')
      ? ['tools/self.check.mjs']
      : null;
if (!check) process.exit(0);

const r = spawnSync('node', check, { encoding: 'utf8' });
if (r.status === 0) process.exit(0);
process.stderr.write(`${check[0]} failed after editing ${file}:\n${r.stdout}${r.stderr}`);
process.exit(2);
