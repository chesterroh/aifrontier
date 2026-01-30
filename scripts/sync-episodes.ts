#!/usr/bin/env npx tsx

/**
 * sync-episodes.ts
 * Syncs episode content from srt2md outputs to blog content collection.
 *
 * Usage:
 *   npx tsx scripts/sync-episodes.ts --ep 83
 *   npx tsx scripts/sync-episodes.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_ROOT = path.resolve(__dirname, '..');
const SRT2MD_ROOT = process.env.SRT2MD_ROOT || path.resolve(BLOG_ROOT, '../srt2md');
const EXAMPLES_DIR = path.join(SRT2MD_ROOT, 'examples');
const CONTENT_DIR = path.join(BLOG_ROOT, 'src/content/episodes');
const YOUTUBE_METADATA_FILE = path.join(SRT2MD_ROOT, 'data/youtube_metadata.json');

interface YouTubeVideo {
  id: string;
  title: string;
  episode: number | null;
  duration: number;
  duration_string: string;
  description: string;
  view_count: number;
  thumbnail: string;
}

function loadYouTubeMetadata(): Map<number, YouTubeVideo> {
  const map = new Map<number, YouTubeVideo>();
  if (!fs.existsSync(YOUTUBE_METADATA_FILE)) {
    console.warn('YouTube metadata file not found:', YOUTUBE_METADATA_FILE);
    return map;
  }
  const data: YouTubeVideo[] = JSON.parse(fs.readFileSync(YOUTUBE_METADATA_FILE, 'utf-8'));
  for (const video of data) {
    if (video.episode) {
      map.set(video.episode, video);
    }
  }
  return map;
}

const youtubeMetadata = loadYouTubeMetadata();

interface Chapter {
  time: string;
  title: string;
}

interface EpisodeMetadata {
  episodeNumber: number;
  title: string;
  description: string;
  publishedAt: string;
  duration: string;
  youtubeId: string;
  thumbnail: string;
  hosts: string[];
  chapters: Chapter[];
  lang: 'ko' | 'en';
  alternateSlug: string | null;
}

function parseChaptersFile(filePath: string): Chapter[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`  Warning: Chapters file not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const chapters: Chapter[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Format: "00:00:00 Title" or "00:00 Title"
    const match = trimmed.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/);
    if (match) {
      let time = match[1];
      // Convert HH:MM:SS to MM:SS if needed
      if (time.split(':').length === 3) {
        const parts = time.split(':');
        const hours = parseInt(parts[0], 10);
        const mins = parseInt(parts[1], 10);
        const secs = parts[2];
        time = `${hours * 60 + mins}:${secs}`;
      }
      chapters.push({
        time,
        title: match[2].trim(),
      });
    }
  }

  return chapters;
}

function convertInlineTimestamps(content: string): string {
  // Convert various timestamp formats to EP83 style:
  // Input formats:
  //   1. **Speaker**    *00:00*  (speaker with timestamp on same line)
  //   2. **Speaker**\n*00:00*  text  (speaker then timestamp on next line)
  //   3. *00:00*  text  after chapter heading (## ...) - inherit previous speaker
  //   4. *00:00*  text  in continuous paragraph - remove timestamp, keep text only
  // Output format:
  //   <span class="paragraph-timestamp" data-ts="00:00">00:00</span> **Speaker** text on same line

  const lines = content.split('\n');
  const result: string[] = [];
  let lastSpeaker: string | null = null;
  let afterChapterHeading = false;

  // Helper: get next non-empty line text (for merging)
  function getNextTextLine(startIdx: number): { text: string; skipCount: number } | null {
    for (let j = startIdx; j < lines.length; j++) {
      const nextLine = lines[j].replace(/\r$/, '');
      if (nextLine.trim() === '') continue;
      // Stop if it's a heading, speaker line, or timestamp line
      if (nextLine.startsWith('## ') || nextLine.startsWith('**') || nextLine.match(/^\*\d/)) {
        return null;
      }
      return { text: nextLine, skipCount: j - startIdx + 1 };
    }
    return null;
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\r$/, '');

    // Check if this is a chapter heading
    if (line.startsWith('## ')) {
      afterChapterHeading = true;
      result.push(line);
      continue;
    }

    // Skip empty lines but preserve afterChapterHeading state
    if (line.trim() === '') {
      result.push(line);
      continue;
    }

    // Pattern 1: **Speaker**    *00:00* text (same line with text)
    const sameLineWithTextMatch = line.match(/^\*\*([^*]+)\*\*\s+\*(\d{1,2}:\d{2}(?::\d{2})?)\*\s+(.+)$/);
    if (sameLineWithTextMatch) {
      const speaker = sameLineWithTextMatch[1];
      const timestamp = sameLineWithTextMatch[2];
      const text = sameLineWithTextMatch[3];
      lastSpeaker = speaker;
      afterChapterHeading = false;
      result.push(`<span class="paragraph-timestamp" data-ts="${timestamp}">${timestamp}</span> **${speaker}** ${text}`);
      continue;
    }

    // Pattern 1b: **Speaker**    *00:00* (same line, no text - look ahead)
    const sameLineNoTextMatch = line.match(/^\*\*([^*]+)\*\*\s+\*(\d{1,2}:\d{2}(?::\d{2})?)\*\s*$/);
    if (sameLineNoTextMatch) {
      const speaker = sameLineNoTextMatch[1];
      const timestamp = sameLineNoTextMatch[2];
      lastSpeaker = speaker;
      afterChapterHeading = false;

      // Look for text on next line(s)
      const nextText = getNextTextLine(i + 1);
      if (nextText) {
        result.push(`<span class="paragraph-timestamp" data-ts="${timestamp}">${timestamp}</span> **${speaker}** ${nextText.text}`);
        i += nextText.skipCount;
      } else {
        result.push(`<span class="paragraph-timestamp" data-ts="${timestamp}">${timestamp}</span> **${speaker}**`);
      }
      continue;
    }

    // Pattern 2: Standalone speaker line followed by timestamp line (possibly with empty lines in between)
    const speakerOnlyMatch = line.match(/^\*\*([^*]+)\*\*\s*$/);
    if (speakerOnlyMatch) {
      // Look ahead for timestamp, skipping empty lines
      let tsLineIdx = -1;
      let tsLine = '';
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const checkLine = lines[j].replace(/\r$/, '');
        if (checkLine.trim() === '') continue;
        if (checkLine.match(/^\*\d/)) {
          tsLineIdx = j;
          tsLine = checkLine;
          break;
        }
        break; // Non-empty, non-timestamp line - stop looking
      }

      if (tsLineIdx > 0) {
        const tsWithTextMatch = tsLine.match(/^\*(\d{1,2}:\d{2}(?::\d{2})?)\*\s+(.+)$/);
        const tsNoTextMatch = tsLine.match(/^\*(\d{1,2}:\d{2}(?::\d{2})?)\*\s*$/);

        if (tsWithTextMatch) {
          const speaker = speakerOnlyMatch[1];
          const timestamp = tsWithTextMatch[1];
          const text = tsWithTextMatch[2];
          lastSpeaker = speaker;
          afterChapterHeading = false;
          result.push(`<span class="paragraph-timestamp" data-ts="${timestamp}">${timestamp}</span> **${speaker}** ${text}`);
          i = tsLineIdx; // Skip to timestamp line
          continue;
        } else if (tsNoTextMatch) {
          const speaker = speakerOnlyMatch[1];
          const timestamp = tsNoTextMatch[1];
          lastSpeaker = speaker;
          afterChapterHeading = false;
          i = tsLineIdx; // Skip to timestamp line

          // Look for text on next line(s)
          const nextText = getNextTextLine(i + 1);
          if (nextText) {
            result.push(`<span class="paragraph-timestamp" data-ts="${timestamp}">${timestamp}</span> **${speaker}** ${nextText.text}`);
            i += nextText.skipCount;
          } else {
            result.push(`<span class="paragraph-timestamp" data-ts="${timestamp}">${timestamp}</span> **${speaker}**`);
          }
          continue;
        }
      }
    }

    // Pattern 3: Standalone timestamp line
    const standaloneTs = line.match(/^\*(\d{1,2}:\d{2}(?::\d{2})?)\*\s*(.*)$/);
    if (standaloneTs) {
      const timestamp = standaloneTs[1];
      const text = standaloneTs[2];

      if (afterChapterHeading && lastSpeaker) {
        // Right after chapter heading - inherit speaker
        if (text) {
          result.push(`<span class="paragraph-timestamp" data-ts="${timestamp}">${timestamp}</span> **${lastSpeaker}** ${text}`);
        } else {
          // No text on this line, look ahead
          const nextText = getNextTextLine(i + 1);
          if (nextText) {
            result.push(`<span class="paragraph-timestamp" data-ts="${timestamp}">${timestamp}</span> **${lastSpeaker}** ${nextText.text}`);
            i += nextText.skipCount;
          } else {
            result.push(`<span class="paragraph-timestamp" data-ts="${timestamp}">${timestamp}</span> **${lastSpeaker}**`);
          }
        }
      } else {
        // Continuous paragraph - just keep the text without timestamp
        if (text) {
          result.push(text);
        }
      }
      afterChapterHeading = false;
      continue;
    }

    // No match - keep line as is, reset chapter flag
    afterChapterHeading = false;
    result.push(line);
  }

  return result.join('\n');
}

function extractDuration(chapters: Chapter[]): string {
  if (chapters.length === 0) return '00:00';
  const lastChapter = chapters[chapters.length - 1];
  // Estimate: last chapter + 5 minutes
  const parts = lastChapter.time.split(':').map(Number);
  let totalMinutes = 0;
  if (parts.length === 2) {
    totalMinutes = parts[0] + 5;
  } else {
    totalMinutes = parts[0] * 60 + parts[1] + 5;
  }
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hrs > 0 ? `${hrs}:${String(mins).padStart(2, '0')}:00` : `${mins}:00`;
}

function generateFrontmatter(meta: EpisodeMetadata): string {
  const chaptersYaml = meta.chapters
    .map((c) => `  - time: "${c.time}"\n    title: "${c.title.replace(/"/g, '\\"')}"`)
    .join('\n');

  return `---
episodeNumber: ${meta.episodeNumber}
title: "${meta.title.replace(/"/g, '\\"')}"
description: "${meta.description.replace(/"/g, '\\"')}"
publishedAt: ${meta.publishedAt}
duration: "${meta.duration}"
youtubeId: "${meta.youtubeId}"
thumbnail: "https://i.ytimg.com/vi/${meta.youtubeId}/maxresdefault.jpg"
hosts:
  - 노정석
  - 최승준
chapters:
${chaptersYaml || '  []'}
lang: "${meta.lang}"
alternateSlug: ${meta.alternateSlug ? `"${meta.alternateSlug}"` : 'null'}
---

`;
}

function findPublishFile(epDir: string, lang: 'ko' | 'en'): string | null {
  const outputsDir = path.join(epDir, 'outputs');
  if (!fs.existsSync(outputsDir)) return null;

  const files = fs.readdirSync(outputsDir);
  const patterns =
    lang === 'ko'
      ? ['_kor_paragraphed_publish.md', '_publish.md', '_kor_paragraphed_codex.md']
      : ['_en_publish.md', '_en_paragraphed_publish.md'];

  for (const pattern of patterns) {
    const found = files.find((f) => f.endsWith(pattern));
    if (found) return path.join(outputsDir, found);
  }

  return null;
}

function extractFirstHeadingTitle(content: string): string {
  const match = content.match(/^##\s+(.+?)\s+\*[\d:]+\*\s*$/m);
  if (match) {
    return match[1].trim();
  }
  return 'Untitled Episode';
}

function syncEpisode(epNum: number, lang: 'ko' | 'en' = 'ko'): boolean {
  const epDir = path.join(EXAMPLES_DIR, `ep${epNum}`);
  if (!fs.existsSync(epDir)) {
    console.error(`Episode directory not found: ${epDir}`);
    return false;
  }

  console.log(`Syncing EP${epNum} (${lang})...`);

  // Find publish file
  const publishFile = findPublishFile(epDir, lang);
  if (!publishFile) {
    console.error(`  No publish file found for EP${epNum} (${lang})`);
    return false;
  }
  console.log(`  Source: ${path.basename(publishFile)}`);

  // Read content
  let content = fs.readFileSync(publishFile, 'utf-8');

  // Convert inline timestamps to clickable spans
  content = convertInlineTimestamps(content);

  // Parse chapters
  const chaptersFile = path.join(
    epDir,
    'chapters',
    lang === 'ko' ? `ep${epNum}_human.txt` : `ep${epNum}_en_human.txt`
  );
  const chapters = parseChaptersFile(chaptersFile);
  console.log(`  Chapters: ${chapters.length}`);

  // Extract title from first heading or use placeholder
  const fallbackTitle = extractFirstHeadingTitle(content).replace(/\s+\*[\d:]+\*$/, '');

  // Get YouTube metadata if available
  const ytMeta = youtubeMetadata.get(epNum);

  // Extract title from YouTube (remove "EP XX. " prefix)
  let title = fallbackTitle;
  if (ytMeta) {
    const ytTitle = ytMeta.title.replace(/^EP\s*\d+\.\s*/, '');
    title = ytTitle || fallbackTitle;
  }

  // Create metadata
  const meta: EpisodeMetadata = {
    episodeNumber: epNum,
    title: title,
    description: ytMeta?.description?.slice(0, 200) || `AI Frontier EP${epNum}`,
    publishedAt: new Date().toISOString().split('T')[0],
    duration: ytMeta?.duration_string || extractDuration(chapters),
    youtubeId: ytMeta?.id || 'REPLACE_ME',
    thumbnail: ytMeta?.thumbnail || '',
    hosts: ['노정석', '최승준'],
    chapters,
    lang,
    alternateSlug: null,
  };

  if (!ytMeta) {
    console.log(`  ⚠️  No YouTube metadata found - youtubeId needs manual update`);
  }

  // Generate MDX content
  const mdxContent = generateFrontmatter(meta) + content;

  // Write to content directory
  const outputDir = path.join(CONTENT_DIR, lang);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `ep${epNum}.mdx`);
  fs.writeFileSync(outputFile, mdxContent, 'utf-8');
  console.log(`  Output: ${path.relative(BLOG_ROOT, outputFile)}`);
  if (meta.youtubeId === 'REPLACE_ME') {
    console.log(`  ⚠️  Remember to update youtubeId and publishedAt!`);
  }

  return true;
}

function findAllEpisodes(): number[] {
  const dirs = fs.readdirSync(EXAMPLES_DIR);
  const episodes: number[] = [];

  for (const dir of dirs) {
    const match = dir.match(/^ep(\d+)$/);
    if (match) {
      episodes.push(parseInt(match[1], 10));
    }
  }

  return episodes.sort((a, b) => a - b);
}

// CLI
const args = process.argv.slice(2);
let epNum: number | null = null;
let syncAll = false;
let lang: 'ko' | 'en' = 'ko';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--ep' && args[i + 1]) {
    epNum = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--all') {
    syncAll = true;
  } else if (args[i] === '--lang' && args[i + 1]) {
    lang = args[i + 1] as 'ko' | 'en';
    i++;
  }
}

if (syncAll) {
  const episodes = findAllEpisodes();
  console.log(`Found ${episodes.length} episodes: ${episodes.join(', ')}`);
  for (const ep of episodes) {
    syncEpisode(ep, lang);
  }
} else if (epNum) {
  syncEpisode(epNum, lang);
} else {
  console.log('Usage:');
  console.log('  npx ts-node scripts/sync-episodes.ts --ep 83');
  console.log('  npx ts-node scripts/sync-episodes.ts --ep 83 --lang en');
  console.log('  npx ts-node scripts/sync-episodes.ts --all');
  process.exit(1);
}
