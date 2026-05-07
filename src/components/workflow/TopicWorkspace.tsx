"use client";

import type { ReactNode } from "react";
import type { TopicMaterial } from "@/types/workflow";

/**
 * Stage 3: Topic — finalize the selected material as `TopicMaterial`.
 *
 * Important: AI processing in Stage 4 must use `TopicMaterial.content`, never
 * the unselected raw source — unless the user explicitly chose Use full source.
 */
type Props = {
  children?: ReactNode;
  active?: boolean;
  topicMaterial?: TopicMaterial | null;
  topicMaterialStatus?: string;
  isCurrentTopicStale?: boolean;
  topicMaterialWordCount?: number;
  topicSelectedRangeLabel?: string;
  canSaveAsTopic?: boolean;
  canUseFullSource?: boolean;
  onSaveAsTopic?: () => void;
  onUseFullSource?: () => void;
  onClearTopic?: () => void;
  /** Dense strip suitable for side rails / dark UI. */
  compact?: boolean;
};

export function TopicWorkspace({
  children,
  active = true,
  topicMaterial,
  topicMaterialStatus,
  isCurrentTopicStale = false,
  topicMaterialWordCount = 0,
  topicSelectedRangeLabel,
  canSaveAsTopic = false,
  canUseFullSource = false,
  onSaveAsTopic,
  onUseFullSource,
  onClearTopic,
  compact = false,
}: Props) {
  const renderTopicMaterialPanel = Boolean(onSaveAsTopic || onUseFullSource || onClearTopic);

  const compactSummaryLabel =
    topicMaterial != null
      ? (() => {
          const parts = [
            topicMaterial.sourceType,
            `${topicMaterialWordCount.toLocaleString()} words`,
            topicMaterial.useFullSource ? "Full source" : "Selection only",
            `${topicMaterial.selectedSegmentIds.length} segments`,
          ];
          const range = topicSelectedRangeLabel?.trim();
          if (range && range.length <= 28) {
            parts.push(range);
          }
          return parts.join(" · ");
        })()
      : "";

  return (
    <section
      className={`topic-workspace${compact ? " topic-workspace--compact" : ""}`}
      data-stage="topic"
      data-topic-saved={topicMaterial?.saved ? "true" : "false"}
      data-topic-uses-full-source={topicMaterial?.useFullSource ? "true" : "false"}
      hidden={!active}
      aria-label="Topic — selected source"
    >
      {renderTopicMaterialPanel ? (
        <section className="topic-material-panel" style={{ marginTop: "0.5rem" }}>
          <div className="range-head">
            <strong>Saved Topic</strong>
            <p>
              Processing uses only the topic saved here. The full raw source is used only when you explicitly choose Use Full Source.
            </p>
            <p className="transcript-note" style={{ margin: "0.35rem 0 0" }}>
              Saved topics are restored when you reopen the project.
            </p>
          </div>
          <div className={`topic-topic-actions${compact ? " topic-topic-actions--compact" : " ee-quick-action-grid range-actions cta-row"}`}>
            <button type="button" className="primary" onClick={onSaveAsTopic} disabled={!canSaveAsTopic}>
              Save as Topic
            </button>
            <button type="button" className="secondary" onClick={onUseFullSource} disabled={!canUseFullSource}>
              Use Full Source
            </button>
            <button type="button" className="copy-action" onClick={onClearTopic} disabled={!topicMaterial}>
              Clear Topic
            </button>
          </div>
          {topicMaterialStatus ? (
            compact ? (
              <span className="topic-topic-status-note">{topicMaterialStatus}</span>
            ) : (
              <span className="range-status">{topicMaterialStatus}</span>
            )
          ) : null}
          {topicMaterial ? (
            <div className="topic-material-preview">
              {isCurrentTopicStale ? (
                compact ? (
                  <p className="topic-stale-inline-note" role="status">
                    Source changed — topic may be stale. Save again to refresh.
                  </p>
                ) : (
                  <span className="range-status">
                    Topic may be stale. The source has changed. Save the topic again.
                  </span>
                )
              ) : null}
              {compact ? (
                <>
                  <p className="topic-saved-summary-line" title={compactSummaryLabel}>
                    {compactSummaryLabel}
                  </p>
                  <details className="topic-saved-meta-details">
                    <summary className="topic-saved-meta-summary">Topic metadata</summary>
                    <div className="topic-material-metrics topic-material-metrics--chips topic-material-metrics--chips-secondary" role="list" aria-label="Saved topic metadata detail">
                      <div className="topic-metric-chip" role="listitem">
                        <span className="topic-metric-label">Type</span>
                        <span className="topic-metric-value">{topicMaterial.sourceType}</span>
                      </div>
                      <div className="topic-metric-chip" role="listitem">
                        <span className="topic-metric-label">Segments</span>
                        <span className="topic-metric-value">{topicMaterial.selectedSegmentIds.length}</span>
                      </div>
                      <div className="topic-metric-chip" role="listitem">
                        <span className="topic-metric-label">Range</span>
                        <span className="topic-metric-value">{topicSelectedRangeLabel || "—"}</span>
                      </div>
                      <div className="topic-metric-chip topic-metric-chip--wide" role="listitem">
                        <span className="topic-metric-label">Words</span>
                        <span className="topic-metric-value">
                          {topicMaterialWordCount.toLocaleString()} · {topicMaterial.content.length.toLocaleString()} ch
                        </span>
                      </div>
                      <div className="topic-metric-chip" role="listitem">
                        <span className="topic-metric-label">Full src</span>
                        <span className="topic-metric-value">{topicMaterial.useFullSource ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  </details>
                  <details className="topic-saved-preview-details">
                    <summary className="topic-saved-preview-summary">Preview saved topic</summary>
                    <textarea className="transcript-preview topic-saved-preview-textarea" readOnly rows={8} value={topicMaterial.content} />
                  </details>
                </>
              ) : (
                <dl className="topic-material-metrics">
                  <div>
                    <dt>Source type</dt>
                    <dd>{topicMaterial.sourceType}</dd>
                  </div>
                  <div>
                    <dt>Selected segments</dt>
                    <dd>{topicMaterial.selectedSegmentIds.length}</dd>
                  </div>
                  <div>
                    <dt>Selected range</dt>
                    <dd>{topicSelectedRangeLabel || "-"}</dd>
                  </div>
                  <div>
                    <dt>Words / characters</dt>
                    <dd>
                      {topicMaterialWordCount.toLocaleString()} / {topicMaterial.content.length.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt>Use full source</dt>
                    <dd>{topicMaterial.useFullSource ? "true" : "false"}</dd>
                  </div>
                </dl>
              )}
              {!compact ? <textarea className="transcript-preview" readOnly rows={6} value={topicMaterial.content} /> : null}
            </div>
          ) : (
            <p className="transcript-note">No topic saved yet. Select source blocks and click Save as Topic.</p>
          )}
        </section>
      ) : null}
      {children}
      <style jsx>{`
        .topic-material-panel {
          display: grid;
          gap: 12px;
          border: 1px solid #cfe3e1;
          border-radius: 12px;
          background: #f8fcfb;
          padding: 14px;
        }
        .topic-material-preview {
          display: grid;
          gap: 10px;
        }
        .topic-material-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin: 0;
        }
        .topic-material-metrics div {
          border: 1px solid #e3e9ef;
          border-radius: 8px;
          background: #ffffff;
          padding: 8px;
          min-width: 0;
        }
        .topic-material-metrics dt {
          color: #617080;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .topic-material-metrics dd {
          margin: 2px 0 0;
          color: #17202a;
          font-size: 13px;
          font-weight: 760;
          overflow-wrap: anywhere;
        }
        .topic-material-panel .ee-quick-action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          align-items: stretch;
          width: 100%;
        }
        .topic-material-panel .ee-quick-action-grid button {
          min-height: 44px;
          width: 100%;
          box-sizing: border-box;
          justify-self: stretch;
        }
        .topic-topic-actions--compact {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .topic-topic-actions--compact button {
          width: auto;
          flex: 0 1 auto;
          min-width: min(100%, 7.5rem);
          min-height: 38px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 750;
          box-sizing: border-box;
        }
        .topic-material-metrics--chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          margin: 0;
          padding: 0;
        }
        .topic-metric-chip {
          display: inline-flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 6px;
          margin: 0;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid #e3e9ef;
          background: #ffffff;
          max-width: 100%;
          box-sizing: border-box;
        }
        .topic-metric-chip--wide {
          flex: 1 1 12rem;
          min-width: min(100%, 11rem);
        }
        .topic-metric-label {
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #617080;
        }
        .topic-metric-value {
          font-size: 12px;
          font-weight: 760;
          color: #17202a;
          overflow-wrap: anywhere;
          line-height: 1.35;
        }
        .topic-workspace--compact .topic-material-preview {
          gap: 8px;
        }
        .topic-workspace--compact .topic-material-metrics--chips .topic-metric-chip {
          border-color: #334657;
          background: #121b26;
          padding: 4px 9px;
        }
        .topic-workspace--compact .topic-material-metrics--chips .topic-metric-label {
          color: #94a3b8;
        }
        .topic-workspace--compact .topic-material-metrics--chips .topic-metric-value {
          color: #e2e8f0;
        }
        .topic-workspace--compact .topic-material-panel {
          border-color: rgba(100, 116, 139, 0.28);
          background: rgba(15, 23, 32, 0.52);
          padding: 8px 10px;
          gap: 8px;
        }
        .topic-workspace--compact .topic-material-metrics div {
          border-color: #334657;
          background: #121b26;
        }
        .topic-workspace--compact .topic-material-metrics dt {
          color: #94a3b8;
        }
        .topic-workspace--compact .topic-material-metrics dd {
          color: #e2e8f0;
        }
        .topic-topic-status-note {
          font-size: 11px;
          color: #617080;
          line-height: 1.35;
        }
        .topic-workspace--compact .topic-topic-status-note {
          color: #94a3b8;
        }
        .topic-stale-inline-note {
          margin: 0;
          padding: 4px 8px;
          border-radius: 8px;
          border: 1px solid rgba(217, 119, 6, 0.4);
          background: rgba(254, 243, 199, 0.45);
          color: #92400e;
          font-size: 11px;
          font-weight: 680;
          line-height: 1.35;
        }
        .topic-workspace--compact .topic-stale-inline-note {
          display: inline-block;
          max-width: 100%;
          border-color: rgba(251, 191, 36, 0.32);
          background: rgba(120, 53, 15, 0.22);
          color: #fde68a;
          box-sizing: border-box;
        }
        .topic-saved-summary-line {
          margin: 0;
          font-size: 12px;
          font-weight: 760;
          line-height: 1.45;
          color: #17202a;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        .topic-workspace--compact .topic-saved-summary-line {
          color: #e2e8f0;
          font-weight: 740;
          font-size: 11px;
        }
        .topic-saved-meta-details,
        .topic-saved-preview-details {
          margin: 0;
          border-radius: 10px;
          border: 1px solid #e3e9ef;
          background: rgba(255, 255, 255, 0.72);
          overflow: hidden;
          min-width: 0;
        }
        .topic-workspace--compact .topic-saved-meta-details,
        .topic-workspace--compact .topic-saved-preview-details {
          border-color: rgba(51, 70, 87, 0.55);
          background: rgba(14, 23, 34, 0.38);
        }
        .topic-saved-meta-summary,
        .topic-saved-preview-summary {
          margin: 0;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 780;
          letter-spacing: 0.02em;
          color: #526171;
          cursor: pointer;
          list-style: none;
        }
        .topic-workspace--compact .topic-saved-meta-summary,
        .topic-workspace--compact .topic-saved-preview-summary {
          color: #94a3b8;
        }
        .topic-saved-meta-summary::-webkit-details-marker,
        .topic-saved-preview-summary::-webkit-details-marker {
          display: none;
        }
        .topic-saved-meta-details .topic-material-metrics--chips-secondary {
          padding: 0 10px 10px;
          gap: 5px;
        }
        .topic-material-metrics--chips-secondary .topic-metric-chip {
          padding: 3px 8px;
        }
        .topic-material-metrics--chips-secondary .topic-metric-label {
          font-size: 9px;
        }
        .topic-material-metrics--chips-secondary .topic-metric-value {
          font-size: 11px;
        }
        .topic-saved-preview-textarea {
          margin: 0 10px 10px;
          width: calc(100% - 20px);
          box-sizing: border-box;
          max-height: min(42vh, 300px);
          min-height: 112px;
          resize: vertical;
        }
        .topic-workspace--compact .topic-saved-preview-textarea {
          border-color: #334657;
          background: #0e1720;
          color: #e2e8f0;
        }
        .topic-workspace--compact .topic-topic-actions--compact button {
          min-width: 0;
          min-height: 32px;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 720;
        }
        .topic-workspace--compact .range-head strong {
          font-size: 0.88rem;
          color: #f1f5f9;
        }
        .topic-workspace--compact .range-head > p:not(.transcript-note) {
          display: none;
        }
        .topic-workspace--compact .transcript-note {
          margin-top: 0;
          margin-bottom: 0;
          font-size: 0.72rem;
          color: #94a3b8;
        }
        .topic-workspace--compact .topic-topic-actions--compact button.primary {
          font-weight: 780;
          border-color: rgba(63, 143, 138, 0.55);
          background: rgba(29, 95, 99, 0.55);
          color: #ecfdf9;
        }
        .topic-workspace--compact .topic-topic-actions--compact button.secondary {
          font-weight: 720;
          background: rgba(23, 31, 44, 0.72);
          border-color: rgba(100, 116, 139, 0.45);
          color: #cbd5e1;
        }
        .topic-workspace--compact .topic-topic-actions--compact button.copy-action {
          font-weight: 720;
          background: transparent;
          border-color: rgba(100, 116, 139, 0.35);
          color: #94a3b8;
        }
      `}</style>
    </section>
  );
}
