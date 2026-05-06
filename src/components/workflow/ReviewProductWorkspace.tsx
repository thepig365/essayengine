"use client";

import type { ReactNode } from "react";
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
  children: ReactNode;
  active: boolean;
  drafts?: DraftWorkpiece[];
  finalProducts?: FinalProduct[];
};

export function ReviewProductWorkspace({ children, active, drafts, finalProducts }: Props) {
  const hasDraft = (drafts?.length ?? 0) > 0;
  const hasFinal = (finalProducts?.length ?? 0) > 0;
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
