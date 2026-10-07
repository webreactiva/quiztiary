// node tools/ui.mjs — drives the real pages in headless Chrome, the way a participant and a host
// would: ask, see the badge drop into the collection, log into the panel, mark it answered, and
// see "answered" come back to the participant. Fails on any page error. Screenshots land in
// tools/.shots/ for the agent to look at. Without Chrome it reports "skipped" and passes.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch } from './lib/browser.mjs';
import { startServer } from './lib/server.mjs';

const config = (await import(pathToFileURL(resolve('quiztiary.config.mjs')))).default;
const theme = (await import(pathToFileURL(resolve(`src/badges/themes/${config.badges}.mjs`)))).default;
const messages = (await import(pathToFileURL(resolve(`src/i18n/${config.locale}.json`)), { with: { type: 'json' } })).default;
const n = Object.keys(theme.badges).length;
const names = Object.values(theme.badges).map((b) => b.text[config.locale].name);

const page = await launch();
if (!page) {
  console.log('skipped: no Chrome found (set CHROME_PATH)');
  process.exit(0);
}
const server = await startServer();
// Markup in the question must come out as text, in the panel and in "your questions".
const QUESTION = 'Why <b>does</b> it <img src=x onerror="window.__xss=1"> make things up?';
let step = 'open home';
try {
  mkdirSync('tools/.shots', { recursive: true });
  await page.goto(server.base);
  await page.waitFor((n) => document.querySelectorAll('#grid .cell.locked').length === n, { label: `${n} locked cells` }, n);

  step = 'ask';
  await page.eval((q) => {
    document.querySelector('#text').value = q;
    document.querySelector('#ask').requestSubmit();
  }, QUESTION);
  const won = await page.waitFor(() => !document.querySelector('#reveal').hidden && document.querySelector('#reveal-name').textContent, { label: 'badge reveal' });
  assert.ok(names.includes(won), `revealed "${won}", not a badge name of the theme`);
  assert.equal(await page.eval(() => document.querySelector('#count').textContent), `1/${n}`);
  await page.shot('tools/.shots/home.png');

  step = 'panel login';
  await page.goto(`${server.base}/panel`);
  await page.eval((pw) => {
    document.querySelector('#password').value = pw;
    document.querySelector('#login').requestSubmit();
  }, server.password);
  await page.waitFor((q) => [...document.querySelectorAll('#pending li')].some((li) => li.textContent.includes(q)), { label: 'question in panel' }, QUESTION);
  await page.shot('tools/.shots/panel.png');

  assert.ok(await page.eval(() => !document.querySelector('#pending .text b, #pending .text img') && !window.__xss), 'question markup is rendered as text in the panel');

  step = 'mark answered';
  await page.eval(() => document.querySelector('#pending li button').click());
  await page.waitFor(() => document.querySelector('#done-count').textContent === '1', { label: 'answered count 1' });

  step = 'participant sees answered';
  await page.goto(server.base);
  await page.waitFor((label) => document.querySelector('#mine-list .badge.done')?.textContent === label, { label: 'answered badge' }, messages.home.answered);

  assert.ok(await page.eval((q) => [...document.querySelectorAll('#mine-list .q')].some((el) => el.textContent === q) && !window.__xss, QUESTION), 'question markup is rendered as text in "your questions"');
  const errors = page.errors.filter((e) => !/status of 401/.test(e)); // the panel probes with no password first
  assert.deepEqual(errors, [], 'page errors');
  console.log(`ok: asked, won ${won}, answered round trip · shots in tools/.shots/`);
} catch (e) {
  console.error(`ui failed at "${step}": ${e.message}\npage errors: ${page.errors.join(' | ')}\n--- server ---\n${server.output()}`);
  process.exitCode = 1;
} finally {
  page.close();
  server.stop();
}
