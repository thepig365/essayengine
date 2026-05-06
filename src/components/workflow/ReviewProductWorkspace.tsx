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
 * Allowed:
 *   - output preview, listen / TTS preview
 *   - revise / rewrite actions, save as draft
 *   - save as final product, version & status controls
 *   - export / copy actions
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
}: Props) {
  const hasDraft = (drafts?.length ?? 0) > 0;
  const hasFinal = (finalProducts?.length ?? 0) > 0;
  const hasExtractedPanels = Boolean(outputPanelProps || draftWorkspaceProps || listenPanelContent || beforeFinalPanel || finalPanelProps);

  if (hasExtractedPanels) {
    return (
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

        {listenPanelContent ? <ListenAndMarkPanel className="ee-narrow-step-mark">{listenPanelContent}</ListenAndMarkPanel> : null}

        {beforeFinalPanel || finalPanelProps ? (
          <EssayAssemblyPanel className="ee-narrow-step-assemble ee-narrow-step-publish">
            {beforeFinalPanel}
            {finalPanelProps ? <FinalPanel {...finalPanelProps} /> : null}
          </EssayAssemblyPanel>
        ) : null}

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
