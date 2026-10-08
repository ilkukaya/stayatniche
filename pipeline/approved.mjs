/**
 * Lists approved candidates (ready for the writer) in cell priority order.
 * Usage: node pipeline/approved.mjs [max=20]
 */
import { loadQueue, packName } from './lib.mjs';
import { cellRanker, countryOf } from './priorities.mjs';

const q = loadQueue();
const rank = cellRanker(q);
const list = Object.values(q).filter(c => c.status === 'approved')
  .sort((a, b) => rank({ ...a, category: a.finalCategory }) - rank({ ...b, category: b.finalCategory }));
for (const c of list.slice(0, +(process.argv[2] ?? 20)))
  console.log([c.id, packName(c.id), c.finalCategory, countryOf(c), c.name].join('\t'));
console.log(`${list.length} approved in total`);
