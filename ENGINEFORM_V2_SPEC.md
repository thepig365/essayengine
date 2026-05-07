# EssayEngine V2 EngineForm Rebuild Spec

## Purpose

This document defines the rebuild plan for `src/components/EngineForm.tsx`.

The goal is **not** to rebuild the entire app.

The goal is to replace the current oversized cockpit-style `EngineForm.tsx` with a clean workflow orchestration layer while preserving existing working logic, components, APIs, and fallback controls.

The current `EngineForm.tsx` has become too large and mixes:

- source input
- extraction
- topic selection
- processing
- draft/review/final output
- TTS/listening
- project save/load
- mobile workflow
- desktop layout
- Advanced Studio
- styled-jsx overrides
- old cockpit visibility rules

This causes the UI to show too many unrelated panels at the same time.

The new EngineForm must make the workflow clear:

```text
Source → Extract → Topic → Process → Review → Export
```

---

## High-Level Strategy

Do not delete the old EngineForm.

Instead:

```text
Current EngineForm.tsx
→ copy to EngineFormLegacy.tsx

New EngineForm.tsx
→ clean V2 workflow shell

EngineFormLegacy
→ available only inside Advanced Studio
```

The old cockpit remains available as fallback.

The new EngineForm becomes the primary user-facing workflow.

---

## Hard Rules

Do not change:

- API routes
- prompt construction
- TopicMaterial runtime rules
- Generate logic
- project storage behavior
- backend behavior
- existing source extraction behavior
- existing save topic behavior
- existing use full source behavior
- existing review/listen/export behavior

Do not introduce:

- Tailwind
- new UI library
- database
- auth
- new backend routes
- new LLM provider logic

Do not remove existing functionality.

Do not delete the legacy engine.

---

## Required Files

### Preserve current legacy engine

Create:

```text
src/components/EngineFormLegacy.tsx
```

This should initially be a copy of the current:

```text
src/components/EngineForm.tsx
```

### Replace main EngineForm

Create a new clean:

```text
src/components/EngineForm.tsx
```

### Create new V2 components

Create:

```text
src/components/engine-v2/EngineV2Shell.tsx
src/components/engine-v2/EngineV2Nav.tsx
src/components/engine-v2/SourceScreen.tsx
src/components/engine-v2/ExtractScreen.tsx
src/components/engine-v2/TopicScreen.tsx
src/components/engine-v2/ProcessScreen.tsx
src/components/engine-v2/ReviewScreen.tsx
src/components/engine-v2/ExportScreen.tsx
```

Optional, only if useful:

```text
src/components/engine-v2/FunctionsMenu.tsx
src/components/engine-v2/WorkflowProgress.tsx
src/components/engine-v2/AdvancedStudioPanel.tsx
src/components/engine-v2/TopicStatusCard.tsx
```

---

## Product Workflow

The main workflow has six steps:

```text
1. Source
2. Extract
3. Topic
4. Process
5. Review
6. Export
```

Each step must show only the UI relevant to that step.

Do not show unrelated panels.

---

## Step 1 — Source

### Purpose

The user adds or reviews the source.

### Should show

- source input
- source type detection
- source preview/status
- source actions
- Continue to Extract

### Source types

The UI may support existing source types:

- plain text
- YouTube URL
- web article URL
- transcript
- audio
- document
- image/screenshot placeholder if not implemented

### Should not show

- processing tools
- AI output
- draft workspace
- listen panel
- final output
- export controls
- project save
- full cockpit

### Preferred visible copy

Title:

```text
Add or review the source
```

Subtitle:

```text
Paste a link, transcript, article, note, or source text. Continue to Extract when the source is ready.
```

Primary CTA:

```text
Continue to Extract
```

Secondary CTA:

```text
Open Full Studio
```

---

## Step 2 — Extract

### Purpose

The user selects useful parts from the source.

### Should show

- transcript blocks
- paragraph blocks
- timestamp range
- topic filter
- selected material preview
- Save as Topic

### Should not show

- processing/generate controls
- draft editor
- final output
- listen panel
- export controls

### Preferred visible copy

Title:

```text
Extract useful parts
```

Subtitle:

```text
Select transcript blocks, paragraphs, or time ranges before saving a topic.
```

Primary CTA:

```text
Save as Topic
```

Secondary CTA:

```text
Use Full Source
```

---

## Step 3 — Topic

### Purpose

The user reviews saved topic material before processing.

### Should show

- saved topic preview
- source type
- word count
- full source / selected source mode
- stale warning
- Use Full Source
- Clear Topic
- Process Saved Topic

### Should not show

- source editor
- extraction tools
- draft editor
- listen panel
- final output

### Preferred visible copy

Title:

```text
Review saved topic
```

Subtitle:

```text
Confirm the selected topic before processing.
```

Primary CTA:

```text
Process Saved Topic
```

Secondary CTAs:

```text
Use Full Source
Clear Topic
```

### Empty state

```text
No saved topic yet. Extract useful source material and save it as a topic.
```

### Stale warning

```text
Topic may be stale. The source has changed. Save the topic again.
```

---

## Step 4 — Process

### Purpose

The user generates or transforms content from the saved topic.

### Must show

- processing tools
- translation tools
- custom instruction
- Generate
- compact AI/language/tone settings if already available

### Must visibly include tool groups

#### Understand

- Main Claims
- Core Summary
- Emotional Thread
- Quotable Lines

#### Create

- Topic Card
- Writing Directions
- Write Article
- Write Essay
- LinkedIn Post
- Mendbook Chapter
- Audiobook Script

#### Translate

- Translate
- Faithful Translation
- Natural Translation
- Literary / Healing Translation
- Compare Translations if available, otherwise disabled

#### Rewrite

- More Natural
- More Gentle
- More Literary
- Better for Voiceover
- Less AI-like

### Should not show

- source editor
- extraction tools
- draft editor
- listen panel
- final output

### Generate rule

Generate must remain guarded:

```text
No saved topic → no processing
```

The generation request must use:

```text
topicMaterial.content
```

Do not revert to using raw source by default.

### Preferred visible copy

Title:

```text
Process saved topic
```

Subtitle:

```text
Choose how to transform the saved topic.
```

Primary CTA:

```text
Generate
```

---

## Step 5 — Review

### Purpose

The user reads, listens, revises, and improves the draft.

### Should show

- AI output
- draft
- listen controls
- revise/rewrite controls
- mark as final if available

### Should not show

- source input
- extraction tools
- process setup
- export-only controls

### Preferred visible copy

Title:

```text
Review draft
```

Subtitle:

```text
Read, listen, revise, and prepare the draft for final approval.
```

Possible CTAs:

```text
Listen
Revise
Rewrite Selected Part
Mark as Final
```

---

## Step 6 — Export

### Purpose

The user prepares the final product.

### Should show

- final preview
- save final
- copy
- export options
- markdown/docx/audio script if available or marked Advanced

### Should not show

- source input
- extraction tools
- process controls
- draft-only controls

### Preferred visible copy

Title:

```text
Export final product
```

Subtitle:

```text
Copy, save, or export the approved final version.
```

Possible CTAs:

```text
Copy
Save Final
Export Markdown
Export DOCX
Export Audio Script
```

---

## Advanced Studio

Advanced Studio is the fallback full-control area.

### Rules

- collapsed by default
- contains `EngineFormLegacy`
- opens only when user clicks:
  - Open Full Studio
  - an advanced-only Functions item
  - a Settings item that truly requires full controls
- must not be the default destination for normal CTAs
- must not be shown as the primary workflow

### Preferred visible copy

Title:

```text
Advanced Studio
```

Subtitle:

```text
Full controls for power users and recovery.
```

Button:

```text
Open Full Studio
```

---

## Functions Menu

Functions menu remains the main tool menu.

### Rules

- do not break existing Functions overlay behavior
- do not reintroduce separate top-level pills for each step
- Functions contains tools
- Progress strip shows workflow
- Main workspace shows content

### Functions order

```text
Source
Extract
Topic
Process
Review
Export
Settings
```

### Settings behavior

Settings should open the Functions menu to Settings.

It should not scroll the page unless the item is explicitly advanced-only.

---

## Progress Strip

The progress strip is passive.

It should show:

```text
Source → Extract → Topic → Process → Review → Export
```

It should not look like a row of action buttons.

It may highlight current step.

It should not call invalid step indexes.

If internal workflow still has only five legacy steps, Export must map safely to Review/Publish or to a final/export anchor.

---

## UI Language Rules

Visible UI must be English-only.

No Chinese text in:

- buttons
- headings
- labels
- helper text
- section titles
- status text
- aria labels
- tooltips

Chinese may remain only in:

- user-entered content
- LLM prompt templates that are not visible UI
- internal CJK detection regex

Examples:

```text
素材源 → Source
内容素材分析器 → Content Source Analyzer
提取与勾选 → Extraction & Selection
加工 → Process
审阅 → Review
导出 → Export
本轮产出 → AI Output
完整编辑区 → Advanced Studio
已选主题素材 → Saved Topic
使用完整素材 → Using Full Source
尚未保存主题素材 → No saved topic yet
```

---

## Layout Rules

### Main screen

The main screen should show one active workflow screen at a time.

Do not show:

```text
Source + Processing + Draft + Listen + Final
```

on the same Source screen.

### Source step

Show only Source.

### Extract step

Show only Extract.

### Topic step

Show only Topic.

### Process step

Show only Process.

### Review step

Show only Review.

### Export step

Show only Export.

---

## Visual Rules

Do not continue the old cockpit look.

### General style

- clean
- spacious
- readable
- product-like
- not developer-console-like

### Color direction

Use a warm, editorial, creative-studio feel.

Do not copy Descript branding, exact colors, or text.

Acceptable direction:

- warm cream / pale blush page background
- deep burgundy / charcoal primary text
- muted warm gray secondary text
- coral / muted red primary CTA
- warm outline secondary buttons
- soft warm borders
- cards in warm off-white or blush
- dark editor surfaces only where useful for source/draft text

Avoid:

- random white cards inside dark panels
- neon teal everywhere
- harsh blue-gray borders
- pure black cockpit surfaces
- mismatched dark/light cards

---

## Input and Button Alignment Rules

All inputs and textareas should follow:

```text
Label
Helper text
Field
Meta/status row
Actions
```

Rules:

- labels above fields
- helper text directly below label or above field
- full-width fields unless intentionally in a grid
- consistent padding
- consistent border radius
- consistent font size
- consistent line-height
- consistent placeholder color
- aligned character count/status rows

Buttons:

- consistent height
- consistent padding
- consistent border radius
- consistent gap
- no oversized vertical green blocks
- no overlapping text
- no broken multi-line labels

Transcript Library buttons must align:

```text
Save Transcript
Choose Saved Transcript
Load Transcript
Duplicate Transcript
Delete Transcript
```

Preferred desktop layout:

```text
[Save Transcript] [Choose Saved Transcript] [Load Transcript] [Duplicate Transcript]
[Delete Transcript]
```

Mobile may stack vertically.

---

## Legacy Component Reuse

Reuse existing components where safe:

- MaterialWorkspace
- ExtractionWorkspace
- TopicWorkspace
- ProcessingWorkspace
- ReviewProductWorkspace
- StudioWorkspaceShell
- TopicMaterialStatusStrip
- EssayEngineNav
- FeatureMegaMenu

But do not allow these components to force the old cockpit layout into the main workflow.

If a component is too tied to old layout, wrap it or use only a relevant portion.

---

## Implementation Phases

### Phase 1 — Preserve Legacy

1. Copy current `EngineForm.tsx` to `EngineFormLegacy.tsx`.
2. Do not change legacy behavior.
3. Ensure TypeScript passes.

### Phase 2 — New Shell

1. Replace `EngineForm.tsx` with clean V2 shell.
2. Add activeStep local state.
3. Render one screen at a time.
4. Put `EngineFormLegacy` inside Advanced Studio.
5. Ensure TypeScript passes.

### Phase 3 — Wire Source

1. SourceScreen shows clean source input/status.
2. Continue to Extract moves to Extract step.
3. Advanced Studio fallback remains available.

### Phase 4 — Wire Extract

1. ExtractScreen shows selection tools.
2. Save as Topic uses existing handler.
3. No processing/draft/final visible.

### Phase 5 — Wire Topic

1. TopicScreen shows saved topic.
2. Use Full Source / Clear Topic / Process Saved Topic.
3. No source/draft/final visible.

### Phase 6 — Wire Process

1. ProcessScreen shows process and translation tools.
2. Generate uses existing guard.
3. No source/extract/review/export visible.

### Phase 7 — Wire Review and Export

1. ReviewScreen shows output/draft/listen.
2. ExportScreen shows final/export.
3. No unrelated panels.

---

## Acceptance Criteria

The work is acceptable only if:

- `npx tsc --noEmit` passes.
- Current `EngineFormLegacy` remains available.
- Source step shows only Source UI.
- Extract step shows only Extract UI.
- Topic step shows only Topic UI.
- Process step shows process and translation tools clearly.
- Review step shows draft/listen/revise UI.
- Export step shows final/export UI.
- Advanced Studio remains collapsed by default.
- Normal CTAs do not dump users into the old cockpit.
- No visible Chinese UI text in the new workflow.
- Functions menu still works.
- TopicMaterial runtime still works.
- Generate still requires saved topic.
- Existing source/extract/topic/process/review/export handlers are not removed.

---

## Non-goals

Do not implement:

- new backend
- new routes
- new LLM provider
- database
- auth
- new file storage
- PDF/DOCX export backend
- new TTS backend
- full mobile redesign

These are later tasks.
