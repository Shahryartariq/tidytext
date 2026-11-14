# Changelog

## [Unreleased]

### Changed
- Calmer, roomier layout. The options sit in a sidebar next to the text, grouped into Lines,
  Spaces and characters, and Wording, with plain checkboxes instead of a cloud of chips.
- On phones the clean text comes straight after your text, and the options follow.
- Plainer copy throughout, without the badge row, the "How it works" steps or repeated claims.
- The tool list is grouped (Lines, Spaces and characters, Letter case, Writing), and the footer
  no longer repeats every tool.
- New typeface: Atkinson Hyperlegible Next for the page and Atkinson Hyperlegible Mono for the
  text boxes, self-hosted (SIL Open Font License).
- Links point to the renamed repository, github.com/Shahryartariq/tidytext.

### Fixed
- The word count panel now follows your text as you type. It only updated after a page reload.
- The theme button switches between light and dark on the first click and shows a sun or moon.
  Before, the first click often changed nothing visible.
- With JavaScript off, Copy, Download and Clear are hidden instead of doing nothing.
- Remove duplicate lines runs after Letter case, so "Apple" and "apple" count as the same line
  once lowercased, as the FAQ says.
- Reaching the 200,000 character limit now shows a message instead of silently ignoring text.
- A text post over the size limit without JavaScript gets the form back with a clear message
  instead of a bare "Bad Request" page. The limit is raised to 4 MB, so 200,000 characters of
  Urdu or Chinese text (which grow when URL-encoded) are accepted.
- Copy falls back to telling you to press Ctrl+C when the browser blocks clipboard access.
- Opening a binary file renamed to .txt shows "That file isn't plain text" instead of garbage.

### Security
- Removing HTML tags and sentence case could take minutes on hostile input (for example 50,000
  copies of `<!--`), which let a single no-JavaScript request tie up a server worker and froze
  the browser tab. Both now run in linear time, and tests time every option against 200,000
  characters of worst-case input in Python and JavaScript.
- Find and replace refuses results over 1,000,000 characters. Replacing every "a" in 200,000
  characters with 1,000 characters used to build a 200 MB response.
- Workflow actions are pinned to commit SHAs, checkouts don't keep credentials, every job has a
  timeout, and CI runs `pip-audit`. Dependabot proposes updates for pip, Actions, Docker and npm.
- SECURITY.md now describes the third-party code the AI paraphraser loads, and links to the
  renamed repository.

### SEO and performance
- Vercel's per-deploy and per-branch addresses send `X-Robots-Tag: noindex`, and the sitemap
  always lists the public address, so search engines only index one copy of each page.
- Static files are cached for a year (they're versioned per deploy), the bold font and the
  cleaning script are preloaded, and the web app manifest matches the new colours.
- Open Graph text no longer uses the old "in seconds" line.

### CI and releases
- The Docker smoke test checked for the old headline, so it failed after the copy changes. It
  now checks that the form renders and that a no-JavaScript post is cleaned.
- New browser tests (Playwright) cover the main flows: typing, word count, paste, copy,
  Ctrl+Enter, open and drop files, download, clear, options and reset, find and replace, theme,
  every page on desktop and phone, the 404 page, and the no-JavaScript fallback.
- A release only publishes its Docker image if the tag matches `pyproject.toml` and the full CI
  passes on the tagged commit. Images now include provenance and an SBOM.

## [1.1.0] - 2026-11-12

### Added
- Google Search Console ownership file, so the site stays verified.
- The starting text is labelled "Example", and pasting over it replaces it instead of
  mixing your text into it.
- "Reset options" appears once you change the options, and returns to the page's preset.
- "Already clean, nothing to change" when the chosen fixes leave the text as it was.
- Ctrl+Enter (⌘+Enter on a Mac) copies the clean text; the Copy button shows "Copied".
- **AI text humanizer** (`/ai-text-humanizer/`): drops filler such as "it is important to
  note that", swaps stiff words for plain ones, uses contractions, turns em dashes into commas, then
  adds the slips people make when typing fast, common in South Asian English ("you're good"
  becomes "your good", "than" becomes "then", "dont", "alot", "discuss about it",
  "since 2 years"). Free and rule-based, so it runs in the browser like every other tool.
- **Grammar fixer** (`/grammar-fixer/`) and a **Fix grammar** option: the reverse. "your good"
  becomes "you're good", "its a" becomes "it's a", "better then" becomes "better than", plus
  missing apostrophes, "could of", "informations", "since 2 years" and more. "your", "its" and
  "their" change only when the next words make the meaning clear, so "your good name" stays.
- **Paraphrasing tool** (`/paraphrasing-tool/`) and a **Paraphrase** option: about 100
  hand-checked rewrites ("is able to" becomes "can", "very tired" becomes "exhausted").
- **Paraphrase with AI** (beta) on the paraphrasing and humanizer pages: rewrites every sentence
  with humarin's T5 paraphrase model (OpenRAIL license) in a worker on the visitor's device. It
  downloads about 250 MB once, the text never leaves the device, and Fix grammar and Humanize
  still apply. Those two pages let the worker load Transformers.js from jsDelivr.
- Fix grammar, Paraphrase and Humanize run in that order, so they can be combined.
- More AI-sounding phrases for Humanize, from the MIT-licensed list at
  [harshaneel/humanize](https://github.com/harshaneel/humanize).
- Scripts are loaded with the build id, so a cached copy from an older deploy can't run with a
  newer page.

### Changed
- A shorter intro so the editor starts higher on the screen.
- The tool list is a grid of cards.

## [1.0.0] - 2026-11-02

First production release. The tutorial "text formatter" is rebuilt as **TidyText**.

### Added
- More tools: fix hyphenated words from PDFs, straight quotes, remove duplicate lines,
  sort lines A to Z / Z to A (ignores case and accents), remove HTML tags, find and replace
  (with `\n` and `\t`), and a word counter with sentences, paragraphs, reading and speaking time.
- Six new tool pages: word counter, remove duplicate lines, sort lines, find and replace,
  smart quotes to straight quotes, remove HTML tags (16 in total).
- Paste button, open a text file, and drag and drop. Files are read on the device only.
- Optional Google Analytics 4 via `GA_MEASUREMENT_ID`, without weakening the CSP; privacy
  copy updates automatically when it's on.
- Instant in-browser cleaning with a server-side fallback that works without JavaScript.
- Line break modes: keep, join lines while keeping paragraphs (for PDF text), remove all.
- Remove extra spaces, empty lines, invisible characters and punctuation (Unicode aware).
- Letter case: sentence case, lowercase, UPPERCASE, Title Case.
- Before/after counter that highlights how many characters, words and lines changed.
- Copy to clipboard, download as .txt, clear.
- SEO: canonical URLs, sitemap.xml, robots.txt, Open Graph image, JSON-LD.
- Modern responsive design with light and dark themes; about, privacy and error pages.
- Security: strict CSP, HSTS, clickjacking protection, Permissions-Policy, input limits.
- Docker image (non-root, read-only), Docker Compose, Gunicorn config, health check.
- Vercel configuration, Makefile shortcuts, GitHub Actions CI and release workflow.
- Python and JavaScript tests sharing one set of cases.

### Removed
- Committed database, cache files and scratch notes; hard-coded secret key and debug mode.
- Bootstrap CDN dependency and the unused Django admin.
