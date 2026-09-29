import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE, isLive } from '../lib/site';

// Machine-readable full index for LLM crawlers (GEO). Every entity, one line, with facts.
export const GET: APIRoute = async () => {
  const [hotels, cats, dests, posts] = await Promise.all([
    getCollection('hotels', isLive), getCollection('categories'), getCollection('destinations'),
    getCollection('blog', p => p.data.status !== 'draft'),
  ]);
  const out: string[] = [
    '# StayAtNiche: full content index',
    '',
    '> Curated guide to unusual hotels worldwide. Affiliate-supported; editorial scores are ours, not aggregated guest reviews.',
    '',
    '## Categories',
    ...cats.map(c => `- [${c.data.title}](${SITE}/categories/${c.slug}/): ${c.data.description}`),
    '',
    '## Hotels',
    ...hotels.map(h => `- [${h.data.name}](${SITE}/hotels/${h.slug}/) (${h.data.destination}, ${h.data.country}; ${h.data.category}; ${h.data.priceRange}/night): ${h.data.description}`),
    '',
    '## Destinations',
    ...dests.map(d => `- [${d.data.name}](${SITE}/destinations/${d.slug}/): ${d.data.description}`),
    '',
    '## Guides',
    ...posts.map(p => `- [${p.data.title}](${SITE}/blog/${p.slug}/): ${p.data.excerpt}`),
    '',
  ];
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
