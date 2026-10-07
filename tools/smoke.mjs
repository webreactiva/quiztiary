// node tools/smoke.mjs — boots the built server (dist/) against a throwaway database and walks the
// whole flow over HTTP: ask, get a badge, panel auth, panel list, mark answered, status, public URL.
// Runs with no AI key and no release delay, so it is fast and needs no network.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startServer } from './lib/server.mjs';

const config = (await import(pathToFileURL(resolve('quiztiary.config.mjs')))).default;
const theme = (await import(pathToFileURL(resolve(`src/badges/themes/${config.badges}.mjs`)))).default;

const server = await startServer({ password: 'smoke-secret' });
const base = server.base;
const admin = { 'x-panel-password': server.password, 'content-type': 'application/json' };
const json = { 'content-type': 'application/json' };
let current = 'boot';
const step = (name) => (current = name);

try {
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
  console.error(`smoke failed at "${current}": ${e.message}\n--- server output ---\n${server.output()}`);
  process.exitCode = 1;
} finally {
  server.stop();
}
