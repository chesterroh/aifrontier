import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { episodeLabel, episodePath } from '../../lib/episodes';

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
      title: `${episodeLabel('ja', episode.data)}: ${episode.data.title}`,
      pubDate: episode.data.publishedAt,
      description: episode.data.description,
      link: episodePath('ja', episode.data),
    })),
    customData: `<language>ja</language>`,
  });
}
