import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { slugify } from '../lib/site';

const SITE = 'https://stayatniche.com';

function url(path: string, lastmod: string | undefined, priority: string, changefreq: string): string {
  return `  <url>
    <loc>${SITE}${path}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const GET: APIRoute = async () => {
  // Google ignores lastmod if it is always "today", so only emit real dates.
  const today = undefined as string | undefined;

  const hotels = await getCollection('hotels', h =>
    h.data.status !== 'draft' && h.data.status !== 'archived'
  );
  const categories   = await getCollection('categories');
  const posts        = await getCollection('blog', p => p.data.status !== 'draft');
  const destinations = await getCollection('destinations');
  const experiences  = await getCollection('experiences');

  const staticPages = [
    url('/',              today, '1.0', 'daily'),
    url('/categories/',   today, '0.9', 'weekly'),
    url('/hotels/',       today, '0.9', 'weekly'),
    url('/blog/',         today, '0.8', 'daily'),
    url('/destinations/', today, '0.8', 'weekly'),
    url('/experiences/',  today, '0.7', 'weekly'),
    url('/search/',       today, '0.4', 'monthly'),
    url('/newsletter/',   today, '0.3', 'monthly'),
    url('/about/',        today, '0.5', 'monthly'),
    url('/contact/',      today, '0.4', 'monthly'),
    url('/disclosure/',   today, '0.3', 'monthly'),
    url('/privacy/',      today, '0.3', 'monthly'),
  ];

  const hotelPages = hotels.map(h => {
    const lastmod = h.data.updatedDate
      ? new Date(h.data.updatedDate).toISOString().split('T')[0]
      : h.data.publishedDate
        ? new Date(h.data.publishedDate).toISOString().split('T')[0]
        : undefined;
    return url(`/hotels/${h.slug}/`, lastmod, '0.8', 'monthly');
  });

  const categoryPages = categories.map(c => url(`/categories/${c.slug}/`, today, '0.9', 'weekly'));

  const blogPages = posts.map(p => {
    const lastmod = p.data.updatedDate
      ? new Date(p.data.updatedDate).toISOString().split('T')[0]
      : new Date(p.data.publishedDate).toISOString().split('T')[0];
    return url(`/blog/${p.slug}/`, lastmod, '0.7', 'monthly');
  });

  const destPages = destinations.map(d => url(`/destinations/${d.slug}/`, today, '0.6', 'monthly'));
  const expPages  = experiences.map(e => url(`/experiences/${e.slug}/`,   today, '0.6', 'monthly'));

  const groups = new Map<string, number>(); const countries = new Map<string, number>();
  for (const h of hotels) {
    groups.set(`${h.data.category}|${h.data.country}`, (groups.get(`${h.data.category}|${h.data.country}`) ?? 0) + 1);
    countries.set(h.data.country, (countries.get(h.data.country) ?? 0) + 1);
  }
  const roundups = [
    ...[...countries].filter(([, n]) => n >= 2).map(([c]) => url(`/countries/${slugify(c)}/`, today, '0.7', 'weekly')),
    ...[...groups].filter(([, n]) => n >= 2).map(([k]) => { const [cat, c] = k.split('|'); return url(`/best/${cat}-in-${slugify(c)}/`, today, '0.7', 'weekly'); }),
    url('/countries/', today, '0.6', 'weekly'),
  ];

  const allUrls = [
    ...roundups,
    ...staticPages,
    ...categoryPages,
    ...hotelPages,
    ...blogPages,
    ...destPages,
    ...expPages,
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
