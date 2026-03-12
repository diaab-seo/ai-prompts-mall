#!/usr/bin/env node
/**
 * scripts/fetch-github-data.mjs — Build-time GitHub data pipeline
 * Section 13 / Section 2.3 specification
 *
 * Usage: node scripts/fetch-github-data.mjs
 *
 * Reads: src/data/categories.json
 * Writes: src/data/repos/{owner}__{repo}.json
 *         src/data/manifest.json
 *         src/data/topics.json
 *         src/data/languages.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const REPOS_DIR = join(DATA_DIR, 'repos');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.warn('[fetch-github-data] ⚠️  GITHUB_TOKEN not set — using unauthenticated rate (60 req/hr)');
}

const HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'aipromptsmall.shop/1.0',
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

// Ensure repos dir exists
mkdirSync(REPOS_DIR, { recursive: true });

/* ── Rate-limit-aware fetch ── */
async function ghFetch(url, attempt = 0) {
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 429 || res.status === 403) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60');
    const delay = (retryAfter + Math.random() * 10 * 2 ** attempt) * 1000;
    console.warn(`[fetch] Rate limited — waiting ${Math.round(delay / 1000)}s (attempt ${attempt + 1})`);
    await sleep(delay);
    if (attempt < 5) return ghFetch(url, attempt + 1);
    throw new Error(`Rate limited after ${attempt} retries: ${url}`);
  }
  return res;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ghGet(path) {
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  const res = await ghFetch(url);
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}: ${url}`), { status: res.status });
  return res.json();
}

/* ── Markdown → HTML pipeline ── */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeSanitize)
  .use(rehypeStringify);

async function parseReadme(base64Content, owner, repo, branch = 'main') {
  try {
    const md = Buffer.from(base64Content, 'base64').toString('utf-8');
    // Resolve relative image URLs to absolute
    const resolvedMd = md.replace(
      /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
      (_, alt, src) =>
        `![${alt}](https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${src})`
    );
    const file = await processor.process(resolvedMd);
    return String(file);
  } catch (err) {
    console.error(`[readme] Error parsing README for ${owner}/${repo}:`, err.message);
    return '';
  }
}

/* ── Load categories ── */
const categories = JSON.parse(readFileSync(join(DATA_DIR, 'categories.json'), 'utf-8'));

/* ── Main pipeline ── */
const manifest = [];
const allTopics = {};
const allLanguages = {};
const seenRepos = new Set();
const startTime = Date.now();
let apiCallCount = 0;

/**
 * GitHub Search API does NOT support OR-combined topic: queries.
 * Split the githubQuery on ' OR ' into individual sub-queries,
 * run each separately, merge results, and deduplicate by full_name.
 */
async function searchCategory(githubQuery, maxPages = 5) {
  // Split on ' OR ' — e.g. "topic:llm OR topic:large-language-model stars:>50"
  // into ["topic:llm stars:>50", "topic:large-language-model stars:>50"]
  const parts = githubQuery.split(/ OR /i).map(p => p.trim());
  const seen = new Map(); // full_name → item

  for (const part of parts) {
    for (let page = 1; page <= maxPages; page++) {
      const q = encodeURIComponent(`${part} sort:stars`);
      const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=100&page=${page}`;
      let result;
      try {
        result = await ghGet(url);
        apiCallCount++;
        await sleep(300); // respect secondary rate limits
      } catch (err) {
        console.error(`  ✗ Sub-query "${part}" page ${page}: ${err.message}`);
        break;
      }
      if (!result.items?.length) break;
      for (const item of result.items) {
        if (!seen.has(item.full_name)) seen.set(item.full_name, item);
      }
      if (result.items.length < 100) break;
    }
  }

  // Sort merged results by stars descending
  return [...seen.values()].sort((a, b) => b.stargazers_count - a.stargazers_count);
}

for (const category of categories) {
  console.log(`\n📂 Fetching category: ${category.label} (${category.slug})`);

  const items = await searchCategory(category.githubQuery, 3);
  console.log(`  Total unique repos found: ${items.length}`);

  for (const item of items) {
    const fullName = item.full_name;
    if (seenRepos.has(fullName)) continue;
    seenRepos.add(fullName);

    const [owner, repo] = fullName.split('/');
    const repoFile = join(REPOS_DIR, `${owner}__${repo}.json`);

    // Delta-fetch: skip if pushed_at matches stored value
    if (existsSync(repoFile)) {
      const stored = JSON.parse(readFileSync(repoFile, 'utf-8'));
      if (stored.pushed_at === item.pushed_at) {
        console.log(`    ↩ Skip (unchanged): ${fullName}`);
        manifest.push(buildManifestEntry(stored, category.slug));
        continue;
      }
    }

    // Fetch secondary data in parallel — failures are non-fatal
    const [commits, contributors, releases, langs, readmeData] = await Promise.allSettled([
      ghGet(`/repos/${owner}/${repo}/commits?per_page=100`).then(r => { apiCallCount++; return r; }),
      ghGet(`/repos/${owner}/${repo}/contributors?per_page=10`).then(r => { apiCallCount++; return r; }),
      ghGet(`/repos/${owner}/${repo}/releases?per_page=5`).then(r => { apiCallCount++; return r; }),
      ghGet(`/repos/${owner}/${repo}/languages`).then(r => { apiCallCount++; return r; }),
      ghGet(`/repos/${owner}/${repo}/readme`).then(r => { apiCallCount++; return r; }),
    ]);

    const readmeHtml = readmeData.status === 'fulfilled' && readmeData.value?.content
      ? await parseReadme(readmeData.value.content, owner, repo, item.default_branch ?? 'main')
      : '';

    const repoData = {
      ...item,
      primary_category: category.slug,
      commits: commits.status === 'fulfilled' ? commits.value : [],
      contributors: contributors.status === 'fulfilled' ? contributors.value : [],
      releases: releases.status === 'fulfilled' ? releases.value : [],
      languages: langs.status === 'fulfilled' ? langs.value : {},
      readme_html: readmeHtml,
      _fetched_at: new Date().toISOString(),
    };

    writeFileSync(repoFile, JSON.stringify(repoData, null, 2));
    manifest.push(buildManifestEntry(repoData, category.slug));
    console.log(`    ✓ ${fullName} (★${item.stargazers_count})`);

    // Aggregate topics and languages
    for (const topic of (item.topics ?? [])) {
      allTopics[topic] = (allTopics[topic] ?? 0) + 1;
    }
    if (item.language) {
      allLanguages[item.language] = (allLanguages[item.language] ?? 0) + 1;
    }

    await sleep(200); // secondary rate-limit courtesy delay
  }
}

function buildManifestEntry(data, categorySlug) {
  return {
    full_name: data.full_name,
    slug: data.full_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    owner: data.owner?.login ?? data.full_name.split('/')[0],
    repo: data.name,
    stars: data.stargazers_count,
    forks: data.forks_count,
    language: data.language,
    topics: data.topics ?? [],
    primary_category: categorySlug ?? data.primary_category,
    pushed_at: data.pushed_at,
    description: data.description,
  };
}

// Write outputs
writeFileSync(join(DATA_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

const topicsArr = Object.entries(allTopics)
  .map(([tag, count]) => ({ tag, count }))
  .sort((a, b) => b.count - a.count);
writeFileSync(join(DATA_DIR, 'topics.json'), JSON.stringify(topicsArr, null, 2));

const langsArr = Object.entries(allLanguages)
  .map(([lang, count]) => ({ lang, count }))
  .sort((a, b) => b.count - a.count);
writeFileSync(join(DATA_DIR, 'languages.json'), JSON.stringify(langsArr, null, 2));

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`
✅ Done!
   Repos fetched : ${manifest.length}
   API calls     : ${apiCallCount}
   Time elapsed  : ${elapsed}s
`);
