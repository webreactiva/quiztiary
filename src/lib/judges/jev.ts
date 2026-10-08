import type { Judge } from './index.ts';
import type { Filter } from './filter.ts';

// What Jev rejects by default, worded for Jev (a yes/no statement it scores 0–1). Hosts can
// override the prompt and the threshold with `filter` in quiztiary.config.mjs.
export const filter: Filter = {
  prompt:
    'The text contains insults or personal data about someone, is spam or gibberish, or is not a question, doubt or comment that a host could answer (for example a greeting, "ok" or only punctuation).',
  threshold: 0.8,
};

// Jev (https://typesafe.ai) answers typed questions about the text. Needs JEV_API_KEY in .env.
// Instructions go in English (Jev is more precise that way); the participant's text goes as is.
// Any model behind the same POST /v1/systemone API is this judge with another `env` (see clef.ts).
type Sdk = typeof import('@typesafe-ai/sdk');
type Env = { name: string; keyVar: string; apiKey?: string; model?: string; fetch?: typeof fetch };

export function systemOneJudge(env: () => Env): Judge {
  let client: InstanceType<Sdk['TypeSafeClient']> | null | undefined;
  let sdk: Sdk;
  let name = '';
  return async (text, { badges, audience, filter: rejectWhen = filter.prompt }) => {
    if (client === undefined) {
      sdk = await import('@typesafe-ai/sdk');
      const { apiKey, model, fetch, keyVar, ...e } = env();
      name = e.name;
      client = apiKey ? new sdk.TypeSafeClient({ apiKey, defaultModel: model, fetch, timeout: 10_000 }) : null;
      if (!client) console.warn(`ai is "${name.toLowerCase()}" but ${keyVar} is empty: badges are rolled by chance.`);
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
          unsafe: noul(rejectWhen),
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
      console.error(`${name} failed, rolling by chance:`, (e as Error).message);
      return null;
    }
  };
}

export const judge = systemOneJudge(() => ({ name: 'Jev', keyVar: 'JEV_API_KEY', apiKey: process.env.JEV_API_KEY }));
