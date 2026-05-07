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
            <p>Processing uses only the saved topic content here. Full source is allowed only when you explicitly choose Use Full Source.</p>
            <p className="transcript-note" style={{ margin: "0.35rem 0 0" }}>
              Saved topics are restored when you reopen the project.
            </p>
          </div>
          <div className="range-actions cta-row ee-quick-action-grid">
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
          {topicMaterialStatus && <span className="range-status">{topicMaterialStatus}</span>}
          {topicMaterial ? (
            <div className="topic-material-preview">
              {isCurrentTopicStale && <span className="range-status">Topic may be stale. The source has changed. Save the topic again.</span>}
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
              <textarea className="transcript-preview" readOnly rows={compact ? 3 : 6} value={topicMaterial.content} />
            </div>
          ) : (
            <p className="transcript-note">No saved topic yet. Select source material, then click Save as Topic.</p>
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
        .topic-workspace--compact .topic-material-panel {
          border-color: rgba(100, 116, 139, 0.35);
          background: rgba(15, 23, 32, 0.75);
          padding: 10px 12px;
        }
        .topic-workspace--compact .range-head strong {
          font-size: 0.88rem;
        }
        .topic-workspace--compact .range-head > p:not(.transcript-note) {
          display: none;
        }
        .topic-workspace--compact .transcript-note {
          font-size: 0.72rem;
        }
      `}</style>
    </section>
  );
}
