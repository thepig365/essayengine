/**
 * Shared guards and fingerprinting helpers for the Topic Material runtime
 * contract. Pure functions only — UI binding lives in EngineForm.
 *
 * Contract:
 *   - Processing must use TopicMaterial.content only.
 *   - Full source is allowed only when topicMaterial.useFullSource is true.
 *   - Generation paths must not run when no topic is saved.
 */

import type { TopicMaterial } from "@/types/workflow";

/**
 * True if a Processing-stage AI call may run against this topic.
 * Both branches require non-empty content; useFullSource alone does not
 * substitute for actual content (the topic content is built from the source
 * text either way).
 */
export function canProcessTopicMaterial(
  topicMaterial: TopicMaterial | null | undefined,
): topicMaterial is TopicMaterial {
  return Boolean(topicMaterial && topicMaterial.content.trim().length > 0);
}

/**
 * Lightweight, dependency-free fingerprint for the underlying source text.
 * Intentionally NOT a cryptographic hash — just stable enough to detect that
 * the source the user saved a topic from has materially changed.
 *
 * Components: total length + first 200 chars + last 200 chars, joined.
 * Whitespace-only diffs at the ends still register as changes; that is
 * acceptable for a "may be stale" warning.
 */
export function computeSourceFingerprint(text: string | null | undefined): string {
  const value = (text ?? "").trim();
  if (!value) return "empty:0";
  const head = value.slice(0, 200);
  const tail = value.length > 200 ? value.slice(-200) : "";
  return `len:${value.length}|head:${head}|tail:${tail}`;
}

/**
 * True when a topic was saved against an earlier source state and the
 * current source text no longer matches that fingerprint. Returns false
 * when there is no topic or no fingerprint to compare against.
 */
export function isTopicMaterialStale(
  topicMaterial: TopicMaterial | null | undefined,
  savedFingerprint: string | null | undefined,
  currentFingerprint: string,
): boolean {
  if (!topicMaterial) return false;
  if (!savedFingerprint) return false;
  return savedFingerprint !== currentFingerprint;
}

/** Standard bilingual block message for guards that prevent processing. */
export const TOPIC_MATERIAL_REQUIRED_MESSAGE =
  "Save a topic in the Topic stage before processing.";

/** Standard bilingual stale-topic warning for the Topic preview panel. */
export const TOPIC_MATERIAL_STALE_MESSAGE =
  "Topic may be stale — the source has changed since this topic was saved. Please save again.";
