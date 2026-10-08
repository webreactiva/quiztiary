import type { APIRoute } from 'astro';
import { addQuestion, currentVersion, releasedQuestions, waitForChange } from '../../lib/db.ts';
import { roll } from '../../lib/assign.ts';
import { judge } from '../../lib/judges/index.ts';
import { isAdmin } from '../../lib/auth.ts';
import { BADGES } from '../../badges/index.ts';
import { MAX_LENGTH } from '../../lib/limits.ts';
import { t } from '../../i18n/index.ts';

// ?since=N waits (up to 25 s) for something new compared to version N.
export const GET: APIRoute = async ({ request, url }) => {
  if (!isAdmin(request)) return new Response(null, { status: 401 });
  const since = url.searchParams.get('since');
  if (since !== null) await waitForChange(Number(since), 25_000, request.signal);
  return Response.json({ version: currentVersion(), questions: releasedQuestions() });
};

export const POST: APIRoute = async ({ request }) => {
  // Read the body as text first so an oversized one is refused before parsing.
  const raw = await request.text().catch(() => '');
  if (raw.length > MAX_LENGTH * 8) return Response.json({ error: t('api.length', { max: MAX_LENGTH }) }, { status: 413 });
  const { text, owned } = (() => {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  })();
  const clean = typeof text === 'string' ? text.trim() : '';
  // No minimum length: an AI judge rejects gibberish and non-questions through `unsafe`.
  if (!clean || clean.length > MAX_LENGTH) {
    return Response.json({ error: t('api.length', { max: MAX_LENGTH }) }, { status: 400 });
  }

  const j = await judge(clean);
  if (j?.rejected) return Response.json({ error: t('api.rejected') }, { status: 422 });

  // `owned` is only used for this roll: it is never stored.
  const ids = Object.keys(BADGES);
  const prize = roll(j, ids, Array.isArray(owned) ? owned.slice(0, ids.length).filter((o) => ids.includes(o)) : []);
  const id = addQuestion(clean, prize);
  return Response.json({ id, ...prize });
};
