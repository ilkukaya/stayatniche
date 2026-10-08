/**
 * Builds review-page documents for one classification run: every candidate Haiku accepted or
 * flagged for review becomes one document in the review page's `queue` collection.
 * Writes <run dir>/queue/<doc id>.json and <run dir>/queue-batches.json (ArtifactData batch
 * writes, at most 50 per batch) for the classifier routine to send.
 * Usage: node pipeline/review-items.mjs <decisions run dir>
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadQueue, INBOX, packName, catOf } from './lib.mjs';
import { cellRanker, countryOf } from './priorities.mjs';

const dir = process.argv[2];
if (!dir) { console.error('usage: node pipeline/review-items.mjs <decisions run dir>'); process.exit(1); }
const run = dir.replace(/\/$/, '').split('/').pop();
const q = loadQueue();
const rank = cellRanker(q);
const rows = JSON.parse(readFileSync(`${dir}/checked.json`, 'utf8')).filter(d => d.verdict === 'accepted' || d.verdict === 'needs_review');
mkdirSync(`${dir}/queue`, { recursive: true });

const writes = [];
for (const d of rows) {
  const c = q[d.id] ?? {};
  const packPath = `${INBOX}/${packName(d.id)}.json`;
  const ev = existsSync(packPath) ? JSON.parse(readFileSync(packPath, 'utf8')) : {};
  const cat = d.category ?? null;
  const country = countryOf(c) ?? ev.country ?? null;
  const doc = {
    id: d.id, name: d.official_name || ev.name || c.name, mapName: ev.name ?? c.name ?? null, country, city: ev.city ?? c.city ?? null, region: ev.region ?? c.region ?? null,
    cell: `${cat ?? 'other'}|${country ?? '?'}`, rank: rank({ ...c, category: cat ?? catOf(c) }),
    cat, other: d.other_niche_type ?? null, regexCat: catOf(c) ?? null, regexStatus: c.status ?? null,
    verdict: d.verdict, scope: d.niche_scope, conf: d.confidence, feature: d.niche_feature ?? null, reason: d.reason ?? null,
    quote: d.category_quote ?? null,
    highlights: (d.highlights ?? []).map(x => x.text).slice(0, 6), amenities: (d.amenities ?? []).map(x => x.text).slice(0, 10),
    roomCount: d.room_count?.value ?? null, season: d.season?.text ?? null, access: d.access?.text ?? null, audience: d.audience ?? null,
    url: ev.finalUrl ?? ev.website ?? c.website ?? null, lat: ev.lat ?? c.lat ?? null, lng: ev.lng ?? c.lng ?? null,
    wiki: ev.wikipedia?.url ?? null, pages: ev.pages?.length ?? 0, run,
    status: 'pending', decision: null, finalCat: null, note: '', reviewedAt: null, slug: null, publishedAt: null,
  };
  const k = packName(d.id);
  writeFileSync(`${dir}/queue/${k}.json`, JSON.stringify(doc, null, 1) + '\n');
  writes.push({ op: 'set', collection: 'queue', doc_id: k, file_path: resolve(`${dir}/queue/${k}.json`) });
}
const batches = [];
for (let i = 0; i < writes.length; i += 50) batches.push(writes.slice(i, i + 50));
writeFileSync(`${dir}/queue-batches.json`, JSON.stringify(batches, null, 1) + '\n');
console.log(`${rows.length} review items in ${batches.length} batch(es): ${dir}/queue-batches.json`);
