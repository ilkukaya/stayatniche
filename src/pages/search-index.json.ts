import type { APIRoute } from 'astro';
import { searchRows } from '../i18n/searchIndex';

// Compact index used by /search/. [type, title, url, subtitle, keywords]
export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await searchRows('en')), { headers: { 'Content-Type': 'application/json' } });
