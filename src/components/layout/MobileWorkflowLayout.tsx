"use client";

import { MOBILE_WORKFLOW_STEPS } from "@/essay-engine/mobileWorkflowSteps";

type Props = {
  activeStepIndex: number;
  onActiveStepIndexChange: (index: number) => void;
  /** Shown on the Draft step — runs the main engine generate action. */
  onPrimaryWorkspaceAction?: () => void;
  primaryWorkspaceDisabled?: boolean;
  primaryWorkspaceLabel?: string;
  desktopMinWidth: number;
};

/**
 * Sticky shell for narrow viewports: step chips, Back/Next + optional primary action on Draft.
 */
export function MobileWorkflowLayout({
  activeStepIndex,
  onActiveStepIndexChange,
  onPrimaryWorkspaceAction,
  primaryWorkspaceDisabled,
  primaryWorkspaceLabel,
  desktopMinWidth,
}: Props) {
  const step = MOBILE_WORKFLOW_STEPS[activeStepIndex];
  const stepId = step?.id;
  const canBack = activeStepIndex > 0;
  const canNext = activeStepIndex < MOBILE_WORKFLOW_STEPS.length - 1;
  const showPrimary =
    stepId === "draft" && typeof onPrimaryWorkspaceAction === "function";

  return (
    <div className="mobile-workflow-shell" aria-label="Mobile workflow">
      <header className="mobile-workflow-topbar">
        <strong className="mobile-workflow-app-title">Essay Engine</strong>
        <span className="mobile-workflow-step-pill" aria-live="polite">
          {step?.label ?? "Step"}
        </span>
      </header>

      <div className="mobile-workflow-step-chips" role="tablist" aria-label="Workflow steps">
        {MOBILE_WORKFLOW_STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === activeStepIndex}
            className={i === activeStepIndex ? "mobile-step-chip active" : "mobile-step-chip"}
            onClick={() => onActiveStepIndexChange(i)}
          >
            {s.short}
          </button>
        ))}
      </div>

      <p className="mobile-workflow-hint">
        Below {desktopMinWidth}px (or Mobile Friendly View) each step shows one main screen. Use the chips or Back / Next
        to move through Source → Assemble. Resize or toggle view mode to preview.
      </p>

      <nav
        className={showPrimary ? "mobile-workflow-bottom-actions three-col" : "mobile-workflow-bottom-actions"}
        aria-label="Step navigation"
      >
        <button
          type="button"
          className="mobile-step-back"
          disabled={!canBack}
          onClick={() => onActiveStepIndexChange(activeStepIndex - 1)}
        >
          Back
        </button>
        <button
          type="button"
          className="mobile-step-next"
          disabled={!canNext}
          onClick={() => onActiveStepIndexChange(activeStepIndex + 1)}
        >
          Next
        </button>
        {showPrimary ? (
          <button
            type="button"
            className="mobile-step-primary"
            disabled={primaryWorkspaceDisabled}
            onClick={onPrimaryWorkspaceAction}
            aria-label={primaryWorkspaceLabel ?? "Generate"}
          >
            {primaryWorkspaceLabel ?? "Generate"}
          </button>
        ) : null}
      </nav>

      <style jsx>{`
        .mobile-workflow-shell {
          display: grid;
          gap: 12px;
          border: 1px solid #dfe5ec;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 14px 34px rgba(31, 45, 61, 0.07);
          padding: 14px;
          min-width: 0;
          max-width: 100%;
        }
        .mobile-workflow-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 44px;
        }
        .mobile-workflow-app-title {
          color: #17202a;
          font-size: 15px;
        }
        .mobile-workflow-step-pill {
          border: 1px solid #cfe3e1;
          border-radius: 999px;
          background: #f1f8f7;
          color: #174447;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 800;
          max-width: 52%;
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mobile-workflow-step-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          overflow-x: hidden;
          padding-bottom: 4px;
          min-height: 48px;
          align-items: center;
        }
        .mobile-step-chip {
          flex: 0 0 auto;
          border: 1px solid #cfd8e3;
          border-radius: 999px;
          background: #f8fafc;
          color: #22303f;
          padding: 10px 14px;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          min-height: 44px;
          cursor: pointer;
        }
        .mobile-step-chip.active {
          border-color: #1d5f63;
          background: #1d5f63;
          color: #ffffff;
        }
        .mobile-workflow-hint {
          margin: 0;
          color: #617080;
          font-size: 13px;
          line-height: 1.45;
        }
        .mobile-workflow-hint strong {
          color: #285b5d;
          font-weight: 850;
        }
        .mobile-workflow-bottom-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          position: sticky;
          bottom: 0;
          padding-top: 6px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0), #ffffff 18%);
        }
        .mobile-workflow-bottom-actions.three-col {
          grid-template-columns: 1fr 1fr 1fr;
        }
        .mobile-workflow-bottom-actions button {
          min-height: 48px;
          border-radius: 12px;
          font: inherit;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
        }
        .mobile-step-back {
          border: 1px solid #cfd8e3;
          background: #f8fafc;
          color: #22303f;
        }
        .mobile-step-back:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .mobile-step-next {
          border: 1px solid #1d5f63;
          background: #1d5f63;
          color: #ffffff;
        }
        .mobile-step-next:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .mobile-step-primary {
          border: 1px solid #174447;
          background: #174447;
          color: #ffffff;
        }
        .mobile-step-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
