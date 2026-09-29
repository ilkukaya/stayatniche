/**
 * Verification: score "new" candidates and mark them verified / weak / rejected / duplicate.
 * Evidence is stored with each candidate so the writer only uses checked facts.
 * Signals: name match, official-website keywords, OSM lodging tag, Wikidata item,
 * website reachable, closure phrases, Wikidata dissolved date, de-dup against the site.
 * Usage: node pipeline/verify.mjs [limit]
 */
import { CATEGORIES } from './categories.mjs';
import { getJSON, loadQueue, saveQueue, sleep, publishedHotels, matchesPublished, UA } from './lib.mjs';

const LIMIT = +(process.argv[2] ?? 120);
const CLOSED = /permanently closed|we have (now )?closed|no longer (open|operating|accepting)|closed (for good|permanently)|this (hotel|property) (has|is) (now )?closed|ceased trading/i;
const q = loadQueue();
const pub = publishedHotels();
const now = new Date().toISOString().slice(0, 10);

async function fetchSite(url) {
  if (!url) return null;
  if (!/^https?:\/\//.test(url)) url = 'https://' + url;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
    const r = await fetch(url, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
    clearTimeout(t);
    const html = (await r.text()).slice(0, 400000);
    const pick = (re) => (html.match(re) ?? [])[1]?.replace(/\s+/g, ' ').trim() ?? '';
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ');
    return { ok: r.ok, status: r.status, url: r.url, title: pick(/<title[^>]*>([^<]{0,200})/i), description: pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,500})/i) || pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{0,500})/i), text: text.slice(0, 60000) };
  } catch (e) { return { ok: false, status: 0, error: String(e.message ?? e).slice(0, 80) }; }
}

const pending = Object.values(q).filter(c => c.status === 'new')
  .sort((a, b) => Number(!!b.wikidata) - Number(!!a.wikidata) || Number(!!b.website) - Number(!!a.website))
  .slice(0, LIMIT);
console.log(`verifying ${pending.length} candidates`);

for (const c of pending) {
  const reasons = [];
  // duplicates
  const dupPub = matchesPublished(c, pub);
  if (dupPub) { c.status = 'duplicate'; c.duplicateOf = dupPub.slug; c.checkedAt = now; continue; }
  if (c.wikidata && c.id.startsWith('osm:') && q[`wd:${c.wikidata}`]) { q[`wd:${c.wikidata}`].status = 'duplicate'; q[`wd:${c.wikidata}`].duplicateOf = c.id; }

  // wikidata facts
  let dissolved = false;
  if (c.wikidata) {
    const e = await getJSON(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|descriptions&languages=en&ids=${c.wikidata}`);
    const cl = e?.entities?.[c.wikidata]?.claims ?? {};
    dissolved = !!(cl.P576 || cl.P3999);
    c.website ||= cl.P856?.[0]?.mainsnak?.datavalue?.value ?? null;
    c.description ||= e?.entities?.[c.wikidata]?.descriptions?.en?.value ?? null;
    c.hasWikiImage = !!cl.P18;
  }
  // place
  if (!c.country) {
    await sleep(1100);
    const g = await getJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&lat=${c.lat}&lon=${c.lng}`);
    c.country = g?.address?.country ?? null;
    c.city ||= g?.address?.city || g?.address?.town || g?.address?.village || g?.address?.county || g?.address?.state || null;
    c.region = g?.address?.state ?? null;
  }
  // website
  const site = await fetchSite(c.website);
  const siteText = site?.ok ? `${site.title} ${site.description} ${site.text}` : '';
  const closed = dissolved || CLOSED.test(siteText.slice(0, 20000));

  // score per category, keep the best
  let best = null;
  for (const cat of c.categories) {
    const def = CATEGORIES[cat];
    let s = 0;
    if (new RegExp(def.name, 'i').test(c.name)) { s += 3; }
    const m = siteText.match(def.site);
    if (m) s += 2;
    if (c.osm?.tourism || c.source === 'wikidata') s += 1;
    if (c.wikidata) s += 1;
    if (site?.ok) s += 1;
    if (!best || s > best.score) best = { cat, score: s, siteMatch: m?.[0] ?? null, snippet: m ? siteText.slice(Math.max(0, m.index - 250), m.index + 350).trim() : null };
  }
  c.category = best.cat; c.score = best.score;
  c.evidence = site ? { status: site.status, url: site.url, title: site.title, description: site.description?.slice(0, 400), keyword: best.siteMatch, snippet: best.snippet } : null;
  c.checkedAt = now;

  if (closed) { c.status = 'rejected'; reasons.push(dissolved ? 'wikidata: dissolved' : 'website says closed'); }
  else if (best.score >= 5 && (site?.ok || c.wikidata)) c.status = 'verified';
  else if (best.score >= 3) { c.status = 'weak'; reasons.push('low confidence'); }
  else { c.status = 'rejected'; reasons.push('category not confirmed'); }
  c.reasons = reasons;
  console.log(`${c.status.padEnd(9)} ${String(best.score).padStart(2)} ${best.cat.padEnd(20)} ${c.name}`);
  saveQueue(q);
}
saveQueue(q);
const tally = Object.values(q).reduce((m, x) => ((m[x.status] = (m[x.status] ?? 0) + 1), m), {});
console.log('\nqueue:', JSON.stringify(tally));
