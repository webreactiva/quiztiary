import type { Judgement } from './judges/index.ts';

export type Rarity = 'common' | 'shiny' | 'legendary';
export type Accessory = 'crown' | 'bounce';
export type Prize = { badge: string; rarity: Rarity; accessories: Accessory[] };

// The judge tilts the scale, it never decides. The two knobs of chance:
const MIX = 0.4; // share of the weight that is uniform no matter what (1 = pure chance)
const T = 2; // flattens the judge's probabilities (0.9/0.1 → ~0.75/0.25)

// Each person asks only a few questions, so the roll is generous: variants come out often and
// badges you already own weigh less, so the collection moves fast.
const OWNED_WEIGHT = 0.25;

function weighted<K extends string>(weights: [K, number][], r: number): K {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  r *= total;
  for (const [k, w] of weights) if ((r -= w) <= 0) return k;
  return weights.at(-1)![0];
}

/** Prize policy: there is always a badge; the judge only raises odds. */
export function roll(j: Judgement | null, ids: string[], owned: string[] = [], rand = Math.random): Prize {
  const flat = ids.map((id) => [id, (j?.probs[id] ?? 1) ** (1 / T)] as [string, number]);
  const sum = flat.reduce((s, [, p]) => s + p, 0);
  const weights = flat.map(([id, p]) => {
    const w = MIX / ids.length + (1 - MIX) * (p / sum);
    return [id, owned.includes(id) ? w * OWNED_WEIGHT : w] as [string, number];
  });
  const badge = weighted(weights, rand());

  const depth = j?.depth ?? 0;
  const r = rand();
  const legendary = 0.15 + 0.15 * depth; // 15–30 %
  const shiny = 0.3 + 0.1 * depth; // 30–40 %
  const rarity: Rarity = r < legendary ? 'legendary' : r < legendary + shiny ? 'shiny' : 'common';

  const accessories: Accessory[] = [];
  if (rand() < 0.3 + 0.4 * (j?.everyone ?? 0)) accessories.push('crown'); // 30–70 %
  if (rand() < 0.3 + 0.4 * (j?.example ?? 0)) accessories.push('bounce'); // 30–70 %

  return { badge, rarity, accessories };
}
