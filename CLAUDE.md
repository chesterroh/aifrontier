# AI Frontier Blog - CLAUDE.md

이 문서는 AI Frontier 블로그 개발, 콘텐츠 기여, 운영에 대한 종합 가이드입니다.

## Git 커밋 규칙

- Co-Authored-By 표기 금지
- 커밋 메시지는 한 줄로 작성

## 프로젝트 개요

**AI Frontier**는 Astro 5로 구축된 다국어(한국어/영어/일본어/중국어 간체) 팟캐스트 블로그입니다.
- **사이트**: https://aifrontier.kr
- **기능**: 에피소드 트랜스크립트, 챕터 네비게이션, 인터랙티브 YouTube 플레이어, 전문 검색

## 디렉토리 구조

```
blog/
├── src/
│   ├── pages/              # Astro 라우팅 (파일 기반)
│   │   ├── index.astro     # /ko로 리다이렉트
│   │   ├── ko/             # 한국어 페이지
│   │   │   ├── index.astro # 홈 (에피소드 그리드)
│   │   │   ├── episodes/[...slug].astro  # 에피소드 상세
│   │   │   └── rss.xml.ts  # RSS 피드
│   │   ├── en/             # 영어 페이지 (동일 구조)
│   │   ├── ja/             # 일본어 페이지
│   │   └── zh-Hans/        # 중국어 간체 페이지
│   ├── components/         # 재사용 컴포넌트
│   │   ├── YouTubeEmbed.astro  # 플레이어 + 미니/모달 (에피소드 페이지 전용)
│   │   ├── ChapterNav.astro    # 챕터 네비게이션
│   │   ├── LanguageSwitcher.astro
│   │   ├── Search.astro        # Pagefind 검색
│   │   ├── ArticleCard.astro   # 아티클 목록 카드
│   │   ├── Figure.astro        # 아티클용 이미지+캡션
│   │   ├── VideoEmbed.astro    # 아티클용 YouTube/로컬 영상 임베드
│   │   └── ResourceLink.astro  # 파일/외부 링크 카드
│   ├── layouts/
│   │   ├── BaseLayout.astro    # 공통 레이아웃 (헤더/푸터)
│   │   ├── EpisodeLayout.astro # 에피소드 페이지 레이아웃
│   │   └── ArticleLayout.astro # 아티클 페이지 레이아웃
│   ├── content/
│   │   ├── episodes/
│   │   │   ├── ko/         # 한국어 에피소드 (.mdx)
│   │   │   ├── en/         # 영어 에피소드 (.mdx)
│   │   │   ├── ja/         # 일본어 에피소드 (.mdx)
│   │   │   └── zh-Hans/    # 중국어 간체 에피소드 (.mdx)
│   │   └── articles/
│   │       ├── _template.mdx   # 아티클 템플릿 (빌드 제외)
│   │       └── {ko,en,ja,zh-Hans}/  # 언어별 아티클 (.mdx)
│   └── styles/global.css   # 글로벌 스타일
├── scripts/
│   └── sync-episodes.ts    # srt2md → 블로그 동기화
├── data/                   # YouTube 메타데이터 등
├── public/                 # 정적 에셋
└── dist/                   # 빌드 결과물
```

## 개발 환경 설정

### 사전 요구사항
- Node.js 18+
- npm 또는 pnpm

### 설치 및 실행

```bash
cd blog
npm install

# 개발 서버 (http://localhost:4321)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

### 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 시작 (4321 포트) |
| `npm run build` | 프로덕션 빌드 + Pagefind 인덱싱 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run sync` | 에피소드 동기화 스크립트 |

---

## 콘텐츠 기여 가이드

### 에피소드 파일 구조

에피소드는 `src/content/episodes/{lang}/ep{N}.mdx` 형식의 MDX 파일입니다.

```yaml
---
episodeNumber: 83
title: "이야기로 읽는 트랜스포머: 윤회하는 토큰의 순례"
description: "트랜스포머의 원리를 이야기로 풀어봅니다..."
publishedAt: 2026-01-26
duration: "53:55"
youtubeId: "AuF7V7bqsrQ"
thumbnail: "https://i.ytimg.com/vi/AuF7V7bqsrQ/maxresdefault.jpg"
hosts:
  - 노정석
  - 최승준
chapters:
  - time: "0:00"
    title: "오프닝: 트랜스포머 기본 이어가기"
  - time: "1:11"
    title: "윤회하는 토큰의 순례"
---

## 오프닝: 트랜스포머 기본 이어가기    *0:00*

**노정석**
*00:00*  녹화를 하고 있는 오늘은...
```

### Frontmatter 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `episodeNumber` | number | O | 에피소드 번호 |
| `title` | string | O | 에피소드 제목 |
| `description` | string | O | 설명 (200자 내외) |
| `publishedAt` | date | O | 발행일 (YYYY-MM-DD) |
| `duration` | string | O | 재생 시간 ("MM:SS" 또는 "H:MM:SS") |
| `youtubeId` | string | O | YouTube 영상 ID |
| `thumbnail` | string | - | 썸네일 URL (기본: YouTube 썸네일) |
| `hosts` | string[] | - | 호스트 목록. 다국어 에피소드는 각 언어 표기 사용 |
| `chapters` | array | O | 챕터 목록 [{time, title}] |
| `lang` | 'ko'\|'en' | - | 언어 (경로에서 자동 추론) |
| `alternateSlug` | string | - | 번역본 연결용 slug |

### 본문 작성 규칙

#### 1. 챕터 제목 (H2)
```markdown
## 챕터 제목    *MM:SS*
```
- `*MM:SS*` 형식의 타임스탬프 필수
- 클릭 시 해당 시간으로 이동

#### 2. 화자 표시
```markdown
**노정석**
*00:00*  발언 내용...
```
- 굵은 글씨로 화자 이름
- 이탤릭으로 타임스탬프

#### 3. 단락 타임스탬프
```markdown
*12:34*  이 단락의 내용...
```
- 단락 시작에 이탤릭 타임스탬프
- 클릭 시 해당 시간으로 이동

### 새 에피소드 추가 방법

#### 방법 1: 수동 생성
1. `src/content/episodes/ko/ep{N}.mdx` 파일 생성
2. frontmatter 작성 (위 예시 참조)
3. 트랜스크립트 본문 작성

#### 방법 2: srt2md 파이프라인 활용
```bash
# 1. srt2md로 트랜스크립트 생성
make ep EP=84

# 2. 블로그로 동기화
cd blog
npx tsx scripts/sync-episodes.ts --ep 84

# 3. youtubeId, publishedAt 수동 수정
```

#### 방법 3: YouTube 메타데이터 활용
```bash
# data/youtube_metadata.json에서 정보 확인
# youtubeId, duration, title 등을 가져와서 frontmatter 작성
```

### 다국어 버전 추가

1. `src/content/episodes/{en,ja,zh-Hans}/ep{N}.mdx` 생성
2. `lang: "en"`, `lang: "ja"`, `lang: "zh-Hans"` 설정
3. 호스트/화자명은 언어별 기존 관례를 따른다.
   - EN: `Chester Roh`, `Seungjoon Choi`, `Seonghyun Kim`
   - JA: `ロ・ジョンソク`, `チェ・スンジュン`, `キム・ソンヒョン`
   - ZH-Hans: `卢正锡`, `崔升准`, `金成贤`
4. 한국어/영어 slug가 다를 때만 한국어 버전에 `alternateSlug` 추가하여 연결:
   ```yaml
   # ko/ep83.mdx
   alternateSlug: "ep83"
   ```
   인터뷰(`series: interview`)는 `alternateSlug`에 숫자 문자열("1")과 "ep" 접두 없는 시리즈 번호를 권장한다.
   `interview1`처럼 접두사가 붙어도 EpisodeLayout·LanguageSwitcher가 숫자만 추출해 `/{lang}/interviews/{n}`으로
   정규화하므로 깨지지 않지만, 새로 작성할 때는 숫자만 쓴다.

---

## 인터뷰 섹션

일반 에피소드(EP 1..N)와 별도 번호 체계를 쓰는 인터뷰 시리즈. 같은 `episodes` 컬렉션 안에서
frontmatter `series: 'interview'`로 구분하며, `episodeNumber`는 시리즈 내 표시 번호를 뜻한다(인터뷰 1 = `episodeNumber: 1`).

- **경로**: 파일 `src/content/episodes/{lang}/interview{n}.mdx`, URL `/{lang}/interviews/{n}`(상세), `/{lang}/interviews`(목록)
- **frontmatter**: main 에피소드와 동일한 필드 + `series: "interview"`. 생략 시 기본값은 `"main"`.
- **공통 헬퍼**: `src/lib/episodes.ts`의 `episodePath`/`episodeLabel`이 시리즈별 URL·라벨(EP {n} vs 인터뷰/Interview/インタビュー/访谈 {n})을 계산한다. 새 페이지·피드·JSON-LD를 만들 때는 하드코딩 대신 이 헬퍼를 쓴다.
- **아티클 연계 계약**: `articles` 컬렉션의 `episodeNumber`는 **메인 에피소드만** 참조한다. 인터뷰와 연결되는 아티클은 없으며, `EpisodeLayout`의 관련 아티클 블록은 `series === 'main'`일 때만 조회하고 `ArticleLayout`의 관련 에피소드 후보도 `isMainSeries` 필터를 거친다. 인터뷰를 아티클에 연결하려는 요구가 생기면 스키마 확장이 먼저 필요하다.
- **JSON-LD**: 인터뷰는 별도 `PodcastSeries`(`@id: {site}#podcast-interviews`, name "AI Frontier Interviews")를 `partOfSeries`로 사용해 메인 팟캐스트 시리즈와 분리한다.
- **sync-episodes.ts로 생성**:
  ```bash
  npx tsx scripts/sync-episodes.ts --ep 9001 --series interview --series-number 1 --lang ko
  ```
  `--ep`는 소스 디렉터리(`examples/ep{N}`) 식별자이고, `--series-number`가 실제 출력 파일명(`interview{n}.mdx`)과 `episodeNumber` 프런트매터를 결정한다. `--series`는 `main|interview`만 허용하며, `interview`일 때 `--series-number`(양의 정수) 없이는 에러로 종료한다. `--all`은 main 시리즈 일괄 동기화 전용이며 `--series interview`와 함께 쓸 수 없다.

---

## 아티클(자료) 섹션

에피소드에서 사용한 발표 자료·슬라이드·아티클을 올리는 섹션입니다.
URL: `/{lang}/articles` (목록), `/{lang}/articles/{slug}` (상세). 헤더 내비게이션의 "자료" 링크로 연결됩니다.

### 새 아티클 추가 방법

1. 템플릿 복사: `cp src/content/articles/_template.mdx src/content/articles/ko/my-article.mdx`
   - 파일명이 URL slug가 됩니다 (`/ko/articles/my-article`)
   - 언더스코어(`_`)로 시작하는 파일은 빌드에서 제외됩니다
2. 이미지·영상 등 에셋은 `public/articles/my-article/`에 넣습니다
3. 번역본은 같은 파일명으로 `en/`, `ja/`, `zh-Hans/`에 만듭니다 (ko↔en은 hreflang으로 자동 연결)

### 아티클 Frontmatter

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `title` | string | O | 아티클 제목 |
| `description` | string | O | 요약 (카드/검색/SEO에 사용) |
| `publishedAt` | date | O | 발행일 (YYYY-MM-DD) |
| `updatedAt` | date | - | 갱신일 |
| `episodeNumber` | number | - | 연결할 **메인** 에피소드 번호(인터뷰는 참조 불가). 지정하면 에피소드 페이지 플레이어 아래에 아티클 링크가 생기고, 아티클 하단에 에피소드 카드가 붙음 |
| `heroImage` | string | - | 대표 이미지 (16:9 권장, 카드·페이지 상단·og:image에 사용) |
| `authors` | string[] | - | 작성자 목록 |
| `tags` | string[] | - | 태그 |
| `lang` | enum | O | ko \| en \| ja \| zh-Hans |
| `draft` | boolean | - | true면 목록/사이트맵/빌드에서 제외 (기본 false) |

### 본문에서 쓸 수 있는 컴포넌트 (import 불필요)

```mdx
<Figure src="/articles/my-article/img.jpg" alt="설명" caption="캡션" />

<VideoEmbed youtubeId="SSIGI9mm0DU" title="영상 제목" start={656} caption="캡션" />
<VideoEmbed src="/articles/my-article/demo.mp4" title="데모" poster="/articles/my-article/poster.jpg" />

<ResourceLink url="/resources/ep102/slides.pptx" title="발표 자료" domain="aifrontier.kr" description="설명" />
```

- `Figure`: 이미지+캡션. 클릭 시 원본이 새 탭에서 열림. 캡션이 없으면 마크다운 `![]()` 문법도 가능
- `VideoEmbed`: `youtubeId`(+선택 `start` 초) 또는 `src`(로컬 파일) 중 하나 사용
- `ResourceLink`: 파일 다운로드/외부 링크 카드

샘플 아티클: `src/content/articles/ko/icml-2026-sponsor-booths.mdx` (ICML 2026 현장 스케치)

---

## 컴포넌트 가이드

### YouTubeEmbed

YouTube 플레이어 + 미니플레이어 + 모달 기능

```astro
<YouTubeEmbed videoId="AuF7V7bqsrQ" title="에피소드 제목" />
```

**기능:**
- 스크롤 시 미니플레이어 자동 활성화
- 데스크톱: 사이드바 위치에 고정
- 모바일: 우하단 플로팅
- 모달 확장 지원

**전역 함수:** `window.seekToTime(seconds)` - 특정 시간으로 이동

### ChapterNav

챕터 네비게이션 컴포넌트

```astro
<ChapterNav
  chapters={chapters}
  episodeNumber={83}
  episodeTitle="에피소드 제목"
/>
```

### Search

Pagefind 기반 전문 검색

```astro
<Search lang="ko" />
```

**단축키:** `Ctrl+K` 또는 `Cmd+K`

---

## 빌드 및 배포

### 빌드 프로세스

```bash
npm run build
# 1. Astro 빌드 → dist/
# 2. Pagefind 인덱싱 → dist/pagefind/
```

### 출력 구조

```
dist/
├── index.html          # → /ko 리다이렉트
├── ko/
│   ├── index.html      # 한국어 홈
│   ├── episodes/
│   │   └── ep83/index.html
│   └── rss.xml
├── en/                  # 영어 (동일 구조)
├── ja/                  # 일본어 (동일 구조)
├── zh-Hans/             # 중국어 간체 (동일 구조)
└── pagefind/           # 검색 인덱스
```

### 배포

정적 호스팅 서비스에 `dist/` 폴더 배포:
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

---

## 스타일링

### 테마 색상

- **Primary**: Sky blue (`#0ea5e9`)
- **Dark mode**: 시스템 설정 자동 감지

### Tailwind 사용

```astro
<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
    제목
  </h1>
</div>
```

### 글로벌 스타일 (global.css)

- 폰트: Pretendard Variable (한국어 최적화)
- H2: 하단 border, smooth scroll
- Speaker 이름: primary color

---

## 데이터 파일

### data/youtube_metadata.json

YouTube 채널의 영상 메타데이터 캐시:

```json
[
  {
    "id": "AuF7V7bqsrQ",
    "title": "EP 83. 이야기로 읽는 트랜스포머...",
    "episode": 83,
    "duration": 3236,
    "duration_string": "53:56",
    "description": "...",
    "view_count": 2261,
    "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg"
  }
]
```

**갱신:**
```bash
cd ..  # srt2md 루트
yt-dlp --flat-playlist --dump-json --extractor-args "youtube:lang=ko" \
  "https://www.youtube.com/@chester_roh/videos" > data/yt_metadata.jsonl

# JSON으로 변환 (스크립트 사용)
```

---

## 트러블슈팅

### 개발 서버에서 검색이 안 됨
- Pagefind는 빌드 시에만 인덱싱됨
- `npm run build && npm run preview`로 테스트

### 타임스탬프 클릭이 안 됨
- `*MM:SS*` 형식이 맞는지 확인
- EpisodeLayout의 JavaScript가 로드되었는지 확인

### 미니플레이어가 안 보임
- 브라우저 콘솔에서 에러 확인
- YouTube IFrame API 로드 여부 확인

### 콘텐츠 변경이 반영 안 됨
- `npm run dev` 재시작
- `.astro` 캐시 삭제: `rm -rf .astro`

---

## 주요 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| astro | 5.16.15 | 정적 사이트 생성 |
| @astrojs/mdx | 4.3.13 | MDX 콘텐츠 컬렉션 |
| @astrojs/rss | 4.0.15 | RSS 피드 생성 |
| tailwindcss | 4.1.18 | 유틸리티 CSS |
| pagefind | 1.4.0 | 정적 검색 인덱싱 |
| tsx | 4.7.0 | TypeScript 스크립트 실행 |

---

## 관련 파일

- `astro.config.mjs` - Astro 설정
- `src/content.config.ts` - 콘텐츠 스키마 정의
- `scripts/sync-episodes.ts` - 에피소드 동기화 스크립트
- `../data/youtube_metadata.json` - YouTube 메타데이터
