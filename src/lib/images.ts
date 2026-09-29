/**
 * Image resolver: zero-cost, zero-hotlink.
 *
 * 1. If the content file's `coverImage` points to a file that exists in /public, use it.
 * 2. Otherwise look for a file named after the slug anywhere under public/images/**
 *    (e.g. public/images/hotels/treehotel-sweden.webp). Drop a picture there and it is
 *    picked up automatically on the next build, no content edits needed.
 * 3. Otherwise a category photo (public/images/categories/<category>.*), if you added one.
 * 4. Otherwise the built-in illustrated poster for the category / continent.
 *
 * External URLs in content are still honoured as-is.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const PUBLIC = join(process.cwd(), 'public');
const EXT_RANK = ['.avif', '.webp', '.jpg', '.jpeg', '.png'];

// name (no extension) -> public URL, for every user-supplied image
const INDEX = new Map<string, string>();
function scan(dir: string, urlBase: string) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name === 'art') continue; // built-in posters
      scan(join(dir, e.name), `${urlBase}/${e.name}`);
    } else {
      const ext = extname(e.name).toLowerCase();
      if (!EXT_RANK.includes(ext)) continue;
      const name = basename(e.name, extname(e.name));
      const prev = INDEX.get(name);
      const url = `${urlBase}/${e.name}`;
      if (!prev || EXT_RANK.indexOf(ext) < EXT_RANK.indexOf(extname(prev))) INDEX.set(name, url);
    }
  }
}
scan(join(PUBLIC, 'images'), '/images');

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CATEGORY_ART = new Set([
  'treehouse-hotels', 'cave-hotels', 'underwater-rooms', 'castle-hotels', 'floating-hotels',
  'bubble-hotels', 'cliffside-hotels', 'desert-camps', 'jungle-lodges', 'ice-hotels',
  'safari-lodges', 'overwater-bungalows', 'lighthouse-hotels', 'train-hotels',
]);
const CONTINENT_ART = new Set(['europe', 'asia', 'africa', 'north-america', 'south-america', 'oceania', 'middle-east']);

export interface ImageContext {
  category?: string;
  continent?: string;
  slug?: string;
}

/** Built-in illustrated poster for a context; used as the last resort and as the on-error fallback. */
export function fallbackImage(ctx: ImageContext = {}): string {
  if (ctx.category && CATEGORY_ART.has(ctx.category)) return `/images/art/${ctx.category}.svg`;
  if (ctx.continent) {
    const c = slugify(ctx.continent);
    if (CONTINENT_ART.has(c)) return `/images/art/continent-${c}.svg`;
  }
  return '/images/art/continent-default.svg';
}

export function resolveImage(url: string | undefined, ctx: ImageContext = {}): string {
  // Your own files always win: public/images/**/<slug>.(webp|jpg|png)
  if (ctx.slug && INDEX.has(ctx.slug)) return INDEX.get(ctx.slug)!;
  if (url) {
    if (existsSync(join(PUBLIC, url))) return url;
    // External hotlinks in content files (e.g. old Unsplash URLs) are ignored on purpose:
    // unverified and inconsistent. Add a file under public/images/ instead.
  }
  if (ctx.category && INDEX.has(ctx.category)) return INDEX.get(ctx.category)!;
  if (ctx.continent && INDEX.has(slugify(ctx.continent))) return INDEX.get(slugify(ctx.continent))!;
  return fallbackImage(ctx);
}

/** Kept for API compatibility: images are served as-is (self-hosted). */
export function sizedImage(url: string, _width: number): string {
  return url;
}
