# Agent-Friendly JSON API — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generate static JSON endpoints and ai-plugin manifest so AI agents can discover, filter, and read podcast episodes programmatically.

**Architecture:** Astro API routes (`src/pages/`) generate static JSON at build time. A shared `src/lib/transcript.ts` utility parses MDX body text into chapter-level plain-text transcripts. No runtime server needed.

**Tech Stack:** Astro 5 API routes, TypeScript, existing content collection schema.

---

### Task 1: Transcript parser utility

**Files:**
- Create: `src/lib/transcript.ts`

**Step 1: Write `src/lib/transcript.ts`**

This module exports two functions that parse raw MDX body text.

```typescript
// src/lib/transcript.ts

/** A chapter block extracted from MDX body. */
export type ChapterBlock = {
  time: string;
  title: string;
  speakers: string[];
  transcript: string;
};

const H2_RE = /^## (.+?)\s{2,}\*(\d{1,2}:\d{2}(?::\d{2})?)\*\s*$/;
const SPEAKER_RE = /\*\*([^*]+)\*\*/;
const SPAN_RE = /<span[^>]*>[^<]*<\/span>\s*/g;
const TIMESTAMP_RE = /^\*\d{1,2}:\d{2}(?::\d{2})?\*\s*/;

/**
 * Strip MDX markup from a body-text line, returning plain text.
 * - Removes <span class="paragraph-timestamp" ...>...</span>
 * - Removes italic timestamps like *00:00*
 * - Removes bold speaker like **Name** (captured separately)
 */
function stripLine(line: string): string {
  return line
    .replace(SPAN_RE, '')
    .replace(TIMESTAMP_RE, '')
    .replace(/\*\*[^*]+\*\*\s*/g, '')
    .trim();
}

/**
 * Parse MDX body into chapter blocks with plain-text transcript.
 * Chapters are delimited by `## Title    *MM:SS*` headings.
 * Text before the first heading becomes chapter "intro" with time "00:00".
 */
export function parseChapters(mdxBody: string): ChapterBlock[] {
  const lines = mdxBody.split('\n');
  const chapters: ChapterBlock[] = [];
  let current: { time: string; title: string; speakers: Set<string>; lines: string[] } | null = null;

  function flush() {
    if (!current) return;
    const transcript = current.lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (transcript) {
      chapters.push({
        time: current.time,
        title: current.title,
        speakers: [...current.speakers],
        transcript,
      });
    }
  }

  // Handle content before first H2 as intro
  current = { time: '00:00', title: 'Intro', speakers: new Set(), lines: [] };

  for (const raw of lines) {
    const h2Match = raw.match(H2_RE);
    if (h2Match) {
      flush();
      current = {
        time: h2Match[2],
        title: h2Match[1].trim(),
        speakers: new Set(),
        lines: [],
      };
      continue;
    }

    if (!current) continue;

    // Detect speaker
    const speakerMatch = raw.match(SPEAKER_RE);
    const speaker = speakerMatch?.[1];
    if (speaker) current.speakers.add(speaker);

    // Build plain-text line
    const plain = stripLine(raw);
    if (!plain) {
      // Preserve paragraph breaks
      if (current.lines.length > 0 && current.lines[current.lines.length - 1] !== '') {
        current.lines.push('');
      }
      continue;
    }

    if (speaker) {
      current.lines.push(`${speaker}: ${plain}`);
    } else {
      current.lines.push(plain);
    }
  }
  flush();

  // Drop empty "Intro" if first real chapter starts at 00:00
  if (chapters.length > 1 && chapters[0].title === 'Intro' && !chapters[0].transcript) {
    chapters.shift();
  }

  return chapters;
}
```

**Step 2: Verify with build**

Run: `cd /c/project_local/AIF_blog && npm run build 2>&1 | tail -5`
Expected: Build succeeds (new file is just a library, not yet imported)

**Step 3: Commit**

```bash
git add src/lib/transcript.ts
git commit -m "feat(api): add MDX transcript parser utility"
```

---

### Task 2: Episode index endpoint (`/api/episodes.json`)

**Files:**
- Create: `src/pages/api/episodes.json.ts`

**Step 1: Write the endpoint**

```typescript
// src/pages/api/episodes.json.ts
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const site = (context.site?.toString() ?? 'https://aifrontier.kr').replace(/\/$/, '');
  const koEpisodes = await getCollection('episodes', ({ data }) => data.lang === 'ko');
  const enEpisodes = await getCollection('episodes', ({ data }) => data.lang === 'en');
  const sorted = koEpisodes.sort((a, b) => b.data.episodeNumber - a.data.episodeNumber);

  const enMap = new Map(enEpisodes.map((ep) => [ep.data.episodeNumber, ep]));

  let ytMeta: Record<string, { title_en?: string }> = {};
  try {
    const metaFile = await import('../../../data/youtube_metadata.json');
    const metaArray = metaFile.default as Array<{ id: string; title_en?: string }>;
    for (const entry of metaArray) {
      ytMeta[entry.id] = entry;
    }
  } catch { /* data file may not exist */ }

  const episodes = sorted.map((ep) => {
    const d = ep.data;
    const hasEn = enMap.has(d.episodeNumber);
    const ytInfo = ytMeta[d.youtubeId] ?? {};
    return {
      number: d.episodeNumber,
      title: d.title,
      title_en: ytInfo.title_en || null,
      description: d.description,
      published: d.publishedAt.toISOString().slice(0, 10),
      duration: d.duration,
      youtube_id: d.youtubeId,
      hosts: d.hosts,
      chapters: d.chapters.map((ch) => ({ time: ch.time, title: ch.title })),
      urls: {
        transcript_ko: `${site}/ko/episodes/ep${d.episodeNumber}`,
        ...(hasEn ? { transcript_en: `${site}/en/episodes/ep${d.episodeNumber}` } : {}),
        detail_api: `${site}/api/episodes/ep${d.episodeNumber}.json`,
        youtube: `https://www.youtube.com/watch?v=${d.youtubeId}`,
      },
    };
  });

  const body = {
    site,
    total: episodes.length,
    updated: new Date().toISOString().slice(0, 10),
    episodes,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
```

**Step 2: Build and verify**

Run: `npm run build && cat dist/api/episodes.json | python -c "import json,sys; d=json.load(sys.stdin); print(f'OK: {d[\"total\"]} episodes, first={d[\"episodes\"][0][\"number\"]}')" `
Expected: `OK: 12 episodes, first=86` (or current count)

**Step 3: Commit**

```bash
git add src/pages/api/episodes.json.ts
git commit -m "feat(api): add /api/episodes.json index endpoint"
```

---

### Task 3: Per-episode detail endpoint (`/api/episodes/ep{N}.json`)

**Files:**
- Create: `src/pages/api/episodes/[ep].json.ts`

**Step 1: Write the endpoint**

```typescript
// src/pages/api/episodes/[ep].json.ts
import type { APIContext, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { parseChapters } from '../../../lib/transcript';

export const getStaticPaths: GetStaticPaths = async () => {
  const episodes = await getCollection('episodes', ({ data }) => data.lang === 'ko');
  return episodes.map((ep) => ({
    params: { ep: `ep${ep.data.episodeNumber}` },
    props: { episode: ep },
  }));
};

export async function GET(context: APIContext) {
  const { episode } = context.props as { episode: any };
  const d = episode.data;
  const site = (context.site?.toString() ?? 'https://aifrontier.kr').replace(/\/$/, '');

  // Get English episode if exists
  const enEpisodes = await getCollection('episodes', ({ data }) => data.lang === 'en' && data.episodeNumber === d.episodeNumber);
  const hasEn = enEpisodes.length > 0;

  let titleEn: string | null = null;
  try {
    const metaFile = await import('../../../../data/youtube_metadata.json');
    const metaArray = metaFile.default as Array<{ id: string; title_en?: string }>;
    const match = metaArray.find((m) => m.id === d.youtubeId);
    titleEn = match?.title_en || null;
  } catch { /* ok */ }

  const chapters = parseChapters(episode.body ?? '');

  const body = {
    number: d.episodeNumber,
    title: d.title,
    title_en: titleEn,
    description: d.description,
    published: d.publishedAt.toISOString().slice(0, 10),
    duration: d.duration,
    youtube_id: d.youtubeId,
    hosts: d.hosts,
    urls: {
      transcript_ko: `${site}/ko/episodes/ep${d.episodeNumber}`,
      ...(hasEn ? { transcript_en: `${site}/en/episodes/ep${d.episodeNumber}` } : {}),
      youtube: `https://www.youtube.com/watch?v=${d.youtubeId}`,
    },
    chapters,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
```

**Step 2: Build and verify**

Run: `npm run build && python -c "import json; d=json.load(open('dist/api/episodes/ep86.json',encoding='utf-8')); print(f'OK: {len(d[\"chapters\"])} chapters, first speaker: {d[\"chapters\"][0][\"speakers\"]}')" `
Expected: Chapter count matches ep86 (28 chapters), speakers populated.

**Step 3: Spot-check transcript quality**

Run: `python -c "import json; d=json.load(open('dist/api/episodes/ep86.json',encoding='utf-8')); ch=d['chapters'][1]; print(ch['title']); print(ch['transcript'][:200])"`
Expected: Chapter title visible, transcript is clean plain text with `"노정석: ..."` format.

**Step 4: Commit**

```bash
git add src/pages/api/episodes/\[ep\].json.ts
git commit -m "feat(api): add per-episode detail JSON endpoint"
```

---

### Task 4: ai-plugin.json manifest

**Files:**
- Create: `src/pages/.well-known/ai-plugin.json.ts`

**Step 1: Write the endpoint**

```typescript
// src/pages/.well-known/ai-plugin.json.ts
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const site = (context.site?.toString() ?? 'https://aifrontier.kr').replace(/\/$/, '');

  const manifest = {
    schema_version: 'v1',
    name_for_human: 'AI Frontier 팟캐스트',
    name_for_model: 'aifrontier',
    description_for_human: 'AI 심층 대화 팟캐스트 — 에피소드 검색 및 트랜스크립트 조회',
    description_for_model:
      'Korean/English AI podcast. ' +
      `GET ${site}/api/episodes.json for episode index (filter by hosts, chapters, dates client-side). ` +
      `GET ${site}/api/episodes/ep{N}.json for full chapter-level transcripts. ` +
      'Each chapter has time, title, speakers[], and transcript text.',
    api: {
      type: 'openapi',
      url: `${site}/api/openapi.json`,
    },
    logo_url: `${site}/favicon.svg`,
    contact_email: '',
    legal_info_url: site,
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
```

**Step 2: Build and verify**

Run: `npm run build && cat dist/.well-known/ai-plugin.json | python -c "import json,sys; d=json.load(sys.stdin); print(d['name_for_model'], d['api']['url'])"`
Expected: `aifrontier https://aifrontier.kr/api/openapi.json`

**Step 3: Commit**

```bash
git add src/pages/.well-known/ai-plugin.json.ts
git commit -m "feat(api): add ai-plugin.json manifest for agent discovery"
```

---

### Task 5: OpenAPI spec

**Files:**
- Create: `src/pages/api/openapi.json.ts`

**Step 1: Write the endpoint**

```typescript
// src/pages/api/openapi.json.ts
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const site = (context.site?.toString() ?? 'https://aifrontier.kr').replace(/\/$/, '');

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'AI Frontier Podcast API',
      description:
        'Static JSON API for AI agents. Lists episodes with metadata and provides chapter-level transcripts.',
      version: '1.0.0',
    },
    servers: [{ url: site }],
    paths: {
      '/api/episodes.json': {
        get: {
          operationId: 'listEpisodes',
          summary:
            'Get all episodes with metadata (hosts, chapters, dates, URLs). Filter client-side by hosts array, chapter titles, or published date.',
          responses: {
            '200': {
              description: 'Episode index',
              content: { 'application/json': {} },
            },
          },
        },
      },
      '/api/episodes/{ep}.json': {
        get: {
          operationId: 'getEpisode',
          summary:
            'Get one episode with chapter-level transcripts. Each chapter has time, title, speakers, and full transcript text.',
          parameters: [
            {
              name: 'ep',
              in: 'path',
              required: true,
              description: 'Episode identifier, e.g. "ep86"',
              schema: { type: 'string', pattern: '^ep\\d+$' },
            },
          ],
          responses: {
            '200': {
              description: 'Episode detail with transcripts',
              content: { 'application/json': {} },
            },
          },
        },
      },
    },
  };

  return new Response(JSON.stringify(spec, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
```

**Step 2: Build and verify**

Run: `npm run build && python -c "import json; d=json.load(open('dist/api/openapi.json')); print(f'OpenAPI {d[\"openapi\"]}, paths: {list(d[\"paths\"].keys())}')" `
Expected: `OpenAPI 3.1.0, paths: ['/api/episodes.json', '/api/episodes/{ep}.json']`

**Step 3: Commit**

```bash
git add src/pages/api/openapi.json.ts
git commit -m "feat(api): add OpenAPI 3.1 spec endpoint"
```

---

### Task 6: Final build + push

**Step 1: Full build**

Run: `npm run build`
Expected: All pages build successfully including new API routes.

**Step 2: Verify all endpoints exist**

```bash
ls -la dist/api/episodes.json dist/api/openapi.json dist/.well-known/ai-plugin.json
ls dist/api/episodes/ | head -5
```

**Step 3: Quick smoke test**

```bash
python -c "
import json
# Index
idx = json.load(open('dist/api/episodes.json', encoding='utf-8'))
print(f'Index: {idx[\"total\"]} episodes')
# Detail
det = json.load(open('dist/api/episodes/ep86.json', encoding='utf-8'))
print(f'EP86: {len(det[\"chapters\"])} chapters, hosts={det[\"hosts\"]}')
# Plugin
plg = json.load(open('dist/.well-known/ai-plugin.json', encoding='utf-8'))
print(f'Plugin: {plg[\"name_for_model\"]}')
# OpenAPI
api = json.load(open('dist/api/openapi.json'))
print(f'OpenAPI: {len(api[\"paths\"])} paths')
"
```

**Step 4: Push**

```bash
git push
```
