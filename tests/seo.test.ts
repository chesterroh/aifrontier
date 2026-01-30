import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  durationToIso,
  buildHreflangLinks,
  buildCanonicalUrl,
  buildSitemapXml,
  buildSitemapEntries,
  buildPodcastEpisodeJsonLd,
  buildPodcastSeriesJsonLd,
  resolveEpisodeThumbnail,
} from '../src/lib/seo';

test('durationToIso converts MM:SS and H:MM:SS to ISO-8601', () => {
  assert.equal(durationToIso('53:55'), 'PT53M55S');
  assert.equal(durationToIso('1:02:03'), 'PT1H2M3S');
});

test('buildHreflangLinks includes self and alternate', () => {
  const links = buildHreflangLinks({
    site: 'https://aifrontier.kr',
    lang: 'ko',
    alternatePath: '/en',
  });
  assert.equal(links.length, 3);
  assert.deepEqual(
    links.map((link) => link.hreflang).sort(),
    ['en', 'ko', 'x-default']
  );
  const xDefault = links.find((link) => link.hreflang === 'x-default');
  assert.equal(xDefault?.href, 'https://aifrontier.kr/');
});

test('buildHreflangLinks uses canonicalPath for self', () => {
  const links = buildHreflangLinks({
    site: 'https://aifrontier.kr',
    lang: 'ko',
    canonicalPath: '/ko/episodes/ep83',
    alternatePath: '/en/episodes/ep83',
  });
  const self = links.find((link) => link.hreflang === 'ko');
  assert.equal(self?.href, 'https://aifrontier.kr/ko/episodes/ep83');
});

test('buildCanonicalUrl joins site and path', () => {
  assert.equal(
    buildCanonicalUrl({ site: 'https://aifrontier.kr', path: '/ko/episodes/ep83' }),
    'https://aifrontier.kr/ko/episodes/ep83'
  );
});

test('buildSitemapXml renders url entries with lastmod', () => {
  const xml = buildSitemapXml([
    { loc: 'https://aifrontier.kr/ko', lastmod: '2026-01-26' },
    { loc: 'https://aifrontier.kr/en', lastmod: '2026-01-20' },
  ]);
  assert.ok(xml.includes('<urlset'));
  assert.ok(xml.includes('<loc>https://aifrontier.kr/ko</loc>'));
  assert.ok(xml.includes('<lastmod>2026-01-26</lastmod>'));
});

test('buildSitemapEntries includes ko/en roots and episode entries', () => {
  const entries = buildSitemapEntries({
    site: 'https://aifrontier.kr',
    episodes: [
      { lang: 'ko', episodeNumber: 83, publishedAt: new Date('2026-01-26') },
      { lang: 'en', episodeNumber: 12, publishedAt: new Date('2025-12-01') },
    ],
  });

  const locs = entries.map((entry) => entry.loc);
  assert.ok(locs.includes('https://aifrontier.kr/ko'));
  assert.ok(locs.includes('https://aifrontier.kr/en'));
  assert.ok(locs.includes('https://aifrontier.kr/ko/episodes/ep83'));
  assert.ok(locs.includes('https://aifrontier.kr/en/episodes/ep12'));
  const koEpisode = entries.find((entry) => entry.loc.endsWith('/ko/episodes/ep83'));
  assert.equal(koEpisode?.lastmod, '2026-01-26');
});

test('buildPodcastEpisodeJsonLd builds a PodcastEpisode payload', () => {
  const jsonLd = buildPodcastEpisodeJsonLd({
    site: 'https://aifrontier.kr',
    lang: 'ko',
    episodeNumber: 83,
    title: '테스트 에피소드',
    description: '설명',
    publishedAt: '2026-01-26',
    duration: '53:55',
    youtubeId: 'AuF7V7bqsrQ',
    thumbnail: 'https://i.ytimg.com/vi/AuF7V7bqsrQ/maxresdefault.jpg',
  });
  assert.equal(jsonLd['@type'], 'PodcastEpisode');
  assert.equal(jsonLd.duration, 'PT53M55S');
  assert.ok(jsonLd.associatedMedia.embedUrl.includes('youtube.com'));
});

test('resolveEpisodeThumbnail prefers explicit thumbnail', () => {
  assert.equal(
    resolveEpisodeThumbnail({ thumbnail: 'https://cdn.example.com/img.jpg', youtubeId: 'abc' }),
    'https://cdn.example.com/img.jpg'
  );
});

test('resolveEpisodeThumbnail falls back to hqdefault', () => {
  assert.equal(
    resolveEpisodeThumbnail({ thumbnail: null, youtubeId: 'abc' }),
    'https://i.ytimg.com/vi/abc/hqdefault.jpg'
  );
});

test('resolveEpisodeThumbnail returns null without thumbnail or youtubeId', () => {
  assert.equal(resolveEpisodeThumbnail({ thumbnail: null, youtubeId: '' }), null);
});

test('buildPodcastEpisodeJsonLd omits image fields without thumbnail', () => {
  const jsonLd = buildPodcastEpisodeJsonLd({
    site: 'https://aifrontier.kr',
    lang: 'ko',
    episodeNumber: 1,
    title: 'No Image',
    description: 'desc',
    publishedAt: '2026-01-01',
    duration: '01:00',
    youtubeId: '',
    thumbnail: null,
  });
  assert.equal(jsonLd.image, undefined);
  assert.equal(jsonLd.associatedMedia?.thumbnailUrl, undefined);
});

test('buildPodcastSeriesJsonLd builds a PodcastSeries payload', () => {
  const jsonLd = buildPodcastSeriesJsonLd({
    site: 'https://aifrontier.kr',
    lang: 'ko',
    name: 'AI Frontier',
    description: '팟캐스트 설명',
    image: 'https://aifrontier.kr/og.png',
  });
  assert.equal(jsonLd['@type'], 'PodcastSeries');
  assert.equal(jsonLd['@id'], 'https://aifrontier.kr#podcast');
  assert.equal(jsonLd.inLanguage, 'ko');
});

test('robots.txt declares sitemap and allows all', () => {
  const content = readFileSync('public/robots.txt', 'utf-8');
  assert.ok(content.includes('User-agent: *'));
  assert.ok(content.includes('Allow: /'));
  assert.ok(content.includes('Sitemap: https://aifrontier.kr/sitemap.xml'));
});

test('llm.txt mirrors llms.txt', () => {
  const llms = readFileSync('public/llms.txt', 'utf-8').trim();
  const llm = readFileSync('public/llm.txt', 'utf-8').trim();
  assert.equal(llm, llms);
});
