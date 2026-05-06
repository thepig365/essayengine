"use client";

import type { ReactNode } from "react";

/**
 * Stage 2: Extraction — segment view.
 *
 * Allowed:
 *   - timestamp blocks, paragraph blocks, comment blocks
 *   - image/OCR/visual segments (later)
 *   - selection checkboxes, time-range selection
 *
 * Not allowed:
 *   - final writing, translation, summarization
 */
type Props = {
  children: ReactNode;
  active: boolean;
};

export function ExtractionWorkspace({ children, active }: Props) {
  return (
    <section
      className="extraction-workspace"
      data-stage="extraction"
      hidden={!active}
      aria-label="Extraction — segment selection"
    >
      {children}
    </section>
  );
}
