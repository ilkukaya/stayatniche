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
  // Every tp.media link must carry the verified account marker + project (trs) and a campaign_id.
  for (const m of h.matchAll(/href="(https:\/\/tp\.media\/r\?[^"]*)"/g)) {
    const q = m[1].replace(/&amp;|&#x26;/g, '&');
    if (!/[?&]marker=688397(&|$)/.test(q) || !/[?&]trs=478307(&|$)/.test(q) || !/[?&]campaign_id=\d+/.test(q)) fail(`${f}: malformed Travelpayouts link ${q.slice(0, 90)}`);
  }
  // Expedia is a verified program: it must never appear as a plain link.
  const raw = h.match(/href="https:\/\/(?:www\.)?expedia\.com[^"]*"/g);
  if (raw) fail(`${f}: untracked Expedia link ${raw[0].slice(0, 90)}`);

  // Languages: <html lang> matches the URL prefix, and every hreflang target exists and links back.
  const rel = '/' + f.replace(/^dist\//, '').replace(/index\.html$/, '');
  const prefix = rel.match(/^\/(de|fr|es|it|nl)\//)?.[1] ?? 'en';
  const lang = h.match(/<html[^>]*\slang="([^"]+)"/)?.[1];
  if (!f.endsWith('404.html') && lang !== prefix) fail(`${f}: <html lang="${lang}"> but URL language is ${prefix}`);
  const alts = [...h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="https:\/\/stayatniche\.com([^"]*)"/g)].map(m => ({ hl: m[1], path: m[2] }));
  if (alts.length) {
    if (!alts.some(a => a.path === rel)) fail(`${f}: hreflang set does not include the page itself`);
    for (const a of alts) {
      const target = join('dist', a.path, 'index.html');
      if (!existsSync(target)) { fail(`${f}: hreflang ${a.hl} → ${a.path} does not exist`); continue; }
      if (a.hl !== 'x-default' && !readFileSync(target, 'utf8').includes(`href="https://stayatniche.com${rel}"`)) fail(`${f}: ${a.path} does not link back (hreflang)`);
    }
  }
}
console.log(`${pages.length} pages checked`);
process.exit(failed ? 1 : 0);
