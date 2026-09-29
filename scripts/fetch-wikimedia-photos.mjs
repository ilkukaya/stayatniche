/**
 * Fetch free-licensed hotel photos from Wikidata / Wikimedia Commons.
 *
 * For each hotel without its own photo:
 *   1. search Wikidata for the hotel name
 *   2. accept a candidate only if it has an image (P18) AND its coordinates (P625)
 *      are within MAX_KM of ours (prevents picking a different place with the same name)
 *   3. accept only licences allowing commercial reuse (CC0 / PD / CC BY / CC BY-SA)
 *   4. save public/images/hotels/<slug>.webp and record the credit in src/data/photo-credits.json
 *
 * Runs in GitHub Actions (see .github/workflows/fetch-photos.yml). Usage: node scripts/fetch-wikimedia-photos.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import sharp from 'sharp';

const UA = 'StayAtNicheBot/1.0 (https://stayatniche.com; photo credits page)';
const MAX_KM = 30;
let MAX_KM_OVERRIDE = null;
const CREDITS = 'src/data/photo-credits.json';
const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {};
const OK_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? [0-9.]+|cc by(-sa)?|cc-by(-sa)?-[0-9.]+)/i;

const get = async (url) => {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) return r;
    await new Promise(s => setTimeout(s, 1500 * (i + 1)));
  }
  throw new Error('HTTP failed ' + url);
};
const json = async (url) => (await get(url)).json();
const km = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180; const x = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const strip = (h = '') => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const cleanAuthor = (a) => (a.match(/No machine-readable author provided\.\s*(.+?)\s+assumed/)?.[1] ?? a).split(' • ')[0].replace(/\s+at English Wikipedia$/, ' (English Wikipedia)').slice(0, 80);
const fm = (t, k) => (t.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) ?? [])[1]?.replace(/^["']|["']$/g, '').trim();

const MODE = process.argv.includes('--destinations') ? 'destinations' : 'hotels';
const LANDMARKS = MODE === 'destinations' ? JSON.parse(readFileSync('data/destination-landmarks.json', 'utf8')) : {};
const OUT_DIR = MODE === 'destinations' ? 'public/images/destinations' : 'public/images/hotels';
const KEY = (slug) => (MODE === 'destinations' ? `dest:${slug}` : slug);
if (MODE === 'destinations') { MAX_KM_OVERRIDE = 900; }
const hotels = readdirSync(`src/content/${MODE}`).filter(f => f.endsWith('.md')).map(f => {
  const t = readFileSync(`src/content/${MODE}/${f}`, "utf8").split('---')[1];
  const lat = +(t.match(/lat:\s*(-?[\d.]+)/) ?? [])[1], lng = +(t.match(/lng:\s*(-?[\d.]+)/) ?? [])[1];
  const slug = f.replace(/\.md$/, '');
  return { slug, name: MODE === 'destinations' ? (LANDMARKS[slug] ?? fm(t, 'name')) : fm(t, 'name'), lat, lng };
});

let found = 0, skipped = 0;
for (const h of hotels) {
  if (credits[KEY(h.slug)] || ['webp', 'jpg', 'png'].some(e => existsSync(`${OUT_DIR}/${h.slug}.${e}`) || existsSync(`public/images/${h.slug}.${e}`))) continue;
  if (!h.name || Number.isNaN(h.lat) || Number.isNaN(h.lng)) { skipped++; continue; }
  try {
    const names = [...new Set([h.name, h.name.replace(/^(The|Hotel)\s+/i, ''), h.name.split(/[,(–-]/)[0].trim()])];
    let pick = null;
    for (const q of names) {
      const s = await json(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=7&search=${encodeURIComponent(q)}`);
      const ids = (s.search ?? []).map(x => x.id);
      if (!ids.length) continue;
      const e = await json(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels&languages=en&ids=${ids.join('|')}`);
      for (const id of ids) {
        const c = e.entities[id]?.claims ?? {};
        const img = c.P18?.[0]?.mainsnak?.datavalue?.value;
        const co = c.P625?.[0]?.mainsnak?.datavalue?.value;
        if (!img || !co) continue;
        const d = km(h.lat, h.lng, co.latitude, co.longitude);
        if (d <= (MAX_KM_OVERRIDE ?? MAX_KM)) { pick = { id, img, d, label: e.entities[id]?.labels?.en?.value }; break; }
      }
      if (pick) break;
    }
    if (!pick) { console.log(`–  ${h.slug}: no geo-matched Wikidata image`); continue; }

    const info = await json(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600&titles=${encodeURIComponent('File:' + pick.img)}`);
    const ii = Object.values(info.query.pages)[0]?.imageinfo?.[0];
    const md = ii?.extmetadata ?? {};
    const lic = strip(md.LicenseShortName?.value);
    if (!ii || !OK_LICENSE.test(lic) || /nc|nd/i.test(lic.replace(/^cc0/i, ''))) { console.log(`✗  ${h.slug}: licence not usable (${lic})`); continue; }

    const buf = Buffer.from(await (await get(ii.thumburl || ii.url)).arrayBuffer());
    await sharp(buf).rotate().resize(1600, 1067, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 80 }).toFile(`${OUT_DIR}/${h.slug}.webp`);
    credits[KEY(h.slug)] = {
      author: cleanAuthor(strip(md.Artist?.value)) || 'Unknown',
      license: lic,
      licenseUrl: strip(md.LicenseUrl?.value) || null,
      source: ii.descriptionurl,
      wikidata: `https://www.wikidata.org/wiki/${pick.id}`,
      matched: pick.label,
      distanceKm: Math.round(pick.d * 10) / 10,
    };
    found++;
    console.log(`✓  ${h.slug} ← ${pick.label} (${pick.d.toFixed(1)} km, ${lic})`);
    writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + '\n');
  } catch (err) {
    console.log(`!  ${h.slug}: ${err.message}`);
  }
  await new Promise(s => setTimeout(s, 400));
}
writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + '\n');
console.log(`\nDone: ${found} new photos, ${skipped} skipped (no coordinates), ${Object.keys(credits).length} total credited.`);
