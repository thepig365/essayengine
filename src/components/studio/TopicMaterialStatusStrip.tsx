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
          border: 1px solid #2f4152;
          border-radius: 12px;
          background: linear-gradient(180deg, #15202a, #121a22);
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
          border: 1px solid #334657;
          background: #111921;
          color: #cbd5e1;
        }
        .ee-topic-badge--saved {
          border-color: #2f6f73;
          background: #132a2c;
          color: #a7f3d0;
        }
        .ee-topic-badge--stale {
          border-color: #8a6918;
          background: #2a2115;
          color: #fcd34d;
        }
        .ee-topic-badge--missing {
          border-color: #4b5563;
          color: #9ca3af;
        }
        .ee-topic-meta {
          font-size: 12px;
          font-weight: 650;
          color: #94a3b8;
        }
        .ee-topic-meta-key {
          font-weight: 800;
          color: #64748b;
          margin-right: 4px;
        }
        .ee-topic-stale-msg {
          margin: 8px 0 0;
          font-size: 12px;
          line-height: 1.45;
          color: #fcd34d;
        }
        .ee-topic-note {
          margin: 6px 0 0;
          font-size: 12px;
          color: #7dd3c0;
        }
        .ee-topic-preview {
          margin: 8px 0 0;
          font-size: 13px;
          line-height: 1.45;
          color: #cbd5e1;
        }
        .ee-topic-preview--empty {
          color: #64748b;
          font-style: italic;
        }
        .ee-topic-preview-label {
          display: block;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #5eead4;
          margin-bottom: 3px;
        }
      `}</style>
    </div>
  );
}
