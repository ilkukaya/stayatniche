// Rewrites external links in Markdown/MDX bodies: partner links become tracked
// Travelpayouts links where the program is verified (see tp-programs.mjs), and every
// external link gets the correct rel/target attributes. Internal links are untouched.
import { partnerLink, isPartner } from '../src/lib/tp-programs.mjs';

function walk(node, fn) {
  fn(node);
  if (node.children) node.children.forEach((c) => walk(c, fn));
}

export default function rehypeAffiliate({ subId = 'blog' } = {}) {
  return (tree, file) => {
    const slug = (file?.path || '').split('/').pop()?.replace(/\.mdx?$/, '') || 'page';
    walk(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'a') return;
      const href = node.properties?.href;
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
