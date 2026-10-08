import { systemOneJudge } from './jev.ts';

// Clef (Cloudflare, https://developers.cloudflare.com/workers-ai/models/clef/) follows Jev's System
// One API on Workers AI, so it is the Jev judge sending to /ai/run instead of /v1/systemone.
// Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI read) in .env;
// CLEF_MODEL=clef-flash trades precision for speed.
// ponytail: reuses Jev's filter wording; give Clef its own once it is measured to need one.
export { filter } from './jev.ts';

export const judge = systemOneJudge(() => {
  const model = process.env.CLEF_MODEL || 'clef';
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/cloudflare/${model}`;
  return {
    name: 'Clef',
    keyVar: 'CLOUDFLARE_API_TOKEN',
    apiKey: process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN,
    model,
    // Cloudflare's REST API wraps the System One body as { result, success, errors }.
    fetch: async (_, init) => {
      const r = await fetch(url, init);
      if (!r.ok) return r;
      const body = await r.json();
      return Response.json(body.result ?? body);
    },
  };
});
