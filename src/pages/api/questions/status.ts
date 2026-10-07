import type { APIRoute } from 'astro';
import { answeredIds, currentVersion, waitForChange } from '../../../lib/db.ts';

// ?ids=1,2,3&since=N → { version, answered: [2] }: which of your questions are answered.
// With `since`, waits (up to 25 s) for a change before answering.
export const GET: APIRoute = async ({ url, request }) => {
  const ids = (url.searchParams.get('ids') ?? '')
    .split(',')
    .map(Number)
    .filter(Number.isInteger)
    .slice(0, 100);
  const since = url.searchParams.get('since');
  if (since !== null) await waitForChange(Number(since), 25_000, request.signal);
  return Response.json({ version: currentVersion(), answered: answeredIds(ids) });
};
