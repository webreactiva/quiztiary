// node src/lib/judges/clef.check.ts — the Clef judge reaches Workers AI and reads its { result } wrapper.
import assert from 'node:assert/strict';

process.env.CLOUDFLARE_ACCOUNT_ID = 'acct';
process.env.CLOUDFLARE_API_TOKEN = 'tok';
process.env.CLEF_MODEL = 'clef-flash';
const sent: { url: string; auth: string; body: any }[] = [];
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), auth: new Headers(init?.headers).get('authorization')!, body: JSON.parse(String(init?.body)) });
  const answers = {
    kind: { choice: 'a', confidence: 0.7, probabilities: { a: 0.7, b: 0.3 } },
    depth: { score: 1, confidence: 0.5, probabilities: {} },
    example: { noul: 0.2 },
    everyone: { noul: 0.6 },
    unsafe: { noul: 0.1 },
  };
  return Response.json({ success: true, errors: [], result: { model: 'clef-flash', answers, usage: {} } });
};

const { judge } = await import('./clef.ts');
const j = await judge('Why?', { badges: { a: { hint: 'A' }, b: { hint: 'B' } }, audience: 'people', filter: 'Reject spam.' });
assert.equal(sent[0].url, 'https://api.cloudflare.com/client/v4/accounts/acct/ai/run/@cf/cloudflare/clef-flash');
assert.equal(sent[0].auth, 'Bearer tok');
assert.equal(sent[0].body.model, 'clef-flash');
assert.equal(sent[0].body.questions.unsafe.instructions, 'Reject spam.');
assert.deepEqual(j, { probs: { a: 0.7, b: 0.3 }, depth: 0.5, example: 0.2, everyone: 0.6, unsafe: 0.1 });
console.log('ok: clef judge calls Workers AI and unwraps result');
