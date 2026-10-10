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

// ── Travelpayouts routing ─────────────────────────────────────────────────
// Single source of truth for partner IDs. Every outbound partner link on the
// site goes through `withTracking()`, which auto-detects the partner from the
// hostname and wraps the URL in a tracked tp.media redirect. A link that is
// NOT wrapped earns no commission — so never build partner hrefs by hand.
import { TP_MARKER, partnerLink, isPartner } from './tp-programs.mjs';
import expediaHotels from '../data/expedia-hotels.json';
export { TP_MARKER };
const EXPEDIA_HOTELS = expediaHotels as Record<string, string>;

/** Booking.com Partner ID (aid). Fill in once approved; empty = plain link. */
export const BOOKING_AID = '';

/** Kept for existing callers; the program id argument is ignored (IDs come from tp-programs.mjs). */
export function tpLink(_programId: string, targetUrl: string, subId?: string): string {
  return partnerLink(targetUrl, subId);
}

/**
 * Decorate an outbound URL for revenue tracking.
 *  - internal/anchor links are returned untouched
 *  - verified Travelpayouts programs become tracked tp.media links (with sub_id)
 *  - other approved partners stay as plain brand URLs for Travelpayouts Drive to convert
 *  - Booking.com gets the partner `aid` when configured
 *  - everything else gets UTM parameters
 */
export function withTracking(url: string, opts: AffiliateOptions = {}): string {
  if (!url) return url;
  if (url.startsWith('/') || url.startsWith('#')) return url;
  if (url.startsWith('https://tp.media/')) return url;

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }

  const sub = [opts.campaign, opts.content].filter(Boolean).join('_');
  if (isPartner(u.hostname)) return partnerLink(u.toString(), sub || 'site');

  if (BOOKING_AID && /(^|\.)booking\.com$/.test(u.hostname)) {
    if (!u.searchParams.has('aid')) u.searchParams.set('aid', BOOKING_AID);
    if (sub) u.searchParams.set('label', sub.slice(0, 60));
    return u.toString();
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

/** The stay's own Expedia hotel page (src/data/expedia-hotels.json), if one was found. */
export function expediaHotelPage(slug?: string): string | null {
  return (slug && EXPEDIA_HOTELS[slug]) || null;
}

/** Tracked Expedia link for a stay: its own hotel page when known, else a search for its name. */
export function expediaHotelUrl(slug: string, name: string, destination: string, opts: AffiliateOptions = {}): string {
  const q = encodeURIComponent(`${name}, ${destination.split(',')[0]}`);
  return withTracking(expediaHotelPage(slug) ?? `https://www.expedia.com/Hotel-Search?destination=${q}&adults=2`, opts);
}

/**
 * Best earning link for a hotel's "Check rates" button.
 * Expedia is the approved hotel partner: its own page for the stay when known, otherwise a search
 * for it. Booking.com pays nothing until BOOKING_AID is set, so those hotels go to Expedia too;
 * stays sold only by their operator (trains, small properties) keep their own URL.
 */
export function hotelDealUrl(bookingUrl: string, name: string, destination: string, opts: AffiliateOptions = {}, slug = opts.content): string {
  if (expediaHotelPage(slug)) return expediaHotelUrl(slug!, name, destination, opts);
  if (!BOOKING_AID && /(^|\/\/|\.)booking\.com/.test(bookingUrl ?? '')) return expediaHotelUrl(slug ?? '', name, destination, opts);
  return withTracking(bookingUrl, opts);
}

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
