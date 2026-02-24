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
      ...(d.notionUrl ? { resources: d.notionUrl } : {}),
    },
    chapters,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
