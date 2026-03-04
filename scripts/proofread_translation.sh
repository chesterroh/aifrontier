#!/bin/bash
# Proofread ja/zh-Hans translations against Korean originals using codex exec
set -euo pipefail

BLOG_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTENT_DIR="$BLOG_ROOT/src/content/episodes"
PROMPT_DIR="/tmp/mdx_proofread"
RESULT_DIR="$BLOG_ROOT/scripts/proofread_results"
export CODEX_HOME="$HOME/.codex-paragraphize"

mkdir -p "$PROMPT_DIR" "$RESULT_DIR"

proofread_one() {
  local ep=$1
  local lang=$2
  local ko_file="$CONTENT_DIR/ko/ep${ep}.mdx"
  local tr_file="$CONTENT_DIR/${lang}/ep${ep}.mdx"
  local prompt_file="$PROMPT_DIR/proofread_ep${ep}_${lang}.txt"
  local result_file="$RESULT_DIR/ep${ep}_${lang}.md"

  if [[ -f "$result_file" && $(wc -c < "$result_file") -gt 50 ]]; then
    echo "SKIP: ep${ep} ${lang} (already proofread)"
    return 0
  fi

  if [[ "$lang" == "ja" ]]; then
    lang_label="Japanese"
  else
    lang_label="Simplified Chinese"
  fi

  cat > "$prompt_file" <<PROMPT
You are a professional translator and proofreader. Compare the ${lang_label} translation against the Korean original and find errors.

TASK: Review the ${lang_label} translation for:
1. **Mistranslations** — meaning changed or wrong compared to Korean original
2. **Omissions** — paragraphs, sentences, or important phrases missing from translation
3. **Name errors** — speaker names inconsistent or wrong (Korean names should use their standard ${lang_label} renderings)
4. **Technical term errors** — AI/ML terms that should stay in English but were translated, or vice versa
5. **Formatting errors** — broken markdown, missing timestamps, wrong YAML structure
6. **Unnatural expressions** — awkward phrasing that a native ${lang_label} speaker would find odd

OUTPUT FORMAT:
For each issue found, write:
- **[LINE ~N]** \`severity: high|medium|low\` — Description of the issue
  - Korean: "원본 텍스트"
  - ${lang_label}: "번역 텍스트"
  - Suggested fix: "수정안"

If no issues found, write: "No issues found."

At the end, write a summary: "Total: X issues (Y high, Z medium, W low)"

---
KOREAN ORIGINAL (ep${ep}):
$(cat "$ko_file")

---
${lang_label} TRANSLATION (ep${ep}):
$(cat "$tr_file")
PROMPT

  codex exec \
    --model gpt-5.3-codex \
    -c 'reasoning.effort="high"' \
    --full-auto \
    --ephemeral \
    -o "$result_file" \
    - < "$prompt_file" 2>/dev/null

  if [[ -f "$result_file" && $(wc -c < "$result_file") -gt 50 ]]; then
    local summary=$(tail -5 "$result_file" | grep -i "total:" || echo "done")
    echo "OK: ep${ep} ${lang} — ${summary}"
  else
    echo "FAIL: ep${ep} ${lang}"
  fi
}

# Run all proofreads in parallel
pids=()
for ep in 75 76 77 78 79 80 81 82 83 84 85 86 87 88; do
  for lang in ja zh-Hans; do
    proofread_one "$ep" "$lang" &
    pids+=($!)
  done
done

for pid in "${pids[@]}"; do
  wait "$pid" 2>/dev/null || true
done

echo ""
echo "=== PROOFREAD COMPLETE ==="
echo "Results in: $RESULT_DIR/"
ls -la "$RESULT_DIR/"
