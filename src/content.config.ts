import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const episodes = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/episodes' }),
  schema: z.object({
    episodeNumber: z.number(),
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    duration: z.string(),
    youtubeId: z.string(),
    thumbnail: z.string().optional(),
    hosts: z.array(z.string()).default(['노정석', '최승준']),
    guests: z.array(z.string()).default([]),
    chapters: z.array(z.object({
      time: z.string(),
      title: z.string(),
    })).default([]),
    lang: z.enum(['ko', 'en', 'ja', 'zh-Hans']),
    alternateSlug: z.string().nullable().default(null),
    resourcesUrl: z.string().optional(),
    notionUrl: z.string().optional(),
    // 이 에피소드와 연결할 아티클 slug(언어 디렉토리 제외, 예: 'agent-economy-2026').
    // 아티클 쪽 episodeNumber와 같은 효과로 양쪽 페이지에 상호 링크가 생긴다.
    articles: z.array(z.string()).default([]),
    // 'main' = 일반 에피소드(EP 1..N), 'interview' = 인터뷰 시리즈(별도 번호 체계)
    series: z.enum(['main', 'interview']).default('main'),
  }),
});

const articles = defineCollection({
  // [^_]* : _template.mdx 같은 언더스코어 파일은 빌드에서 제외
  loader: glob({ pattern: '**/[^_]*.mdx', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    episodeNumber: z.number().optional(),
    heroImage: z.string().optional(),
    authors: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['ko', 'en', 'ja', 'zh-Hans']),
    draft: z.boolean().default(false),
  }),
});

export const collections = { episodes, articles };
