# Translator / Paraphraser Engine v1.0 — Cursor Build Spec

## 1. Product Goal

Build a translator/paraphraser engine that accepts:

- plain text
- markdown
- HTML
- JSX / TSX
- JSON
- webpage URL content
- YouTube video URLs / transcript input

The engine must transform the content while preserving the correct final output format when needed.

The user should be able to use the output for:

- normal translation
- paraphrasing
- rewriting
- webpage content replacement in Cursor
- safer diff-based code edits
- structured JSON content injection
- YouTube transcript extraction and repurposing

---

## 2. Core Use Cases

### 2.1 Text Transformation

The user can paste text and ask the engine to:

- translate
- paraphrase
- rewrite
- summarize
- adjust tone
- simplify
- expand

### 2.2 Webpage / Code Replacement

The user can paste HTML, JSX, TSX, markdown, or JSON and ask the engine to preserve the same format.

The engine must support safe replacement modes for Cursor.

### 2.3 YouTube Transcript Obtainer

The user can input a YouTube URL and the engine should attempt to obtain the transcript.

The transcript can then be used for:

- translation
- paraphrasing
- summarization
- chapter extraction
- blog post generation
- newsletter generation
- social media repurposing
- structured notes

---

## 3. v1.0 Scope

### In Scope

- Text input
- Markdown input
- HTML input
- JSX / TSX input
- JSON input
- URL input
- YouTube URL transcript obtaining
- Output mode routing
- Format-preserving prompt rules
- Basic output validation
- Copy-to-clipboard
- Warning messages
- UI mode selector
- Transcript preview panel

### Out of Scope

- Full website crawling
- Login-protected webpage extraction
- Automatic publishing to CMS
- Automatic overwrite of local files
- Perfect preservation of complex frontend logic
- Video/audio transcription from raw media files
- Downloading YouTube videos
- Bypassing unavailable or disabled captions
- Production deployment automation

---

## 4. Output Modes

### 4.1 Content-Only Mode

Default mode.

Use when the user wants normal text transformation.

Rules:

- Output clean transformed content.
- Markdown is allowed.
- Do not preserve webpage/code structure unless requested.
- Do not include explanations unless requested.

---

### 4.2 Same-Format Mode

Use when the user wants the output in the same format as the input.

Trigger phrases:

- same format
- preserve format
- keep HTML
- keep markdown
- keep JSX
- replace existing page
- Cursor replacement

Rules:

- Preserve the original format.
- Preserve tags, attributes, class names, IDs, links, component names, and structure as much as possible.
- Rewrite only human-readable text unless structural changes are requested.
- Do not convert HTML to markdown.
- Do not add commentary outside the output.

---

### 4.3 Text-Node-Only Mode

Use for safe webpage/code replacement.

Trigger phrases:

- only change text
- text nodes only
- safe replacement
- do not change code
- keep structure exactly

Rules:

- Preserve all tags, attributes, classes, IDs, inline styles, imports, scripts, props, and component structure exactly.
- Modify only visible user-facing text.
- Do not change URLs.
- Do not change route names.
- Do not change variables.
- Do not change logic.
- Do not add or remove elements.
- Output the complete transformed file.

---

### 4.4 Diff Mode

Use when the user wants Cursor to review/apply changes safely.

Trigger phrases:

- diff
- patch
- Cursor apply
- show only changes
- safe apply

Rules:

- Output only a unified diff.
- Include only changed lines.
- Do not rewrite the entire file.
- Preserve unchanged content by omission.
- Do not include explanations outside the diff.

Example:

```diff
- <h1>Old heading</h1>
+ <h1>New heading</h1>
```

---

### 4.5 Structured Data Mode

Use when the user wants reusable page content for templates.

Trigger phrases:

- JSON
- structured data
- template
- CMS
- content object
- fields

Output JSON only.

Example:

```json
{
  "hero_title": "",
  "hero_subtitle": "",
  "sections": [
    {
      "heading": "",
      "body": ""
    }
  ],
  "cta": {
    "label": "",
    "url": ""
  }
}
```

Rules:

- Output valid JSON only.
- No markdown.
- No comments.
- Keep keys stable.
- Empty unavailable fields are allowed.

---

## 5. YouTube Transcript Obtainer

### 5.1 Goal

Add a YouTube transcript module that accepts a YouTube URL and returns available transcript text.

The transcript must become a normal engine input so the user can translate, summarize, paraphrase, or repurpose it.

---

### 5.2 Supported URL Formats

Detect the following:

```txt
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/shorts/VIDEO_ID
https://m.youtube.com/watch?v=VIDEO_ID
```

---

### 5.3 Transcript Data Type

Create:

```ts
export type TranscriptSegment = {
  text: string;
  start: number;
  duration?: number;
};

export type TranscriptResult = {
  videoId: string;
  language?: string;
  title?: string;
  segments: TranscriptSegment[];
  plainText: string;
  warnings: string[];
};
```

---

### 5.4 Required Function

Create:

```ts
async function getYouTubeTranscript(url: string): Promise<TranscriptResult>
```

Responsibilities:

1. Extract the YouTube video ID.
2. Request available captions/transcript.
3. Prefer English transcript if available.
4. If English is unavailable, use the first available transcript.
5. Return both segmented transcript and plain text.
6. Return warnings if transcript is unavailable.

---

### 5.5 Transcript Provider

For v1.0, use one of these approaches:

#### Preferred

Use a lightweight transcript package if compatible with the existing stack.

Possible package name:

```txt
youtube-transcript
```

#### Alternative

Create a server-side API route that obtains transcript data.

Example route:

```txt
/src/app/api/youtube-transcript/route.ts
```

or, for Pages Router:

```txt
/src/pages/api/youtube-transcript.ts
```

Do not expose private API keys in the browser.

---

### 5.6 Transcript Failure Handling

If no transcript is available, show:

```txt
Transcript unavailable. This video may not have captions, captions may be disabled, or YouTube may be blocking transcript access.
```

Do not claim that the transcript was obtained if it was not.

---

### 5.7 Transcript UI Requirements

Add a YouTube input mode or URL detector.

When the user pastes a YouTube URL:

1. Detect that it is YouTube.
2. Show a button: `Get Transcript`.
3. Fetch transcript.
4. Show transcript preview.
5. Allow the user to choose a transformation task:
   - Translate
   - Summarize
   - Paraphrase
   - Rewrite
   - Extract chapters
   - Generate article
   - Generate social posts

---

### 5.8 Transcript Output Modes

The transcript should support these output formats:

```ts
type TranscriptOutputFormat =
  | "plain_text"
  | "timestamped"
  | "markdown_notes"
  | "chapters"
  | "json";
```

Rules:

- `plain_text`: transcript only.
- `timestamped`: include timestamps.
- `markdown_notes`: clean notes with headings.
- `chapters`: divide transcript into logical sections.
- `json`: output structured transcript data.

---

## 6. Input Detection

Create:

```ts
type InputType =
  | "plain_text"
  | "markdown"
  | "html"
  | "jsx"
  | "tsx"
  | "json"
  | "url"
  | "youtube_url"
  | "unknown";
```

Detection rules:

- YouTube URL: matches YouTube URL formats.
- General URL: starts with `http://` or `https://`.
- HTML: contains common tags like `<html`, `<body`, `<section`, `<div`, `<h1`.
- JSX / TSX: contains `className=`, `export default`, `use client`, or React-style components.
- JSON: valid JSON parse.
- Markdown: contains headings, lists, links, or fenced code blocks.
- Plain text: fallback.

YouTube URL detection must happen before general URL detection.

---

## 7. Engine API

Create:

```ts
export type OutputMode =
  | "auto"
  | "content_only"
  | "same_format"
  | "text_node_only"
  | "diff"
  | "structured_data";

export type EngineTask =
  | "translate"
  | "paraphrase"
  | "rewrite"
  | "summarize"
  | "extract_chapters"
  | "generate_article"
  | "generate_social_posts";

export type EngineRequest = {
  input: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  task: EngineTask;
  tone?: string;
  outputMode?: OutputMode;
  preserveFormatting?: boolean;
};

export type EngineResponse = {
  output: string;
  outputMode: OutputMode;
  inputType: InputType;
  warnings: string[];
};
```

---

## 8. Routing Logic

Default output mode:

```txt
content_only
```

Auto-routing priority:

1. If input is YouTube URL → `youtube_url`
2. If user says "only change text" → `text_node_only`
3. If user says "diff", "patch", or "Cursor apply" → `diff`
4. If user says "same format" or "replace page" → `same_format`
5. If user says "JSON", "structured", "template", or "CMS" → `structured_data`
6. Otherwise → `content_only`

---

## 9. Prompt Builder

Create:

```ts
function buildPrompt(request: EngineRequest, inputType: InputType): string
```

The prompt must include:

- task
- source language, if provided
- target language, if provided
- tone, if provided
- output mode rules
- input content
- instruction to avoid extra commentary unless requested

---

## 10. Validation

Create:

```ts
function validateOutput(params: {
  input: string;
  output: string;
  inputType: InputType;
  outputMode: OutputMode;
}): string[]
```

Return warnings, not hard failures.

### JSON Validation

- Must parse as valid JSON.
- If invalid, return warning.

### HTML / JSX / TSX Same-Format Validation

- Check that major tags still exist.
- Check that class names are mostly preserved.
- Warn if output appears converted to markdown.

### Text-Node-Only Validation

- Warn if structural tags changed significantly.
- Warn if class names, IDs, or URLs changed.

### Diff Validation

- Output must contain diff-like changed lines.
- Warn if full file appears returned instead of a patch.

### Transcript Validation

- Warn if transcript is empty.
- Warn if transcript has fewer than 100 characters.
- Warn if transcript provider returns no segments.

---

## 11. UI Requirements

Add controls:

```txt
Input
Task
Source Language
Target Language
Tone
Output Mode
Generate Button
Copy Output Button
```

Output mode selector:

```txt
Output Mode:
[Auto]
[Content Only]
[Same Format]
[Text Nodes Only]
[Diff]
[Structured JSON]
```

For YouTube URLs, show:

```txt
[Get Transcript]
[Transcript Preview]
[Transform Transcript]
```

Warnings must appear below the output panel.

---

## 12. Recommended File Structure

```txt
/src
  /engine
    detectInputType.ts
    routeOutputMode.ts
    buildPrompt.ts
    validateOutput.ts
    runEngine.ts
  /youtube
    extractYouTubeVideoId.ts
    getYouTubeTranscript.ts
    formatTranscript.ts
  /components
    EngineForm.tsx
    OutputPanel.tsx
    TranscriptPanel.tsx
  /types
    engine.ts
    transcript.ts
```

If the project uses Next.js App Router, add:

```txt
/src/app/api/youtube-transcript/route.ts
```

If the project uses Pages Router, add:

```txt
/src/pages/api/youtube-transcript.ts
```

Use whichever router already exists. Do not add both unless the project already uses both.

---

## 13. Implementation Steps for Cursor Agent

### Step 1 — Inspect Project

Ask Cursor Agent to inspect:

- framework
- routing system
- package manager
- existing API route structure
- existing UI components
- existing LLM provider integration

Do not rewrite the whole app.

---

### Step 2 — Add Types

Create:

```txt
/src/types/engine.ts
/src/types/transcript.ts
```

---

### Step 3 — Add Input Detection

Create:

```txt
/src/engine/detectInputType.ts
```

Must detect YouTube URLs before general URLs.

---

### Step 4 — Add Output Mode Router

Create:

```txt
/src/engine/routeOutputMode.ts
```

---

### Step 5 — Add Prompt Builder

Create:

```txt
/src/engine/buildPrompt.ts
```

Include separate instruction blocks for each output mode.

---

### Step 6 — Add Validation

Create:

```txt
/src/engine/validateOutput.ts
```

---

### Step 7 — Add YouTube Transcript Module

Create:

```txt
/src/youtube/extractYouTubeVideoId.ts
/src/youtube/getYouTubeTranscript.ts
/src/youtube/formatTranscript.ts
```

If server-side API route is needed, create the correct route for the existing framework.

---

### Step 8 — Add Main Engine Runner

Create:

```txt
/src/engine/runEngine.ts
```

Responsibilities:

1. Detect input type.
2. If YouTube URL, get transcript first.
3. Resolve output mode.
4. Build prompt.
5. Call LLM provider.
6. Validate output.
7. Return response.

---

### Step 9 — Add UI

Create or update:

```txt
/src/components/EngineForm.tsx
/src/components/OutputPanel.tsx
/src/components/TranscriptPanel.tsx
```

---

### Step 10 — Test

Test these cases:

1. Plain text paraphrase.
2. Markdown translation.
3. HTML same-format rewrite.
4. JSX text-node-only rewrite.
5. Diff mode output.
6. Structured JSON output.
7. YouTube URL transcript fetch.
8. YouTube transcript summarize.
9. YouTube transcript translate.
10. Failure state for unavailable transcript.

---

## 14. Safety Rules

- Never auto-deploy.
- Never overwrite production files without review.
- Never run destructive shell commands.
- Never modify production databases.
- Never expose private API keys in frontend code.
- Keep all changes in Git.
- Prefer Diff Mode for code replacement workflows.
- For YouTube, do not download video or audio files in v1.0.
- For YouTube, only obtain captions/transcripts when available.

---

## 15. Acceptance Criteria

v1.0 is complete when:

- User can paste plain text and get transformed output.
- User can paste markdown and preserve markdown when requested.
- User can paste HTML and choose Same Format.
- User can paste HTML/JSX and choose Text Nodes Only.
- User can request Diff Mode and receive patch-style output.
- User can request Structured JSON and receive valid JSON.
- User can paste a YouTube URL and obtain transcript when available.
- User can transform a YouTube transcript.
- Auto mode routes common cases correctly.
- Output warnings appear when preservation may have failed.
- The app builds without TypeScript errors.
- The implementation does not break existing UI or routes.

---

## 16. Cursor Agent Instruction

Use Cursor Agent / Composer 2 to implement this spec.

Important constraints:

- Make the smallest working implementation.
- Do not redesign the entire app.
- Do not change unrelated files.
- Do not add unnecessary dependencies.
- Prefer existing project patterns.
- After implementation, run typecheck/build.
- Show all changed files for review.
