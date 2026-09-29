// Rewrites external links in Markdown/MDX bodies: partner links become tracked
// Travelpayouts links where the program is verified (see tp-programs.mjs), and every
// external link gets the correct rel/target attributes. In translated content
// (src/content/translations/<lang>/…) internal links are rewritten to the same page in
// that language when it exists, and left pointing at the English page otherwise.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { partnerLink, isPartner } from '../src/lib/tp-programs.mjs';
import { localizeHref } from '../src/i18n/locales.mjs';

const ENTRY_SEGMENTS = { hotels: 'hotels', categories: 'categories', destinations: 'destinations', blog: 'blog', experiences: 'experiences' };
function localInternal(lang, href) {
  const m = href.match(/^\/([^/?#]+)\/([^/?#]+)/);
  const col = m && ENTRY_SEGMENTS[m[1]];
  if (col && col !== 'categories') {
    const file = join(process.cwd(), 'src/content/translations', lang, col, `${m[2]}.md`);
    if (!existsSync(file)) return href; // no translation yet: keep the English page
  }
  return localizeHref(lang, href);
}

function walk(node, fn) {
  fn(node);
  if (node.children) node.children.forEach((c) => walk(c, fn));
}

export default function rehypeAffiliate({ subId = 'blog' } = {}) {
  return (tree, file) => {
    const path = file?.path || '';
    const slug = path.split('/').pop()?.replace(/\.mdx?$/, '') || 'page';
    const found = path.match(/content\/(?:translations|pages)\/([a-z]{2})\//)?.[1];
    const lang = found && found !== 'en' ? found : undefined;
    walk(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'a') return;
      const href = node.properties?.href;
      if (lang && typeof href === 'string' && href.startsWith('/') && !href.startsWith('//')) {
        node.properties.href = localInternal(lang, href);
        return;
      }
      if (typeof href !== 'string' || !/^https?:\/\//.test(href)) return;
      let u;
      try { u = new URL(href); } catch { return; }
      if (/(^|\.)stayatniche\.com$/.test(u.hostname)) return;
      if (isPartner(u.hostname)) {
        node.properties.href = partnerLink(href, `${subId}_${slug}`);
        node.properties.rel = ['noopener', 'noreferrer', 'nofollow', 'sponsored'];
        node.properties['data-affiliate'] = u.hostname.replace(/^www\./, '');
      } else {
        node.properties.rel = ['noopener', 'noreferrer', 'nofollow'];
      }
      node.properties.target = '_blank';
    });
  };
}
