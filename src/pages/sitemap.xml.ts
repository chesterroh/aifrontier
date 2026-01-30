import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { buildSitemapEntries, buildSitemapXml } from '../lib/seo';

export async function GET(context: APIContext) {
  const site = context.site?.toString() ?? 'https://aifrontier.kr';
  const episodes = await getCollection('episodes');
  const entries = buildSitemapEntries({
    site,
    episodes: episodes.map((episode) => ({
      lang: episode.data.lang,
      episodeNumber: episode.data.episodeNumber,
      publishedAt: episode.data.publishedAt,
    })),
  });

  return new Response(buildSitemapXml(entries), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
