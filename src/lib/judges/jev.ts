import type { Judge } from './index.ts';

// Jev (https://typesafe.ai) answers typed questions about the text. Needs JEV_API_KEY in .env.
// Instructions go in English (Jev is more precise that way); the participant's text goes as is.
type Sdk = typeof import('@typesafe-ai/sdk');
let client: InstanceType<Sdk['TypeSafeClient']> | null | undefined;
let sdk: Sdk;

export const judge: Judge = async (text, { badges, audience }) => {
  if (client === undefined) {
    sdk = await import('@typesafe-ai/sdk');
    const apiKey = process.env.JEV_API_KEY;
    client = apiKey ? new sdk.TypeSafeClient({ apiKey, timeout: 10_000 }) : null;
    if (!client) console.warn('ai is "jev" but JEV_API_KEY is empty: badges are rolled by chance.');
  }
  if (!client) return null;

  const { choice, score, noul } = sdk;
  const kinds = Object.fromEntries(Object.entries(badges).map(([id, b]) => [id, b.hint]));
  try {
    const { answers: a } = await client.systemOne({
      state: { question: text },
      questions: {
        kind: choice(`What kind of question did one of the ${audience} ask?`, kinds),
        depth: score('How much thought went into this question?', ['Quick and direct', 'Thoughtful', 'Opens a discussion for the whole group']),
        example: noul('The question includes a concrete example, scenario or personal case.'),
        everyone: noul(`Many of the ${audience} would likely have this same doubt.`),
        unsafe: noul(
          'The text contains insults or personal data about someone, is spam or gibberish, or is not a question, doubt or comment that a host could answer (for example a greeting, "ok" or only punctuation).',
        ),
      },
    });
    return {
      probs: a.kind.probabilities as Record<string, number>,
      depth: a.depth.score / 2,
      example: a.example.noul,
      everyone: a.everyone.noul,
      unsafe: a.unsafe.noul,
    };
  } catch (e) {
    console.error('Jev failed, rolling by chance:', (e as Error).message);
    return null;
  }
};
