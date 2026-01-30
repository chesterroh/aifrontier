# SEO Indexing + LLMs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add external search indexing assets (sitemap/robots/llms) and SEO metadata/structured data for ko/en pages.

**Architecture:** Centralize SEO helpers in `src/lib/seo.ts` and use them across layouts/pages. Generate `sitemap.xml` dynamically from content collections and serve static `robots.txt`, `llms.txt`, and `llm.txt` from `public/`. Inject canonical, hreflang, OG, and JSON-LD from layout level.

**Tech Stack:** Astro 5, TypeScript, `astro:content`, Node test runner with `tsx` loader.

---

### Task 1: Add failing tests for SEO helpers (TDD @test-driven-development)

**Files:**
- Create: `tests/seo.test.ts`

**Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  durationToIso,
  buildHreflangLinks,
  buildSitemapXml,
  buildPodcastEpisodeJsonLd,
} from '../src/lib/seo';

test('durationToIso converts MM:SS and H:MM:SS to ISO-8601', () => {
  assert.equal(durationToIso('53:55'), 'PT53M55S');
  assert.equal(durationToIso('1:02:03'), 'PT1H2M3S');
});

test('buildHreflangLinks includes self and alternate', () => {
  const links = buildHreflangLinks({
    site: 'https://aifrontier.kr',
    lang: 'ko',
    alternatePath: '/en',
  });
  assert.equal(links.length, 3); // self + alternate + x-default
  assert.deepEqual(links.map((l) => l.hreflang).sort(), ['en', 'ko', 'x-default']);
});

test('buildSitemapXml renders url entries with lastmod', () => {
  const xml = buildSitemapXml([
    { loc: 'https://aifrontier.kr/ko', lastmod: '2026-01-26' },
    { loc: 'https://aifrontier.kr/en', lastmod: '2026-01-20' },
  ]);
  assert.ok(xml.includes('<urlset'));
  assert.ok(xml.includes('<loc>https://aifrontier.kr/ko</loc>'));
  assert.ok(xml.includes('<lastmod>2026-01-26</lastmod>'));
});

test('buildPodcastEpisodeJsonLd builds a PodcastEpisode payload', () => {
  const jsonLd = buildPodcastEpisodeJsonLd({
    site: 'https://aifrontier.kr',
    lang: 'ko',
    episodeNumber: 83,
    title: '테스트 에피소드',
    description: '설명',
    publishedAt: '2026-01-26',
    duration: '53:55',
    youtubeId: 'AuF7V7bqsrQ',
    thumbnail: 'https://i.ytimg.com/vi/AuF7V7bqsrQ/maxresdefault.jpg',
  });
  assert.equal(jsonLd['@type'], 'PodcastEpisode');
  assert.equal(jsonLd.duration, 'PT53M55S');
  assert.ok(jsonLd.associatedMedia.embedUrl.includes('youtube.com'));
});
```

**Step 2: Run test to verify it fails**

Run: `node --loader tsx --test tests/seo.test.ts`
Expected: FAIL with "Cannot find module '../src/lib/seo'" or missing exports.

### Task 2: Implement SEO helper module

**Files:**
- Create: `src/lib/seo.ts`
- Modify: `tests/seo.test.ts`

**Step 1: Write minimal implementation**

```ts
export type HreflangLink = { hreflang: string; href: string };

type EpisodeJsonLdInput = {
  site: string;
  lang: 'ko' | 'en';
  episodeNumber: number;
  title: string;
  description: string;
  publishedAt: string; // YYYY-MM-DD
  duration: string; // MM:SS or H:MM:SS
  youtubeId: string;
  thumbnail: string;
};

type HreflangInput = {
  site: string;
  lang: 'ko' | 'en';
  alternatePath?: string | null;
};

type SitemapEntry = { loc: string; lastmod?: string };

export function durationToIso(duration: string): string {
  const parts = duration.split(':').map((value) => Number(value));
  if (parts.some((value) => Number.isNaN(value))) return 'PT0S';
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  const segments = [];
  if (h) segments.push(`${h}H`);
  if (m) segments.push(`${m}M`);
  if (s) segments.push(`${s}S`);
  return `PT${segments.join('') || '0S'}`;
}

export function buildHreflangLinks({ site, lang, alternatePath }: HreflangInput): HreflangLink[] {
  const normalize = (path: string) => new URL(path, site).toString();
  const links: HreflangLink[] = [{ hreflang: lang, href: normalize(`/${lang}`) }];
  if (alternatePath) {
    const altLang = lang === 'ko' ? 'en' : 'ko';
    const altHref = normalize(alternatePath);
    links.push({ hreflang: altLang, href: altHref });
    links.push({ hreflang: 'x-default', href: normalize('/ko') });
  }
  return links;
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const lines = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : '';
      return `<url><loc>${entry.loc}</loc>${lastmod}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${lines}</urlset>`;
}

export function buildPodcastEpisodeJsonLd(input: EpisodeJsonLdInput) {
  const url = new URL(`/ko/episodes/ep${input.episodeNumber}`, input.site).toString();
  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: `EP ${input.episodeNumber}: ${input.title}`,
    description: input.description,
    datePublished: input.publishedAt,
    duration: durationToIso(input.duration),
    episodeNumber: input.episodeNumber,
    url,
    image: input.thumbnail,
    partOfSeries: {
      '@type': 'PodcastSeries',
      '@id': `${input.site}#podcast`,
      name: 'AI Frontier',
    },
    associatedMedia: {
      '@type': 'VideoObject',
      name: `EP ${input.episodeNumber}: ${input.title}`,
      embedUrl: `https://www.youtube.com/embed/${input.youtubeId}`,
      thumbnailUrl: input.thumbnail,
    },
  };
}
```

**Step 2: Run tests to verify they pass**

Run: `node --loader tsx --test tests/seo.test.ts`
Expected: PASS

**Step 3: Refactor (optional)**

Adjust URLs to respect `lang` and support non-episode pages if needed, keeping tests green.

### Task 3: Add sitemap route

**Files:**
- Create: `src/pages/sitemap.xml.ts`
- Modify: `src/lib/seo.ts`

**Step 1: Write failing test**

Add a test case to `tests/seo.test.ts` for a `buildSitemapEntries` helper if you extract one.

**Step 2: Implement route**

```ts
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { buildSitemapXml } from '../lib/seo';

export async function GET(context: APIContext) {
  const site = context.site?.toString() ?? 'https://aifrontier.kr';
  const episodes = await getCollection('episodes');
  const entries = [
    { loc: `${site}/ko` },
    { loc: `${site}/en` },
    ...episodes.map((ep) => ({
      loc: `${site}/${ep.data.lang}/episodes/ep${ep.data.episodeNumber}`,
      lastmod: ep.data.publishedAt.toISOString().slice(0, 10),
    })),
  ];

  return new Response(buildSitemapXml(entries), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
```

**Step 3: Run tests**

Run: `node --loader tsx --test tests/seo.test.ts`
Expected: PASS

### Task 4: Add canonical/hreflang/OG/JSON-LD to BaseLayout

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/lib/seo.ts`

**Step 1: Write failing test**

Add a new test for a helper (e.g. `buildCanonicalUrl`) if you extract one.

**Step 2: Implement layout changes**

- Add props: `canonicalPath?`, `alternatePath?`, `ogImage?`, `jsonLd?`.
- Compute canonical from `Astro.site` + path.
- Render `link rel="canonical"` and `link rel="alternate" hreflang` for self + alternate.
- Add `og:url`, `og:site_name`, and conditional `og:image`/`twitter:card`.
- If `jsonLd` provided, render `<script type="application/ld+json">` with JSON.

**Step 3: Run tests**

Run: `node --loader tsx --test tests/seo.test.ts`
Expected: PASS

### Task 5: Inject structured data and OG image on episode pages

**Files:**
- Modify: `src/layouts/EpisodeLayout.astro`
- Modify: `src/lib/seo.ts`

**Step 1: Write failing test**

Add a test for `buildPodcastEpisodeJsonLd` if not already present.

**Step 2: Implement**

- Build `ogImage` from `thumbnail` or YouTube thumbnail.
- Build `jsonLd` using helper (PodcastEpisode with VideoObject).
- Compute `alternatePath` when `alternateSlug` exists.
- Pass these into `BaseLayout` props.

**Step 3: Run tests**

Run: `node --loader tsx --test tests/seo.test.ts`
Expected: PASS

### Task 6: Add structured data and metadata on home pages

**Files:**
- Modify: `src/pages/ko/index.astro`
- Modify: `src/pages/en/index.astro`
- Modify: `src/lib/seo.ts`

**Step 1: Write failing test**

Add a test for `buildPodcastSeriesJsonLd` helper.

**Step 2: Implement**

- Provide `description` per language.
- Pass `alternatePath` to BaseLayout (ko ↔ en).
- Add `jsonLd` for `PodcastSeries` with `@id` `${site}#podcast`.

**Step 3: Run tests**

Run: `node --loader tsx --test tests/seo.test.ts`
Expected: PASS

### Task 7: Fix RSS `site` fallback

**Files:**
- Modify: `src/pages/ko/rss.xml.ts`
- Modify: `src/pages/en/rss.xml.ts`

**Step 1: Change fallback to `https://aifrontier.kr`**

**Step 2: (Optional) Add `<atom:link>` customData**

**Step 3: Run tests**

Run: `node --loader tsx --test tests/seo.test.ts`
Expected: PASS

### Task 8: Add indexing/static files

**Files:**
- Create: `public/robots.txt`
- Create: `public/llms.txt`
- Create: `public/llm.txt`

**Step 1: Write robots.txt**

```
User-agent: *
Allow: /
Sitemap: https://aifrontier.kr/sitemap.xml
```

**Step 2: Write llms.txt / llm.txt**

Use the agreed content with canonical domain and KO/EN links.

**Step 3: Run tests**

Run: `node --loader tsx --test tests/seo.test.ts`
Expected: PASS

### Task 9: Verify build

**Step 1: Build**

Run: `npm run build`
Expected: Astro build succeeds, Pagefind index completes.

### Task 10: Commit

```bash
git add tests/seo.test.ts src/lib/seo.ts src/layouts/BaseLayout.astro src/layouts/EpisodeLayout.astro src/pages/ko/index.astro src/pages/en/index.astro src/pages/sitemap.xml.ts src/pages/ko/rss.xml.ts src/pages/en/rss.xml.ts public/robots.txt public/llms.txt public/llm.txt
git commit -m "feat: improve seo indexing assets"
```
