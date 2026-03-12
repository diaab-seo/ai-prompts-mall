/**
 * URL slug generator — converts arbitrary text to URL-safe lowercase slugs.
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word chars except hyphens
    .replace(/[\s_]+/g, '-')  // spaces/underscores → hyphens
    .replace(/-+/g, '-')      // collapse multiple hyphens
    .replace(/^-|-$/g, '');   // strip leading/trailing hyphens
}

/** Generate the filesystem-safe owner__repo key */
export function repoKey(owner: string, repo: string): string {
  return `${owner}__${repo}`;
}
