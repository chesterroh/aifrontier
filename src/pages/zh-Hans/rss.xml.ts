import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { episodeLabel, episodePath } from '../../lib/episodes';

export async function GET(context: APIContext) {
  const episodes = await getCollection('episodes', ({ data }) => data.lang === 'zh-Hans');
  const sortedEpisodes = episodes.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime()
  );

  return rss({
    title: 'AI Frontier (中文)',
    description: 'AI深度对话播客 - 卢正锡、崔升准',
    site: context.site || 'https://aifrontier.kr',
    items: sortedEpisodes.map((episode) => ({
      title: `${episodeLabel('zh-Hans', episode.data)}: ${episode.data.title}`,
      pubDate: episode.data.publishedAt,
      description: episode.data.description,
      link: episodePath('zh-Hans', episode.data),
    })),
    customData: `<language>zh-Hans</language>`,
  });
}
