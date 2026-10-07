// Claude Code Stop hook: the agent cannot end a turn with uncommitted work and a red gate.
// Exit 2 sends the failure back to the agent, which keeps working. If the agent is already
// continuing because of this hook, let it stop: a human should look at a gate that stays red.
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
if (input.stop_hook_active) process.exit(0);
if (!execSync('git status --porcelain', { encoding: 'utf8' }).trim()) process.exit(0);

const r = spawnSync('npm', ['run', '--silent', 'verify'], { encoding: 'utf8' });
if (r.status === 0) process.exit(0);
process.stderr.write(`verify is red with uncommitted changes. Fix it before stopping (build-loop skill):\n${r.stdout}${r.stderr}`);
process.exit(2);
