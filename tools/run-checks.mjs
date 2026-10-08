// node tools/run-checks.mjs [dir] — runs every *.check.ts under src (or dir): small assert-based
// checks that live next to the logic they test. Stops at the first failure.
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'src';
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const checks = walk(dir).filter((f) => f.endsWith('.check.ts'));
for (const file of checks) {
  const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', file], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`${file} failed:\n${r.stdout}${r.stderr}`);
    process.exit(1);
  }
  console.log(`${file}: ${r.stdout.trim().split('\n').at(-1)}`);
}
console.log(`ok: ${checks.length} checks`);
