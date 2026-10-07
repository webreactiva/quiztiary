// node tools/smoke.mjs — boots the built server (dist/) against a throwaway database and walks the
// whole flow over HTTP: ask, get a badge, panel auth, panel list, mark answered, status, public URL.
// Runs with no AI key and no release delay, so it is fast and needs no network.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const config = (await import(pathToFileURL(resolve('quiztiary.config.mjs')))).default;
const theme = (await import(pathToFileURL(resolve(`src/badges/themes/${config.badges}.mjs`)))).default;

const port = await new Promise((ok) => {
  const s = createServer().listen(0, '127.0.0.1', () => {
    const { port } = s.address();
    s.close(() => ok(port));
  });
});
const dir = mkdtempSync(join(tmpdir(), 'quiztiary-smoke-'));
const PASSWORD = 'smoke-secret';
const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'dist/server/entry.mjs'], {
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(port),
    PANEL_PASSWORD: PASSWORD,
    DB_PATH: join(dir, 'smoke.db'),
    RELEASE_DELAY: '0',
    JEV_API_KEY: '',
    PUBLIC_URL: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
server.stdout.on('data', (d) => (output += d));
server.stderr.on('data', (d) => (output += d));

const base = `http://127.0.0.1:${port}`;
const admin = { 'x-panel-password': PASSWORD, 'content-type': 'application/json' };
const json = { 'content-type': 'application/json' };
const step = (name) => (current = name);
let current = 'boot';

try {
  for (let i = 0; ; i++) {
    try {
      await fetch(base);
      break;
    } catch {
      if (i > 100 || server.exitCode !== null) throw new Error('server did not start');
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  step('GET /');
  let res = await fetch(base);
  assert.equal(res.status, 200);
  const home = await res.text();
  assert.match(home, new RegExp(`<html[^>]*lang="${config.locale}"`), 'html lang is the active locale');
  assert.ok(home.includes(config.name), 'home shows the configured name');

  step('GET /panel');
  assert.equal((await fetch(`${base}/panel`)).status, 200);

  step('POST empty question');
  res = await fetch(`${base}/api/questions`, { method: 'POST', headers: json, body: JSON.stringify({ text: '   ' }) });
  assert.equal(res.status, 400);
  assert.ok((await res.json()).error, 'empty question explains why');

  step('POST question');
  res = await fetch(`${base}/api/questions`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ text: 'Why does this work the way it does?', owned: [] }),
  });
  assert.equal(res.status, 200);
  const prize = await res.json();
  assert.ok(Number.isInteger(prize.id), 'question gets an id');
  assert.ok(prize.badge in theme.badges, `badge "${prize.badge}" belongs to theme "${config.badges}"`);
  assert.ok(['common', 'shiny', 'legendary'].includes(prize.rarity));
  assert.ok(Array.isArray(prize.accessories));

  step('GET /api/questions without password');
  assert.equal((await fetch(`${base}/api/questions`)).status, 401);

  step('GET /api/questions');
  await new Promise((r) => setTimeout(r, 50)); // release timer (delay 0)
  res = await fetch(`${base}/api/questions`, { headers: admin });
  assert.equal(res.status, 200);
  const { questions } = await res.json();
  assert.ok(questions.some((q) => q.id === prize.id), 'question reaches the panel');

  step('PATCH answered');
  res = await fetch(`${base}/api/questions/${prize.id}`, { method: 'PATCH', headers: admin, body: JSON.stringify({ answered: true }) });
  assert.equal(res.status, 204);

  step('GET status');
  res = await fetch(`${base}/api/questions/status?ids=${prize.id}`);
  assert.deepEqual((await res.json()).answered, [prize.id]);

  step('GET /api/public-url');
  assert.equal((await fetch(`${base}/api/public-url`)).status, 401);
  res = await fetch(`${base}/api/public-url`, { headers: admin });
  assert.equal(res.status, 200);
  assert.ok('url' in (await res.json()));

  console.log(`ok: ${config.locale} · ${config.ai} · ${config.badges} · got ${prize.rarity} ${prize.badge}`);
} catch (e) {
  console.error(`smoke failed at "${current}": ${e.message}\n--- server output ---\n${output}`);
  process.exitCode = 1;
} finally {
  server.kill();
  rmSync(dir, { recursive: true, force: true });
}
