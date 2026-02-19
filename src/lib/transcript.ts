export type ChapterBlock = {
  time: string;
  title: string;
  speakers: string[];
  transcript: string;
};

/** Regex for H2 chapter headings: `## Title    *MM:SS*` (4-space gap) */
const CHAPTER_HEADING_RE = /^## (.+?)\s{2,}\*(\d{1,2}:\d{2}(?::\d{2})?)\*\s*$/;

/** Regex for `<span class="paragraph-timestamp" ...>...</span>` tags */
const SPAN_TIMESTAMP_RE = /<span\s+class="paragraph-timestamp"[^>]*>[^<]*<\/span>\s*/g;

/** Regex for italic timestamps at line start like `*00:00*` */
const ITALIC_TIMESTAMP_RE = /^\*\d{1,2}:\d{2}(?::\d{2})?\*\s*/;

/** Regex for bold speaker names like `**Name**` */
const BOLD_SPEAKER_RE = /^\*\*(.+?)\*\*\s*/;

/**
 * Parse raw MDX body text (everything after frontmatter) into structured
 * chapter blocks with plain-text transcripts.
 */
export function parseChapters(mdxBody: string): ChapterBlock[] {
  const lines = mdxBody.split('\n');
  const rawChapters: { time: string; title: string; bodyLines: string[] }[] = [];
  let current: { time: string; title: string; bodyLines: string[] } | null = null;

  // Pass 1: split into raw chapter groups by H2 headings
  for (const line of lines) {
    const headingMatch = line.match(CHAPTER_HEADING_RE);
    if (headingMatch) {
      if (current) rawChapters.push(current);
      current = { time: headingMatch[2], title: headingMatch[1], bodyLines: [] };
    } else {
      if (!current) {
        // Content before first H2 → potential "Intro" chapter
        current = { time: '00:00', title: 'Intro', bodyLines: [] };
      }
      current.bodyLines.push(line);
    }
  }
  if (current) rawChapters.push(current);

  // Pass 2: process each chapter's body lines into plain-text transcript
  const chapters: ChapterBlock[] = [];
  for (const raw of rawChapters) {
    const speakerSet = new Set<string>();
    const outputParagraphs: string[] = [];
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        outputParagraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    };

    for (const rawLine of raw.bodyLines) {
      // Strip span timestamp tags
      let line = rawLine.replace(SPAN_TIMESTAMP_RE, '');

      // Strip italic timestamp at start
      line = line.replace(ITALIC_TIMESTAMP_RE, '');

      // Extract and strip bold speaker name
      const speakerMatch = line.match(BOLD_SPEAKER_RE);
      let speaker: string | null = null;
      if (speakerMatch) {
        speaker = speakerMatch[1];
        speakerSet.add(speaker);
        line = line.replace(BOLD_SPEAKER_RE, '');
      }

      // Trim the processed line
      line = line.trim();

      if (line === '') {
        // Blank line → paragraph break
        flushParagraph();
      } else if (speaker) {
        // New speaker attribution starts a new paragraph
        flushParagraph();
        currentParagraph.push(`${speaker}: ${line}`);
      } else {
        // Continuation line (no speaker, no blank) → append to current paragraph
        currentParagraph.push(line);
      }
    }
    flushParagraph();

    // Filter out empty paragraphs and join with blank-line separators
    const transcript = outputParagraphs.filter((p) => p.length > 0).join('\n\n');

    // Drop empty "Intro" chapter
    if (raw.title === 'Intro' && raw.time === '00:00' && transcript === '') {
      continue;
    }

    chapters.push({
      time: raw.time,
      title: raw.title,
      speakers: [...speakerSet],
      transcript,
    });
  }

  return chapters;
}
