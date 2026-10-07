// Boots the built server (dist/) on a free port with a throwaway database, no AI key and no
// release delay. Shared by smoke.mjs and ui.mjs.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const freePort = () =>
  new Promise((ok) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
  });

export async function startServer({ password = 'test-secret', env = {} } = {}) {
  const port = await freePort();
  const dir = mkdtempSync(join(tmpdir(), 'quiztiary-'));
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'dist/server/entry.mjs'], {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      PANEL_PASSWORD: password,
      DB_PATH: join(dir, 'test.db'),
      RELEASE_DELAY: '0',
      JEV_API_KEY: '',
      PUBLIC_URL: '',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (d) => (output += d));
  child.stderr.on('data', (d) => (output += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; ; i++) {
    try {
      await fetch(base);
      break;
    } catch {
      if (i > 100 || child.exitCode !== null) throw new Error(`server did not start:\n${output}`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return {
    base,
    db: join(dir, 'test.db'),
    password,
    output: () => output,
    stop: () => {
      child.kill();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
