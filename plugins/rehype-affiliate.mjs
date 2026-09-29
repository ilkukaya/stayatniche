// Rewrites external links in Markdown/MDX bodies: partner links are wrapped in
// tracked Travelpayouts redirects (revenue!), and every external link gets the
// correct rel/target attributes. Internal links are untouched.
import { TP_MARKER, TP_PROGRAMS } from '../src/lib/tp-programs.mjs';

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
      const pid = TP_PROGRAMS[u.hostname.replace(/^www\./, '')];
      if (pid) {
        node.properties.href = `https://tp.media/r?marker=${TP_MARKER}&p=${pid}&u=${encodeURIComponent(href)}&sub_id=${encodeURIComponent(`${subId}_${slug}`.slice(0, 60))}`;
        node.properties.rel = ['noopener', 'noreferrer', 'nofollow', 'sponsored'];
        node.properties['data-affiliate'] = u.hostname.replace(/^www\./, '');
      } else {
        node.properties.rel = ['noopener', 'noreferrer', 'nofollow'];
      }
      node.properties.target = '_blank';
    });
  };
}
