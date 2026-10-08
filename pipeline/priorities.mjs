/**
 * Work order for evidence + classification. The unit of work is a cell (category × country):
 * the site builds a "Best <category> in <country>" page as soon as a cell has two published
 * stays, so finishing whole cells beats scattering single hotels. Cells listed here go first
 * (strong search demand); every other cell follows, largest first.
 */
import { CATEGORIES } from './categories.mjs';
import { catOf } from './lib.mjs';

export const CELLS = [
  ['cave-hotels', 'Turkey'],
  ['castle-hotels', 'United Kingdom'],
  ['castle-hotels', 'Italy'],
  ['safari-lodges', 'South Africa'],
  ['ice-hotels', 'Finland'], ['ice-hotels', 'Norway'], ['ice-hotels', 'Sweden'],
  ['safari-lodges', 'Tanzania'], ['safari-lodges', 'Namibia'], ['safari-lodges', 'Kenya'], ['safari-lodges', 'Botswana'],
  ['castle-hotels', 'Spain'], ['castle-hotels', 'Germany'], ['castle-hotels', 'Ireland'], ['castle-hotels', 'France'],
  ['lighthouse-hotels', 'United States'], ['lighthouse-hotels', 'France'], ['lighthouse-hotels', 'Norway'],
  ['treehouse-hotels', 'Germany'], ['treehouse-hotels', 'United States'], ['treehouse-hotels', 'France'],
  ['overwater-bungalows', 'Maldives'],
  ['bubble-hotels', 'France'],
  ['cave-hotels', 'Spain'], ['cave-hotels', 'Italy'], ['cave-hotels', 'Greece'],
  ['desert-camps', 'Morocco'], ['desert-camps', 'Jordan'],
  ['jungle-lodges', 'Costa Rica'], ['jungle-lodges', 'Peru'], ['jungle-lodges', 'Ecuador'],
];

const ALIAS = { 'Türkiye': 'Turkey', 'GB': 'United Kingdom', 'UK': 'United Kingdom', 'USA': 'United States', 'US': 'United States' };
export const countryOf = (c) => ALIAS[c.country] ?? c.country ?? null;
export const cellKey = (c) => `${catOf(c)}|${countryOf(c) ?? '?'}`;

const LISTED = new Map(CELLS.map(([cat, country], i) => [`${cat}|${country}`, i]));

/** Rank function for a queue: listed cells first, then the rest by size (largest first). */
export function cellRanker(queue) {
  const size = new Map();
  for (const c of Object.values(queue)) size.set(cellKey(c), (size.get(cellKey(c)) ?? 0) + 1);
  const rest = [...size.keys()].filter(k => !LISTED.has(k) && !k.endsWith('|?')).sort((a, b) => size.get(b) - size.get(a));
  const restRank = new Map(rest.map((k, i) => [k, CELLS.length + i]));
  return (c) => LISTED.get(cellKey(c)) ?? restRank.get(cellKey(c)) ?? 10000;
}

/** Name matches a category's exclude list (e.g. Polish "domek" for bubble-hotels). */
export const excludedName = (c) => !!CATEGORIES[catOf(c)]?.exclude?.test(c.name ?? '');

/** Ready for an evidence pack: not decided yet, has somewhere to read from, not fetched recently. */
export function needsEvidence(c, now = Date.now()) {
  if (!['new', 'verified', 'weak'].includes(c.status) || c.haiku || excludedName(c)) return false;
  if (!c.website && !c.wikidata) return false;
  return !c.lastEvidence || now - Date.parse(c.lastEvidence) > 30 * 86400000;
}
