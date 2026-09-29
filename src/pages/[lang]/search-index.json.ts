import type { APIRoute } from 'astro';
import { TRANSLATED, type Locale } from '../../i18n';
import { searchRows } from '../../i18n/searchIndex';

export function getStaticPaths() {
  return (TRANSLATED as Locale[]).map(lang => ({ params: { lang } }));
}
export const GET: APIRoute = async ({ params }) =>
  new Response(JSON.stringify(await searchRows(params.lang as Locale)), { headers: { 'Content-Type': 'application/json' } });
