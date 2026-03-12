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

      // Ensure margin-bottom: auto is REMOVED from .repo-card completely 
      // and height: 100% is SET.
      const mbMatch = /\.repo-card\s*{(.*)margin-bottom:\s*auto;/g;
      if (content.match(mbMatch)) {
        content = content.replace(mbMatch, '.repo-card {$1height: 100%;');
        changed = true;
      }
      
      const mbMatchInline = /\.repo-card\s*{(.*)margin-bottom: auto;\s*/g;
      if (content.match(mbMatchInline)) {
        content = content.replace(mbMatchInline, '.repo-card {$1height: 100%; ');
        changed = true;
      }
      
      // If we manually added margin-bottom: auto to headers, let's reverse that as well
      if (content.match(/\.rc-header:not\(:has\(~ \.rc-desc\)\) { margin-bottom: auto; }/)) {
         content = content.replace(/\.rc-header:not\(:has\(~ \.rc-desc\)\) { margin-bottom: auto; }/, '');
         changed = true;
      }


      if (changed) {
        writeFileSync(fullPath, content);
        console.log('✅ Final cleanup on:', fullPath);
      }
    }
  }
}

processDir(join(__dir, '../src'));
