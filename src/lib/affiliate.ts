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
import { TP_MARKER, TP_PROGRAMS } from './tp-programs.mjs';
export { TP_MARKER };

/** Booking.com Partner ID (aid). Fill in once approved; empty = plain link. */
export const BOOKING_AID = '';

function programFor(host: string): string | undefined {
  const h = host.replace(/^www\./, '');
  return TP_PROGRAMS[h];
}

/** Wrap any URL in a Travelpayouts tracked redirect. */
export function tpLink(programId: string, targetUrl: string, subId?: string): string {
  const sub = subId ? `&sub_id=${encodeURIComponent(subId.slice(0, 60))}` : '';
  return `https://tp.media/r?marker=${TP_MARKER}&p=${programId}&u=${encodeURIComponent(targetUrl)}${sub}`;
}

/**
 * Decorate an outbound URL for revenue tracking.
 *  - internal/anchor links are returned untouched
 *  - Travelpayouts partners are wrapped in a tracked tp.media redirect
 *    (with a sub_id so earnings can be attributed to a page/placement)
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
  const pid = programFor(u.hostname);
  if (pid) return tpLink(pid, u.toString(), sub || 'site');

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
