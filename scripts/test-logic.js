const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('./src/data/manifest.json'));
const topics = JSON.parse(fs.readFileSync('./src/data/topics.json'));

const eligibleTopics = topics.filter(t => t.count >= 2).slice(0, 500);
console.log('first eligible topic:', eligibleTopics[0]);

for (const { tag } of eligibleTopics) {
  const repos = manifest.filter(r => r.topics && r.topics.includes(tag));
  const totalPages = Math.ceil(repos.length / 30);
  if (tag === 'langchain') {
    console.log('langchain has', repos.length, 'repos, total pages:', totalPages);
  }
}
