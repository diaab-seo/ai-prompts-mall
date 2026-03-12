/**
 * GitHub API client with authentication, rate-limit handling, and exponential backoff.
 * Section 2.3 + Section 4.3 specification.
 */

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
const BASE_URL = 'https://api.github.com';

if (!GITHUB_TOKEN) {
  console.warn('[github.ts] GITHUB_TOKEN not set — using unauthenticated rate limit (60 req/hr)');
}

function makeHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'aipromptsmall.shop/1.0',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchWithBackoff(url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, { headers: makeHeaders() });

  if (res.status === 403 || res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60');
    const delay = retryAfter * 1000 + Math.random() * 1000 * 2 ** attempt;
    console.warn(`[github.ts] Rate limited — retrying in ${Math.round(delay / 1000)}s`);
    await new Promise((r) => setTimeout(r, delay));
    if (attempt < 5) return fetchWithBackoff(url, attempt + 1);
    throw new Error(`GitHub API rate limit exceeded after ${attempt} retries`);
  }

  return res;
}

export async function githubGet<T>(path: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetchWithBackoff(url);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`GitHub API error: ${res.status} ${res.statusText}`), {
      status: res.status,
      body: err,
    });
  }

  return res.json() as Promise<T>;
}

export async function searchRepos(query: string, page = 1, perPage = 100) {
  const encoded = encodeURIComponent(query);
  return githubGet<{
    total_count: number;
    items: Array<Record<string, unknown>>;
  }>(`/search/repositories?q=${encoded}&sort=stars&order=desc&per_page=${perPage}&page=${page}`);
}

export async function getRepo(owner: string, repo: string) {
  return githubGet<Record<string, unknown>>(`/repos/${owner}/${repo}`);
}

export async function getReadme(owner: string, repo: string, branch = 'main') {
  try {
    const data = await githubGet<{ content: string; encoding: string }>(
      `/repos/${owner}/${repo}/readme`,
    );
    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return data.content;
  } catch {
    return null;
  }
}

export async function getCommits(owner: string, repo: string, perPage = 100) {
  return githubGet<Array<Record<string, unknown>>>(
    `/repos/${owner}/${repo}/commits?per_page=${perPage}`,
  );
}

export async function getContributors(owner: string, repo: string) {
  return githubGet<Array<Record<string, unknown>>>(
    `/repos/${owner}/${repo}/contributors?per_page=10`,
  );
}

export async function getReleases(owner: string, repo: string) {
  return githubGet<Array<Record<string, unknown>>>(
    `/repos/${owner}/${repo}/releases?per_page=5`,
  );
}

export async function getLanguages(owner: string, repo: string) {
  return githubGet<Record<string, number>>(`/repos/${owner}/${repo}/languages`);
}
