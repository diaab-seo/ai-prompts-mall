/**
 * /sitemap-[n].xml — Per-shard sitemap for repos (n = shard index 0,1,2…)
 * Also handles 'static' (key pages) and 'categories' (category listing pages).
 */
export const prerender = true;

import manifestRaw from '../data/manifest.json';
import categories from '../data/categories.json';

interface RepoEntry {
  full_name: string; owner: string; repo: string;
  primary_category: string; pushed_at: string;
}

const SITE = 'https://aipromptsmall.shop';
const SHARD_SIZE = 1000;
const manifest: RepoEntry[] = manifestRaw as any;

function urlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: string) {
  return `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''}${changefreq ? `\n    <changefreq>${changefreq}</changefreq>` : ''}${priority ? `\n    <priority>${priority}</priority>` : ''}
  </url>`;
}

export function getStaticPaths() {
  const repoShards = Math.ceil(manifest.length / SHARD_SIZE);
  const paths = [
    { params: { n: 'static' } },
    { params: { n: 'categories' } },
  ];
  for (let i = 0; i < repoShards; i++) {
    paths.push({ params: { n: String(i) } });
  }
  return paths;
}

export function GET({ params }: { params: { n: string } }) {
  const { n } = params;
  const today = new Date().toISOString().slice(0, 10);
  let urls: string[] = [];

  if (n === 'static') {
    // Core pages
    urls = [
      urlEntry(`${SITE}/`, undefined, 'daily', '1.0'),
      urlEntry(`${SITE}/search`, today, 'weekly', '0.8'),
      urlEntry(`${SITE}/trending`, today, 'daily', '0.9'),
    ];
  } else if (n === 'categories') {
    // Category index pages
    for (const cat of categories) {
      urls.push(urlEntry(`${SITE}/category/${cat.slug}`, today, 'daily', '0.9'));
    }
    // Popular topic pages (first 100)
    // (topics.json is only available at build time — skip for now)
  } else {
    // Repo pages for shard n
    const shardIdx = parseInt(n, 10);
    const slice = manifest.slice(shardIdx * SHARD_SIZE, (shardIdx + 1) * SHARD_SIZE);
    urls = slice.map((r) =>
      urlEntry(
        `${SITE}/repo/${r.owner}/${r.repo}`,
        r.pushed_at ? r.pushed_at.slice(0, 10) : today,
        'weekly',
        '0.7',
      )
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
