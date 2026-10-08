/**
 * Checks Haiku decisions against their evidence packs: every quote must appear in the evidence
 * text (whitespace/case-insensitive), otherwise the field is dropped. Then assigns a verdict
 * (accepted / needs_review / rejected) and writes a report next to the decisions.
 * Usage: node pipeline/check-decisions.mjs <decisions dir>
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { loadQueue } from './lib.mjs';

const dir = process.argv[2] ?? 'data/pipeline/decisions/sample';
const INBOX = 'data/pipeline/inbox';
const q = loadQueue();
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
  const c = q[d.id] ?? {};
  rows.push({ d, verdict, dropped, regex: c.status, regexCat: c.category ?? c.categories?.[0], name: ev.name, country: ev.country, pages: ev.pages.length });
}

const order = { accepted: 0, needs_review: 1, rejected: 2 };
rows.sort((a, b) => order[a.verdict] - order[b.verdict] || (a.d.category ?? 'zz').localeCompare(b.d.category ?? 'zz'));
const count = (f) => rows.filter(f).length;
const cell = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');
const md = [
  '# Haiku classification: sample report', '',
  `Candidates: ${rows.length}. Accepted: ${count(r => r.verdict === 'accepted')}, needs review: ${count(r => r.verdict === 'needs_review')}, rejected: ${count(r => r.verdict === 'rejected')}.`,
  `Quotes checked against evidence: ${stats.quotesOk}/${stats.quotes} found verbatim.`, '',
  '## Regex status vs Haiku verdict', '',
  '| Regex \\ Haiku | accepted | needs_review | rejected |', '|---|---|---|---|',
  ...['verified', 'weak', 'rejected'].map(s => `| ${s} | ${['accepted', 'needs_review', 'rejected'].map(v => count(r => r.regex === s && r.verdict === v)).join(' | ')} |`), '',
  '## Decisions', '',
  '| Verdict | Name | Country | Regex guess | Haiku category | Scope | Conf. | Pages | What is unusual / reason | Dropped quotes |', '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.verdict} | ${cell(r.name)} | ${cell(r.country)} | ${r.regexCat} (${r.regex}) | ${r.d.category ?? r.d.other_niche_type ?? '–'} | ${r.d.niche_scope} | ${r.d.confidence} | ${r.pages} | ${cell(r.d.niche_feature ?? r.d.reason)} | ${r.dropped.join(', ')} |`), '',
];
writeFileSync(`${dir}/REPORT.md`, md.join('\n'));
writeFileSync(`${dir}/checked.json`, JSON.stringify(rows.map(r => ({ ...r.d, verdict: r.verdict, dropped: r.dropped })), null, 1) + '\n');
console.log(md.slice(0, 12).join('\n'));
