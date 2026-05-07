"use client";

export type TopicMaterialStatusVariant = "missing" | "saved" | "stale";

type Props = {
  variant: TopicMaterialStatusVariant;
  sourceTypeLabel: string;
  wordCount: number;
  fullSourceAvailable: boolean;
  preview: string;
  statusNote?: string;
};

export function TopicMaterialStatusStrip({
  variant,
  sourceTypeLabel,
  wordCount,
  fullSourceAvailable,
  preview,
  statusNote,
}: Props) {
  const badge =
    variant === "missing"
      ? "尚未保存主题素材源"
      : variant === "stale"
        ? "可能过期"
        : "已保存主题素材源";

  return (
    <div className="ee-topic-strip" role="status" aria-live="polite">
      <div className="ee-topic-strip-main">
        <span className={"ee-topic-badge ee-topic-badge--" + variant}>{badge}</span>
        {variant === "missing" ? (
          <span className="ee-topic-meta">Choose source text, extract the useful parts, then save them as the topic.</span>
        ) : (
          <>
            <span className="ee-topic-meta">
              <span className="ee-topic-meta-key">来源</span> {sourceTypeLabel}
            </span>
            <span className="ee-topic-meta">
              <span className="ee-topic-meta-key">长度</span> {wordCount} 词
            </span>
            <span className="ee-topic-meta">
              模式：{fullSourceAvailable ? "使用完整素材源" : "使用已选素材源"}
            </span>
          </>
        )}
      </div>
      {variant === "stale" ? (
        <p className="ee-topic-stale-msg">题材可能已过期：素材源已被修改，请重新保存题材。</p>
      ) : null}
      {statusNote ? <p className="ee-topic-note">{statusNote}</p> : null}
      {preview.trim() ? (
        <p className="ee-topic-preview">
          <span className="ee-topic-preview-label">预览</span>
          {preview.length > 160 ? `${preview.slice(0, 160)}…` : preview}
        </p>
      ) : (
        <p className="ee-topic-preview ee-topic-preview--empty">
          No topic saved yet. Open Source, select the material you want to write from, then save it as the topic.
        </p>
      )}
      <style jsx>{`
        .ee-topic-strip {
          border: 1px solid var(--ee-border);
          border-radius: 12px;
          background: linear-gradient(180deg, var(--ee-card), var(--ee-surface-soft));
          padding: 10px 14px 12px;
          margin-bottom: 14px;
        }
        .ee-topic-strip-main {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 12px;
        }
        .ee-topic-badge {
          font-size: 11px;
          font-weight: 820;
          letter-spacing: 0.04em;
          padding: 5px 9px;
          border-radius: 999px;
          border: 1px solid var(--ee-border);
          background: var(--ee-surface);
          color: var(--ee-text);
        }
        .ee-topic-badge--saved {
          border-color: var(--ee-primary);
          background: var(--ee-secondary);
          color: var(--ee-primary-hover);
        }
        .ee-topic-badge--stale {
          border-color: #c79657;
          background: #f6ead0;
          color: #8a5a26;
        }
        .ee-topic-badge--missing {
          border-color: var(--ee-border);
          color: var(--ee-disabled);
        }
        .ee-topic-meta {
          font-size: 12px;
          font-weight: 650;
          color: var(--ee-muted);
        }
        .ee-topic-meta-key {
          font-weight: 800;
          color: var(--ee-muted);
          margin-right: 4px;
        }
        .ee-topic-stale-msg {
          margin: 8px 0 0;
          font-size: 12px;
          line-height: 1.45;
          color: #8a5a26;
        }
        .ee-topic-note {
          margin: 6px 0 0;
          font-size: 12px;
          color: var(--ee-primary);
        }
        .ee-topic-preview {
          margin: 8px 0 0;
          font-size: 13px;
          line-height: 1.45;
          color: var(--ee-text);
        }
        .ee-topic-preview--empty {
          color: var(--ee-muted);
          font-style: italic;
        }
        .ee-topic-preview-label {
          display: block;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ee-primary);
          margin-bottom: 3px;
        }
      `}</style>
    </div>
  );
}
