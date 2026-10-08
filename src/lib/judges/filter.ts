// Which questions get rejected as "not a question" (spam, insults, greetings, gibberish…).
// The wording that works depends on the model, so each judge ships its own default; the host can
// override the prompt, the threshold or both in quiztiary.config.mjs (`filter`).
export type Filter = { prompt: string; threshold: number };
export type FilterOverride = { prompt?: string | null; threshold?: number | null } | null | undefined;

/** The filter in force: the host's override over the judge's default. null when the judge has none. */
export function resolveFilter(own: Filter | undefined, override: FilterOverride): Filter | null {
  if (!own) return null; // a judge that cannot read text (random) filters nothing
  return { prompt: override?.prompt || own.prompt, threshold: override?.threshold ?? own.threshold };
}

/** A question is rejected when the judge's `unsafe` score is above the threshold (1 rejects nothing). */
export const rejects = (unsafe: number, filter: Filter | null) => filter !== null && unsafe > filter.threshold;
