"use client";

import { useMemo, useState } from "react";
import type {
  EngineTask,
  LLMProvider,
  TranscriptSegment,
} from "@/types/engine";
import type {
  FinalResultSelection,
  ResultStatus,
  SavedEssayEngineProjectState,
  SourceVersion,
  SourceVersionOrigin,
} from "@/lib/projectStorage";

export type SourceType =
  | "manual_input"
  | "webpage_content"
  | "youtube_url"
  | "youtube_transcript_full"
  | "youtube_transcript_full_sections"
  | "youtube_transcript_range"
  | "youtube_transcript_range_sections"
  | "youtube_transcript_selected_sections"
  | "youtube_transcript_selected_ranges"
  | "youtube_transcript_selected_chapters"
  | "mixed_source_content"
  | "selected_result"
  | "essay_draft";

export type TranscriptOrigin = "none" | "fetched transcript" | "saved transcript";

export type ManualTranscriptRange = {
  id: string;
  start: string;
  end: string;
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  manual_input: "Manual input",
  webpage_content: "Webpage content",
  youtube_url: "URL only (no transcript)",
  youtube_transcript_full: "Full YouTube transcript",
  youtube_transcript_full_sections: "Full transcript sections",
  youtube_transcript_range: "Selected transcript range",
  youtube_transcript_range_sections: "Selected transcript range, organized into sections",
  youtube_transcript_selected_sections: "Selected YouTube sections",
  youtube_transcript_selected_ranges: "Selected transcript ranges",
  youtube_transcript_selected_chapters: "Selected YouTube chapters",
  mixed_source_content: "Mixed source content",
  selected_result: "Selected result",
  essay_draft: "Essay draft",
};

type CreateSourceVersionInput = {
  content: string;
  origin: SourceVersionOrigin;
  label: string;
  task?: EngineTask;
  provider?: LLMProvider;
  parentVersionId?: string;
};

type UseTranscriptWorkspaceParams = {
  sourceChipHelper: string;
  essayDraftTitle: string;
  setResultStatus: (status: ResultStatus) => void;
  setFinalResult: (result: FinalResultSelection | null) => void;
  setProjectStatus: (message: string | null) => void;
};

export function makeRangeId(): string {
  return `range-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeSourceVersionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `source-version-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function countWords(text: string): number {
  return text.trim().match(/[\p{L}\p{N}'-]+/gu)?.length ?? 0;
}

function normalizeVersionContent(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

const YOUTUBE_RE = /^https?:\/\/(?:(?:www\.|m\.)?youtube\.com\/(?:watch\?[^ ]*v=|shorts\/)|youtu\.be\/)[\w-]{11}/i;
const WEBPAGE_RE = /^https?:\/\/\S+$/i;

export function useTranscriptWorkspace({
  sourceChipHelper,
  essayDraftTitle,
  setResultStatus,
  setFinalResult,
  setProjectStatus,
}: UseTranscriptWorkspaceParams) {
  const [input, setInput] = useState("");
  const [transcriptStatus, setTranscriptStatus] = useState<string | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [transcriptOrigin, setTranscriptOrigin] = useState<TranscriptOrigin>("none");
  const [youtubeSourceUrl, setYoutubeSourceUrl] = useState("");
  const [selectedRangeStart, setSelectedRangeStart] = useState("");
  const [selectedRangeEnd, setSelectedRangeEnd] = useState("");
  const [manualRanges, setManualRanges] = useState<ManualTranscriptRange[]>([
    { id: makeRangeId(), start: "", end: "" },
  ]);
  const [timestampChapterInput, setTimestampChapterInput] = useState("");
  const [chapterSectionsGenerated, setChapterSectionsGenerated] = useState(false);
  const [checkedFullSectionIds, setCheckedFullSectionIds] = useState<string[]>([]);
  const [checkedChapterIds, setCheckedChapterIds] = useState<string[]>([]);
  const [includeTranscriptTimestamps, setIncludeTranscriptTimestamps] = useState(false);
  const [fullSectionStatus, setFullSectionStatus] = useState<string | null>(null);
  const [chapterStatus, setChapterStatus] = useState<string | null>(null);
  const [rangeStatus, setRangeStatus] = useState<string | null>(null);
  const [topicInput, setTopicInput] = useState("");
  const [topicMatchedSectionIds, setTopicMatchedSectionIds] = useState<string[]>([]);
  const [checkedTopicSectionIds, setCheckedTopicSectionIds] = useState<string[]>([]);
  const [topicStatus, setTopicStatus] = useState<string | null>(null);
  const [organizeTranscriptSections, setOrganizeTranscriptSections] = useState(true);
  const [sourceType, setSourceType] = useState<SourceType>("manual_input");
  const [sourceFrom, setSourceFrom] = useState("manual input");
  const [sourceSelectionCount, setSourceSelectionCount] = useState(0);
  const [sourceActionStatus, setSourceActionStatus] = useState<string | null>(null);
  const [sourceVersions, setSourceVersions] = useState<SourceVersion[]>([]);
  const [currentSourceVersionId, setCurrentSourceVersionId] = useState<string | null>(null);
  const [finalVersionId, setFinalVersionId] = useState<string | null>(null);
  const [viewedSourceVersionId, setViewedSourceVersionId] = useState<string | null>(null);

  const isYouTubeUrl = useMemo(() => YOUTUBE_RE.test(input.trim()), [input]);
  const isWebpageUrl = useMemo(() => WEBPAGE_RE.test(input.trim()) && !isYouTubeUrl, [input, isYouTubeUrl]);
  const currentSourceVersion = sourceVersions.find((version) => version.id === currentSourceVersionId) ?? null;
  const viewedSourceVersion = sourceVersions.find((version) => version.id === viewedSourceVersionId) ?? currentSourceVersion;
  const finalVersion = sourceVersions.find((version) => version.id === finalVersionId) ?? null;
  const transcriptDetectedButUrlOnly = sourceType === "youtube_url" && Boolean(transcriptText) && YOUTUBE_RE.test(input.trim());
  const generateBlocked = transcriptDetectedButUrlOnly;
  const sourceHelper = sourceType === "youtube_transcript_range_sections"
    ? "Selected transcript range is organized into sections and being used as source."
    : sourceType === "youtube_transcript_full_sections"
    ? "Full transcript sections are being used as source."
    : sourceType === "youtube_transcript_range"
    ? "Selected transcript range is being used as source."
    : sourceType === "youtube_transcript_selected_sections"
    ? "Selected transcript sections are being used as source."
    : sourceType === "youtube_transcript_selected_ranges"
    ? "Selected transcript ranges are being used as source."
    : sourceType === "youtube_transcript_selected_chapters"
    ? "Selected YouTube chapters are being used as source."
    : sourceType === "mixed_source_content"
    ? "Mixed source content is being used."
    : sourceType === "youtube_transcript_full"
      ? "YouTube transcript is now used as source."
    : sourceType === "youtube_url"
      ? transcriptText
        ? "Transcript fetched. Choose full transcript, selected sections, or copy text manually."
        : "YouTube URL only. Fetch transcript to use the video content as source."
    : sourceType === "selected_result"
      ? "Selected result is now used as source."
    : isYouTubeUrl
    ? "YouTube source detected. Fetch transcript to use it as source material."
    : isWebpageUrl
      ? "Webpage URL detected. The engine will fetch page content server-side."
      : sourceChipHelper;

  function updateInput(value: string) {
    setInput(value);
    const trimmed = value.trim();
    if (YOUTUBE_RE.test(trimmed)) {
      setYoutubeSourceUrl(trimmed);
      setSourceType("youtube_url");
      setSourceFrom("manual input");
      setSourceSelectionCount(0);
    } else {
      setSourceType(WEBPAGE_RE.test(trimmed) ? "webpage_content" : "manual_input");
      setSourceFrom("manual input");
      setSourceSelectionCount(trimmed ? 1 : 0);
    }
    setSourceActionStatus(null);
  }

  function sourceOriginFromType(type: SourceType): SourceVersionOrigin {
    if (type === "mixed_source_content") return "manual_input";
    if (type === "essay_draft") return "essay_draft";
    if (type === "selected_result") return "generated_result";
    if (type === "youtube_transcript_selected_chapters") return "timestamp_chapters";
    if (type === "youtube_transcript_selected_ranges" || type === "youtube_transcript_range" || type === "youtube_transcript_range_sections") {
      return "manual_range";
    }
    if (type === "youtube_transcript_selected_sections" || type === "youtube_transcript_full_sections" || type === "youtube_transcript_full") {
      return "transcript_selection";
    }
    return "manual_input";
  }

  function labelForSourceType(type: SourceType, sectionCount = 0): string {
    if (type === "youtube_transcript_selected_chapters") return "Selected transcript chapters";
    if (type === "youtube_transcript_selected_ranges" || type === "youtube_transcript_range" || type === "youtube_transcript_range_sections") {
      return `Manual ranges${sectionCount ? `: ${sectionCount} sections` : ""}`;
    }
    if (type === "youtube_transcript_selected_sections") return "Selected transcript sections";
    if (type === "youtube_transcript_full_sections" || type === "youtube_transcript_full") return "Full transcript sections";
    if (type === "selected_result") return "Generated result";
    if (type === "essay_draft") return essayDraftTitle.trim() || "Essay draft";
    if (type === "mixed_source_content") return "Mixed source";
    return "Manual input";
  }

  function createSourceVersion({
    content,
    origin,
    label,
    task: versionTask,
    provider,
    parentVersionId,
  }: CreateSourceVersionInput): SourceVersion | null {
    const cleanContent = content.trim();
    if (!cleanContent) return null;
    if (currentSourceVersion && normalizeVersionContent(currentSourceVersion.content) === normalizeVersionContent(cleanContent)) {
      setSourceActionStatus("No significant change detected.");
      return null;
    }
    const version: SourceVersion = {
      id: makeSourceVersionId(),
      versionNumber: sourceVersions.length + 1,
      label,
      origin,
      task: versionTask,
      provider,
      content: cleanContent,
      createdAt: new Date().toISOString(),
      wordCount: countWords(cleanContent),
      parentVersionId,
    };
    setSourceVersions((versions) => [...versions, version]);
    setCurrentSourceVersionId(version.id);
    setViewedSourceVersionId(version.id);
    return version;
  }

  function sourceFromTranscriptOrigin(): string {
    return transcriptOrigin === "saved transcript" ? "saved transcript" : transcriptOrigin === "fetched transcript" ? "fetched transcript" : "manual input";
  }

  function appendToSource(text: string, nextSourceType: SourceType, message: string, sectionCount = 0) {
    const cleanText = text.trim();
    if (!cleanText) return;
    const nextContent = [input.trim(), cleanText].filter(Boolean).join("\n\n");
    setInput(nextContent);
    setSourceType(nextSourceType);
    setSourceFrom(sourceFromTranscriptOrigin());
    setSourceSelectionCount((current) => current + sectionCount);
    setChapterStatus(message);
    setSourceActionStatus(message);
    createSourceVersion({
      content: nextContent,
      origin: sourceOriginFromType(nextSourceType),
      label: `${currentSourceVersion?.label ?? "Current source"} + added content`,
      parentVersionId: currentSourceVersionId ?? undefined,
    });
  }

  function replaceSource(
    text: string,
    nextSourceType: SourceType,
    message: string,
    onStatus?: (message: string) => void,
    sectionCount = 0,
  ) {
    const cleanText = text.trim();
    if (!cleanText) return;
    if (
      input.trim() &&
      input.trim() !== cleanText &&
      !window.confirm("Replace the current Source Capture? A new source version will be created for the replacement.")
    ) {
      onStatus?.("Source replace cancelled.");
      setSourceActionStatus("Source replace cancelled.");
      return;
    }
    setInput(cleanText);
    setSourceType(nextSourceType);
    setSourceFrom(sourceFromTranscriptOrigin());
    setSourceSelectionCount(sectionCount || (cleanText ? 1 : 0));
    onStatus?.(message);
    setSourceActionStatus(message);
    createSourceVersion({
      content: cleanText,
      origin: sourceOriginFromType(nextSourceType),
      label: labelForSourceType(nextSourceType, sectionCount),
      parentVersionId: currentSourceVersionId ?? undefined,
    });
  }

  function viewSourceVersion(version: SourceVersion) {
    setViewedSourceVersionId(version.id);
    setSourceActionStatus(`Viewing v${version.versionNumber}: ${version.label}.`);
  }

  function useSourceVersionAsCurrent(version: SourceVersion) {
    setInput(version.content);
    setCurrentSourceVersionId(version.id);
    setViewedSourceVersionId(version.id);
    setSourceType(version.origin === "generated_result" || version.origin === "continued_result" ? "selected_result" : "mixed_source_content");
    setSourceFrom(`source version v${version.versionNumber}`);
    setSourceSelectionCount(version.content.trim() ? 1 : 0);
    setSourceActionStatus(`v${version.versionNumber} is now the current Source.`);
  }

  function duplicateSourceVersion(version: SourceVersion) {
    const duplicated = createSourceVersion({
      content: version.content,
      origin: version.origin,
      label: `${version.label} copy`,
      task: version.task,
      provider: version.provider,
      parentVersionId: version.id,
    });
    if (duplicated) {
      setInput(duplicated.content);
      setSourceFrom(`duplicated from v${version.versionNumber}`);
      setSourceActionStatus(`Duplicated v${version.versionNumber} as v${duplicated.versionNumber}.`);
    }
  }

  function markSourceVersionAsFinal(version: SourceVersion) {
    setFinalVersionId(version.id);
    setFinalResult({
      output: version.content,
      provider: version.provider,
      providerLabel: version.provider,
      updatedAt: new Date().toISOString(),
      sourceVersionId: version.id,
    });
    setResultStatus("Final");
    setProjectStatus(`v${version.versionNumber} marked as Final.`);
  }

  function clearSourceOnly() {
    setInput("");
    setSourceType("manual_input");
    setSourceFrom("manual input");
    setSourceSelectionCount(0);
    setCurrentSourceVersionId(null);
    setViewedSourceVersionId(null);
    setSourceActionStatus("Source Capture cleared.");
  }

  function applySourceWorkspaceState(state: SavedEssayEngineProjectState) {
    setInput(state.sourceText ?? "");
    setSourceType((state.sourceType as SourceType) ?? "manual_input");
    setSourceVersions(state.sourceVersions ?? []);
    setCurrentSourceVersionId(state.currentSourceVersionId ?? null);
    setViewedSourceVersionId(state.currentSourceVersionId ?? null);
    setFinalVersionId(state.finalVersionId ?? state.finalResult?.sourceVersionId ?? null);
    setTranscriptText(state.transcriptText ?? "");
    setTranscriptSegments(state.transcriptSegments ?? []);
    setTimestampChapterInput("");
    setChapterSectionsGenerated(false);
    setYoutubeSourceUrl(YOUTUBE_RE.test(state.sourceText ?? "") ? state.sourceText : "");
    setSelectedRangeStart(state.selectedRangeStart ?? "");
    setSelectedRangeEnd(state.selectedRangeEnd ?? "");
    setSourceFrom("project workspace");
    setSourceSelectionCount(state.sourceText?.trim() ? 1 : 0);
    setSourceActionStatus(null);
  }

  function clearSourceWorkspace() {
    setInput("");
    setTranscriptStatus(null);
    setTranscriptText("");
    setTranscriptSegments([]);
    setTranscriptOrigin("none");
    setYoutubeSourceUrl("");
    setSelectedRangeStart("");
    setSelectedRangeEnd("");
    setTimestampChapterInput("");
    setChapterSectionsGenerated(false);
    setManualRanges([{ id: makeRangeId(), start: "", end: "" }]);
    setCheckedFullSectionIds([]);
    setCheckedChapterIds([]);
    setTopicMatchedSectionIds([]);
    setCheckedTopicSectionIds([]);
    setFullSectionStatus(null);
    setChapterStatus(null);
    setRangeStatus(null);
    setTopicStatus(null);
    setSourceType("manual_input");
    setSourceFrom("manual input");
    setSourceSelectionCount(0);
    setSourceVersions([]);
    setCurrentSourceVersionId(null);
    setViewedSourceVersionId(null);
    setFinalVersionId(null);
    setSourceActionStatus(null);
  }

  function resetPipelineSourceWorkspace() {
    setInput("");
    setSourceType("manual_input");
    setSourceFrom("manual input");
    setSourceSelectionCount(0);
    setSourceVersions([]);
    setCurrentSourceVersionId(null);
    setViewedSourceVersionId(null);
    setFinalVersionId(null);
    setSourceActionStatus("Fresh writing pipeline started.");
  }

  return {
    input,
    setInput,
    updateInput,
    isYouTubeUrl,
    isWebpageUrl,
    transcriptStatus,
    setTranscriptStatus,
    transcriptText,
    setTranscriptText,
    transcriptSegments,
    setTranscriptSegments,
    transcriptOrigin,
    setTranscriptOrigin,
    youtubeSourceUrl,
    setYoutubeSourceUrl,
    selectedRangeStart,
    setSelectedRangeStart,
    selectedRangeEnd,
    setSelectedRangeEnd,
    manualRanges,
    setManualRanges,
    timestampChapterInput,
    setTimestampChapterInput,
    chapterSectionsGenerated,
    setChapterSectionsGenerated,
    checkedFullSectionIds,
    setCheckedFullSectionIds,
    checkedChapterIds,
    setCheckedChapterIds,
    includeTranscriptTimestamps,
    setIncludeTranscriptTimestamps,
    fullSectionStatus,
    setFullSectionStatus,
    chapterStatus,
    setChapterStatus,
    rangeStatus,
    setRangeStatus,
    topicInput,
    setTopicInput,
    topicMatchedSectionIds,
    setTopicMatchedSectionIds,
    checkedTopicSectionIds,
    setCheckedTopicSectionIds,
    topicStatus,
    setTopicStatus,
    organizeTranscriptSections,
    setOrganizeTranscriptSections,
    sourceType,
    setSourceType,
    sourceFrom,
    setSourceFrom,
    sourceSelectionCount,
    setSourceSelectionCount,
    sourceActionStatus,
    setSourceActionStatus,
    sourceVersions,
    setSourceVersions,
    currentSourceVersionId,
    setCurrentSourceVersionId,
    finalVersionId,
    setFinalVersionId,
    viewedSourceVersionId,
    setViewedSourceVersionId,
    currentSourceVersion,
    viewedSourceVersion,
    finalVersion,
    transcriptDetectedButUrlOnly,
    generateBlocked,
    sourceHelper,
    createSourceVersion,
    appendToSource,
    replaceSource,
    viewSourceVersion,
    useSourceVersionAsCurrent,
    duplicateSourceVersion,
    markSourceVersionAsFinal,
    clearSourceOnly,
    applySourceWorkspaceState,
    clearSourceWorkspace,
    resetPipelineSourceWorkspace,
  };
}
