import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const episodes = await getCollection('episodes', ({ data }) => data.lang === 'ja');
  const sortedEpisodes = episodes.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime()
  );

  return rss({
    title: 'AI Frontier (日本語)',
    description: 'AI深層対話ポッドキャスト - ノ・ジョンソク、チェ・スンジュン',
    site: context.site || 'https://aifrontier.kr',
    items: sortedEpisodes.map((episode) => ({
      title: `EP ${episode.data.episodeNumber}: ${episode.data.title}`,
      pubDate: episode.data.publishedAt,
      description: episode.data.description,
      link: `/ja/episodes/ep${episode.data.episodeNumber}`,
    })),
    customData: `<language>ja</language>`,
  });
}
