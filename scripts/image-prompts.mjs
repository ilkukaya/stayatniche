// Writes docs/IMAGE-PROMPTS.md: a checklist of every image the site can use, with a
// ready-to-paste ChatGPT prompt and the exact filename. Run: node scripts/image-prompts.mjs
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const fm = (file) => {
  const t = readFileSync(file, 'utf8').split('---')[1] ?? '';
  const get = (k) => (t.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) ?? [])[1]?.replace(/^["']|["']$/g, '').trim();
  return { get, featured: /^featured:\s*true/m.test(t) };
};
const list = (d) => readdirSync(`src/content/${d}`).filter(f => f.endsWith('.md')).map(f => [f.replace(/\.md$/, ''), fm(`src/content/${d}/${f}`)]);
const have = (slug) => ['webp', 'jpg', 'jpeg', 'png', 'avif'].some(e => existsSync(join('public/images', `${slug}.${e}`)) || existsSync(join('public/images/hotels', `${slug}.${e}`)));
const STYLE = 'Photorealistic travel-magazine photograph, golden-hour light, wide 3:2 landscape composition, rich natural color, no text, no logos, no people\'s faces, no watermark.';

const out = ['# Image checklist & ChatGPT prompts', '',
  'Generate each image in ChatGPT (Images), save it as `raw-images/<slug>.png`, run `npm run optimize-images`, commit + push.',
  'Images already present are ticked. Do the sections in order: the top ones affect the most pages.', ''];
const row = (slug, prompt) => `- [${have(slug) ? 'x' : ' '}] \`${slug}\`: ${prompt} ${STYLE}`;

out.push('## 1. Categories (14): biggest impact', '');
for (const [slug, f] of list('categories')) out.push(row(slug, `${f.get('title')}: an iconic, atmospheric scene of a ${f.get('title').toLowerCase()} stay. ${f.get('tagline') ?? ''}`));
out.push('', '## 2. Featured hotels', '');
const hotels = list('hotels');
for (const [slug, f] of hotels.filter(([, f]) => f.featured)) out.push(row(slug, `${f.get('name')} in ${f.get('destination')}, ${f.get('country')}: an exterior/atmospheric view showing the unusual architecture and setting (${f.get('category')?.replace(/-/g, ' ')}). Illustrative, not an exact replica.`));
out.push('', '## 3. All other hotels', '');
for (const [slug, f] of hotels.filter(([, f]) => !f.featured)) out.push(row(slug, `${f.get('name')} in ${f.get('destination')}, ${f.get('country')} (${f.get('category')?.replace(/-/g, ' ')}).`));
out.push('', '## 4. Destinations', '');
for (const [slug, f] of list('destinations')) out.push(row(slug, `${f.get('name')}: signature landscape of the destination.`));
writeFileSync('docs/IMAGE-PROMPTS.md', out.join('\n') + '\n');
console.log('docs/IMAGE-PROMPTS.md written');
