/** Compact search index per language: [type, title, url, subtitle, keywords]. */
import { i18n, type Locale } from './index';
import { localized } from './content';

export async function searchRows(locale: Locale) {
  const L = i18n(locale);
  const T = L.t.search.types;
  const [hotels, cats, dests, posts, exps] = await Promise.all([
    localized('hotels', locale), localized('categories', locale), localized('destinations', locale),
    localized('blog', locale), localized('experiences', locale),
  ]);
  return [
    ...hotels.map(h => [T.hotel, h.data.name, L.path('hotels', h.slug), `${h.data.destination}, ${L.country(h.en.country)}`, [h.data.category, L.cat(h.data.category, ''), h.en.country, ...h.data.tags, ...h.data.bestFor].join(' ')]),
    ...cats.map(c => [T.category, L.cat(c.slug, c.data.title), L.path('categories', c.slug), c.data.tagline ?? '', `${c.data.description} ${c.en.title}`]),
    ...dests.map(d => [T.destination, d.data.name, L.path('destinations', d.slug), d.en.country ? L.country(d.en.country) : L.continent(d.en.continent), `${L.continent(d.en.continent)} ${d.en.name}`]),
    ...posts.map(p => [T.guide, p.data.title, L.path('blog', p.slug), L.t.blog.kinds[p.data.category] ?? p.data.category, p.data.tags.join(' ')]),
    ...exps.map(e => [T.experience, e.data.title, L.path('experiences', e.slug), `${e.data.destination}, ${L.country(e.en.country)}`, e.data.type]),
  ];
}
