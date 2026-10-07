import type { APIRoute } from 'astro';
import { isAdmin } from '../../lib/auth.ts';
import { publicUrl } from '../../lib/public-url.ts';

// The panel's QR address. null → the panel uses its own origin.
export const GET: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) return new Response(null, { status: 401 });
  return Response.json({ url: await publicUrl() });
};
