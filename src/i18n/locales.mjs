// Single source of truth for languages, URL segments and localized category slugs.
// English stays at the site root (unchanged URLs); other languages live under /<code>/.
// Plain .mjs so it can be imported by Astro pages, the rehype plugin and Node scripts.

export const DEFAULT_LOCALE = 'en';
export const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'nl'];
export const TRANSLATED = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

export const LOCALE_META = {
  en: { name: 'English', hreflang: 'en', og: 'en_US', intl: 'en-US' },
  de: { name: 'Deutsch', hreflang: 'de', og: 'de_DE', intl: 'de-DE' },
  fr: { name: 'Français', hreflang: 'fr', og: 'fr_FR', intl: 'fr-FR' },
  es: { name: 'Español', hreflang: 'es', og: 'es_ES', intl: 'es-ES' },
  it: { name: 'Italiano', hreflang: 'it', og: 'it_IT', intl: 'it-IT' },
  nl: { name: 'Nederlands', hreflang: 'nl', og: 'nl_NL', intl: 'nl-NL' },
};

// URL section segments per language (English = current site paths).
export const SEGMENTS = {
  en: { hotels: 'hotels', categories: 'categories', destinations: 'destinations', blog: 'blog', countries: 'countries', experiences: 'experiences', best: 'best', search: 'search', saved: 'saved', about: 'about', contact: 'contact', disclosure: 'disclosure', privacy: 'privacy', newsletter: 'newsletter', 'photo-credits': 'photo-credits', 'newsletter-success': 'newsletter-success' },
  de: { hotels: 'unterkuenfte', categories: 'kategorien', destinations: 'reiseziele', blog: 'ratgeber', countries: 'laender', experiences: 'erlebnisse', best: 'beste', search: 'suche', saved: 'merkliste', about: 'ueber-uns', contact: 'kontakt', disclosure: 'transparenz', privacy: 'datenschutz', newsletter: 'newsletter', 'photo-credits': 'bildnachweise', 'newsletter-success': 'danke' },
  fr: { hotels: 'hebergements', categories: 'categories', destinations: 'destinations', blog: 'guides', countries: 'pays', experiences: 'experiences', best: 'meilleurs', search: 'recherche', saved: 'favoris', about: 'a-propos', contact: 'contact', disclosure: 'transparence', privacy: 'confidentialite', newsletter: 'newsletter', 'photo-credits': 'credits-photos', 'newsletter-success': 'merci' },
  es: { hotels: 'alojamientos', categories: 'categorias', destinations: 'destinos', blog: 'guias', countries: 'paises', experiences: 'experiencias', best: 'mejores', search: 'buscar', saved: 'guardados', about: 'sobre-nosotros', contact: 'contacto', disclosure: 'transparencia', privacy: 'privacidad', newsletter: 'newsletter', 'photo-credits': 'creditos-fotos', 'newsletter-success': 'gracias' },
  it: { hotels: 'alloggi', categories: 'categorie', destinations: 'destinazioni', blog: 'guide', countries: 'paesi', experiences: 'esperienze', best: 'migliori', search: 'cerca', saved: 'preferiti', about: 'chi-siamo', contact: 'contatti', disclosure: 'trasparenza', privacy: 'privacy', newsletter: 'newsletter', 'photo-credits': 'crediti-foto', 'newsletter-success': 'grazie' },
  nl: { hotels: 'verblijven', categories: 'categorieen', destinations: 'bestemmingen', blog: 'gidsen', countries: 'landen', experiences: 'belevenissen', best: 'beste', search: 'zoeken', saved: 'bewaard', about: 'over-ons', contact: 'contact', disclosure: 'transparantie', privacy: 'privacy', newsletter: 'nieuwsbrief', 'photo-credits': 'fotoverantwoording', 'newsletter-success': 'bedankt' },
};

// Category names + URL slugs as people actually search for them in each language.
export const CATEGORY_I18N = {
  'treehouse-hotels': { de: ['Baumhaushotels', 'baumhaushotels'], fr: ['Cabanes dans les arbres', 'cabanes-dans-les-arbres'], es: ['Cabañas en los árboles', 'cabanas-en-los-arboles'], it: ['Case sugli alberi', 'case-sugli-alberi'], nl: ['Boomhutten', 'boomhutten'] },
  'cave-hotels': { de: ['Höhlenhotels', 'hoehlenhotels'], fr: ['Hôtels troglodytes', 'hotels-troglodytes'], es: ['Hoteles cueva', 'hoteles-cueva'], it: ['Hotel in grotta', 'hotel-in-grotta'], nl: ['Grothotels', 'grothotels'] },
  'underwater-rooms': { de: ['Unterwasserzimmer', 'unterwasserzimmer'], fr: ['Chambres sous-marines', 'chambres-sous-marines'], es: ['Habitaciones submarinas', 'habitaciones-submarinas'], it: ['Camere subacquee', 'camere-subacquee'], nl: ['Onderwaterkamers', 'onderwaterkamers'] },
  'castle-hotels': { de: ['Schlosshotels', 'schlosshotels'], fr: ['Châteaux-hôtels', 'chateaux-hotels'], es: ['Hoteles castillo', 'hoteles-castillo'], it: ['Hotel nei castelli', 'hotel-nei-castelli'], nl: ['Kasteelhotels', 'kasteelhotels'] },
  'floating-hotels': { de: ['Schwimmende Hotels', 'schwimmende-hotels'], fr: ['Hôtels flottants', 'hotels-flottants'], es: ['Hoteles flotantes', 'hoteles-flotantes'], it: ['Hotel galleggianti', 'hotel-galleggianti'], nl: ['Drijvende hotels', 'drijvende-hotels'] },
  'bubble-hotels': { de: ['Bubble-Hotels', 'bubble-hotels'], fr: ['Bulles transparentes', 'nuit-dans-une-bulle'], es: ['Hoteles burbuja', 'hoteles-burbuja'], it: ['Bolle trasparenti', 'dormire-in-una-bolla'], nl: ['Bubbelhotels', 'bubbelhotels'] },
  'cliffside-hotels': { de: ['Klippenhotels', 'klippenhotels'], fr: ['Hôtels à flanc de falaise', 'hotels-a-flanc-de-falaise'], es: ['Hoteles en acantilados', 'hoteles-en-acantilados'], it: ['Hotel a strapiombo', 'hotel-a-strapiombo'], nl: ['Klifhotels', 'klifhotels'] },
  'desert-camps': { de: ['Wüstencamps', 'wuestencamps'], fr: ['Camps dans le désert', 'camps-dans-le-desert'], es: ['Campamentos en el desierto', 'campamentos-en-el-desierto'], it: ['Campi nel deserto', 'campi-nel-deserto'], nl: ['Woestijnkampen', 'woestijnkampen'] },
  'jungle-lodges': { de: ['Dschungel-Lodges', 'dschungel-lodges'], fr: ['Lodges dans la jungle', 'lodges-dans-la-jungle'], es: ['Lodges en la selva', 'lodges-en-la-selva'], it: ['Lodge nella giungla', 'lodge-nella-giungla'], nl: ['Junglelodges', 'junglelodges'] },
  'ice-hotels': { de: ['Eishotels', 'eishotels'], fr: ['Hôtels de glace', 'hotels-de-glace'], es: ['Hoteles de hielo', 'hoteles-de-hielo'], it: ['Hotel di ghiaccio', 'hotel-di-ghiaccio'], nl: ['IJshotels', 'ijshotels'] },
  'safari-lodges': { de: ['Safari-Lodges', 'safari-lodges'], fr: ['Lodges de safari', 'lodges-de-safari'], es: ['Lodges de safari', 'lodges-de-safari'], it: ['Lodge per safari', 'lodge-safari'], nl: ['Safarilodges', 'safarilodges'] },
  'overwater-bungalows': { de: ['Wasserbungalows', 'wasserbungalows'], fr: ['Bungalows sur pilotis', 'bungalows-sur-pilotis'], es: ['Bungalós sobre el agua', 'bungalos-sobre-el-agua'], it: ['Bungalow sull’acqua', 'bungalow-sull-acqua'], nl: ['Overwaterbungalows', 'overwaterbungalows'] },
  'lighthouse-hotels': { de: ['Leuchtturmhotels', 'leuchtturmhotels'], fr: ['Dormir dans un phare', 'dormir-dans-un-phare'], es: ['Hoteles en faros', 'hoteles-en-faros'], it: ['Hotel nei fari', 'hotel-nei-fari'], nl: ['Vuurtorenhotels', 'vuurtorenhotels'] },
  'train-hotels': { de: ['Zughotels', 'zughotels'], fr: ['Trains-hôtels', 'trains-hotels'], es: ['Hoteles en trenes', 'hoteles-en-trenes'], it: ['Hotel nei treni', 'hotel-nei-treni'], nl: ['Treinhotels', 'treinhotels'] },
};

/** Localized category slug (English slug for 'en' or unknown). */
export function categorySlug(locale, slug) {
  return (locale !== 'en' && CATEGORY_I18N[slug]?.[locale]?.[1]) || slug;
}
/** Localized category display name, or null when English/unknown. */
export function categoryName(locale, slug) {
  return (locale !== 'en' && CATEGORY_I18N[slug]?.[locale]?.[0]) || null;
}

/**
 * Build a site path for a locale. `kind` is a SEGMENTS key or 'home'.
 * Category slugs are localized automatically; other slugs stay as in English.
 */
export function localePath(locale, kind, slug) {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  if (kind === 'home') return `${prefix}/`;
  const seg = SEGMENTS[locale]?.[kind] ?? SEGMENTS.en[kind] ?? kind;
  if (!slug) return `${prefix}/${seg}/`;
  const s = kind === 'categories' ? categorySlug(locale, slug) : slug;
  return `${prefix}/${seg}/${s}/`;
}

/** Map an English internal path (e.g. "/categories/cave-hotels/#x") to its localized equivalent. */
export function localizeHref(locale, href) {
  if (locale === DEFAULT_LOCALE || !href || !href.startsWith('/') || href.startsWith('//')) return href;
  const m = href.match(/^\/([^/?#]*)\/?([^/?#]*)\/?([?#].*)?$/);
  if (!m) return href;
  const [, seg, slug, tail = ''] = m;
  if (!seg) return `/${locale}/${tail}`;
  if (!(seg in SEGMENTS.en)) return href; // images, files, feeds…
  return localePath(locale, seg, slug || undefined) + tail;
}
