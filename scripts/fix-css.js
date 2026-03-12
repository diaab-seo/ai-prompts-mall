import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));

function processDir(dir) {
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.astro')) {
      let content = readFileSync(fullPath, 'utf8');
      let changed = false;

      // Ensure rc-footer flex-wraps
      const originalRCFooter = /\.rc-footer\s*{\s*display:\s*flex;\s*align-items:\s*center;\s*justify-content:\s*space-between;\s*gap:\s*0\.5rem;\s*margin-top:\s*auto;\s*}/;
      if (originalRCFooter.test(content)) {
        content = content.replace(originalRCFooter, '.rc-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: auto; flex-wrap: wrap; }');
        changed = true;
      }

      // Ensure t-footer flex-wraps (trending)
      const originalTFooter = /\.t-footer\s*{\s*display:\s*flex;\s*align-items:\s*center;\s*justify-content:\s*space-between;\s*gap:\s*0\.5rem;\s*}/;
      if (originalTFooter.test(content)) {
        content = content.replace(originalTFooter, '.t-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }');
        changed = true;
      }

      // Ensure rc-pills flex-wraps
      const originalRCPills = /\.rc-pills\s*{\s*display:\s*flex;\s*gap:\s*0\.375rem;\s*}/g;
      if (originalRCPills.test(content)) {
        content = content.replace(/\.rc-pills\s*{\s*display:\s*flex;\s*gap:\s*0\.375rem;\s*}/g, '.rc-pills { display: flex; gap: 0.375rem; flex-wrap: wrap; }');
        changed = true;
      }

      // Fix topic pill truncation
      const originalRCTopic = /\.rc-topic\s*{\s*display:\s*inline-block;\s*padding:\s*0\.15rem\s+0\.5rem;\s*border-radius:\s*100px;\s*font-size:\s*0\.6875rem;\s*font-weight:\s*500;\s*background:\s*var\(--color-accent-light\);\s*color:\s*var\(--color-accent\);\s*text-decoration:\s*none;\s*}/g;
      if (originalRCTopic.test(content)) {
        content = content.replace(
          /\.rc-topic\s*{\s*display:\s*inline-block;\s*padding:\s*0\.15rem\s+0\.5rem;\s*border-radius:\s*100px;\s*font-size:\s*0\.6875rem;\s*font-weight:\s*500;\s*background:\s*var\(--color-accent-light\);\s*color:\s*var\(--color-accent\);\s*text-decoration:\s*none;\s*}/g,
          '.rc-topic { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 100px; font-size: 0.6875rem; font-weight: 500; background: var(--color-accent-light); color: var(--color-accent); text-decoration: none; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }'
        );
        changed = true;
      }

      const originalTTopic = /\.rc-topic\s*{\s*display:\s*inline-block;\s*padding:\s*0\.15rem\s+0\.5rem;\s*border-radius:\s*100px;\s*font-size:\s*0\.6875rem;\s*font-weight:\s*500;\s*background:\s*var\(--color-accent-light\);\s*color:\s*var\(--color-accent\);\s*text-decoration:\s*none;\s*transition:\s*opacity\s*0\.15s;\s*}/g;
      if (originalTTopic.test(content)) {
        content = content.replace(
          /\.rc-topic\s*{\s*display:\s*inline-block;\s*padding:\s*0\.15rem\s+0\.5rem;\s*border-radius:\s*100px;\s*font-size:\s*0\.6875rem;\s*font-weight:\s*500;\s*background:\s*var\(--color-accent-light\);\s*color:\s*var\(--color-accent\);\s*text-decoration:\s*none;\s*transition:\s*opacity\s*0\.15s;\s*}/g,
          '.rc-topic { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 100px; font-size: 0.6875rem; font-weight: 500; background: var(--color-accent-light); color: var(--color-accent); text-decoration: none; transition: opacity 0.15s; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }'
        );
        changed = true;
      }

      if (changed) {
        writeFileSync(fullPath, content);
        console.log('✅ Fixed CSS in', fullPath);
      }
    }
  }
}

processDir(join(__dir, '../src/pages'));
