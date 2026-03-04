"""Translate episode MDX files from English to Japanese/Chinese using codex exec."""
import subprocess
import sys
import tempfile
from pathlib import Path

BLOG_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = BLOG_ROOT / "src" / "content" / "episodes"
CODEX_HOME = Path.home() / ".codex-paragraphize"

LANG_CONFIG = {
    "ja": {
        "lang_label": "Japanese",
        "hosts_map": {
            "Chester Roh": "ノ・ジョンソク",
            "Seungjoon Choi": "チェ・スンジュン",
            "Seonghyun Kim": "キム・ソンヒョン",
        },
    },
    "zh-Hans": {
        "lang_label": "Simplified Chinese",
        "hosts_map": {
            "Chester Roh": "卢正锡",
            "Seungjoon Choi": "崔升准",
            "Seonghyun Kim": "金成贤",
        },
    },
}


def build_prompt(en_content: str, target_lang: str, ep_num: int) -> str:
    cfg = LANG_CONFIG[target_lang]
    hosts_lines = "\n".join(f'  - "{k}" → "{v}"' for k, v in cfg["hosts_map"].items())
    return f"""You are translating a podcast episode blog post from English to {cfg["lang_label"]}.

INPUT: An Astro MDX file with YAML frontmatter and markdown body.

RULES:
1. Translate ALL text content to {cfg["lang_label"]}. This includes:
   - frontmatter: title, description, chapter titles
   - body: all transcript paragraphs, speaker dialogue
2. Keep these UNCHANGED:
   - All YAML keys and structure
   - episodeNumber, publishedAt, duration, youtubeId, thumbnail values
   - Markdown formatting (##, **, *, timestamps like *0:00*, etc.)
   - MDX component tags like <ResourceLink .../>
   - Technical terms and proper nouns (AI, RL, GPT, LLM, etc.) should stay in English or use standard {cfg["lang_label"]} equivalents
3. Change the `lang:` field from `en` to `{target_lang}`
4. Translate host/guest names in frontmatter:
{hosts_lines}
5. In the body text, translate speaker name prefixes (e.g. "**Chester Roh**" → "**{list(cfg['hosts_map'].values())[0]}**")
6. Output ONLY the complete translated MDX file, no explanations.

---
INPUT FILE (ep{ep_num} English):
{en_content}
"""


def translate_episode(ep_num: int, target_lang: str) -> bool:
    en_file = CONTENT_DIR / "en" / f"ep{ep_num}.mdx"
    out_file = CONTENT_DIR / target_lang / f"ep{ep_num}.mdx"

    if not en_file.exists():
        print(f"SKIP: {en_file} not found")
        return False

    if out_file.exists():
        print(f"SKIP: {out_file} already exists")
        return True

    en_content = en_file.read_text(encoding="utf-8")
    prompt = build_prompt(en_content, target_lang, ep_num)

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt", delete=False, encoding="utf-8"
    ) as f:
        f.write(prompt)
        prompt_file = f.name

    out_tmp = str(out_file)
    cmd = [
        "codex",
        "exec",
        "--model", "gpt-5.3-codex",
        "-c", 'reasoning.effort="medium"',
        "--full-auto",
        "--ephemeral",
        "-o", out_tmp,
        "-",
    ]
    env = dict(__import__("os").environ)
    env["CODEX_HOME"] = str(CODEX_HOME)

    try:
        with open(prompt_file, "r", encoding="utf-8") as pf:
            result = subprocess.run(
                cmd, stdin=pf, env=env, capture_output=True, text=True, timeout=300
            )
        if out_file.exists() and out_file.stat().st_size > 100:
            print(f"OK: ep{ep_num} → {target_lang}")
            return True
        else:
            print(f"FAIL: ep{ep_num} → {target_lang} (no output)")
            if result.stderr:
                print(f"  stderr: {result.stderr[:200]}")
            return False
    except subprocess.TimeoutExpired:
        print(f"TIMEOUT: ep{ep_num} → {target_lang}")
        return False
    finally:
        Path(prompt_file).unlink(missing_ok=True)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: translate_mdx.py <ep_num> <lang>")
        sys.exit(1)
    ep = int(sys.argv[1])
    lang = sys.argv[2]
    ok = translate_episode(ep, lang)
    sys.exit(0 if ok else 1)
