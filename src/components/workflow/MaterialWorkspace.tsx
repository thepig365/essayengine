"use client";

import type { ReactNode } from "react";
import { SOURCE_CHIPS } from "@/essay-engine/constants";
import type { SourceVersion } from "@/lib/projectStorage";

type SourceChip = (typeof SOURCE_CHIPS)[number];

type SourceSummaryDetails = {
  type: string;
  sections: number;
  words: number;
  from: string;
};

/**
 * Stage 1: Source — raw inputs only.
 *
 * Allowed:
 *   - text input, URL input, file upload
 *   - YouTube transcript fetch, webpage extraction
 *   - document/audio/image hooks
 *
 * Not allowed:
 *   - write article / translate / summarize / generate final content
 *
 * Thin shell only — EngineForm wiring lands in a later change.
 */
type Props = {
  children?: ReactNode;
  active?: boolean;
  variant?: "shell" | "rawInput" | "sourceCapture";
  sourceMaterialRawInput?: string;
  onSourceMaterialRawInputChange?: (value: string) => void;
  detectedSourceKind?: string;
  autoExtractStatus?: string | null;
  showLinkExtracting?: boolean;
  showTranscriptExtracting?: boolean;
  effectiveIsMobileLayout?: boolean;
  timeline?: ReactNode;
  sourceSummaryDetails?: SourceSummaryDetails;
  sourceChip?: SourceChip;
  onSourceChipChange?: (chip: SourceChip) => void;
  isWebpageUrl?: boolean;
  effectiveYoutubeSource?: boolean;
  input?: string;
  onInputChange?: (value: string) => void;
  sourceHelper?: string;
  currentSourceVersion?: SourceVersion | null;
  viewedSourceVersion?: SourceVersion | null;
  currentSourceVersionId?: string | null;
  sourceKind?: string;
  sourceActionStatus?: string | null;
  onSaveSource?: () => void;
  onListenToSource?: () => void;
  onClearSource?: () => void;
  ttsLoading?: boolean;
  transcriptText?: string;
  transcriptLoading?: boolean;
  transcriptStatus?: string | null;
  onFetchTranscript?: () => void;
  /** When set, raw-input variant does not render `children` (duplicate extract UIs hidden on desktop studio). */
  omitRawInputChildren?: boolean;
};

export function MaterialWorkspace({
  children,
  active = true,
  variant = "shell",
  sourceMaterialRawInput = "",
  onSourceMaterialRawInputChange,
  detectedSourceKind = "",
  autoExtractStatus,
  showLinkExtracting = false,
  showTranscriptExtracting = false,
  effectiveIsMobileLayout = false,
  timeline,
  sourceSummaryDetails,
  sourceChip = SOURCE_CHIPS[0],
  onSourceChipChange,
  isWebpageUrl = false,
  effectiveYoutubeSource = false,
  input = "",
  onInputChange,
  sourceHelper = "",
  currentSourceVersion,
  viewedSourceVersion,
  currentSourceVersionId,
  sourceKind = "",
  sourceActionStatus,
  onSaveSource,
  onListenToSource,
  onClearSource,
  ttsLoading = false,
  transcriptText = "",
  transcriptLoading = false,
  transcriptStatus,
  onFetchTranscript,
  omitRawInputChildren = false,
}: Props) {
  if (!active) return null;

  if (variant === "rawInput") {
    return (
      <section className="layer source-input-layer">
        <div className="layer-head">
          <p className="eyebrow">Source</p>
          <h2>Paste a YouTube URL, podcast link, LinkedIn post, article, social post, or raw text.</h2>
          <p>Put raw material and links here, not writing instructions. You can paste YouTube, podcast, LinkedIn, social, forum, article, transcript, or long-form text sources.</p>
        </div>
        <label className="field">
          <span>Paste source URL or content</span>
          <textarea
            rows={5}
            className="instruction"
            value={sourceMaterialRawInput}
            onChange={(e) => onSourceMaterialRawInputChange?.(e.target.value)}
            placeholder="Paste YouTube URL, podcast URL, LinkedIn post, article text, transcript, or social post here..."
          />
        </label>
        <p>
          <strong>Detected source type:</strong> {detectedSourceKind}
        </p>
        {autoExtractStatus ? <p className="range-status">{autoExtractStatus}</p> : null}
        {showLinkExtracting ? <p className="range-status">Extracting page…</p> : null}
        {showTranscriptExtracting ? <p className="range-status">Extracting transcript…</p> : null}
        {!omitRawInputChildren ? children : null}
        <MaterialWorkspaceStyles />
      </section>
    );
  }

  if (variant === "sourceCapture") {
    return (
      <>
        {effectiveIsMobileLayout ? (
          <details className="ee-mobile-writing-pipeline">
            <summary className="ee-mobile-writing-pipeline-summary">Writing pipeline</summary>
            {timeline}
          </details>
        ) : null}
        <section className="layer source-layer">
          <div className="layer-head">
            <p className="eyebrow">Source</p>
            <h2>Source material</h2>
            <p>
              Capture or prepare material here only. Move to your generation task next, then produce a draft output — assembly and publishing happen in later
              steps.
            </p>
          </div>
          {sourceSummaryDetails ? (
            <div className="source-purpose source-summary-card">
              <strong>Source summary:</strong>
              <dl>
                <div>
                  <dt>Type</dt>
                  <dd>{sourceSummaryDetails.type}</dd>
                </div>
                <div>
                  <dt>Sections</dt>
                  <dd>{sourceSummaryDetails.sections}</dd>
                </div>
                <div>
                  <dt>Approx. words</dt>
                  <dd>{sourceSummaryDetails.words.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>From</dt>
                  <dd>{sourceSummaryDetails.from}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="source-strip" aria-label="Supported source types">
            {SOURCE_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                className={sourceChip.label === chip.label ? "active" : ""}
                onClick={() => onSourceChipChange?.(chip)}
              >
                {chip.label}
              </button>
            ))}
            {isWebpageUrl && <strong>Webpage detected</strong>}
            {effectiveYoutubeSource && <strong>YouTube detected</strong>}
          </div>

          <div className={input.trim() ? "source-helper active" : "source-helper"}>{sourceHelper}</div>
          <div className="source-state">
            <strong>Current source:</strong>{" "}
            {currentSourceVersion ? `v${currentSourceVersion.versionNumber} ${currentSourceVersion.label}` : sourceKind}
          </div>
          {viewedSourceVersion && viewedSourceVersion.id !== currentSourceVersionId && (
            <div className="source-action-status">
              Viewing v{viewedSourceVersion.versionNumber}. Click “Use as current source” in the timeline to make it active.
            </div>
          )}
          {sourceActionStatus && <div className="source-action-status">{sourceActionStatus}</div>}
          <div className="source-draft-actions">
            <button type="button" className="secondary" onClick={onSaveSource} disabled={!input.trim()}>
              Save Source
            </button>
            <button type="button" className="secondary" onClick={onListenToSource} disabled={!input.trim() || ttsLoading}>
              Listen to Source
            </button>
            <button type="button" className="copy-action source-clear" onClick={onClearSource} disabled={!input.trim()}>
              Clear source
            </button>
          </div>
          <div className="input-label">
            Engine source (confirmed text sent to Generate). Replace it from Extract or edit the confirmed text here.
          </div>

          <textarea value={input} onChange={(e) => onInputChange?.(e.target.value)} rows={16} placeholder={sourceChip.placeholder} />

          {effectiveYoutubeSource && !transcriptText && (
            <div className="transcript-box source-fetch">
              <div>
                <strong>YouTube / podcast URL</strong>
                <ol className="source-fetch-flow">
                  <li>Paste the YouTube or podcast page URL in your Source text above.</li>
                  <li>Fetch the transcript.</li>
                  <li>Review it in Transcript Workspace — select what to keep.</li>
                  <li>Replace or add checked sections into this Source.</li>
                  <li>Optional: use Listen to Source when your audio tools are open.</li>
                </ol>
                <p className="source-fetch-note">
                  Podcasts sometimes work like webpages: try the Webpage URL source type when the page exposes readable text or captions.
                </p>
              </div>
              <button type="button" className="secondary" onClick={onFetchTranscript} disabled={transcriptLoading}>
                {transcriptLoading ? "Fetching…" : "Fetch transcript"}
              </button>
              {transcriptStatus && <span className="status">{transcriptStatus}</span>}
            </div>
          )}

          {/* Full transcript sectioning (chapters, ranges, topic filter) lives in `TranscriptWorkspacePanel` in the center column — not duplicated here. */}

          <div className="source-footer">
            <span>{input.trim().length.toLocaleString()} characters captured</span>
          </div>
          <MaterialWorkspaceStyles />
        </section>
      </>
    );
  }

  return (
    <section
      className="material-workspace"
      data-stage="material"
      hidden={!active}
      aria-label="Source — capture inputs"
    >
      {children}
    </section>
  );
}

function MaterialWorkspaceStyles() {
  return (
    <style jsx>{`
      .layer {
        border: 1px solid #dfe5ec;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 14px 34px rgba(31, 45, 61, 0.07);
        padding: 20px;
      }
      .source-layer {
        min-height: 520px;
        background: linear-gradient(180deg, #ffffff, #fbfdfd);
      }
      .layer-head {
        margin-bottom: 14px;
      }
      .layer-head h2 {
        margin: 2px 0 5px;
        font-size: 18px;
        line-height: 1.25;
        color: #17202a;
      }
      .layer-head p:not(.eyebrow) {
        margin: 0;
        color: #617080;
        font-size: 13px;
        line-height: 1.45;
      }
      .eyebrow {
        margin: 0;
        color: #2f6f73;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .source-purpose {
        margin: -4px 0 14px;
        border: 1px solid #e3e9ef;
        border-radius: 8px;
        background: #f8fafc;
        color: #526171;
        padding: 10px 12px;
        font-size: 13px;
        line-height: 1.45;
      }
      .source-summary-card {
        display: grid;
        gap: 9px;
      }
      .source-summary-card strong {
        color: #174447;
      }
      .source-summary-card dl {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin: 0;
      }
      .source-summary-card div {
        border: 1px solid #e3e9ef;
        border-radius: 8px;
        background: #ffffff;
        padding: 8px;
      }
      .source-summary-card dt {
        color: #617080;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .source-summary-card dd {
        margin: 2px 0 0;
        color: #17202a;
        font-size: 13px;
        font-weight: 760;
      }
      .source-strip {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }
      .source-strip button,
      .source-strip strong {
        display: inline-flex;
        align-items: center;
        min-height: 26px;
        border: 1px solid #dfe5ec;
        border-radius: 999px;
        background: #f8fafc;
        color: #475569;
        padding: 0 10px;
        font-size: 12px;
        font-weight: 750;
        font-family: inherit;
        cursor: pointer;
      }
      .source-strip button.active {
        border-color: #2f6f73;
        background: #e7f5f3;
        color: #174447;
        box-shadow: 0 0 0 3px rgba(47, 111, 115, 0.1);
      }
      .source-strip strong {
        border-color: #94c9c7;
        background: #eaf7f6;
        color: #174447;
        cursor: default;
      }
      .source-helper {
        margin-bottom: 12px;
        border: 1px solid #e3e9ef;
        border-radius: 8px;
        background: #f8fafc;
        color: #647384;
        padding: 10px 12px;
        font-size: 13px;
        line-height: 1.45;
      }
      .source-helper.active {
        border-color: #cfe3e1;
        background: #f1f8f7;
        color: #285b5d;
      }
      .source-state {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-bottom: 10px;
        border: 1px solid #cfe3e1;
        border-radius: 999px;
        background: #ffffff;
        color: #285b5d;
        padding: 7px 11px;
        font-size: 12px;
        font-weight: 700;
      }
      .source-state strong {
        color: #174447;
      }
      .source-action-status,
      .range-status {
        margin: 0 0 10px;
        border: 1px solid #cfe3e1;
        border-radius: 8px;
        background: #f1f8f7;
        color: #285b5d;
        padding: 9px 10px;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.4;
      }
      .input-label {
        margin: 0 0 7px;
        color: #344252;
        font-size: 12px;
        font-weight: 800;
      }
      .source-draft-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
      }
      textarea,
      input,
      select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #cfd8e3;
        border-radius: 8px;
        background: #fbfcfe;
        color: #17202a;
        font: inherit;
        outline: none;
        transition: border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
      }
      textarea {
        min-height: 360px;
        resize: vertical;
        padding: 14px;
        font: 14px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .instruction {
        min-height: 92px;
        font-family: inherit;
      }
      .source-layer > textarea {
        border-color: #c9d8e5;
        background: #ffffff;
        box-shadow: inset 0 1px 0 rgba(15, 23, 32, 0.03);
      }
      textarea:focus,
      input:focus,
      select:focus {
        border-color: #2f6f73;
        background: #fff;
        box-shadow: 0 0 0 3px rgba(47, 111, 115, 0.14);
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .field span {
        color: #344252;
        font-size: 12px;
        font-weight: 750;
      }
      .secondary,
      .copy-action {
        border: 1px solid #cfd8e3;
        border-radius: 8px;
        background: #f8fafc;
        color: #22303f;
        font: inherit;
        cursor: pointer;
      }
      .secondary {
        padding: 8px 12px;
        font-weight: 750;
        white-space: nowrap;
      }
      .copy-action {
        padding: 8px 12px;
        border-color: #d7e3ee;
        background: #ffffff;
        color: #526171;
        font-weight: 750;
        white-space: nowrap;
      }
      .source-clear {
        margin-bottom: 10px;
      }
      .source-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        margin-top: 12px;
        color: #617080;
        font-size: 13px;
      }
    `}</style>
  );
}
