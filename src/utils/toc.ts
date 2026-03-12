/**
 * TOC extraction from README HTML — Section 6.5 specification.
 * Extracts h2/h3 headings, generates anchor IDs, returns ordered list.
 */

import { slugify } from './slugify.js';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function extractToc(html: string): TocItem[] {
  const headingRegex = /<h([23])[^>]*id="([^"]+)"[^>]*>([^<]+)<\/h[23]>/gi;
  const fallbackRegex = /<h([23])[^>]*>([^<]+)<\/h[23]>/gi;
  const items: TocItem[] = [];

  // Prefer pre-generated IDs (from rehype-slug)
  let match: RegExpExecArray | null;
  let hasIds = false;
  while ((match = headingRegex.exec(html)) !== null) {
    hasIds = true;
    items.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3].trim(),
    });
  }

  // Fallback: generate IDs from text
  if (!hasIds) {
    while ((match = fallbackRegex.exec(html)) !== null) {
      const text = match[2].trim();
      items.push({
        level: parseInt(match[1]),
        id: slugify(text),
        text,
      });
    }
  }

  return items;
}

/**
 * Inject id= attributes into h2/h3 elements in HTML if not already present.
 * Ensures anchor links and TOC entries align.
 */
export function injectHeadingIds(html: string): string {
  return html.replace(/<(h[23])([^>]*)>([^<]+)<\/h[23]>/gi, (_, tag, attrs, text) => {
    if (/id=/.test(attrs)) return _; // already has id
    const id = slugify(text.trim());
    return `<${tag}${attrs} id="${id}">${text}</${tag}>`;
  });
}
