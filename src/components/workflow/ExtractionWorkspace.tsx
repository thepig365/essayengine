"use client";

import type { ReactNode } from "react";
import type { ManualTranscriptRange } from "@/hooks/useTranscriptWorkspace";
import { formatSecondsTimestamp, labelForMaterialKind } from "@/lib/sourceMaterialUtils";
import type { EngineTask } from "@/types/engine";
import type { SourceMaterialPipelineTab, SourceMaterialType, SourceSegment } from "@/types/sourceMaterial";

type TranscriptWorkspaceSection = {
  id: string;
  start: number;
  end: number;
  title: string;
  text: string;
  rough: boolean;
};

type TopicSectionMatch = {
  section: TranscriptWorkspaceSection;
  score: number;
};

type SelectedSourceMaterial = {
  text: string;
  summary: string;
  analysisSourceType: SourceMaterialType;
};

const EXTRACTION_TABS: ReadonlyArray<{ id: SourceMaterialPipelineTab; label: string }> = [
  { id: "transcript", label: "Transcript / Captions" },
  { id: "link", label: "Web Link" },
  { id: "paste", label: "Paste Text" },
  { id: "audio", label: "Upload Audio" },
  { id: "document", label: "Text / Captions File" },
];

/**
 * Stage 2: Extraction — segment view.
 *
 * Allowed:
 *   - timestamp blocks, paragraph blocks, comment blocks
 *   - image/OCR/visual segments (later)
 *   - selection checkboxes, time-range selection
 *
 * Not allowed:
 *   - final writing, translation, summarization
 */
type Props = {
  children?: ReactNode;
  active?: boolean;
  sourceMaterialPipeline?: SourceMaterialPipelineTab;
  onSourceMaterialPipelineChange?: (tab: SourceMaterialPipelineTab) => void;
  materialUseFullExplicit?: boolean;
  onMaterialUseFullExplicitChange?: (value: boolean) => void;
  linkExtractUrl?: string;
  onLinkExtractUrlChange?: (value: string) => void;
  linkExtractLoading?: boolean;
  onRunLinkMaterialExtract?: () => void;
  linkExtractStatus?: string | null;
  pasteBlockInput?: string;
  onPasteBlockInputChange?: (value: string) => void;
  onApplyPasteMaterialBlocks?: () => void;
  audioUploadLoading?: boolean;
  onTranscribeAudioFile?: (file: File) => void;
  onIngestDocumentFile?: (file: File) => void;
  genericWorkspaceNotice?: string | null;
  genericSegments?: SourceSegment[];
  genericCheckedIds?: string[];
  onToggleGenericSegment?: (id: string) => void;
  genericMaterialKind?: SourceMaterialType;
  genericMaterialTitle?: string;
  selectedMaterial?: SelectedSourceMaterial | null;
  onReplaceSourceCaptureFromMaterialSelection?: () => void;
  onUseFullTranscriptAsSource?: () => void;
  transcriptText?: string;
  effectiveYoutubeSource?: boolean;
  transcriptLoading?: boolean;
  onFetchTranscript?: () => void;
  transcriptStatus?: string | null;
  timestampChapterInput?: string;
  onTimestampChapterInputChange?: (value: string) => void;
  onTimestampChapterInputTouched?: () => void;
  onApplyTimestampChapters?: () => void;
  onReplaceSourceWithCheckedSections?: () => void;
  onAddCheckedSectionsToSource?: () => void;
  onAddCheckedSectionsToDraft?: () => void;
  onCopyCheckedSectionsCleanText?: () => void;
  chapterSectionsGenerated?: boolean;
  timestampChapterSections?: TranscriptWorkspaceSection[];
  checkedChapterIds?: string[];
  onToggleTimestampChapter?: (id: string) => void;
  chapterStatus?: string | null;
  topicInput?: string;
  onTopicInputChange?: (value: string) => void;
  onFindTopicSections?: () => void;
  onReplaceSourceWithMatchedSections?: () => void;
  onAddMatchedSectionsToSource?: () => void;
  onAddMatchedSectionsToDraft?: () => void;
  onCopyMatchedSections?: () => void;
  onClearTopicMatches?: () => void;
  topicMatches?: TopicSectionMatch[];
  checkedTopicSectionIds?: string[];
  onToggleTopicSection?: (id: string) => void;
  topicStatus?: string | null;
  manualRanges?: ManualTranscriptRange[];
  onUpdateManualRange?: (id: string, field: "start" | "end", value: string) => void;
  onRemoveManualRange?: (id: string) => void;
  onAddManualRange?: () => void;
  onReplaceSourceWithManualRanges?: () => void;
  onAddManualRangesToSource?: () => void;
  onAddManualRangesToDraft?: () => void;
  onClearManualRanges?: () => void;
  rangeStatus?: string | null;
  includeTranscriptTimestamps?: boolean;
  onIncludeTranscriptTimestampsChange?: (value: boolean) => void;
  onReplaceSourceWithCheckedFullTranscriptSections?: () => void;
  onAddCheckedFullTranscriptSectionsToSource?: () => void;
  onAddCheckedFullTranscriptSectionsToDraft?: () => void;
  onCopyCheckedFullTranscriptSections?: () => void;
  fullTranscriptSections?: TranscriptWorkspaceSection[];
  checkedFullSectionIds?: string[];
  onToggleFullTranscriptSection?: (id: string) => void;
  fullSectionStatus?: string | null;
  formatTimestamp: (seconds: number) => string;
  cleanSectionText: (section: TranscriptWorkspaceSection) => string;
  materialAnalysisButtons?: ReadonlyArray<{ label: string; task: EngineTask | string }>;
  materialAnalysisLoading?: boolean;
  onRunMaterialAnalysisTask?: (task: string) => void;
  materialCustomPrompt?: string;
  onMaterialCustomPromptChange?: (value: string) => void;
  materialAnalysisStatus?: string | null;
  selectedMaterialActions?: ReactNode;
  savedTopicCompatibility?: ReactNode;
  afterSelectedMaterial?: ReactNode;
  /** Hide the "Analyze Source" tool wall (tools live in Feature Section on desktop). */
  hideMaterialAnalysisPanel?: boolean;
};

export function ExtractionWorkspace({
  children,
  active = true,
  sourceMaterialPipeline = "transcript",
  onSourceMaterialPipelineChange,
  materialUseFullExplicit = false,
  onMaterialUseFullExplicitChange,
  linkExtractUrl = "",
  onLinkExtractUrlChange,
  linkExtractLoading = false,
  onRunLinkMaterialExtract,
  linkExtractStatus,
  pasteBlockInput = "",
  onPasteBlockInputChange,
  onApplyPasteMaterialBlocks,
  audioUploadLoading = false,
  onTranscribeAudioFile,
  onIngestDocumentFile,
  genericWorkspaceNotice,
  genericSegments = [],
  genericCheckedIds = [],
  onToggleGenericSegment,
  genericMaterialKind = "text",
  genericMaterialTitle = "",
  selectedMaterial,
  onReplaceSourceCaptureFromMaterialSelection,
  onUseFullTranscriptAsSource,
  transcriptText = "",
  effectiveYoutubeSource = false,
  transcriptLoading = false,
  onFetchTranscript,
  transcriptStatus,
  timestampChapterInput = "",
  onTimestampChapterInputChange,
  onTimestampChapterInputTouched,
  onApplyTimestampChapters,
  onReplaceSourceWithCheckedSections,
  onAddCheckedSectionsToSource,
  onAddCheckedSectionsToDraft,
  onCopyCheckedSectionsCleanText,
  chapterSectionsGenerated = false,
  timestampChapterSections = [],
  checkedChapterIds = [],
  onToggleTimestampChapter,
  chapterStatus,
  topicInput = "",
  onTopicInputChange,
  onFindTopicSections,
  onReplaceSourceWithMatchedSections,
  onAddMatchedSectionsToSource,
  onAddMatchedSectionsToDraft,
  onCopyMatchedSections,
  onClearTopicMatches,
  topicMatches = [],
  checkedTopicSectionIds = [],
  onToggleTopicSection,
  topicStatus,
  manualRanges = [],
  onUpdateManualRange,
  onRemoveManualRange,
  onAddManualRange,
  onReplaceSourceWithManualRanges,
  onAddManualRangesToSource,
  onAddManualRangesToDraft,
  onClearManualRanges,
  rangeStatus,
  includeTranscriptTimestamps = false,
  onIncludeTranscriptTimestampsChange,
  onReplaceSourceWithCheckedFullTranscriptSections,
  onAddCheckedFullTranscriptSectionsToSource,
  onAddCheckedFullTranscriptSectionsToDraft,
  onCopyCheckedFullTranscriptSections,
  fullTranscriptSections = [],
  checkedFullSectionIds = [],
  onToggleFullTranscriptSection,
  fullSectionStatus,
  formatTimestamp,
  cleanSectionText,
  materialAnalysisButtons = [],
  materialAnalysisLoading = false,
  onRunMaterialAnalysisTask,
  materialCustomPrompt = "",
  onMaterialCustomPromptChange,
  materialAnalysisStatus,
  selectedMaterialActions,
  savedTopicCompatibility,
  afterSelectedMaterial,
  hideMaterialAnalysisPanel = false,
}: Props) {
  return (
    <section
      className="extraction-workspace"
      data-stage="extraction"
      hidden={!active}
      aria-label="Extraction — segment selection"
    >
      <div className="layer-head">
        <p className="eyebrow">Source Extractor</p>
        <h2>Content Source Analyzer</h2>
        <p>
          <strong>Extraction &amp; selection:</strong> every source becomes selectable blocks here. Pick ranges or paragraphs, then save as{" "}
          <strong>saved topic</strong> below. Processing (left / mobile) runs on saved topic text, not on this panel alone.
        </p>
        <p>Every source becomes selectable text blocks before analysis or writing. Full source is never used by default.</p>
      </div>

      <div className="range-actions cta-row" style={{ flexWrap: "wrap", gap: "0.35rem" }}>
        {EXTRACTION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={sourceMaterialPipeline === tab.id ? "primary" : "secondary"}
            onClick={() => onSourceMaterialPipelineChange?.(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <label className="organize-option" style={{ marginTop: "0.75rem" }}>
        <input type="checkbox" checked={materialUseFullExplicit} onChange={(e) => onMaterialUseFullExplicitChange?.(e.target.checked)} />
        <span>Use full source (only enabled when explicitly checked)</span>
      </label>
      <p className="transcript-note">
        When unchecked, analysis, custom extraction, and saved topics use only the sections or paragraph blocks you selected. To summarize an entire video or document, check this option or use the full-source action below.
      </p>

      {sourceMaterialPipeline === "link" && (
        <div className="topic-filter" style={{ marginTop: "1rem" }}>
          <div className="range-head">
            <strong>Web link extraction (LinkedIn, social posts, forums, podcast pages)</strong>
            <p>Extract readable page text and split it into paragraphs. Use Transcript / Captions for YouTube.</p>
          </div>
          <label className="field">
            <span>Page URL</span>
            <input value={linkExtractUrl} onChange={(e) => onLinkExtractUrlChange?.(e.target.value)} placeholder="https://" />
          </label>
          <div className="range-actions cta-row">
            <button type="button" className="primary" disabled={linkExtractLoading} onClick={onRunLinkMaterialExtract}>
              {linkExtractLoading ? "Extracting…" : "Extract Source"}
            </button>
          </div>
          {linkExtractStatus && <span className="range-status">{linkExtractStatus}</span>}
        </div>
      )}

      {sourceMaterialPipeline === "paste" && (
        <div className="topic-filter" style={{ marginTop: "1rem" }}>
          <div className="range-head">
            <strong>Paste article or long text</strong>
            <p>Split by blank lines into paragraph blocks, then select the parts you need.</p>
          </div>
          <label className="field">
            <span>Long text</span>
            <textarea
              rows={8}
              value={pasteBlockInput}
              onChange={(e) => onPasteBlockInputChange?.(e.target.value)}
              placeholder="Paste an article, note, thread, or long-form text…"
            />
          </label>
          <div className="range-actions cta-row">
            <button type="button" className="primary" onClick={onApplyPasteMaterialBlocks}>
              Split Paragraphs
            </button>
          </div>
        </div>
      )}

      {sourceMaterialPipeline === "audio" && (
        <div className="topic-filter" style={{ marginTop: "1rem" }}>
          <div className="range-head">
            <strong>Upload audio for transcription</strong>
            <p>Server-side transcription converts audio to text, then splits it into blocks (requires OPENAI_API_KEY).</p>
          </div>
          <label className="field">
            <span>Audio file</span>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onTranscribeAudioFile?.(f);
                e.target.value = "";
              }}
            />
          </label>
          {audioUploadLoading && <span className="range-status">Transcribing…</span>}
        </div>
      )}

      {sourceMaterialPipeline === "document" && (
        <div className="topic-filter" style={{ marginTop: "1rem" }}>
          <div className="range-head">
            <strong>Upload text / captions file</strong>
            <p>Supports .txt, .md, .srt, and .vtt; timed files appear as time blocks.</p>
          </div>
          <label className="field">
            <span>File</span>
            <input
              type="file"
              accept=".txt,.md,.srt,.vtt,text/plain"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onIngestDocumentFile?.(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {genericWorkspaceNotice && <p className="range-status">{genericWorkspaceNotice}</p>}

      {genericSegments.length > 0 && sourceMaterialPipeline !== "transcript" && (
        <div className="section-workspace" style={{ marginTop: "1rem" }}>
          <div className="range-head">
            <strong>
              {labelForMaterialKind(genericMaterialKind, "en")}
              {genericMaterialTitle ? ` · ${genericMaterialTitle}` : ""}
            </strong>
            <p>Select the blocks to use for analysis and topic saving. Forums and posts keep paragraph structure where possible.</p>
          </div>
          <div className="chapter-list compact">
            {genericSegments.map((seg, idx) => (
              <label className="chapter-row" key={seg.id}>
                <input type="checkbox" checked={genericCheckedIds.includes(seg.id)} onChange={() => onToggleGenericSegment?.(seg.id)} />
                <span>
                  <strong>
                    {seg.startTime !== undefined
                      ? `[${formatSecondsTimestamp(seg.startTime)}${seg.endTime !== undefined ? `–${formatSecondsTimestamp(seg.endTime)}` : ""}] `
                      : `Paragraph ${idx + 1} `}
                  </strong>
                  {seg.label ? `${seg.label} · ` : ""}
                  {seg.text.length > 220 ? `${seg.text.slice(0, 220)}…` : seg.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <details open className="priority-section" style={{ marginTop: "1rem" }}>
        <summary>Extraction &amp; Selection</summary>
        <div className="timestamp-chapters">
          <p className="transcript-note">
            Current tab: <strong>{sourceMaterialPipeline === "transcript" ? "Transcript / Captions" : "General Source"}</strong> · Type:
            <strong> {sourceMaterialPipeline === "transcript" ? labelForMaterialKind("youtube", "zh") : labelForMaterialKind(genericMaterialKind, "en")}</strong>
          </p>
          {selectedMaterial ? (
            <>
              <p>
                <strong>Range:</strong> {selectedMaterial.summary}
              </p>
              <textarea className="transcript-preview" readOnly rows={6} value={selectedMaterial.text} />
            </>
          ) : (
            <p className="transcript-note">No usable source material selected yet. Select chapters or paragraphs, or enable Use Full Source.</p>
          )}
          <div className="range-actions cta-row ee-quick-action-grid">
            {selectedMaterialActions}
            <button type="button" className="primary" onClick={onReplaceSourceCaptureFromMaterialSelection} disabled={!selectedMaterial}>
              Replace Source with selection
            </button>
            <button type="button" className="secondary" onClick={onUseFullTranscriptAsSource} disabled={!transcriptText.trim()}>
              Use full transcript in Source
            </button>
          </div>
          {savedTopicCompatibility}
        </div>
      </details>

      {afterSelectedMaterial}

      {!hideMaterialAnalysisPanel ? (
      <details open className="priority-section" style={{ marginTop: "0.5rem" }}>
        <summary>Analyze Source (selected material only)</summary>
        <div className="timestamp-chapters">
          <p className="transcript-note">These buttons use only the selected topic text. They do not use the full source by default.</p>
          <div className="range-actions cta-row ee-quick-action-grid">
            {materialAnalysisButtons.map((b) => (
              <button
                key={b.label}
                type="button"
                className="secondary"
                disabled={materialAnalysisLoading || !selectedMaterial}
                onClick={() => onRunMaterialAnalysisTask?.(b.task)}
              >
                {b.label}
              </button>
            ))}
          </div>
          <label className="field">
            <span>What do you want to extract from this source?</span>
            <textarea
              rows={3}
              value={materialCustomPrompt}
              onChange={(e) => onMaterialCustomPromptChange?.(e.target.value)}
              placeholder="Example: find the best parts for a reflective article; extract key ideas from this podcast transcript…"
            />
          </label>
          <div className="range-actions cta-row">
            <button
              type="button"
              className="primary"
              disabled={materialAnalysisLoading || !materialCustomPrompt.trim() || !selectedMaterial}
              onClick={() => onRunMaterialAnalysisTask?.(materialCustomPrompt.trim())}
            >
              {materialAnalysisLoading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
          {materialAnalysisStatus && <span className="range-status">{materialAnalysisStatus}</span>}
        </div>
      </details>
      ) : null}

      {sourceMaterialPipeline === "transcript" && !transcriptText && (
        <div className="transcript-empty">
          <strong>{effectiveYoutubeSource ? "YouTube link detected" : "No transcript yet"}</strong>
          <p>
            {effectiveYoutubeSource
              ? "Click Extract Source, then select timestamped chapters, rough sections, or topic matches before writing to Source."
              : "Paste a YouTube URL in Source and return to this tab, or use Web Link, Paste Text, or Upload Audio for other sources."}
          </p>
          {effectiveYoutubeSource && (
            <button type="button" className="primary transcript-fetch" onClick={onFetchTranscript} disabled={transcriptLoading}>
              {transcriptLoading ? "Extracting…" : "Extract Source"}
            </button>
          )}
          {transcriptStatus && <span className="range-status">{transcriptStatus}</span>}
        </div>
      )}

      {sourceMaterialPipeline === "transcript" && transcriptText && (
        <div className="transcript-tools">
          <details open className="priority-section">
            <summary>1. Timestamp Chapters</summary>
            <div className="timestamp-chapters">
              <div className="range-head">
                <strong>Recommended: use timestamp chapters for precise selection</strong>
                <p>Convert pasted timestamps into selectable transcript sections.</p>
              </div>
              <div className="workspace-subhead">A. Timestamp Input</div>
              <label className="field">
                <span>Timestamp chapters</span>
                <textarea
                  className="chapter-input"
                  value={timestampChapterInput}
                  onChange={(e) => {
                    onTimestampChapterInputChange?.(e.target.value);
                    onTimestampChapterInputTouched?.();
                  }}
                  rows={7}
                  placeholder={`Paste timestamps like:

00:00 The hook
01:30 The problem
02:15 Planning the rebuild`}
                />
              </label>
              <div className="range-actions cta-row">
                <button type="button" className="secondary" onClick={onApplyTimestampChapters}>
                  Generate chapter sections
                </button>
                <button type="button" className="primary" onClick={onReplaceSourceWithCheckedSections}>
                  Replace source with checked chapters
                </button>
                <button type="button" className="secondary" onClick={onAddCheckedSectionsToSource}>
                  Add checked chapters to source
                </button>
                <button type="button" className="secondary" onClick={onAddCheckedSectionsToDraft}>
                  Add checked chapters to Essay Draft
                </button>
                <button type="button" className="copy-action" onClick={onCopyCheckedSectionsCleanText}>
                  Copy checked clean text
                </button>
              </div>
              {chapterSectionsGenerated ? (
                <>
                  <div className="workspace-subhead">B. Parsed Sections</div>
                  <div className="chapter-list compact">
                    {timestampChapterSections.map((section) => (
                      <label className="chapter-row" key={section.id}>
                        <input type="checkbox" checked={checkedChapterIds.includes(section.id)} onChange={() => onToggleTimestampChapter?.(section.id)} />
                        <span>
                          <strong>
                            {formatTimestamp(section.start)}-{formatTimestamp(section.end)}
                          </strong>
                          {section.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p className="transcript-note">Parsed sections will appear after you click Generate chapter sections.</p>
              )}
              {chapterStatus && <span className="range-status">{chapterStatus}</span>}
            </div>
          </details>

          <details open>
            <summary>2. Topic Filter</summary>
            <div className="topic-filter">
              <div className="range-head">
                <strong>Topic Filter</strong>
                <p>Search within transcript sections locally. This selects relevant sections; it does not summarize.</p>
              </div>
              <label className="field">
                <span>Topic keywords or phrases</span>
                <input value={topicInput} onChange={(e) => onTopicInputChange?.(e.target.value)} placeholder="anxiety, depression, social contagion, ADHD, body budget" />
              </label>
              <div className="range-actions cta-row">
                <button type="button" className="secondary" onClick={onFindTopicSections}>
                  Find matches
                </button>
                <button type="button" className="primary" onClick={onReplaceSourceWithMatchedSections}>
                  Replace source with matched sections
                </button>
                <button type="button" className="secondary" onClick={onAddMatchedSectionsToSource}>
                  Add matched sections to source
                </button>
                <button type="button" className="secondary" onClick={onAddMatchedSectionsToDraft}>
                  Add matched sections to Essay Draft
                </button>
                <button type="button" className="copy-action" onClick={onCopyMatchedSections}>
                  Copy matched clean text
                </button>
                <button type="button" className="copy-action" onClick={onClearTopicMatches}>
                  Clear matches
                </button>
              </div>
              <div className="workspace-section-list compact">
                {topicMatches.map((match) => (
                  <article className="workspace-section" key={match.section.id}>
                    <label className="workspace-section-head">
                      <input
                        type="checkbox"
                        checked={checkedTopicSectionIds.includes(match.section.id)}
                        onChange={() => onToggleTopicSection?.(match.section.id)}
                      />
                      <span>
                        <strong>
                          {formatTimestamp(match.section.start)}-{formatTimestamp(match.section.end)} — {match.section.title}
                        </strong>
                        <em>Keyword score: {match.score}</em>
                      </span>
                    </label>
                  </article>
                ))}
              </div>
              {topicStatus && <span className="range-status">{topicStatus}</span>}
            </div>
          </details>

          <details id="ee-extract-time-tools">
            <summary>3. Advanced: Manual Time Ranges</summary>
            <div className="range-selector">
              <div className="range-head">
                <strong>Advanced: Manual Time Ranges</strong>
                <p>Use this only when you already know the exact start and end times.</p>
              </div>
              <div className="manual-ranges">
                {manualRanges.map((range, index) => (
                  <div className="manual-range-row" key={range.id}>
                    <label className="field">
                      <span>Start time</span>
                      <input
                        type="text"
                        value={range.start}
                        onChange={(e) => onUpdateManualRange?.(range.id, "start", e.target.value)}
                        placeholder={index === 0 ? "49:47" : "1:08:23"}
                      />
                    </label>
                    <label className="field">
                      <span>End time</span>
                      <input
                        type="text"
                        value={range.end}
                        onChange={(e) => onUpdateManualRange?.(range.id, "end", e.target.value)}
                        placeholder={index === 0 ? "54:06" : "1:15:00"}
                      />
                    </label>
                    <button type="button" className="copy-action" onClick={() => onRemoveManualRange?.(range.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="range-actions cta-row">
                <button type="button" className="secondary" onClick={onAddManualRange}>
                  Add range
                </button>
                <button type="button" className="primary" onClick={onReplaceSourceWithManualRanges}>
                  Replace source with ranges
                </button>
                <button type="button" className="secondary" onClick={onAddManualRangesToSource}>
                  Add ranges to source
                </button>
                <button type="button" className="secondary" onClick={onAddManualRangesToDraft}>
                  Add ranges to Essay Draft
                </button>
                <button type="button" className="copy-action" onClick={onClearManualRanges}>
                  Clear ranges
                </button>
              </div>
              {rangeStatus && <span className="range-status">{rangeStatus}</span>}
            </div>
          </details>

          <details>
            <summary>4. Rough transcript sections for browsing</summary>
            <div className="section-workspace">
              <div className="rough-warning">Headings are approximate and may be inaccurate.</div>
              <label className="organize-option">
                <input type="checkbox" checked={includeTranscriptTimestamps} onChange={(e) => onIncludeTranscriptTimestampsChange?.(e.target.checked)} />
                <span>Include timestamps in copied headings</span>
              </label>
              <div className="range-actions cta-row">
                <button type="button" className="primary" onClick={onReplaceSourceWithCheckedFullTranscriptSections}>
                  Replace source with checked rough sections
                </button>
                <button type="button" className="secondary" onClick={onAddCheckedFullTranscriptSectionsToSource}>
                  Add checked rough sections to source
                </button>
                <button type="button" className="secondary" onClick={onAddCheckedFullTranscriptSectionsToDraft}>
                  Add checked rough sections to Essay Draft
                </button>
                <button type="button" className="copy-action" onClick={onCopyCheckedFullTranscriptSections}>
                  Copy checked rough sections
                </button>
              </div>
              <div className="workspace-section-list">
                {fullTranscriptSections.map((section) => (
                  <article className="workspace-section" key={section.id}>
                    <label className="workspace-section-head">
                      <input
                        type="checkbox"
                        checked={checkedFullSectionIds.includes(section.id)}
                        onChange={() => onToggleFullTranscriptSection?.(section.id)}
                      />
                      <span>
                        <strong>
                          {formatTimestamp(section.start)}-{formatTimestamp(section.end)} — {section.title}
                        </strong>
                        <em>Approximate section</em>
                      </span>
                    </label>
                    <div className="workspace-section-text">{cleanSectionText(section)}</div>
                  </article>
                ))}
              </div>
              {fullSectionStatus && <span className="range-status">{fullSectionStatus}</span>}
            </div>
          </details>

          <details>
            <summary>5. Raw Transcript</summary>
            <p className="transcript-note">Preview only. Source is not updated unless you use Add or Replace.</p>
            <textarea className="transcript-preview" value={transcriptText} readOnly rows={8} />
          </details>
        </div>
      )}
      {children}
    </section>
  );
}
