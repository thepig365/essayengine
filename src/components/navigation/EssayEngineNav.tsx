"use client";

import { useCallback, useEffect } from "react";
import { FeatureMegaMenu } from "@/components/navigation/FeatureMegaMenu";
import { MEGA_MENU_CATEGORIES } from "@/components/navigation/megaMenuData";
import type { MegaMenuCategorySpec, MegaMenuItemSpec } from "@/components/navigation/megaMenuData";

const WORKFLOW_RIBBON = ["Material", "Extract", "Topic", "Process", "Review", "Export"] as const;

export type EssayEngineNavProps = {
  /** Which mega category panel is open, or null */
  megaCategoryId: MegaMenuCategorySpec["id"] | null;
  onMegaCategoryChange: (id: MegaMenuCategorySpec["id"] | null) => void;
  /** Active ribbon index 0–4 maps to internal workflow steps; 5 = Export (scroll-only) */
  activeWorkflowStepIndex: number;
  onWorkflowRibbonStep: (index: number) => void;
  onMegaItemActivate: (item: MegaMenuItemSpec) => void;
};

export function EssayEngineNav({
  megaCategoryId,
  onMegaCategoryChange,
  activeWorkflowStepIndex,
  onWorkflowRibbonStep,
  onMegaItemActivate,
}: EssayEngineNavProps) {
  const openCategory = useCallback(
    (id: MegaMenuCategorySpec["id"]) => {
      onMegaCategoryChange(megaCategoryId === id ? null : id);
    },
    [megaCategoryId, onMegaCategoryChange],
  );

  const closeMega = useCallback(() => onMegaCategoryChange(null), [onMegaCategoryChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMega();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeMega]);

  const activeMega = MEGA_MENU_CATEGORIES.find((c) => c.id === megaCategoryId) ?? null;

  const handleItem = (item: MegaMenuItemSpec) => {
    onMegaItemActivate(item);
    closeMega();
  };

  return (
    <header className="ee-top-nav" role="banner">
      <div className="ee-top-nav-inner">
        <div className="ee-nav-brand">
          <span className="ee-wordmark">Essay Engine</span>
          <span className="ee-wordmark-sub">structured writing workspace</span>
        </div>
        <nav className="ee-nav-primary" aria-label="Primary tools">
          {MEGA_MENU_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={"ee-nav-trigger" + (megaCategoryId === cat.id ? " ee-nav-trigger--open" : "")}
              aria-expanded={megaCategoryId === cat.id}
              onClick={() => openCategory(cat.id)}
            >
              {cat.navLabel}
            </button>
          ))}
        </nav>
      </div>
      <div className="ee-workflow-track" role="presentation">
        <span className="ee-workflow-track-label">Progress</span>
        <div className="ee-workflow-ribbon" aria-label="Workflow progress">
        {WORKFLOW_RIBBON.map((label, i) => {
          const isActive =
            (i < 5 && i === activeWorkflowStepIndex) || (i === 5 && activeWorkflowStepIndex === 4);
          const isExportStep = i === 5;
          return (
            <button
              key={label}
              type="button"
              className={
                "ee-ribbon-step" +
                (isActive ? " ee-ribbon-step--active" : "") +
                (isExportStep ? " ee-ribbon-step--final" : "")
              }
              onClick={() => onWorkflowRibbonStep(i)}
            >
              <span className="ee-ribbon-label">{label}</span>
              {i < WORKFLOW_RIBBON.length - 1 ? <span className="ee-ribbon-chev" aria-hidden>→</span> : null}
            </button>
          );
        })}
        </div>
      </div>

      {activeMega ? <FeatureMegaMenu category={activeMega} onClose={closeMega} onItemActivate={handleItem} /> : null}

      <style jsx>{`
        .ee-top-nav {
          position: relative;
          z-index: 30;
          margin-bottom: 18px;
          border: 1px solid #263746;
          border-radius: 16px;
          background: rgba(17, 26, 34, 0.92);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(10px);
        }
        .ee-top-nav-inner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px 20px;
          padding: 14px 18px 10px;
          border-bottom: 1px solid rgba(38, 55, 70, 0.85);
        }
        .ee-nav-brand {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 140px;
        }
        .ee-wordmark {
          font-size: 1.15rem;
          font-weight: 820;
          letter-spacing: -0.02em;
          color: #f1f5f9;
        }
        .ee-wordmark-sub {
          font-size: 12px;
          font-weight: 600;
          color: #7dd3c0;
          letter-spacing: 0.02em;
        }
        .ee-nav-primary {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 8px;
          justify-content: flex-end;
          flex: 1;
          min-width: 0;
        }
        .ee-nav-trigger {
          border: 1px solid transparent;
          border-radius: 999px;
          background: rgba(15, 23, 32, 0.9);
          color: #cbd5e1;
          padding: 10px 16px;
          font: inherit;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          white-space: nowrap;
        }
        .ee-nav-trigger:hover {
          border-color: #3f8f8a;
          color: #f8fafc;
          background: rgba(30, 58, 58, 0.55);
        }
        .ee-nav-trigger--open {
          border-color: #5da8a6;
          background: rgba(30, 58, 58, 0.8);
          color: #ecfeff;
        }
        @media (max-width: 720px) {
          .ee-top-nav-inner {
            flex-direction: column;
            align-items: stretch;
          }
          .ee-nav-primary {
            justify-content: flex-start;
          }
          .ee-workflow-track .ee-workflow-ribbon {
            overflow-x: auto;
            flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </header>
  );
}
