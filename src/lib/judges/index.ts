import config from '../../../quiztiary.config.mjs';
import { BADGES } from '../../badges/index.ts';

/**
 * What a judge says about a question. Every number is 0–1. It only tilts the roll: a badge
 * always comes out, whatever the judge says (src/lib/assign.ts).
 *  - probs: how well the question fits each badge's `hint`, by badge id (missing ids count as 1).
 *  - depth: how much thought went into it. Raises the odds of shiny and legendary.
 *  - everyone: many people would share the doubt. Raises the odds of the crown.
 *  - example: brings a concrete case. Raises the odds of the bounce.
 *  - unsafe: insults, personal data, spam, or not a question at all. Above 0.8 it is rejected.
 * Return null when there is nothing to say (no key, an error): the roll is then pure chance.
 */
export type Judgement = { probs: Record<string, number>; depth: number; example: number; everyone: number; unsafe: number };
export type JudgeContext = { badges: Record<string, { hint: string }>; audience: string };
export type Judge = (text: string, ctx: JudgeContext) => Promise<Judgement | null>;

// Each file in this folder is a judge named after it; `ai` in quiztiary.config.mjs picks one.
// Adding an AI provider is adding one file that exports `judge`. Only the chosen one is loaded.
const judges = import.meta.glob<{ judge: Judge }>(['./*.ts', '!./index.ts']);
const load = judges[`./${config.ai}.ts`];
if (!load) throw new Error(`quiztiary.config.mjs: ai "${config.ai}" has no src/lib/judges/${config.ai}.ts`);

export async function judge(text: string) {
  const { judge } = await load();
  return judge(text, { badges: BADGES, audience: config.audience });
}
