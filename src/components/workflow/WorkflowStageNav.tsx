"use client";

import type { WorkflowStage } from "@/types/workflow";
import { WORKFLOW_STAGES } from "@/types/workflow";

type Props = {
  activeStage: WorkflowStage;
  onStageChange: (stage: WorkflowStage) => void;
  /**
   * Per-stage gate. Stages whose key returns false are still clickable but
   * styled as locked — useful when downstream stages should not be reached
   * before prerequisites exist (e.g. Topic before any segment is selected).
   */
  stageEnabled?: Partial<Record<WorkflowStage, boolean>>;
  variant?: "desktop" | "mobile";
};

/**
 * 5-stage workflow chip nav.
 * The same `activeStage` is shared between Desktop Console View and Mobile
 * Friendly View, so switching layouts preserves the user's position.
 */
export function WorkflowStageNav({
  activeStage,
  onStageChange,
  stageEnabled,
  variant = "desktop",
}: Props) {
  const isDesktop = variant === "desktop";
  return (
    <nav
      className={isDesktop ? "workflow-stage-nav desktop" : "workflow-stage-nav mobile"}
      aria-label="Workflow stages"
    >
      {WORKFLOW_STAGES.map((stage, index) => {
        const isActive = stage.id === activeStage;
        const enabled = stageEnabled?.[stage.id] ?? true;
        const className = ["workflow-stage-chip", isActive ? "active" : "", enabled ? "" : "disabled"]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={stage.id}
            type="button"
            aria-current={isActive ? "step" : undefined}
            aria-disabled={!enabled || undefined}
            className={className}
            onClick={() => onStageChange(stage.id)}
            title={stage.description}
          >
            <span className="workflow-stage-chip-index">{index + 1}</span>
            <span className="workflow-stage-chip-label">{isDesktop ? stage.label : stage.short}</span>
          </button>
        );
      })}

      <style jsx>{`
        .workflow-stage-nav {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          width: 100%;
          min-width: 0;
        }
        .workflow-stage-nav.desktop {
          border: 1px solid #dfe5ec;
          border-radius: 14px;
          background: #ffffff;
          padding: 10px;
          box-shadow: 0 10px 24px rgba(31, 45, 61, 0.05);
        }
        .workflow-stage-nav.mobile {
          overflow-x: auto;
          padding-bottom: 4px;
          flex-wrap: nowrap;
          scrollbar-width: thin;
          overscroll-behavior-x: contain;
        }
        .workflow-stage-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex: 1 1 auto;
          min-width: 130px;
          border: 1px solid #cfd8e3;
          border-radius: 999px;
          background: #f8fafc;
          color: #22303f;
          padding: 10px 14px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          justify-content: center;
        }
        .workflow-stage-nav.mobile .workflow-stage-chip {
          flex: 0 0 auto;
          min-width: 0;
          font-size: 12px;
          min-height: 44px;
        }
        .workflow-stage-chip.active {
          border-color: #1d5f63;
          background: #1d5f63;
          color: #ffffff;
        }
        .workflow-stage-chip.disabled {
          opacity: 0.5;
        }
        .workflow-stage-chip-index {
          display: inline-grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: #d6e3e7;
          color: #174447;
          font-size: 12px;
          font-weight: 900;
        }
        .workflow-stage-chip.active .workflow-stage-chip-index {
          background: #ffffff;
          color: #1d5f63;
        }
      `}</style>
    </nav>
  );
}
