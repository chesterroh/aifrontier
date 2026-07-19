// 에피소드(main)와 인터뷰(interview) 시리즈 공통 경로/라벨 헬퍼.
// episodes 컬렉션은 series 필드로 구분되며, URL·라벨 규칙이 다르므로
// 이 두 규칙을 아는 곳을 이 파일 하나로 모은다.

export type Lang = 'ko' | 'en' | 'ja' | 'zh-Hans';
export type Series = 'main' | 'interview';

export type SeriesEntry = {
  series?: Series;
  episodeNumber: number;
};

const INTERVIEW_LABEL: Record<Lang, string> = {
  ko: '인터뷰',
  en: 'Interview',
  ja: 'インタビュー',
  'zh-Hans': '访谈',
};

export const INTERVIEW_NAV_LABEL: Record<Lang, string> = {
  ko: '인터뷰',
  en: 'Interviews',
  ja: 'インタビュー',
  'zh-Hans': '访谈',
};

export function isInterview(entry: SeriesEntry): boolean {
  return entry.series === 'interview';
}

export function isMainSeries(entry: SeriesEntry): boolean {
  return (entry.series ?? 'main') !== 'interview';
}

// 상세 페이지 경로: main -> /{lang}/episodes/ep{n}, interview -> /{lang}/interviews/{n}
export function episodePath(lang: Lang, entry: SeriesEntry): string {
  return isInterview(entry)
    ? `/${lang}/interviews/${entry.episodeNumber}`
    : `/${lang}/episodes/ep${entry.episodeNumber}`;
}

// 뱃지/브레드크럼 라벨: main -> "EP {n}", interview -> "인터뷰 {n}" 등 언어별
export function episodeLabel(lang: Lang, entry: SeriesEntry): string {
  if (isInterview(entry)) {
    const label = INTERVIEW_LABEL[lang] ?? INTERVIEW_LABEL.en;
    return `${label} ${entry.episodeNumber}`;
  }
  return `EP ${entry.episodeNumber}`;
}

// alternateSlug 정규화: "ep83" / "interview1" / "1"처럼 접두사 유무와 무관하게
// 끝의 숫자만 뽑아 series 번호로 쓴다. 접두사가 없어도(interview 권장 표기) 동작한다.
export function extractSeriesNumber(slug: string): number | null {
  const match = slug.match(/(\d+)\s*$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}
