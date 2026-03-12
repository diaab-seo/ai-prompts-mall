// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import pagefind from 'astro-pagefind';

// https://astro.build/config
// NOTE: In Astro 6, output:'hybrid' was removed. output:'static' (the default)
// now behaves identically — SSG by default, SSR on pages with prerender=false.
export default defineConfig({
  output: 'static',
  adapter: cloudflare({ mode: 'directory' }),
  site: 'https://aipromptsmall.shop',
  trailingSlash: 'never',
  prefetch: true,
  compressHTML: true,
  integrations: [pagefind()],
  vite: {
    build: {
      chunkSizeWarningLimit: 600,
    },
  },
});
