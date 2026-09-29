// Writes data/pipeline/STATUS.md: queue totals per category and status.
import { writeFileSync } from 'node:fs';
import { loadQueue, publishedHotels } from './lib.mjs';
import { CATEGORIES } from './categories.mjs';
const q = Object.values(loadQueue());
const pub = publishedHotels();
const S = ['new', 'verified', 'weak', 'rejected', 'duplicate', 'published'];
const rows = Object.keys(CATEGORIES).map(cat => {
  const inCat = q.filter(c => (c.category ?? c.categories[0]) === cat);
  return `| ${cat} | ${S.map(s => inCat.filter(c => c.status === s).length).join(' | ')} |`;
});
writeFileSync('data/pipeline/STATUS.md', [
  '# Hotel pipeline status', '', `Updated ${new Date().toISOString()}. Published hotels on site: ${pub.length}.`, '',
  `| Category | ${S.join(' | ')} |`, `|---|${S.map(() => '---').join('|')}|`, ...rows, '',
].join('\n'));
console.log('status written');
