/**
 * Image resolver.
 *
 * The repo ships with only a handful of real local images, but every hotel,
 * destination and category content file references a local /images/... path.
 * Rather than shipping placeholder greys, we map each piece of content to a
 * well-chosen Unsplash photo (served through the CDN the site already allows
 * in its CSP) so the experience stays visual even before cover images are
 * uploaded through the CMS.
 *
 * Priority order:
 *   1. External URL (http/https) → used as-is.
 *   2. Local /images path that exists in repo → used as-is.
 *   3. Explicit override in per-slug map.
 *   4. Category- or continent-themed fallback pool.
 */

// Real files present under public/images — anything else falls back.
const KNOWN_LOCAL_IMAGES = new Set<string>([
  '/images/2ad002fa-ae85-44cb-978b-8c0a7dd60e23.jpg',
  '/images/2bb49edc-807e-41d7-aba4-424940ca0a4d.jpg',
  '/images/6e7d5558-b366-467e-bb98-42494dae5374.jpg',
  '/images/d77685e2-39c7-4bf2-b3b8-fe9f4b56f0d6.jpg',
]);

// Tuned, landscape Unsplash images per category. All are long-form
// photographs with generous permissions; each URL is parameterised so the
// CDN resizes to the right dimensions at request time.
export const CATEGORY_IMAGES: Record<string, string> = {
  'treehouse-hotels':    'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=1200&q=80&auto=format&fit=crop',
  'cave-hotels':         'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=1200&q=80&auto=format&fit=crop',
  'underwater-rooms':    'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1200&q=80&auto=format&fit=crop',
  'castle-hotels':       'https://images.unsplash.com/photo-1533619239233-6280475a633a?w=1200&q=80&auto=format&fit=crop',
  'floating-hotels':     'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&auto=format&fit=crop',
  'bubble-hotels':       'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200&q=80&auto=format&fit=crop',
  'cliffside-hotels':    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80&auto=format&fit=crop',
  'desert-camps':        'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200&q=80&auto=format&fit=crop',
  'jungle-lodges':       'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80&auto=format&fit=crop',
  'ice-hotels':          'https://images.unsplash.com/photo-1548786811-dd6e453ccca7?w=1200&q=80&auto=format&fit=crop',
  'safari-lodges':       'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80&auto=format&fit=crop',
  'overwater-bungalows': 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=80&auto=format&fit=crop',
  'lighthouse-hotels':   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&auto=format&fit=crop',
  'train-hotels':        'https://images.unsplash.com/photo-1474487548417-781cb75f6c0b?w=1200&q=80&auto=format&fit=crop',
};

// Destination overrides for the most-visited spots. Keyed by slug or country.
export const DESTINATION_IMAGES: Record<string, string> = {
  'scotland':        'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&q=80&auto=format&fit=crop',
  'tuscany':         'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=80&auto=format&fit=crop',
  'japan':           'https://images.unsplash.com/photo-1528164344705-47542687000d?w=1200&q=80&auto=format&fit=crop',
  'japan-kyoto':     'https://images.unsplash.com/photo-1528164344705-47542687000d?w=1200&q=80&auto=format&fit=crop',
  'iceland':         'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=1200&q=80&auto=format&fit=crop',
  'norway':          'https://images.unsplash.com/photo-1520769945061-0a448c463865?w=1200&q=80&auto=format&fit=crop',
  'finland':         'https://images.unsplash.com/photo-1518157878289-dfd31006893f?w=1200&q=80&auto=format&fit=crop',
  'swedish-lapland': 'https://images.unsplash.com/photo-1548786811-dd6e453ccca7?w=1200&q=80&auto=format&fit=crop',
  'cappadocia':      'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=1200&q=80&auto=format&fit=crop',
  'turkey':          'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=1200&q=80&auto=format&fit=crop',
  'greece-santorini':'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80&auto=format&fit=crop',
  'maldives':        'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=80&auto=format&fit=crop',
  'bora-bora':       'https://images.unsplash.com/photo-1540541338537-3cfb4e9a5ab8?w=1200&q=80&auto=format&fit=crop',
  'french-polynesia':'https://images.unsplash.com/photo-1540541338537-3cfb4e9a5ab8?w=1200&q=80&auto=format&fit=crop',
  'bali-indonesia':  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80&auto=format&fit=crop',
  'indonesia-komodo':'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80&auto=format&fit=crop',
  'kenya':           'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80&auto=format&fit=crop',
  'tanzania':        'https://images.unsplash.com/photo-1504432842672-1a79f78e4084?w=1200&q=80&auto=format&fit=crop',
  'botswana':        'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80&auto=format&fit=crop',
  'south-africa-cape':'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200&q=80&auto=format&fit=crop',
  'namibia':         'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200&q=80&auto=format&fit=crop',
  'rwanda':          'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=1200&q=80&auto=format&fit=crop',
  'mozambique':      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&auto=format&fit=crop',
  'uganda':          'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=1200&q=80&auto=format&fit=crop',
  'ethiopia':        'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80&auto=format&fit=crop',
  'madagascar':      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80&auto=format&fit=crop',
  'zanzibar':        'https://images.unsplash.com/photo-1515896769750-31548aa180ed?w=1200&q=80&auto=format&fit=crop',
  'morocco-atlas':   'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=1200&q=80&auto=format&fit=crop',
  'jordan':          'https://images.unsplash.com/photo-1553993811-a2f41c31dc90?w=1200&q=80&auto=format&fit=crop',
  'israel':          'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=1200&q=80&auto=format&fit=crop',
  'oman':            'https://images.unsplash.com/photo-1589305338898-d8b8b8b8b8b8?w=1200&q=80&auto=format&fit=crop',
  'uae-dubai':       'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200&q=80&auto=format&fit=crop',
  'new-zealand-south-island': 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=1200&q=80&auto=format&fit=crop',
  'australia-outback': 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=1200&q=80&auto=format&fit=crop',
  'patagonia':       'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80&auto=format&fit=crop',
  'chile-atacama':   'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200&q=80&auto=format&fit=crop',
  'argentina-mendoza':'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=80&auto=format&fit=crop',
  'peru-amazon':     'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1200&q=80&auto=format&fit=crop',
  'brazil-amazon':   'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1200&q=80&auto=format&fit=crop',
  'ecuador-galapagos':'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80&auto=format&fit=crop',
  'ecuador-cloud-forest':'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80&auto=format&fit=crop',
  'colombia-cartagena':'https://images.unsplash.com/photo-1548248823-ce16a73b6d49?w=1200&q=80&auto=format&fit=crop',
  'costa-rica':      'https://images.unsplash.com/photo-1580749047043-67c10b1c6a52?w=1200&q=80&auto=format&fit=crop',
  'india-rajasthan': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&q=80&auto=format&fit=crop',
  'india-kerala':    'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&q=80&auto=format&fit=crop',
  'nepal':           'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=80&auto=format&fit=crop',
  'bhutan':          'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200&q=80&auto=format&fit=crop',
  'sri-lanka':       'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=1200&q=80&auto=format&fit=crop',
  'thailand-northern':'https://images.unsplash.com/photo-1528181304800-259b08848526?w=1200&q=80&auto=format&fit=crop',
  'cambodia':        'https://images.unsplash.com/photo-1589553416260-f586c8f1514f?w=1200&q=80&auto=format&fit=crop',
  'vietnam-halong':  'https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&q=80&auto=format&fit=crop',
  'laos-luang-prabang':'https://images.unsplash.com/photo-1528181304800-259b08848526?w=1200&q=80&auto=format&fit=crop',
  'myanmar-inle-lake':'https://images.unsplash.com/photo-1583087253076-5d1315860eb7?w=1200&q=80&auto=format&fit=crop',
  'papua-new-guinea':'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80&auto=format&fit=crop',
  'seychelles':      'https://images.unsplash.com/photo-1540541338537-3cfb4e9a5ab8?w=1200&q=80&auto=format&fit=crop',
  'hawaii':          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&auto=format&fit=crop',
  'alaska':          'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&q=80&auto=format&fit=crop',
  'matera':          'https://images.unsplash.com/photo-1552334823-ae7c88af3bbb?w=1200&q=80&auto=format&fit=crop',
};

// Continent fallbacks as a very last resort so destination lists always show
// a warm, relevant photo rather than an empty box.
export const CONTINENT_IMAGES: Record<string, string> = {
  europe:          'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=80&auto=format&fit=crop',
  asia:            'https://images.unsplash.com/photo-1528164344705-47542687000d?w=1200&q=80&auto=format&fit=crop',
  africa:          'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80&auto=format&fit=crop',
  'north-america': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80&auto=format&fit=crop',
  'south-america': 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80&auto=format&fit=crop',
  oceania:         'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=1200&q=80&auto=format&fit=crop',
  'middle-east':   'https://images.unsplash.com/photo-1553993811-a2f41c31dc90?w=1200&q=80&auto=format&fit=crop',
};

const DEFAULT_FALLBACK =
  'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1200&q=80&auto=format&fit=crop';

export interface ImageContext {
  category?: string;
  continent?: string;
  slug?: string;
}

/**
 * Return a usable image URL for a piece of content.
 */
export function resolveImage(url: string | undefined, ctx: ImageContext = {}): string {
  if (url) {
    if (/^https?:\/\//i.test(url)) return url;
    if (KNOWN_LOCAL_IMAGES.has(url)) return url;
    // A local /images path that doesn't exist on disk — fall through.
  }
  if (ctx.slug && DESTINATION_IMAGES[ctx.slug]) return DESTINATION_IMAGES[ctx.slug];
  if (ctx.category && CATEGORY_IMAGES[ctx.category]) return CATEGORY_IMAGES[ctx.category];
  if (ctx.continent && CONTINENT_IMAGES[ctx.continent]) return CONTINENT_IMAGES[ctx.continent];
  return DEFAULT_FALLBACK;
}

/**
 * Resize a known Unsplash CDN URL to a different width, preserving params.
 * For non-Unsplash URLs it's a no-op.
 */
export function sizedImage(url: string, width: number): string {
  if (!url.includes('images.unsplash.com')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('w', String(width));
    return u.toString();
  } catch {
    return url;
  }
}
