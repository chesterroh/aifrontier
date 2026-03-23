import * as React from 'react';
import { Command } from 'cmdk';

type Lang = 'ko' | 'en' | 'ja' | 'zh-Hans';

type SearchCommandProps = {
  lang?: Lang;
};

const i18n = {
  ko: {
    placeholder: '검색...',
    noResults: '검색 결과가 없습니다',
    recentSearches: '최근 검색',
    clearRecent: '기록 삭제',
    showMore: '더 보기',
    close: '닫기',
    clearInput: '입력 지우기',
    dismissHighlight: '하이라이트 닫기',
    noRecentSearches: '최근 검색 기록이 없습니다',
    untitled: '제목 없음',
    section: '섹션',
  },
  en: {
    placeholder: 'Search...',
    noResults: 'No results found',
    recentSearches: 'Recent searches',
    clearRecent: 'Clear history',
    showMore: 'Show more',
    close: 'Close',
    clearInput: 'Clear input',
    dismissHighlight: 'Dismiss highlight',
    noRecentSearches: 'No recent searches',
    untitled: 'Untitled',
    section: 'Section',
  },
  ja: {
    placeholder: '検索...',
    noResults: '検索結果がありません',
    recentSearches: '最近の検索',
    clearRecent: '履歴を削除',
    showMore: 'もっと見る',
    close: '閉じる',
    clearInput: '入力をクリア',
    dismissHighlight: 'ハイライトを閉じる',
    noRecentSearches: '最近の検索履歴はありません',
    untitled: '無題',
    section: 'セクション',
  },
  'zh-Hans': {
    placeholder: '搜索...',
    noResults: '没有搜索结果',
    recentSearches: '最近搜索',
    clearRecent: '清除记录',
    showMore: '查看更多',
    close: '关闭',
    clearInput: '清空输入',
    dismissHighlight: '关闭高亮',
    noRecentSearches: '没有最近搜索记录',
    untitled: '无标题',
    section: '章节',
  },
} satisfies Record<
  Lang,
  {
    placeholder: string;
    noResults: string;
    recentSearches: string;
    clearRecent: string;
    showMore: string;
    close: string;
    clearInput: string;
    dismissHighlight: string;
    noRecentSearches: string;
    untitled: string;
    section: string;
  }
>;

const RECENT_SEARCHES_KEY = 'aif-recent-searches';
const MAX_RECENT_SEARCHES = 5;
const INITIAL_VISIBLE_RESULTS = 5;

type SearchLabels = (typeof i18n)[Lang];

type PagefindModule = {
  init: () => Promise<void>;
  search: (query: string) => Promise<{
    results?: PagefindSearchResult[];
  }>;
};

type PagefindSearchResult = {
  id?: string | number;
  data: () => Promise<PagefindSearchData>;
};

type PagefindSearchData = {
  url?: string;
  excerpt?: string;
  meta?: Record<string, string | undefined>;
  sub_results?: PagefindSubResult[];
};

type PagefindSubResult = {
  title?: string;
  url?: string;
  excerpt?: string;
};

type SearchItem = {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  group: string;
  episodeLabel?: string;
  isSubResult?: boolean;
};

let pagefind: PagefindModule | null = null;

async function loadPagefind() {
  if (pagefind) return pagefind;
  // String concatenation prevents Vite from analyzing the import at build time
  const pagefindPath = '/pagefind/' + 'pagefind.js';
  // @ts-ignore
  pagefind = (await import(/* @vite-ignore */ pagefindPath)) as PagefindModule;
  await pagefind.init();
  return pagefind;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

function detectMacPlatform() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function stripHtml(value?: string) {
  return (value ?? '').replace(/<[^>]*>/g, '').trim();
}

function extractEpisodeLabel(value?: string) {
  if (!value) return undefined;
  const match = value.match(/\bEP?\s*-?\s*(\d+)\b/i);
  return match ? `EP${match[1]}` : undefined;
}

function getRecentSearches() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  if (typeof window === 'undefined') return [];
  const normalized = term.trim();
  if (!normalized) return getRecentSearches();

  const next = [normalized, ...getRecentSearches().filter((item) => item !== normalized)].slice(0, MAX_RECENT_SEARCHES);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
}

function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(RECENT_SEARCHES_KEY);
}

function getGroupLabel(meta: Record<string, string | undefined> | undefined, title: string) {
  return (
    meta?.episode ||
    meta?.series ||
    meta?.category ||
    extractEpisodeLabel(title) ||
    title
  );
}

function buildNavigateUrl(rawUrl: string, query: string) {
  const url = new URL(rawUrl, window.location.origin);
  const normalized = query.trim();
  if (normalized) {
    url.searchParams.set('highlight', normalized);
  } else {
    url.searchParams.delete('highlight');
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function removeSearchHighlights() {
  document.querySelectorAll('mark.pagefind-highlight').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    parent.normalize();
  });
  // Also remove match navigator
  document.getElementById('match-nav')?.remove();
}

async function flattenResults(entries: PagefindSearchResult[], labels: SearchLabels): Promise<SearchItem[]> {
  const groups = await Promise.all(
    entries.map(async (entry, index) => {
      const data = await entry.data();
      const title = data.meta?.title?.trim() || stripHtml(data.excerpt) || labels.untitled;
      const url = data.url || '#';
      const group = getGroupLabel(data.meta, title);
      const episodeLabel = data.meta?.episode || extractEpisodeLabel(title);

      const items: SearchItem[] = [
        {
          id: `result-${entry.id ?? index}`,
          title,
          excerpt: data.excerpt ?? '',
          url,
          group,
          episodeLabel,
        },
      ];

      for (const [subIndex, subResult] of (data.sub_results ?? []).entries()) {
        if (!subResult.url) continue;
        items.push({
          id: `result-${entry.id ?? index}-sub-${subIndex}`,
          title: subResult.title?.trim() || title,
          excerpt: subResult.excerpt ?? '',
          url: subResult.url,
          group,
          episodeLabel,
          isSubResult: true,
        });
      }

      return items;
    }),
  );

  return groups.flat();
}

export default function SearchCommand({ lang = 'ko' }: SearchCommandProps) {
  const labels = i18n[lang] ?? i18n.en;
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchItem[]>([]);
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_VISIBLE_RESULTS);
  const [loading, setLoading] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [isMac, setIsMac] = React.useState(false);
  const [highlightTerm, setHighlightTerm] = React.useState('');

  const debouncedQuery = useDebouncedValue(query, 300);

  React.useEffect(() => {
    setIsMac(detectMacPlatform());
    setRecentSearches(getRecentSearches());

    const syncHighlight = () => {
      const params = new URLSearchParams(window.location.search);
      setHighlightTerm(params.get('highlight') ?? '');
    };

    syncHighlight();
    window.addEventListener('popstate', syncHighlight);
    return () => window.removeEventListener('popstate', syncHighlight);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [open]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      const normalized = debouncedQuery.trim();
      setVisibleCount(INITIAL_VISIBLE_RESULTS);

      if (!open || !normalized) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const loaded = await loadPagefind();
        const response = await loaded.search(normalized);
        const nextResults = await flattenResults(response.results ?? [], labels);
        if (!cancelled) {
          setResults(nextResults);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Pagefind search failed:', error);
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, labels, open]);

  const groupedResults = React.useMemo(() => {
    const visible = results.slice(0, visibleCount);
    const grouped = new Map<string, SearchItem[]>();

    for (const item of visible) {
      const existing = grouped.get(item.group) ?? [];
      existing.push(item);
      grouped.set(item.group, existing);
    }

    return Array.from(grouped.entries());
  }, [results, visibleCount]);

  const hasQuery = query.trim().length > 0;
  const hasResults = results.length > 0;
  const canShowMore = results.length > visibleCount;

  const shortcutLabel = isMac ? '⌘K' : 'Ctrl+K';

  const navigateToResult = React.useCallback(
    (item: SearchItem, sourceQuery?: string) => {
      const effectiveQuery = (sourceQuery ?? query).trim();
      if (effectiveQuery) {
        setRecentSearches(saveRecentSearch(effectiveQuery));
      }
      window.location.href = buildNavigateUrl(item.url, effectiveQuery);
    },
    [query],
  );

  const dismissHighlight = React.useCallback(() => {
    removeSearchHighlights();
    const url = new URL(window.location.href);
    url.searchParams.delete('highlight');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    setHighlightTerm('');
  }, []);

  return (
    <div className="font-[Pretendard_Variable,Inter,sans-serif]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={labels.placeholder}
          onClick={() => setOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white/85 px-3 text-sm text-gray-700 shadow-sm backdrop-blur transition hover:border-sky-300 hover:text-sky-600 dark:border-gray-700 dark:bg-gray-900/85 dark:text-gray-200 dark:hover:border-sky-500 dark:hover:text-sky-400"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0a7 7 0 0114 0z"
            />
          </svg>
          <span className="hidden sm:inline">{labels.placeholder}</span>
          <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            {shortcutLabel}
          </span>
        </button>

        {highlightTerm ? (
          <span className="inline-flex max-w-[120px] items-center gap-1 rounded-full bg-yellow-200 px-2.5 py-1 text-xs text-yellow-900 dark:bg-yellow-700/80 dark:text-yellow-50">
            <span className="truncate">{highlightTerm}</span>
            <button
              type="button"
              onClick={dismissHighlight}
              aria-label={labels.dismissHighlight}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[13px] leading-none opacity-80 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
            >
              ×
            </button>
          </span>
        ) : null}
      </div>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        loop
        label={labels.placeholder}
        overlayClassName="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100"
        contentClassName="fixed left-1/2 top-[12vh] z-50 w-[min(42rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl outline-none transition-all duration-200 data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100 dark:border-gray-700 dark:bg-gray-900/95"
      >
        <div className="border-b border-gray-200/80 px-3 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0a7 7 0 0114 0z"
              />
            </svg>

            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder={labels.placeholder}
              className="h-10 flex-1 bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
            />

            {loading ? (
              <span
                aria-hidden="true"
                className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-sky-500/25 border-t-sky-500"
              />
            ) : null}

            {hasQuery ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={labels.clearInput}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                ×
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 items-center rounded-lg border border-gray-200 px-2 text-xs text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
            >
              {labels.close}
            </button>
          </div>
        </div>

        <Command.List className="max-h-[min(70vh,32rem)] overflow-y-auto p-2">
          {!hasQuery ? (
            <>
              <div className="flex items-center justify-between px-2 pb-2 pt-1">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                  {labels.recentSearches}
                </p>

                {recentSearches.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearRecentSearches();
                      setRecentSearches([]);
                    }}
                    className="text-xs text-gray-500 transition hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400"
                  >
                    {labels.clearRecent}
                  </button>
                ) : null}
              </div>

              {recentSearches.length > 0 ? (
                recentSearches.map((term) => (
                  <Command.Item
                    key={term}
                    value={`recent-${term}`}
                    onSelect={() => setQuery(term)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-700 outline-none transition hover:bg-sky-50 data-[selected=true]:bg-sky-50 dark:text-gray-200 dark:hover:bg-gray-800 dark:data-[selected=true]:bg-gray-800"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      ↺
                    </span>
                    <span className="truncate">{term}</span>
                  </Command.Item>
                ))
              ) : (
                <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {labels.noRecentSearches}
                </div>
              )}
            </>
          ) : null}

          {hasQuery && loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="rounded-xl border border-gray-200/70 p-4 dark:border-gray-800">
                  <div className="mb-3 h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="mb-2 h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800/80" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800/80" />
                </div>
              ))}
            </div>
          ) : null}

          {hasQuery && !loading && hasResults ? (
            <>
              {groupedResults.map(([group, items]) => (
                <Command.Group
                  key={group}
                  heading={group}
                  className="px-1 py-2 text-xs text-gray-500 dark:text-gray-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em]"
                >
                  {items.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.title} ${stripHtml(item.excerpt)} ${item.url}`}
                      onSelect={() => navigateToResult(item)}
                      className="cursor-pointer rounded-2xl px-3 py-3 outline-none transition hover:bg-sky-50 data-[selected=true]:bg-sky-50 dark:hover:bg-gray-800 dark:data-[selected=true]:bg-gray-800"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</p>

                          {item.episodeLabel ? (
                            <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                              {item.episodeLabel}
                            </span>
                          ) : null}

                          {item.isSubResult ? (
                            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              {labels.section}
                            </span>
                          ) : null}
                        </div>

                        {item.excerpt ? (
                          <p
                            className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600 dark:text-gray-300 [&_mark]:rounded-sm [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:text-inherit dark:[&_mark]:bg-yellow-600/70"
                            dangerouslySetInnerHTML={{ __html: item.excerpt }}
                          />
                        ) : null}

                        <p className="mt-2 truncate text-xs text-sky-600 dark:text-sky-400">{item.url}</p>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}

              {canShowMore ? (
                <div className="px-3 pb-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE_RESULTS)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-sky-500 dark:hover:bg-gray-800 dark:hover:text-sky-300"
                  >
                    {labels.showMore}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {hasQuery && !loading && !hasResults ? (
            <Command.Empty className="px-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              {labels.noResults}
            </Command.Empty>
          ) : null}
        </Command.List>
      </Command.Dialog>
    </div>
  );
}
