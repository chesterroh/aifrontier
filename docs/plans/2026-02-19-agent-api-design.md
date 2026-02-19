# Agent-Friendly JSON API Design

## Goal

Provide AI agents (ChatGPT, Claude.ai, Perplexity, etc.) with structured, machine-readable endpoints to discover, filter, and read AI Frontier podcast episodes.

## Current State

- `/llms.txt` and `/llms-full.txt` — plain-text episode index for LLMs
- RSS feeds (ko/en) — standard podcast syndication
- Pagefind — client-side full-text search (browser JS only)
- All formats are human-readable text; no structured JSON for programmatic querying

## Design

### Approach: Static JSON API + ai-plugin.json

All files are generated at build time by Astro API routes and deployed as static files. Zero additional infrastructure.

### Endpoints

| Path | Purpose | Size estimate |
|------|---------|---------------|
| `/api/episodes.json` | Full episode index (metadata only) | ~2KB per episode |
| `/api/episodes/ep{N}.json` | Individual episode detail + chapter-level transcript | ~50-150KB each |
| `/api/openapi.json` | OpenAPI 3.1 spec describing the API | ~1KB |
| `/.well-known/ai-plugin.json` | Plugin manifest for agent auto-discovery | ~0.5KB |

### `/api/episodes.json` Schema

```json
{
  "site": "https://aifrontier.kr",
  "total": 12,
  "updated": "2026-02-19",
  "episodes": [
    {
      "number": 86,
      "title": "에피소드 제목",
      "title_en": "English Title",
      "description": "설명...",
      "published": "2026-02-18",
      "duration": "1:26:00",
      "youtube_id": "EQ-Rnx-k-Ec",
      "hosts": ["노정석", "신정규"],
      "chapters": [
        {"time": "00:00", "title": "챕터 제목"}
      ],
      "urls": {
        "transcript_ko": "/ko/episodes/ep86",
        "transcript_en": "/en/episodes/ep86",
        "detail_api": "/api/episodes/ep86.json",
        "youtube": "https://www.youtube.com/watch?v=EQ-Rnx-k-Ec"
      }
    }
  ]
}
```

### `/api/episodes/ep{N}.json` Schema

```json
{
  "number": 86,
  "title": "에피소드 제목",
  "title_en": "English Title",
  "description": "설명...",
  "published": "2026-02-18",
  "duration": "1:26:00",
  "youtube_id": "EQ-Rnx-k-Ec",
  "hosts": ["노정석", "신정규"],
  "urls": {
    "transcript_ko": "/ko/episodes/ep86",
    "transcript_en": "/en/episodes/ep86",
    "youtube": "https://www.youtube.com/watch?v=EQ-Rnx-k-Ec"
  },
  "chapters": [
    {
      "time": "00:55",
      "title": "Backend.AI:GO 제품 소개",
      "speakers": ["노정석", "신정규"],
      "transcript": "노정석: 그러면 Backend.AI:GO 한번 소개...\n\n신정규: Backend.AI:GO라는 건..."
    }
  ]
}
```

### Transcript Extraction

MDX body is parsed at build time:
1. Split by `## heading    *MM:SS*` pattern into chapter blocks
2. Strip markdown syntax (`**speaker**`, `*timestamp*`, `<span>` tags)
3. Preserve speaker attribution as plain text: `"노정석: text..."`

### `/.well-known/ai-plugin.json`

Standard plugin manifest with `description_for_model` instructing agents:
> "Use /api/episodes.json to list/filter episodes, then /api/episodes/ep{N}.json for full chapter-level transcripts."

### `/api/openapi.json`

OpenAPI 3.1 spec documenting `listEpisodes` and `getEpisode` operations.

## Agent Workflow

```
Agent receives query: "신정규가 출연한 에피소드"
  1. fetch /api/episodes.json
  2. Filter: episodes.filter(ep => ep.hosts.includes("신정규"))
  3. Return filtered list with links

Agent receives query: "EP86에서 Claude Code에 대해 뭐라고 했어?"
  1. fetch /api/episodes/ep86.json
  2. Search chapters for "Claude Code" in transcript text
  3. Return relevant chapter content
```

## Implementation

Four Astro API route files in `src/pages/`:
- `src/pages/api/episodes.json.ts`
- `src/pages/api/episodes/[ep].json.ts`
- `src/pages/api/openapi.json.ts`
- `src/pages/.well-known/ai-plugin.json.ts`

Shared utility in `src/lib/` for MDX transcript parsing.
