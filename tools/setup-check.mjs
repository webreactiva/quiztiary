// node tools/setup-check.mjs — the setup skill's apply script must round-trip the config: applying
// no answers rewrites quiztiary.config.mjs byte for byte. A new config option that apply.mjs does
// not know about would otherwise be silently dropped the first time a host runs setup.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const APPLY = process.argv[2] ?? '.claude/skills/quiztiary-setup/scripts/apply.mjs';
const before = readFileSync('quiztiary.config.mjs', 'utf8');
try {
  execFileSync('node', [APPLY, '{}'], { stdio: 'pipe' });
  const after = readFileSync('quiztiary.config.mjs', 'utf8');
  if (after !== before) {
    const lost = before.split('\n').filter((l) => !after.includes(l));
    console.error(`apply.mjs does not round-trip quiztiary.config.mjs; lines it drops or changes:\n${lost.join('\n')}`);
    process.exitCode = 1;
  } else console.log('ok: setup apply round-trips the config');
} finally {
  writeFileSync('quiztiary.config.mjs', before);
}
