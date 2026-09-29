/**
 * i18n runtime helpers: locale detection, dictionaries, localized paths, names and formatting.
 * English is the source language and lives at the site root; see ./locales.mjs.
 */
import { DEFAULT_LOCALE, LOCALES, TRANSLATED, LOCALE_META, SEGMENTS, CATEGORY_I18N, localePath, localizeHref, categoryName, categorySlug } from './locales.mjs';
import en from './ui/en';
import de from './ui/de';
import fr from './ui/fr';
import es from './ui/es';
import it from './ui/it';
import nl from './ui/nl';

export type Locale = 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl';
export type Dict = typeof en;
export { DEFAULT_LOCALE, LOCALES, TRANSLATED, LOCALE_META, SEGMENTS, CATEGORY_I18N, localePath, localizeHref, categoryName, categorySlug };

const DICTS: Record<Locale, Dict> = { en, de, fr, es, it, nl };

/** Locale from a URL path (first segment), English otherwise. */
export function getLocale(url: URL | string): Locale {
  const p = typeof url === 'string' ? url : url.pathname;
  const seg = p.split('/')[1] as Locale;
  return (TRANSLATED as string[]).includes(seg) ? seg : 'en';
}

// ── Country / continent names ────────────────────────────────────────────
const EN_REGION = new Intl.DisplayNames(['en'], { type: 'region' });
const CODE_BY_NAME: Record<string, string> = {};
for (let a = 65; a < 91; a++) for (let b = 65; b < 91; b++) {
  const c = String.fromCharCode(a, b);
  try { const n = EN_REGION.of(c); if (n && n !== c) CODE_BY_NAME[n.toLowerCase()] = c; } catch { /* not a region */ }
}
Object.assign(CODE_BY_NAME, { usa: 'US', 'united states': 'US', uk: 'GB', 'united kingdom': 'GB', uae: 'AE', turkey: 'TR', 'st. lucia': 'LC', 'saint lucia': 'LC', 'czech republic': 'CZ', 'ivory coast': 'CI' });
const EXTRA: Record<string, Partial<Record<Locale, string>>> = {
  england: { de: 'England', fr: 'Angleterre', es: 'Inglaterra', it: 'Inghilterra', nl: 'Engeland' },
  scotland: { de: 'Schottland', fr: 'Écosse', es: 'Escocia', it: 'Scozia', nl: 'Schotland' },
  wales: { de: 'Wales', fr: 'pays de Galles', es: 'Gales', it: 'Galles', nl: 'Wales' },
  borneo: { de: 'Borneo', fr: 'Bornéo', es: 'Borneo', it: 'Borneo', nl: 'Borneo' },
  multiple: { de: 'Mehrere Länder', fr: 'Plusieurs pays', es: 'Varios países', it: 'Più paesi', nl: 'Meerdere landen' },
};
const OVERRIDE: Partial<Record<Locale, Record<string, string>>> = { de: { US: 'USA' } };
const regionCache: Partial<Record<Locale, Intl.DisplayNames>> = {};

function one(locale: Locale, name: string): string {
  const key = name.trim().toLowerCase();
  if (EXTRA[key]?.[locale]) return EXTRA[key][locale]!;
  const code = CODE_BY_NAME[key];
  if (!code) return name.trim();
  if (OVERRIDE[locale]?.[code]) return OVERRIDE[locale]![code];
  const dn = (regionCache[locale] ??= new Intl.DisplayNames([locale], { type: 'region' }));
  return dn.of(code) ?? name.trim();
}
/** Localized country name; handles "Chile/Argentina" and "Malaysia (Borneo)". */
export function countryName(locale: Locale, name: string): string {
  if (locale === 'en' || !name) return name;
  const m = name.match(/^(.*?)\s*\((.+)\)$/);
  if (m) return `${countryName(locale, m[1])} (${one(locale, m[2])})`;
  return name.split('/').map((p) => one(locale, p)).join(' / ');
}

const CONTINENTS: Record<string, Record<Locale, string>> = {
  europe: { en: 'Europe', de: 'Europa', fr: 'Europe', es: 'Europa', it: 'Europa', nl: 'Europa' },
  africa: { en: 'Africa', de: 'Afrika', fr: 'Afrique', es: 'África', it: 'Africa', nl: 'Afrika' },
  asia: { en: 'Asia', de: 'Asien', fr: 'Asie', es: 'Asia', it: 'Asia', nl: 'Azië' },
  'north-america': { en: 'North America', de: 'Nordamerika', fr: 'Amérique du Nord', es: 'Norteamérica', it: 'Nord America', nl: 'Noord-Amerika' },
  'south-america': { en: 'South America', de: 'Südamerika', fr: 'Amérique du Sud', es: 'Sudamérica', it: 'Sud America', nl: 'Zuid-Amerika' },
  'central-america': { en: 'Central America', de: 'Mittelamerika', fr: 'Amérique centrale', es: 'Centroamérica', it: 'America centrale', nl: 'Midden-Amerika' },
  oceania: { en: 'Oceania', de: 'Ozeanien', fr: 'Océanie', es: 'Oceanía', it: 'Oceania', nl: 'Oceanië' },
  'middle-east': { en: 'Middle East', de: 'Naher Osten', fr: 'Moyen-Orient', es: 'Oriente Medio', it: 'Medio Oriente', nl: 'Midden-Oosten' },
  antarctica: { en: 'Antarctica', de: 'Antarktis', fr: 'Antarctique', es: 'Antártida', it: 'Antartide', nl: 'Antarctica' },
};
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function continentName(locale: Locale, nameOrSlug: string): string {
  const k = slugify(nameOrSlug);
  return CONTINENTS[k]?.[locale] ?? nameOrSlug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

// ── Helper bundle for views/components ──────────────────────────────────
export function i18n(locale: Locale) {
  const t = DICTS[locale] ?? en;
  const intl = LOCALE_META[locale].intl;
  const nf = new Intl.NumberFormat(intl);
  return {
    locale,
    t,
    intl,
    /** Link to a section/entry in this locale. */
    path: (kind: string, slug?: string) => localePath(locale, kind, slug),
    /** Localize an English internal href ("/hotels/?type=x", "/categories/cave-hotels/"). */
    href: (enHref: string) => localizeHref(locale, enHref),
    country: (name: string) => countryName(locale, name),
    continent: (name: string) => continentName(locale, name),
    /** Category display name: glossary name for translations, English title otherwise. */
    cat: (slug: string, enTitle: string) => categoryName(locale, slug) ?? enTitle,
    num: (n: number) => nf.format(n),
    /** USD amount written the local way (amount is never converted). */
    usd: (n: number) => t.fmt.usd(nf.format(n)),
    /** "$300 - $600" → the local way of writing a USD range; other strings unchanged. */
    range: (r: string) => {
      if (locale === 'en' || !r) return r;
      const n = [...r.matchAll(/\$\s?([\d,.]+)/g)].map((m) => Number(m[1].replace(/,/g, '')));
      if (n.length >= 2) return t.fmt.usdRange(nf.format(n[0]), nf.format(n[1]));
      if (n.length === 1) return /^\s*from/i.test(r) ? `${t.card.from} ${t.fmt.usd(nf.format(n[0]))}` : t.fmt.usd(nf.format(n[0]));
      return r;
    },
    date: (d: Date | string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) => new Date(d).toLocaleDateString(intl, opts),
  };
}
export type I18n = ReturnType<typeof i18n>;
