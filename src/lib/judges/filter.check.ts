// node src/lib/judges/filter.check.ts — the host's filter overrides the judge's default, piece by piece.
import assert from 'node:assert/strict';
import { rejects, resolveFilter } from './filter.ts';

const own = { prompt: 'Reject spam.', threshold: 0.8 };
assert.equal(resolveFilter(undefined, { prompt: 'x', threshold: 0.1 }), null, 'a judge without a filter filters nothing');
assert.deepEqual(resolveFilter(own, undefined), own, 'no override keeps the default');
assert.deepEqual(resolveFilter(own, { prompt: null, threshold: null }), own, 'null keeps the default');
assert.deepEqual(resolveFilter(own, { prompt: '' }), own, 'an empty prompt keeps the default');
assert.deepEqual(resolveFilter(own, { prompt: 'Reject off-topic.' }), { prompt: 'Reject off-topic.', threshold: 0.8 });
assert.deepEqual(resolveFilter(own, { threshold: 0 }), { prompt: 'Reject spam.', threshold: 0 }, 'threshold 0 is a real value');

assert.equal(rejects(0.9, own), true);
assert.equal(rejects(0.8, own), false, 'at the threshold it passes');
assert.equal(rejects(1, { ...own, threshold: 1 }), false, 'threshold 1 rejects nothing');
assert.equal(rejects(1, null), false, 'no filter rejects nothing');
console.log('ok: filter overrides resolve and threshold applies');
