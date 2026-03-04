#!/bin/bash
# Translate all ko MDX episodes to ja and zh-Hans using codex exec
# v2: translate from Korean, preserve paragraph structure, fix names
set -euo pipefail

BLOG_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTENT_DIR="$BLOG_ROOT/src/content/episodes"
PROMPT_DIR="/tmp/mdx_translate"
export CODEX_HOME="$HOME/.codex-paragraphize"

mkdir -p "$PROMPT_DIR" "$CONTENT_DIR/ja" "$CONTENT_DIR/zh-Hans"

translate_one() {
  local ep=$1
  local lang=$2
  local src="$CONTENT_DIR/ko/ep${ep}.mdx"
  local dst="$CONTENT_DIR/${lang}/ep${ep}.mdx"
  local prompt_file="$PROMPT_DIR/ep${ep}_${lang}_v2.txt"

  if [[ -f "$dst" && $(wc -c < "$dst") -gt 100 ]]; then
    echo "SKIP: ep${ep} → ${lang} (exists)"
    return 0
  fi

  if [[ ! -f "$src" ]]; then
    echo "SKIP: $src not found"
    return 0
  fi

  if [[ "$lang" == "ja" ]]; then
    lang_label="Japanese"
    names='노정석 → ロ・ジョンソク
최승준 → チェ・スンジュン
김성현 → キム・ソンヒョン
신정규 → シン・ジョンギュ
박종현 → パク・ジョンヒョン
김유진 → キム・ユジン'
  else
    lang_label="Simplified Chinese"
    names='노정석 → 卢正锡
최승준 → 崔升准
김성현 → 金成贤
신정규 → 申正奎
박종현 → 朴钟贤
김유진 → 金有珍'
  fi

  cat > "$prompt_file" <<PROMPT
You are a professional Korean-to-${lang_label} translator for a podcast blog.

TRANSLATE the following Korean MDX file to ${lang_label}.

CRITICAL RULES:

1. PARAGRAPH STRUCTURE: Preserve EXACTLY the same paragraph breaks as the source.
   - If the Korean has a long paragraph, the translation must also be one long paragraph.
   - Do NOT split one paragraph into multiple lines. Do NOT add line breaks within paragraphs.
   - Each paragraph in the source = exactly one paragraph in the output.

2. NAMES: Use these exact translations for all occurrences (frontmatter AND body):
${names}
   - In body text, speaker prefixes like **노정석** must become **ロ・ジョンソク** (ja) or **卢正锡** (zh).
   - When someone refers to 정석님/정석 in dialogue, use the SAME translated name (ロ・ジョンソク/卢正锡), NOT "Chester".

3. FRONTMATTER:
   - Change lang: "ko" to lang: "${lang}"
   - Translate: title, description, chapter titles
   - Keep UNCHANGED: episodeNumber, publishedAt, duration, youtubeId, thumbnail, alternateSlug, notionUrl values
   - Chapters must be 1:1 with the original — same count, same times, translated titles

4. TECHNICAL TERMS: Keep in English: AI, RL, RLVR, MoE, GPT, LLM, API, GPU, SFT, RLHF, Transformer, etc.
   Model names (Claude Opus 4.5, Gemini 3.5, GPT-5, DeepSeek V4, etc.) must stay EXACTLY as written.

5. FORMATTING: Preserve exactly:
   - Markdown: ##, **, *, etc.
   - Timestamps: <span class="paragraph-timestamp" data-ts="...">...</span>
   - MDX components: <ResourceLink .../> etc.
   - Chapter headers: ## Title    *MM:SS*

6. CURRENCY: Keep Korean won amounts as-is (억, 만 원). Do NOT convert to USD/JPY/CNY.

7. Output ONLY the complete translated MDX file. No explanations, no code fences.

---
SOURCE (Korean, ep${ep}):
$(cat "$src")
PROMPT

  codex exec \
    --model gpt-5.3-codex \
    -c 'reasoning.effort="high"' \
    --full-auto \
    --ephemeral \
    -o "$dst" \
    - < "$prompt_file" 2>/dev/null

  if [[ -f "$dst" && $(wc -c < "$dst") -gt 100 ]]; then
    echo "OK: ep${ep} → ${lang}"
  else
    echo "FAIL: ep${ep} → ${lang}"
  fi
}

# Run all translations in parallel
pids=()
for ep in 75 76 77 78 79 80 81 82 83 84 85 86 87 88; do
  for lang in ja zh-Hans; do
    translate_one "$ep" "$lang" &
    pids+=($!)
  done
done

for pid in "${pids[@]}"; do
  wait "$pid" 2>/dev/null || true
done

echo "=== ALL TRANSLATIONS DONE ==="
echo "ja: $(ls "$CONTENT_DIR/ja/"*.mdx 2>/dev/null | wc -l) files"
echo "zh-Hans: $(ls "$CONTENT_DIR/zh-Hans/"*.mdx 2>/dev/null | wc -l) files"
