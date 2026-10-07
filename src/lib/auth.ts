import { timingSafeEqual } from 'node:crypto';

/** Only whoever has PANEL_PASSWORD (from .env) can read and mark questions. */
export function isAdmin(request: Request) {
  const expected = Buffer.from(process.env.PANEL_PASSWORD ?? '');
  const given = Buffer.from(request.headers.get('x-panel-password') ?? '');
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
}
