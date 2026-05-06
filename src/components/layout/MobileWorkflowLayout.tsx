"use client";

import { WorkflowStepChips } from "@/components/layout/WorkflowStepChips";
import { MOBILE_WORKFLOW_STEPS } from "@/essay-engine/mobileWorkflowSteps";

type Props = {
  activeStepIndex: number;
  onActiveStepIndexChange: (index: number) => void;
  /** Shown on the Workpiece step — runs the main engine generate action. */
  onPrimaryWorkspaceAction?: () => void;
  primaryWorkspaceDisabled?: boolean;
  primaryWorkspaceLabel?: string;
};

/**
 * Sticky shell for narrow viewports: step chips (primary nav) + optional Draft generate.
 */
export function MobileWorkflowLayout({
  activeStepIndex,
  onActiveStepIndexChange,
  onPrimaryWorkspaceAction,
  primaryWorkspaceDisabled,
  primaryWorkspaceLabel,
}: Props) {
  const step = MOBILE_WORKFLOW_STEPS[activeStepIndex];
  const stepId = step?.id;
  const showPrimary =
    stepId === "workpiece" && typeof onPrimaryWorkspaceAction === "function";

  return (
    <div className="mobile-workflow-shell" aria-label="Mobile workflow">
      <header className="mobile-workflow-topbar">
        <strong className="mobile-workflow-app-title">Essay Engine</strong>
        <span className="mobile-workflow-step-pill" aria-live="polite">
          {step?.label ?? "Step"}
        </span>
      </header>

      <WorkflowStepChips
        variant="mobile"
        activeStepIndex={activeStepIndex}
        onStepIndexChange={onActiveStepIndexChange}
      />

      {showPrimary ? (
        <div className="mobile-workflow-primary-row">
          <button
            type="button"
            className="mobile-step-primary"
            disabled={primaryWorkspaceDisabled}
            onClick={onPrimaryWorkspaceAction}
            aria-label={primaryWorkspaceLabel ?? "Generate"}
          >
            {primaryWorkspaceLabel ?? "Generate"}
          </button>
        </div>
      ) : null}

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
        .mobile-workflow-primary-row {
          display: flex;
          min-width: 0;
        }
        .mobile-step-primary {
          flex: 1;
          min-height: 48px;
          border-radius: 12px;
          font: inherit;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
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
