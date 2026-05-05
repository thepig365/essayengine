"use client";

type Props = {
  title: string;
  content: string;
  updatedAt: string | null;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSaveDraft: () => void;
  onClearDraft: () => void;
  onCopyDraft: () => void;
  onUseDraftAsSource: () => void;
  onMarkDraftFinal: () => void;
  onReadDraft: () => void;
  onDownloadDraftParts: () => void;
  onDownloadDraftMerged: () => void;
  onDownloadDraftTxt: () => void;
  audioBusy: boolean;
  status: string | null;
};

function countWords(text: string): number {
  return text.trim().match(/[\p{L}\p{N}'-]+/gu)?.length ?? 0;
}

export function EssayDraftWorkspace({
  title,
  content,
  updatedAt,
  onTitleChange,
  onContentChange,
  onSaveDraft,
  onClearDraft,
  onCopyDraft,
  onUseDraftAsSource,
  onMarkDraftFinal,
  onReadDraft,
  onDownloadDraftParts,
  onDownloadDraftMerged,
  onDownloadDraftTxt,
  audioBusy,
  status,
}: Props) {
  const hasContent = content.trim().length > 0;

  return (
    <section className="essay-draft-workspace">
      <div className="layer-head">
        <p className="eyebrow">Human Assembly</p>
        <h2>Essay Draft Workspace</h2>
        <p>Assemble selected outputs, your own writing, and refined paragraphs into one essay.</p>
      </div>

      <div className="draft-helper">
        The draft is your human assembly space. It is not sent to the engine unless you click Use draft as source.
      </div>

      <label className="field">
        <span>Draft title</span>
        <input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Essay draft title" />
      </label>

      <label className="field">
        <span>Draft editor</span>
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          rows={18}
          placeholder="Paste useful result paragraphs here, then edit and assemble your final essay."
        />
      </label>

      <div className="draft-metrics">
        <span>{countWords(content).toLocaleString()} words</span>
        <span>{content.length.toLocaleString()} characters</span>
        <span>{updatedAt ? `Saved ${new Date(updatedAt).toLocaleString()}` : "Not saved yet"}</span>
      </div>

      <div className="draft-actions">
        <button type="button" onClick={onSaveDraft}>
          Save draft
        </button>
        <button type="button" onClick={onClearDraft} disabled={!hasContent}>
          Clear draft
        </button>
        <button type="button" onClick={onCopyDraft} disabled={!hasContent}>
          Copy draft
        </button>
        <button type="button" className="primary" onClick={onUseDraftAsSource} disabled={!hasContent}>
          Use draft as source
        </button>
        <button type="button" onClick={onMarkDraftFinal} disabled={!hasContent}>
          Mark draft as final
        </button>
        <button type="button" onClick={onReadDraft} disabled={!hasContent || audioBusy}>
          Read draft aloud
        </button>
        <button type="button" onClick={onDownloadDraftParts} disabled={!hasContent || audioBusy}>
          Download draft audio parts
        </button>
        <button type="button" onClick={onDownloadDraftMerged} disabled={!hasContent || audioBusy}>
          Download draft as one MP3
        </button>
        <button type="button" onClick={onDownloadDraftTxt} disabled={!hasContent}>
          Export draft as .txt
        </button>
      </div>

      {status && <div className="draft-status">{status}</div>}

      <style jsx>{`
        .essay-draft-workspace {
          border: 1px solid #dfe5ec;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 14px 34px rgba(31, 45, 61, 0.07);
          padding: 20px;
        }
        .layer-head {
          margin-bottom: 14px;
        }
        .eyebrow {
          margin: 0;
          color: #2f6f73;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        h2 {
          margin: 2px 0 5px;
          color: #17202a;
          font-size: 18px;
          line-height: 1.25;
        }
        .layer-head p:not(.eyebrow) {
          margin: 0;
          color: #617080;
          font-size: 13px;
          line-height: 1.45;
        }
        .draft-helper {
          margin-bottom: 14px;
          border: 1px solid #ead7a7;
          border-radius: 10px;
          background: #fff9e8;
          color: #6b520f;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }
        .field span {
          color: #344252;
          font-size: 12px;
          font-weight: 800;
        }
        input,
        textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cfd8e3;
          border-radius: 8px;
          background: #fbfcfe;
          color: #17202a;
          font: inherit;
          outline: none;
        }
        input {
          height: 42px;
          padding: 0 11px;
        }
        textarea {
          min-height: 360px;
          resize: vertical;
          padding: 14px;
          font: 15px/1.65 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        input:focus,
        textarea:focus {
          border-color: #2f6f73;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(47, 111, 115, 0.14);
        }
        .draft-metrics {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .draft-metrics span {
          border: 1px solid #e3e9ef;
          border-radius: 999px;
          background: #f8fafc;
          color: #526171;
          padding: 6px 9px;
          font-size: 12px;
          font-weight: 800;
        }
        .draft-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        button {
          border: 1px solid #cfd8e3;
          border-radius: 8px;
          background: #f8fafc;
          color: #22303f;
          padding: 9px 12px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }
        button.primary {
          border-color: #1d5f63;
          background: #1d5f63;
          color: #ffffff;
        }
        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .draft-status {
          margin-top: 12px;
          border: 1px solid #cfe3e1;
          border-radius: 8px;
          background: #f1f8f7;
          color: #285b5d;
          padding: 9px 10px;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.4;
        }
      `}</style>
    </section>
  );
}
