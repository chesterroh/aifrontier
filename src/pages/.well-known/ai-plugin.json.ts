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
