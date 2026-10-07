import type { APIRoute } from 'astro';
import { setAnswered } from '../../../lib/db.ts';
import { isAdmin } from '../../../lib/auth.ts';

export const PATCH: APIRoute = async ({ params, request }) => {
  if (!isAdmin(request)) return new Response(null, { status: 401 });
  const { answered } = await request.json().catch(() => ({}));
  setAnswered(Number(params.id), Boolean(answered));
  return new Response(null, { status: 204 });
};
