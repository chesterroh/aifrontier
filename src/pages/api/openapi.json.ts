import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const site = (context.site?.toString() ?? 'https://aifrontier.kr').replace(/\/$/, '');

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'AI Frontier Podcast API',
      description: 'Static JSON API for AI agents. Lists episodes with metadata and provides chapter-level transcripts.',
      version: '1.0.0',
    },
    servers: [{ url: site }],
    paths: {
      '/api/episodes.json': {
        get: {
          operationId: 'listEpisodes',
          summary: 'Get all episodes with metadata (hosts, chapters, dates, URLs). Filter client-side by hosts array, chapter titles, or published date.',
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
          summary: 'Get one episode with chapter-level transcripts. Each chapter has time, title, speakers, and full transcript text.',
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
