- **[LINE ~5]** `severity: high` — `RLVR` の定義が誤り（技術用語エラー）。`RLVR` を `agent post-training` と同一視している。  
Korean: "RLVR이라는 방법, 검증 가능한 방식으로 정답을 사용해서 보상을 주면…"  
Japanese: "RLVR（agent post-training）"  
Suggested fix: "RLVR（verifiable reward / 検証可能な報酬にもとづくRL）"

- **[LINE ~12]** `severity: high` — YAML `chapters` が大幅に省略・統合され、原文の章立てが欠落。  
Korean: "chapters: ... (0:00〜68:24まで多数 항목)"  
Japanese: "chapters: ... (14項目のみ)"  
Suggested fix: "原文の全チャプターを保持し、日本語タイトルのみ翻訳する"

- **[LINE ~13-40]** `severity: medium` — YAML の章タイムスタンプが原文と不一致。  
Korean: `time: "1:20"` / `title: "2025 변화 #1: ..."`  
Japanese: `time: "01:14"` / `title: "フロンティアモデルの爆発的成長と中国の台頭"`  
Suggested fix: "章時刻は原文と同一値に合わせる（例: 01:20）"

- **[LINE ~70]** `severity: medium` — 本文タイムスタンプのずれ（複数箇所）。  
Korean: `<span ... data-ts="02:50">02:50</span>`  
Japanese: `<span ... data-ts="02:46">02:46</span>`  
Suggested fix: "本文中の各 `data-ts` と表示時刻を原文と一致させる"

- **[LINE ~330]** `severity: medium` — 原文見出し構造の欠落（`2026 전망 ③ continual learning...` などが見出しとして消失/統合）。  
Korean: "## 2026 전망 ③ continual learning: 모델이 ‘무엇을’ 배울지 스스로 찾기 *50:42*"  
Japanese: （該当見出しなし。前セクション内に統合）  
Suggested fix: "原文の見出し単位を維持し、対応する日本語見出しを追加"

- **[LINE ~560]** `severity: high` — 固有名の誤訳。コミュニティ名 `도망자 연합` が意味変化。  
Korean: "도망자 연합의 구독자분들께도 너무나도 감사드립니다."  
Japanese: "「逃避同盟」の購読者のみなさんにも..."  
Suggested fix: "「逃亡者連合」の購読者のみなさんにも..."（または公式表記に統一）

- **[LINE ~430]** `severity: low` — 不自然な日本語（直訳調）。  
Korean: "모델의 기본 사이즈, 기본 체급에 가깝습니다."  
Japanese: "モデルのベースサイズ、根本的なweight classです。"  
Suggested fix: "モデルのベースサイズ、つまり基礎的な規模感に近いです。"

- **[LINE ~530]** `severity: low` — 会話文として不自然な代名詞使用。  
Korean: "지금 세 가지 말씀하신 게..."  
Japanese: "あなたが言った3つの兆候..."  
Suggested fix: "今おっしゃった3つの兆候は..."

- **[LINE ~1-20]** `severity: medium` — YAML フィールド欠落（構造差分）。  
Korean: `alternateSlug: null`  
Japanese: （項目なし）  
Suggested fix: "`alternateSlug: null` を追加してメタ構造を原文準拠にする"

Total: 9 issues (3 high, 4 medium, 2 low)