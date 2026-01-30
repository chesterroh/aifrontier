# SEO Thumbnail Fallback + x-default Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stabilize OG/JSON-LD thumbnails with fallback logic and update hreflang x-default to the root URL.

**Architecture:** Add a thumbnail resolver in `src/lib/seo.ts` and make JSON-LD omit image fields when no valid thumbnail exists. Update `buildHreflangLinks` to emit `x-default` pointing to `/`. Wire episode thumbnails from content into the episode layout and use resolver output for OG/JSON-LD.

**Tech Stack:** Astro 5, TypeScript, Node test runner with `tsx` loader.

---

### Task 1: Add failing tests for thumbnail fallback and x-default (TDD @test-driven-development)

**Files:**
- Modify: `tests/seo.test.ts`

**Step 1: Write failing tests**

```ts
import { resolveEpisodeThumbnail } from '../src/lib/seo';

// x-default should point to root
const links = buildHreflangLinks({
  site: 'https://aifrontier.kr',
  lang: 'ko',
  alternatePath: '/en',
});
const xDefault = links.find((link) => link.hreflang === 'x-default');
assert.equal(xDefault?.href, 'https://aifrontier.kr/');

// thumbnail resolver behavior
assert.equal(
  resolveEpisodeThumbnail({ thumbnail: 'https://cdn.example.com/img.jpg', youtubeId: 'abc' }),
  'https://cdn.example.com/img.jpg'
);
assert.equal(
  resolveEpisodeThumbnail({ thumbnail: null, youtubeId: 'abc' }),
  'https://i.ytimg.com/vi/abc/hqdefault.jpg'
);
assert.equal(resolveEpisodeThumbnail({ thumbnail: null, youtubeId: '' }), null);

// JSON-LD omits image fields when no thumbnail
const jsonLd = buildPodcastEpisodeJsonLd({
  site: 'https://aifrontier.kr',
  lang: 'ko',
  episodeNumber: 1,
  title: 'No Image',
  description: 'desc',
  publishedAt: '2026-01-01',
  duration: '01:00',
  youtubeId: '',
  thumbnail: null,
});
assert.equal(jsonLd.image, undefined);
assert.equal(jsonLd.associatedMedia?.thumbnailUrl, undefined);
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/seo.test.ts`
Expected: FAIL with missing exports or assertions.

### Task 2: Implement resolver and JSON-LD conditional fields

**Files:**
- Modify: `src/lib/seo.ts`
- Modify: `tests/seo.test.ts`

**Step 1: Implement**

- Add `resolveEpisodeThumbnail({ thumbnail, youtubeId })`.
- Update `buildHreflangLinks` to set `x-default` to `/`.
- Update `buildPodcastEpisodeJsonLd` to accept `thumbnail?: string | null` and omit `image` and `associatedMedia.thumbnailUrl` when absent.

**Step 2: Run tests**

Run: `node --import tsx --test tests/seo.test.ts`
Expected: PASS

### Task 3: Wire thumbnails into episode layout

**Files:**
- Modify: `src/layouts/EpisodeLayout.astro`
- Modify: `src/pages/ko/episodes/[...slug].astro`
- Modify: `src/pages/en/episodes/[...slug].astro`

**Step 1: Update episode props**

- Add optional `thumbnail` prop to `EpisodeLayout`.
- Pass `data.thumbnail` from both language episode pages.

**Step 2: Use resolver output**

- Replace current OG image selection with `resolveEpisodeThumbnail`.
- Pass resolved thumbnail to JSON-LD (or `null` when absent).

**Step 3: Run tests**

Run: `node --import tsx --test tests/seo.test.ts`
Expected: PASS

### Task 4: Commit

```bash
git add tests/seo.test.ts src/lib/seo.ts src/layouts/EpisodeLayout.astro src/pages/ko/episodes/[...slug].astro src/pages/en/episodes/[...slug].astro
git commit -m "feat: improve seo thumbnails and hreflang"
```
