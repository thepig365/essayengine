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
}: Props) {
  const renderTopicMaterialPanel = Boolean(onSaveAsTopic || onUseFullSource || onClearTopic);

  return (
    <section
      className="topic-workspace"
      data-stage="topic"
      data-topic-saved={topicMaterial?.saved ? "true" : "false"}
      data-topic-uses-full-source={topicMaterial?.useFullSource ? "true" : "false"}
      hidden={!active}
      aria-label="Topic — selected material"
    >
      {renderTopicMaterialPanel ? (
        <section className="topic-material-panel" style={{ marginTop: "0.5rem" }}>
          <div className="range-head">
            <strong>TopicMaterial — saved topic</strong>
            <p>加工阶段只使用这里保存的题材内容。只有点击“使用完整素材”时，才允许使用全文。</p>
            <p className="transcript-note" style={{ margin: "0.35rem 0 0" }}>
              Saved TopicMaterial is restored when this project reloads.
            </p>
          </div>
          <div className="range-actions cta-row ee-quick-action-grid">
            <button type="button" className="primary" onClick={onSaveAsTopic} disabled={!canSaveAsTopic}>
              Save as Topic / 保存为题材
            </button>
            <button type="button" className="secondary" onClick={onUseFullSource} disabled={!canUseFullSource}>
              Use Full Source / 使用完整素材
            </button>
            <button type="button" className="copy-action" onClick={onClearTopic} disabled={!topicMaterial}>
              Clear Topic
            </button>
          </div>
          {topicMaterialStatus && <span className="range-status">{topicMaterialStatus}</span>}
          {topicMaterial ? (
            <div className="topic-material-preview">
              {isCurrentTopicStale && <span className="range-status">题材可能已过期：素材已被修改，请重新保存题材。</span>}
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
              <textarea className="transcript-preview" readOnly rows={6} value={topicMaterial.content} />
            </div>
          ) : (
            <p className="transcript-note">尚未保存题材。请先勾选素材并点击“Save as Topic / 保存为题材”。</p>
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
      `}</style>
    </section>
  );
}
