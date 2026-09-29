/**
 * Validate translation files against their English sources.
 * Usage: node scripts/i18n-check.mjs <lang|all> [collection] [--missing]
 * Errors (exit 1): unparsable YAML, unknown/missing source, forbidden or missing keys,
 * array length mismatch, link count/URL mismatch, meta length out of range.
 * Warnings: likely untranslated English sentences, body much shorter/longer than source.
 */
import matter from 'gray-matter';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { TRANSLATED, CATEGORY_I18N } from '../src/i18n/locales.mjs';

const ALLOWED = {
  hotels: ['destination', 'description', 'highlights', 'amenities', 'bestFor', 'prosAndCons', 'seasonalInfo', 'nearbyAttractions', 'seo'],
  categories: ['title', 'tagline', 'description', 'stats', 'seo'],
  destinations: ['name', 'description', 'essentials', 'bestTimeToVisit', 'mustSee', 'travelTips', 'seo'],
  blog: ['title', 'excerpt', 'seo'],
  experiences: ['title', 'destination', 'description', 'booking', 'highlights', 'included', 'notIncluded', 'seo'],
};
const REQUIRED = { hotels: ['description'], categories: ['title', 'description'], destinations: ['name', 'description'], blog: ['title', 'excerpt'], experiences: ['title', 'description'] };
const EN_WORDS = /\b(the|and|with|which|from|this|that|your|their|there|where|while|into|about|have|been|would|also)\b/gi;

const [langArg = 'all', onlyCol] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const showMissing = process.argv.includes('--missing');
const langs = langArg === 'all' ? TRANSLATED : [langArg];
const cols = onlyCol ? [onlyCol] : Object.keys(ALLOWED);
let errors = 0, warnings = 0;
const err = (f, m) => { errors++; console.log(`ERROR ${f}: ${m}`); };
const warn = (f, m) => { warnings++; console.log(`warn  ${f}: ${m}`); };
const links = (s) => [...s.matchAll(/\]\(([^)\s]+)/g)].map((m) => m[1]);
const words = (s) => s.split(/\s+/).filter(Boolean).length;

for (const lang of langs) {
  for (const col of cols) {
    const srcDir = `src/content/${col}`;
    const dir = `src/content/translations/${lang}/${col}`;
    const sources = readdirSync(srcDir).filter((f) => /\.mdx?$/.test(f));
    const live = sources.filter((f) => !/^status:\s*(draft|archived)/m.test(readFileSync(`${srcDir}/${f}`, 'utf8')));
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
    if (showMissing) {
      const missing = live.filter((f) => !files.includes(f.replace(/\.mdx$/, '.md')));
      if (missing.length) console.log(`missing ${lang}/${col} (${missing.length}): ${missing.map((f) => f.replace(/\.mdx?$/, '')).join(' ')}`);
    }
    for (const f of files) {
      const path = `${dir}/${f}`;
      let t, s;
      try { t = matter(readFileSync(path, 'utf8')); } catch (e) { err(path, `YAML: ${e.message.split('\n')[0]}`); continue; }
      const slug = f.replace(/\.md$/, '');
      if (t.data.source !== slug) err(path, `source must be "${slug}"`);
      const srcFile = sources.find((x) => x.replace(/\.mdx?$/, '') === slug);
      if (!srcFile) { err(path, 'no English source with this slug'); continue; }
      s = matter(readFileSync(`${srcDir}/${srcFile}`, 'utf8'));
      for (const k of Object.keys(t.data)) if (k !== 'source' && !ALLOWED[col].includes(k)) err(path, `field "${k}" must not be in a translation`);
      for (const k of REQUIRED[col]) if (!t.data[k]) err(path, `missing "${k}"`);
      if (!t.data.seo?.metaTitle || !t.data.seo?.metaDescription) err(path, 'missing seo.metaTitle / seo.metaDescription');
      else {
        if (t.data.seo.metaTitle.length > 70) warn(path, `metaTitle ${t.data.seo.metaTitle.length} chars (aim ≤ 60)`);
        const d = t.data.seo.metaDescription.length; if (d < 110 || d > 175) warn(path, `metaDescription ${d} chars (aim 140–160)`);
      }
      // arrays keep length & order
      const cmp = (a, b, key) => { if (Array.isArray(b)) { if (!Array.isArray(a) || a.length !== b.length) err(path, `"${key}" must have ${b.length} items (has ${Array.isArray(a) ? a.length : 'none'})`); } };
      for (const k of ALLOWED[col]) {
        if (k === 'seo' || t.data[k] == null) continue;
        if (s.data[k] == null) { err(path, `"${k}" is not in the English entry`); continue; }
        cmp(t.data[k], s.data[k], k);
        if (s.data[k] && typeof s.data[k] === 'object' && !Array.isArray(s.data[k])) for (const kk of Object.keys(s.data[k])) cmp(t.data[k]?.[kk], s.data[k][kk], `${k}.${kk}`);
      }
      if (col === 'categories') {
        const want = CATEGORY_I18N[slug]?.[lang]?.[0];
        if (want && t.data.title !== want) err(path, `title must be "${want}"`);
      }
      // body
      const sl = links(s.content), tl = links(t.content);
      if (sl.length !== tl.length) err(path, `body has ${tl.length} links, English has ${sl.length}`);
      else sl.forEach((u, i) => { if (u !== tl[i]) err(path, `link #${i + 1} changed: ${tl[i]} (English: ${u})`); });
      const sw = words(s.content), tw = words(t.content);
      if (sw > 40 && (tw < sw * 0.7 || tw > sw * 1.6)) warn(path, `body ${tw} words vs English ${sw}`);
      if ((s.content.match(/^#{1,6} /gm) ?? []).length !== (t.content.match(/^#{1,6} /gm) ?? []).length) err(path, 'heading count differs from English');
      // English leftovers
      const text = [t.content, JSON.stringify(t.data)].join(' ');
      for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        const n = (sentence.match(EN_WORDS) ?? []).length;
        if (n >= 3) { warn(path, `looks English: "${sentence.slice(0, 90)}"`); break; }
      }
    }
  }
}
console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
