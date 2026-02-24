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
        ...(d.notionUrl ? { resources: d.notionUrl } : {}),
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
