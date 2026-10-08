import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

export const UA = 'StayAtNicheBot/1.0 (+https://stayatniche.com/about/)';
export const QUEUE = 'data/pipeline/candidates.json';
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// Evidence packs live on the orphan `pipeline-data` branch, checked out here (git-ignored).
export const DATA_DIR = process.env.PIPELINE_DATA ?? '.pipeline-data';
export const INBOX = `${DATA_DIR}/inbox`;
export const DECISIONS = 'data/pipeline/decisions';
export const packName = (id) => id.replace(/[^a-z0-9]+/gi, '_');
export const today = () => new Date().toISOString().slice(0, 10);
export const catOf = (c) => c.category ?? c.categories?.[0];
export const km = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180; const x = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
export const norm = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(the|hotel|resort|lodge|&|and|spa)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

export async function getJSON(url, opts = {}, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
      if (r.ok) return await r.json();
      if (r.status === 429 || r.status >= 500) { await sleep(5000 * (i + 1)); continue; }
      return null;
    } catch { await sleep(3000 * (i + 1)); }
  }
  return null;
}

export function loadQueue() { return existsSync(QUEUE) ? JSON.parse(readFileSync(QUEUE, 'utf8')) : {}; }
export function saveQueue(q) {
  const sorted = Object.fromEntries(Object.entries(q).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(QUEUE, JSON.stringify(sorted, null, 1) + '\n');
}

/** Hotels already published on the site (name + coordinates) for de-duplication. */
export function publishedHotels() {
  return readdirSync('src/content/hotels').filter(f => f.endsWith('.md')).map(f => {
    const t = readFileSync(`src/content/hotels/${f}`, 'utf8').split('---')[1] ?? '';
    return { slug: f.slice(0, -3), name: (t.match(/^name:\s*(.+)$/m) ?? [])[1]?.replace(/^["']|["']$/g, '') ?? '', lat: +(t.match(/lat:\s*(-?[\d.]+)/) ?? [])[1], lng: +(t.match(/lng:\s*(-?[\d.]+)/) ?? [])[1], source: (t.match(/^sourceId:\s*(.+)$/m) ?? [])[1]?.trim() };
  });
}
export function matchesPublished(c, pub) {
  return pub.find(p => p.source === c.id || (norm(p.name) && norm(p.name) === norm(c.name)) || (!isNaN(p.lat) && km(p.lat, p.lng, c.lat, c.lng) < 0.3 && norm(c.name).split(' ')[0] === norm(p.name).split(' ')[0]));
}
