// Static robots.txt endpoint — SSG
// Section 5.5 / 10.1 requirement

export const prerender = true;

export function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: https://aipromptsmall.shop/sitemap-index.xml
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
