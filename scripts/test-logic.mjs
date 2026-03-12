import { readFileSync } from 'node:fs';

const m = JSON.parse(readFileSync('./src/data/manifest.json', 'utf8'));
const t = JSON.parse(readFileSync('./src/data/topics.json', 'utf8'));

const e = t.filter(x => x.count >= 2).slice(0, 500);
console.log('First topic:', e[0]);

for (const { tag } of e) {
  const r = m.filter(x => x.topics && x.topics.includes(tag));
  if (tag === 'langchain') {
    console.log('langchain repos:', r.length, 'pages:', Math.ceil(r.length / 30));
  }
}
