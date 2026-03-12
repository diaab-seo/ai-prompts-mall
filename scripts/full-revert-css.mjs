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

      // 1. Revert .repo-grid li flex forcing
      const flexLiMatch = /\.repo-grid li \{ display: flex; \}\n  /g;
      if (flexLiMatch.test(content)) {
        content = content.replace(flexLiMatch, '');
        changed = true;
      }
      
      const inlineFlexLiMatch = /\.repo-grid li \{ display: flex; \}/g;
      if (inlineFlexLiMatch.test(content)) {
          content = content.replace(inlineFlexLiMatch, '');
          changed = true;
      }

      // 2. Add margin-top: auto back to footers
      const footerRegex = /(\.rc-footer\s*{\s*display:\s*flex;\s*align-items:\s*center;\s*justify-content:\s*space-between;\s*gap:\s*0\.5rem;(?![\s\S]*margin-top:\s*auto;))/;
      if (footerRegex.test(content)) {
        content = content.replace(footerRegex, '$1\n    margin-top: auto;');
        changed = true;
      }
      
      const inlineFooterRegex = /(\.rc-footer\s*{\s*display:\s*flex;\s*align-items:\s*center;\s*justify-content:\s*space-between;\s*gap:\s*0\.5rem;)(?!\s*margin-top:\s*auto;)/;
      if (inlineFooterRegex.test(content)) {
          content = content.replace(inlineFooterRegex, '$1 margin-top: auto;');
          changed = true;
      }


      if (changed) {
        writeFileSync(fullPath, content);
        console.log('✅ Fully Reverted structure logic in:', fullPath);
      }
    }
  }
}

processDir(join(__dir, '../src'));
