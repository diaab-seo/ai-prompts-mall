#!/usr/bin/env node
/**
 * scripts/generate-sitemaps.mjs — Post-build sitemap generator
 * Section 13 / Section 5.5 specification.
 *
 * Run AFTER: astro build
 * Usage: node scripts/generate-sitemaps.mjs
 *
 * Reads:  dist/ (built HTML files) + src/data/manifest.json
 * Writes: dist/sitemap-0.xml, dist/sitemap-1.xml, ...
 *         dist/sitemap-index.xml
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST_DIR = join(ROOT, 'dist');
const DATA_DIR = join(ROOT, 'src', 'data');
const SITE_URL = 'https://aipromptsmall.shop';
const MAX_URLS = 49_999;
const BUILD_DATE = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

/* ── Priority + changefreq rules ── */
function getUrlMeta(url) {
  if (url === '/') return { priority: '1.0', changefreq: 'daily' };
  if (url.startsWith('/category/')) return { priority: '0.9', changefreq: 'daily' };
  if (url.startsWith('/repo/')) return { priority: '0.7', changefreq: 'weekly' };
  if (url.startsWith('/topic/')) return { priority: '0.6', changefreq: 'weekly' };
  if (url.startsWith('/language/')) return { priority: '0.6', changefreq: 'weekly' };
  if (url.startsWith('/owner/')) return { priority: '0.5', changefreq: 'weekly' };
  return { priority: '0.5', changefreq: 'monthly' };
}

/* ── Collect SSG URLs from dist/ HTML files ── */
function collectStaticUrls() {
  const urls = [];
  function walk(dir, base = '') {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), `${base}/${entry.name}`);
      } else if (entry.name.endsWith('.html')) {
        const path = entry.name === 'index.html'
          ? base || '/'
          : `${base}/${entry.name.replace('.html', '')}`;
        urls.push(path);
      }
    }
  }
  try { walk(DIST_DIR); } catch { /* dist not found — skip */ }
  return urls;
}

/* ── Collect SSR URLs from manifest ── */
function collectSsrUrls() {
  const manifestPath = join(DATA_DIR, 'manifest.json');
  if (!readFileSync) return [];
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    return manifest.map((r) => `/repo/${r.owner}/${r.repo}`);
  } catch { return []; }
}

/* ── Write XML ── */
function buildUrlEntry(url, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${SITE_URL}${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function buildSitemapXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
}

function buildIndexXml(shards) {
  const items = shards
    .map((name) => `  <sitemap>\n    <loc>${SITE_URL}/${name}</loc>\n    <lastmod>${BUILD_DATE}</lastmod>\n  </sitemap>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>`;
}

/* ── Main ── */
const staticUrls = collectStaticUrls();
const ssrUrls = collectSsrUrls();

// Deduplicate
const allUrls = [...new Set([...staticUrls, ...ssrUrls])];
console.log(`Total URLs: ${allUrls.length}`);

// Build entries
const manifest = (() => {
  try { return JSON.parse(readFileSync(join(DATA_DIR, 'manifest.json'), 'utf-8')); } catch { return []; }
})();
const pushedAtMap = Object.fromEntries(manifest.map((r) => [`/repo/${r.owner}/${r.repo}`, r.pushed_at?.split('T')[0] ?? BUILD_DATE]));

const entries = allUrls.map((url) => {
  const { priority, changefreq } = getUrlMeta(url);
  const lastmod = pushedAtMap[url] ?? BUILD_DATE;
  return buildUrlEntry(url, lastmod, changefreq, priority);
});

// Shard
const shardNames = [];
for (let i = 0; i * MAX_URLS < entries.length; i++) {
  const chunk = entries.slice(i * MAX_URLS, (i + 1) * MAX_URLS);
  const name = `sitemap-${i}.xml`;
  writeFileSync(join(DIST_DIR, name), buildSitemapXml(chunk), 'utf-8');
  shardNames.push(name);
  console.log(`Wrote ${name} (${chunk.length} URLs)`);
}

// Write index
writeFileSync(join(DIST_DIR, 'sitemap-index.xml'), buildIndexXml(shardNames), 'utf-8');
console.log(`✅ sitemap-index.xml written with ${shardNames.length} shard(s).`);
