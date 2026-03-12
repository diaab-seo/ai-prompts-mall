/**
 * Schema.org JSON-LD builder functions — Section 5.1 + 5.2 specification.
 */

const SITE_URL = 'https://aipromptsmall.shop';

export function buildWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: SITE_URL,
    name: 'AI Prompts Mall',
    description:
      'Discover the best open-source AI tools, LLMs, agents, and frameworks from GitHub — curated and ranked.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildSoftwareApplicationSchema(repo: {
  full_name: string;
  description?: string;
  owner: { login: string; avatar_url: string; type: string };
  created_at: string;
  pushed_at: string;
  stargazers_count: number;
  forks_count: number;
  subscribers_count: number;
  license?: { spdx_id: string };
  language?: string;
  topics?: string[];
  homepage?: string;
  category: string;
  slug: string;
}) {
  const [owner, name] = repo.full_name.split('/');
  const url = `${SITE_URL}/repo/${repo.full_name}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: repo.full_name,
    url,
    description: repo.description,
    datePublished: repo.created_at,
    dateModified: repo.pushed_at,
    author: {
      '@type': repo.owner.type === 'Organization' ? 'Organization' : 'Person',
      name: repo.owner.login,
      url: `${SITE_URL}/owner/${repo.owner.login}`,
      image: repo.owner.avatar_url,
    },
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/WatchAction',
        userInteractionCount: repo.stargazers_count,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ForkAction',
        userInteractionCount: repo.forks_count,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/FollowAction',
        userInteractionCount: repo.subscribers_count,
      },
    ],
    license: repo.license?.spdx_id,
    programmingLanguage: repo.language,
    applicationCategory: repo.category,
    keywords: repo.topics?.join(', '),
    ...(repo.stargazers_count >= 100 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Math.min(5, 1 + Math.log10(repo.stargazers_count) * 0.8).toFixed(1),
        ratingCount: repo.stargazers_count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
  };
}

export function buildCollectionPageSchema(params: {
  name: string;
  description: string;
  url: string;
  items?: Array<{ name: string; url: string }>;
  numberOfItems?: number;
  dateModified?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: params.name,
    description: params.description,
    url: params.url,
    dateModified: params.dateModified ?? new Date().toISOString(),
    ...(params.items
      ? {
          hasPart: {
            '@type': 'ItemList',
            numberOfItems: params.items.length,
            itemListElement: params.items.map((item, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: item.name,
              url: item.url,
            })),
          },
        }
      : params.numberOfItems !== undefined
      ? { hasPart: { '@type': 'ItemList', numberOfItems: params.numberOfItems } }
      : {}),
  };
}

export function buildBreadcrumbSchema(crumbs: Array<{ label: string; href: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: `${SITE_URL}${c.href}`,
    })),
  };
}
