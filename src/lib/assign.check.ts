// node src/lib/assign.check.ts — the judge tilts the roll but never decides it, and the roll is
// generous. Thresholds are relative to the number of badges, so it holds for any theme.
import assert from 'node:assert/strict';
import config from '../../quiztiary.config.mjs';
import { roll } from './assign.ts';

const { default: theme } = await import(`../badges/themes/${config.badges}.mjs`);
const ids = Object.keys(theme.badges);
const [fav, ...rest] = ids;
const n = ids.length;
const N = 20_000;

const sure = { probs: { [fav]: 0.97, ...Object.fromEntries(rest.map((id) => [id, 0.03 / rest.length])) }, depth: 1, example: 1, everyone: 0, unsafe: 0 };
const share = (f: (p: ReturnType<typeof roll>) => boolean, j: typeof sure | null = sure, owned: string[] = []) =>
  Array.from({ length: N }, () => roll(j, ids, owned)).filter(f).length / N;

const favShare = share((p) => p.badge === fav);
assert(favShare > 2 / n && favShare < 0.8, `a 97 % sure judge should favour ${fav} (> ${(2 / n).toFixed(2)}) without deciding (< 0.8), got ${favShare}`);
for (const id of ids) assert(share((p) => p.badge === id) > 0.3 / n, `${id} almost never comes out`);
const plainShare = share((p) => p.badge === fav, null);
assert(Math.abs(plainShare - 1 / n) < 0.02, `without a judge every badge is ~1/${n}, ${fav} got ${plainShare}`);

const owned = share((p) => p.badge === fav, sure, [fav]);
assert(owned < favShare / 2, `owning ${fav} should make it much rarer: ${owned} vs ${favShare}`);

const legendary = share((p) => p.rarity === 'legendary');
assert(legendary > 0.26 && legendary < 0.34, `legendary at max depth ~30 %, got ${legendary}`);
const common = share((p) => p.rarity === 'common', null);
assert(common > 0.5 && common < 0.6, `without a judge, common ~55 %, got ${common}`);

assert(share((p) => p.accessories.includes('bounce')) > 0.65, 'clear example → bounce ~70 %');
const crown = share((p) => p.accessories.includes('crown'));
assert(crown > 0.25 && crown < 0.35, `nobody shares the doubt → crown ~30 %, got ${crown}`);

console.log(`ok: ${config.badges} (${n}) · favoured ${(favShare * 100).toFixed(0)} % (${(owned * 100).toFixed(0)} % if owned) · legendary ${(legendary * 100).toFixed(0)} % · common without judge ${(common * 100).toFixed(0)} %`);
