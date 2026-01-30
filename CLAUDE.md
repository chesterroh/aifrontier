# AI Frontier Blog - CLAUDE.md

이 문서는 AI Frontier 블로그 개발, 콘텐츠 기여, 운영에 대한 종합 가이드입니다.

## Git 커밋 규칙

- Co-Authored-By 표기 금지
- 커밋 메시지는 한 줄로 작성

## 프로젝트 개요

**AI Frontier**는 Astro 5로 구축된 이중언어(한국어/영어) 팟캐스트 블로그입니다.
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
│   │   └── en/             # 영어 페이지 (동일 구조)
│   ├── components/         # 재사용 컴포넌트
│   │   ├── YouTubeEmbed.astro  # 플레이어 + 미니/모달
│   │   ├── ChapterNav.astro    # 챕터 네비게이션
│   │   ├── LanguageSwitcher.astro
│   │   └── Search.astro        # Pagefind 검색
│   ├── layouts/
│   │   ├── BaseLayout.astro    # 공통 레이아웃 (헤더/푸터)
│   │   └── EpisodeLayout.astro # 에피소드 페이지 레이아웃
│   ├── content/
│   │   └── episodes/
│   │       ├── ko/         # 한국어 에피소드 (.mdx)
│   │       └── en/         # 영어 에피소드 (.mdx)
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
| `hosts` | string[] | - | 호스트 목록 (기본: 노정석, 최승준) |
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

### 영어 버전 추가

1. `src/content/episodes/en/ep{N}.mdx` 생성
2. `lang: "en"` 설정
3. 한국어 버전에 `alternateSlug` 추가하여 연결:
   ```yaml
   # ko/ep83.mdx
   alternateSlug: "ep83"
   ```

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
