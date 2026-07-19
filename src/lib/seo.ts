import { episodeLabel, episodePath, type Lang, type Series } from './episodes';

export type { Lang };
export const ALL_LANGS: Lang[] = ['ko', 'en', 'ja', 'zh-Hans'];

export type HreflangLink = { hreflang: string; href: string };

export type EpisodeJsonLdInput = {
  site: string;
  lang: Lang;
  episodeNumber: number;
  title: string;
  description: string;
  publishedAt: string; // YYYY-MM-DD
  duration: string; // MM:SS or H:MM:SS
  youtubeId: string;
  thumbnail?: string | null;
  series?: Series; // 기본값 'main'
};

export type PodcastSeriesJsonLdInput = {
  site: string;
  lang: Lang;
  name: string;
  description: string;
  image?: string;
};

export type HreflangInput = {
  site: string;
  lang: Lang;
  alternatePath?: string | null;
  canonicalPath?: string | null;
};

export type SitemapEntry = { loc: string; lastmod?: string };
export type SitemapEpisode = { lang: Lang; episodeNumber: number; publishedAt: Date; series?: Series };
export type SitemapArticle = { lang: Lang; slug: string; publishedAt: Date; updatedAt?: Date | null };
export type SitemapEntriesInput = { site: string; episodes: SitemapEpisode[]; articles?: SitemapArticle[] };

export type ArticleJsonLdInput = {
  site: string;
  lang: Lang;
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // YYYY-MM-DD
  updatedAt?: string | null; // YYYY-MM-DD
  image?: string | null;
  authors?: string[];
  episodeNumber?: number | null;
};

const DEFAULT_THUMBNAIL_CACHE_BUSTER = new Date().toISOString();

function withCacheBuster(url: string, cacheBuster = DEFAULT_THUMBNAIL_CACHE_BUSTER): string {
  try {
    const u = new URL(url);
    u.searchParams.set('v', cacheBuster);
    return u.toString();
  } catch {
    return url;
  }
}

export function durationToIso(duration: string): string {
  const parts = duration.split(':').map((value) => Number(value));
  if (parts.some((value) => Number.isNaN(value))) return 'PT0S';
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  const segments: string[] = [];
  if (h) segments.push(`${h}H`);
  if (m) segments.push(`${m}M`);
  if (s) segments.push(`${s}S`);
  return `PT${segments.join('') || '0S'}`;
}

export function buildHreflangLinks({
  site,
  lang,
  alternatePath,
  canonicalPath,
}: HreflangInput): HreflangLink[] {
  const normalize = (path: string) => new URL(path, site).toString();
  const selfPath = canonicalPath ?? `/${lang}`;
  const links: HreflangLink[] = [
    { hreflang: lang, href: normalize(selfPath) },
  ];
  if (alternatePath) {
    const altLang = lang === 'ko' ? 'en' : 'ko';
    const altHref = normalize(alternatePath);
    links.push({ hreflang: altLang, href: altHref });
    links.push({ hreflang: 'x-default', href: normalize('/') });
  }
  return links;
}

export function buildCanonicalUrl({ site, path }: { site: string; path: string }): string {
  return new URL(path, site).toString();
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const lines = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : '';
      return `<url><loc>${entry.loc}</loc>${lastmod}</url>`;
    })
    .join('');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${lines}</urlset>`
  );
}

export function buildSitemapEntries({ site, episodes, articles = [] }: SitemapEntriesInput): SitemapEntry[] {
  const normalize = (path: string) => new URL(path, site).toString();
  // Build home entries with lastmod from latest episode per language
  const homeEntries = ALL_LANGS.map((lang) => {
    const latest = episodes
      .filter((e) => e.lang === lang)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0];
    return {
      loc: normalize(`/${lang}`),
      ...(latest && { lastmod: latest.publishedAt.toISOString().slice(0, 10) }),
    };
  });
  // Article index pages become part of the sitemap once the section has content
  const articleIndexEntries = articles.length
    ? ALL_LANGS.map((lang) => {
        const latest = articles
          .filter((a) => a.lang === lang)
          .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0];
        return {
          loc: normalize(`/${lang}/articles`),
          ...(latest && { lastmod: (latest.updatedAt ?? latest.publishedAt).toISOString().slice(0, 10) }),
        };
      })
    : [];
  // Interview index pages: 아티클 목록과 대칭으로, 인터뷰가 하나라도 있으면 4개 언어 목록 페이지를 포함한다.
  const interviews = episodes.filter((e) => e.series === 'interview');
  const interviewIndexEntries = interviews.length
    ? ALL_LANGS.map((lang) => {
        const latest = interviews
          .filter((e) => e.lang === lang)
          .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0];
        return {
          loc: normalize(`/${lang}/interviews`),
          ...(latest && { lastmod: latest.publishedAt.toISOString().slice(0, 10) }),
        };
      })
    : [];
  return [
    ...homeEntries,
    ...articleIndexEntries,
    ...interviewIndexEntries,
    ...episodes.map((episode) => ({
      loc: normalize(episodePath(episode.lang, episode)),
      lastmod: episode.publishedAt.toISOString().slice(0, 10),
    })),
    ...articles.map((article) => ({
      loc: normalize(`/${article.lang}/articles/${article.slug}`),
      lastmod: (article.updatedAt ?? article.publishedAt).toISOString().slice(0, 10),
    })),
  ];
}

export function buildArticleJsonLd(input: ArticleJsonLdInput) {
  const url = new URL(`/${input.lang}/articles/${input.slug}`, input.site).toString();
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    datePublished: input.publishedAt,
    dateModified: input.updatedAt ?? input.publishedAt,
    url,
    inLanguage: input.lang,
    image: input.image ?? undefined,
    author: input.authors?.length
      ? input.authors.map((name) => ({ '@type': 'Person', name }))
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'AI Frontier',
      url: input.site,
    },
    ...(input.episodeNumber != null && {
      isPartOf: {
        '@type': 'PodcastEpisode',
        name: `EP ${input.episodeNumber}`,
        url: new URL(`/${input.lang}/episodes/ep${input.episodeNumber}`, input.site).toString(),
      },
    }),
  };
}

export function buildPodcastEpisodeJsonLd(input: EpisodeJsonLdInput) {
  const url = new URL(episodePath(input.lang, input), input.site).toString();
  const thumbnail = input.thumbnail ?? null;
  const label = episodeLabel(input.lang, input);
  // 인터뷰는 메인 팟캐스트와 별도 PodcastSeries로 분리해 JSON-LD 상에서도 시리즈가 섞이지 않게 한다.
  const partOfSeries = input.series === 'interview'
    ? { '@type': 'PodcastSeries', '@id': `${input.site}#podcast-interviews`, name: 'AI Frontier Interviews' }
    : { '@type': 'PodcastSeries', '@id': `${input.site}#podcast`, name: 'AI Frontier' };
  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: `${label}: ${input.title}`,
    description: input.description,
    datePublished: input.publishedAt,
    duration: durationToIso(input.duration),
    episodeNumber: input.episodeNumber,
    url,
    image: thumbnail || undefined,
    partOfSeries,
    associatedMedia: {
      '@type': 'VideoObject',
      name: `${label}: ${input.title}`,
      embedUrl: `https://www.youtube.com/embed/${input.youtubeId}`,
      thumbnailUrl: thumbnail || undefined,
    },
  };
}

export function resolveEpisodeThumbnail({
  thumbnail,
  youtubeId,
  cacheBuster,
}: {
  thumbnail?: string | null;
  youtubeId?: string | null;
  cacheBuster?: string;
}): string | null {
  if (thumbnail) return withCacheBuster(thumbnail, cacheBuster);
  if (youtubeId) return withCacheBuster(`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`, cacheBuster);
  return null;
}

export function buildPodcastSeriesJsonLd(input: PodcastSeriesJsonLdInput) {
  const url = new URL(`/${input.lang}`, input.site).toString();
  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastSeries',
    '@id': `${input.site}#podcast`,
    name: input.name,
    description: input.description,
    url,
    inLanguage: input.lang,
    image: input.image,
    author: [
      { '@type': 'Person', name: '노정석', alternateName: 'Chester Roh' },
      { '@type': 'Person', name: '최승준', alternateName: 'Seungjoon Choi' },
      { '@type': 'Person', name: '김성현', alternateName: 'Seonghyun Kim' },
    ],
  };
}
