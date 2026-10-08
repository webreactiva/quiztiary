import config from '../../../quiztiary.config.mjs';
import { BADGES } from '../../badges/index.ts';
import { rejects, resolveFilter, type Filter } from './filter.ts';

/**
 * What a judge says about a question. Every number is 0–1. It only tilts the roll: a badge
 * always comes out, whatever the judge says (src/lib/assign.ts).
 *  - probs: how well the question fits each badge's `hint`, by badge id (missing ids count as 1).
 *  - depth: how much thought went into it. Raises the odds of shiny and legendary.
 *  - everyone: many people would share the doubt. Raises the odds of the crown.
 *  - example: brings a concrete case. Raises the odds of the bounce.
 *  - unsafe: how well the text matches the filter prompt (`ctx.filter`, what to reject). Above the
 *    filter's threshold the question is rejected.
 * Return null when there is nothing to say (no key, an error): the roll is then pure chance.
 */
export type Judgement = { probs: Record<string, number>; depth: number; example: number; everyone: number; unsafe: number };
export type JudgeContext = { badges: Record<string, { hint: string }>; audience: string; filter?: string };
export type Judge = (text: string, ctx: JudgeContext) => Promise<Judgement | null>;

// Each file in this folder is a judge named after it; `ai` in quiztiary.config.mjs picks one.
// Adding an AI provider is adding one file that exports `judge`, and `filter` (its default prompt
// and threshold for rejecting non-questions) if it can read text. Only the chosen one is loaded.
type JudgeModule = { judge: Judge; filter?: Filter };
const judges = import.meta.glob<JudgeModule>(['./*.ts', '!./index.ts', '!./filter.ts', '!./*.check.ts']);
const load = judges[`./${config.ai}.ts`];
if (!load) throw new Error(`quiztiary.config.mjs: ai "${config.ai}" has no src/lib/judges/${config.ai}.ts`);

let ready: Promise<{ judge: Judge; filter: Filter | null }> | undefined;
const get = () => (ready ??= load().then((m) => ({ judge: m.judge, filter: resolveFilter(m.filter, config.filter) })));

/** The configured judge's verdict, with `rejected` resolved against the filter in force. */
export async function judge(text: string) {
  const { judge, filter } = await get();
  const j = await judge(text, { badges: BADGES, audience: config.audience, filter: filter?.prompt });
  return j && { ...j, rejected: rejects(j.unsafe, filter) };
}
