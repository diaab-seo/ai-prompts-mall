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

      // 1. Revert flex-wrap on rc-footer, t-footer, rc-topics completely
      const flexWrapRegex = /flex-wrap:\s*wrap;/g;
      if (content.match(flexWrapRegex)) {
         content = content.replace(flexWrapRegex, '');
         changed = true;
      }
      
      // 2. Revert rc-topic truncation changes
      const rcTopicMatch = /\.rc-topic {([^}]*)max-width:\s*100%;([^}]*)overflow:\s*hidden;([^}]*)text-overflow:\s*ellipsis;([^}]*)white-space:\s*nowrap;/g;
      if (content.match(rcTopicMatch)) {
         content = content.replace(/max-width:\s*100%;/g, '');
         content = content.replace(/overflow:\s*hidden;/g, '');
         content = content.replace(/text-overflow:\s*ellipsis;/g, '');
         content = content.replace(/white-space:\s*nowrap;/g, '');
         changed = true;
      }

      if (changed) {
        writeFileSync(fullPath, content);
        console.log('✅ REVERTED flex-wrap logic entirely in:', fullPath);
      }
    }
  }
}

processDir(join(__dir, '../src'));
