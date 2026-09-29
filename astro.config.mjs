import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import rehypeAffiliate from './plugins/rehype-affiliate.mjs';

export default defineConfig({
  site: 'https://stayatniche.com',
  integrations: [
    tailwind(),
    mdx(),
  ],
  output: 'static',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  markdown: {
    rehypePlugins: [rehypeAffiliate],
  },
});
