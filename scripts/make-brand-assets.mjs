// Brand icons from the "niche" mark (public/favicon.svg). Run: node scripts/make-brand-assets.mjs
// The social card (public/og-default.png) is rendered separately in a browser so it can use
// the site's typefaces; see scripts/og-card.html.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const mark = readFileSync('public/favicon.svg');
// Full-bleed variant for maskable/apple icons (platforms apply their own corner rounding).
const bleed = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#133B2F"/><g transform="translate(9.6 9.6) scale(.7)"><path d="M20 50V28a12 12 0 0 1 24 0v22" fill="none" stroke="#FAF9F6" stroke-width="4.5" stroke-linecap="round"/><path d="M14 50h36" stroke="#FAF9F6" stroke-width="4.5" stroke-linecap="round"/><circle cx="32" cy="36" r="4.2" fill="#DF7A48"/></g></svg>`);

await sharp(mark, { density: 384 }).resize(32, 32).png().toFile('public/favicon-32.png');
await sharp(mark, { density: 768 }).resize(512, 512).png().toFile('public/logo.png');
await sharp(bleed, { density: 384 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(bleed, { density: 384 }).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(bleed, { density: 768 }).resize(512, 512).png().toFile('public/icon-512.png');
console.log('icons written');
