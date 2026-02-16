export type HreflangLink = { hreflang: string; href: string };

export type EpisodeJsonLdInput = {
  site: string;
  lang: 'ko' | 'en';
  episodeNumber: number;
  title: string;
  description: string;
  publishedAt: string; // YYYY-MM-DD
  duration: string; // MM:SS or H:MM:SS
  youtubeId: string;
  thumbnail?: string | null;
};

export type PodcastSeriesJsonLdInput = {
  site: string;
  lang: 'ko' | 'en';
  name: string;
  description: string;
  image?: string;
};

export type HreflangInput = {
  site: string;
  lang: 'ko' | 'en';
  alternatePath?: string | null;
  canonicalPath?: string | null;
};

export type SitemapEntry = { loc: string; lastmod?: string };
export type SitemapEpisode = { lang: 'ko' | 'en'; episodeNumber: number; publishedAt: Date };
export type SitemapEntriesInput = { site: string; episodes: SitemapEpisode[] };

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

export function buildSitemapEntries({ site, episodes }: SitemapEntriesInput): SitemapEntry[] {
  const normalize = (path: string) => new URL(path, site).toString();
  return [
    { loc: normalize('/ko') },
    { loc: normalize('/en') },
    ...episodes.map((episode) => ({
      loc: normalize(`/${episode.lang}/episodes/ep${episode.episodeNumber}`),
      lastmod: episode.publishedAt.toISOString().slice(0, 10),
    })),
  ];
}

export function buildPodcastEpisodeJsonLd(input: EpisodeJsonLdInput) {
  const url = new URL(`/${input.lang}/episodes/ep${input.episodeNumber}`, input.site).toString();
  const thumbnail = input.thumbnail ?? null;
  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: `EP ${input.episodeNumber}: ${input.title}`,
    description: input.description,
    datePublished: input.publishedAt,
    duration: durationToIso(input.duration),
    episodeNumber: input.episodeNumber,
    url,
    image: thumbnail || undefined,
    partOfSeries: {
      '@type': 'PodcastSeries',
      '@id': `${input.site}#podcast`,
      name: 'AI Frontier',
    },
    associatedMedia: {
      '@type': 'VideoObject',
      name: `EP ${input.episodeNumber}: ${input.title}`,
      embedUrl: `https://www.youtube.com/embed/${input.youtubeId}`,
      thumbnailUrl: thumbnail || undefined,
    },
  };
}

export function resolveEpisodeThumbnail({
  thumbnail,
  youtubeId,
}: {
  thumbnail?: string | null;
  youtubeId?: string | null;
}): string | null {
  if (thumbnail) return thumbnail;
  if (youtubeId) return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
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
