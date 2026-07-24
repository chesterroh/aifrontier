# AI Frontier Article Authoring Guide

AI Frontier articles are presentation notes for a live podcast first and conventional
essays second. A host should be able to keep the article on screen, identify the next
talking point at a glance, and open the primary source with one click.

## 1. Start with a verified, visual premise

- Use a factual title. Never put a rumor, unreleased model name, or inferred causal
  claim in the title unless a primary source confirms it.
- Write a one-sentence description that names the episode's main subjects and why
  they matter.
- Add a 16:9 hero image through `heroImage`. It is the first image visible on the
  article page and the thumbnail used by article cards and social previews.
- Prefer an official press image, product visual, chart, or an original composite.
  Confirm reuse rights, keep essential content inside the center-safe area, and
  verify both desktop and mobile crops.
- Store media in `public/articles/<slug>/`. Target at least 1600×900 for the hero.

## 2. Build the article like a presentation

Use two or three numbered acts. Each act should answer one clear question.

```md
## 1. What happened?
## 2. What changed in the market?
## 3. What does it mean for go-to-market strategy?
```

Within each act:

- Use short, point-led subheadings rather than generic labels.
- Put the most important source card before the explanation.
- Prefer three to five bullets over prose paragraphs.
- Keep one idea per bullet. Aim for one or two short sentences.
- Use a compact table when comparing at least three models, dates, prices, or
  policies.
- Use a blockquote only for the sentence the host will discuss on air.
- End with a question, takeaway, or transition to the next act.

Avoid:

- long scene-setting introductions;
- repeating the same fact in prose, a quote, and a table;
- large uninterrupted paragraphs;
- benchmark tables without a plain-language conclusion;
- decorative headings that do not tell the host what to say next.

## 3. Embed evidence instead of listing links

Use primary sources whenever possible: official incident reports, model cards,
pricing pages, technical reports, and official company announcements.

```mdx
<ResourceLink
  url="https://example.com/official-announcement"
  title="Official announcement"
  domain="example.com"
  description="One line explaining what this source verifies"
/>
```

Use `XPostEmbed` for a trustworthy post that adds a memorable quote, usage milestone,
launch signal, or executive context.

```mdx
<XPostEmbed
  url="https://x.com/example/status/123"
  title="What the audience should notice"
  description="Why this post belongs in the episode"
  lang="en"
/>
```

- Prefer company, founder, researcher, or benchmark-owner accounts.
- Treat posts as claims, not independent verification.
- Pair major performance or pricing claims with an official documentation link.
- Quote only the essential sentence and attribute it directly.
- Keep the distinction between announced, previewed, API-available,
  open-weight, and independently reproduced results explicit.

## 4. Make comparisons decision-ready

Every model or product comparison should disclose:

- the comparison date;
- price units and whether cache, batch, or fast-mode pricing is included;
- context and output assumptions;
- whether results are first-party or independently measured;
- unknowns that could change the conclusion.

After a table, add one short conclusion such as:

> Cheap tokens do not necessarily mean a cheap agent task.

Do not imply causation merely because launches, promotions, or usage changes happened
at the same time. Label interpretation as analysis.

## 5. Prepare all four languages

The supported locales are:

- `ko`
- `en`
- `ja`
- `zh-Hans`

Use the same filename in every language directory so each translation has the same
slug:

```text
src/content/articles/ko/<slug>.mdx
src/content/articles/en/<slug>.mdx
src/content/articles/ja/<slug>.mdx
src/content/articles/zh-Hans/<slug>.mdx
```

For each translation:

- localize the title, description, headings, bullets, table labels, link
  descriptions, takeaways, and broadcast run-of-show;
- keep product names, prices, dates, measurements, URLs, and source attribution
  consistent;
- use the localized version of an official source when one exists;
- preserve a source's original quote when translating it could change the claim;
- pass the page locale to `XPostEmbed`, for example `lang="ja"`;
- reuse the same hero image path unless the image itself contains language-specific
  text.

## 6. Frontmatter contract

Start from `_template.mdx`. The filename becomes the URL slug.

```yaml
title: "Verified, specific title"
description: "One-sentence summary for cards and search"
publishedAt: 2026-01-01
heroImage: "/articles/<slug>/hero.png"
episodeNumber: 105
authors:
  - Author Name
tags:
  - Topic
lang: "en"
draft: true
```

Keep `draft: true` while editing. Change it to `false` in every locale only when all
translations, sources, and routes are ready to publish.

## 7. Publication checklist

- [ ] The title contains no unverified claim.
- [ ] The hero image is 16:9, readable, and correctly licensed.
- [ ] The top of the article contains the most important source cards.
- [ ] Long prose has been converted to bullets, quotes, or comparison tables.
- [ ] Price and benchmark claims include their units, date, and source.
- [ ] Official X posts use `XPostEmbed`; important pages use `ResourceLink`.
- [ ] All four locale files exist with the same slug.
- [ ] All locale metadata and embed fallback labels are localized.
- [ ] `draft` is `false` in every locale intended for publication.
- [ ] `npm run build` succeeds.
- [ ] Every locale route renders and the hero image returns HTTP 200.
