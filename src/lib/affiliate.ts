/**
 * Affiliate link helper.
 *
 * Centralises the way we decorate outbound booking/partner URLs with
 * UTM params, partner IDs, and tracking tokens so every link across
 * the site stays consistent — and so we can flip defaults in one place.
 *
 * The helper is pure and runs at build time. No user data is attached.
 */

const UTM_DEFAULTS = {
  utm_source: 'stayatniche',
  utm_medium: 'affiliate',
};

export interface AffiliateOptions {
  /** Page/component raising the click (e.g. "hotel-card", "hero-cta"). */
  campaign?: string;
  /** Hotel slug, destination slug or free-form content identifier. */
  content?: string;
  /** Optional partner override when multiple IDs exist. */
  partner?: string;
}

/**
 * Decorate an outbound URL with UTM params. Safe for URLs that already
 * include query strings or hashes.
 */
export function withTracking(url: string, opts: AffiliateOptions = {}): string {
  if (!url) return url;
  // Don't track internal links.
  if (url.startsWith('/') || url.startsWith('#')) return url;

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }

  const params: Record<string, string> = {
    ...UTM_DEFAULTS,
    utm_campaign: opts.campaign ?? 'site',
  };
  if (opts.content) params.utm_content = opts.content;

  for (const [k, v] of Object.entries(params)) {
    if (!u.searchParams.has(k)) u.searchParams.set(k, v);
  }
  return u.toString();
}

/**
 * Preferred rel attribute for outbound partner/affiliate links.
 * `nofollow sponsored` is what Google specifically asks for on paid links;
 * `noopener noreferrer` protects against window.opener abuse.
 */
export const AFFILIATE_REL = 'noopener noreferrer nofollow sponsored';

/**
 * Build an Expedia hotel-search URL for a given destination.
 */
export function expediaSearchUrl(destination: string, country?: string): string {
  const q = country ? `${destination}, ${country}` : destination;
  return withTracking(
    `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(q)}&adults=2`,
    { campaign: 'hotel-search', content: destination },
  );
}

/**
 * Build a Booking.com search URL for a given destination.
 */
export function bookingSearchUrl(destination: string, country?: string): string {
  const q = country ? `${destination}, ${country}` : destination;
  return withTracking(
    `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(q)}`,
    { campaign: 'hotel-search', content: destination },
  );
}

/**
 * Build a Google Maps search URL (non-affiliate, for wayfinding).
 */
export function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
