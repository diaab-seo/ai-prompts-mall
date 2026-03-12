/**
 * Pagination helpers — Section 4.2 / Section 5.3 specification.
 */

export const REPOS_PER_PAGE = 24;

export interface PaginationResult<T> {
  items: T[];
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function paginate<T>(items: T[], page: number, perPage = REPOS_PER_PAGE): PaginationResult<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safeP = Math.min(Math.max(1, page), totalPages);
  const start = (safeP - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    totalPages,
    currentPage: safeP,
    hasNext: safeP < totalPages,
    hasPrev: safeP > 1,
  };
}

export function generatePagePaths(slug: string, totalItems: number, perPage = REPOS_PER_PAGE) {
  const n = Math.max(1, Math.ceil(totalItems / perPage));
  return Array.from({ length: n }, (_, i) => ({
    params: { slug, n: String(i + 1) },
  }));
}
