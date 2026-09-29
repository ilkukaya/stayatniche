// Generates og-default.png (1200x630), apple-touch-icon.png and PWA icons from SVG.
// Run: node scripts/make-brand-assets.mjs
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14412A"/><stop offset="1" stop-color="#082417"/></linearGradient>
    <radialGradient id="r" cx="0.85" cy="0.1" r="0.7"><stop offset="0" stop-color="#F8931E" stop-opacity="0.55"/><stop offset="1" stop-color="#F8931E" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/><rect width="1200" height="630" fill="url(#r)"/>
  <path transform="translate(96 96) scale(3)" fill="#FBBA62" d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.7 6.9L12 17.4 5.7 21l1.7-6.9L2 9.3l7.1-.7L12 2z"/>
  <text x="96" y="330" font-family="Georgia, serif" font-size="92" font-weight="700" fill="#FBF8F4">Hotels worth</text>
  <text x="96" y="430" font-family="Georgia, serif" font-size="92" font-weight="700" font-style="italic" fill="#FBBA62">the trip.</text>
  <text x="96" y="520" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="#DBF4E5">Treehouses, caves, underwater rooms, safari lodges &amp; more</text>
  <text x="96" y="574" font-family="Georgia, serif" font-size="30" font-weight="700" fill="#FBF8F4">StayAtNiche.com</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile('public/og-default.png');

const icon = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="${bg}"/><path transform="translate(96 96) scale(13.33)" fill="#FBBA62" d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.7 6.9L12 17.4 5.7 21l1.7-6.9L2 9.3l7.1-.7L12 2z"/></svg>`;
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await sharp(Buffer.from(icon('#1F7D4A'))).resize(size, size).png().toFile(`public/${name}`);
}
console.log('brand assets written');
