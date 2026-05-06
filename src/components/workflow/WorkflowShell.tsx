"use client";

import type { ReactNode } from "react";
import type { WorkflowStage } from "@/types/workflow";
import { WORKFLOW_STAGES } from "@/types/workflow";

type Props = {
  activeStage: WorkflowStage;
  children: ReactNode;
};

/**
 * Outer shell that exposes `data-active-stage` so panel-level CSS can route
 * which workspace shows in the center column for both desktop and mobile.
 *
 * Children of this shell should mark themselves with `data-stage="<stage>"`
 * (or rely on existing `ee-step-*` classNames) so the gating CSS in
 * EngineForm picks them up.
 */
export function WorkflowShell({ activeStage, children }: Props) {
  return (
    <div
      className="workflow-shell"
      data-active-stage={activeStage}
      data-stage-label={WORKFLOW_STAGES.find((s) => s.id === activeStage)?.label}
    >
      {children}
    </div>
  );
}
