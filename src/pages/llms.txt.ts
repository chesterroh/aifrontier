import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const site = (context.site?.toString() ?? 'https://aifrontier.kr').replace(/\/$/, '');
  const episodes = await getCollection('episodes', ({ data }) => data.lang === 'ko');
  const sorted = episodes.sort((a, b) => b.data.episodeNumber - a.data.episodeNumber);

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
    '# AI Frontier',
    '> AI 심층 대화 팟캐스트 — 노정석, 최승준이 매주 인공지능의 최신 기술·산업·철학을 깊이 있게 이야기합니다.',
    '> A bilingual (Korean/English) deep-dive AI podcast by Chester Roh and Seungjun Choi.',
    '',
    `- Site: ${site}`,
    `- YouTube: https://www.youtube.com/@chester_roh`,
    `- Korean RSS: ${site}/ko/rss.xml`,
    `- English RSS: ${site}/en/rss.xml`,
    '',
    '## Episodes',
    '',
  ];

  for (const ep of sorted) {
    const d = ep.data;
    const url = `${site}/${d.lang}/episodes/ep${d.episodeNumber}`;
    const ytInfo = ytMeta[d.youtubeId] ?? {};
    const titleEn = ytInfo.title_en || '';

    lines.push(`### EP ${d.episodeNumber}: ${d.title}`);
    if (titleEn && titleEn !== d.title) {
      lines.push(`(EN) ${titleEn}`);
    }
    lines.push(`- URL: ${url}`);
    lines.push(`- Date: ${d.publishedAt.toISOString().slice(0, 10)}`);
    lines.push(`- Duration: ${d.duration}`);
    lines.push(`- Hosts: ${d.hosts.join(', ')}`);
    lines.push(`- ${d.description}`);
    if (d.chapters.length > 0) {
      lines.push(`- Topics: ${d.chapters.map((c) => c.title).join(' | ')}`);
    }
    lines.push('');
  }

  lines.push('## Optional');
  lines.push(`- [Full episode list (KO)](${site}/ko)`);
  lines.push(`- [Full episode list (EN)](${site}/en)`);
  lines.push(`- [YouTube Channel](https://www.youtube.com/@chester_roh)`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
