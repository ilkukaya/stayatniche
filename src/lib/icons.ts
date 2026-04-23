/**
 * Inline SVG category icons.
 *
 * The previous build used emoji like 🪨 or 🌳. On most desktop browsers
 * those fall through to whatever emoji font the OS ships — and on Linux
 * that's often a black-and-white glyph or, worse, a tofu box. Using real
 * SVGs keeps the site on-brand and consistent across platforms.
 *
 * Each icon is a 24×24 stroke-based glyph so it scales crisply at any size
 * and picks up `currentColor` for theming.
 */

export type CategorySlug =
  | 'treehouse-hotels'
  | 'cave-hotels'
  | 'underwater-rooms'
  | 'castle-hotels'
  | 'floating-hotels'
  | 'bubble-hotels'
  | 'cliffside-hotels'
  | 'desert-camps'
  | 'jungle-lodges'
  | 'ice-hotels'
  | 'safari-lodges'
  | 'overwater-bungalows'
  | 'lighthouse-hotels'
  | 'train-hotels';

export const CATEGORY_ICONS: Record<string, string> = {
  'treehouse-hotels': `<path d="M12 3c3 2 4.5 5 4.5 8.5a4.5 4.5 0 0 1-9 0C7.5 8 9 5 12 3Z"/><path d="M12 15v6"/><path d="M9 21h6"/><path d="M12 8v4"/>`,
  'cave-hotels': `<path d="M3 20V13a9 9 0 0 1 18 0v7"/><path d="M9 20v-4a3 3 0 0 1 6 0v4"/><path d="M7 10c1-1 2-1 3 0"/><path d="M14 10c1-1 2-1 3 0"/>`,
  'underwater-rooms': `<path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M9 10a3 3 0 1 1 6 0c0 2-3 3-3 3s-3-1-3-3Z"/><path d="M5 6l2 2"/><path d="M19 6l-2 2"/>`,
  'castle-hotels': `<path d="M3 21V9l3 2V7l3 2V6l3 2V6l3 2v3l3-2v12"/><path d="M10 21v-5a2 2 0 0 1 4 0v5"/>`,
  'floating-hotels': `<path d="M3 18c2 2 4 2 6 0s4-2 6 0 4 2 6 0"/><path d="M5 14l1-6h12l1 6"/><path d="M12 8V4"/><path d="M9 4h6"/>`,
  'bubble-hotels': `<circle cx="12" cy="12" r="8"/><circle cx="9" cy="9" r="2" opacity=".4"/><path d="M12 4a8 8 0 0 1 8 8"/>`,
  'cliffside-hotels': `<path d="M3 20L9 9l4 6 3-4 5 9H3Z"/><circle cx="8" cy="7" r="1.5"/>`,
  'desert-camps': `<path d="M3 20h18"/><path d="M3 20c2-5 4-7 6-7s3 2 5 2 3-3 5-3"/><circle cx="17" cy="6" r="2"/>`,
  'jungle-lodges': `<path d="M7 21c-2-3-2-7 0-10 1-1.5 3-2 5-2s4 .5 5 2c2 3 2 7 0 10"/><path d="M12 21v-6"/><path d="M9 11c1-1 2-1 3 0"/><path d="M12 11c1-1 2-1 3 0"/>`,
  'ice-hotels': `<path d="M12 3v18"/><path d="M3 12h18"/><path d="M5 5l14 14"/><path d="M19 5L5 19"/>`,
  'safari-lodges': `<path d="M3 20l3-7h12l3 7"/><path d="M6 13V8a3 3 0 0 1 6 0"/><path d="M12 8a3 3 0 0 1 6 0v5"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/>`,
  'overwater-bungalows': `<path d="M3 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M5 14l7-7 7 7"/><path d="M9 14v-3h6v3"/>`,
  'lighthouse-hotels': `<path d="M10 21V9h4v12"/><path d="M9 9h6"/><path d="M10 6V3h4v3"/><path d="M4 11l4-2"/><path d="M20 11l-4-2"/><path d="M4 6l3 1"/><path d="M20 6l-3 1"/>`,
  'train-hotels': `<rect x="5" y="4" width="14" height="13" rx="2"/><path d="M5 11h14"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/><path d="M7 4l-2 2"/><path d="M17 4l2 2"/>`,
};

/**
 * Inline SVG markup for a category. Call this in Astro files via set:html.
 * Returns an empty string if the slug isn't mapped (caller can render nothing).
 */
export function categoryIconSvg(slug: string, { size = 24, className = '' }: { size?: number; className?: string } = {}): string {
  const inner = CATEGORY_ICONS[slug];
  if (!inner) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="${className}" aria-hidden="true">${inner}</svg>`;
}
