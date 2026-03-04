#!/bin/bash
# Translate all en MDX episodes to ja and zh-Hans using codex exec
set -euo pipefail

BLOG_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTENT_DIR="$BLOG_ROOT/src/content/episodes"
PROMPT_DIR="/tmp/mdx_translate"
export CODEX_HOME="$HOME/.codex-paragraphize"

mkdir -p "$PROMPT_DIR" "$CONTENT_DIR/ja" "$CONTENT_DIR/zh-Hans"

translate_one() {
  local ep=$1
  local lang=$2
  local src="$CONTENT_DIR/en/ep${ep}.mdx"
  local dst="$CONTENT_DIR/${lang}/ep${ep}.mdx"
  local prompt_file="$PROMPT_DIR/ep${ep}_${lang}.txt"

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
    hosts_map='  - "Chester Roh" → "ノ・ジョンソク"
  - "Seungjoon Choi" → "チェ・スンジュン"
  - "Seonghyun Kim" → "キム・ソンヒョン"'
    first_host="ノ・ジョンソク"
  else
    lang_label="Simplified Chinese"
    hosts_map='  - "Chester Roh" → "卢正锡"
  - "Seungjoon Choi" → "崔升准"
  - "Seonghyun Kim" → "金成贤"'
    first_host="卢正锡"
  fi

  cat > "$prompt_file" <<PROMPT
You are translating a podcast episode blog post from English to ${lang_label}.

INPUT: An Astro MDX file with YAML frontmatter and markdown body.

RULES:
1. Translate ALL text content to ${lang_label}. This includes:
   - frontmatter: title, description, chapter titles
   - body: all transcript paragraphs, speaker dialogue
2. Keep these UNCHANGED:
   - All YAML keys and structure
   - episodeNumber, publishedAt, duration, youtubeId, thumbnail values
   - Markdown formatting (##, **, *, timestamps like *0:00*, etc.)
   - MDX component tags like <ResourceLink .../>
   - Technical terms (AI, RL, GPT, LLM, API, GPU, etc.) keep in English
   - URLs and file paths
3. Change the lang: field from en to ${lang}
4. Translate host/guest names in frontmatter:
${hosts_map}
5. In the body text, translate speaker name prefixes (e.g. "**Chester Roh**" → "**${first_host}**")
6. Output ONLY the complete translated MDX file, no explanations or code fences.

---
INPUT FILE (ep${ep} English):
$(cat "$src")
PROMPT

  codex exec \
    --model gpt-5.3-codex \
    -c 'reasoning.effort="medium"' \
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

# Run all translations in parallel (max ~25 concurrent)
pids=()
for ep in 75 76 77 78 79 80 81 82 83 84 85 86 87 88; do
  for lang in ja zh-Hans; do
    translate_one "$ep" "$lang" &
    pids+=($!)
  done
done

# Wait for all
for pid in "${pids[@]}"; do
  wait "$pid" 2>/dev/null || true
done

echo "=== ALL TRANSLATIONS DONE ==="
echo "ja: $(ls "$CONTENT_DIR/ja/"*.mdx 2>/dev/null | wc -l) files"
echo "zh-Hans: $(ls "$CONTENT_DIR/zh-Hans/"*.mdx 2>/dev/null | wc -l) files"
