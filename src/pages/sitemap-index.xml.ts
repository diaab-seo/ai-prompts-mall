/**
 * /sitemap-index.xml — Master sitemap index pointing to all shards.
 * Each shard covers 1000 URLs maximum (Google's recommended limit is 50k, but
 * smaller shards keep crawl fresh).
 */
export const prerender = true;

import manifestRaw from '../data/manifest.json';
import categories from '../data/categories.json';

interface RepoEntry {
  full_name: string; owner: string; repo: string;
  primary_category: string; pushed_at: string;
}

const SITE = 'https://aipromptsmall.shop';
const manifest: RepoEntry[] = manifestRaw as any;
const SHARD_SIZE = 1000;

// Count total URLs to know how many repo shards we need
const repoShards = Math.ceil(manifest.length / SHARD_SIZE);

export function GET() {
  const now = new Date().toISOString();

  const sitemaps: string[] = [
    // Static pages shard
    `  <sitemap>
    <loc>${SITE}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`,
    // Category shard
    `  <sitemap>
    <loc>${SITE}/sitemap-categories.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`,
  ];

  // Repo shards
  for (let i = 0; i < repoShards; i++) {
    sitemaps.push(`  <sitemap>
    <loc>${SITE}/sitemap-repos-${i}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
