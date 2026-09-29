/**
 * Image optimizer.
 *
 * Drop images (ChatGPT, Canva, camera... png/jpg/webp) into  raw-images/  named EXACTLY
 * like the page slug, e.g.  raw-images/treehotel-sweden.png,  raw-images/treehouse-hotels.png
 * (see docs/IMAGE-PROMPTS.md for the list). Then run:  npm run optimize-images
 * Output: public/images/<slug>.webp (max 1600px wide). The site picks it up automatically
 * on the next build. No content editing needed.
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const IN = './raw-images', OUT = './public/images';
const OK = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

await mkdir(IN, { recursive: true });
await mkdir(OUT, { recursive: true });
const files = (await readdir(IN)).filter(f => OK.includes(path.extname(f).toLowerCase()));
if (!files.length) { console.log('raw-images/ is empty. Put images there first.'); process.exit(0); }

for (const f of files) {
  const slug = path.parse(f).name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const out = path.join(OUT, `${slug}.webp`);
  await sharp(path.join(IN, f)).rotate().resize(1600, 1067, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(out);
  console.log(`OK  ${f} -> ${out}`);
}
console.log('\nDone. Commit public/images/ and push; Netlify redeploys automatically.');
