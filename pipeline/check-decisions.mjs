/**
 * Checks Haiku decisions against their evidence packs: every quote must appear in the evidence
 * text (whitespace/case-insensitive), otherwise the field is dropped. Then assigns a verdict
 * (accepted / needs_review / rejected) and writes a report next to the decisions.
 * Usage: node pipeline/check-decisions.mjs <decisions dir> [evidence inbox dir]
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { loadQueue, INBOX as DEFAULT_INBOX } from './lib.mjs';

const dir = process.argv[2];
if (!dir) { console.error('usage: node pipeline/check-decisions.mjs <decisions dir> [inbox]'); process.exit(1); }
const INBOX = process.argv[3] ?? DEFAULT_INBOX;
const q = loadQueue();
const hostOf = (u) => { try { return new URL(/^https?:/.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch { return null; } };
// Hosts that list several distinct properties, so a shared host is not a duplicate.
const MULTI = /(^|\.)(nationaltrust\.org\.uk|landmarktrust\.org\.uk|booking\.com|airbnb\.[a-z.]+|facebook\.com|instagram\.com|hilton\.com|marriott\.com|hyatt\.com|ihg\.com|accor\.com|wixsite\.com|nps\.gov|cloudbeds\.com)$/i;
const squash = (s = '') => s.toLowerCase().normalize('NFKC').replace(/[’‘`´]/g, "'").replace(/[“”«»„]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const fileName = (id) => id.replace(/[^a-z0-9]+/gi, '_') + '.json';

const decisions = readdirSync(dir).filter(f => /^batch.*\.json$/.test(f)).flatMap(f => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));
const rows = []; const stats = { quotes: 0, quotesOk: 0 };

for (const d of decisions) {
  const path = `${INBOX}/${fileName(d.id)}`;
  if (!existsSync(path)) { console.log(`no evidence for ${d.id}`); continue; }
  const ev = JSON.parse(readFileSync(path, 'utf8'));
  const hay = squash([ev.name, ev.wikidataDescription, ev.wikipedia?.extract, ...ev.pages.flatMap(p => [p.title, p.description, p.text])].filter(Boolean).join('\n'));
  const ok = (quote) => { if (!quote) return false; stats.quotes++; const hit = hay.includes(squash(quote)); if (hit) stats.quotesOk++; return hit; };
  const dropped = [];
  const categoryQuoteOk = d.category_quote ? ok(d.category_quote) : false;
  if (d.category_quote && !categoryQuoteOk) dropped.push('category_quote');
  for (const k of ['amenities', 'highlights']) {
    const before = d[k]?.length ?? 0;
    d[k] = (d[k] ?? []).filter(x => ok(x.quote));
    if (d[k].length < before) dropped.push(`${k} ${before - d[k].length}/${before}`);
  }
  for (const k of ['room_count', 'season', 'access']) if (d[k] && !ok(d[k].quote)) { dropped.push(k); d[k] = null; }

  const blocking = (d.red_flags ?? []).filter(f => /listing_site|for_sale|event_venue_only|restaurant_only|museum|private_residence|tour_operator/.test(f));
  let verdict;
  if (!d.is_lodging || d.operating_status === 'closed' || d.niche_scope === 'name_only' || (!d.category && !d.other_niche_type) || blocking.length) verdict = 'rejected';
  else if (d.category && categoryQuoteOk && d.confidence >= 0.8 && ['whole_property', 'some_units'].includes(d.niche_scope) && d.operating_status !== 'unknown') verdict = d.niche_scope === 'some_units' ? 'needs_review' : 'accepted';
  else verdict = 'needs_review';
  // No page text and nothing that disproves it: fetch again later instead of rejecting on the name alone.
  if (verdict !== 'accepted' && !ev.pages.length && !ev.wikipedia && d.is_lodging !== false) verdict = 'no_evidence';
  const c = q[d.id] ?? {};
  let host = null; try { host = new URL(ev.finalUrl ?? ev.website).hostname.replace(/^www\./, ''); } catch {}
  rows.push({ d, verdict, dropped, host, regex: c.status, regexCat: c.category ?? c.categories?.[0], name: ev.name, country: ev.country, pages: ev.pages.length });
}
// Several map entries for one property (e.g. each bungalow of a resort): keep the first, mark the rest.
const seenHost = new Map();
// Properties already waiting for review or published count as seen.
for (const c of Object.values(q)) if (['classified', 'approved', 'published'].includes(c.status)) { const h = hostOf(c.website ?? ''); if (h && !MULTI.test(h)) seenHost.set(h, c.id); }
for (const r of rows.filter(r => r.host && ['accepted', 'needs_review'].includes(r.verdict))) {
  if (MULTI.test(r.host)) continue;
  if (seenHost.has(r.host) && seenHost.get(r.host) !== r.d.id) { r.verdict = 'duplicate'; r.dropped.push(`same site as ${seenHost.get(r.host)}`); } else seenHost.set(r.host, r.d.id);
}

const order = { accepted: 0, needs_review: 1, no_evidence: 2, duplicate: 3, rejected: 4 };
rows.sort((a, b) => order[a.verdict] - order[b.verdict] || (a.d.category ?? 'zz').localeCompare(b.d.category ?? 'zz'));
const count = (f) => rows.filter(f).length;
const cell = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');
const md = [
  '# Haiku classification: sample report', '',
  `Candidates: ${rows.length}. ${Object.keys(order).map(v => `${v}: ${count(r => r.verdict === v)}`).join(', ')}.`,
  `Quotes checked against evidence: ${stats.quotesOk}/${stats.quotes} found verbatim.`, '',
  '## Regex status vs Haiku verdict', '',
  `| Regex \\ Haiku | ${Object.keys(order).join(' | ')} |`, `|---|${Object.keys(order).map(() => '---').join('|')}|`,
  ...['verified', 'weak', 'rejected'].map(s => `| ${s} | ${Object.keys(order).map(v => count(r => r.regex === s && r.verdict === v)).join(' | ')} |`), '',
  '## Decisions', '',
  '| Verdict | Name | Country | Regex guess | Haiku category | Scope | Conf. | Pages | What is unusual / reason | Dropped quotes |', '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.verdict} | ${cell(r.name)} | ${cell(r.country)} | ${r.regexCat} (${r.regex}) | ${r.d.category ?? r.d.other_niche_type ?? '–'} | ${r.d.niche_scope} | ${r.d.confidence} | ${r.pages} | ${cell(r.d.niche_feature ?? r.d.reason)} | ${r.dropped.join(', ')} |`), '',
];
writeFileSync(`${dir}/REPORT.md`, md.join('\n'));
writeFileSync(`${dir}/checked.json`, JSON.stringify(rows.map(r => ({ ...r.d, verdict: r.verdict, dropped: r.dropped })), null, 1) + '\n');
console.log(md.slice(0, 12).join('\n'));
