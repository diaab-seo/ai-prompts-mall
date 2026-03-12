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

      // Revert margin-bottom: auto on rc-desc back to flex: 1
      const rmDescMatch = /margin-bottom:\s*auto;/g;
      
      const rcDescMatch = /\.rc-desc\s*{\s*([^}]*)margin-bottom:\s*auto;\s*/g;
      if (content.match(rcDescMatch)) {
        content = content.replace(rcDescMatch, '.rc-desc { $1flex: 1;');
        changed = true;
      }
      
      const tDescMatch = /\.t-desc\s*{\s*([^}]*)margin-bottom:\s*auto;\s*/g;
      if (content.match(tDescMatch)) {
        content = content.replace(tDescMatch, '.t-desc { $1flex: 1;');
        changed = true;
      }
      
      const marginCardMatch = /\.repo-card\s*{(.*)margin-bottom:\s*auto;/g;
      if (content.match(marginCardMatch)) {
        content = content.replace(marginCardMatch, '.repo-card {$1height: 100%;');
        changed = true;
      }

      if (changed) {
        writeFileSync(fullPath, content);
        console.log('✅ Reverted flex -> margin-bottom fix in:', fullPath);
      }
    }
  }
}

processDir(join(__dir, '../src'));
