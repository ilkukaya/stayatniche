/**
 * Discovery: find candidate niche stays in OpenStreetMap (Overpass) and Wikidata and add them
 * to data/pipeline/candidates.json with status "new". Rotates through categories so each
 * night runs a few; a full sweep takes about a week. Usage: node pipeline/discover.mjs [category...]
 */
import { CATEGORIES, LODGING } from './categories.mjs';
import { getJSON, loadQueue, saveQueue, sleep } from './lib.mjs';

const PER_NIGHT = 2;
const keys = Object.keys(CATEGORIES);
const day = Math.floor(Date.now() / 86400000);
const todo = process.argv.slice(2).length ? process.argv.slice(2) : Array.from({ length: PER_NIGHT }, (_, i) => keys[(day * PER_NIGHT + i) % keys.length]);

const WD_KEYWORDS = {
  'treehouse-hotels': ['treehouse hotel', 'tree hotel'], 'cave-hotels': ['cave hotel'], 'underwater-rooms': ['underwater hotel'],
  'castle-hotels': ['castle hotel'], 'floating-hotels': ['floating hotel', 'botel'], 'bubble-hotels': ['bubble hotel'],
  'cliffside-hotels': ['cliff hotel'], 'desert-camps': ['desert camp'], 'jungle-lodges': ['jungle lodge', 'rainforest lodge'],
  'ice-hotels': ['ice hotel', 'snow hotel', 'igloo hotel'], 'safari-lodges': ['safari lodge'], 'overwater-bungalows': ['water villa resort'],
  'lighthouse-hotels': ['lighthouse hotel'], 'train-hotels': ['train hotel', 'railway carriage hotel'],
};

const q = loadQueue();
const now = new Date().toISOString().slice(0, 10);
let added = 0;
const add = (c) => {
  if (!c.name || c.lat == null) return;
  const prev = q[c.id];
  if (prev) { if (!prev.categories.includes(c.categories[0])) prev.categories.push(c.categories[0]); prev.lastSeen = now; return; }
  q[c.id] = { ...c, status: 'new', firstSeen: now, lastSeen: now };
  added++;
};

for (const cat of todo) {
  const def = CATEGORIES[cat];
  console.log(`\n# ${cat}`);
  const ql = `[out:json][timeout:900];(nwr["tourism"~"^(${LODGING})$"]["name"~"${def.name}",i];${(def.extra ?? []).join('')});out center tags;`;
  const res = await getJSON('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(ql), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 2);
  const els = res?.elements ?? [];
  console.log(`overpass: ${els.length} elements`);
  for (const e of els) {
    const t = e.tags ?? {};
    if (t['disused:tourism'] || t['abandoned:tourism'] || t.opening_hours === 'closed') continue;
    add({
      id: `osm:${e.type}/${e.id}`, name: t.name, categories: [cat],
      lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon,
      website: t.website || t['contact:website'] || t.url || null, wikidata: t.wikidata || null,
      country: t['addr:country'] || null, city: t['addr:city'] || null,
      osm: { tourism: t.tourism, historic: t.historic, man_made: t.man_made, stars: t.stars },
      source: 'osm',
    });
  }
  for (const kw of WD_KEYWORDS[cat] ?? []) {
    await sleep(1000);
    const s = await getJSON(`https://www.wikidata.org/w/api.php?action=query&list=search&format=json&srlimit=50&srsearch=${encodeURIComponent(`${kw} haswbstatement:P625`)}`);
    const ids = (s?.query?.search ?? []).map(x => x.title).filter(x => /^Q\d+$/.test(x));
    for (let i = 0; i < ids.length; i += 40) {
      const e = await getJSON(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels|descriptions&languages=en&ids=${ids.slice(i, i + 40).join('|')}`);
      for (const [id, ent] of Object.entries(e?.entities ?? {})) {
        const c = ent.claims ?? {}; const co = c.P625?.[0]?.mainsnak?.datavalue?.value;
        const desc = ent.descriptions?.en?.value ?? '';
        if (!co || c.P576 || !/hotel|lodge|resort|accommodation|camp|inn|igloo|guest/i.test(desc)) continue;
        add({ id: `wd:${id}`, name: ent.labels?.en?.value, categories: [cat], lat: co.latitude, lng: co.longitude, website: c.P856?.[0]?.mainsnak?.datavalue?.value ?? null, wikidata: id, country: null, city: null, description: desc, source: 'wikidata' });
      }
    }
  }
  saveQueue(q);
}
console.log(`\nadded ${added} new candidates (total ${Object.keys(q).length})`);
