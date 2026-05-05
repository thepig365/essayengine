# Essay Engine MVP v1 Readiness

## What The App Does

Essay Engine helps a writer turn raw material into essay-ready outputs. It supports text capture, voice note capture with STT, link capture, YouTube transcript preparation, AI structure building, draft generation, revision from marked paragraphs, diagnosis, polish versions, repurposed outputs, and text/audio export.

The MVP is designed around this flow:

Raw material -> Capture -> Clarify -> Structure -> Draft -> Listen/Mark -> Revise -> Diagnose -> Polish -> Repurpose -> Final output

## Main Workflow

1. Capture raw material in the Guided Mobile Workflow.
2. Add context through Clarify: intent, audience, and tone.
3. Generate 3 AI structure options.
4. Select one structure.
5. Generate a draft into Essay Draft.
6. Listen to the draft and mark paragraphs.
7. Revise marked paragraphs with an instruction.
8. Diagnose the draft.
9. Generate polish versions and choose/copy one.
10. Repurpose the draft into selected formats.
11. Save/load the project locally.

Classic Editor remains available for Source, Draft, and Result work.

## Environment Variables Needed

Create `.env.local` from `.env.example`. Do not commit real secrets.

Required for core OpenAI paths:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_TTS_MODEL`
- `OPENAI_TTS_VOICE`
- `OPENAI_TTS_FORMAT`

Optional fallback providers:

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `QWEN_API_KEY`
- `QWEN_MODEL`

Optional STT override:

- `OPENAI_STT_MODEL`

If `OPENAI_STT_MODEL` is not set, `/api/transcribe` defaults to `whisper-1`.

## How To Run Locally

Install dependencies:

```bash
npm install
```

Run the dev UI:

```bash
npm run dev
```

Alternative user-friendly launcher:

```bash
npm run engine-ui
```

Build production:

```bash
npm run build
```

Typecheck:

```bash
npm run typecheck
```

## Main API Routes

- `POST /api/run`
  - Runs the main AI engine for translate, paraphrase, rewrite, summarize, extract, and improve tasks.
- `POST /api/tts`
  - Generates one audio response for text.
- `POST /api/tts/merge`
  - Merges/downloads chunked TTS output.
- `POST /api/transcribe`
  - Accepts multipart audio and returns STT text.
- `POST /api/extract-link`
  - Fetches a public http/https URL and extracts readable text.
- `POST /api/transcript`
  - Fetches YouTube transcript content for transcript workspace use.

## Known Limitations

- Project persistence is local browser storage, not cloud sync.
- Audio previews from voice recording are temporary and not persisted across reloads.
- STT stores transcript text/metadata only, not audio blobs.
- Link extraction can be thin for paywalled, heavily scripted, blocked, or navigation-heavy pages.
- YouTube link capture does not replace the Transcript Workspace. Use Transcript Workspace for video transcript work.
- Browser microphone and clipboard behavior depends on browser permissions.
- No authentication, database, native iOS share sheet, or browser extension support in MVP v1.
- The guided mobile workflow is optimized for phone use, but real device QA is still recommended.

## What Is Temporary Or Not Persisted

- Voice recording object URLs are session-only.
- Audio blobs are not stored in localStorage.
- TTS playback state is not a durable project artifact.
- Link raw page text may be truncated and should not be treated as full archival storage.
- Saved projects persist source, versions, draft, result state, guided workflow state, and TTS settings locally.

## Manual QA Checklist

- Text capture can become structure/draft material.
- Voice capture can record, stop, preview, transcribe, edit transcript, and save transcript as capture text.
- Link capture can analyze a public URL, show extracted material, copy it, and save it as capture text.
- Structure Builder returns 3 usable options.
- Selected structure can generate a draft.
- Draft appears in Essay Draft and can be copied/exported.
- Listen/Mark starts TTS and lets paragraphs be marked.
- Revision uses marked paragraphs plus instruction.
- Diagnosis is readable and copyable.
- Polish versions are readable, copyable, and usable as Essay Draft with confirmation.
- Repurpose outputs are readable and copyable.
- Save project, reload/load project, and confirm source/draft/workflow state persists.
- Classic Source/Draft/Result tabs still work.
- Sticky audio player does not cover important content on mobile.
- Night vision mode remains readable on mobile and desktop.

## MVP v1 Test Script

Use this essay idea:

```text
People often confuse healing with becoming productive again. I want to write a reflective personal essay arguing that grief needs space, not optimization. The audience is emotionally tired people who feel pressure to recover quickly. Tone should be personal, direct, and quietly literary.
```

1. Paste the idea into Guided Mobile Workflow -> Capture Inbox.
2. Click `Extract core value`.
3. Fill Clarify:
   - Intent: argue that grief needs space, not optimization
   - Audience: emotionally tired people who feel pressure to recover quickly
   - Tone: personal, direct, quietly literary
4. Optional voice path:
   - Record a short voice note.
   - Stop recording.
   - Preview audio.
   - Click `Transcribe voice note`.
   - Edit transcript if needed.
   - Save transcript as capture.
5. Optional link path:
   - Paste `https://example.com/` or another simple public article URL.
   - Click `Analyze link`.
   - Review extracted material.
   - Click `Save as capture`.
6. Click `Create 3 AI structures`.
7. Select a structure and copy the outline if needed.
8. Click `Generate draft and replace Essay Draft`.
9. Enter Listen and Mark mode.
10. Mark at least two paragraphs.
11. Add a revision instruction, such as:

```text
Make the marked paragraphs more concrete, less motivational, and more quietly literary.
```

12. Click `Revise marked paragraphs`.
13. Click `Diagnose draft`.
14. Copy diagnosis.
15. Generate polish versions.
16. Copy one polish version.
17. Use one polish version as Essay Draft if appropriate.
18. Select repurpose formats:
   - Short post
   - YouTube script
   - App daily reflection
19. Click `Create selected formats`.
20. Copy each repurpose output.
21. Save project.
22. Reload/load the project and confirm capture, draft, workflow outputs, source versions, and TTS settings are restored.

## Handoff Notes

MVP v1 is ready for product QA when typecheck and production build pass and a browser-level mobile test confirms microphone, clipboard, TTS, link capture, save/load, and scrolling behavior.
