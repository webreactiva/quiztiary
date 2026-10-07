// node tools/smoke.mjs — boots the built server (dist/) against a throwaway database and walks the
// whole flow over HTTP: ask, get a badge, panel auth, panel list, mark answered, status, public URL.
// Runs with no AI key and no release delay, so it is fast and needs no network.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { startServer } from './lib/server.mjs';
import { MAX_LENGTH } from '../src/lib/limits.ts';

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

  step('POST too long');
  res = await fetch(`${base}/api/questions`, { method: 'POST', headers: json, body: JSON.stringify({ text: 'x'.repeat(MAX_LENGTH + 1) }) });
  assert.equal(res.status, 400, `a ${MAX_LENGTH + 1}-character question is refused`);
  res = await fetch(`${base}/api/questions`, { method: 'POST', headers: json, body: 'x'.repeat(MAX_LENGTH * 10) });
  assert.equal(res.status, 413, 'an oversized body is refused before parsing');

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

  step('ids do not reveal order');
  const ids = [prize.id];
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`${base}/api/questions`, { method: 'POST', headers: json, body: JSON.stringify({ text: `Question number ${i}?` }) });
    ids.push((await r.json()).id);
  }
  assert.ok(ids.slice(1).some((id, i) => id !== ids[i] + 1), `ids are sequential: ${ids}`);

  step('nothing identifying is stored');
  const columns = new DatabaseSync(server.db, { readOnly: true }).prepare('PRAGMA table_info(questions)').all().map((c) => c.name);
  assert.deepEqual(columns.sort(), ['accessories', 'answered_at', 'badge', 'id', 'rarity', 'release_at', 'text'], 'questions table columns');

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

  step('release delay holds questions back');
  const slow = await startServer({ env: { RELEASE_DELAY: '60' } });
  try {
    await fetch(`${slow.base}/api/questions`, { method: 'POST', headers: json, body: JSON.stringify({ text: 'Held back?' }) });
    const held = await (await fetch(`${slow.base}/api/questions`, { headers: { 'x-panel-password': slow.password } })).json();
    assert.equal(held.questions.length, 0, 'a question with a 60 s delay is already in the panel');
  } finally {
    slow.stop();
  }

  step('no secrets in the client bundle');
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  for (const f of walk('dist/client').filter((f) => /\.(js|css|html)$/.test(f))) {
    assert.ok(!/PANEL_PASSWORD|JEV_API_KEY|process\.env/.test(readFileSync(f, 'utf8')), `${f} mentions a server secret`);
  }

  console.log(`ok: ${config.locale} · ${config.ai} · ${config.badges} · got ${prize.rarity} ${prize.badge}`);
} catch (e) {
  console.error(`smoke failed at "${current}": ${e.message}\n--- server output ---\n${server.output()}`);
  process.exitCode = 1;
} finally {
  server.stop();
}
