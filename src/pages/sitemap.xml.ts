import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://stayatniche.com';

function url(path: string, lastmod?: string): string {
  return `  <url>
    <loc>${SITE}${path}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
  </url>`;
}

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().split('T')[0];

  const hotels = await getCollection('hotels', h =>
    h.data.status !== 'draft' && h.data.status !== 'archived'
  );
  const categories  = await getCollection('categories');
  const posts       = await getCollection('blog', p => p.data.status !== 'draft');
  const destinations = await getCollection('destinations');
  const experiences = await getCollection('experiences');

  const staticPages = [
    url('/', today),
    url('/categories/', today),
    url('/blog/', today),
    url('/destinations/', today),
    url('/experiences/', today),
    url('/about/', today),
    url('/contact/', today),
    url('/disclosure/', today),
    url('/privacy/', today),
  ];

  const hotelPages = hotels.map(h =>
    url(`/hotels/${h.slug}/`,
      h.data.updatedDate
        ? new Date(h.data.updatedDate).toISOString().split('T')[0]
        : h.data.publishedDate
          ? new Date(h.data.publishedDate).toISOString().split('T')[0]
          : today
    )
  );

  const categoryPages = categories.map(c => url(`/categories/${c.slug}/`, today));

  const blogPages = posts.map(p =>
    url(`/blog/${p.slug}/`,
      p.data.updatedDate
        ? new Date(p.data.updatedDate).toISOString().split('T')[0]
        : new Date(p.data.publishedDate).toISOString().split('T')[0]
    )
  );

  const destPages = destinations.map(d => url(`/destinations/${d.slug}/`, today));
  const expPages  = experiences.map(e => url(`/experiences/${e.slug}/`, today));

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
