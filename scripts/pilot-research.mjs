/**
 * Pilot research: (1) audit existing hotels, (2) verify treehouse candidates.
 * Open data only: OpenStreetMap Nominatim (1 req/s, per usage policy) + Wikidata.
 * Writes docs/pilot/audit.json, docs/pilot/treehouse-candidates.json and docs/pilot/REPORT.md.
 * Runs in GitHub Actions (.github/workflows/pilot-research.yml).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const UA = 'StayAtNicheResearch/1.0 (https://stayatniche.com)';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const km = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180; const x = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
async function json(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } }); if (r.ok) return await r.json(); } catch {}
    await sleep(2000 * (i + 1));
  }
  return null;
}
const LODGING = /hotel|guest_house|chalet|camp_site|hostel|motel|apartment|resort|alpine_hut|caravan_site|holiday|lodge|wilderness_hut/;

async function osm(name, extra = '') {
  await sleep(1100);
  const r = await json(`https://nominatim.openstreetmap.org/search?format=jsonv2&extratags=1&addressdetails=1&limit=6&q=${encodeURIComponent(name + (extra ? ', ' + extra : ''))}`);
  return (r ?? []).map(x => ({ lat: +x.lat, lng: +x.lon, cls: `${x.category}=${x.type}`, name: x.name, display: x.display_name, website: x.extratags?.website || x.extratags?.['contact:website'] || null, country: x.address?.country }));
}
async function wikidata(name, lat, lng) {
  const s = await json(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=6&search=${encodeURIComponent(name)}`);
  const ids = (s?.search ?? []).map(x => x.id); if (!ids.length) return null;
  const e = await json(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|descriptions|labels&languages=en&ids=${ids.join('|')}`);
  for (const id of ids) {
    const c = e?.entities?.[id]?.claims ?? {};
    const co = c.P625?.[0]?.mainsnak?.datavalue?.value; if (!co) continue;
    const d = lat != null ? km(lat, lng, co.latitude, co.longitude) : 0;
    if (lat != null && d > 30) continue;
    return { id, label: e.entities[id].labels?.en?.value, desc: e.entities[id].descriptions?.en?.value ?? '', lat: co.latitude, lng: co.longitude, distKm: Math.round(d * 10) / 10,
      website: c.P856?.[0]?.mainsnak?.datavalue?.value ?? null, dissolved: !!(c.P576 || c.P3999), image: !!c.P18 };
  }
  return null;
}

// ── 1. Audit existing hotels ─────────────────────────────────────────────
const hotels = readdirSync('src/content/hotels').filter(f => f.endsWith('.md')).map(f => {
  const t = readFileSync(`src/content/hotels/${f}`, 'utf8').split('---')[1];
  const g = k => (t.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) ?? [])[1]?.replace(/^["']|["']$/g, '').trim();
  return { slug: f.slice(0, -3), name: g('name'), country: g('country'), dest: g('destination'), cat: g('category'), lat: +(t.match(/lat:\s*(-?[\d.]+)/) ?? [])[1], lng: +(t.match(/lng:\s*(-?[\d.]+)/) ?? [])[1] };
});
const audit = [];
for (const h of hotels) {
  const hits = [...await osm(h.name, h.country)];
  if (!hits.length) hits.push(...await osm(h.name));
  const near = hits.map(x => ({ ...x, d: km(h.lat, h.lng, x.lat, x.lng) })).sort((a, b) => a.d - b.d);
  const best = near.find(x => x.d <= 60) ?? null;
  const wd = await wikidata(h.name, h.lat, h.lng);
  const precise = best ?? (wd ? { lat: wd.lat, lng: wd.lng, d: wd.distKm } : null);
  let verdict = 'ok';
  if (!best && !wd) verdict = 'not-found';
  else if (wd?.dissolved) verdict = 'closed?';
  else if (precise && precise.d > 5) verdict = 'coords-off';
  audit.push({ ...h, verdict, osm: best && { cls: best.cls, name: best.name, km: Math.round(best.d * 10) / 10, lat: best.lat, lng: best.lng, website: best.website, lodging: LODGING.test(best.cls) }, wikidata: wd });
  console.log(verdict.padEnd(11), h.slug);
}
writeFileSync('docs/pilot/audit.json', JSON.stringify(audit, null, 2) + '\n');

// ── 2. Treehouse candidates ──────────────────────────────────────────────
const existing = new Set(hotels.map(h => h.name.toLowerCase()));
const seeds = JSON.parse(readFileSync('docs/pilot/treehouse-seeds.json', 'utf8'));
const cands = [];
for (const s of seeds) {
  const hits = await osm(s.name, s.country);
  const lodging = hits.find(x => LODGING.test(x.cls)) ?? null;
  const any = lodging ?? hits[0] ?? null;
  const wd = await wikidata(s.name, any?.lat ?? null, any?.lng ?? null);
  const status = lodging || (wd && /hotel|lodge|resort|accommodation|treehouse/i.test(wd.desc)) ? (wd?.dissolved ? 'closed?' : 'verified') : any ? 'found-not-lodging' : 'not-found';
  cands.push({ ...s, alreadyListed: existing.has(s.name.toLowerCase()), status, osm: any && { cls: any.cls, name: any.name, display: any.display, lat: any.lat, lng: any.lng, website: any.website }, wikidata: wd });
  console.log(status.padEnd(18), s.name);
}
writeFileSync('docs/pilot/treehouse-candidates.json', JSON.stringify(cands, null, 2) + '\n');

// ── Report ────────────────────────────────────────────────────────────────
const count = (arr, k) => arr.reduce((m, x) => ((m[x[k]] = (m[x[k]] ?? 0) + 1), m), {});
const L = ['# Pilot research report', '', `Generated ${new Date().toISOString()} from OpenStreetMap + Wikidata.`, '',
  '## 1. Existing hotels', '', '```', JSON.stringify(count(audit, 'verdict')), '```', '',
  '| Verdict | Hotel | OSM match | Distance | Website |', '|---|---|---|---|---|',
  ...audit.filter(a => a.verdict !== 'ok').map(a => `| ${a.verdict} | ${a.name} (${a.slug}) | ${a.osm?.name ?? '–'} ${a.osm?.cls ?? ''} | ${a.osm?.km ?? a.wikidata?.distKm ?? '–'} km | ${a.osm?.website ?? a.wikidata?.website ?? '–'} |`),
  '', '## 2. Treehouse candidates', '', '```', JSON.stringify(count(cands, 'status')), '```', '',
  '| Status | Name | Country | OSM | Website | Listed |', '|---|---|---|---|---|---|',
  ...cands.map(c => `| ${c.status} | ${c.name} | ${c.country} | ${c.osm?.cls ?? '–'} | ${c.osm?.website ?? c.wikidata?.website ?? '–'} | ${c.alreadyListed ? 'yes' : ''} |`), ''];
writeFileSync('docs/pilot/REPORT.md', L.join('\n'));
console.log('report written');
