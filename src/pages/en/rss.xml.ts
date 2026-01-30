import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const episodes = await getCollection('episodes', ({ data }) => data.lang === 'en');
  const sortedEpisodes = episodes.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime()
  );

  return rss({
    title: 'AI Frontier (English)',
    description: 'AI Deep Dive Podcast - Jungsuk Noh, Seungjun Choi',
    site: context.site || 'https://aifrontier.kr',
    items: sortedEpisodes.map((episode) => ({
      title: `EP ${episode.data.episodeNumber}: ${episode.data.title}`,
      pubDate: episode.data.publishedAt,
      description: episode.data.description,
      link: `/en/episodes/ep${episode.data.episodeNumber}`,
    })),
    customData: `<language>en</language>`,
  });
}
