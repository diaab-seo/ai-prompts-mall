#!/usr/bin/env node
/**
 * Rebuild manifest.json from existing repo JSON files in src/data/repos/
 * Also rebuilds topics.json and languages.json.
 * Run this after a partial fetch to avoid losing already-downloaded data.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'src', 'data');
const REPOS_DIR = join(DATA_DIR, 'repos');

const files = readdirSync(REPOS_DIR).filter(f => f.endsWith('.json'));
console.log(`Found ${files.length} repo JSON files.`);

const manifest = [];
const allTopics = {};
const allLanguages = {};

for (const f of files) {
  const d = JSON.parse(readFileSync(join(REPOS_DIR, f), 'utf-8'));
  manifest.push({
    full_name: d.full_name,
    slug: d.full_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    owner: d.owner?.login ?? d.full_name.split('/')[0],
    repo: d.name,
    stars: d.stargazers_count,
    forks: d.forks_count,
    language: d.language,
    topics: d.topics ?? [],
    primary_category: d.primary_category ?? 'large-language-models',
    pushed_at: d.pushed_at,
    description: d.description,
  });
  for (const t of (d.topics ?? [])) allTopics[t] = (allTopics[t] ?? 0) + 1;
  if (d.language) allLanguages[d.language] = (allLanguages[d.language] ?? 0) + 1;
}

manifest.sort((a, b) => b.stars - a.stars);
writeFileSync(join(DATA_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

const topicsArr = Object.entries(allTopics).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
writeFileSync(join(DATA_DIR, 'topics.json'), JSON.stringify(topicsArr, null, 2));

const langsArr = Object.entries(allLanguages).map(([lang, count]) => ({ lang, count })).sort((a, b) => b.count - a.count);
writeFileSync(join(DATA_DIR, 'languages.json'), JSON.stringify(langsArr, null, 2));

console.log(`✅ Rebuilt manifest: ${manifest.length} repos | ${topicsArr.length} topics | ${langsArr.length} languages`);
