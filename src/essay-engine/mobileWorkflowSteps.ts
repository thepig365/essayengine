export const MOBILE_WORKFLOW_STEPS = [
  { id: "source", label: "Source", short: "① Source" },
  { id: "engines", label: "Engines", short: "② Engines" },
  { id: "transcript", label: "Transcript", short: "③ Transcript" },
  { id: "structure", label: "Structure", short: "④ Structure" },
  { id: "draft", label: "Draft", short: "⑤ Draft" },
  { id: "mark", label: "Mark", short: "⑥ Mark" },
  { id: "revise", label: "Revise", short: "⑦ Revise" },
  { id: "validate", label: "Validate", short: "⑧ Validate" },
  { id: "assemble", label: "Assemble", short: "⑨ Assemble" },
] as const;

export type MobileWorkflowStepId = (typeof MOBILE_WORKFLOW_STEPS)[number]["id"];

/** How much of the workflow strip to show on each mobile step (desktop console uses `support-rail`). */
export type MobileWorkflowPanelMode =
  | "support-rail"
  | "full"
  | "slice-off"
  | "slice-source"
  | "slice-structure"
  | "slice-structure-builder"
  | "slice-draft-generate"
  | "slice-mark"
  | "slice-revise"
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
    case "structure":
      return "slice-structure-builder";
    case "draft":
      return "slice-draft-generate";
    case "mark":
      return "slice-mark";
    case "revise":
      return "slice-revise";
    case "validate":
      return "slice-diagnose";
    case "assemble":
      return "slice-polish";
    default:
      return "slice-off";
  }
}
