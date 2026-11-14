// Language lookup for the weight-space-programming 3D views.
import ko from './ko';
import en from './en';
import ja from './ja';
import zhHans from './zh-Hans';

export type WspLang = 'ko' | 'en' | 'ja' | 'zh-Hans';
const ALL = { ko, en, ja, 'zh-Hans': zhHans } as Record<string, typeof ko>;

export function getStrings(lang: string | undefined): typeof ko {
  return ALL[lang ?? 'ko'] ?? ko;
}

/** Fill `{name}` placeholders. */
export function tpl(s: string, vars: Record<string, string | number> = {}): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Pick the reader's language from a `{ko, en, ...}` value in the data files; plain strings pass through. */
export function pick(v: any, lang: string): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return v[lang] ?? v.ko ?? '';
}

const LOCALE: Record<string, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', 'zh-Hans': 'zh-CN' };

/** Number formatting in each language's own large-number units. */
export function numberFormat(lang: string) {
  const loc = LOCALE[lang] ?? 'en-US';
  const int = (v: number) => Math.round(v).toLocaleString(loc);
  const big = (v: number) => {
    if (lang === 'en') {
      if (v >= 1e9) return (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + 'B';
      if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e8 ? 0 : 1) + 'M';
      if (v >= 1e4) return Math.round(v / 1e3).toLocaleString(loc) + 'K';
      return int(v);
    }
    const [man, eok] = lang === 'ko' ? ['만', '억'] : lang === 'ja' ? ['万', '億'] : ['万', '亿'];
    if (v >= 1e8) return (v / 1e8).toFixed(v >= 1e9 ? 0 : 1) + eok;
    if (v >= 1e4) return Math.round(v / 1e4).toLocaleString(loc) + man;
    return int(v);
  };
  return { int, big, pct: (v: number, d = 1) => (v * 100).toFixed(d) + '%' };
}
