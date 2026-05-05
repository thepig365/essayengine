"use client";

import { useState } from "react";
import type { SourceVersion } from "@/lib/projectStorage";

type Props = {
  versions: SourceVersion[];
  currentSourceVersionId: string | null;
  finalVersionId: string | null;
  onView: (version: SourceVersion) => void;
  onUseCurrent: (version: SourceVersion) => void;
  onDuplicate: (version: SourceVersion) => void;
  onMarkFinal: (version: SourceVersion) => void;
  onStartFresh: () => void;
};

function formatOrigin(origin: SourceVersion["origin"]): string {
  return origin.replaceAll("_", " ");
}

export function WorkflowTimeline({
  versions,
  currentSourceVersionId,
  finalVersionId,
  onView,
  onUseCurrent,
  onDuplicate,
  onMarkFinal,
  onStartFresh,
}: Props) {
  const [showOlder, setShowOlder] = useState(false);
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const featuredIds = new Set<string>();
  for (const version of sortedVersions) {
    if (version.id === currentSourceVersionId || version.id === finalVersionId || featuredIds.size < 3) {
      featuredIds.add(version.id);
    }
  }
  const featuredVersions = sortedVersions.filter((version) => featuredIds.has(version.id));
  const olderVersions = sortedVersions.filter((version) => !featuredIds.has(version.id));
  const visibleVersions = showOlder ? [...featuredVersions, ...olderVersions] : featuredVersions;

  return (
    <section className="workflow-timeline">
      <div className="timeline-head">
        <p className="eyebrow">Writing Pipeline</p>
        <h2>Workflow Timeline</h2>
        <p>
          Raw Script → Select → Source Version → Transform → New Source Version → Essay Draft → Final → Audio / Export.
          Each transformation can become a new source version, so you can go back, branch, or continue.
        </p>
        <button type="button" className="fresh-button" onClick={onStartFresh}>
          Start fresh writing pipeline
        </button>
      </div>

      {versions.length > 0 ? (
        <div className="timeline-list">
          {visibleVersions.map((version) => {
            const isCurrent = version.id === currentSourceVersionId;
            const isFinal = version.id === finalVersionId;
            return (
              <article className={isCurrent ? "version-card current" : "version-card"} key={version.id}>
                <div className="version-top">
                  <span>v{version.versionNumber}</span>
                  {isCurrent && <strong>Current Source</strong>}
                  {isFinal && <strong>Final</strong>}
                </div>
                <h3>{version.label}</h3>
                <dl>
                  <div>
                    <dt>Origin</dt>
                    <dd>{formatOrigin(version.origin)}</dd>
                  </div>
                  <div>
                    <dt>Task</dt>
                    <dd>{version.task ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>Provider</dt>
                    <dd>{version.provider ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>Words</dt>
                    <dd>{version.wordCount.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(version.createdAt).toLocaleString()}</dd>
                  </div>
                </dl>
                <div className="timeline-actions">
                  <button type="button" onClick={() => onView(version)}>
                    View
                  </button>
                  <button type="button" onClick={() => onUseCurrent(version)} disabled={isCurrent}>
                    Use as current source
                  </button>
                  <button type="button" onClick={() => onDuplicate(version)}>
                    Duplicate as new version
                  </button>
                  <button type="button" onClick={() => onMarkFinal(version)}>
                    Mark as Final
                  </button>
                </div>
              </article>
            );
          })}
          {olderVersions.length > 0 && (
            <button type="button" className="show-older" onClick={() => setShowOlder((value) => !value)}>
              {showOlder ? "Hide older versions" : `Show older versions (${olderVersions.length})`}
            </button>
          )}
        </div>
      ) : (
        <div className="empty-timeline">
          <strong>No source versions yet.</strong>
          <p>Select transcript content or type source text, then create the first version.</p>
        </div>
      )}

      <style jsx>{`
        .workflow-timeline {
          border: 1px solid #dfe5ec;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 14px 34px rgba(31, 45, 61, 0.07);
          padding: 20px;
        }
        .timeline-head {
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
        .timeline-head p:not(.eyebrow) {
          margin: 0;
          color: #617080;
          font-size: 13px;
          line-height: 1.45;
        }
        .timeline-list {
          display: grid;
          gap: 10px;
        }
        .version-card {
          display: grid;
          gap: 10px;
          border: 1px solid #e3e9ef;
          border-radius: 10px;
          background: #fbfcfe;
          padding: 12px;
        }
        .version-card.current {
          border-color: #2f6f73;
          background: #f1f8f7;
          box-shadow: 0 0 0 3px rgba(47, 111, 115, 0.11);
        }
        .version-top {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          align-items: center;
        }
        .version-top span,
        .version-top strong {
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 900;
        }
        .version-top span {
          background: #174447;
          color: #ffffff;
        }
        .version-top strong {
          border: 1px solid #cfe3e1;
          background: #ffffff;
          color: #174447;
        }
        h3 {
          margin: 0;
          color: #17202a;
          font-size: 15px;
        }
        dl {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
          margin: 0;
        }
        dt {
          color: #617080;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        dd {
          margin: 2px 0 0;
          color: #17202a;
          font-size: 12px;
          font-weight: 750;
          overflow-wrap: anywhere;
        }
        .timeline-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        button {
          border: 1px solid #cfd8e3;
          border-radius: 8px;
          background: #ffffff;
          color: #22303f;
          padding: 8px 10px;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .fresh-button {
          margin-top: 12px;
          border-color: #b91c1c;
          background: #fff1f2;
          color: #9f1239;
        }
        .show-older {
          width: 100%;
          border-style: dashed;
          background: #f8fafc;
          color: #526171;
        }
        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .empty-timeline {
          border: 1px dashed #cfd8e3;
          border-radius: 10px;
          background: #fbfcfe;
          color: #617080;
          padding: 16px;
        }
        .empty-timeline strong {
          display: block;
          color: #17202a;
          margin-bottom: 4px;
        }
        .empty-timeline p {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
        }
        @media (max-width: 760px) {
          .timeline-list {
            display: flex;
            overflow-x: auto;
            padding-bottom: 4px;
          }
          .version-card {
            min-width: 280px;
          }
        }
      `}</style>
    </section>
  );
}
