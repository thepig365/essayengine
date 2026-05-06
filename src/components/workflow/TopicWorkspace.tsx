"use client";

import type { ReactNode } from "react";
import type { TopicMaterial } from "@/types/workflow";

/**
 * Stage 3: Topic — finalize the selected material as `TopicMaterial`.
 *
 * Important: AI processing in Stage 4 must use `TopicMaterial.content`, never
 * the unselected raw source — unless the user explicitly chose Use full source.
 */
type Props = {
  children: ReactNode;
  active: boolean;
  topicMaterial?: TopicMaterial | null;
};

export function TopicWorkspace({ children, active, topicMaterial }: Props) {
  return (
    <section
      className="topic-workspace"
      data-stage="topic"
      data-topic-saved={topicMaterial?.saved ? "true" : "false"}
      data-topic-uses-full-source={topicMaterial?.useFullSource ? "true" : "false"}
      hidden={!active}
      aria-label="Topic — selected material"
    >
      {children}
    </section>
  );
}
