/**
 * Real photos for stays that have none, from Wikimedia Commons (free licences only).
 *
 * For each hotel without its own photo (public/images/**/<slug>.*):
 *   1. Commons file search for the hotel's name. A file counts as a photo OF the hotel only if its
 *      title contains every distinctive word of the name and (when the file is geotagged) it was
 *      taken within 3 km. Saved as public/images/hotels/<slug>.webp, credit key "<slug>".
 *   2. Otherwise the best geotagged photo taken near the hotel (5 km, then 10 km): landscape,
 *      large, no maps/signs/people/interiors, Commons "quality"/"featured" photos first, never a
 *      file already used for another stay. Saved as public/images/area/<slug>--area.webp, credit
 *      key "area:<slug>"; the site labels it as the surrounding area, not the hotel.
 *
 * Runs in GitHub Actions (.github/workflows/fetch-photos.yml). Usage:
 *   node scripts/fetch-area-photos.mjs [--only slug,slug] [--redo]
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import sharp from 'sharp';

const UA = 'StayAtNicheBot/1.0 (https://stayatniche.com; photo credits page)';
const API = 'https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&';
const CREDITS = 'src/data/photo-credits.json';
const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {};
const OK_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? [0-9.]+|cc by(-sa)?|cc-by(-sa)?-[0-9.]+)/i;
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const ONLY = arg('--only')?.split(',');
const REDO = process.argv.includes('--redo');

const get = async (url) => {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) return r;
    await new Promise(s => setTimeout(s, 2000 * (i + 1)));
  }
  throw new Error('HTTP failed ' + url);
};
const api = async (q) => (await get(API + q)).json();
const sleep = (ms) => new Promise(s => setTimeout(s, ms));
const km = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180; const x = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const strip = (h = '') => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const cleanAuthor = (a) => (a.match(/No machine-readable author provided\.\s*(.+?)\s+assumed/)?.[1] ?? a).split(' • ')[0].replace(/\s+at English Wikipedia$/, ' (English Wikipedia)').slice(0, 80);
const fm = (t, k) => (t.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) ?? [])[1]?.replace(/^["']|["']$/g, '').trim();
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ı/g, 'i');
const words = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

// Every image already on the site, by basename (same rule as src/lib/images.ts).
const have = new Set();
(function scan(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (e.name !== 'art') scan(join(dir, e.name)); continue; }
    if (['.avif', '.webp', '.jpg', '.jpeg', '.png'].includes(extname(e.name).toLowerCase())) have.add(basename(e.name, extname(e.name)));
  }
})('public/images');

const hotels = readdirSync('src/content/hotels').filter(f => f.endsWith('.md')).map(f => {
  const t = readFileSync(`src/content/hotels/${f}`, 'utf8').split('---')[1];
  return {
    slug: f.replace(/\.md$/, ''), name: fm(t, 'name'), destination: fm(t, 'destination') ?? '', category: fm(t, 'category'),
    lat: +(t.match(/lat:\s*(-?[\d.]+)/) ?? [])[1], lng: +(t.match(/lng:\s*(-?[\d.]+)/) ?? [])[1],
  };
}).filter(h => (!ONLY || ONLY.includes(h.slug)) && h.category !== 'train-hotels');

const usedFiles = new Set(Object.values(credits).map(c => c.source));

// ── File metadata, 50 titles per request ────────────────────────────────────
async function fileInfo(titles) {
  const out = [];
  for (let i = 0; i < titles.length; i += 50) {
    const r = await api(`action=query&prop=imageinfo|coordinates&iiprop=url|size|mime|extmetadata&iiurlwidth=1600&iiextmetadatafilter=Artist|LicenseShortName|LicenseUrl|Assessments|Categories|Restrictions|ImageDescription&titles=${encodeURIComponent(titles.slice(i, i + 50).join('|'))}`);
    for (const p of r.query?.pages ?? []) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const md = ii.extmetadata ?? {};
      out.push({
        title: p.title, url: ii.thumburl || ii.url, page: ii.descriptionurl, w: ii.width, h: ii.height, mime: ii.mime,
        lat: p.coordinates?.[0]?.lat, lng: p.coordinates?.[0]?.lon,
        license: strip(md.LicenseShortName?.value), licenseUrl: strip(md.LicenseUrl?.value) || null,
        author: cleanAuthor(strip(md.Artist?.value)) || 'Unknown',
        assess: (md.Assessments?.value ?? '').toLowerCase(), cats: strip(md.Categories?.value).toLowerCase(),
        restrict: (md.Restrictions?.value ?? '').toLowerCase(), desc: strip(md.ImageDescription?.value).toLowerCase().slice(0, 300),
      });
    }
    await sleep(300);
  }
  return out;
}

const licenseOk = (f) => OK_LICENSE.test(f.license) && !/\b(nc|nd)\b/i.test(f.license.replace(/^cc0/i, ''));
const photoOk = (f) => /jpeg/.test(f.mime) && f.w >= 1400 && f.h >= 850 && f.w / f.h >= 1.2 && f.w / f.h <= 2.4 && licenseOk(f) && !/personality/.test(f.restrict);
const BAD = /\b(maps?|karte|plan|plans|logo|logos|signs?|signage|schild|diagram|coat of arms|flags?|menu|ticket|stamps?|posters?|inscriptions?|plaques?|graves?|tombs?|portraits?|selfies?|interiors?|toilets?|bathrooms?|cars?|buses|bus|trucks?|vehicles?|license plates?|construction|people|men|women|children|crowd|food|dishes|cuisine|meals?|drinks?|animals in|dogs?|cats?|insects?|birds of|flowers of|documents?|screenshots?|aerial photographs? of airports?|night sky|astronomy|street art|graffiti|advertis\w*|shops?|stores?|supermarkets?|petrol|gas stations?|parking)\b/i;
const SCENIC = /\b(view|panorama|panoramic|landscape|aerial|sunset|sunrise|valley|castle|beach|coast|bay|lake|mountains?|village|town|cliffs?|lagoon|island|chimneys?|desert|forest|river|harbou?r|canyon|fjord|waterfall|glacier|dunes?|savann?a|rainforest|vineyards?|hills?|countryside|old town|skyline|loch|gorge)\b/i;

function score(f, h) {
  const d = f.lat != null ? km(h.lat, h.lng, f.lat, f.lng) : 9;
  let s = 0;
  if (/featured|poty/.test(f.assess)) s += 6; else if (/quality/.test(f.assess)) s += 4; else if (/valued/.test(f.assess)) s += 2;
  if (SCENIC.test(f.title) || SCENIC.test(f.desc)) s += 1.5;
  s += Math.min(f.w / 4000, 1);
  s -= d / 1.5;
  return { s, d };
}

async function save(f, file) {
  const buf = Buffer.from(await (await get(f.url)).arrayBuffer());
  mkdirSync(file.replace(/\/[^/]+$/, ''), { recursive: true });
  await sharp(buf).rotate().resize(1600, 1067, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 80 }).toFile(file);
}
const credit = (f, h, extra) => ({
  author: f.author, license: f.license, licenseUrl: f.licenseUrl, source: f.page, title: f.title.replace(/^File:/, ''),
  distanceKm: f.lat != null ? Math.round(km(h.lat, h.lng, f.lat, f.lng) * 10) / 10 : null, ...extra,
});

// ── 1. A photo of the hotel itself ──────────────────────────────────────────
const GENERIC = new Set(['the', 'hotel', 'hotels', 'resort', 'spa', 'and', 'by', 'suites', 'suite', 'boutique', 'collection', 'de', 'la', 'le', 'el', 'del', 'di', 'at', 'of', 'a', 'an', 'luxury', 'otel', 'hotell', 'relais', 'chateaux']);
async function ownHotelPhoto(h) {
  const need = words(h.name).filter(w => !GENERIC.has(w) && w.length > 1);
  if (!need.length || (need.length === 1 && need[0].length < 6)) return null;
  const r = await api(`action=query&list=search&srnamespace=6&srlimit=20&srsearch=${encodeURIComponent(`${h.name} filetype:bitmap`)}`);
  const titles = (r.query?.search ?? []).map(x => x.title).filter(t => { const w = new Set(words(t)); return need.every(n => w.has(n)); });
  if (!titles.length) return null;
  const files = (await fileInfo(titles)).filter(f => photoOk(f) && !usedFiles.has(f.page) && !BAD.test(f.title));
  const near = files.filter(f => f.lat == null ? need.length >= 2 : km(h.lat, h.lng, f.lat, f.lng) <= 3);
  near.sort((a, b) => score(b, h).s - score(a, h).s);
  return near[0] ?? null;
}

// ── 2. The best photo of the surrounding area ───────────────────────────────
async function areaPhoto(h) {
  for (const radius of [5000, 10000]) {
    const r = await api(`action=query&list=geosearch&gsnamespace=6&gslimit=200&gsradius=${radius}&gscoord=${h.lat}|${h.lng}`);
    const titles = (r.query?.geosearch ?? []).map(x => x.title).filter(t => /\.jpe?g$/i.test(t) && !BAD.test(t));
    if (!titles.length) continue;
    const files = (await fileInfo(titles.slice(0, 150)))
      .filter(f => photoOk(f) && !usedFiles.has(f.page) && !BAD.test(f.cats) && !BAD.test(f.desc));
    files.sort((a, b) => score(b, h).s - score(a, h).s);
    if (files[0]) return files[0];
  }
  return null;
}

let own = 0, area = 0, none = 0;
for (const h of hotels) {
  if (!h.name || Number.isNaN(h.lat) || Number.isNaN(h.lng)) continue;
  const hasOwn = have.has(h.slug);
  const hasArea = have.has(`${h.slug}--area`);
  if (hasOwn || (hasArea && !REDO)) continue;
  try {
    const f = await ownHotelPhoto(h);
    if (f) {
      await save(f, `public/images/hotels/${h.slug}.webp`);
      credits[h.slug] = credit(f, h, { kind: 'hotel', matched: h.name });
      if (hasArea) { unlinkSync(`public/images/area/${h.slug}--area.webp`); delete credits[`area:${h.slug}`]; }
      usedFiles.add(f.page); own++;
      console.log(`✓ hotel ${h.slug} ← ${f.title}`);
    } else {
      const a = await areaPhoto(h);
      if (!a) { none++; console.log(`– ${h.slug}: nothing usable nearby`); continue; }
      if (hasArea) usedFiles.delete(credits[`area:${h.slug}`]?.source);
      await save(a, `public/images/area/${h.slug}--area.webp`);
      credits[`area:${h.slug}`] = credit(a, h, { kind: 'area', place: h.destination.split(',')[0].trim() });
      usedFiles.add(a.page); area++;
      console.log(`✓ area  ${h.slug} ← ${a.title} (${credits[`area:${h.slug}`].distanceKm} km, ${a.assess || 'unassessed'})`);
    }
    writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + '\n');
  } catch (err) {
    console.log(`! ${h.slug}: ${err.message}`);
  }
  await sleep(400);
}
writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + '\n');
console.log(`\nDone: ${own} hotel photos, ${area} area photos, ${none} without a usable photo.`);
