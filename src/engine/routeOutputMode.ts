import type { EngineRequest, ResolvedOutputMode } from "@/types/engine";

const TEXT_NODE_PHRASES = [
  "only change text",
  "only change visible text",
  "text nodes only",
  "safe replacement",
  "do not change code",
  "keep structure exactly",
];

const DIFF_PHRASES = ["diff", "patch", "cursor apply", "show only changes", "safe apply"];

const SAME_FORMAT_PHRASES = [
  "same format",
  "preserve format",
  "keep html",
  "preserve html",
  "keep markdown",
  "keep jsx",
  "replace existing page",
  "cursor replacement",
];

const STRUCTURED_PHRASES = ["json", "structured data", "template", "cms", "content object", "fields"];

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export function routeOutputMode(request: EngineRequest): ResolvedOutputMode {
  if (request.outputMode && request.outputMode !== "auto") {
    return request.outputMode;
  }

  const signal = [
    request.input ?? "",
    request.userInstruction ?? "",
    request.task ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (containsAny(signal, TEXT_NODE_PHRASES)) return "text_node_only";
  if (containsAny(signal, DIFF_PHRASES)) return "diff";
  if (containsAny(signal, SAME_FORMAT_PHRASES)) return "same_format";
  if (containsAny(signal, STRUCTURED_PHRASES)) return "structured_data";

  return "content_only";
}
