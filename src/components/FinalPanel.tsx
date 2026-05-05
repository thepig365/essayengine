"use client";

import type { SourceVersion } from "@/lib/projectStorage";

type Props = {
  finalVersion: SourceVersion | null;
  onCopyFinal: () => void;
  onDownloadFinalTxt: () => void;
  onReadFinal: () => void;
  onDownloadFinalAudiobook: () => void;
  onCopyGoogleDocs: () => void;
  audioBusy: boolean;
};

function formatOrigin(origin: SourceVersion["origin"]): string {
  return origin === "essay_draft" ? "Essay Draft" : origin.replaceAll("_", " ");
}

export function FinalPanel({
  finalVersion,
  onCopyFinal,
  onDownloadFinalTxt,
  onReadFinal,
  onDownloadFinalAudiobook,
  onCopyGoogleDocs,
  audioBusy,
}: Props) {
  return (
    <section className="final-panel">
      <div className="layer-head">
        <p className="eyebrow">Finalize</p>
        <h2>Final Output</h2>
        <p>Final means the approved article. Export it, copy it, or turn it into an audiobook.</p>
      </div>

      {finalVersion ? (
        <div className="final-result-card">
          <div className="final-meta">
            <strong>{finalVersion.label}</strong>
            <span>v{finalVersion.versionNumber}</span>
            <span>{finalVersion.wordCount.toLocaleString()} words</span>
            <span>{new Date(finalVersion.createdAt).toLocaleString()}</span>
          </div>
          <div className="chain">
            Final source: {formatOrigin(finalVersion.origin)} • Provider/task chain: {finalVersion.provider ?? "manual"} /{" "}
            {finalVersion.task ?? "source version"}
          </div>
          <div className="final-output-preview">{finalVersion.content}</div>
          <div className="final-actions">
            <button type="button" onClick={onCopyFinal}>
              Copy final article
            </button>
            <button type="button" onClick={onDownloadFinalTxt}>
              Download final as .txt
            </button>
            <button type="button" onClick={onReadFinal} disabled={audioBusy}>
              Read final aloud
            </button>
            <button type="button" onClick={onDownloadFinalAudiobook} disabled={audioBusy}>
              Download final audiobook MP3
            </button>
            <button type="button" className="primary" onClick={onCopyGoogleDocs}>
              Copy formatted final for Google Docs
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-final">
          <strong>No final version selected.</strong>
          <p>Mark a source version or generated result as Final when the article is approved.</p>
        </div>
      )}

      <style jsx>{`
        .final-panel {
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
        .final-result-card {
          display: grid;
          gap: 12px;
        }
        .final-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          color: #285b5d;
          font-size: 13px;
        }
        .final-meta strong,
        .final-meta span {
          border: 1px solid #cfe3e1;
          border-radius: 999px;
          background: #f8fcfb;
          padding: 6px 9px;
        }
        .final-meta strong {
          color: #174447;
        }
        .chain {
          border: 1px solid #e3e9ef;
          border-radius: 8px;
          background: #f8fafc;
          color: #526171;
          padding: 9px 10px;
          font-size: 13px;
          font-weight: 750;
        }
        .final-output-preview {
          max-height: 380px;
          overflow: auto;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          border: 1px solid #e3e9ef;
          border-radius: 10px;
          background: #fbfcfe;
          color: #15202b;
          padding: 16px;
          font: 15px/1.7 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .final-actions {
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
        .empty-final {
          border: 1px dashed #cfd8e3;
          border-radius: 10px;
          background: #fbfcfe;
          padding: 18px;
          color: #617080;
        }
        .empty-final strong {
          display: block;
          color: #17202a;
          margin-bottom: 4px;
        }
        .empty-final p {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
        }
      `}</style>
    </section>
  );
}
