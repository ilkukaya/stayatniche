import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://stayatniche.com';

function url(path: string, lastmod: string, priority: string, changefreq: string): string {
  return `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().split('T')[0];

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
        : today;
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

  const allUrls = [
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
