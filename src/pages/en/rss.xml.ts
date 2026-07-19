import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { episodeLabel, episodePath } from '../../lib/episodes';

export async function GET(context: APIContext) {
  const episodes = await getCollection('episodes', ({ data }) => data.lang === 'en');
  const sortedEpisodes = episodes.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime()
  );

  return rss({
    title: 'AI Frontier (English)',
    description: 'AI Deep Dive Podcast - Chester Roh, Seungjoon Choi, Seonghyun Kim',
    site: context.site || 'https://aifrontier.kr',
    items: sortedEpisodes.map((episode) => ({
      title: `${episodeLabel('en', episode.data)}: ${episode.data.title}`,
      pubDate: episode.data.publishedAt,
      description: episode.data.description,
      link: episodePath('en', episode.data),
    })),
    customData: `<language>en</language>`,
  });
}
