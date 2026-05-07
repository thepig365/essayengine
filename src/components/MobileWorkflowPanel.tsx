"use client";

import type {
  MobileWorkflowPolishVersion,
  MobileWorkflowRepurposeOutput,
  MobileWorkflowStructure,
  MobileWorkflowLinkCapture,
  MobileWorkflowVoiceCapture,
} from "@/lib/projectStorage";
import type { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { POLISH_DIRECTIONS, REPURPOSE_FORMATS } from "@/hooks/useMobileWorkflow";
import type { MobileWorkflowPanelMode } from "@/essay-engine/mobileWorkflowSteps";

type Props = {
  captureIdea: string;
  voiceCapture: MobileWorkflowVoiceCapture | null;
  voiceRecorder: ReturnType<typeof useVoiceCapture>;
  linkCaptureUrl: string;
  linkCapture: MobileWorkflowLinkCapture | null;
  coreValue: string;
  structures: MobileWorkflowStructure[];
  selectedStructureId: string | null;
  draftContent: string;
  markedParagraphs: number[];
  revisionInstruction: string;
  diagnosis: string[];
  selectedPolishDirections: string[];
  polishVersions: MobileWorkflowPolishVersion[];
  selectedRepurposeFormats: string[];
  repurposeOutputs: MobileWorkflowRepurposeOutput[];
  busy: boolean;
  status: string | null;
  onCaptureChange: (value: string) => void;
  onLinkCaptureUrlChange: (value: string) => void;
  onAnalyzeLinkCapture: () => void;
  onSaveLinkCapture: () => void;
  onCopyLinkCapture: () => void;
  onExtractValue: () => void;
  onUseCaptureAsSource: () => void;
  onSaveVoiceCapture: () => void;
  onDiscardVoiceCapture: () => void;
  onCopyVoiceTranscript: () => void;
  onCreateStructures: () => void;
  onSelectStructure: (id: string) => void;
  onCopySelectedStructureOutline: () => void;
  onGenerateDraft: () => void;
  onEnterListenMode: () => void;
  onToggleParagraphMark: (index: number) => void;
  onRevisionInstructionChange: (value: string) => void;
  onRequestRevision: () => void;
  onDiagnose: () => void;
  onCopyDiagnosis: () => void;
  onTogglePolishDirection: (direction: string) => void;
  onCreatePolishVersions: () => void;
  onUsePolishVersion: (version: MobileWorkflowPolishVersion) => void;
  onCopyPolishVersion: (version: MobileWorkflowPolishVersion) => void;
  onToggleRepurposeFormat: (format: string) => void;
  onRepurpose: () => void;
  onCopyRepurposeOutput: (output: MobileWorkflowRepurposeOutput) => void;
  mode?: MobileWorkflowPanelMode;
  /** Compact active source summary for desktop support rail */
  supportRailSourceSummary?: {
    type: string;
    sections: number;
    words: number;
    from: string;
  } | null;
  /** Shorten primary button labels for narrow screens */
  compactLabels?: boolean;
};

function paragraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
}

export function MobileWorkflowPanel({
  captureIdea,
  voiceCapture,
  voiceRecorder,
  linkCaptureUrl,
  linkCapture,
  coreValue,
  structures,
  selectedStructureId,
  draftContent,
  markedParagraphs,
  revisionInstruction,
  diagnosis,
  selectedPolishDirections,
  polishVersions,
  selectedRepurposeFormats,
  repurposeOutputs,
  busy,
  status,
  onCaptureChange,
  onLinkCaptureUrlChange,
  onAnalyzeLinkCapture,
  onSaveLinkCapture,
  onCopyLinkCapture,
  onExtractValue,
  onUseCaptureAsSource,
  onSaveVoiceCapture,
  onDiscardVoiceCapture,
  onCopyVoiceTranscript,
  onCreateStructures,
  onSelectStructure,
  onCopySelectedStructureOutline,
  onGenerateDraft,
  onEnterListenMode,
  onToggleParagraphMark,
  onRevisionInstructionChange,
  onRequestRevision,
  onDiagnose,
  onCopyDiagnosis,
  onTogglePolishDirection,
  onCreatePolishVersions,
  onUsePolishVersion,
  onCopyPolishVersion,
  onToggleRepurposeFormat,
  onRepurpose,
  onCopyRepurposeOutput,
  mode = "slice-off",
  supportRailSourceSummary = null,
  compactLabels = false,
}: Props) {
  if (mode === "slice-off") {
    return null;
  }

  const draftParagraphs = paragraphs(draftContent);
  const selectedStructure = structures.find((structure) => structure.id === selectedStructureId) ?? null;
  const hasDraft = draftContent.trim().length > 0;
  const canReviseMarkedDraft = hasDraft && markedParagraphs.length > 0 && revisionInstruction.trim().length > 0 && !busy;

  if (mode === "support-rail") {
    return (
      <section className="mobile-workflow-panel ee-support-rail" aria-label="Workspace aids and capture tools">
        <div className="panel-head compact">
          <p className="eyebrow">Context</p>
          <h2>Source &amp; capture</h2>
          <p className="helper">Optional quick capture and link notes. Main work for each step stays in the center column.</p>
        </div>
        {supportRailSourceSummary ? (
          <div className="support-source-summary">
            <strong>Active source</strong>
            <dl>
              <div>
                <dt>Type</dt>
                <dd>{supportRailSourceSummary.type}</dd>
              </div>
              <div>
                <dt>Sections</dt>
                <dd>{supportRailSourceSummary.sections}</dd>
              </div>
              <div>
                <dt>Words</dt>
                <dd>{supportRailSourceSummary.words.toLocaleString()}</dd>
              </div>
              <div>
                <dt>From</dt>
                <dd>{supportRailSourceSummary.from}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <details className="ee-support-details" open>
          <summary>Quick notes &amp; capture inbox</summary>
          <div className="workflow-grid single-col">
            <article className="workflow-step">
              <textarea
                value={captureIdea}
                onChange={(event) => onCaptureChange(event.target.value)}
                rows={5}
                placeholder="Quick notes, snippets, or raw capture text (optional)."
              />
              <div className="button-row">
                <button type="button" onClick={onExtractValue} disabled={!captureIdea.trim()}>
                  Extract core value
                </button>
                <button type="button" onClick={onUseCaptureAsSource} disabled={!captureIdea.trim()}>
                  Use as Source
                </button>
              </div>
              {coreValue ? <div className="value-box">{coreValue}</div> : null}
            </article>
          </div>
        </details>

        <details className="ee-support-details">
          <summary>Link capture &amp; voice note</summary>
          <div className="workflow-grid single-col">
            <article className="workflow-step">
              <div className="link-capture-box">
                <div>
                  <strong>Link capture</strong>
                  <p>Paste a URL to analyze and save as material.</p>
                </div>
                <label>
                  Link URL
                  <input
                    value={linkCaptureUrl}
                    onChange={(event) => onLinkCaptureUrlChange(event.target.value)}
                    placeholder="https://example.com/article"
                    inputMode="url"
                  />
                </label>
                <div className="button-row">
                  <button type="button" onClick={onAnalyzeLinkCapture} disabled={!linkCaptureUrl.trim() || busy}>
                    {busy ? "Analyzing link..." : "Analyze link"}
                  </button>
                  <button type="button" onClick={onSaveLinkCapture} disabled={!linkCapture}>
                    Save as capture
                  </button>
                  <button type="button" onClick={onCopyLinkCapture} disabled={!linkCapture}>
                    Copy link material
                  </button>
                </div>
                {linkCapture ? (
                  <div className="link-material">
                    <small>Use this as essay material</small>
                    <strong>{linkCapture.sourceTitle}</strong>
                    <p>{linkCapture.coreIdea || linkCapture.sourceExcerpt}</p>
                  </div>
                ) : null}
              </div>
              <div className="voice-capture-box">
                <div>
                  <strong>Voice note</strong>
                  <p>Record, transcribe, then save as capture text.</p>
                </div>
                <div className="button-row">
                  <button type="button" onClick={voiceRecorder.startVoiceRecording} disabled={voiceRecorder.isRecording || busy}>
                    Record voice note
                  </button>
                  <button type="button" onClick={voiceRecorder.stopVoiceRecording} disabled={!voiceRecorder.isRecording}>
                    Stop recording
                  </button>
                </div>
                <div className="voice-status">
                  <span>{voiceRecorder.isRecording ? "Recording..." : voiceRecorder.recordingStatus}</span>
                  <span>{voiceRecorder.recordingDurationSeconds}s</span>
                </div>
                {voiceRecorder.recordingError ? <p className="voice-error">{voiceRecorder.recordingError}</p> : null}
                {voiceRecorder.recordedAudioUrl ? (
                  <div className="voice-preview">
                    <audio controls src={voiceRecorder.recordedAudioUrl} />
                    <button type="button" onClick={voiceRecorder.transcribeRecording} disabled={voiceRecorder.isTranscribing}>
                      {voiceRecorder.isTranscribing ? "Transcribing..." : "Transcribe voice note"}
                    </button>
                    {(voiceRecorder.transcriptionText || voiceRecorder.isTranscribing) && (
                      <label>
                        Voice transcript
                        <textarea
                          value={voiceRecorder.transcriptionText}
                          onChange={(event) => voiceRecorder.setTranscriptionText(event.target.value)}
                          rows={4}
                        />
                      </label>
                    )}
                    <div className="button-row">
                      <button type="button" onClick={onSaveVoiceCapture}>
                        Save transcript as capture
                      </button>
                      <button type="button" onClick={onCopyVoiceTranscript} disabled={!voiceRecorder.transcriptionText.trim()}>
                        Copy transcript
                      </button>
                      <button type="button" onClick={onDiscardVoiceCapture}>
                        Discard
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          </div>
        </details>

        {status ? <div className="workflow-status">{status}</div> : null}

        <style jsx>{`
          .ee-support-rail .support-source-summary {
            display: grid;
            gap: 8px;
            border: 1px solid #e3e9ef;
            border-radius: 12px;
            background: #fbfcfe;
            padding: 12px;
            margin-bottom: 10px;
          }
          .ee-support-rail .support-source-summary strong {
            color: #174447;
            font-size: 14px;
          }
          .ee-support-rail .support-source-summary dl {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin: 0;
          }
          .ee-support-rail .support-source-summary div {
            border: 1px solid #e3e9ef;
            border-radius: 8px;
            background: #ffffff;
            padding: 8px;
          }
          .ee-support-rail .support-source-summary dt {
            color: #617080;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .ee-support-rail .support-source-summary dd {
            margin: 2px 0 0;
            color: #17202a;
            font-size: 13px;
            font-weight: 650;
          }
          .ee-support-details {
            border: 1px solid #e3e9ef;
            border-radius: 12px;
            background: #ffffff;
            margin-bottom: 10px;
            overflow: hidden;
          }
          .ee-support-details summary {
            cursor: pointer;
            padding: 12px 14px;
            font-weight: 850;
            color: #174447;
            background: #f8fcfb;
            list-style: none;
          }
          .ee-support-details summary::-webkit-details-marker {
            display: none;
          }
          .ee-support-details .workflow-grid {
            padding: 0 12px 12px;
          }
          .workflow-grid.single-col {
            grid-template-columns: minmax(0, 1fr);
          }
        `}</style>
      </section>
    );
  }

  const showFull = mode === "full";
  const showSource = showFull || mode === "slice-source";
  const showStructureBuilder =
    showFull ||
    mode === "slice-structure" ||
    mode === "slice-structure-builder" ||
    mode === "slice-workpiece";
  const showDraftFromStructure =
    showFull ||
    mode === "slice-structure" ||
    mode === "slice-draft-generate" ||
    mode === "slice-workpiece";
  const showMark = showFull || mode === "slice-mark" || mode === "slice-refine";
  const showRevise = showFull || mode === "slice-revise" || mode === "slice-refine";
  const showDiagnose = showFull || mode === "slice-diagnose" || mode === "slice-refine";
  const showPolish = showFull || mode === "slice-polish";

  return (
    <section className={mode === "full" ? "mobile-workflow-panel" : "mobile-workflow-panel mode-sliced"}>
      <div className="workflow-grid">
        {showSource ? (
        <>
        <article className="workflow-step">
          <span>Capture</span>
          <h3>Capture inbox</h3>
          <textarea
            value={captureIdea}
            onChange={(event) => onCaptureChange(event.target.value)}
            rows={6}
            placeholder="Capture the raw idea, voice note transcript, article seed, or messy thought here."
          />
          <div className="button-row">
            <button type="button" onClick={onExtractValue} disabled={!captureIdea.trim()}>
              Extract core value
            </button>
            <button type="button" onClick={onUseCaptureAsSource} disabled={!captureIdea.trim()}>
              Use as Source
            </button>
          </div>
          <div className="link-capture-box">
            <div>
              <strong>Link capture</strong>
              <p>Paste an article, newsletter, post, podcast page, or YouTube link. Browser share-sheet support is not included yet.</p>
            </div>
            <label>
              Link URL
              <input
                value={linkCaptureUrl}
                onChange={(event) => onLinkCaptureUrlChange(event.target.value)}
                placeholder="https://example.com/article"
                inputMode="url"
              />
            </label>
            <div className="button-row">
              <button type="button" onClick={onAnalyzeLinkCapture} disabled={!linkCaptureUrl.trim() || busy}>
                {busy ? "Analyzing link..." : "Analyze link"}
              </button>
              <button type="button" onClick={onSaveLinkCapture} disabled={!linkCapture}>
                Save as capture
              </button>
              <button type="button" onClick={onCopyLinkCapture} disabled={!linkCapture}>
                Copy link material
              </button>
            </div>
            {linkCapture && (
              <div className="link-material">
                <small>Use this as essay material</small>
                <strong>{linkCapture.sourceTitle}</strong>
                <p>{linkCapture.coreIdea || linkCapture.sourceExcerpt}</p>
                {linkCapture.usefulClaims.length > 0 && (
                  <div>
                    <b>This source supports...</b>
                    <ul>
                      {linkCapture.usefulClaims.slice(0, 4).map((claim) => (
                        <li key={claim}>{claim}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {linkCapture.possibleEssayAngles.length > 0 && (
                  <div>
                    <b>Possible essay angles</b>
                    <ul>
                      {linkCapture.possibleEssayAngles.slice(0, 3).map((angle) => (
                        <li key={angle}>{angle}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {linkCapture.possibleUses.length > 0 && (
                  <div>
                    <b>Possible uses</b>
                    <ul>
                      {linkCapture.possibleUses.slice(0, 4).map((item) => (
                        <li key={`${item.use}-${item.explanation}`}>
                          {item.use}: {item.explanation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {linkCapture.cautions.length > 0 && (
                  <div>
                    <b>This may be weak material if...</b>
                    <ul>
                      {linkCapture.cautions.slice(0, 3).map((caution) => (
                        <li key={caution}>{caution}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="voice-capture-box">
            <div>
              <strong>Voice note</strong>
              <p>Record a voice note, transcribe it, then save the transcript as capture text.</p>
            </div>
            <div className="button-row">
              <button type="button" onClick={voiceRecorder.startVoiceRecording} disabled={voiceRecorder.isRecording || busy}>
                Record voice note
              </button>
              <button type="button" onClick={voiceRecorder.stopVoiceRecording} disabled={!voiceRecorder.isRecording}>
                Stop recording
              </button>
            </div>
            <div className="voice-status">
              <span>{voiceRecorder.isRecording ? "Recording..." : voiceRecorder.recordingStatus}</span>
              <span>{voiceRecorder.recordingDurationSeconds}s</span>
            </div>
            {voiceRecorder.recordingError && <p className="voice-error">{voiceRecorder.recordingError}</p>}
            {voiceRecorder.recordedAudioUrl && (
              <div className="voice-preview">
                <span>Preview voice note</span>
                <audio controls src={voiceRecorder.recordedAudioUrl} />
                <p>Audio preview is temporary. Transcript will be saved as capture text.</p>
                <button type="button" onClick={voiceRecorder.transcribeRecording} disabled={voiceRecorder.isTranscribing}>
                  {voiceRecorder.isTranscribing ? "Transcribing..." : "Transcribe voice note"}
                </button>
                <div className="voice-status">
                  <span>{voiceRecorder.transcriptionStatus}</span>
                </div>
                {voiceRecorder.transcriptionError && <p className="voice-error">{voiceRecorder.transcriptionError}</p>}
                {(voiceRecorder.transcriptionText || voiceRecorder.isTranscribing) && (
                  <label>
                    Voice transcript
                    <textarea
                      value={voiceRecorder.transcriptionText}
                      onChange={(event) => voiceRecorder.setTranscriptionText(event.target.value)}
                      rows={5}
                      placeholder="Review or edit the transcript before saving it as capture text."
                    />
                  </label>
                )}
                <div className="button-row">
                  <button type="button" onClick={onSaveVoiceCapture}>
                    {voiceRecorder.transcriptionText.trim() ? "Save transcript as capture" : "Save voice capture"}
                  </button>
                  <button type="button" onClick={onCopyVoiceTranscript} disabled={!voiceRecorder.transcriptionText.trim()}>
                    Copy transcript
                  </button>
                  <button type="button" onClick={onDiscardVoiceCapture}>
                    Discard
                  </button>
                </div>
              </div>
            )}
            {voiceCapture && (
              <p className="helper">
                Saved voice capture (type: voice): {voiceCapture.durationSeconds ?? 0}s • {voiceCapture.transcribed ? "transcribed" : "transcription pending"} • temporary preview is not persisted across reload.
              </p>
            )}
          </div>
          {coreValue && <div className="value-box">{coreValue}</div>}
        </article>

        </>
        ) : null}

        {showStructureBuilder ? (
        <article className="workflow-step">
          <h3>Structure Builder</h3>
          <button type="button" onClick={onCreateStructures} disabled={busy || (!captureIdea.trim() && !coreValue.trim())}>
            {busy ? "Creating structures..." : compactLabels ? "Create structures" : "Create 3 AI structures"}
          </button>
          <div className="structure-list">
            {structures.map((structure) => (
              <button
                type="button"
                className={structure.id === selectedStructureId ? "structure selected" : "structure"}
                key={structure.id}
                onClick={() => onSelectStructure(structure.id)}
              >
                <strong>{structure.title}</strong>
                <small>{structure.angle}</small>
                <ol>
                  {structure.outline.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </button>
            ))}
          </div>
          <button type="button" onClick={onCopySelectedStructureOutline} disabled={!selectedStructure}>
            Copy selected outline
          </button>
        </article>
        ) : null}

        {showDraftFromStructure ? (
        <article className="workflow-step">
          <span>AI Output</span>
          <h3>Generate structured draft</h3>
          <p className="helper">
            {selectedStructure
              ? `Selected: ${selectedStructure.title}. Generating will replace Essay Draft; the previous draft is preserved as a source version.`
              : "Choose a structure before generating a structured draft."}
          </p>
          <button type="button" onClick={onGenerateDraft} disabled={busy || !selectedStructureId || (!captureIdea.trim() && !coreValue.trim())}>
            {busy ? "Generating..." : compactLabels ? "Generate draft" : "Generate draft and replace Essay Draft"}
          </button>
        </article>
        ) : null}

        {showMark ? (
        <article className="workflow-step wide">
          <span>5. Listen and Mark</span>
          <h3>Mark Paragraphs</h3>
          <button type="button" onClick={onEnterListenMode} disabled={!draftContent.trim() || busy}>
            {compactLabels ? "Start marking" : "Enter Listen and Mark mode"}
          </button>
          {draftParagraphs.length > 0 ? (
            <div className="paragraph-list">
              {draftParagraphs.map((paragraph, index) => (
                <button
                  type="button"
                  key={`${index}-${paragraph.slice(0, 24)}`}
                  className={markedParagraphs.includes(index) ? "paragraph marked" : "paragraph"}
                  onClick={() => onToggleParagraphMark(index)}
                >
                  <strong>Paragraph {index + 1}</strong>
                  <span>{paragraph}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="helper">No draft yet. Generate or paste a draft first.</p>
          )}
        </article>
        ) : null}

        {showRevise ? (
        <article className="workflow-step">
          <span>6. Voice/Text Revise</span>
          <h3>Revision Request</h3>
          <textarea
            value={revisionInstruction}
            onChange={(event) => onRevisionInstructionChange(event.target.value)}
            rows={4}
            placeholder="Revision note: make marked paragraphs warmer, clearer, more concrete, or more direct."
          />
          <p className="helper">
            Mark at least one paragraph and add an instruction before revising. The current draft is preserved as a source version.
          </p>
          <button type="button" onClick={onRequestRevision} disabled={!canReviseMarkedDraft}>
            {busy ? "Revising..." : "Revise marked paragraphs"}
          </button>
        </article>
        ) : null}

        {showDiagnose ? (
        <article className="workflow-step">
          <span>7. Diagnose</span>
          <h3>Draft Quality</h3>
          <button type="button" onClick={onDiagnose} disabled={!draftContent.trim() || busy}>
            Diagnose draft
          </button>
          {diagnosis.length > 0 && (
            <>
              <ul className="diagnosis">
                {diagnosis.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button type="button" onClick={onCopyDiagnosis}>
                Copy diagnosis
              </button>
            </>
          )}
        </article>
        ) : null}

        {showPolish ? (
        <>
        <article className="workflow-step">
          <span>8. Polish</span>
          <h3>Polish Versions</h3>
          <div className="choice-list" aria-label="Polish directions">
            {POLISH_DIRECTIONS.map((direction) => (
              <label key={direction} className="choice">
                <input
                  type="checkbox"
                  checked={selectedPolishDirections.includes(direction)}
                  onChange={() => onTogglePolishDirection(direction)}
                />
                {direction}
              </label>
            ))}
          </div>
          <button type="button" onClick={onCreatePolishVersions} disabled={!draftContent.trim() || busy}>
            {busy ? "Creating polish versions..." : "Create polish versions"}
          </button>
          <div className="version-list">
            {polishVersions.map((version) => (
              <div className="mini-card" key={version.id}>
                <strong>{version.label}</strong>
                <p>{version.content}</p>
                {version.notes && version.notes.length > 0 && (
                  <ul className="notes-list">
                    {version.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                )}
                <div className="button-row">
                  <button type="button" onClick={() => onUsePolishVersion(version)}>
                    {compactLabels ? "Use draft" : "Use as Essay Draft"}
                  </button>
                  <button type="button" onClick={() => onCopyPolishVersion(version)}>
                    Copy polish version
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="workflow-step">
          <span>9. Repurpose</span>
          <h3>Repurpose Outputs</h3>
          <div className="choice-list" aria-label="Repurpose formats">
            {REPURPOSE_FORMATS.map((format) => (
              <label key={format} className="choice">
                <input
                  type="checkbox"
                  checked={selectedRepurposeFormats.includes(format)}
                  onChange={() => onToggleRepurposeFormat(format)}
                />
                {format}
              </label>
            ))}
          </div>
          <button type="button" onClick={onRepurpose} disabled={!draftContent.trim() || busy}>
            {busy ? "Creating formats..." : "Create selected formats"}
          </button>
          <div className="version-list">
            {repurposeOutputs.map((output) => (
              <div className="mini-card" key={output.id}>
                <strong>{output.format}</strong>
                {output.title && <small>{output.title}</small>}
                <p>{output.content}</p>
                {output.notes && output.notes.length > 0 && (
                  <ul className="notes-list">
                    {output.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={() => onCopyRepurposeOutput(output)}>
                  Copy
                </button>
              </div>
            ))}
          </div>
        </article>
        </>
        ) : null}

      </div>

      {status && <div className="workflow-status">{status}</div>}

      <style jsx>{`
        .mobile-workflow-panel {
          border: 1px solid #dfe5ec;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 14px 34px rgba(31, 45, 61, 0.07);
          padding: 18px;
        }
        .workflow-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          min-width: 0;
          max-width: 100%;
        }
        .panel-head {
          margin-bottom: 14px;
        }
        .eyebrow {
          margin: 0;
          color: #2f6f73;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        h2,
        h3,
        p {
          margin: 0;
        }
        h2 {
          color: #17202a;
          font-size: 20px;
        }
        h3 {
          color: #17202a;
          font-size: 16px;
        }
        .panel-head p,
        .helper {
          color: #617080;
          font-size: 13px;
          line-height: 1.45;
        }
        .mobile-workflow-panel.mode-sliced .workflow-grid {
          grid-template-columns: minmax(0, 1fr);
        }
        .panel-head.compact {
          margin-bottom: 8px;
        }
        .workflow-step {
          display: grid;
          gap: 10px;
          border: 1px solid #e3e9ef;
          border-radius: 12px;
          background: #fbfcfe;
          padding: 14px;
        }
        .workflow-step.wide {
          grid-column: 1 / -1;
        }
        .workflow-step > span {
          color: #2f6f73;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }
        label {
          display: grid;
          gap: 5px;
          color: #344252;
          font-size: 12px;
          font-weight: 850;
        }
        .choice-list {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .choice {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #d7e3ee;
          border-radius: 999px;
          background: #ffffff;
          padding: 7px 9px;
          color: #344252;
          font-size: 12px;
          font-weight: 850;
        }
        .choice input {
          width: 14px;
          height: 14px;
          padding: 0;
          accent-color: #1d5f63;
        }
        input,
        textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cfd8e3;
          border-radius: 10px;
          background: #ffffff;
          color: #17202a;
          font: inherit;
          padding: 10px;
        }
        textarea {
          resize: vertical;
          line-height: 1.55;
        }
        button {
          border: 1px solid #cfd8e3;
          border-radius: 10px;
          background: #ffffff;
          color: #22303f;
          padding: 10px 12px;
          font: inherit;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
          text-align: left;
        }
        button:hover:not(:disabled) {
          border-color: #2f6f73;
          background: #f1f8f7;
        }
        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .button-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .button-row button:first-child,
        .workflow-step > button:first-of-type {
          border-color: #1d5f63;
          background: #1d5f63;
          color: #ffffff;
        }
        .value-box,
        .workflow-status,
        .link-capture-box,
        .voice-capture-box {
          border: 1px solid #cfe3e1;
          border-radius: 10px;
          background: #f1f8f7;
          color: #285b5d;
          padding: 10px;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.45;
        }
        .workflow-status {
          margin-top: 12px;
        }
        .voice-capture-box {
          display: grid;
          gap: 10px;
          background: #fbfefe;
        }
        .link-capture-box {
          display: grid;
          gap: 10px;
          background: #fbfefe;
        }
        .link-capture-box p {
          margin: 2px 0 0;
          color: #526171;
          font-size: 12px;
          line-height: 1.45;
        }
        .link-material {
          display: grid;
          gap: 8px;
          border: 1px solid #d7e3ee;
          border-radius: 10px;
          background: #ffffff;
          padding: 10px;
          color: #344252;
          font-size: 12px;
          line-height: 1.45;
        }
        .link-material small {
          color: #2f6f73;
          font-weight: 900;
          text-transform: uppercase;
        }
        .link-material ul {
          margin: 5px 0 0;
          padding-left: 18px;
        }
        .voice-capture-box p {
          margin: 2px 0 0;
          color: #526171;
          font-size: 12px;
          line-height: 1.45;
        }
        .voice-status {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          color: #285b5d;
          font-size: 12px;
          font-weight: 850;
        }
        .voice-error {
          border: 1px solid #fecdd3;
          border-radius: 8px;
          background: #fff1f2;
          color: #a11d2a;
          padding: 8px;
        }
        .voice-preview {
          display: grid;
          gap: 8px;
        }
        .voice-preview audio {
          width: 100%;
        }
        .structure-list,
        .version-list,
        .paragraph-list {
          display: grid;
          gap: 8px;
        }
        .structure {
          display: grid;
          gap: 5px;
        }
        .structure.selected,
        .paragraph.marked {
          border-color: #1d5f63;
          background: #e8f7f6;
          box-shadow: 0 0 0 3px rgba(29, 95, 99, 0.12);
        }
        .structure small,
        .paragraph span,
        .mini-card p {
          color: #526171;
          font-size: 13px;
          line-height: 1.5;
        }
        .structure ol {
          margin: 4px 0 0;
          padding-left: 18px;
          color: #526171;
          font-size: 12px;
          line-height: 1.45;
        }
        .paragraph {
          display: grid;
          gap: 5px;
        }
        .diagnosis {
          margin: 0;
          padding-left: 18px;
          color: #526171;
          font-size: 13px;
          line-height: 1.5;
        }
        .notes-list {
          margin: 0;
          padding-left: 18px;
          color: #526171;
          font-size: 12px;
          line-height: 1.45;
        }
        .mini-card {
          display: grid;
          gap: 8px;
          border: 1px solid #e3e9ef;
          border-radius: 10px;
          background: #ffffff;
          padding: 10px;
        }
        .mini-card small {
          color: #526171;
          font-size: 12px;
          line-height: 1.4;
        }
        .mini-card p {
          white-space: pre-wrap;
          max-height: 220px;
          overflow: auto;
          overflow-wrap: anywhere;
        }
        @media (max-width: 760px) {
          .mobile-workflow-panel {
            border-radius: 22px;
            padding: 14px;
          }
          .panel-head {
            margin-bottom: 16px;
          }
          .panel-head p {
            font-size: 16px;
            line-height: 1.55;
          }
          h2 {
            font-size: 24px;
            line-height: 1.15;
          }
          h3 {
            font-size: 21px;
            line-height: 1.2;
          }
          .workflow-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .workflow-step {
            gap: 14px;
            border-radius: 22px;
            padding: 18px 14px;
          }
          .workflow-step > span {
            font-size: 14px;
            letter-spacing: 0.035em;
          }
          .button-row {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .choice-list {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .choice {
            min-height: 56px;
            border-color: transparent;
            border-radius: 16px;
            padding: 14px;
            font-size: 17px;
            line-height: 1.3;
          }
          input,
          textarea {
            font-size: 16px;
            line-height: 1.6;
            padding: 14px;
          }
          label {
            gap: 8px;
            font-size: 16px;
          }
          .helper,
          .link-capture-box p,
          .voice-capture-box p,
          .voice-status {
            font-size: 15.5px;
            line-height: 1.55;
          }
          .link-capture-box,
          .voice-capture-box {
            border: 0;
            border-radius: 20px;
            padding: 14px;
            background: rgba(27, 41, 53, 0.72);
          }
          .link-material,
          .mini-card {
            border-color: transparent;
            border-radius: 20px;
            padding: 14px;
          }
          .structure-list,
          .version-list,
          .paragraph-list {
            gap: 12px;
          }
          .structure,
          .paragraph {
            border-color: transparent;
            border-radius: 18px;
            padding: 16px;
          }
          .structure ol,
          .diagnosis,
          .notes-list {
            font-size: 16px;
            line-height: 1.6;
          }
          .diagnosis,
          .notes-list {
            max-height: 220px;
            overflow: auto;
            padding-right: 4px;
          }
          .mini-card p {
            max-height: 320px;
            font-size: 17px;
            line-height: 1.65;
          }
          .mini-card small {
            font-size: 15px;
            line-height: 1.45;
          }
          button {
            text-align: center;
            min-height: 54px;
            width: 100%;
            border-radius: 16px;
            font-size: 17px;
            line-height: 1.25;
          }
        }
        @media (max-width: 420px) {
          .mobile-workflow-panel {
            padding: 12px;
          }
          .workflow-step {
            padding: 16px 12px;
          }
          .mini-card p {
            max-height: 380px;
          }
        }
      `}</style>
    </section>
  );
}
