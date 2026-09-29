/**
 * Downloads each affiliate partner's own app icon (apple-touch-icon / largest favicon)
 * and saves a 128×128 PNG to public/partners/<key>.png. Run in CI (needs open internet).
 */
import sharp from 'sharp';
import { writeFileSync, existsSync } from 'node:fs';

const PARTNERS = {
  kiwi: 'https://www.kiwi.com/en/', welcomepickups: 'https://www.welcomepickups.com/', localrent: 'https://localrent.com/en/',
  klook: 'https://www.klook.com/', tiqets: 'https://www.tiqets.com/en/', radicalstorage: 'https://radicalstorage.com/',
  airalo: 'https://www.airalo.com/', ekta: 'https://ekta.travel/', airhelp: 'https://www.airhelp.com/',
  expedia: 'https://www.expedia.com/', booking: 'https://www.booking.com/',
};
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'follow' }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r; };

async function candidates(key, home) {
  const out = [];
  try {
    const html = await (await get(home)).text();
    const links = [...html.matchAll(/<link[^>]+>/gi)].map(m => m[0]).filter(l => /rel=["'][^"']*(apple-touch-icon|icon)[^"']*["']/i.test(l));
    const scored = links.map(l => {
      const href = l.match(/href=["']([^"']+)/i)?.[1]; const size = +(l.match(/sizes=["'](\d+)/i)?.[1] ?? (/apple-touch/i.test(l) ? 180 : 16));
      return href ? { href: new URL(href, home).href, size } : null;
    }).filter(Boolean).sort((a, b) => b.size - a.size);
    out.push(...scored.map(s => s.href));
  } catch (e) { console.log(key, 'home failed', e.message); }
  const host = new URL(home).hostname;
  out.push(`${new URL(home).origin}/apple-touch-icon.png`, `https://www.google.com/s2/favicons?domain=${host}&sz=256`, `https://icons.duckduckgo.com/ip3/${host}.ico`);
  return out;
}

for (const [key, home] of Object.entries(PARTNERS)) {
  const dest = `public/partners/${key}.png`;
  if (existsSync(dest) && !process.argv.includes('--force')) continue;
  let saved = false;
  for (const u of await candidates(key, home)) {
    try {
      const buf = Buffer.from(await (await get(u)).arrayBuffer());
      const img = sharp(buf, { density: 300 });
      const meta = await img.metadata();
      if ((meta.width ?? 0) < 48 && !/svg/.test(meta.format ?? '')) continue;
      writeFileSync(dest, await img.resize(128, 128, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer());
      console.log(`${key}: ${u} (${meta.width}px ${meta.format})`); saved = true; break;
    } catch { /* try next */ }
  }
  if (!saved) console.log(`${key}: NOT FOUND`);
}
