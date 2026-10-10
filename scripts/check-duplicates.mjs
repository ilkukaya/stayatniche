/**
 * Fail if two hotel pages describe the same property. Run in CI and by the writer before publishing.
 * Same property = same sourceId, same Expedia hotel id (src/data/expedia-hotels.json), same official
 * website (host + path), or same name in the same country (ignoring "The", "Hotel", accents, case).
 * Usage: node scripts/check-duplicates.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';

const DIR = 'src/content/hotels';
const expedia = JSON.parse(readFileSync('src/data/expedia-hotels.json', 'utf8'));
const fm = (t, k) => (t.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) ?? [])[1]?.replace(/^["']|["']$/g, '').trim();
const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\b(the|hotel|hotels|resort|and|spa)\b|&/g, '').replace(/[^a-z0-9]/g, '');
const site = (u = '') => u.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');

const seen = new Map();
let errors = 0;
for (const f of readdirSync(DIR).filter(f => /\.mdx?$/.test(f))) {
  const slug = f.replace(/\.mdx?$/, '');
  const t = readFileSync(`${DIR}/${f}`, 'utf8').split('---')[1] ?? '';
  const keys = [
    fm(t, 'sourceId') && `source ${fm(t, 'sourceId')}`,
    expedia[slug]?.match(/\.h(\d+)\./)?.[1] && `Expedia hotel ${expedia[slug].match(/\.h(\d+)\./)[1]}`,
    fm(t, 'officialWebsite') && `website ${site(fm(t, 'officialWebsite'))}`,
    fm(t, 'name') && `name "${fm(t, 'name')}" in ${fm(t, 'country')}`.replace(fm(t, 'name'), norm(fm(t, 'name'))),
  ].filter(Boolean);
  for (const k of keys) {
    if (seen.has(k)) { errors++; console.log(`DUPLICATE ${slug} and ${seen.get(k)}: same ${k}`); }
    else seen.set(k, slug);
  }
}
console.log(errors ? `\n${errors} duplicate hotel page(s): keep one, delete the other and its translations, add a 301 in netlify.toml.` : 'No duplicate hotel pages.');
process.exit(errors ? 1 : 0);
