import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isLive } from '../lib/site';

// Compact index used by /search/. [type, title, url, subtitle, keywords]
export const GET: APIRoute = async () => {
  const [hotels, cats, dests, posts, exps] = await Promise.all([
    getCollection('hotels', isLive), getCollection('categories'), getCollection('destinations'),
    getCollection('blog', p => p.data.status !== 'draft'), getCollection('experiences'),
  ]);
  const rows = [
    ...hotels.map(h => ['Hotel', h.data.name, `/hotels/${h.slug}/`, `${h.data.destination}, ${h.data.country}`, [h.data.category, ...h.data.tags, ...h.data.bestFor].join(' ')]),
    ...cats.map(c => ['Category', c.data.title, `/categories/${c.slug}/`, c.data.tagline ?? '', c.data.description]),
    ...dests.map(d => ['Destination', d.data.name, `/destinations/${d.slug}/`, d.data.country ?? d.data.continent, d.data.continent]),
    ...posts.map(p => ['Guide', p.data.title, `/blog/${p.slug}/`, p.data.category, p.data.tags.join(' ')]),
    ...exps.map(e => ['Experience', e.data.title, `/experiences/${e.slug}/`, `${e.data.destination}, ${e.data.country}`, e.data.type]),
  ];
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
};
