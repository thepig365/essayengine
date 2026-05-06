"use client";

import type { ReactNode } from "react";
import type { ProcessingLayer, TopicMaterial } from "@/types/workflow";

/**
 * Stage 4: Processing — AI transforms over `TopicMaterial.content`.
 *
 * Disabled until `TopicMaterial.content` exists. AI calls MUST send
 * TopicMaterial.content as input (never the raw original source) unless
 * `topicMaterial.useFullSource === true`.
 */
type Props = {
  children: ReactNode;
  active: boolean;
  topicMaterial?: TopicMaterial | null;
  layer?: ProcessingLayer;
};

export const PROCESSING_LAYERS: ReadonlyArray<{ id: ProcessingLayer; label: string }> = [
  { id: "understanding", label: "Understanding" },
  { id: "topic_transform", label: "Topic Transform" },
  { id: "structure", label: "Structure" },
  { id: "creation", label: "Creation" },
  { id: "translation", label: "Translation" },
  { id: "style_revision", label: "Style Revision" },
];

export function ProcessingWorkspace({ children, active, topicMaterial, layer }: Props) {
  const ready = Boolean(topicMaterial && (topicMaterial.content.trim() || topicMaterial.useFullSource));
  return (
    <section
      className="processing-workspace"
      data-stage="processing"
      data-processing-ready={ready ? "true" : "false"}
      data-processing-layer={layer}
      hidden={!active}
      aria-label="Processing — apply AI layers"
      aria-disabled={!ready || undefined}
    >
      {children}
    </section>
  );
}
