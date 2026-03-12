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

      // Fix .rc-desc flex -> margin-bottom
      const descMatch = /\.rc-desc\s*{\s*([^}]*)flex:\s*1;\s*/g;
      if (content.match(descMatch)) {
        content = content.replace(descMatch, '.rc-desc { $1margin-bottom: auto;');
        changed = true;
      }
      
      const tDescMatch = /\.t-desc\s*{\s*([^}]*)flex:\s*1;\s*/g;
      if (content.match(tDescMatch)) {
        content = content.replace(tDescMatch, '.t-desc { $1margin-bottom: auto;');
        changed = true;
      }

      if (changed) {
        writeFileSync(fullPath, content);
        console.log('✅ Applied flex -> margin-bottom fix to:', fullPath);
      }
    }
  }
}

processDir(join(__dir, '../src'));
