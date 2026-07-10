import type { CollectionEntry } from 'astro:content';

// 아티클 entry id는 'ko/ep102-ai-business-perspective'처럼 언어 디렉토리를 포함한다.
// URL slug는 언어 디렉토리를 뗀 나머지 경로를 사용한다.
export function articleSlug(article: CollectionEntry<'articles'>): string {
  return article.id.split('/').slice(1).join('/');
}

export function articlePath(article: CollectionEntry<'articles'>): string {
  return `/${article.data.lang}/articles/${articleSlug(article)}`;
}
