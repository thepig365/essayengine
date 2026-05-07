"use client";

import type { ComponentProps, ReactNode } from "react";
import { EssayDraftWorkspace } from "@/components/EssayDraftWorkspace";
import { FinalPanel } from "@/components/FinalPanel";
import { OutputPanel } from "@/components/OutputPanel";
import {
  DraftGeneratorPanel,
  EssayAssemblyPanel,
  ListenAndMarkPanel,
  ResultValidationPanel,
} from "@/components/essay-engine/panels";
import type { DraftWorkpiece, FinalProduct } from "@/types/workflow";

/**
 * Stage 5: Review & Product — finalize and ship.
 *
 * `layout="split"`: two columns (draft vs final) for desktop triptych — same panels, new geometry.
 */
type Props = {
  children?: ReactNode;
  active?: boolean;
  drafts?: DraftWorkpiece[];
  finalProducts?: FinalProduct[];
  outputPanelProps?: ComponentProps<typeof OutputPanel>;
  draftWorkspaceProps?: ComponentProps<typeof EssayDraftWorkspace>;
  listenPanelContent?: ReactNode;
  beforeFinalPanel?: ReactNode;
  finalPanelProps?: ComponentProps<typeof FinalPanel>;
  /** Desktop canvas: stack (default) vs split draft/final columns inside `work-column`. */
  layout?: "stack" | "split";
  /**
   * Desktop Advanced Studio: group AI Output + Draft and Listen + Final into closed `<details>` sections
   * instead of a wide two-column split (panels stay mounted; handlers unchanged).
   */
  reviewPanelsAsCollapsedDetails?: boolean;
};

export function ReviewProductWorkspace({
  children,
  active = true,
  drafts,
  finalProducts,
  outputPanelProps,
  draftWorkspaceProps,
  listenPanelContent,
  beforeFinalPanel,
  finalPanelProps,
  layout = "stack",
  reviewPanelsAsCollapsedDetails = false,
}: Props) {
  const hasDraft = (drafts?.length ?? 0) > 0;
  const hasFinal = (finalProducts?.length ?? 0) > 0;
  const hasExtractedPanels = Boolean(outputPanelProps || draftWorkspaceProps || listenPanelContent || beforeFinalPanel || finalPanelProps);

  const draftStack = (
    <>
      {outputPanelProps ? (
        <ResultValidationPanel className="ee-narrow-step-draft ee-narrow-step-validate">
          <OutputPanel {...outputPanelProps} />
        </ResultValidationPanel>
      ) : null}

      {draftWorkspaceProps ? (
        <DraftGeneratorPanel className="ee-narrow-step-assemble ee-narrow-step-publish">
          <EssayDraftWorkspace {...draftWorkspaceProps} />
        </DraftGeneratorPanel>
      ) : null}
    </>
  );

  const finalStack = (
    <>
      {listenPanelContent ? <ListenAndMarkPanel className="ee-narrow-step-mark">{listenPanelContent}</ListenAndMarkPanel> : null}

      {beforeFinalPanel || finalPanelProps ? (
        <EssayAssemblyPanel className="ee-narrow-step-assemble ee-narrow-step-publish">
          {beforeFinalPanel}
          {finalPanelProps ? <FinalPanel {...finalPanelProps} /> : null}
        </EssayAssemblyPanel>
      ) : null}
    </>
  );

  if (hasExtractedPanels) {
    if (layout === "split" && reviewPanelsAsCollapsedDetails) {
      return (
        <>
          <details className="ee-studio-panel-details ee-studio-panel-details--output">
            <summary className="ee-studio-panel-details-summary">Output and Draft</summary>
            <div className="ee-studio-panel-details-body">{draftStack}</div>
          </details>
          <details className="ee-studio-panel-details ee-studio-panel-details--listen">
            <summary className="ee-studio-panel-details-summary">Listen and Final</summary>
            <div className="ee-studio-panel-details-body">{finalStack}</div>
          </details>
          {children}
        </>
      );
    }

    if (layout === "split") {
      return (
        <>
          <div className="ee-triptych-draft-row">
            <div className="ee-split-draft ee-triptych-draft-col">{draftStack}</div>
            <div className="ee-split-final ee-triptych-final-col">{finalStack}</div>
          </div>
          {children}
          <style jsx global>{`
            .workspace.ee-desktop-triptych:not(.ee-narrow) .desktop-console-layout > .work-column > .ee-triptych-draft-row {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
              gap: 14px;
              align-items: stretch;
              min-height: 0;
              flex: 1;
            }
            .workspace.ee-desktop-triptych:not(.ee-narrow)[data-workflow-step]
              .desktop-console-layout
              > .work-column
              > .ee-triptych-draft-row
              > .ee-split-draft,
            .workspace.ee-desktop-triptych:not(.ee-narrow)[data-workflow-step]
              .desktop-console-layout
              > .work-column
              > .ee-triptych-draft-row
              > .ee-split-final {
              display: flex !important;
              flex-direction: column;
              gap: 14px;
              min-width: 0;
              min-height: 0;
              overflow: auto;
            }
            .workspace.ee-desktop-triptych:not(.ee-narrow) .ee-split-draft .ee-narrow-step-draft,
            .workspace.ee-desktop-triptych:not(.ee-narrow) .ee-split-draft .ee-narrow-step-validate,
            .workspace.ee-desktop-triptych:not(.ee-narrow) .ee-split-draft .ee-narrow-step-assemble,
            .workspace.ee-desktop-triptych:not(.ee-narrow) .ee-split-draft .ee-narrow-step-publish,
            .workspace.ee-desktop-triptych:not(.ee-narrow) .ee-split-final .ee-narrow-step-mark,
            .workspace.ee-desktop-triptych:not(.ee-narrow) .ee-split-final .ee-narrow-step-assemble,
            .workspace.ee-desktop-triptych:not(.ee-narrow) .ee-split-final .ee-narrow-step-publish {
              display: block !important;
            }
          `}</style>
        </>
      );
    }

    return (
      <>
        {draftStack}
        {finalStack}
        {children}
        <style jsx global>{`
          .workspace:not(.ee-narrow)[data-workflow-step] .desktop-console-layout > .work-column > .ee-narrow-step-draft,
          .workspace:not(.ee-narrow)[data-workflow-step] .desktop-console-layout > .work-column > .ee-narrow-step-validate,
          .workspace:not(.ee-narrow)[data-workflow-step] .desktop-console-layout > .work-column > .ee-narrow-step-mark,
          .workspace:not(.ee-narrow)[data-workflow-step] .desktop-console-layout > .work-column > .ee-narrow-step-assemble,
          .workspace:not(.ee-narrow)[data-workflow-step] .desktop-console-layout > .work-column > .ee-narrow-step-publish {
            display: none !important;
          }
          .workspace:not(.ee-narrow)[data-workflow-step="workpiece"] .desktop-console-layout > .work-column > .ee-narrow-step-draft {
            display: block !important;
          }
          .workspace:not(.ee-narrow)[data-workflow-step="refine"] .desktop-console-layout > .work-column > .ee-narrow-step-mark,
          .workspace:not(.ee-narrow)[data-workflow-step="refine"] .desktop-console-layout > .work-column > .ee-narrow-step-validate {
            display: block !important;
          }
          .workspace:not(.ee-narrow)[data-workflow-step="publish"] .desktop-console-layout > .work-column > .ee-narrow-step-assemble,
          .workspace:not(.ee-narrow)[data-workflow-step="publish"] .desktop-console-layout > .work-column > .ee-narrow-step-publish {
            display: block !important;
          }
          @media (max-width: 1023px) {
            .workspace.ee-narrow.ee-shell-workspace .desktop-console-layout > .work-column > .ee-narrow-step-draft,
            .workspace.ee-narrow.ee-shell-workspace .desktop-console-layout > .work-column > .ee-narrow-step-validate,
            .workspace.ee-narrow.ee-shell-workspace .desktop-console-layout > .work-column > .ee-narrow-step-mark,
            .workspace.ee-narrow.ee-shell-workspace .desktop-console-layout > .work-column > .ee-narrow-step-assemble,
            .workspace.ee-narrow.ee-shell-workspace .desktop-console-layout > .work-column > .ee-narrow-step-publish {
              display: none !important;
            }
            .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="workpiece"]
              .desktop-console-layout
              > .work-column
              > .ee-narrow-step-draft {
              display: block !important;
            }
            .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="refine"]
              .desktop-console-layout
              > .work-column
              > .ee-narrow-step-mark,
            .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="refine"]
              .desktop-console-layout
              > .work-column
              > .ee-narrow-step-validate {
              display: block !important;
            }
            .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="publish"]
              .desktop-console-layout
              > .work-column
              > .ee-narrow-step-publish,
            .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="publish"]
              .desktop-console-layout
              > .work-column
              > .ee-narrow-step-assemble {
              display: block !important;
            }
          }
        `}</style>
      </>
    );
  }

  return (
    <section
      className="review-product-workspace"
      data-stage="review_product"
      data-has-draft={hasDraft ? "true" : "false"}
      data-has-final={hasFinal ? "true" : "false"}
      hidden={!active}
      aria-label="Review and Product — finalize"
    >
      {children}
    </section>
  );
}
