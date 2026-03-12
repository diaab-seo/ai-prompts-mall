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

      // 1. Fix CSS grid overlap bug by forcing li to flex, a to flex:1 and removing margin-top: auto
      const cssGridMatch = /\.repo-grid\s*{\s*([^}]+)\s*}/g;
      if (content.match(cssGridMatch) && !content.includes('.repo-grid li { display: flex; }')) {
        content = content.replace(/\.repo-grid /, '.repo-grid li { display: flex; }\n  .repo-grid ');
        changed = true;
      }
      
      const repoCardMatch = /(\.repo-card\s*{[^}]*)height:\s*100%;/g;
      if (content.match(repoCardMatch)) {
        content = content.replace(repoCardMatch, '$1flex: 1;');
        changed = true;
      }

      // 2. Fix margin-top: auto causing bottom overflow in flex
      // Instead of relying on flex: 1 for description, apply margin-bottom: auto logic
      if (content.includes('.rc-desc {') && content.includes('flex: 1;')) {
        content = content.replace(/flex: 1;/, 'margin-bottom: auto;');
        changed = true;
      }
      
      // If rc-desc doesn't exist, we fallback by adding margin-bottom: auto to the header
      if (content.match(/\.rc-header\s*{/)) {
        if (!content.includes('.rc-header:not(:has(~ .rc-desc))')) {
          content = content.replace(/\.rc-header\s*{([^}]+)}/, '.rc-header { $1 }\n  .rc-header:not(:has(~ .rc-desc)) { margin-bottom: auto; }');
          changed = true;
        }
      }

      // Remove any lingering margin-top: auto from footers which breaks flex overflow
      if (content.includes('margin-top: auto;')) {
        content = content.replace(/margin-top:\s*auto;/g, '');
        changed = true;
      }

      // 3. Fix 404 links to Owners by lowercasing the API logins exactly
      if (content.includes('href={`/owner/${ownerObj.login}`}')) {
        content = content.replace(/href={`\/owner\/\${ownerObj.login}`}/g, 'href={`/owner/${ownerObj.login.toLowerCase()}`}');
        changed = true;
      }
      if (content.includes('href={`/owner/${login}`}')) {
        content = content.replace(/href={`\/owner\/\${login}`}/g, 'href={`/owner/${login.toLowerCase()}`}');
        changed = true;
      }

      if (changed) {
        writeFileSync(fullPath, content);
        console.log('✅ Applied fixes to:', fullPath);
      }
    }
  }
}

processDir(join(__dir, '../src'));
