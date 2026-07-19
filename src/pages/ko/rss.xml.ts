import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { episodeLabel, episodePath } from '../../lib/episodes';

export async function GET(context: APIContext) {
  const episodes = await getCollection('episodes', ({ data }) => data.lang === 'ko');
  const sortedEpisodes = episodes.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime()
  );

  return rss({
    title: 'AI Frontier (한국어)',
    description: 'AI 심층 대화 팟캐스트 - 노정석, 최승준',
    site: context.site || 'https://aifrontier.kr',
    items: sortedEpisodes.map((episode) => ({
      title: `${episodeLabel('ko', episode.data)}: ${episode.data.title}`,
      pubDate: episode.data.publishedAt,
      description: episode.data.description,
      link: episodePath('ko', episode.data),
    })),
    customData: `<language>ko</language>`,
  });
}
