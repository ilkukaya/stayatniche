/**
 * Localized content: merges src/content/translations/<lang>/<collection>/<slug>.md over the
 * English entry. For a translated locale only entries that HAVE a translation are returned, so a
 * page is never generated with English text under /de/, /fr/ …
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { LOCALES, localePath, type Locale } from './index';
import { isLive } from '../lib/site';

export type Col = 'hotels' | 'categories' | 'destinations' | 'blog' | 'experiences';
type Tr = CollectionEntry<'translations'>;
/** `en` keeps the English frontmatter, for matching by names across collections. */
export type Localized<C extends Col> = CollectionEntry<C> & { locale: Locale; translated: boolean; en: CollectionEntry<C>['data'] };

let trIndex: Map<string, Tr> | null = null;
async function index() {
  if (!trIndex) {
    trIndex = new Map();
    for (const t of await getCollection('translations')) trIndex.set(t.slug, t); // slug = "de/hotels/treehotel-sweden"
  }
  return trIndex;
}
export async function translationOf(locale: Locale, col: Col, slug: string) {
  if (locale === 'en') return null;
  return (await index()).get(`${locale}/${col}/${slug}`) ?? null;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
function merge(base: Record<string, any>, over: Record<string, any>) {
  const out: Record<string, any> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (k === 'source' || v == null) continue;
    out[k] = isObj(v) && isObj(base[k]) ? { ...base[k], ...v } : v;
  }
  return out;
}

const liveFilter: Record<Col, (e: any) => boolean> = {
  hotels: isLive,
  blog: (p) => p.data.status !== 'draft',
  categories: () => true,
  destinations: () => true,
  experiences: () => true,
};

/** Entries of a collection for a locale (translated ones only, for non-English). */
export async function localized<C extends Col>(col: C, locale: Locale): Promise<Localized<C>[]> {
  const entries = (await getCollection(col, liveFilter[col] as any)) as CollectionEntry<C>[];
  if (locale === 'en') return entries.map((e) => Object.assign(e, { locale, translated: true, en: e.data }) as Localized<C>);
  const idx = await index();
  const out: Localized<C>[] = [];
  for (const e of entries) {
    const tr = idx.get(`${locale}/${col}/${e.slug}`);
    if (!tr) continue;
    out.push({ ...e, data: merge(e.data as any, tr.data as any), body: tr.body, render: tr.render.bind(tr), locale, translated: true, en: e.data } as unknown as Localized<C>);
  }
  return out;
}

/** Locales in which a given entry exists (English always). */
export async function localesOf(col: Col, slug: string): Promise<Locale[]> {
  const idx = await index();
  return (LOCALES as Locale[]).filter((l) => l === 'en' || idx.has(`${l}/${col}/${slug}`));
}

/** hreflang alternates for an entry page. */
export async function entryAlternates(col: Col, kind: string, slug: string) {
  return (await localesOf(col, slug)).map((l) => ({ locale: l, href: localePath(l, kind, slug) }));
}
/** hreflang alternates for a page that exists in every locale (home, listings, static pages). */
export function allAlternates(kind: string, slug?: string) {
  return (LOCALES as Locale[]).map((l) => ({ locale: l, href: localePath(l, kind, slug) }));
}
