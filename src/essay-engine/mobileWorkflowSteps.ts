/** Single shared workflow spine (desktop + mobile). Display names follow the V2 five-stage model; `id` values stay stable for CSS and routing. */
export const MOBILE_WORKFLOW_STEPS = [
  { id: "source", label: "Material", short: "Material" },
  { id: "request", label: "Extraction", short: "Extract" },
  { id: "workpiece", label: "Topic", short: "Topic" },
  /** Main canvas: full Processing Studio (`ProcessingWorkspace` controls) mounts in `work-column` on this step — see EngineForm. */
  { id: "refine", label: "Processing", short: "Process" },
  { id: "publish", label: "Review / Product", short: "Review" },
] as const;

export type MobileWorkflowStepId = (typeof MOBILE_WORKFLOW_STEPS)[number]["id"];

/** How much of the workflow strip to show per step in narrow view (`support-rail` on desktop). */
export type MobileWorkflowPanelMode =
  | "support-rail"
  | "full"
  | "slice-off"
  | "slice-source"
  | "slice-structure"
  | "slice-structure-builder"
  | "slice-draft-generate"
  | "slice-workpiece"
  | "slice-mark"
  | "slice-revise"
  | "slice-refine"
  | "slice-diagnose"
  | "slice-polish";

export function resolveMobileWorkflowPanelMode(
  isDesktop: boolean,
  stepId: MobileWorkflowStepId | undefined,
): MobileWorkflowPanelMode {
  if (isDesktop || !stepId) return "slice-off";
  switch (stepId) {
    case "source":
      return "slice-source";
    case "request":
      return "slice-off";
    case "workpiece":
      return "slice-workpiece";
    case "refine":
      return "slice-refine";
    case "publish":
      return "slice-polish";
    default:
      return "slice-off";
  }
}
