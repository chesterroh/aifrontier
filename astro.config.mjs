// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import rehypeTimestampVisibility from './src/plugins/rehype-timestamp-visibility.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://aifrontier.kr',
  vite: {
    plugins: [tailwindcss()]
  },
  markdown: {
    rehypePlugins: [rehypeTimestampVisibility]
  },
  integrations: [mdx(), react()]
});
