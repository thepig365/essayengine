"use client";

import type { MegaMenuCategorySpec, MegaMenuItemSpec } from "@/components/navigation/megaMenuData";

type Props = {
  category: MegaMenuCategorySpec | null;
  onClose: () => void;
  onItemActivate: (item: MegaMenuItemSpec) => void;
};

export function FeatureMegaMenu({ category, onClose, onItemActivate }: Props) {
  if (!category) return null;

  return (
    <div
      className="ee-mega-overlay"
      role="dialog"
      aria-label={`${category.navLabel} tools`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ee-mega-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ee-mega-head">
          <div>
            <p className="ee-mega-eyebrow">{category.navLabel}</p>
            <h3 className="ee-mega-title">Choose an action</h3>
          </div>
          <button type="button" className="ee-mega-close" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>
        <div className="ee-mega-grid">
          {category.items.map((item) => {
            const isDisabled = item.tier === "disabled";
            const isAdvanced = item.tier === "advanced";
            return (
              <button
                key={item.actionId}
                type="button"
                className={
                  "ee-mega-card" +
                  (isDisabled ? " ee-mega-card--disabled" : "") +
                  (isAdvanced ? " ee-mega-card--advanced" : "")
                }
                disabled={isDisabled}
                onClick={() => onItemActivate(item)}
              >
                <span className="ee-mega-card-icon" aria-hidden>
                  {item.icon}
                </span>
                <span className="ee-mega-card-title">{item.title}</span>
                <span className="ee-mega-card-desc">{item.description}</span>
                {isDisabled ? <span className="ee-mega-card-hint">Not available yet</span> : null}
                {isAdvanced ? <span className="ee-mega-card-hint">Available in Advanced Studio</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .ee-mega-overlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(2, 8, 14, 0.55);
          backdrop-filter: blur(4px);
          padding: 72px 20px 40px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow: auto;
        }
        .ee-mega-panel {
          width: min(1100px, 100%);
          border: 1px solid var(--ee-border, #263746);
          border-radius: 16px;
          background: var(--ee-panel, #111a22);
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.45);
          padding: 22px 24px 28px;
        }
        .ee-mega-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
        }
        .ee-mega-eyebrow {
          margin: 0 0 4px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7fc7c2;
        }
        .ee-mega-title {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 750;
          color: #e6edf3;
        }
        .ee-mega-close {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid #334657;
          background: #151e29;
          color: #dbe4ef;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
        }
        .ee-mega-close:hover {
          border-color: #5da8a6;
          background: #1a2935;
        }
        .ee-mega-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px 16px;
        }
        .ee-mega-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          gap: 6px;
          padding: 16px 16px 14px;
          min-height: 132px;
          border-radius: 14px;
          border: 1px solid #314050;
          background: linear-gradient(165deg, #15202c, #111921);
          color: #d8dee8;
          font: inherit;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .ee-mega-card:hover:not(:disabled) {
          border-color: #3f8f8a;
          box-shadow: 0 0 0 2px rgba(63, 143, 138, 0.2);
        }
        .ee-mega-card--advanced {
          border-style: dashed;
          opacity: 0.95;
        }
        .ee-mega-card--disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .ee-mega-card-icon {
          font-size: 1.35rem;
          line-height: 1;
        }
        .ee-mega-card-title {
          font-size: 15px;
          font-weight: 780;
          color: #f1f5f9;
        }
        .ee-mega-card-desc {
          font-size: 13px;
          line-height: 1.45;
          color: #94a3b8;
        }
        .ee-mega-card-hint {
          margin-top: auto;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #7dd3c0;
        }
        .ee-mega-card--disabled .ee-mega-card-hint {
          color: #94a3b8;
        }
        @media (max-width: 640px) {
          .ee-mega-overlay {
            padding: 58px 10px 18px;
            align-items: flex-end;
          }
          .ee-mega-panel {
            max-height: calc(100dvh - 76px);
            overflow: hidden;
            border-radius: 18px 18px 14px 14px;
            padding: 16px 0 18px;
          }
          .ee-mega-head {
            position: sticky;
            top: 0;
            z-index: 1;
            margin: 0;
            padding: 0 14px 14px;
            border-bottom: 1px solid rgba(49, 64, 80, 0.72);
            background: var(--ee-panel, #111a22);
          }
          .ee-mega-title {
            font-size: 1.15rem;
          }
          .ee-mega-close {
            width: 38px;
            height: 38px;
          }
          .ee-mega-grid {
            display: grid;
            grid-auto-flow: column;
            grid-auto-columns: minmax(248px, 82vw);
            grid-template-columns: none;
            grid-template-rows: repeat(2, minmax(116px, auto));
            gap: 12px;
            overflow-x: auto;
            padding: 16px 14px 2px;
            scroll-padding-inline: 14px;
            scroll-snap-type: x proximity;
            -webkit-overflow-scrolling: touch;
          }
          .ee-mega-card {
            min-height: 116px;
            padding: 14px;
            scroll-snap-align: start;
          }
          .ee-mega-card-title {
            font-size: 14px;
          }
          .ee-mega-card-desc {
            font-size: 12.5px;
            line-height: 1.4;
          }
        }
        @media (max-width: 360px) {
          .ee-mega-grid {
            grid-auto-columns: minmax(232px, 86vw);
          }
        }
      `}</style>
    </div>
  );
}
