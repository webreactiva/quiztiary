// Minimal headless Chrome driver over the DevTools protocol, with Node's built-in WebSocket.
// No Playwright, no Puppeteer: the agent needs to run pages, not a testing framework.
// ponytail: one tab, evaluate + screenshot only; reach for Playwright if tests need more.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { freePort } from './server.mjs';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
export const chromePath = () => CANDIDATES.find((p) => p && existsSync(p));

export async function launch({ width = 420, height = 900 } = {}) {
  const bin = chromePath();
  if (!bin) return null;
  const port = await freePort();
  const profile = mkdtempSync(join(tmpdir(), 'quiztiary-chrome-'));
  const chrome = spawn(bin, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ], { stdio: 'ignore' });

  let target;
  for (let i = 0; !target; i++) {
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    } catch {}
    if (!target) {
      if (i > 100) throw new Error('chrome did not start');
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, ko) => ((ws.onopen = ok), (ws.onerror = ko)));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, ko } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? ko(new Error(msg.error.message)) : ok(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      errors.push(`${msg.params.entry.text} ${msg.params.entry.url ?? ''}`.trim()); // failed requests, CSP, …
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  };
  const send = (method, params = {}) =>
    new Promise((ok, ko) => {
      pending.set(++id, { ok, ko });
      ws.send(JSON.stringify({ id, method, params }));
    });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');

  const page = {
    errors,
    /** Runs `fn` (a function or its source) in the page and returns its JSON result. */
    async eval(fn, ...args) {
      const src = `(${fn})(...${JSON.stringify(args)})`;
      const r = await send('Runtime.evaluate', { expression: src, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async goto(url) {
      await send('Page.navigate', { url });
      await page.waitFor(() => document.readyState === 'complete');
    },
    /** Polls `fn` in the page until it returns something truthy. */
    async waitFor(fn, { timeout = 5000, label = String(fn) } = {}, ...args) {
      const end = Date.now() + timeout;
      for (;;) {
        const v = await page.eval(fn, ...args).catch(() => null);
        if (v) return v;
        if (Date.now() > end) throw new Error(`timed out waiting for: ${label}`);
        await new Promise((r) => setTimeout(r, 100));
      }
    },
    async shot(file) {
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      writeFileSync(file, Buffer.from(data, 'base64'));
    },
    close() {
      ws.close();
      chrome.kill();
      setTimeout(() => rmSync(profile, { recursive: true, force: true }), 300);
    },
  };
  return page;
}
