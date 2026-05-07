"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";
import { FeatureMegaMenu } from "@/components/navigation/FeatureMegaMenu";
import { MEGA_MENU_CATEGORIES } from "@/components/navigation/megaMenuData";
import type { MegaMenuCategorySpec, MegaMenuItemSpec } from "@/components/navigation/megaMenuData";

const WORKFLOW_RIBBON = ["Source", "Extract", "Topic", "Process", "Review", "Export"] as const;

export type EssayEngineNavProps = {
  functionsMenuOpen: boolean;
  onFunctionsMenuOpenChange: (open: boolean) => void;
  functionsMenuFocusSection: MegaMenuCategorySpec["id"] | null;
  onFunctionsMenuFocusSectionChange: (id: MegaMenuCategorySpec["id"] | null) => void;
  activeWorkflowStepIndex: number;
  onWorkflowRibbonStep: (index: number) => void;
  onMegaItemActivate: (item: MegaMenuItemSpec) => void;
  /** Layout toggle, guide, etc. — right side of the top row */
  trailingActions?: ReactNode;
};

export function EssayEngineNav({
  functionsMenuOpen,
  onFunctionsMenuOpenChange,
  functionsMenuFocusSection,
  onFunctionsMenuFocusSectionChange,
  activeWorkflowStepIndex,
  onWorkflowRibbonStep,
  onMegaItemActivate,
  trailingActions,
}: EssayEngineNavProps) {
  const closeMenu = useCallback(() => {
    onFunctionsMenuOpenChange(false);
    onFunctionsMenuFocusSectionChange(null);
  }, [onFunctionsMenuOpenChange, onFunctionsMenuFocusSectionChange]);

  const openFunctions = useCallback(() => {
    onFunctionsMenuFocusSectionChange(null);
    onFunctionsMenuOpenChange(true);
  }, [onFunctionsMenuOpenChange, onFunctionsMenuFocusSectionChange]);

  const openSettingsInMenu = useCallback(() => {
    onFunctionsMenuFocusSectionChange("settings");
    onFunctionsMenuOpenChange(true);
  }, [onFunctionsMenuOpenChange, onFunctionsMenuFocusSectionChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeMenu]);

  const handleItem = (item: MegaMenuItemSpec) => {
    onMegaItemActivate(item);
    closeMenu();
  };

  const functionsExpanded = functionsMenuOpen;

  return (
    <header className="ee-top-nav" role="banner">
      <div className="ee-top-nav-inner">
        <div className="ee-nav-brand">
          <span className="ee-wordmark">Essay Engine</span>
          <span className="ee-wordmark-sub">Source → Draft → Final</span>
        </div>
        <nav className="ee-nav-primary" aria-label="App">
          <button
            type="button"
            className={"ee-nav-trigger ee-nav-trigger--functions" + (functionsExpanded ? " ee-nav-trigger--open" : "")}
            aria-expanded={functionsExpanded}
            aria-haspopup="dialog"
            onClick={() => (functionsMenuOpen ? closeMenu() : openFunctions())}
          >
            Functions <span aria-hidden="true">▾</span>
          </button>
          {trailingActions ? <div className="ee-nav-trailing">{trailingActions}</div> : null}
          <button
            type="button"
            className="ee-nav-trigger ee-nav-trigger--icon-only"
            onClick={openSettingsInMenu}
            aria-label="Settings (open Functions menu)"
            title="Settings"
          >
            ⚙
          </button>
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

      <FeatureMegaMenu
        open={functionsMenuOpen}
        categories={MEGA_MENU_CATEGORIES}
        focusSectionId={functionsMenuFocusSection}
        onClose={closeMenu}
        onItemActivate={handleItem}
      />

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
          min-width: 120px;
        }
        .ee-wordmark {
          font-size: 1.15rem;
          font-weight: 820;
          letter-spacing: -0.02em;
          color: #f1f5f9;
        }
        .ee-wordmark-sub {
          font-size: 11px;
          font-weight: 650;
          color: #64748b;
          letter-spacing: 0.04em;
        }
        .ee-nav-primary {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 10px;
          align-items: center;
          justify-content: flex-end;
          flex: 1;
          min-width: 0;
        }
        .ee-nav-trailing {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 12px;
          flex: 1;
          justify-content: flex-end;
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
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .ee-nav-trigger--functions {
          padding-right: 14px;
        }
        .ee-nav-trigger--icon-only {
          padding: 10px 14px;
          font-size: 16px;
          line-height: 1;
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
          .ee-top-nav {
            margin-bottom: 12px;
            border-radius: 14px;
          }
          .ee-top-nav-inner {
            flex-direction: column;
            align-items: stretch;
            padding: 12px;
            gap: 10px;
          }
          .ee-nav-brand {
            min-width: 0;
          }
          .ee-wordmark {
            font-size: 1.2rem;
          }
          .ee-wordmark-sub {
            font-size: 12px;
          }
          .ee-nav-primary {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            justify-content: stretch;
            gap: 10px;
          }
          .ee-nav-trigger {
            min-height: 46px;
            font-size: 15px;
          }
          .ee-nav-trigger--functions {
            justify-content: center;
          }
          .ee-nav-trailing {
            grid-column: 1 / -1;
            grid-row: 2;
            justify-content: flex-start;
            flex: none;
            width: 100%;
          }
          .ee-workflow-track {
            padding: 8px 10px 10px;
            gap: 8px;
          }
          .ee-workflow-track-label {
            width: 100%;
            min-width: 0;
            font-size: 11px;
          }
          .ee-workflow-track .ee-workflow-ribbon {
            overflow-x: auto;
            flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 2px;
          }
          .ee-ribbon-step {
            font-size: 12px;
            padding: 6px 5px;
          }
        }
      `}</style>
    </header>
  );
}
