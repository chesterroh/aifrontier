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
    chapters: z.array(z.object({
      time: z.string(),
      title: z.string(),
    })).default([]),
    lang: z.enum(['ko', 'en']),
    alternateSlug: z.string().nullable().default(null),
    notionUrl: z.string().optional(),
  }),
});

export const collections = { episodes };
