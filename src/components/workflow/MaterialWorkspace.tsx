"use client";

import type { ReactNode } from "react";

/**
 * Stage 1: Material — raw inputs only.
 *
 * Allowed:
 *   - text input, URL input, file upload
 *   - YouTube transcript fetch, webpage extraction
 *   - document/audio/image hooks
 *
 * Not allowed:
 *   - write article / translate / summarize / generate final content
 *
 * Thin shell only — EngineForm wiring lands in a later change.
 */
type Props = {
  children: ReactNode;
  active: boolean;
};

export function MaterialWorkspace({ children, active }: Props) {
  return (
    <section
      className="material-workspace"
      data-stage="material"
      hidden={!active}
      aria-label="Material — raw inputs"
    >
      {children}
    </section>
  );
}
