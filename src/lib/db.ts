import { DatabaseSync } from 'node:sqlite';
import { EventEmitter } from 'node:events';
import { randomInt } from 'node:crypto';
import config from '../../quiztiary.config.mjs';
import type { Prize } from './assign.ts';

// Stores the text and its badge. No IP, no browser, nothing that says who wrote it.
const db = new DatabaseSync(process.env.DB_PATH || `${config.slug}.db`);
db.exec(`CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  badge TEXT NOT NULL,
  rarity TEXT NOT NULL,
  accessories TEXT NOT NULL,
  release_at INTEGER NOT NULL,
  answered_at INTEGER
)`);

// Each question reaches the panel after a random delay, so nobody can tell who wrote it from
// the moment it shows up. RELEASE_DELAY in the environment ("0" or "20-90") overrides the config.
const [minS, maxS = minS]: number[] = process.env.RELEASE_DELAY?.split('-').map(Number) ?? config.releaseDelay;
if (!(minS >= 0 && maxS >= minS)) throw new Error(`release delay must be "min-max" seconds with 0 <= min <= max, got ${minS}-${maxS}`);
export const releaseDelay = [minS, maxS];
const MIN_DELAY = minS * 1000;
const MAX_DELAY = maxS * 1000;

// Long polling: each visible change (a question released, one marked) bumps `version` and wakes
// the browsers waiting. No SSE because Cloudflare quick tunnels do not support it. The version
// lives in memory; after a restart it goes back to 0 and clients, seeing a different version,
// simply reload.
const changes = new EventEmitter().setMaxListeners(0);
let version = 0;
const bump = () => {
  version++;
  changes.emit('change');
};
export const currentVersion = () => version;

/** Resolves as soon as something changed since `since`, or after `ms`. */
export function waitForChange(since: number, ms: number, signal?: AbortSignal) {
  if (since !== version) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      changes.off('change', done);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    changes.on('change', done);
    signal?.addEventListener('abort', done);
  });
}

const scheduleRelease = (releaseAt: number) => setTimeout(bump, Math.max(0, releaseAt - Date.now()));

// On startup, questions still waiting for their turn are scheduled again.
for (const { release_at } of db.prepare('SELECT release_at FROM questions WHERE release_at > ?').all(Date.now())) {
  scheduleRelease(release_at as number);
}

export function addQuestion(text: string, { badge, rarity, accessories }: Prize) {
  const releaseAt = Date.now() + MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
  // Random ids: sequential ones would reveal the real order of arrival and undo the delay.
  // ponytail: 2^48 space, a collision just fails that one insert.
  const id = randomInt(1, 2 ** 48);
  db.prepare('INSERT INTO questions (id, text, badge, rarity, accessories, release_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    text,
    badge,
    rarity,
    JSON.stringify(accessories),
    Math.round(releaseAt),
  );
  scheduleRelease(releaseAt);
  return id;
}

/** Answered ids among the ones asked for. Returns no text: it is served without a password. */
export function answeredIds(ids: number[]) {
  if (!ids.length) return [];
  const rows = db
    .prepare(`SELECT id FROM questions WHERE answered_at IS NOT NULL AND id IN (${ids.map(() => '?').join(',')})`)
    .all(...ids);
  return rows.map((r) => r.id as number);
}

export function releasedQuestions() {
  return db
    .prepare('SELECT id, text, badge, rarity, accessories, answered_at FROM questions WHERE release_at <= ? ORDER BY release_at')
    .all(Date.now())
    .map((q) => ({ ...q, accessories: JSON.parse(q.accessories as string) }));
}

export function setAnswered(id: number, answered: boolean) {
  db.prepare('UPDATE questions SET answered_at = ? WHERE id = ?').run(answered ? Date.now() : null, id);
  bump();
}
