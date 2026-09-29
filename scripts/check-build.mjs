// Post-build sanity checks: fail CI if revenue/SEO basics regress.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let failed = 0;
const fail = (m) => { console.error('✗ ' + m); failed++; };
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);

for (const f of ['sitemap.xml', 'rss.xml', 'robots.txt', 'llms.txt', 'llms-full.txt', 'og-default.png', 'search-index.json']) {
  if (!existsSync(join('dist', f))) fail(`missing dist/${f}`);
}
const pages = walk('dist').filter(f => f.endsWith('.html') && !f.includes('/admin/'));
for (const f of pages) {
  const h = readFileSync(f, 'utf8');
  if (!/<title>[^<]{10,}/.test(h)) fail(`${f}: title missing/short`);
  if (!/rel="canonical"/.test(h)) fail(`${f}: no canonical`);
  if (!/name="description"/.test(h)) fail(`${f}: no meta description`);
  if (/aggregateRating/.test(h)) fail(`${f}: aggregateRating is not allowed (no real guest reviews)`);
  // Untracked partner links earn nothing.
  const raw = h.match(/href="https:\/\/(?:www\.)?(?:expedia|klook|tiqets|kiwi|airalo|welcomepickups|kiwitaxi)\.[a-z]+[^"]*"/g);
  if (raw) fail(`${f}: untracked partner link ${raw[0]}`);
}
console.log(`${pages.length} pages checked`);
process.exit(failed ? 1 : 0);
