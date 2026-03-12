#!/usr/bin/env node
/**
 * scripts/generate-topics.mjs — Aggregate topics from manifest.json
 * Run after fetch-github-data.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'src', 'data');

const manifest = JSON.parse(readFileSync(join(DATA_DIR, 'manifest.json'), 'utf-8'));

const topics = {};
const languages = {};

for (const repo of manifest) {
  for (const tag of (repo.topics ?? [])) {
    topics[tag] = (topics[tag] ?? 0) + 1;
  }
  if (repo.language) {
    languages[repo.language] = (languages[repo.language] ?? 0) + 1;
  }
}

const topicsArr = Object.entries(topics)
  .map(([tag, count]) => ({ tag, count }))
  .sort((a, b) => b.count - a.count);

const langsArr = Object.entries(languages)
  .map(([lang, count]) => ({ lang, count }))
  .sort((a, b) => b.count - a.count);

writeFileSync(join(DATA_DIR, 'topics.json'), JSON.stringify(topicsArr, null, 2));
writeFileSync(join(DATA_DIR, 'languages.json'), JSON.stringify(langsArr, null, 2));

console.log(`✅ topics.json: ${topicsArr.length} topics | languages.json: ${langsArr.length} languages`);
