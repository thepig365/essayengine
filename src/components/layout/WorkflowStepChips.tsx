"use client";

import { MOBILE_WORKFLOW_STEPS } from "@/essay-engine/mobileWorkflowSteps";

type Props = {
  activeStepIndex: number;
  onStepIndexChange: (index: number) => void;
  /** Styling preset: mobile shell vs desktop console bar. */
  variant: "mobile" | "desktop";
};

export function WorkflowStepChips({ activeStepIndex, onStepIndexChange, variant }: Props) {
  return (
    <div
      className={`ee-workflow-step-chips ee-workflow-step-chips--${variant}`}
      role="tablist"
      aria-label="Workflow steps"
    >
      {MOBILE_WORKFLOW_STEPS.map((s, i) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={i === activeStepIndex}
          className={i === activeStepIndex ? "ee-step-chip ee-step-chip-active" : "ee-step-chip"}
          onClick={() => onStepIndexChange(i)}
        >
          {s.short}
        </button>
      ))}
      <style jsx>{`
        .ee-workflow-step-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          overflow-x: hidden;
          min-width: 0;
          max-width: 100%;
          align-items: center;
        }
        .ee-workflow-step-chips--desktop {
          padding: 4px 0 10px;
          border-bottom: 1px solid #263746;
          margin-bottom: 10px;
        }
        .ee-step-chip {
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
        .ee-workflow-step-chips--desktop .ee-step-chip {
          border-color: #334657;
          background: #16212b;
          color: #d8dee8;
        }
        .ee-workflow-step-chips--desktop .ee-step-chip-active {
          border-color: #3f8f8a;
          background: #1e3a3a;
          color: #e6edf3;
        }
        .ee-step-chip-active {
          border-color: #1d5f63;
          background: #1d5f63;
          color: #ffffff;
        }
      `}</style>
    </div>
  );
}
