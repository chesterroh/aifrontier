import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { buildSitemapEntries, buildSitemapXml } from '../lib/seo';
import { articleSlug } from '../lib/articles';

export async function GET(context: APIContext) {
  const site = context.site?.toString() ?? 'https://aifrontier.kr';
  const episodes = await getCollection('episodes');
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  const entries = buildSitemapEntries({
    site,
    episodes: episodes.map((episode) => ({
      lang: episode.data.lang,
      episodeNumber: episode.data.episodeNumber,
      publishedAt: episode.data.publishedAt,
    })),
    articles: articles.map((article) => ({
      lang: article.data.lang,
      slug: articleSlug(article),
      publishedAt: article.data.publishedAt,
      updatedAt: article.data.updatedAt ?? null,
    })),
  });

  return new Response(buildSitemapXml(entries), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
