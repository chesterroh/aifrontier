import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { episodeLabel, episodePath, isInterview, isMainSeries } from '../lib/episodes';

export async function GET(context: APIContext) {
  const site = (context.site?.toString() ?? 'https://aifrontier.kr').replace(/\/$/, '');
  const episodes = await getCollection('episodes', ({ data }) => data.lang === 'ko' && isMainSeries(data));
  const sorted = episodes.sort((a, b) => b.data.episodeNumber - a.data.episodeNumber);
  const interviews = (await getCollection('episodes', ({ data }) => data.lang === 'ko' && isInterview(data)))
    .sort((a, b) => b.data.episodeNumber - a.data.episodeNumber);

  let ytMeta: Record<string, { title_en?: string; description_en?: string }> = {};
  try {
    const metaFile = await import('../../data/youtube_metadata.json');
    const metaArray = metaFile.default as Array<{ id: string; title_en?: string; description_en?: string }>;
    for (const entry of metaArray) {
      ytMeta[entry.id] = entry;
    }
  } catch {
    // data file may not exist
  }

  const lines: string[] = [
    '# AI Frontier — Full Content Index',
    '',
    '> AI 심층 대화 팟캐스트.',
    '> 노정석(Chester Roh), 최승준(Seungjoon Choi), 김성현(Seonghyun Kim)이 인공지능의 최신 기술·산업·철학을 깊이 있게 대화합니다.',
    '> A bilingual (Korean/English) deep-dive AI podcast exploring cutting-edge AI technology, industry trends, and philosophy.',
    '',
    `Site: ${site}`,
    `YouTube: https://www.youtube.com/@chester_roh`,
    `Korean RSS: ${site}/ko/rss.xml`,
    `English RSS: ${site}/en/rss.xml`,
    `Sitemap: ${site}/sitemap.xml`,
    '',
    `Total episodes: ${sorted.length}`,
    '',
    '---',
    '',
  ];

  for (const ep of sorted) {
    const d = ep.data;
    const url = `${site}${episodePath(d.lang, d)}`;
    const ytUrl = `https://www.youtube.com/watch?v=${d.youtubeId}`;
    const ytInfo = ytMeta[d.youtubeId] ?? {};
    const titleEn = ytInfo.title_en || '';
    const descEn = ytInfo.description_en || '';
    const resourcesUrl = d.resourcesUrl ?? d.notionUrl;

    lines.push(`## EP ${d.episodeNumber}: ${d.title}`);
    if (titleEn && titleEn !== d.title) {
      lines.push(`(EN) ${titleEn}`);
    }
    lines.push('');
    lines.push(`- Transcript: ${url}`);
    lines.push(`- YouTube: ${ytUrl}`);
    if (resourcesUrl) {
      lines.push(`- Resources: ${resourcesUrl}`);
    }
    lines.push(`- Published: ${d.publishedAt.toISOString().slice(0, 10)}`);
    lines.push(`- Duration: ${d.duration}`);
    lines.push(`- Hosts: ${d.hosts.join(', ')}`);
    lines.push('');
    lines.push(`### Description (KO)`);
    lines.push(d.description);
    if (descEn) {
      lines.push('');
      lines.push(`### Description (EN)`);
      lines.push(descEn);
    }
    lines.push('');
    if (d.chapters.length > 0) {
      lines.push('### Chapters');
      for (const ch of d.chapters) {
        lines.push(`- ${ch.time} ${ch.title}`);
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  if (interviews.length > 0) {
    lines.push('## Interviews');
    lines.push('');
    for (const interview of interviews) {
      const d = interview.data;
      const url = `${site}${episodePath(d.lang, d)}`;
      const ytUrl = `https://www.youtube.com/watch?v=${d.youtubeId}`;
      const resourcesUrl = d.resourcesUrl ?? d.notionUrl;

      lines.push(`### ${episodeLabel(d.lang, d)}: ${d.title}`);
      lines.push('');
      lines.push(`- Transcript: ${url}`);
      lines.push(`- YouTube: ${ytUrl}`);
      if (resourcesUrl) {
        lines.push(`- Resources: ${resourcesUrl}`);
      }
      lines.push(`- Published: ${d.publishedAt.toISOString().slice(0, 10)}`);
      lines.push(`- Duration: ${d.duration}`);
      lines.push('');
      lines.push(d.description);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
