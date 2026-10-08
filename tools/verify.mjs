// npm run verify [step…] — the gate every commit has to pass.
// Steps: tools, badges, i18n, boundaries, setup, checks, types, build, smoke, ui. Runs them in order and stops at the
// first failure. A step whose target does not exist yet is skipped, so the gate works from the
// very first commit and grows with the project.
// Every run is appended to tools/.runs.jsonl: the loop reads it to spot slow or flaky steps.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';

const STEPS = [
  { name: 'tools', needs: 'tools/self.check.mjs', cmd: ['node', 'tools/self.check.mjs'] },
  { name: 'badges', needs: 'src/badges', cmd: ['node', 'tools/badges-check.mjs'] },
  { name: 'i18n', needs: 'src/i18n', cmd: ['node', 'tools/i18n-check.mjs'] },
  { name: 'boundaries', needs: 'src/badges/themes', cmd: ['node', 'tools/boundaries-check.mjs'] },
  { name: 'setup', needs: '.claude/skills/quiztiary-setup/scripts/apply.mjs', cmd: ['node', 'tools/setup-check.mjs'] },
  { name: 'checks', needs: 'src', cmd: ['node', 'tools/run-checks.mjs'] },
  // astro sync writes .astro/types.d.ts (git-ignored), which tsconfig needs on a fresh clone.
  { name: 'types', needs: 'src', cmd: ['sh', '-c', 'npx astro sync >/dev/null && npx tsc --noEmit -p .'] },
  { name: 'build', needs: 'astro.config.mjs', cmd: ['npx', 'astro', 'build'] },
  { name: 'smoke', needs: 'src/pages/api/questions.ts', cmd: ['node', 'tools/smoke.mjs'] },
  { name: 'ui', needs: 'src/pages/api/questions.ts', cmd: ['node', 'tools/ui.mjs'] },
];

const only = process.argv.slice(2);
const unknown = only.filter((n) => !STEPS.some((s) => s.name === n));
if (unknown.length) {
  console.error(`Unknown step: ${unknown.join(', ')}. Steps: ${STEPS.map((s) => s.name).join(', ')}`);
  process.exit(2);
}

const lastLine = (s) => s.trim().split('\n').at(-1) ?? '';
const log = (entry) => {
  try {
    appendFileSync('tools/.runs.jsonl', JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
  } catch {}
};

for (const step of STEPS) {
  if (only.length && !only.includes(step.name)) continue;
  if (!existsSync(step.needs)) {
    console.log(`- ${step.name}: skipped (no ${step.needs})`);
    continue;
  }
  const start = Date.now();
  const r = spawnSync(step.cmd[0], step.cmd.slice(1), { encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
  const ms = Date.now() - start;
  const ok = r.status === 0;
  log({ step: step.name, ok, ms });
  if (ok) {
    console.log(`✓ ${step.name} (${ms} ms) ${lastLine(r.stdout)}`);
    continue;
  }
  console.log(`✗ ${step.name} (${ms} ms)\n${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? r.error.message : ''}`);
  process.exit(1);
}
console.log('verify: ok');
