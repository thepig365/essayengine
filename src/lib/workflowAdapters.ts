/**
 * Adapters between legacy types (TranscriptSegment, ad-hoc source segments) and
 * the canonical workflow domain model in `src/types/workflow.ts`.
 *
 * These exist so the new 5-stage workflow can be introduced without rewriting
 * existing transcript / source pipelines yet.
 */

import type { TranscriptSegment } from "@/types/engine";
import type {
  CanonicalSource,
  CanonicalSourceSegment,
  SourceKind,
  TopicMaterial,
} from "@/types/workflow";

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `${prefix}-${ts}-${rand}`;
}

/** Convert a legacy YouTube/transcript segment into a canonical timestamp segment. */
export function transcriptSegmentToCanonicalSourceSegment(
  segment: TranscriptSegment,
  sourceId: string,
  options?: { selected?: boolean; index?: number },
): CanonicalSourceSegment {
  const start = segment.start;
  const end =
    typeof segment.duration === "number" ? segment.start + segment.duration : undefined;
  return {
    id: makeId(`seg-ts-${options?.index ?? Math.floor(start)}`),
    sourceId,
    type: "timestamp",
    startTime: start,
    endTime: end,
    text: segment.text,
    selected: options?.selected ?? false,
  };
}

/**
 * Generic shape for ad-hoc paragraph/comment segments collected by the legacy
 * transcript workspace. The hook returns slightly different shapes — we only
 * require `id`, `text`, and an optional `title`/`label`.
 */
type LegacyPlainSegment = {
  id?: string;
  text: string;
  title?: string;
  label?: string;
  author?: string;
  start?: number;
  end?: number;
};

export function sourceMaterialSegmentToCanonicalSourceSegment(
  segment: LegacyPlainSegment,
  sourceId: string,
  type: CanonicalSourceSegment["type"] = "paragraph",
  options?: { selected?: boolean },
): CanonicalSourceSegment {
  return {
    id: segment.id ?? makeId(`seg-${type}`),
    sourceId,
    type,
    startTime: segment.start,
    endTime: segment.end,
    label: segment.title ?? segment.label,
    author: segment.author,
    text: segment.text,
    selected: options?.selected ?? false,
  };
}

/** Build a TopicMaterial from a set of selected canonical segments. */
export function buildTopicMaterialFromSegments(
  source: Pick<CanonicalSource, "id" | "type">,
  segments: CanonicalSourceSegment[],
  overrides?: Partial<Pick<TopicMaterial, "title" | "notes" | "tags" | "selectedRange">>,
): TopicMaterial {
  const selected = segments.filter((segment) => segment.selected);
  const ordered = selected.slice().sort((a, b) => {
    const aStart = a.startTime ?? 0;
    const bStart = b.startTime ?? 0;
    return aStart - bStart;
  });
  const content = ordered.map((segment) => segment.text.trim()).filter(Boolean).join("\n\n");
  return {
    id: makeId("topic"),
    sourceId: source.id,
    sourceType: source.type,
    selectedSegmentIds: ordered.map((segment) => segment.id),
    selectedRange: overrides?.selectedRange,
    content,
    title: overrides?.title,
    notes: overrides?.notes,
    tags: overrides?.tags,
    useFullSource: false,
    saved: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Explicit "use the full original source" path. Sets `useFullSource: true` and
 * copies the raw source content. Should only be invoked when the user pressed
 * a clearly-labeled "Use full source" control.
 */
export function buildTopicMaterialFromFullSource(
  source: CanonicalSource,
  overrides?: Partial<Pick<TopicMaterial, "title" | "notes" | "tags">>,
): TopicMaterial {
  return {
    id: makeId("topic-full"),
    sourceId: source.id,
    sourceType: source.type,
    selectedSegmentIds: [],
    content: source.rawContent ?? "",
    title: overrides?.title ?? source.title,
    notes: overrides?.notes,
    tags: overrides?.tags,
    useFullSource: true,
    saved: false,
    createdAt: new Date().toISOString(),
  };
}

const URL_LIKE = /^(https?:\/\/|www\.)\S+$/i;
const URL_INSIDE = /(https?:\/\/|www\.)\S+/i;

/**
 * True if the given string looks like a URL — used to redirect URLs that the
 * user pasted into an instruction field back to the Material capture surface.
 *
 * `strict` (default) only flags strings that are predominantly a URL.
 * Pass `{ anywhere: true }` to flag any string that contains a URL substring.
 */
export function isProbablyUrl(
  value: string,
  options: { anywhere?: boolean } = {},
): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (options.anywhere) return URL_INSIDE.test(trimmed);
  return URL_LIKE.test(trimmed);
}
