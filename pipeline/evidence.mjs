/**
 * Evidence packs: for each candidate id, fetch the official website (home + up to 3 relevant
 * subpages), schema.org JSON-LD, and a Wikipedia summary, and write one JSON file per candidate
 * to data/pipeline/inbox/. Claude sessions classify from these files without touching the web.
 * Usage: node pipeline/evidence.mjs <ids.json | id...>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { getJSON, loadQueue, sleep, UA } from './lib.mjs';

const OUT = 'data/pipeline/inbox';
const PAGE_CHARS = 6000;
const SUBPAGES = 3;
// Link text / path hints for pages that describe the stay itself.
const SUB_HINT = /room|suite|accommodation|stay|lodg|cabin|tent|villa|treehouse|cave|about|history|story|our-|the-hotel|hotel|location|getting|how-to|faq|zimmer|unterkunft|geschichte|camere|storia|chambre|histoire|habitacion|historia|kamer|odalar|hakkimizda|tarihce/i;
const SKIP_HINT = /\.(pdf|jpg|jpeg|png|gif|webp|zip)(\?|$)|mailto:|tel:|javascript:|#|login|cart|checkout|privacy|cookie|terms|impressum|legal|gdpr|careers|jobs|gift|voucher|press|blog\/page/i;

const args = process.argv.slice(2);
const ids = args.length === 1 && args[0].endsWith('.json') ? JSON.parse(readFileSync(args[0], 'utf8')) : args;
const q = loadQueue();
mkdirSync(OUT, { recursive: true });
const robotsCache = new Map();

const fileName = (id) => id.replace(/[^a-z0-9]+/gi, '_') + '.json';
const clean = (html) => html
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<svg[\s\S]*?<\/svg>|<select[\s\S]*?<\/select>/gi, ' ')
  .replace(/<(header|nav|footer)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|section|article|tr)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&rsquo;/g, "'").replace(/&[a-z#0-9]+;/gi, ' ')
  .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n').trim();

async function allowed(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.origin)) {
    const rules = [];
    try {
      const r = await fetchText(`${u.origin}/robots.txt`, 8000);
      if (r?.ok && !/<html/i.test(r.text)) {
        let applies = false; let lastWasAgent = false;
        for (const line of r.text.split('\n')) {
          const [k, ...rest] = line.replace(/#.*/, '').split(':'); const v = rest.join(':').trim(); const key = k.trim().toLowerCase();
          if (key === 'user-agent') { const m = v === '*' || /stayatniche/i.test(v); applies = lastWasAgent ? applies || m : m; lastWasAgent = true; continue; }
          lastWasAgent = false;
          if ((key === 'disallow' || key === 'allow') && applies && v) {
            // Robots patterns: * matches anything, $ anchors the end.
            const re = new RegExp('^' + v.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$|\$$/, '$'));
            rules.push({ allow: key === 'allow', len: v.length, re });
          }
        }
      }
    } catch {}
    robotsCache.set(u.origin, rules);
  }
  // Longest matching rule wins; no match means allowed.
  const path = u.pathname + u.search;
  const hit = robotsCache.get(u.origin).filter(r => r.re.test(path)).sort((a, b) => b.len - a.len)[0];
  return !hit || hit.allow;
}

async function fetchText(url, ms = 15000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': UA, 'Accept-Language': 'en,*;q=0.5' } });
    const type = r.headers.get('content-type') ?? '';
    let text = '';
    if (/html|text|xml|json/.test(type) || !type) {
      // Decode with the page's own charset (header or <meta>), not always UTF-8.
      const buf = Buffer.from(await r.arrayBuffer()).subarray(0, 1500000);
      const head = buf.subarray(0, 4000).toString('latin1');
      const cs = (type.match(/charset=([\w-]+)/i) ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i) ?? [])[1]?.toLowerCase() ?? 'utf-8';
      try { text = new TextDecoder(cs).decode(buf); } catch { text = new TextDecoder('utf-8').decode(buf); }
      text = text.slice(0, 800000);
    }
    return { ok: r.ok, status: r.status, url: r.url, text };
  } catch (e) { return { ok: false, status: 0, url, text: '', error: String(e.message ?? e).slice(0, 100) }; }
  finally { clearTimeout(t); }
}

function jsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const d = JSON.parse(m[1].trim());
      const items = [d, ...(Array.isArray(d) ? d : []), ...(d['@graph'] ?? [])].flat();
      for (const it of items) {
        const t = [].concat(it?.['@type'] ?? []).join(',');
        if (/Hotel|Lodging|Resort|BedAndBreakfast|Hostel|Motel|Campground|Accommodation|LocalBusiness/i.test(t)) {
          const keep = ['@type', 'name', 'description', 'address', 'telephone', 'priceRange', 'starRating', 'checkinTime', 'checkoutTime', 'numberOfRooms', 'amenityFeature', 'geo', 'url'];
          const o = Object.fromEntries(keep.filter(k => it[k] != null).map(k => [k, it[k]]));
          if (typeof o.description === 'string') o.description = o.description.slice(0, 600);
          if (Array.isArray(o.amenityFeature)) o.amenityFeature = o.amenityFeature.slice(0, 30).map(a => a?.name ?? a);
          out.push(o);
        }
      }
    } catch {}
  }
  return out;
}

function pickSubpages(html, base) {
  const host = new URL(base).hostname.replace(/^www\./, '');
  const seen = new Set(); const scored = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let href; try { href = new URL(m[1], base); } catch { continue; }
    if (href.hostname.replace(/^www\./, '') !== host || SKIP_HINT.test(m[1])) continue;
    href.hash = ''; const key = href.pathname.replace(/\/$/, '');
    if (!key || key === new URL(base).pathname.replace(/\/$/, '') || seen.has(key)) continue;
    seen.add(key);
    const label = m[2].replace(/<[^>]+>/g, ' ').trim();
    const s = (SUB_HINT.test(label) ? 2 : 0) + (SUB_HINT.test(href.pathname) ? 1 : 0) - href.pathname.split('/').length * 0.1;
    if (s > 0) scored.push({ url: href.toString(), label: label.slice(0, 60), s });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, SUBPAGES);
}

async function wikipedia(qid) {
  const e = await getJSON(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&ids=${qid}`);
  const links = e?.entities?.[qid]?.sitelinks ?? {};
  const site = links.enwiki ? 'enwiki' : Object.keys(links).find(k => /^[a-z]{2,3}wiki$/.test(k));
  if (!site) return null;
  const lang = site.replace(/wiki$/, ''); const title = links[site].title;
  const s = await getJSON(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
  return s?.extract ? { lang, title, url: s.content_urls?.desktop?.page ?? null, extract: s.extract.slice(0, 2500) } : null;
}

let n = 0;
for (const id of ids) {
  const c = q[id];
  if (!c) { console.log(`missing ${id}`); continue; }
  const pack = {
    id, name: c.name, queueStatus: c.status, queueCategory: c.category ?? c.categories[0], categories: c.categories,
    lat: c.lat, lng: c.lng, country: c.country, city: c.city, region: c.region ?? null,
    osm: c.osm ?? null, wikidata: c.wikidata, wikidataDescription: c.description ?? null,
    website: c.website, fetchedAt: new Date().toISOString(), pages: [], jsonLd: [], wikipedia: null, notes: [],
  };
  if (c.website) {
    const home = /^https?:\/\//.test(c.website) ? c.website : 'https://' + c.website;
    if (await allowed(home).catch(() => true)) {
      let r = await fetchText(home);
      // Connection-level failures: retry over http and with/without www before giving up.
      for (const alt of [home.replace(/^https:/, 'http:'), home.replace(/^(https?:\/\/)(www\.)?/, (_, s, w) => s + (w ? '' : 'www.'))]) {
        if (r.status !== 0 || alt === home) break;
        r = await fetchText(alt);
      }
      pack.finalUrl = r.url; pack.httpStatus = r.status;
      if (r.ok && r.text) {
        const title = (r.text.match(/<title[^>]*>([^<]{0,200})/i) ?? [])[1]?.trim() ?? '';
        const desc = (r.text.match(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']{0,500})/i) ?? [])[1] ?? '';
        pack.htmlLang = (r.text.match(/<html[^>]+lang=["']([^"']+)/i) ?? [])[1] ?? null;
        pack.pages.push({ url: r.url, kind: 'home', title, description: desc, text: clean(r.text).slice(0, PAGE_CHARS) });
        pack.jsonLd.push(...jsonLd(r.text));
        for (const sp of pickSubpages(r.text, r.url)) {
          if (!(await allowed(sp.url).catch(() => true))) continue;
          await sleep(1000);
          const s = await fetchText(sp.url);
          if (!s.ok || !s.text) continue;
          pack.pages.push({ url: s.url, kind: 'sub', label: sp.label, title: (s.text.match(/<title[^>]*>([^<]{0,200})/i) ?? [])[1]?.trim() ?? '', text: clean(s.text).slice(0, PAGE_CHARS) });
          pack.jsonLd.push(...jsonLd(s.text));
        }
      } else pack.notes.push(`website fetch failed: ${r.status} ${r.error ?? ''}`.trim());
    } else pack.notes.push('robots.txt disallows fetching');
  } else pack.notes.push('no website known');
  if (c.wikidata) pack.wikipedia = await wikipedia(c.wikidata).catch(() => null);
  pack.jsonLd = pack.jsonLd.slice(0, 3);
  writeFileSync(`${OUT}/${fileName(id)}`, JSON.stringify(pack, null, 1) + '\n');
  console.log(`${String(++n).padStart(3)} ${pack.pages.length}p ${pack.wikipedia ? 'wiki ' : ''}${c.name}`);
}
