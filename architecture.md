# aipromptmall.shop — pSEO Platform

#### Full Architecture & Implementation Deliverables for Antigravity IDE

Stack: Astro 4 · Cloudflare Adapter · PageFind · GitHub REST API · Schema.org

x

## 1. Project Overview & Strategic Intent

This document is a complete, implementation-ready specification for a 10,000 page

programmatic SEO platform in the AI / LLM / Agents vertical, powered by the free GitHub REST API

as the primary data source. Every section is a direct deliverable for Antigravity IDE.

```
Parameter Value
```
```
Domain aipromptmall.shop
```
```
Target vertical AI · LLMs · Agents · Embeddings · RAG ·
Fine-tuning · Multimodal · AI Infra
```
```
Primary data source GitHub REST API v3 (unauthenticated = 60
req/hr; authenticated = 5,000 req/hr)
```
```
Framework Astro 4.x with Cloudflare Adapter Hybrid SSG +
On-Demand SSR
```
```
Search PageFind (static, client-side full-text)
```
```
Target indexed pages 10,000 at launch, scalable to 50,000
```
```
Rendering strategy SSG for collection/index pages; SSR on-demand
for real-time repo detail
```
```
Sitemap strategy Custom static sitemap builder script NOT
@astrojs/sitemap canary)
```
```
Deployment Cloudflare Pages + Workers
```
## 2. Data Architecture — GitHub API Data Model

The entire content graph is derived from GitHub API endpoints. Below is the complete field

mapping that drives page generation.


### 2.1 Primary Entity: Repository

Each repository becomes one detail page. The following fields must be fetched and stored in the

local JSON/SQLite cache layer:

```
API Field SEO Usage Widget Usage
```
```
full_name URL slug, <title>, H1 Breadcrumb, card header
```
```
description Meta description (truncated
155c)
```
```
Hero summary
```
```
stargazers_count Schema aggregateRating, page
freshness
```
```
StarMeter widget
```
```
forks_count Schema interactionStatistic ForkBar widget
```
```
open_issues_count Page freshness signal IssueCount badge
```
```
watchers_count Schema interactionStatistic WatcherPill badge
```
```
language Collection taxonomy / facet LanguageBadge
```
```
topics[] Internal link clusters, tag pages TopicCloud widget
```
```
license.spdx_id Schema license field LicenseBadge
```
```
pushed_at Schema dateModified, freshness LastCommit widget
```
```
created_at Schema datePublished CreatedAge pill
```
```
owner.login Schema author, org pages OwnerCard widget
```
```
owner.avatar_url Schema image Or ganization) OwnerAvatar
```
```
homepage Schema url, ExternalLink LiveDemo button
```
```
size Repo size badge SizeIndicator
```
```
default_branch README fetch branch Internal
```
```
archived Conditional content warning ArchivedBanner
```
```
network_count Fork network signal NetworkStat
```
```
subscribers_count Schema followCount FollowerCount
```
### 2.2 Secondary Entities (fetched per repo)

```
Endpoint Data Points Used
```

##### GET

```
/repos/{owner}/{repo}/commits?per_page=
```
```
Latest commit SHA, date, author, message —
drives "Last Activity" widget
```
```
GET
/repos/{owner}/{repo}/commits?per_page=
```
```
Commit frequency sparkline data (last 100
commits)
```
```
GET /repos/{owner}/{repo}/readme Base64-decoded README for content
extraction & ToC generation
```
##### GET

```
/repos/{owner}/{repo}/contributors?per_page=
0
```
```
Top-10 contributors for ContributorGrid widget
```
##### GET

```
/repos/{owner}/{repo}/releases?per_page=
```
```
Latest releases for ReleaseTimeline widget
```
```
GET /repos/{owner}/{repo}/languages Language breakdown object for
LanguagePieChart widget
```
##### GET

```
/repos/{owner}/{repo}/contents/package.json
(or requirements.txt)
```
```
Dependency extraction for DependencyList
widget
```
```
GET /search/repositories?q=topic:{topic} Related repos for "Similar Tools" section
```
```
GET /orgs/{org} Organization metadata for OrgCard
```
```
GET /users/{username} Author profile for individual repo owners
```
### 2.3 Data Fetch & Cache Strategy

The GitHub free tier 60 req/hr unauthenticated) is insufficient for 10K pages. The following

pipeline must be implemented:

1. Create a GitHub Personal Access Token PAT — free, gives 5,000 req/hr. Store in
    Cloudflare secret: GITHUB_TOKEN.
2. Build a Node.js data-fetch script: scripts/fetch-github-data.mjs. This runs at build time (or
    via a Cloudflare Cron trigger for refresh).
3. Output format: one JSON file per repository saved to src/data/repos/{owner}__{repo}.json.
    Filename uses double-underscore as owner/repo separator to be filesystem-safe.
4. A root manifest file src/data/manifest.json lists all fetched repos with their slug, category,
    stars, language, and topics for collection page generation without loading all individual
    files.
5. Implement exponential backoff with jitter on rate-limit responses HTTP 403 or 429.
    Respect Retry-After header.


6. For the README field: decode base64, strip frontmatter YAML, parse Markdown to HTML
    using unified/remark. Store the parsed HTML in the JSON file under readme_html key.
7. Delta-fetch on subsequent builds: compare pushed_at from manifest against stored
    pushed_at; only refetch changed repos. This enables fast incremental builds.

```
⚑ Token Strategy
Use GITHUB_TOKEN env var in local dev via .env file. In Cloudflare Pages, add as an encrypted
Environment Variable. Never commit the token. The fetch script must read
process.env.GITHUB_TOKEN and fall back to unauthenticated with a warning.
```
### 2.4 AI Vertical Taxonomy — Seed Query List

The fetch script must query these GitHub topic/search terms to populate the 10K repo dataset:

```
Category Slug GitHub Search Query Est. Repos
```
```
large-language-models topic:llm OR
topic:large-language-model
stars:>
```
##### 2,000

```
ai-agents topic:ai-agent OR
topic:autonomous-agent
stars:>
```
##### 1,200

```
rag-retrieval topic:rag OR
topic:retrieval-augmented-gener
ation stars:>
```
##### 800

```
vector-databases topic:vector-database OR
topic:embeddings stars:>
```
##### 600

```
prompt-engineering topic:prompt-engineering OR
topic:prompts stars:>
```
##### 1,400

```
fine-tuning topic:fine-tuning OR topic:lora
OR topic:qlora stars:>
```
##### 700

```
multimodal-ai topic:multimodal OR
topic:vision-language-model
stars:>
```
##### 500

```
ai-infrastructure topic:mlops OR
topic:ai-infrastructure stars:>
```
##### 600

```
ai-frameworks topic:langchain OR
topic:llamaindex OR
topic:haystack stars:>
```
##### 400


```
open-source-llms topic:open-source-llm OR
topic:llama OR topic:mistral
stars:>
```
##### 800

```
ai-datasets topic:ai-dataset OR
topic:nlp-dataset stars:>
```
##### 500

```
ai-evaluation topic:llm-evaluation OR
topic:benchmark stars:>
```
##### 400

```
ai-safety topic:ai-safety OR
topic:alignment stars:>
```
##### 300

```
ai-applications topic:ai-app OR topic:chatbot
stars:>
```
##### 1,000

## 3. Site Architecture & URL Taxonomy

All URLs must be clean, lowercase, hyphen-separated, and canonical. No trailing slashes (enforce

via Cloudflare redirect rule).

### 3.1 Route Map

```
URL Pattern Page Type & Rendering Mode
```
```
/ Homepage — SSG — Category hub with
featured repos
```
```
/category/[slug] Category index — SSG — paginated list of repos
in that category
```
```
/category/[slug]/page/[n] Paginated category page — SSG — canonical
with rel=prev/next
```
```
/repo/[owner]/[repo] Repository detail — SSR On-Demand — full data
page
```
```
/topic/[tag] Topic tag page — SSG — repos grouped by
GitHub topic
```
```
/language/[lang] Language filter page — SSG — repos filtered by
primary language
```
```
/compare/[slug-a]/vs/[slug-b] Head-to-head comparison — SSR On-Demand
— two repos side by side
```

```
/owner/[login] Owner/Org page — SSR On-Demand — all
repos by one owner
```
```
/trending Trending page — SSR On-Demand —
top-gaining repos last 7 days
```
```
/search PageFind search UI — SSG shell with client-side
PageFind runtime
```
```
/sitemap.xml Static sitemap index — SSG — generated by
custom build script
```
```
/sitemap-[n].xml Sitemap shards (max 50K URLs each) — SSG
```
```
/robots.txt Static — allow all, list sitemaps
```
### 3.2 File System Layout Astro src/ structure)

Deliver this exact directory structure to Antigravity IDE

src/

pages/

index.astro # Homepage

category/

[slug].astro # Category SSG - getStaticPaths()

[slug]/page/[n].astro # Paginated SSG

repo/

[owner]/

[repo].astro # SSR on-demand - export const prerender = false

topic/

[tag].astro # Topic tag SSG

language/

[lang].astro # Language filter SSG

compare/

[slugA]/vs/[slugB].astro # SSR on-demand comparison

owner/

[login].astro # SSR on-demand owner page

trending.astro # SSR on-demand

search.astro # SSG shell

robots.txt.ts # Static endpoint

sitemap-index.xml.ts # Custom static sitemap index

sitemap-[n].xml.ts # Custom sharded sitemaps

layouts/

Base.astro # HTML shell, theme, skip-links

RepoDetail.astro # Layout for /repo/* pages

CategoryIndex.astro # Layout for /category/* pages


ComparisonLayout.astro # Layout for /compare/* pages

components/

navigation/

GlobalNav.astro # No headings — aria-label only

Breadcrumb.astro # Schema BreadcrumbList JSON-LD

CategorySidebar.astro # No headings — list only

FooterConditional.astro # Conditional links based on page type

widgets/

StarMeter.astro # Stars with sparkline

ForkBar.astro # Fork count visual

LanguagePieChart.astro # D3 or CSS pie

CommitSparkline.astro # SVG sparkline from commit dates

ContributorGrid.astro # Avatar grid top-

ReleaseTimeline.astro # Latest 5 releases

TopicCloud.astro # Topic tags as linked pills

DependencyList.astro # package.json / requirements.txt

LastActivity.astro # Last commit relative time

LicenseBadge.astro # SPDX license pill

ReadmeRenderer.astro # Sanitized README HTML + anchor IDs

TocGenerator.astro # Auto-TOC from README headings

SimilarRepos.astro # Related repos carousel

CompareTable.astro # Side-by-side stat table

OwnerCard.astro # Avatar + bio card

TrendingBadge.astro # "Trending" pill if stars gained rapidly

seo/

JsonLd.astro # Generic JSON-LD injector

MetaTags.astro # OG, Twitter, canonical, robots meta

BreadcrumbSchema.astro # BreadcrumbList schema generator

ui/

ThemeToggle.astro # Light / Dark / System toggle

JumpLinks.astro # In-page anchor links from TOC

SearchBar.astro # PageFind search input

Pagination.astro # Prev/Next with rel links

CategoryCard.astro # Repo card for index pages

SkipLink.astro # Accessibility skip to main

data/

manifest.json # Index of all repos (no readme, minimal fields)

repos/ # One JSON per repo: {owner}__{repo}.json

categories.json # Category metadata + slug + desc

topics.json # All unique topics with counts

languages.json # All unique languages with counts

styles/

global.css # CSS custom properties, typography tokens

theme.css # Light/dark color palette tokens

typography.css # Heading scale, line-height, letter-spacing


utils/

github.ts # GitHub API client with rate-limit handling

schema.ts # Schema.org JSON-LD builders

slugify.ts # URL slug generator

toc.ts # TOC extraction from HTML

pagination.ts # Pagination helpers

freshness.ts # Repo freshness scoring

scripts/

fetch-github-data.mjs # Build-time data fetcher

generate-sitemaps.mjs # Static sitemap generator

generate-topics.mjs # Aggregate topics from manifest

## 4. Rendering Architecture — Hybrid SSG + SSR

### 4.1 Astro Configuration (astro.config.mjs)

Required configuration directives (describe only, no code):

- output: "hybrid" — enables both SSG and SSR in same project
- adapter: cloudflare({ mode: "directory" }) — Cloudflare Pages with _worker.js output
- site: "https://aipromptmall.shop" — required for canonical URL generation
- trailingSlash: "never" — enforced at Astro level
- prefetch: true — Astro prefetch for internal links
- compressHTML true — production HTML minification
- vite.build.chunkSizeWarningLimit: 600 — suppress large chunk warnings for PageFind
- integrations: [pagefind()] — PageFind Astro integration

### 4.2 SSG Pages — getStaticPaths() Contract

Every SSG route must implement getStaticPaths() reading from src/data/manifest.json. The

manifest must be loaded once using fs.readFileSync (build-time) not fetch(). This avoids network

calls during Astro build.

```
Route getStaticPaths() Data Source
```
```
/category/[slug] categories.json — one path per category slug
```
```
/topic/[tag] topics.json — one path per topic with count > 5
```

```
/language/[lang] languages.json — one path per language with
count > 10
```
```
/category/[slug]/page/[n] Computed from manifest, 24 repos per page,
generates n paths
```
### 4.3 SSR On-Demand Pages — Runtime Contract

SSR pages must export const prerender = false at the top of the file. They accept Astro.params

and fetch from the GitHub API at runtime using the utils/github.ts client. They must:

- Read GITHUB_TOKEN from import.meta.env.GITHUB_TOKEN Cloudflare env binding)
- Return a 404 response if the GitHub API returns 404
- Return a 503 with Retry-After header if rate-limited
- Cache successful responses using Cloudflare Cache API with cache-control
    max-age=
- Never block render on secondary API calls — use Promise.allSettled() for
    contributor/release/language endpoints

## 5. SEO Architecture

### 5.1 Schema.org JSONLD — Per Page Type

Every page must inject its schema via the JsonLd.astro component in the <head>. The schema

must be valid and complete. Below is the required schema type per page:

```
Page Type Primary Schema Type Key Properties
```
```
Homepage WebSite + SearchAction url, name, description,
potentialAction Se archAction for
sitelinks searchbox)
```
```
/category/[slug] CollectionPage name, description, url,
breadcrumb, hasPart I temList of
repos), dateModified
```
```
/repo/[owner]/[repo] SoftwareApplication name, description, url, author
P erson/Organization),
datePublished, dateModified,
interactionStatistic (stars, forks,
watchers), license,
programmingLanguage,
applicationCategory, keywords,
```

```
offers F ree, aggregateRating if
stars > 100
```
```
/topic/[tag] CollectionPage name, description, url,
breadcrumb, hasPart ItemList
```
```
/language/[lang] CollectionPage name, description, url,
breadcrumb, hasPart ItemList
```
```
/compare/[a]/vs/[b] WebPage + ItemList name, description, url, about
(two SoftwareApplication refs)
```
```
/owner/[login] ProfilePage name, url, mainEntity P erson or
Organization), hasPart I temList
repos)
```
```
/trending ItemList name, url, itemListElement
(ordered repo list with position)
```
```
All pages BreadcrumbList Nested BreadcrumbList matching
visible breadcrumb trail
```
### 5.2 interactionStatistic Implementation

For SoftwareApplication on repo pages, implement all three interaction statistics to maximise

structured data richness:

- Type: WatchAction — count: stargazers_count (stars are a watch-type engagement)
- Type: ForkAction — count: forks_count
- Type: FollowAction — count: subscribers_count

### 5.3 Meta Tags — Required Per Page

```
Meta Tag Value Strategy
```
```
<title> Repo: "{repo_name} — {category} on GitHub |
Stars: {stars}" | Category: "Best {category}
Repos | AI Tools Directory" | Topic: "#{topic}
GitHub Repos — {count} Open Source Tools"
```
```
meta[name=description] Repo: first 155 chars of repo description,
fallback to first sentence of README. Category:
Generated from category metadata. Always end
with a call-to-action.
```

```
link[rel=canonical] Always self-referencing absolute URL. SSR
pages must compute from Astro.url.
```
```
meta[name=robots] index, follow for all pages. noindex for
paginated pages beyond page 3 (prevent thin
content).
```
```
og:title Same as <title> but without " | Stars: {n}" suffix
```
```
og:description Same as meta description
```
```
og:type website for all pages
```
```
og:image GitHub social preview image:
https://opengraph.githubassets.com/1/{owner}/{
repo} for repo pages
```
```
og:url Same as canonical
```
```
twitter:card summary_large_image for repo pages, summary
for others
```
```
link[rel=prev] / link[rel=next] Required on all paginated category/topic pages
```
### 5.4 Internal Link Architecture

A strong internal link graph is required for crawl budget efficiency and topical authority signaling.

Implement the following internal link rules:

#### On Repo Detail Pages (/repo/*)

- Breadcrumb: Home → Category → Repo Name 3 levels minimum)
- Every topic tag in TopicCloud links to /topic/[tag]
- Language badge links to /language/[lang]
- Owner name/avatar links to /owner/[login]
- SimilarRepos section: 6 contextually related repos linking to /repo/[owner]/[repo]
- "Compare" CTA button: links to /compare/[current]/vs/[most-similar]
- Category breadcrumb link: always present

#### On Category Index Pages (/category/*)

- Link to all sub-topic pages that have repos in this category
- Pagination: rel=prev / rel=next and visible page number links
- Each repo card links to its /repo/* detail page


- Sidebar links to all other categories (contextual cross-links)

#### Conditional Footer Links

The FooterConditional.astro component must render different link sets based on page type

(passed via prop):

```
Page Type Footer Link Set
```
```
Repo detail Link to category, link to all topics of this repo,
link to owner page, link to comparison page
```
```
Category index Links to all other categories, link to trending, link
to search
```
```
Topic page Link to parent category, links to related topics,
link to trending
```
```
Homepage Links to all 14 categories, link to trending, link to
all languages
```
```
Owner page Link to all repos by this owner (up to 10, link to
related owners
```
### 5.5 Sitemap Architecture Custom Static Generator)

DO NOT use @astrojs/sitemap. It is incompatible with hybrid rendering. Use a custom generator

script that runs as a post-build step.

8. scripts/generate-sitemaps.mjs reads src/data/manifest.json after the Astro build
    completes.
9. It generates sitemap-0.xml, sitemap-1.xml, etc., with a maximum of 49,999 URLs per file
    (safety margin below 50K limit).
10. Each <url> entry includes: <loc>, <lastmod> (from repo pushed_at or build date),
    <changefreq> (repo detail: weekly; category: daily; topic: weekly), <priority> (homepage:
    1.0; category: 0.9; repo: 0.7; topic: 0.6.
11. A sitemap-index.xml references all shard files. This file is placed in dist/ root after build.
12. robots.txt must reference the sitemap index URL Sitemap:
    https://aipromptmall.shop/sitemap-index.xml.
13. Cloudflare Pages _headers file must set Content-Type: application/xml for .xml files to
    ensure Google can parse them correctly.


```
⚑ Critical: Sitemap Readability
The canary version of @astrojs/sitemap has a known bug where it generates sitemaps as Astro
components that serve HTML rather than XML, causing Google Search Console to report "sitemap
could not be read." The custom script approach outputs raw XML files to dist/ and completely
bypasses this issue.
```
## 6. Component Specifications — Widgets

Each widget below is a standalone Astro component accepting typed props. All widgets must be

usable independently on any page type.

### 6.1 StarMeter Widget

```
Property Specification
```
```
Props stars: number, maxContext: number (highest
stars in category for relative width calculation)
```
```
Visual Horizontal bar filled proportionally, star count
formatted with K/M suffix (e.g., 12.4K. Color:
accent gradient.
```
```
Accessibility aria-label="12,400 GitHub stars" on the bar
element. Role: meter with aria-valuenow,
aria-valuemin=0, aria-valuemax.
```
```
Schema Emit interactionStatistic WatchAction block via
slot or parent page schema — do NOT inject
JSONLD inside widget (done at page level).
```
```
Animation CSS @keyframes width transition on first paint.
prefers-reduced-motion: reduce disables
animation.
```
### 6.2 CommitSparkline Widget

```
Property Specification
```
```
Props commits: Array<{date: string}> (last 100
commits from API
```
```
Visual Inline SVG sparkline showing commit frequency
over last 52 weeks GitHub contribution graph
style). Each week is one bar.
```

```
Computation Group commits by ISO week number. Normalize
bar heights to max commits per week. Empty
weeks render as faint bars.
```
```
Accessibility aria-label="Commit activity: {n} commits over
last 12 months". role=img on SVG.
```
```
Dark mode Bar fill color switches via CSS custom property:
var(--sparkline-fill).
```
### 6.3 LanguagePieChart Widget

```
Property Specification
```
```
Props languages: Record<string, number> (bytes per
language from API
```
```
Visual CSS conic-gradient pie chart (no D
dependency for simple case). Maximum 6
languages shown; rest grouped as "Other".
```
```
Legend Horizontal legend below chart with color
swatch, language name, and percentage.
```
```
Accessibility role=list on legend. Each item has
aria-label="Python: 67%". SVG/div has
aria-label describing top language.
```
### 6.4 ContributorGrid Widget

```
Property Specification
```
```
Props contributors: Array<{login, avatar_url,
contributions, html_url}>
```
```
Visual CSS grid of avatar circles 48px with
contribution count badge. On hover: tooltip with
login name.
```
```
Links Each avatar links to /owner/[login] (internal)
NOT to github.com/login (external), to preserve
link equity.
```
```
Lazy loading All avatar <img> elements must have
loading="lazy" and explicit width/height to
prevent CLS.
```
```
Accessibility alt="{login} — {n} contributions". ul/li structure
with role=list.
```

### 6.5 TocGenerator + JumpLinks

```
Property Specification
```
```
Input readme_html string from repo JSON data
```
```
Processing Extract all h2 and h3 elements from
readme_html. Generate anchor IDs using
slugify(headingText). Inject id= attributes into
the HTML before rendering.
```
```
Output An ordered list of {id, text, level} objects
rendered as a sticky sidebar Table of Contents
on desktop, a collapsible <details> on mobile.
```
```
Jump links Each TOC entry is an <a href="#{id}"> linking to
the corresponding heading. On click,
smooth-scroll to heading CSS scroll-behavior:
smooth; prefers-reduced-motion override:
auto).
```
```
Heading accessibility TOC links must NOT be inside <nav> — use
<aside aria-label="Table of contents">. The
main content area uses an <article> with
sequential h2/h3/h4 only (h1 is always the repo
name).
```
### 6.6 ReadmeRenderer Widget

```
Property Specification
```
```
Input readme_html: string (pre-parsed HTML from
build-time unified/remark pipeline)
```
```
Security Sanitize with DOMPurify (client-side) or
sanitize-html (build-time, preferred). Allow: all
standard HTML tags except <script>, <iframe>,
<object>, <embed>. Allow all attributes except
on*.
```
```
Images Replace all <img src="..."> with lazily loaded
versions. Resolve relative GitHub image URLs to
absolute:
https://raw.githubusercontent.com/{owner}/{rep
o}/{branch}/{path}.
```
```
Code blocks Apply syntax highlighting using Shiki (already
bundled with Astro). Shiki themes must match
```

```
site theme: github-dark for dark mode,
github-light for light mode.
```
```
External links All <a href> pointing to external domains: add
rel="noopener noreferrer" and target="_blank".
Internal GitHub links are rewritten to internal
/repo/* URLs where possible.
```
### 6.7 SimilarRepos Widget

```
Property Specification
```
```
Props currentRepo: RepoData, allRepos: RepoData[]
(from manifest)
```
```
Algorithm Score similarity: 3 per shared topic, 2 if same
primary language, 1 if same category. Sort
descending. Return top 6 excluding self.
```
```
Visual Horizontal scroll card strip on mobile, 3-column
grid on desktop. Each card shows: repo name,
description truncated 80 chars, stars, primary
language.
```
```
Links Each card links to /repo/[owner]/[repo] — all
internal.
```
```
Schema Parent page includes these 6 repos as
relatedLink in SoftwareApplication schema.
```
## 7. Design System — Typography, Color, Spacing

### 7.1 Typography

```
Token Value
```
```
--font-sans (body, UI "Inter", system-ui, -apple-system, sans-serif —
loaded via Google Fonts or self-hosted from
fontsource
```
```
--font-mono (code) "JetBrains Mono", "Fira Code", ui-monospace,
monospace
```
```
--font-display (headings) "Inter" with font-weight 700800 — same
family, different weight, no extra load
```

```
Base font size 16px 1rem — never set below 16px for body
text
```
```
--leading-body (line-height) 1.7 — body text optimal for long-form reading
```
```
--leading-heading (line-height) 1.2 — tight for large display headings
```
```
--leading-code (line-height) 1.6 — code blocks need relaxed line height
```
```
--tracking-body (letter-spacing) 0.01em — slight openness for Inter at body size
```
```
--tracking-heading (letter-spacing) 0.02em — slightly tight for large headings
```
```
--tracking-mono (letter-spacing) 0em — monospace fonts have built-in spacing
```
```
Minimum line length 45ch — prevent very wide lines; max-width:
75ch on prose content
```
```
Mobile font size scaling Use clamp(): --text-base: clamp(15px, 2.5vw,
18px)
```
### 7.2 Type Scale

```
Token Desktop Size Mobile Size
```
```
--text-xs 12px / 0.75rem 12px
```
```
--text-sm 14px / 0.875rem 13px
```
```
--text-base 16px / 1rem 15px
```
```
--text-lg 18px / 1.125rem 17px
```
```
--text-xl 20px / 1.25rem 18px
```
```
--text-2xl (h4) 24px / 1.5rem 20px
```
```
--text-3xl (h3) 30px / 1.875rem 24px
```
```
--text-4xl (h2) 36px / 2.25rem 28px
```
```
--text-5xl (h1) 48px / 3rem 32px
```
### 7.3 Color Palette — CSS Custom Properties

All colors are defined as CSS custom properties in theme.css and switched via

[data-theme="dark"]. The ThemeToggle component writes data-theme to <html> element and

persists choice to localStorage.


```
Token Light Mode Dark Mode
```
```
--color-bg #FFFFFF #0F172A
```
```
--color-surface #F8FAFC #1E293B
```
```
--color-surface-2 #F1F5F9 #
```
```
--color-border #E2E8F0 #
```
```
--color-text #0F172A #F8FAFC
```
```
--color-text-muted #64748B #94A3B
```
```
--color-accent #6366F1 #818CF
```
```
--color-accent-light #EEF2FF #1E1B4B
```
```
--color-success #10B981 #34D
```
```
--color-warning #F59E0B #FBBF2 4
```
```
--color-danger #EF4444 #F
```
```
--color-code-bg #1E293B #0F172A
```
```
--color-code-text #A5B4FC #C4B5FD
```
### 7.4 Contrast Requirements WCAG 2.1 AA

- Body text on background: minimum 4.51 contrast ratio
- Large text 18px+ bold or 24px+ regular) on background: minimum 3
- UI components and focus indicators: minimum 3
- Dark mode body (--color-text on --color-bg): #F8FAFC on #0F172A = 18.11 AAA
- Accent links (--color-accent) must be verified: use
    https://webaim.org/resources/contrastchecker for both modes
- Focus ring: 2px solid --color-accent with 2px offset — never remove outline:none without
    replacement

### 7.5 ThemeToggle Component Specification

```
Behaviour Specification
```
```
States Three states: light, dark, system (follows
prefers-color-scheme media query)
```

```
Persistence localStorage key: theme-preference. Read on
page load BEFORE first paint to prevent flash of
wrong theme. Implement as inline <script> in
Base.astro <head>.
```
```
HTML attribute Write data-theme="light" or data-theme="dark"
on <html> element
```
```
Button A single <button> cycling through three states.
Icon: sun / moon / monitor SVG inline. aria-label
updated dynamically: "Switch to dark mode",
etc.
```
```
Screen reader announcement aria-live="polite" region announces theme
change: "Theme changed to dark mode"
```
```
No JS fallback @media (prefers-color-scheme: dark) CSS
fallback always present even if JS fails
```
## 8. Accessibility Architecture

### 8.1 Heading Hierarchy Rules

This is a hard constraint for Antigravity IDE. NO exceptions.

- H1 One per page. Always the primary entity name (repo name, category name, topic name,
    etc.). Never in navigation, sidebar, or footer.
- H2 Major content sections in <main> or <article> only. Examples: "Overview", "Statistics",
    "Similar Tools", "Recent Releases".
- H3 Sub-sections within H2 blocks. Example: Under "Statistics" H2, individual stat groups
    can use H3.
- H4 Fine-grained sub-sections within H3. Use sparingly.
- Navigation (<nav>): NO headings. Use aria-label="Primary navigation" on the <nav>
    element. Use <ul>/<li> structure only.
- Sidebar: NO headings. Use aria-label="Category filters" on the <aside>. Use <ul>/<li> with
    <strong> for group labels if needed.
- Footer: NO headings. Use aria-label="Site footer" on <footer>. Use <ul>/<li> structure.
- Widget titles: Use <p class="widget-title"> or <div role="heading" aria-level="2"> if
    absolutely necessary inside <main>.

### 8.2 Skip Links


Required in Base.astro, first focusable element on every page:

- Skip to main content: <a href="#main-content" class="skip-link"Skip to main content</a>
- Skip to search: <a href="#search" class="skip-link"Skip to search</a> (visible only when
    search input exists on page)
- Skip to table of contents: <a href="#toc" class="skip-link"Skip to table of contents</a>
    (repo detail pages only)
- Skip links are visually hidden by default (position: absolute; left: 9999px) and become
    visible on :focus with high-contrast styling using --color-accent.

### 8.3 ARIA Landmark Regions

```
Region Required Attributes
```
```
<header> role="banner" (implicit on <header> at page
level)
```
```
<nav id="primary-nav"> aria-label="Primary navigation"
```
```
<nav id="breadcrumb-nav"> aria-label="Breadcrumb"
```
```
<main id="main-content"> role="main" (implicit) — target of skip link
```
```
<aside id="toc"> aria-label="Table of contents"
```
```
<aside id="category-sidebar"> aria-label="Category filters"
```
```
<footer> role="contentinfo" (implicit on <footer>)
```
```
Search section <search> element wrapping PageFind input,
aria-label="Search repositories"
```
## 9. PageFind Integration

PageFind performs static client-side full-text search. It indexes the built HTML output during the

build process.

### 9.1 PageFind Configuration

- Install: @pagefind/default-ui and the Astro PageFind integration (astro-pagefind).
- In astro.config.mjs: add pagefind() to integrations array.
- PageFind runs automatically after astro build and creates /_pagefind/ directory in dist/.


- Cloudflare Pages serves /_pagefind/ as static assets — no configuration needed.

### 9.2 PageFind Indexing Attributes

Apply these data attributes in the Astro template to control what PageFind indexes:

- data-pagefind-body on the <article> or <main> element containing the primary content.
- data-pagefind-ignore on navigation, sidebar, footer, widget chrome (star counts, etc.) —
    these are noise.
- data-pagefind-meta="title" on the H1 element so PageFind uses it as the result title.
- data-pagefind-meta="image" on the og:image meta or a representative image element.
- data-pagefind-meta="category" on the category breadcrumb element for faceted filtering.
- data-pagefind-filter="language" and data-pagefind-filter="topic" for filter sidebar in
    search UI.

### 9.3 Search Page (/search)

- Renders a static shell page SSG with an empty container <div
    id="pagefind-ui-container">.
- PageFind UI is initialized client-side with bundleDirectory pointing to /_pagefind/.
- Show filter panels for language and category using PageFind filter API.
- The search input has id="search" for the skip link target.

## 10. Cloudflare Deployment Configuration

### 10.1 wrangler.toml

```
Setting Value
```
```
name aipromptmall-shop
```
```
compatibility_date Latest stable date — e.g., 20240923
```
```
pages_build_output_dir dist
```
```
[vars] SITE_URL https://aipromptmall.shop
```
```
[secrets] GITHUB_TOKEN — set via wrangler secret put
or Cloudflare dashboard
```

### 10.2 _headers File (public/_headers)

Place in public/ directory so Cloudflare Pages serves these headers on all matching routes:

/sitemap*.xml

Content-Type: application/xml; charset=utf-8

Cache-Control: public, max-age=86400

/robots.txt

Content-Type: text/plain; charset=utf-8

Cache-Control: public, max-age=86400

/_pagefind/*

Cache-Control: public, max-age=604800, immutable

/repo/*

Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400

##### /*

X-Frame-Options: DENY

X-Content-Type-Options: nosniff

Referrer-Policy: strict-origin-when-cross-origin

Permissions-Policy: camera=(), microphone=(), geolocation=()

### 10.3 _redirects File (public/_redirects)

/github/:owner/:repo /repo/:owner/:repo 301

/repos/* / 301

/sitemap.xml /sitemap-index.xml 301

### 10.4 Build Command for Cloudflare Pages

```
Setting Value
```
```
Framework preset Astro
```
```
Build command node scripts/fetch-github-data.mjs && astro
build && node scripts/generate-sitemaps.mjs
```
```
Build output directory dist
```
```
Root directory / (repo root)
```

```
Node.js version 20.x (set via .nvmrc or Cloudflare environment
variable NODE_VERSION20
```
## 11. Performance Requirements

```
Metric Target
```
```
Largest Contentful Paint LCP < 2.5s on 4G mobile
```
```
Cumulative Layout Shift CLS < 0.05 (all images must have width/height
attributes)
```
```
First Input Delay / INP < 200ms (minimize client JS; widgets are mostly
server-rendered HTML
```
```
Time to First Byte TTFB — SSG pages < 100ms (served from Cloudflare edge)
```
```
TTFB — SSR pages < 500ms Cloudflare Worker cold start + GitHub
API call)
```
```
Total page weight HTML + CSS + critical JS < 200KB uncompressed for SSG pages
```
```
JavaScript budget ThemeToggle + PageFind UI + minimal
interactivity — no framework JS on SSG pages
```
```
Font loading Inter + JetBrains Mono: preload with <link
rel="preload" as="font"> for woff2 subsets. Use
font-display: swap.
```
```
Image loading All <img> lazy loaded except above-fold hero.
Explicit width/height on all images.
```
```
Core Web Vitals target Green Good on all three metrics in Google
CrUX
```
## 12. Package Dependencies

### 12.1 Production Dependencies

```
Package Purpose
```
```
astro@^4.x Core framework
```
```
@astrojs/cloudflare@^10.x Cloudflare adapter for hybrid SSGSSR
```
```
astro-pagefind PageFind Astro integration (runs after build)
```

```
@pagefind/default-ui PageFind search UI component (client-side)
```
```
unified Markdown processing pipeline for README
```
```
remark-parse Markdown parser for unified
```
```
remark-gfm GitHub Flavored Markdown support
```
```
remark-rehype Convert Markdown AST to HTML AST
```
```
rehype-stringify Serialize HTML AST to string
```
```
rehype-slug Auto-generate id= on headings for anchor links
```
```
rehype-sanitize Sanitize HTML from README (security)
```
```
shiki Syntax highlighting (already bundled with Astro
— no extra install)
```
### 12.2 Development Dependencies

```
Package Purpose
```
```
typescript@^5.x Type safety across utils and components
```
```
@types/node Node.js type definitions for scripts
```
```
prettier Code formatting
```
```
prettier-plugin-astro Prettier support for .astro files
```
```
eslint Linting
```
```
@typescript-eslint/eslint-plugin TypeScript-aware ESLint rules
```
## 13. Build Scripts Specification

### scripts/fetch-github-data.mjs — Full Specification

14. Read GITHUB_TOKEN from process.env. Log warning if missing.
15. Load src/data/categories.json to get the list of search queries per category.
16. For each category query: fetch GitHub Search API /search/repositories with q=, sort=stars,
    order=desc, per_page=100. Paginate up to 10 pages 1,000 repos per category).
17. Deduplicate repos across categories by full_name. Assign primary_category as the first
    category that matched.


18. For each unique repo: if a JSON file already exists in src/data/repos/ AND the stored
    pushed_at matches the API pushed_at, skip (delta fetch). Otherwise fetch full repo data +
    commits (last 100 + readme + contributors + releases + languages.
19. Write src/data/repos/{owner}__{repo}.json with all fetched data.
20. After all repos are processed, write src/data/manifest.json (lightweight index: full_name,
    slug, owner, repo, stars, forks, language, topics, primary_category, pushed_at, description).
21. Write src/data/topics.json: aggregate all topics from manifest, count repos per topic, sort
    by count descending.
22. Write src/data/languages.json: aggregate all languages, count repos per language, sort by
    count descending.
23. Log total repos fetched, total API calls made, and time elapsed.

### scripts/generate-sitemaps.mjs — Full Specification

24. Run AFTER astro build completes (as second build step).
25. Read dist/ directory to enumerate all .html files for SSG pages. Extract their paths as
    canonical URLs.
26. Read src/data/manifest.json to add SSR page URLs (/repo/, /owner/, /compare/).
27. Combine all URLs with their lastmod, changefreq, and priority values.
28. Split into shards of 49,999 URLs maximum.
29. Write dist/sitemap-0.xml, dist/sitemap-1.xml, etc. as valid XML sitemap files.
30. Write dist/sitemap-index.xml as valid sitemap index referencing all shards.
31. Validate XML by attempting to parse each file with Node.js DOMParser or fast-xml-parser
    before finishing.

## 14. Deliverable Checklist for Antigravity IDE

Pass this checklist to Antigravity IDE as the implementation tracker:

```
# Deliverable Priority
```
```
1 astro.config.mjs — hybrid output,
Cloudflare adapter, PageFind
integration
```
##### P0

```
2 scripts/fetch-github-data.mjs —
full GitHub data pipeline
```
##### P0


3 src/data/categories.json — 14 AI
category definitions

##### P0

4 src/layouts/Base.astro — HTML
shell, skip links, theme toggle,
meta injection

##### P0

5 src/styles/theme.css — full CSS
custom property palette (light +
dark)

##### P0

6 src/styles/typography.css —
type scale, line-height,
letter-spacing tokens

##### P0

7 src/pages/index.astro —
homepage with category hub

##### P0

8 src/pages/repo/[owner]/[repo].a
stro — SSR repo detail page

##### P0

9 src/pages/category/[slug].astro
— SSG category index with
pagination

##### P0

10 src/pages/topic/[tag].astro —
SSG topic tag pages

##### P0

11 src/pages/language/[lang].astro
— SSG language filter pages

##### P0

12 src/pages/sitemap-index.xml.ts
+ sitemap-[n].xml.ts — static
sitemap endpoints

##### P0

13 scripts/generate-sitemaps.mjs —
post-build sitemap generator

##### P0

14 src/pages/robots.txt.ts — static
robots.txt endpoint

##### P0

15 src/components/seo/JsonLd.astr
o — JSONLD injector with all
schema types

##### P0

16 src/components/seo/MetaTags.a
stro — all meta, OG, Twitter,
canonical tags

##### P0

17 src/components/ui/ThemeToggle
.astro — 3-state
light/dark/system toggle

##### P0

18 src/components/navigation/Glob
alNav.astro — no headings,
aria-label, skip link target

##### P0


19 src/components/navigation/Brea
dcrumb.astro + BreadcrumbList
schema

##### P0

20 src/components/navigation/Foot
erConditional.astro —
page-type-aware footer links

##### P0

21 src/components/widgets/StarMe
ter.astro

##### P1

22 src/components/widgets/Commit
Sparkline.astro

##### P1

23 src/components/widgets/Langua
gePieChart.astro

##### P1

24 src/components/widgets/Contrib
utorGrid.astro

##### P1

25 src/components/widgets/TopicCl
oud.astro

##### P1

26 src/components/widgets/Releas
eTimeline.astro

##### P1

27 src/components/widgets/Readm
eRenderer.astro

##### P1

28 src/components/widgets/TocGen
erator.astro + JumpLinks.astro

##### P1

29 src/components/widgets/Similar
Repos.astro — similarity scoring
algorithm

##### P1

30 src/components/widgets/LastAct
ivity.astro — relative time display

##### P1

31 src/components/widgets/License
Badge.astro

##### P2

32 src/components/widgets/Depend
encyList.astro

##### P2

33 src/components/widgets/Trendin
gBadge.astro

##### P2

34 src/utils/github.ts — API client
with auth, rate limiting, backoff

##### P0

35 src/utils/schema.ts — all
JSONLD builder functions

##### P0

36 src/utils/slugify.ts — URL-safe
slug generator

##### P0


```
37 src/utils/toc.ts — TOC extraction
from HTML headings
```
##### P1

```
38 src/pages/compare/[slugA]/vs/[s
lugB.astro — SSR comparison
page
```
##### P2

```
39 src/pages/owner/[login].astro —
SSR owner/org page
```
##### P2

```
40 src/pages/trending.astro — SSR
trending page
```
##### P2

```
41 src/pages/search.astro —
PageFind search shell
```
##### P1

```
42 public/_headers — Cloudflare
cache and security headers
```
##### P0

```
43 public/_redirects — Cloudflare
redirect rules
```
##### P0

```
44 wrangler.toml — Cloudflare
Pages config
```
##### P0

```
45 .nvmrc — Node.js 20.x version
pin
```
##### P0

P0 = implement first, blocks all other work. P1 = core feature completeness. P2 = enhanced

features, implement after P0P1 are stable.

```
End of Architecture Document — aipromptmall.shop pSEO Platform
```

