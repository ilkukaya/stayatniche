import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { LOCALES, LOCALE_META, type Locale } from '../i18n';
import { localized, entryAlternates, allAlternates, type Col } from '../i18n/content';
import { countryGroups, bestGroups, roundupAlternates } from '../i18n/roundups';

const SITE = 'https://stayatniche.com';
type Alt = { locale: string; href: string };
type Group = { alts: Alt[]; lastmod?: string; priority: string; changefreq: string };

const day = (d?: Date | string) => (d ? new Date(d).toISOString().split('T')[0] : undefined);

// Each group is one page in all the languages it exists in. Every language version gets its own
// <url> with the full set of hreflang alternates (+ x-default = English), as Google recommends.
function render(g: Group) {
  const links = g.alts.length > 1
    ? [...g.alts.map(a => `    <xhtml:link rel="alternate" hreflang="${LOCALE_META[a.locale as Locale].hreflang}" href="${SITE}${a.href}"/>`),
       ...(g.alts.some(a => a.locale === 'en') ? [`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${g.alts.find(a => a.locale === 'en')!.href}"/>`] : [])].join('\n')
    : '';
  return g.alts.map(a => `  <url>
    <loc>${SITE}${a.href}</loc>${g.lastmod ? `\n    <lastmod>${g.lastmod}</lastmod>` : ''}
    <changefreq>${g.changefreq}</changefreq>
    <priority>${a.locale === 'en' ? g.priority : (Number(g.priority) - 0.1).toFixed(1)}</priority>${links ? '\n' + links : ''}
  </url>`).join('\n');
}

export const GET: APIRoute = async () => {
  const groups: Group[] = [];
  const pages = await getCollection('pages');

  for (const [kind, priority, changefreq] of [
    ['home', '1.0', 'daily'], ['categories', '0.9', 'weekly'], ['hotels', '0.9', 'weekly'], ['blog', '0.8', 'daily'],
    ['destinations', '0.8', 'weekly'], ['experiences', '0.7', 'weekly'], ['countries', '0.6', 'weekly'],
    ['newsletter', '0.3', 'monthly'], ['contact', '0.4', 'monthly'],
  ] as const) groups.push({ alts: allAlternates(kind), priority, changefreq });

  for (const name of ['about', 'disclosure', 'privacy']) {
    const alts = (LOCALES as Locale[]).filter(l => pages.some(p => p.slug === `${l}/${name}`)).map(l => ({ locale: l, href: allAlternates(name).find(a => a.locale === l)!.href }));
    groups.push({ alts, priority: name === 'about' ? '0.5' : '0.3', changefreq: 'monthly' });
  }

  const entries: [Col, string, string, string][] = [
    ['categories', 'categories', '0.9', 'weekly'], ['hotels', 'hotels', '0.8', 'monthly'], ['blog', 'blog', '0.7', 'monthly'],
    ['destinations', 'destinations', '0.6', 'monthly'], ['experiences', 'experiences', '0.6', 'monthly'],
  ];
  for (const [col, kind, priority, changefreq] of entries) {
    for (const e of await localized(col, 'en')) {
      const d: any = e.data;
      groups.push({ alts: await entryAlternates(col, kind, e.slug), lastmod: day(d.updatedDate ?? d.publishedDate), priority, changefreq });
    }
  }

  for (const g of await countryGroups('en')) groups.push({ alts: await roundupAlternates('countries', g.country), priority: '0.7', changefreq: 'weekly' });
  for (const g of await bestGroups('en')) groups.push({ alts: await roundupAlternates('best', g.country, g.cat), priority: '0.7', changefreq: 'weekly' });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${groups.filter(g => g.alts.length).map(render).join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
