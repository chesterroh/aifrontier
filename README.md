# AI Frontier Blog

[AI Frontier](https://aifrontier.kr) 팟캐스트의 에피소드 트랜스크립트와 챕터 네비게이션을 제공하는 블로그입니다.

YouTube: https://www.youtube.com/@chester_roh

## Tech Stack

- [Astro 5](https://astro.build/) - 정적 사이트 생성
- [MDX](https://mdxjs.com/) - 에피소드 콘텐츠
- [Tailwind CSS](https://tailwindcss.com/) - 스타일링
- [Pagefind](https://pagefind.app/) - 정적 검색

## Development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 프로덕션 빌드 + 검색 인덱싱
```

## Deployment

`main` 브랜치에 push하면 GitHub Actions를 통해 자동 배포됩니다.
