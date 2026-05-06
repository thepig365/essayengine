"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DesktopConsoleLayout } from "@/components/layout/DesktopConsoleLayout";
import { MobileWorkflowLayout } from "@/components/layout/MobileWorkflowLayout";
import { MobileWorkflowPanel } from "@/components/MobileWorkflowPanel";
import {
  EngineSelectionPanel,
  SourceMaterialPanel,
  StructureBuilderPanel,
  TranscriptWorkspacePanel,
} from "@/components/essay-engine/panels";
import { ReviewProductWorkspace } from "@/components/workflow/ReviewProductWorkspace";
import { EssayEngineNav } from "@/components/navigation/EssayEngineNav";
import type { MegaMenuCategorySpec, MegaMenuItemSpec } from "@/components/navigation/megaMenuData";
import { ProcessingWorkspace } from "@/components/workflow/ProcessingWorkspace";
import { MaterialWorkspace } from "@/components/workflow/MaterialWorkspace";
import { ExtractionWorkspace } from "@/components/workflow/ExtractionWorkspace";
import { TopicWorkspace } from "@/components/workflow/TopicWorkspace";
import { StudioWorkspaceShell } from "@/components/studio/StudioWorkspaceShell";
import { TopicMaterialStatusStrip } from "@/components/studio/TopicMaterialStatusStrip";
import { WorkflowTimeline } from "@/components/WorkflowTimeline";
import { formatAudioTime, useAudioWorkspace } from "@/hooks/useAudioWorkspace";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMobileWorkflow } from "@/hooks/useMobileWorkflow";
import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";
import { useTranscriptLibraryWorkspace } from "@/hooks/useTranscriptLibraryWorkspace";
import {
  SOURCE_TYPE_LABELS,
  makeRangeId,
  type SourceType,
  useTranscriptWorkspace,
} from "@/hooks/useTranscriptWorkspace";
import {
  MATERIAL_ANALYSIS_BUTTONS,
  MATERIAL_WRITING_SUPPLEMENT,
  buildMaterialAnalysisInstruction,
  detectMaterialKindFromUrl,
  formatSecondsTimestamp,
  labelForMaterialKind,
  segmentsFromSrtContent,
  segmentsFromVttContent,
  splitPlainTextIntoParagraphBlocks,
  isStandaloneUrlText,
  userFacingDetectedSourceKind,
} from "@/lib/sourceMaterialUtils";
import {
  canProcessTopicMaterial,
  computeSourceFingerprint,
  isTopicMaterialStale,
} from "@/lib/topicMaterialGuard";
import { isProbablyUrl } from "@/lib/workflowAdapters";
import {
  type FinalResultSelection,
  type ResultStatus,
  type SavedEssayEngineProjectState,
} from "@/lib/projectStorage";
import type {
  EngineRequest,
  EngineResponse,
  EngineTask,
  LLMProvider,
  OutputMode,
  TranscriptSegment,
} from "@/types/engine";
import type { SourceMaterialPipelineTab, SourceMaterialType, SourceSegment } from "@/types/sourceMaterial";
import type { TopicMaterial } from "@/types/workflow";

import {
  MODES,
  SOURCE_CHIPS,
  TASKS,
  TASK_ICONS,
  TTS_SPEEDS,
  TTS_STYLES,
  TTS_VOICES,
  WEBPAGE_RE,
  YOUTUBE_RE,
} from "@/essay-engine/constants";
import { EssayEngineProvider } from "@/essay-engine/EssayEngineContext";
import { DESKTOP_MIN, type ViewMode } from "@/essay-engine/breakpoints";
import { MOBILE_WORKFLOW_STEPS, resolveMobileWorkflowPanelMode } from "@/essay-engine/mobileWorkflowSteps";
type TimestampChapter = {
  id: string;
  start: number;
  end?: number;
  title: string;
  raw: string;
};

type TranscriptWorkspaceSection = {
  id: string;
  start: number;
  end: number;
  title: string;
  text: string;
  rough: boolean;
};

type TopicSectionMatch = {
  section: TranscriptWorkspaceSection;
  score: number;
};

type QuickRequestButtonDef = {
  label: string;
  task: EngineTask;
  instruction: string;
};

const QUICK_REQUEST_BUTTONS: QuickRequestButtonDef[] = [
  {
    label: "Analyze",
    task: "improve",
    instruction:
      "Analyze this source in depth: structure/main claims, evidence, gaps, tradeoffs, and what a thoughtful reader should take away.",
  },
  {
    label: "Extract core idea",
    task: "extract",
    instruction: "Extract the single core idea or thesis as clearly and concretely as possible.",
  },
  { label: "Summarize", task: "summarize", instruction: "Summarize the essentials faithfully without adding new claims." },
  {
    label: "Write article",
    task: "improve",
    instruction: "Turn this into a clear, well-structured article suitable for reading online.",
  },
  {
    label: "Write 500-word essay",
    task: "improve",
    instruction: "Write a polished essay of about 500 words based on this source. Keep a coherent arc.",
  },
  {
    label: "Continue research",
    task: "improve",
    instruction:
      "Continue research in writing: add depth, important caveats, counterpoints, and concrete examples grounded strictly in the source.",
  },
  {
    label: "Turn into post",
    task: "improve",
    instruction: "Turn this into a concise, engaging social post with a sharp hook and a reflective close.",
  },
  {
    label: "Turn into thought-leading article",
    task: "improve",
    instruction:
      "Turn this into a long-form, thought-leading article: strong framing, nuanced argument, and actionable insight.",
  },
  {
    label: "Turn into Mendbook chapter",
    task: "improve",
    instruction: "Turn this into a Mendbook-style chapter: reflective pacing, cohesive narrative, and integrated lessons.",
  },
  {
    label: "Turn into audiobook script",
    task: "improve",
    instruction:
      "Rewrite this as a spoken-word / audiobook script: short sentences, clear cadence, and explicit transitions for listening.",
  },
  { label: "Translate", task: "translate", instruction: "" },
  {
    label: "Create outline",
    task: "improve",
    instruction: "Create a detailed outline with headings and bullets only; do not write full prose paragraphs yet.",
  },
];

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function parseTimestampToSeconds(value: string): number | null {
  const parts = value.trim().split(":");
  if (parts.length !== 2 && parts.length !== 3) return null;
  if (!parts.every((part) => /^\d+$/.test(part))) return null;

  const numbers = parts.map(Number);
  if (numbers.some((n) => !Number.isFinite(n))) return null;

  if (numbers.length === 2) {
    const [minutes, seconds] = numbers;
    if (seconds >= 60) return null;
    return minutes * 60 + seconds;
  }

  const [hours, minutes, seconds] = numbers;
  if (minutes >= 60 || seconds >= 60) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function extractTranscriptRangeFromSegments(
  segments: TranscriptSegment[],
  startSeconds: number,
  endSeconds: number,
): string {
  return segments
    .filter((segment) => segment.start >= startSeconds && segment.start <= endSeconds)
    .sort((a, b) => a.start - b.start)
    .map((segment) => segment.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromText(text: string, fallback: string): string {
  const firstSentence = text.match(/[^.!?。！？]+/)?.[0]?.trim() ?? "";
  const cleaned = firstSentence
    .replace(/[^\p{L}\p{N}\s\u4e00-\u9fff-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return fallback;
  const words = cleaned.split(" ").filter(Boolean);
  const title = words.length > 1 ? words.slice(0, 7).join(" ") : cleaned.slice(0, 28);
  return title.length >= 8 ? title : fallback;
}

function transcriptEndTime(segments: TranscriptSegment[]): number {
  return segments.reduce((end, segment) => Math.max(end, segment.start + (segment.duration ?? 0)), 0);
}

function parseTimestampChapters(input: string, transcriptEnd?: number): TimestampChapter[] {
  const parsed = input
    .split(/\r?\n/)
    .map((line, index) => {
      const raw = line.trim();
      const match = raw.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?:[-—–]\s*)?(.*)$/);
      if (!match) return null;
      const start = parseTimestampToSeconds(match[1]);
      if (start === null) return null;
      const title = match[2].trim() || `Chapter ${index + 1}`;
      return {
        id: `chapter-${index}-${Math.floor(start)}`,
        start,
        title,
        raw,
      };
    })
    .filter((chapter): chapter is Omit<TimestampChapter, "end"> => Boolean(chapter))
    .sort((a, b) => a.start - b.start);

  return parsed.map((chapter, index) => ({
    ...chapter,
    end: parsed[index + 1]?.start ?? transcriptEnd,
  }));
}

function buildRoughChapterSuggestions(segments: TranscriptSegment[]): string {
  const end = transcriptEndTime(segments);
  if (!end) return "";
  const interval = 240;
  const lines: string[] = [];
  for (let start = 0, index = 1; start < end; start += interval, index += 1) {
    lines.push(`${formatTimestamp(start)} Rough section ${index}`);
  }
  return lines.join("\n");
}

function formatSelectedTranscriptBlocks(
  blocks: { start: number; end: number; title: string; text: string }[],
  heading = "## Selected Transcript Sections",
  includeTimestamps = false,
): string {
  const ordered = [...blocks].sort((a, b) => a.start - b.start);
  return [
    heading,
    ...ordered.map((block) => {
      const formattedText = formatTranscriptText(block.text);
      const title = includeTimestamps
        ? `${formatTimestamp(block.start)}-${formatTimestamp(block.end)} — ${block.title}`
        : block.title;
      return `### ${title}\n\n${formattedText}`;
    }),
  ].join("\n\n");
}

function buildTimestampChapterSections(
  segments: TranscriptSegment[],
  chapters: TimestampChapter[],
): TranscriptWorkspaceSection[] {
  if (segments.length === 0 || chapters.length === 0) return [];

  return chapters
    .map((chapter, index) => {
      const end = chapter.end ?? transcriptEndTime(segments);
      const text = extractTranscriptRangeFromSegments(segments, chapter.start, end);
      if (!text) return null;
      return {
        id: chapter.id,
        start: chapter.start,
        end,
        title: chapter.title || `Section ${index + 1}`,
        text,
        rough: false,
      };
    })
    .filter((section): section is TranscriptWorkspaceSection => Boolean(section));
}

function buildFullTranscriptSections(segments: TranscriptSegment[]): TranscriptWorkspaceSection[] {
  if (segments.length === 0) return [];

  const ordered = [...segments]
    .filter((segment) => segment.text.trim())
    .sort((a, b) => a.start - b.start);
  if (ordered.length === 0) return [];

  const sections: TranscriptWorkspaceSection[] = [];
  const minSeconds = 120;
  const targetSeconds = 210;
  const maxSeconds = 260;
  const targetChars = 1800;
  const maxChars = 2600;
  let current: TranscriptSegment[] = [];
  let sectionStart = segments[0]?.start ?? 0;

  function pushCurrent() {
    if (current.length === 0) return;
      const text = current.map((item) => item.text).join(" ");
      const last = current[current.length - 1];
      const index = sections.length + 1;
      sections.push({
        id: `full-section-${index}-${Math.floor(sectionStart)}`,
        start: sectionStart,
        end: last.start + (last.duration ?? 0),
        title: titleFromText(text, `Section ${index}`),
        text,
        rough: true,
      });
    current = [];
  }

  for (const segment of ordered) {
    if (current.length === 0) {
      current.push(segment);
      sectionStart = segment.start;
      continue;
    }

    const elapsed = segment.start - sectionStart;
    const charCount = current.reduce((total, item) => total + item.text.length, 0);
    const shouldSplit =
      elapsed >= maxSeconds ||
      charCount >= maxChars ||
      (elapsed >= targetSeconds && charCount >= 900) ||
      (elapsed >= minSeconds && charCount >= targetChars);

    if (shouldSplit) {
      pushCurrent();
      current = [];
      sectionStart = segment.start;
    }

    current.push(segment);
  }

  pushCurrent();
  return sections;
}

function formatTranscriptText(rawText: string): string {
  const normalized = rawText
    .replace(/\s+/g, " ")
    .replace(/\b(?:um+|uh+|you know|sort of|kind of)\b[,\s]*/gi, "")
    .replace(/\s+([,.!?;:，。！？；：])/g, "$1")
    .trim();

  if (!normalized) return "";

  const sentences = normalized.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (sentences.length <= 1) {
    return normalized
      .match(/.{1,520}(?:\s|$)/g)
      ?.map((chunk) => chunk.trim())
      .filter(Boolean)
      .join("\n\n") ?? normalized;
  }

  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(" "));
  }
  return paragraphs.join("\n\n");
}

function sectionHeadingFromParagraph(sectionNumber: number, paragraph: string): string {
  const firstSentence = paragraph.match(/[^.!?。！？]+/)?.[0]?.trim() ?? "";
  const cleaned = firstSentence
    .replace(/[^\p{L}\p{N}\s\u4e00-\u9fff-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return `Section ${sectionNumber}`;

  const words = cleaned.split(" ").filter(Boolean);
  const phrase = words.length > 1 ? words.slice(0, 7).join(" ") : cleaned.slice(0, 20);
  return phrase.length >= 8 ? `Section ${sectionNumber} — ${phrase}` : `Section ${sectionNumber}`;
}

function splitTranscriptIntoSections(text: string): string {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return "";

  const sectionSize = 5;
  const sections: string[] = [];
  for (let i = 0; i < paragraphs.length; i += sectionSize) {
    const sectionNumber = sections.length + 1;
    const sectionParagraphs = paragraphs.slice(i, i + sectionSize);
    sections.push(`## ${sectionHeadingFromParagraph(sectionNumber, sectionParagraphs[0])}\n\n${sectionParagraphs.join("\n\n")}`);
  }
  return sections.join("\n\n");
}

function extractYouTubeVideoId(url: string): string | undefined {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/i);
  return match?.[1];
}

function countWords(text: string): number {
  return text.trim().match(/[\p{L}\p{N}'-]+/gu)?.length ?? 0;
}

type Props = {
  result: EngineResponse | null;
  onResult: (result: EngineResponse | null) => void;
  viewMode: ViewMode;
};

export function EngineForm({ result, onResult, viewMode }: Props) {
  const [task, setTask] = useState<EngineTask>("translate");
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<"draft" | "result">("draft");
  const [mobileWorkflowStepIndex, setMobileWorkflowStepIndex] = useState(0);
  const [mobileToolsDrawerOpen, setMobileToolsDrawerOpen] = useState(false);
  const [megaMenuCategoryId, setMegaMenuCategoryId] = useState<MegaMenuCategorySpec["id"] | null>(null);
  useEffect(() => {
    setMobileWorkflowStepIndex((i) => (i < MOBILE_WORKFLOW_STEPS.length ? i : 0));
  }, []);
  const [outputMode, setOutputMode] = useState<OutputMode>("auto");
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Chinese Simplified");
  const [tone, setTone] = useState("");
  const [instructionPreset, setInstructionPreset] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [providers, setProviders] = useState<LLMProvider[]>(["openai"]);
  const [sourceChip, setSourceChip] = useState(SOURCE_CHIPS[0]);

  const [loading, setLoading] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<ResultStatus>("Draft");
  const [finalResult, setFinalResult] = useState<FinalResultSelection | null>(null);
  const [workflowStep, setWorkflowStep] = useState(1);
  const [essayDraftTitle, setEssayDraftTitle] = useState("");
  const [essayDraftContent, setEssayDraftContent] = useState("");
  const [essayDraftUpdatedAt, setEssayDraftUpdatedAt] = useState<string | null>(null);
  const [essayDraftStatus, setEssayDraftStatus] = useState<string | null>(null);
  const [sourceMaterialPipeline, setSourceMaterialPipeline] = useState<SourceMaterialPipelineTab>("transcript");
  const [genericMaterialKind, setGenericMaterialKind] = useState<SourceMaterialType>("article");
  const [genericMaterialTitle, setGenericMaterialTitle] = useState("");
  const [genericMaterialUrl, setGenericMaterialUrl] = useState("");
  const [genericAuthor, setGenericAuthor] = useState("");
  const [genericRawContent, setGenericRawContent] = useState("");
  const [genericSegments, setGenericSegments] = useState<SourceSegment[]>([]);
  const [genericCheckedIds, setGenericCheckedIds] = useState<string[]>([]);
  const [linkExtractUrl, setLinkExtractUrl] = useState("");
  const [linkExtractLoading, setLinkExtractLoading] = useState(false);
  const [linkExtractStatus, setLinkExtractStatus] = useState<string | null>(null);
  const [pasteBlockInput, setPasteBlockInput] = useState("");
  const [genericWorkspaceNotice, setGenericWorkspaceNotice] = useState<string | null>(null);
  const [audioUploadLoading, setAudioUploadLoading] = useState(false);
  const [materialUseFullExplicit, setMaterialUseFullExplicit] = useState(false);
  const [savedTopicMaterial, setSavedTopicMaterial] = useState("");
  const [topicMaterial, setTopicMaterial] = useState<TopicMaterial | null>(null);
  const [topicMaterialFingerprint, setTopicMaterialFingerprint] = useState<string | null>(null);
  const [topicMaterialStatus, setTopicMaterialStatus] = useState("");
  const [materialCustomPrompt, setMaterialCustomPrompt] = useState("");
  const [materialAnalysisStatus, setMaterialAnalysisStatus] = useState<string | null>(null);
  const [materialAnalysisLoading, setMaterialAnalysisLoading] = useState(false);
  /** Raw paste for URLs / long copy; never use as writing instruction. */
  const [sourceMaterialRawInput, setSourceMaterialRawInput] = useState("");
  const [autoExtractStatus, setAutoExtractStatus] = useState<string | null>(null);
  const [lastQuickAction, setLastQuickAction] = useState<string | null>(null);
  const generateSectionRef = useRef<HTMLElement | null>(null);
  const advancedStudioDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const setProjectStatusRef = useRef<(message: string | null) => void>(() => {});

  const {
    ttsVoice,
    setTtsVoice,
    ttsSpeed,
    setTtsSpeed,
    ttsStyle,
    setTtsStyle,
    ttsStatus,
    setTtsStatus,
    ttsLoading,
    audioPlayer,
    audioProgressPercent,
    audioCanMovePrev,
    audioCanMoveNext,
    audioCanToggle,
    runTtsAction,
    stopCurrentAudio,
    toggleAudioPlayback,
    seekAudio,
    playPreviousAudioPart,
    playNextAudioPart,
  } = useAudioWorkspace();

  const {
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
    currentSourceVersionId,
    finalVersionId,
    setFinalVersionId,
    currentSourceVersion,
    viewedSourceVersion,
    finalVersion,
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
  } = useTranscriptWorkspace({
    sourceChipHelper: sourceChip.helper,
    essayDraftTitle,
    setResultStatus,
    setFinalResult,
    setProjectStatus: (message) => setProjectStatusRef.current(message),
  });

  const {
    transcriptFolders,
    selectedTranscriptFolderId,
    setSelectedTranscriptFolderId,
    newTranscriptFolderName,
    setNewTranscriptFolderName,
    folderFormMode,
    setFolderFormMode,
    folderRenameName,
    setFolderRenameName,
    transcriptLibraryTitle,
    setTranscriptLibraryTitle,
    selectedTranscriptId,
    setSelectedTranscriptId,
    transcriptLibraryStatus,
    setTranscriptLibraryStatus,
    folderTranscripts,
    transcriptFolderCounts,
    selectedTranscriptFolder,
    selectedFolderIsUnsorted,
    canCreateTranscriptFolder,
    canRenameTranscriptFolder,
    createLibraryFolder,
    renameCurrentLibraryFolder,
    deleteCurrentLibraryFolder,
    saveCurrentTranscriptToLibrary,
    loadSelectedLibraryTranscript,
    deleteSelectedLibraryTranscript,
    duplicateSelectedLibraryTranscript,
  } = useTranscriptLibraryWorkspace({
    currentTranscriptState: () => ({
      input,
      transcriptText,
      transcriptSegments,
      timestampChapterInput,
      youtubeSourceUrl,
    }),
    applyTranscriptToWorkspace: (saved) => {
      setTranscriptText(saved.transcriptText);
      setTranscriptSegments(saved.transcriptSegments ?? []);
      setYoutubeSourceUrl(saved.sourceUrl ?? "");
      setTimestampChapterInput(saved.timestampChaptersText ?? "");
      setChapterSectionsGenerated(Boolean(saved.timestampChaptersText?.trim()));
      setTranscriptOrigin("saved transcript");
      setCheckedFullSectionIds([]);
      setCheckedChapterIds([]);
      setTopicMatchedSectionIds([]);
      setCheckedTopicSectionIds([]);
      setTranscriptStatus("Saved transcript loaded into Transcript Workspace. Source Capture was not changed.");
    },
  });

  const transcriptEnd = useMemo(() => transcriptEndTime(transcriptSegments), [transcriptSegments]);
  const timestampChapters = useMemo(
    () => parseTimestampChapters(timestampChapterInput, transcriptEnd),
    [timestampChapterInput, transcriptEnd],
  );
  const fullTranscriptSections = useMemo(() => {
    const sections = buildFullTranscriptSections(transcriptSegments);
    if (sections.length > 0 || !transcriptText.trim()) return sections;
    return [
      {
        id: "full-section-fallback",
        start: 0,
        end: transcriptEnd,
        title: "Section 1",
        text: transcriptText,
        rough: true,
      },
    ];
  }, [transcriptSegments, transcriptText, transcriptEnd]);
  const effectiveYoutubeSource = useMemo(
    () => YOUTUBE_RE.test(sourceMaterialRawInput.trim()) || isYouTubeUrl,
    [sourceMaterialRawInput, isYouTubeUrl],
  );
  const timestampChapterSections = useMemo(
    () => buildTimestampChapterSections(transcriptSegments, timestampChapters),
    [transcriptSegments, timestampChapters],
  );
  const topicMatches = useMemo<TopicSectionMatch[]>(
    () =>
      topicMatchedSectionIds
        .map((id) => {
          const section = fullTranscriptSections.find((item) => item.id === id);
          if (!section) return null;
          const haystack = `${section.title}\n${section.text}`.toLowerCase();
          const score = topicKeywords().reduce((total, keyword) => total + countKeywordMatches(haystack, keyword), 0);
          return { section, score };
        })
        .filter((match): match is TopicSectionMatch => Boolean(match)),
    [fullTranscriptSections, topicMatchedSectionIds, topicInput],
  );
  const activeTask = TASKS.find((t) => t.value === task) ?? TASKS[0];
  const activeMode = MODES.find((m) => m.value === outputMode) ?? MODES[0];
  const comparisonActive = providers.length > 1;
  const runLabel = comparisonActive ? "Generate Comparison" : "Generate Result";
  const showWritingPresetHint = task === "paraphrase" || task === "rewrite";
  const mobileWorkflow = useMobileWorkflow({
    input,
    sourceLanguage,
    targetLanguage,
    tone,
    taskLabel: activeTask.label,
    instructionPreset,
    customInstruction,
    providers,
    currentSourceVersionId,
    essayDraftContent,
    setError,
    onResult,
    setResultStatus,
    createSourceVersion,
    replaceSourceWithCapture: (text, status) =>
      replaceSource(text, "manual_input", "Capture Inbox is now the current Source.", status, 1),
    replaceEssayDraftDirect: (text, message) => {
      setEssayDraftContent(text);
      setEssayDraftUpdatedAt(new Date().toISOString());
      setEssayDraftStatus(message);
    },
    setEssayDraftStatus,
    runTtsAction,
    setMobileActiveTab,
  });

  const {
    projects,
    activeProjectId,
    projectName,
    setProjectName,
    projectStatus,
    setProjectStatus,
    saveCurrentProject,
    clearWorkspace,
    loadSelectedProject,
    duplicateCurrentProject,
    deleteCurrentProject,
  } = useProjectWorkspace({
    currentProjectState,
    applyProjectState,
    clearWorkspaceState,
    autosaveDeps: [
      input,
      sourceType,
      sourceVersions,
      currentSourceVersionId,
      finalVersionId,
      essayDraftTitle,
      essayDraftContent,
      essayDraftUpdatedAt,
      transcriptText,
      transcriptSegments,
      selectedRangeStart,
      selectedRangeEnd,
      task,
      sourceLanguage,
      targetLanguage,
      tone,
      instructionPreset,
      customInstruction,
      outputMode,
      providers,
      result,
      finalResult,
      resultStatus,
      ttsVoice,
      ttsSpeed,
      ttsStyle,
      sourceMaterialPipeline,
      genericMaterialKind,
      genericMaterialTitle,
      genericMaterialUrl,
      genericAuthor,
      genericRawContent,
      genericSegments,
      genericCheckedIds,
      linkExtractUrl,
      pasteBlockInput,
      materialUseFullExplicit,
      savedTopicMaterial,
      topicMaterial,
      topicMaterialFingerprint,
      topicMaterialStatus,
      materialCustomPrompt,
      sourceMaterialRawInput,
      mobileWorkflow.captureIdea,
      mobileWorkflow.coreValue,
      mobileWorkflow.clarifyIntent,
      mobileWorkflow.clarifyAudience,
      mobileWorkflow.clarifyTone,
      mobileWorkflow.workflowStructures,
      mobileWorkflow.selectedWorkflowStructureId,
      mobileWorkflow.markedParagraphs,
      mobileWorkflow.revisionInstruction,
      mobileWorkflow.workflowDiagnosis,
      mobileWorkflow.selectedPolishDirections,
      mobileWorkflow.polishVersions,
      mobileWorkflow.selectedRepurposeFormats,
      mobileWorkflow.repurposeOutputs,
    ],
  });
  setProjectStatusRef.current = setProjectStatus;

  const viewportIsDesktop = useMediaQuery(`(min-width: ${DESKTOP_MIN}px)`, true);
  const effectiveIsMobileLayout =
    !viewportIsDesktop || (viewportIsDesktop && viewMode === "mobile");
  const effectiveIsDesktopConsole = !effectiveIsMobileLayout;

  const mobileWorkflowStepId = MOBILE_WORKFLOW_STEPS[mobileWorkflowStepIndex]?.id;

  const workflowListenGuide = useMemo(() => {
    switch (mobileWorkflowStepId) {
      case "source":
      case "request":
        return {
          asideHeadline: "Listen to Source",
          asideBody:
            "Preview the captured source as audio before you generate. Long text is read in parts; download a merged MP3 from the audio strip when ready.",
          panelEyebrow: "Listen",
          panelHeadline: "Listen to Source",
          panelBody:
            "Use the audio strip on Source or Extract. Voice settings are in the left controls (or Read aloud settings on mobile).",
          mobileToolbarListen: "Listen: source",
        };
      case "workpiece":
        return {
          asideHeadline: "Listen to AI output",
          asideBody:
            "Hear the latest generated AI output before revising. Long text is split into parts automatically.",
          panelEyebrow: "Listen",
          panelHeadline: "Listen to AI output",
          panelBody:
            "Playback uses the result or draft you select. Voice settings are in the left controls (or Read aloud settings on mobile).",
          mobileToolbarListen: "Listen: AI output",
        };
      case "refine":
        return {
          asideHeadline: "Listen to Current Version",
          asideBody:
            "Listen to the version you are refining so ear and eye stay aligned while you mark, rewrite, or assemble.",
          panelEyebrow: "Listen",
          panelHeadline: "Listen to Current Version",
          panelBody:
            "Follow the text you last sent to the player. Voice settings are in the left controls (or Read aloud settings on mobile).",
          mobileToolbarListen: "Listen: current",
        };
      case "publish":
        return {
          asideHeadline: "Generate Audiobook / Download Audio",
          asideBody:
            "In Publish / Repurpose, export the merged audiobook MP3 and reuse the text as shipping content.",
          panelEyebrow: "Audio",
          panelHeadline: "Generate Audiobook / Download Audio",
          panelBody:
            "Use assembly and export actions for audiobook MP3. Voice settings are in the left controls (or Read aloud settings on mobile).",
          mobileToolbarListen: "Audiobook / DL",
        };
      default:
        return {
          asideHeadline: "Read aloud",
          asideBody:
            "Listen to the source or generated results before deciding what to use. Long text will be read in parts automatically.",
          panelEyebrow: "Listen",
          panelHeadline: "Audio",
          panelBody:
            "Listen after selecting source, AI output, or publish output. Voice settings are in the left controls (or Read aloud settings on mobile).",
          mobileToolbarListen: "Listen",
        };
    }
  }, [mobileWorkflowStepId]);

  const selectWorkflowStep = useCallback(
    (index: number) => {
      setMobileWorkflowStepIndex(index);
      requestAnimationFrame(() => {
        const stepId = MOBILE_WORKFLOW_STEPS[index]?.id;
        if (effectiveIsMobileLayout) {
          document.getElementById("ee-active-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (stepId === "request") {
          document.getElementById("ee-panel-engines")?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (stepId === "refine") {
          document.getElementById("ee-processing-studio-main")?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (stepId === "source") {
          document.getElementById("ee-panel-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        document.getElementById("ee-panel-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [effectiveIsMobileLayout],
  );

  const mobileWorkflowPanelMode = useMemo(() => {
    if (effectiveIsDesktopConsole) return "support-rail" as const;
    return resolveMobileWorkflowPanelMode(false, mobileWorkflowStepId);
  }, [effectiveIsDesktopConsole, mobileWorkflowStepId]);

  const essayEngineController = useMemo(
    () => ({
      mobileWorkflowStepIndex,
      setMobileWorkflowStepIndex,
      mobileToolsDrawerOpen,
      setMobileToolsDrawerOpen,
      isDesktopLayout: effectiveIsDesktopConsole,
      viewportIsDesktop,
    }),
    [effectiveIsDesktopConsole, viewportIsDesktop, mobileToolsDrawerOpen, mobileWorkflowStepIndex],
  );

  function toggleProvider(p: LLMProvider) {
    setProviders((curr) =>
      curr.includes(p) ? curr.filter((x) => x !== p) : [...curr, p],
    );
  }

  function combinedInstruction(): string | undefined {
    const parts = [instructionPreset, customInstruction.trim(), mobileWorkflow.workflowInstruction].filter(Boolean);
    if (savedTopicMaterial.trim()) {
      const sm = savedTopicMaterial.trim();
      const ci = customInstruction;
      if (!ci.includes(sm)) {
        parts.push(`Saved topic material:\n${sm}`);
      }
    }
    const base = parts.length ? parts.join(". ") : undefined;
    return [base, MATERIAL_WRITING_SUPPLEMENT].filter(Boolean).join("\n\n");
  }

  function checkedFullTranscriptSections(): TranscriptWorkspaceSection[] {
    return fullTranscriptSections
      .filter((section) => checkedFullSectionIds.includes(section.id))
      .sort((a, b) => a.start - b.start);
  }

  function checkedWorkspaceSections(): TranscriptWorkspaceSection[] {
    if (!chapterSectionsGenerated) return [];
    return timestampChapterSections
      .filter((section) => checkedChapterIds.includes(section.id))
      .sort((a, b) => a.start - b.start);
  }

  function checkedTopicSections(): TranscriptWorkspaceSection[] {
    return topicMatches
      .map((match) => match.section)
      .filter((section) => checkedTopicSectionIds.includes(section.id))
      .sort((a, b) => a.start - b.start);
  }

  function cleanSectionText(section: TranscriptWorkspaceSection): string {
    return formatTranscriptText(section.text);
  }

  function cleanSectionsText(
    sections: TranscriptWorkspaceSection[],
    includeHeadings = false,
    includeTimestamps = false,
  ): string {
    if (!includeHeadings) {
      return sections
        .map((section) => cleanSectionText(section))
        .filter(Boolean)
        .join("\n\n");
    }
    return formatSelectedTranscriptBlocks(
      sections,
      "## Selected Transcript Sections",
      includeTimestamps,
    );
  }


  function formatSectionsForSource(
    sections: TranscriptWorkspaceSection[],
    heading = "## Selected Transcript Sections",
  ): string {
    return formatSelectedTranscriptBlocks(sections, heading, includeTranscriptTimestamps);
  }

  async function copyTranscriptText(text: string, message: string, onStatus: (message: string) => void = setChapterStatus) {
    const cleanText = text.trim();
    if (!cleanText) {
      onStatus("No transcript text to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(cleanText);
      onStatus(message);
    } catch {
      onStatus("Copy failed. Select the text manually and copy it.");
    }
  }

  function currentProjectState(): SavedEssayEngineProjectState {
    return {
      sourceText: input,
      sourceType,
      sourceVersions,
      currentSourceVersionId,
      finalVersionId,
      essayDraftTitle,
      essayDraftContent,
      essayDraftUpdatedAt,
      transcriptText,
      transcriptSegments,
      selectedRangeStart,
      selectedRangeEnd,
      task,
      sourceLanguage,
      targetLanguage,
      tone,
      instructionPreset,
      customInstruction,
      outputMode,
      providers,
      generatedOutput: result?.output ?? "",
      providerOutputs: result?.outputs ?? [],
      validationWarnings: result?.warnings ?? [],
      result,
      finalResult,
      resultStatus,
      ttsVoice,
      ttsSpeed,
      ttsStyle,
      sourceMaterialPipeline,
      genericMaterialState: {
        kind: genericMaterialKind,
        title: genericMaterialTitle,
        url: genericMaterialUrl,
        author: genericAuthor,
        rawContent: genericRawContent,
        segments: genericSegments,
        checkedSegmentIds: genericCheckedIds,
      },
      materialUseFullExplicit,
      savedTopicMaterial,
      topicMaterial,
      topicMaterialFingerprint,
      materialCustomPrompt,
      linkCaptureUrlDraft: linkExtractUrl,
      pasteMaterialDraft: pasteBlockInput,
      sourceMaterialRawInput,
      mobileWorkflow: mobileWorkflow.workflowState(),
    };
  }

  function applyProjectState(state: SavedEssayEngineProjectState) {
    applySourceWorkspaceState(state);
    setEssayDraftTitle(state.essayDraftTitle ?? "");
    setEssayDraftContent(state.essayDraftContent ?? "");
    setEssayDraftUpdatedAt(state.essayDraftUpdatedAt ?? null);
    setEssayDraftStatus(null);
    setTask(state.task ?? "translate");
    setSourceLanguage(state.sourceLanguage ?? "");
    setTargetLanguage(state.targetLanguage ?? "Chinese Simplified");
    setTone(state.tone ?? "");
    setInstructionPreset(state.instructionPreset ?? "");
    setCustomInstruction(state.customInstruction ?? "");
    setOutputMode(state.outputMode ?? "auto");
    setProviders(state.providers?.length ? state.providers : ["openai"]);
    setFinalResult(state.finalResult ?? null);
    setResultStatus(state.resultStatus ?? "Draft");
    setTtsVoice(state.ttsVoice ?? "echo");
    setTtsSpeed(state.ttsSpeed ?? 1);
    setTtsStyle(state.ttsStyle ?? "Default");
    setSourceMaterialPipeline(state.sourceMaterialPipeline ?? "transcript");
    const g = state.genericMaterialState;
    if (g) {
      setGenericMaterialKind(g.kind);
      setGenericMaterialTitle(g.title ?? "");
      setGenericMaterialUrl(g.url ?? "");
      setGenericAuthor(g.author ?? "");
      setGenericRawContent(g.rawContent ?? "");
      setGenericSegments(g.segments ?? []);
      setGenericCheckedIds(g.checkedSegmentIds ?? []);
    } else {
      setGenericMaterialKind("article");
      setGenericMaterialTitle("");
      setGenericMaterialUrl("");
      setGenericAuthor("");
      setGenericRawContent("");
      setGenericSegments([]);
      setGenericCheckedIds([]);
    }
    setMaterialUseFullExplicit(state.materialUseFullExplicit ?? false);
    setSavedTopicMaterial(state.savedTopicMaterial ?? "");
    setTopicMaterial(state.topicMaterial ?? null);
    setTopicMaterialFingerprint(state.topicMaterialFingerprint ?? null);
    setTopicMaterialStatus("");
    setMaterialCustomPrompt(state.materialCustomPrompt ?? "");
    setLinkExtractUrl(state.linkCaptureUrlDraft ?? "");
    setPasteBlockInput(state.pasteMaterialDraft ?? "");
    const migratedRaw =
      (state.sourceMaterialRawInput?.trim() && state.sourceMaterialRawInput) ||
      (isStandaloneUrlText(state.sourceText ?? "") ? (state.sourceText ?? "").trim() : "");
    setSourceMaterialRawInput(migratedRaw);
    setAutoExtractStatus(null);
    setLastQuickAction(null);
    setLinkExtractStatus(null);
    setGenericWorkspaceNotice(null);
    setMaterialAnalysisStatus(null);
    mobileWorkflow.applyWorkflowState(state.mobileWorkflow);
    onResult(state.result ?? null);
    stopCurrentAudio();
  }

  function clearWorkspaceState() {
    clearSourceWorkspace();
    setTask("translate");
    setOutputMode("auto");
    setSourceLanguage("");
    setTargetLanguage("Chinese Simplified");
    setTone("");
    setInstructionPreset("");
    setCustomInstruction("");
    setProviders(["openai"]);
    setSourceMaterialPipeline("transcript");
    setGenericMaterialKind("article");
    setGenericMaterialTitle("");
    setGenericMaterialUrl("");
    setGenericAuthor("");
    setGenericRawContent("");
    setGenericSegments([]);
    setGenericCheckedIds([]);
    setLinkExtractUrl("");
    setPasteBlockInput("");
    setSourceMaterialRawInput("");
    setAutoExtractStatus(null);
    setLastQuickAction(null);
    setLinkExtractStatus(null);
    setGenericWorkspaceNotice(null);
    setLinkExtractLoading(false);
    setAudioUploadLoading(false);
    setMaterialUseFullExplicit(false);
    setSavedTopicMaterial("");
    setTopicMaterial(null);
    setTopicMaterialFingerprint(null);
    setTopicMaterialStatus("");
    setMaterialCustomPrompt("");
    setMaterialAnalysisStatus(null);
    setMaterialAnalysisLoading(false);
    mobileWorkflow.resetWorkflow();
    setFinalResult(null);
    setEssayDraftStatus(null);
    stopCurrentAudio();
    setResultStatus("Draft");
    onResult(null);
  }

  function startNewProject() {
    if (
      (input.trim() || sourceVersions.length > 0 || essayDraftContent.trim() || result || finalResult) &&
      !window.confirm("Start a new blank workspace? Existing saved projects will remain available, but unsaved changes in the current workspace may be lost.")
    ) {
      return;
    }
    clearWorkspace();
  }

  function markResultAsFinal(output: string, provider?: LLMProvider, providerLabel?: string) {
    const version = createSourceVersion({
      content: output,
      origin: "generated_result",
      label: providerLabel ? `Final article from ${providerLabel}` : "Final article",
      task,
      provider,
      parentVersionId: currentSourceVersionId ?? undefined,
    });
    const selection = {
      output,
      provider,
      providerLabel,
      updatedAt: new Date().toISOString(),
      sourceVersionId: version?.id,
    };
    setFinalResult(selection);
    setFinalVersionId(version?.id ?? null);
    setResultStatus("Final");
    setProjectStatus("Final result selected.");
  }

  async function generate() {
    setLoading(true);
    setError(null);
    onResult(null);
    if (!canProcessTopicMaterial(topicMaterial)) {
      setLoading(false);
      setError(
        isProbablyUrl(customInstruction, { anywhere: true })
          ? "这看起来是素材链接。请先放到“素材”阶段提取并保存为题材。"
          : "请先在“题材”阶段保存题材，再进行加工。",
      );
      return;
    }
    const payloadInput = topicMaterial.content.trim();
    if (!payloadInput) {
      setLoading(false);
      setError("请先在“题材”阶段保存题材，再进行加工。");
      return;
    }
    try {
      // Processing must use TopicMaterial.content only. Full source is allowed only when topicMaterial.useFullSource is true.
      const req: EngineRequest = {
        input: payloadInput,
        task,
        outputMode,
        sourceLanguage: sourceLanguage || undefined,
        targetLanguage: targetLanguage || undefined,
        tone: tone || undefined,
        userInstruction: [combinedInstruction(), buildGenerateSourceContract(payloadInput)].filter(Boolean).join("\n\n"),
        providers: providers.length > 0 ? providers : undefined,
      };
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status}).`);
        return;
      }
      onResult(data as EngineResponse);
      setResultStatus("Draft");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  async function getTranscript(overrideUrl?: string) {
    setTranscriptLoading(true);
    setTranscriptStatus(null);
    const sourceUrl = (overrideUrl ?? (sourceMaterialRawInput.trim() || input.trim())).trim();
    if (!sourceUrl) {
      setTranscriptStatus("缺少可提取的链接。");
      setTranscriptLoading(false);
      return;
    }
    if (YOUTUBE_RE.test(sourceUrl)) {
      setYoutubeSourceUrl(sourceUrl);
    }
    try {
      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: sourceUrl }),
      });
      const data = (await res.json()) as {
        text?: string;
        segments?: TranscriptSegment[];
        warnings?: string[];
        error?: string;
      };
      if (!res.ok) {
        setTranscriptStatus(data.error ?? `Request failed (${res.status}).`);
        return;
      }
      if (data.text) {
        setTranscriptText(data.text);
        setTranscriptSegments(data.segments ?? []);
        setTranscriptOrigin("fetched transcript");
        setTranscriptLibraryTitle(extractYouTubeVideoId(sourceUrl) ? `YouTube ${extractYouTubeVideoId(sourceUrl)}` : "Untitled Transcript");
        setTimestampChapterInput("");
        setChapterSectionsGenerated(false);
        setCheckedFullSectionIds([]);
        setCheckedChapterIds([]);
        setTopicMatchedSectionIds([]);
        setCheckedTopicSectionIds([]);
        setFullSectionStatus(null);
        setChapterStatus(null);
        setRangeStatus(null);
        setTopicStatus(null);
        setSourceMaterialPipeline("transcript");
        setMaterialUseFullExplicit(false);
        setTranscriptStatus("素材已提取。请勾选章节或片段后再写入 Source。");
      } else {
        setTranscriptText("");
        setTranscriptSegments([]);
        setTranscriptOrigin("none");
        setTimestampChapterInput("");
        setChapterSectionsGenerated(false);
        setCheckedFullSectionIds([]);
        setCheckedChapterIds([]);
        setTopicMatchedSectionIds([]);
        setCheckedTopicSectionIds([]);
        setFullSectionStatus(null);
        setChapterStatus(null);
        setRangeStatus(null);
        setTopicStatus(null);
        setTranscriptStatus(data.warnings?.[0] ?? "暂不可用该链接的字幕/转录。");
      }
    } catch (err) {
      setTranscriptStatus(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setTranscriptLoading(false);
    }
  }

  function useResultAsSource(output: string) {
    const version = createSourceVersion({
      content: output,
      origin: "generated_result",
      label: "Generated result",
      task,
      parentVersionId: currentSourceVersionId ?? undefined,
    });
    setInput(version?.content ?? output);
    setSourceType("selected_result");
    setSourceFrom("generated result");
    setSourceSelectionCount(1);
    setResultStatus("Accepted");
    if (version) setSourceActionStatus("Generated result promoted to a new source version.");
  }

  function addResultToSource(output: string) {
    appendToSource(output, "mixed_source_content", "Result added to Source Capture.", 1);
    setResultStatus("Accepted");
  }

  function continueFromResult(output: string, nextTask: EngineTask) {
    const version = createSourceVersion({
      content: output,
      origin: "continued_result",
      label: `Continue: ${nextTask}`,
      task: nextTask,
      parentVersionId: currentSourceVersionId ?? undefined,
    });
    setInput(version?.content ?? output);
    setSourceType("selected_result");
    setSourceFrom("generated result");
    setSourceSelectionCount(1);
    setTask(nextTask);
    setWorkflowStep((step) => step + 1);
    setResultStatus(nextTask === "paraphrase" || nextTask === "rewrite" ? "Needs Rewrite" : "Draft");
    if (version) setSourceActionStatus(`Result is now Source Capture. Task set to ${nextTask}.`);
    window.setTimeout(() => {
      generateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function readResultAloud(output: string) {
    runTtsAction("play", output, "essayengine-result", "essayengine-result.mp3");
  }

  function appendToEssayDraft(text: string, message = "Added to Essay Draft.") {
    const cleanText = text.trim();
    if (!cleanText) {
      setEssayDraftStatus("No text to add to Essay Draft.");
      return;
    }
    setEssayDraftContent((current) => [current.trim(), cleanText].filter(Boolean).join("\n\n"));
    setEssayDraftUpdatedAt(new Date().toISOString());
    setEssayDraftStatus(message);
  }

  function replaceEssayDraft(text: string, message = "Essay Draft replaced.") {
    const cleanText = text.trim();
    if (!cleanText) {
      setEssayDraftStatus("No text to replace Essay Draft.");
      return;
    }
    if (essayDraftContent.trim() && !window.confirm("Replace the current Essay Draft with this result?")) {
      setEssayDraftStatus("Draft replace cancelled.");
      return;
    }
    setEssayDraftContent(cleanText);
    setEssayDraftUpdatedAt(new Date().toISOString());
    setEssayDraftStatus(message);
  }

  function saveEssayDraft() {
    setEssayDraftUpdatedAt(new Date().toISOString());
    setEssayDraftStatus("Essay Draft saved in this project.");
  }

  function clearEssayDraft() {
    if (essayDraftContent.trim() && !window.confirm("Clear the Essay Draft?")) return;
    setEssayDraftContent("");
    setEssayDraftUpdatedAt(new Date().toISOString());
    setEssayDraftStatus("Essay Draft cleared.");
  }

  async function copyEssayDraft() {
    if (!essayDraftContent.trim()) {
      setEssayDraftStatus("Essay Draft is empty.");
      return;
    }
    try {
      await navigator.clipboard.writeText(essayDraftContent);
      setEssayDraftStatus("Essay Draft copied.");
    } catch {
      setEssayDraftStatus("Copy failed. Select the draft manually.");
    }
  }

  function useEssayDraftAsSource() {
    const content = essayDraftContent.trim();
    if (!content) {
      setEssayDraftStatus("Essay Draft is empty.");
      return;
    }
    const version = createSourceVersion({
      content,
      origin: "essay_draft",
      label: essayDraftTitle.trim() || "Essay draft",
      parentVersionId: currentSourceVersionId ?? undefined,
    });
    setInput(content);
    setSourceType("essay_draft");
    setSourceFrom("essay draft");
    setSourceSelectionCount(1);
    setSourceActionStatus("Essay Draft is now the current Source.");
    setEssayDraftStatus(version ? `Essay Draft became Source v${version.versionNumber}.` : "Essay Draft became Source.");
    window.setTimeout(() => {
      generateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function markEssayDraftAsFinal() {
    const content = essayDraftContent.trim();
    if (!content) {
      setEssayDraftStatus("Essay Draft is empty.");
      return;
    }
    const version = createSourceVersion({
      content,
      origin: "essay_draft",
      label: essayDraftTitle.trim() || "Essay draft final",
      parentVersionId: currentSourceVersionId ?? undefined,
    });
    setFinalVersionId(version?.id ?? null);
    setFinalResult({
      output: content,
      providerLabel: "Essay Draft",
      updatedAt: new Date().toISOString(),
      sourceVersionId: version?.id,
    });
    setResultStatus("Final");
    setEssayDraftUpdatedAt(new Date().toISOString());
    setEssayDraftStatus("Essay Draft marked as Final.");
  }

  function startFreshWritingPipeline() {
    if (
      (sourceVersions.length > 0 || input.trim() || sourceMaterialRawInput.trim() || essayDraftContent.trim() || result || finalResult) &&
      !window.confirm("Start a fresh writing pipeline? This clears current Source Versions, Source, Result, Draft, and Final for this project.")
    ) {
      return;
    }
    resetPipelineSourceWorkspace();
    setSourceMaterialPipeline("transcript");
    setGenericMaterialKind("article");
    setGenericMaterialTitle("");
    setGenericMaterialUrl("");
    setGenericAuthor("");
    setGenericRawContent("");
    setGenericSegments([]);
    setGenericCheckedIds([]);
    setLinkExtractUrl("");
    setPasteBlockInput("");
    setSourceMaterialRawInput("");
    setAutoExtractStatus(null);
    setLastQuickAction(null);
    setLinkExtractStatus(null);
    setGenericWorkspaceNotice(null);
    setMaterialUseFullExplicit(false);
    setSavedTopicMaterial("");
    setMaterialCustomPrompt("");
    setMaterialAnalysisStatus(null);
    setMaterialAnalysisLoading(false);
    setFinalResult(null);
    setResultStatus("Draft");
    onResult(null);
    setEssayDraftTitle("");
    setEssayDraftContent("");
    setEssayDraftUpdatedAt(null);
    mobileWorkflow.resetWorkflow();
    setEssayDraftStatus("Fresh writing pipeline started.");
    setProjectStatus("Fresh writing pipeline started.");
  }

  function downloadEssayDraftTxt() {
    if (!essayDraftContent.trim()) {
      setEssayDraftStatus("Essay Draft is empty.");
      return;
    }
    const blob = new Blob([essayDraftContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "essayengine-draft.txt";
    link.click();
    URL.revokeObjectURL(url);
    setEssayDraftStatus("Essay Draft .txt downloaded.");
  }

  function refineResult(output: string, nextTask: Extract<EngineTask, "improve" | "paraphrase">) {
    setInput(output);
    setSourceType("selected_result");
    setSourceFrom("generated result");
    setSourceSelectionCount(1);
    setTask(nextTask);
    setResultStatus("Needs Rewrite");
    setSourceActionStatus(
      nextTask === "improve"
        ? "Selected result copied into Source Capture. Task set to Improve."
        : "Selected result copied into Source Capture. Task set to Paraphrase.",
    );
  }

  function useFullTranscriptAsSource() {
    if (!transcriptText.trim()) {
      setTranscriptStatus("暂无转录预览。请先提取素材。");
      return;
    }
    const content = formatTranscriptText(transcriptText);
    setInput(content);
    setSourceType("youtube_transcript_full");
    setSourceFrom(transcriptOrigin === "saved transcript" ? "saved transcript" : "fetched transcript");
    setSourceSelectionCount(fullTranscriptSections.length || 1);
    setSourceMaterialPipeline("transcript");
    setMaterialUseFullExplicit(true);
    createSourceVersion({
      content,
      origin: "transcript_selection",
      label: "使用完整素材（转录全文）",
      parentVersionId: currentSourceVersionId ?? undefined,
    });
    setTranscriptStatus("已使用完整素材替换 Source Capture（显式）。");
    setRangeStatus(null);
  }

  function toggleFullTranscriptSection(id: string) {
    setCheckedFullSectionIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  function clearCheckedFullTranscriptSections() {
    setCheckedFullSectionIds([]);
    setFullSectionStatus(null);
  }

  function copyFullTranscriptSections() {
    if (fullTranscriptSections.length === 0) {
      setFullSectionStatus("No full transcript sections available.");
      return;
    }
    copyTranscriptText(
      formatSectionsForSource(fullTranscriptSections, "## Full Transcript Sections"),
      "All clean transcript sections copied.",
      setFullSectionStatus,
    );
  }

  function addFullTranscriptSectionsToSource() {
    if (fullTranscriptSections.length === 0) {
      setFullSectionStatus("No full transcript sections available.");
      return;
    }
    appendToSource(
      formatSectionsForSource(fullTranscriptSections, "## Full Transcript Sections"),
      "youtube_transcript_full_sections",
      "All full transcript sections added to Source Capture.",
      fullTranscriptSections.length,
    );
    setFullSectionStatus("All full transcript sections added to Source Capture.");
  }

  function replaceSourceWithFullTranscriptSections() {
    if (fullTranscriptSections.length === 0) {
      setFullSectionStatus("No full transcript sections available.");
      return;
    }
    replaceSource(
      formatSectionsForSource(fullTranscriptSections, "## Full Transcript Sections"),
      "youtube_transcript_full_sections",
      "Source Capture replaced with full transcript sections.",
      setFullSectionStatus,
      fullTranscriptSections.length,
    );
  }

  function copyCheckedFullTranscriptSections() {
    const selected = checkedFullTranscriptSections();
    if (selected.length === 0) {
      setFullSectionStatus("Select at least one section to use this action.");
      return;
    }
    copyTranscriptText(
      formatSectionsForSource(selected, "## Selected Transcript Sections"),
      "Checked full transcript sections copied.",
      setFullSectionStatus,
    );
  }

  function addFullTranscriptSectionToSource(section: TranscriptWorkspaceSection) {
    appendToSource(
      formatSectionsForSource([section], "## Selected Transcript Sections"),
      "youtube_transcript_selected_chapters",
      "Section added to Source Capture.",
      1,
    );
    setFullSectionStatus("Section added to Source Capture.");
  }

  function addCheckedFullTranscriptSectionsToSource() {
    const selected = checkedFullTranscriptSections();
    if (selected.length === 0) {
      setFullSectionStatus("Select at least one section to use this action.");
      return;
    }
    appendToSource(
      formatSectionsForSource(selected, "## Selected Transcript Sections"),
      "youtube_transcript_selected_chapters",
      `${selected.length} full transcript section${selected.length === 1 ? "" : "s"} added to Source Capture.`,
      selected.length,
    );
    setFullSectionStatus(`${selected.length} full transcript section${selected.length === 1 ? "" : "s"} added to Source Capture.`);
  }

  function addCheckedFullTranscriptSectionsToDraft() {
    const selected = checkedFullTranscriptSections();
    if (selected.length === 0) {
      setFullSectionStatus("Select at least one section to add to Essay Draft.");
      return;
    }
    appendToEssayDraft(
      formatSectionsForSource(selected, "## Selected Transcript Sections"),
      `${selected.length} rough transcript section${selected.length === 1 ? "" : "s"} added to Essay Draft.`,
    );
    setFullSectionStatus(`${selected.length} rough transcript section${selected.length === 1 ? "" : "s"} added to Essay Draft.`);
  }

  function replaceSourceWithCheckedFullTranscriptSections() {
    const selected = checkedFullTranscriptSections();
    if (selected.length === 0) {
      setFullSectionStatus("Select at least one section to use this action.");
      return;
    }
    replaceSource(
      formatSectionsForSource(selected, "## Selected Transcript Sections"),
      "youtube_transcript_selected_chapters",
      `${selected.length} full transcript section${selected.length === 1 ? "" : "s"} replaced Source Capture.`,
      setFullSectionStatus,
      selected.length,
    );
  }

  function topicKeywords(): string[] {
    return topicInput
      .split(/[,;\n]+/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
  }

  function countKeywordMatches(text: string, keyword: string): number {
    if (!keyword) return 0;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.match(new RegExp(escaped, "gi"))?.length ?? 0;
  }

  function buildTopicMatches(): TopicSectionMatch[] {
    const keywords = topicKeywords();
    if (keywords.length === 0) return [];

    return fullTranscriptSections
      .map((section) => {
        const haystack = `${section.title}\n${section.text}`.toLowerCase();
        const score = keywords.reduce((total, keyword) => total + countKeywordMatches(haystack, keyword), 0);
        return { section, score };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score || a.section.start - b.section.start);
  }

  function findTopicSections() {
    const matches = buildTopicMatches();
    if (topicKeywords().length === 0) {
      setTopicMatchedSectionIds([]);
      setCheckedTopicSectionIds([]);
      setTopicStatus("Enter a topic or keyword first.");
      return;
    }
    setTopicMatchedSectionIds(matches.map((match) => match.section.id));
    setCheckedTopicSectionIds(matches.map((match) => match.section.id));
    setTopicStatus(
      matches.length > 0
        ? `${matches.length} matching section${matches.length === 1 ? "" : "s"} found.`
        : "No matching sections found.",
    );
  }

  function clearTopicMatches() {
    setTopicMatchedSectionIds([]);
    setCheckedTopicSectionIds([]);
    setTopicStatus(null);
  }

  function toggleTopicSection(id: string) {
    setCheckedTopicSectionIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  function copyMatchedSections() {
    const selected = checkedTopicSections();
    if (selected.length === 0) {
      setTopicStatus("Select at least one section to use this action.");
      return;
    }
    copyTranscriptText(
      formatSectionsForSource(selected, "## Topic Matched Transcript Sections"),
      "Matched sections copied.",
      setTopicStatus,
    );
  }

  function addMatchedSectionsToSource() {
    const selected = checkedTopicSections();
    if (selected.length === 0) {
      setTopicStatus("Select at least one section to use this action.");
      return;
    }
    appendToSource(
      formatSectionsForSource(selected, "## Topic Matched Transcript Sections"),
      "youtube_transcript_selected_sections",
      `${selected.length} matched section${selected.length === 1 ? "" : "s"} added to Source Capture.`,
      selected.length,
    );
    setTopicStatus(`${selected.length} matched section${selected.length === 1 ? "" : "s"} added to Source Capture.`);
  }

  function addMatchedSectionsToDraft() {
    const selected = checkedTopicSections();
    if (selected.length === 0) {
      setTopicStatus("Select at least one section to add to Essay Draft.");
      return;
    }
    appendToEssayDraft(
      formatSectionsForSource(selected, "## Topic Matched Transcript Sections"),
      `${selected.length} matched section${selected.length === 1 ? "" : "s"} added to Essay Draft.`,
    );
    setTopicStatus(`${selected.length} matched section${selected.length === 1 ? "" : "s"} added to Essay Draft.`);
  }

  function replaceSourceWithMatchedSections() {
    const selected = checkedTopicSections();
    if (selected.length === 0) {
      setTopicStatus("Select at least one section to use this action.");
      return;
    }
    replaceSource(
      formatSectionsForSource(selected, "## Topic Matched Transcript Sections"),
      "youtube_transcript_selected_sections",
      `${selected.length} matched section${selected.length === 1 ? "" : "s"} replaced Source Capture.`,
      setTopicStatus,
      selected.length,
    );
  }

  function useTranscriptRangeAsSource() {
    const startSeconds = parseTimestampToSeconds(selectedRangeStart);
    const endSeconds = parseTimestampToSeconds(selectedRangeEnd);

    if (startSeconds === null || endSeconds === null) {
      setRangeStatus("Enter a valid start and end time, e.g. 49:47 or 1:52:26.");
      return;
    }
    if (endSeconds <= startSeconds) {
      setRangeStatus("End time must be later than start time.");
      return;
    }

    const selectedRange = extractTranscriptRangeFromSegments(transcriptSegments, startSeconds, endSeconds);
    if (!selectedRange) {
      setRangeStatus("No transcript segments found in this range. Check the timestamp format.");
      return;
    }

    const formatted = formatTranscriptText(selectedRange);
    setInput(organizeTranscriptSections ? splitTranscriptIntoSections(formatted) : formatted);
    setSourceType(organizeTranscriptSections ? "youtube_transcript_range_sections" : "youtube_transcript_range");
    setRangeStatus(
      organizeTranscriptSections
        ? "Selected transcript range is now organized into sections and used as source."
        : "Selected transcript range is now used as source.",
    );
  }

  function clearTranscriptRange() {
    setSelectedRangeStart("");
    setSelectedRangeEnd("");
    setRangeStatus(null);
  }

  function updateManualRange(id: string, field: "start" | "end", value: string) {
    setManualRanges((ranges) =>
      ranges.map((range) => (range.id === id ? { ...range, [field]: value } : range)),
    );
  }

  function addManualRange() {
    setManualRanges((ranges) => [...ranges, { id: makeRangeId(), start: "", end: "" }]);
  }

  function removeManualRange(id: string) {
    setManualRanges((ranges) =>
      ranges.length > 1 ? ranges.filter((range) => range.id !== id) : [{ id: makeRangeId(), start: "", end: "" }],
    );
  }

  function clearManualRanges() {
    setManualRanges([{ id: makeRangeId(), start: "", end: "" }]);
    setRangeStatus(null);
  }

  function useManualRangesAsSource() {
    const blocks: { start: number; end: number; title: string; text: string }[] = [];
    const populatedRanges = manualRanges.filter((range) => range.start.trim() || range.end.trim());

    if (populatedRanges.length === 0) {
      setRangeStatus("Add at least one transcript range.");
      return;
    }

    for (let i = 0; i < populatedRanges.length; i += 1) {
      const range = populatedRanges[i];
      const startSeconds = parseTimestampToSeconds(range.start);
      const endSeconds = parseTimestampToSeconds(range.end);
      const label = `Range ${i + 1}`;
      if (startSeconds === null || endSeconds === null) {
        setRangeStatus(`${label} has an invalid timestamp. Use MM:SS or H:MM:SS.`);
        return;
      }
      if (endSeconds <= startSeconds) {
        setRangeStatus(`${label} end time must be later than start time.`);
        return;
      }
      const text = extractTranscriptRangeFromSegments(transcriptSegments, startSeconds, endSeconds);
      if (!text) {
        setRangeStatus(`${label} has no transcript segments. Check the timestamp range.`);
        return;
      }
      blocks.push({
        start: startSeconds,
        end: endSeconds,
        title: titleFromText(text, `Range ${i + 1}`),
        text,
      });
    }

    if (blocks.length === 0) return;
    setInput(formatSelectedTranscriptBlocks(blocks));
    setSourceType("youtube_transcript_selected_ranges");
    setRangeStatus(`${blocks.length} transcript range${blocks.length === 1 ? "" : "s"} are now used as source.`);
  }

  /**
   * Build manual timestamp ranges into transcript slices.
   * When `silent` is true, skip status updates (used from render-time helpers like `transcriptSelectedMaterialText`;
   * calling setState there causes "Too many re-renders").
   */
  function manualRangeBlocks(options: { silent?: boolean } = {}): { start: number; end: number; title: string; text: string }[] | null {
    const silent = options.silent ?? false;
    const blocks: { start: number; end: number; title: string; text: string }[] = [];
    const populatedRanges = manualRanges.filter((range) => range.start.trim() || range.end.trim());

    if (populatedRanges.length === 0) {
      if (!silent) setRangeStatus("Add at least one transcript range.");
      return null;
    }

    for (let i = 0; i < populatedRanges.length; i += 1) {
      const range = populatedRanges[i];
      const startSeconds = parseTimestampToSeconds(range.start);
      const endSeconds = parseTimestampToSeconds(range.end);
      const label = `Range ${i + 1}`;
      if (startSeconds === null || endSeconds === null) {
        if (!silent) setRangeStatus(`${label} has an invalid timestamp. Use MM:SS or H:MM:SS.`);
        return null;
      }
      if (endSeconds <= startSeconds) {
        if (!silent) setRangeStatus(`${label} end time must be later than start time.`);
        return null;
      }
      const text = extractTranscriptRangeFromSegments(transcriptSegments, startSeconds, endSeconds);
      if (!text) {
        if (!silent) setRangeStatus(`${label} has no transcript segments. Check the timestamp range.`);
        return null;
      }
      blocks.push({
        start: startSeconds,
        end: endSeconds,
        title: titleFromText(text, `Range ${i + 1}`),
        text,
      });
    }

    return blocks;
  }

  function formatManualRangesForSource(blocks: { start: number; end: number; title: string; text: string }[]): string {
    if (organizeTranscriptSections) {
      return formatSelectedTranscriptBlocks(blocks, "## Manual Transcript Ranges", includeTranscriptTimestamps);
    }
    return blocks.map((block) => formatTranscriptText(block.text)).join("\n\n");
  }

  function addManualRangesToSource() {
    const blocks = manualRangeBlocks();
    if (!blocks) return;
    appendToSource(
      formatManualRangesForSource(blocks),
      "youtube_transcript_selected_ranges",
      `${blocks.length} transcript range${blocks.length === 1 ? "" : "s"} added to Source Capture.`,
      blocks.length,
    );
    setRangeStatus(`${blocks.length} transcript range${blocks.length === 1 ? "" : "s"} added to Source Capture.`);
  }

  function addManualRangesToDraft() {
    const blocks = manualRangeBlocks();
    if (!blocks) return;
    appendToEssayDraft(
      formatManualRangesForSource(blocks),
      `${blocks.length} transcript range${blocks.length === 1 ? "" : "s"} added to Essay Draft.`,
    );
    setRangeStatus(`${blocks.length} transcript range${blocks.length === 1 ? "" : "s"} added to Essay Draft.`);
  }

  function replaceSourceWithManualRanges() {
    const blocks = manualRangeBlocks();
    if (!blocks) return;
    replaceSource(
      formatManualRangesForSource(blocks),
      "youtube_transcript_selected_ranges",
      `${blocks.length} transcript range${blocks.length === 1 ? "" : "s"} replaced Source Capture.`,
      setRangeStatus,
      blocks.length,
    );
  }

  function toggleGenericSegment(id: string) {
    setGenericCheckedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  function transcriptSelectedMaterialText(): { text: string; summary: string } | null {
    if (!transcriptText.trim()) return null;
    if (materialUseFullExplicit) {
      return {
        text: formatTranscriptText(transcriptText),
        summary: "使用完整素材（字幕 / 转录全文）",
      };
    }
    const ch = checkedWorkspaceSections();
    if (ch.length > 0) {
      return {
        text: cleanSectionsText(ch, true, includeTranscriptTimestamps),
        summary: `时间戳章节 · 已选 ${ch.length} 段`,
      };
    }
    const full = checkedFullTranscriptSections();
    if (full.length > 0) {
      return {
        text: cleanSectionsText(full, true, includeTranscriptTimestamps),
        summary: `粗分段 · 已选 ${full.length} 段`,
      };
    }
    const topic = checkedTopicSections();
    if (topic.length > 0) {
      return {
        text: cleanSectionsText(topic, true, includeTranscriptTimestamps),
        summary: `主题筛选 · 已选 ${topic.length} 段`,
      };
    }
    const manual = manualRangeBlocks({ silent: true });
    if (manual && manual.length > 0) {
      return {
        text: formatManualRangesForSource(manual),
        summary: `手动时间范围 · ${manual.length} 段`,
      };
    }
    return null;
  }

  function genericSelectedMaterialText(): { text: string; summary: string } | null {
    if (materialUseFullExplicit) {
      const raw = genericRawContent.trim();
      if (raw) {
        return { text: raw, summary: "Full source (document)" };
      }
      if (genericSegments.length > 0) {
        const body = genericSegments
          .map((s) => s.text)
          .join("\n\n")
          .trim();
        if (body) {
          return { text: body, summary: "Full source (blocks)" };
        }
      }
      return null;
    }
    if (!genericRawContent.trim() && genericSegments.length === 0) return null;
    const picked = genericSegments.filter((s) => genericCheckedIds.includes(s.id));
    if (picked.length === 0) return null;
    const hasTs = picked.some((s) => s.startTime !== undefined);
    const body = picked
      .map((s) => {
        if (hasTs && s.startTime !== undefined) {
          const a = formatSecondsTimestamp(s.startTime);
          const b = s.endTime !== undefined ? formatSecondsTimestamp(s.endTime) : "";
          return b ? `[${a}-${b}]\n${s.text}` : `[${a}]\n${s.text}`;
        }
        return s.text;
      })
      .join("\n\n");
    return {
      text: body,
      summary: hasTs ? `已选 ${picked.length} 条字幕块` : `已选 ${picked.length} 个段落块`,
    };
  }

  function computeSelectedSourceMaterial(): {
    text: string;
    summary: string;
    analysisSourceType: SourceMaterialType;
  } | null {
    if (materialUseFullExplicit && transcriptText.trim()) {
      return {
        text: formatTranscriptText(transcriptText),
        summary: "Full transcript",
        analysisSourceType: "youtube",
      };
    }
    if (sourceMaterialPipeline === "transcript") {
      const t = transcriptSelectedMaterialText();
      if (!t) return null;
      return { ...t, analysisSourceType: "youtube" };
    }
    const g = genericSelectedMaterialText();
    if (!g) return null;
    return { ...g, analysisSourceType: genericMaterialKind };
  }

  function makeTopicId(prefix = "topic"): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function topicSourceId(): string {
    if (sourceMaterialPipeline === "transcript") {
      return youtubeSourceUrl || sourceMaterialRawInput.trim() || input.trim() || "transcript-source";
    }
    return genericMaterialUrl || genericMaterialTitle || sourceMaterialRawInput.trim() || input.trim() || "material-source";
  }

  function topicSourceType(): string {
    return sourceMaterialPipeline === "transcript" ? "youtube" : genericMaterialKind;
  }

  function currentTopicFingerprintText(): string {
    if (sourceMaterialPipeline === "transcript" && transcriptText.trim()) {
      return formatTranscriptText(transcriptText);
    }
    if (genericRawContent.trim()) return genericRawContent;
    if (genericSegments.length > 0) {
      return genericSegments.map((segment) => segment.text).join("\n\n");
    }
    return input;
  }

  function selectedTranscriptMaterialForTopic(): {
    text: string;
    summary: string;
    selectedSegmentIds: string[];
    selectedRange?: TopicMaterial["selectedRange"];
  } | null {
    if (!transcriptText.trim()) return null;
    const ch = checkedWorkspaceSections();
    if (ch.length > 0) {
      return {
        text: cleanSectionsText(ch, true, includeTranscriptTimestamps),
        summary: `时间戳章节 · 已选 ${ch.length} 段`,
        selectedSegmentIds: ch.map((section) => section.id),
      };
    }
    const full = checkedFullTranscriptSections();
    if (full.length > 0) {
      return {
        text: cleanSectionsText(full, true, includeTranscriptTimestamps),
        summary: `粗分段 · 已选 ${full.length} 段`,
        selectedSegmentIds: full.map((section) => section.id),
      };
    }
    const topic = checkedTopicSections();
    if (topic.length > 0) {
      return {
        text: cleanSectionsText(topic, true, includeTranscriptTimestamps),
        summary: `主题筛选 · 已选 ${topic.length} 段`,
        selectedSegmentIds: topic.map((section) => section.id),
      };
    }
    const manual = manualRangeBlocks({ silent: true });
    if (manual && manual.length > 0) {
      const first = manual[0];
      const last = manual[manual.length - 1];
      return {
        text: formatManualRangesForSource(manual),
        summary: `手动时间范围 · ${manual.length} 段`,
        selectedSegmentIds: manual.map((block, index) => `manual-range-${index + 1}-${block.start}-${block.end}`),
        selectedRange: {
          startTime: first.start,
          endTime: last.end,
        },
      };
    }
    return null;
  }

  function selectedGenericMaterialForTopic(): {
    text: string;
    summary: string;
    selectedSegmentIds: string[];
    selectedRange?: TopicMaterial["selectedRange"];
  } | null {
    const picked = genericSegments.filter((segment) => genericCheckedIds.includes(segment.id));
    if (picked.length === 0) return null;
    const hasTs = picked.some((segment) => segment.startTime !== undefined);
    const body = picked
      .map((segment) => {
        if (hasTs && segment.startTime !== undefined) {
          const start = formatSecondsTimestamp(segment.startTime);
          const end = segment.endTime !== undefined ? formatSecondsTimestamp(segment.endTime) : "";
          return end ? `[${start}-${end}]\n${segment.text}` : `[${start}]\n${segment.text}`;
        }
        return segment.text;
      })
      .join("\n\n");
    const timed = picked.filter((segment) => segment.startTime !== undefined);
    return {
      text: body,
      summary: hasTs ? `已选 ${picked.length} 条字幕块` : `已选 ${picked.length} 个段落块`,
      selectedSegmentIds: picked.map((segment) => segment.id),
      selectedRange: timed.length
        ? {
            startTime: timed[0].startTime,
            endTime: timed[timed.length - 1].endTime,
          }
        : undefined,
    };
  }

  function createTopicMaterialFromCurrentSelection(): TopicMaterial | null {
    const selected = sourceMaterialPipeline === "transcript"
      ? selectedTranscriptMaterialForTopic()
      : selectedGenericMaterialForTopic();
    const content = selected?.text.trim() ?? "";
    if (!selected || !content) return null;
    return {
      id: makeTopicId(),
      sourceId: topicSourceId(),
      sourceType: topicSourceType(),
      selectedSegmentIds: selected.selectedSegmentIds,
      selectedRange: selected.selectedRange,
      content,
      title: selected.summary,
      useFullSource: false,
      saved: true,
      createdAt: new Date().toISOString(),
    };
  }

  function hasSelectedMaterialForTopic(): boolean {
    return sourceMaterialPipeline === "transcript"
      ? Boolean(selectedTranscriptMaterialForTopic()?.text.trim())
      : Boolean(selectedGenericMaterialForTopic()?.text.trim());
  }

  function createTopicMaterialFromFullSource(): TopicMaterial | null {
    const content = resolveFullSourceTextForRequest()?.trim() ?? "";
    if (!content) return null;
    return {
      id: makeTopicId("topic-full"),
      sourceId: topicSourceId(),
      sourceType: topicSourceType(),
      selectedSegmentIds: [],
      content,
      title: sourceMaterialPipeline === "transcript"
        ? transcriptLibraryTitle || "Full transcript"
        : genericMaterialTitle || "Full source",
      useFullSource: true,
      saved: true,
      createdAt: new Date().toISOString(),
    };
  }

  function saveTopicMaterial(nextTopicMaterial: TopicMaterial, message: string) {
    setTopicMaterial(nextTopicMaterial);
    setTopicMaterialFingerprint(computeSourceFingerprint(currentTopicFingerprintText()));
    setTopicMaterialStatus(message);
  }

  function handleSaveAsTopic() {
    const nextTopicMaterial = createTopicMaterialFromCurrentSelection();
    if (!nextTopicMaterial) {
      setTopicMaterialStatus("请先选择素材。");
      setMaterialAnalysisStatus("No selected material to save.");
      return;
    }
    setSavedTopicMaterial((prev) =>
      prev.trim() ? `${prev.trim()}\n\n---\n\n${nextTopicMaterial.content}` : nextTopicMaterial.content,
    );
    appendBlockToCustomInstruction("Saved topic material", nextTopicMaterial.content);
    saveTopicMaterial(nextTopicMaterial, "题材已保存。");
    setMaterialAnalysisStatus("Saved to topic stash and appended to your task instruction.");
  }

  function handleUseFullSource() {
    const nextTopicMaterial = createTopicMaterialFromFullSource();
    if (!nextTopicMaterial) {
      setTopicMaterialStatus("没有可用的完整素材。");
      setMaterialAnalysisStatus("No transcript or document text available as full source.");
      return;
    }
    setMaterialUseFullExplicit(true);
    appendBlockToCustomInstruction("Full source material", nextTopicMaterial.content);
    saveTopicMaterial(nextTopicMaterial, "已使用完整素材保存题材。");
    setMaterialAnalysisStatus("Full source is on; material was appended to your task instruction.");
    setProjectStatus("Full source enabled and saved as topic material.");
  }

  function handleClearTopic() {
    setTopicMaterial(null);
    setTopicMaterialFingerprint(null);
    setTopicMaterialStatus("题材已清除。");
  }

  function runWithTopicMaterialGuard(action: () => void | Promise<void>) {
    if (!canProcessTopicMaterial(topicMaterial)) {
      setError("请先在“题材”阶段保存题材，再进行加工。");
      setTopicMaterialStatus("请先在“题材”阶段保存题材，再进行加工。");
      setProjectStatus("请先在“题材”阶段保存题材，再进行加工。");
      return;
    }
    void action();
  }

  function canRunMaterialOutputNow(): boolean {
    if (computeSelectedSourceMaterial()) return true;
    const body = input.trim();
    if (!body) return false;
    if (sourceType === "youtube_url" && YOUTUBE_RE.test(body)) return false;
    if (isStandaloneUrlText(body)) return false;
    return true;
  }

  function clearMaterialSelection() {
    setMaterialUseFullExplicit(false);
    setCheckedChapterIds([]);
    setCheckedFullSectionIds([]);
    setCheckedTopicSectionIds([]);
    setGenericCheckedIds([]);
    setMaterialAnalysisStatus(null);
  }

  function applyQuickRequest(def: QuickRequestButtonDef) {
    if (!canRunMaterialOutputNow()) {
      setProjectStatus("Extract and select source material first, then choose a quick request.");
      return;
    }
    setLastQuickAction(def.label);
    setTask(def.task);
    setInstructionPreset("");
    setCustomInstruction(def.instruction);
  }

  function handleCustomInstructionChange(value: string) {
    const head = value.trim().split("\n")[0]?.trim() ?? "";
    if (isStandaloneUrlText(value.trim())) {
      setSourceMaterialRawInput(value.trim());
      setCustomInstruction("");
      setProjectStatus("This looks like a source URL — moved to Source / 已将链接移到「素材来源」，正在提取。");
      return;
    }
    if (head && isStandaloneUrlText(head) && (value.includes("\n") || value.length > head.length + 2)) {
      setSourceMaterialRawInput(head);
      setCustomInstruction(value.slice(value.indexOf("\n")).trim());
      setProjectStatus("Detected URL in first line — moved to Source / 首行链接已移到「素材来源」。");
      return;
    }
    setCustomInstruction(value);
  }

  function buildGenerateSourceContract(payloadInput: string): string {
    const sel = computeSelectedSourceMaterial();
    const mat = sel?.text ?? payloadInput;
    const st = sel?.analysisSourceType ?? genericMaterialKind;
    return [
      "SOURCE PAYLOAD (machine-readable)",
      `sourceType: ${st}`,
      `sourceMetadata: ${buildSourceMetadataForAnalysis()}`,
      `selectedMaterial: ${mat}`,
      `userRequest: ${[instructionPreset, customInstruction.trim()].filter(Boolean).join(" ").trim() || "(none)"}`,
      `quickAction: ${lastQuickAction ?? "(none)"}`,
      "",
      "System rule: Only use selectedMaterial as factual source. Do not use the full source unless the user explicitly chose Use Full Source.",
      "Do not treat a source URL as the writing instruction. Do not invent content outside selectedMaterial.",
    ].join("\n");
  }

  function buildSourceMetadataForAnalysis(): string {
    const lines: string[] = [];
    if (sourceMaterialPipeline === "transcript") {
      if (youtubeSourceUrl) lines.push(`URL: ${youtubeSourceUrl}`);
      if (transcriptLibraryTitle) lines.push(`Title: ${transcriptLibraryTitle}`);
      lines.push(`Origin: ${transcriptOrigin}`);
    } else {
      if (genericMaterialTitle) lines.push(`Title: ${genericMaterialTitle}`);
      if (genericMaterialUrl) lines.push(`URL: ${genericMaterialUrl}`);
      if (genericAuthor) lines.push(`Author/site: ${genericAuthor}`);
    }
    return lines.join("\n") || "(none)";
  }

  async function runMaterialAnalysisTask(userTask: string) {
    const sel = computeSelectedSourceMaterial();
    if (!sel) {
      setMaterialAnalysisStatus("Select material blocks, chapters, or turn on Use Full Source first.");
      return;
    }
    setMaterialAnalysisLoading(true);
    setMaterialAnalysisStatus(null);
    setError(null);
    try {
      const userInstruction = buildMaterialAnalysisInstruction({
        sourceType: `${labelForMaterialKind(sel.analysisSourceType, "zh")} (${sel.analysisSourceType})`,
        sourceMetadata: buildSourceMetadataForAnalysis(),
        selectedMaterial: sel.text,
        task: userTask,
      });
      const req: EngineRequest = {
        input: sel.text,
        task: "extract",
        outputMode: "content_only",
        sourceLanguage: sourceLanguage || undefined,
        targetLanguage: targetLanguage || undefined,
        tone: tone || undefined,
        userInstruction,
        providers: providers.length > 0 ? providers : undefined,
      };
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (!res.ok) {
        setMaterialAnalysisStatus(data.error ?? `Request failed (${res.status}).`);
        return;
      }
      onResult(data as EngineResponse);
      setResultStatus("Draft");
      setMaterialAnalysisStatus("Analysis finished. See AI output for the result.");
    } catch (err) {
      setMaterialAnalysisStatus(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setMaterialAnalysisLoading(false);
    }
  }

  /**
   * Fetch HTML page text and populate generic paragraph blocks. Returns false if YouTube or request failed.
   */
  async function fetchAndApplyGenericLink(url: string): Promise<boolean> {
    const kind = detectMaterialKindFromUrl(url);
    if (kind === "youtube") {
      setLinkExtractStatus("YouTube 请使用「转录 / 字幕」页签获取带时间戳字幕。");
      return false;
    }
    setLinkExtractLoading(true);
    setLinkExtractStatus(null);
    setGenericWorkspaceNotice(null);
    try {
      const res = await fetch("/api/extract-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { text?: string; title?: string; error?: string; siteName?: string };
      if (!res.ok) {
        setLinkExtractStatus(data.error ?? `提取失败（${res.status}）`);
        return false;
      }
      const raw = (data.text ?? "").trim();
      if (!raw) {
        setLinkExtractStatus("未能从页面提取正文，可改用手动粘贴。");
        return false;
      }
      setLinkExtractUrl(url);
      setSourceMaterialPipeline("link");
      setGenericMaterialKind(kind);
      setGenericMaterialUrl(url);
      let hostname = "";
      try {
        hostname = new URL(url).hostname;
      } catch {
        hostname = "";
      }
      setGenericMaterialTitle(data.title?.trim() || hostname || "链接内容");
      setGenericAuthor(data.siteName?.trim() ?? "");
      setGenericRawContent(raw);
      setGenericSegments(splitPlainTextIntoParagraphBlocks(raw, "段落"));
      setGenericCheckedIds([]);
      setMaterialUseFullExplicit(false);
      setGenericWorkspaceNotice("正文已拆分为可选段落。请勾选需要的块。");
      return true;
    } catch (err) {
      setLinkExtractStatus(err instanceof Error ? err.message : "提取失败");
      return false;
    } finally {
      setLinkExtractLoading(false);
    }
  }

  async function runLinkMaterialExtract() {
    const url = linkExtractUrl.trim();
    if (!url) {
      setLinkExtractStatus("请输入链接。");
      return;
    }
    await fetchAndApplyGenericLink(url);
  }

  function applyPasteMaterialBlocksFromRaw(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setPasteBlockInput(text);
    setSourceMaterialPipeline("paste");
    setGenericMaterialKind("text");
    setGenericMaterialUrl("");
    setGenericMaterialTitle("粘贴长文");
    setGenericAuthor("");
    setGenericRawContent(text);
    setGenericSegments(splitPlainTextIntoParagraphBlocks(text, "段落"));
    setGenericCheckedIds([]);
    setMaterialUseFullExplicit(false);
    setGenericWorkspaceNotice("已拆分为段落块，请勾选需要的部分。");
  }

  function applyPasteMaterialBlocks() {
    const raw = pasteBlockInput.trim();
    if (!raw) {
      setGenericWorkspaceNotice("请先粘贴长文。");
      return;
    }
    applyPasteMaterialBlocksFromRaw(raw);
  }

  async function transcribeAudioFile(file: File) {
    if (!file.size) {
      setGenericWorkspaceNotice("音频文件为空。");
      return;
    }
    setAudioUploadLoading(true);
    setGenericWorkspaceNotice(null);
    try {
      const fd = new FormData();
      fd.set("audio", file);
      fd.set("mimeType", file.type || "audio/webm");
      fd.set("filename", file.name);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setGenericWorkspaceNotice(data.error ?? "转写失败");
        return;
      }
      const raw = (data.text ?? "").trim();
      if (!raw) {
        setGenericWorkspaceNotice("转写结果为空。");
        return;
      }
      setSourceMaterialPipeline("audio");
      setGenericMaterialKind("audio");
      setGenericMaterialUrl("");
      setGenericMaterialTitle(file.name);
      setGenericAuthor("");
      setGenericRawContent(raw);
      setGenericSegments(splitPlainTextIntoParagraphBlocks(raw, "转录段落"));
      setGenericCheckedIds([]);
      setMaterialUseFullExplicit(false);
      setGenericWorkspaceNotice("转写完成。按段落勾选后再分析或写入 Source。");
    } catch (err) {
      setGenericWorkspaceNotice(err instanceof Error ? err.message : "转写失败");
    } finally {
      setAudioUploadLoading(false);
    }
  }

  async function ingestDocumentFile(file: File) {
    const name = file.name.toLowerCase();
    let raw = "";
    try {
      raw = await file.text();
    } catch {
      setGenericWorkspaceNotice("无法读取该文件。");
      return;
    }
    let segments: SourceSegment[] = [];
    if (name.endsWith(".srt")) {
      segments = segmentsFromSrtContent(raw);
    } else if (name.endsWith(".vtt")) {
      segments = segmentsFromVttContent(raw);
    }
    if (!segments.length) {
      segments = splitPlainTextIntoParagraphBlocks(raw, "段落");
    }
    setSourceMaterialPipeline("document");
    setGenericMaterialKind("document");
    setGenericMaterialUrl("");
    setGenericMaterialTitle(file.name);
    setGenericAuthor("");
    setGenericRawContent(raw);
    setGenericSegments(segments);
    setGenericCheckedIds([]);
    setMaterialUseFullExplicit(false);
    setGenericWorkspaceNotice(
      segments.some((s) => s.startTime !== undefined)
        ? "已识别时间轴字幕块。"
        : "已按段落拆分，请勾选需要的部分。",
    );
  }

  function appendBlockToCustomInstruction(heading: string, body: string) {
    const block = `[${heading}]\n${body}`;
    setCustomInstruction((prev) => (prev.trim() ? `${prev.trim()}\n\n${block}` : block));
  }

  /** Plain text for "use full source" in Request; prefers transcript when present. */
  function resolveFullSourceTextForRequest(): string | null {
    if (transcriptText.trim()) {
      return formatTranscriptText(transcriptText);
    }
    const raw = genericRawContent.trim();
    if (raw) return raw;
    if (genericSegments.length > 0) {
      const body = genericSegments
        .map((s) => s.text)
        .join("\n\n")
        .trim();
      if (body) return body;
    }
    return null;
  }

  function appendTopicMaterialFromSelection() {
    handleSaveAsTopic();
  }

  function enableFullSourceAndAppendToRequest() {
    handleUseFullSource();
  }

  function replaceSourceCaptureFromMaterialSelection() {
    const sel = computeSelectedSourceMaterial();
    if (!sel) {
      setMaterialAnalysisStatus("请先选择素材。");
      return;
    }
    replaceSource(
      sel.text,
      "mixed_source_content",
      "已用所选素材替换 Source Capture。",
      setMaterialAnalysisStatus,
      1,
    );
  }

  function toggleTimestampChapter(id: string) {
    setCheckedChapterIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  function clearCheckedChapters() {
    setCheckedChapterIds([]);
    setChapterStatus(null);
  }

  function generateRoughChapterSuggestions() {
    const suggestions = buildRoughChapterSuggestions(transcriptSegments);
    if (!suggestions) {
      setChapterStatus("No transcript segments available for rough suggestions.");
      return;
    }
    setTimestampChapterInput(suggestions);
    setCheckedChapterIds([]);
    setChapterStatus("Rough suggestions generated — edit titles before using.");
  }

  function applyTimestampChapters() {
    if (timestampChapterInput.trim() && timestampChapters.length === 0) {
      setChapterStatus("No valid timestamp chapters found. Use formats like 00:00 Title or 1:02:08 Title.");
      setChapterSectionsGenerated(false);
      return;
    }
    setCheckedChapterIds([]);
    setChapterSectionsGenerated(timestampChapters.length > 0);
    setChapterStatus(
      timestampChapters.length > 0
        ? `${timestampChapters.length} timestamp chapter${timestampChapters.length === 1 ? "" : "s"} generated.`
        : "Paste timestamps before generating chapter sections.",
    );
  }

  function copyFullCleanTranscript() {
    copyTranscriptText(formatTranscriptText(transcriptText), "Full clean transcript copied.");
  }

  function copySectionCleanText(section: TranscriptWorkspaceSection) {
    copyTranscriptText(cleanSectionText(section), "Section clean text copied.");
  }

  function copyCheckedSectionsCleanText() {
    const selected = checkedWorkspaceSections();
    if (selected.length === 0) {
      setChapterStatus("Select at least one section to use this action.");
      return;
    }
    copyTranscriptText(cleanSectionsText(selected, true, includeTranscriptTimestamps), "Checked sections copied.");
  }

  function copyCheckedSectionsWithHeadings() {
    const selected = checkedWorkspaceSections();
    if (selected.length === 0) {
      setChapterStatus("Select at least one section to use this action.");
      return;
    }
    copyTranscriptText(cleanSectionsText(selected, true, includeTranscriptTimestamps), "Checked sections copied with headings.");
  }

  function addSectionToSource(section: TranscriptWorkspaceSection) {
    appendToSource(
      formatSectionsForSource([section], "## Selected Transcript Sections"),
      "youtube_transcript_selected_sections",
      "Section added to Source Capture.",
      1,
    );
  }

  function addSectionToDraft(section: TranscriptWorkspaceSection) {
    appendToEssayDraft(formatSectionsForSource([section], "## Selected Transcript Sections"), "Section added to Essay Draft.");
    setChapterStatus("Section added to Essay Draft.");
  }

  function addCheckedSectionsToSource() {
    const selected = checkedWorkspaceSections();
    if (selected.length === 0) {
      setChapterStatus("Select at least one section to use this action.");
      return;
    }
    appendToSource(
      formatSectionsForSource(selected, "## Selected Transcript Sections"),
      "youtube_transcript_selected_sections",
      `${selected.length} transcript section${selected.length === 1 ? "" : "s"} added to Source Capture.`,
      selected.length,
    );
  }

  function addCheckedSectionsToDraft() {
    const selected = checkedWorkspaceSections();
    if (selected.length === 0) {
      setChapterStatus("Select at least one section to add to Essay Draft.");
      return;
    }
    appendToEssayDraft(
      cleanSectionsText(selected, true, includeTranscriptTimestamps),
      `${selected.length} transcript section${selected.length === 1 ? "" : "s"} added to Essay Draft.`,
    );
    setChapterStatus(`${selected.length} transcript section${selected.length === 1 ? "" : "s"} added to Essay Draft.`);
  }

  function replaceSourceWithCheckedSections() {
    const selected = checkedWorkspaceSections();
    if (selected.length === 0) {
      setChapterStatus("Select at least one section to use this action.");
      return;
    }
    replaceSource(
      formatSectionsForSource(selected, "## Selected Transcript Sections"),
      "youtube_transcript_selected_sections",
      `${selected.length} transcript section${selected.length === 1 ? "" : "s"} replaced Source Capture.`,
      setChapterStatus,
      selected.length,
    );
  }

  const sourceWordCount = useMemo(() => {
    const words = input.trim().match(/[\p{L}\p{N}'-]+/gu);
    return words?.length ?? 0;
  }, [input]);
  const sourceSectionCount = useMemo(() => {
    const headingCount = input.match(/^###\s+/gm)?.length ?? 0;
    return headingCount || (input.trim() ? 1 : 0);
  }, [input]);
  const sourceSummary = input.trim()
    ? `${sourceSectionCount} section${sourceSectionCount === 1 ? "" : "s"} selected • ~${sourceWordCount.toLocaleString()} words`
    : "Source empty • add or replace content before generating";
  const sourceKind =
    sourceType === "manual_input"
      ? "Manual input"
      : sourceType === "youtube_transcript_full" || sourceType === "youtube_transcript_full_sections"
        ? "Full transcript"
        : sourceType.startsWith("youtube_transcript_selected") || sourceType === "youtube_transcript_range_sections"
          ? "selected YouTube sections"
          : sourceType === "mixed_source_content"
            ? "Mixed"
            : SOURCE_TYPE_LABELS[sourceType];
  const sourceSummaryDetails = {
    type: sourceKind,
    sections: sourceSelectionCount || sourceSectionCount,
    words: sourceWordCount,
    from: sourceFrom,
  };
  const selectedSourceMaterial = computeSelectedSourceMaterial();

  const youtubeSourceUrlRef = useRef(youtubeSourceUrl);
  youtubeSourceUrlRef.current = youtubeSourceUrl;
  const transcriptTextRef = useRef(transcriptText);
  transcriptTextRef.current = transcriptText;

  useEffect(() => {
    const raw = sourceMaterialRawInput.trim();
    if (!raw) {
      setAutoExtractStatus(null);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          if (YOUTUBE_RE.test(raw)) {
            const vid = extractYouTubeVideoId(raw);
            const curVid = extractYouTubeVideoId(youtubeSourceUrlRef.current);
            if (vid && transcriptTextRef.current.length > 0 && curVid === vid) return;
            setYoutubeSourceUrl(raw);
            setSourceType("youtube_url");
            setSourceMaterialPipeline("transcript");
            setInput("");
            setAutoExtractStatus("Extracting transcript… / 正在提取字幕…");
            await getTranscript(raw);
            setAutoExtractStatus(null);
            return;
          }
          if (WEBPAGE_RE.test(raw) && /\.(mp3|wav|m4a|aac|ogg)(\?|$|#)/i.test(raw)) {
            setAutoExtractStatus(
              "Transcript not available for direct audio URL. Please paste transcript or upload audio. / 直连音频无法自动转写，请粘贴文稿或上传音频。",
            );
            return;
          }
          if (WEBPAGE_RE.test(raw)) {
            setAutoExtractStatus("正在提取正文…");
            const ok = await fetchAndApplyGenericLink(raw);
            setAutoExtractStatus(ok ? null : "页面正文提取失败，请尝试手动粘贴。");
            return;
          }
          const compact = raw.replace(/\s/g, "");
          if (compact.length >= 80 && (raw.includes("\n") || raw.length >= 200)) {
            applyPasteMaterialBlocksFromRaw(raw);
            setAutoExtractStatus("已拆分为可选段落，请勾选需要的块。");
          }
        } catch {
          setAutoExtractStatus("自动提取失败，请使用中间栏工具手动处理。");
        }
      })();
    }, 750);
    return () => window.clearTimeout(handle);
    // Intentionally only re-run when the dedicated source field changes; handlers close over latest fns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceMaterialRawInput]);

  const primaryResultOutput = result?.outputs?.find((output) => output.output)?.output ?? result?.output ?? "";
  const finalOutput = finalResult?.output ?? "";
  const hasListeningEditContext = Boolean(currentSourceVersion) && audioPlayer.state !== "idle";

  async function exportFinalResult() {
    if (!finalOutput) {
      setTtsStatus("No final result to export.");
      return;
    }
    try {
      await navigator.clipboard.writeText(finalOutput);
      setTtsStatus("Final result copied for export.");
    } catch {
      setTtsStatus("Export copy failed. Select the final text manually.");
    }
  }

  async function copyFinalArticle() {
    if (!finalVersion) {
      setTtsStatus("No final version to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(finalVersion.content);
      setTtsStatus("Final article copied.");
    } catch {
      setTtsStatus("Copy failed. Select the final text manually.");
    }
  }

  function downloadFinalTxt() {
    if (!finalVersion) {
      setTtsStatus("No final version to download.");
      return;
    }
    const blob = new Blob([finalVersion.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${finalVersion.label.replace(/[^\w-]+/g, "-").toLowerCase() || "final-article"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyFinalForGoogleDocs() {
    if (!finalVersion) {
      setTtsStatus("No final version to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(finalVersion.content.trim());
      setTtsStatus("Formatted final copied for Google Docs.");
    } catch {
      setTtsStatus("Google Docs copy failed. Select the final text manually.");
    }
  }

  const currentTopicMaterialFingerprint = computeSourceFingerprint(currentTopicFingerprintText());
  const topicMaterialIsStale = isTopicMaterialStale(
    topicMaterial,
    topicMaterialFingerprint,
    currentTopicMaterialFingerprint,
  );
  const topicMaterialWordCount = topicMaterial ? countWords(topicMaterial.content) : 0;
  const topicSelectedRangeLabel = topicMaterial?.selectedRange
    ? [
        topicMaterial.selectedRange.startTime !== undefined
          ? formatTimestamp(topicMaterial.selectedRange.startTime)
          : undefined,
        topicMaterial.selectedRange.endTime !== undefined
          ? formatTimestamp(topicMaterial.selectedRange.endTime)
          : undefined,
      ]
        .filter(Boolean)
        .join(" - ")
    : "";

  const scrollToEl = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToAdvancedStudio = () => {
    const details =
      advancedStudioDetailsRef.current ??
      (document.getElementById("ee-advanced-studio") as HTMLDetailsElement | null);
    if (!details) return;
    details.open = true;
    requestAnimationFrame(() => {
      details.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const afterAdvancedStudioOpen = (fn: () => void) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(fn);
    });
  };

  const handleMegaMenuItem = (item: MegaMenuItemSpec) => {
    if (item.tier === "advanced") {
      scrollToAdvancedStudio();
      return;
    }
    if (item.tier === "disabled") return;

    const runAnalysisByLabel = (label: string) => {
      const entry = MATERIAL_ANALYSIS_BUTTONS.find((b) => b.label === label);
      if (entry) void runMaterialAnalysisTask(entry.task);
      else scrollToAdvancedStudio();
    };

    const runQuickByLabel = (label: string) => {
      const def = QUICK_REQUEST_BUTTONS.find((b) => b.label === label);
      if (def) applyQuickRequest(def);
      else scrollToAdvancedStudio();
    };

    switch (item.actionId) {
      case "material-paste":
        setSourceMaterialPipeline("paste");
        scrollToAdvancedStudio();
        break;
      case "material-youtube":
        setSourceMaterialPipeline("transcript");
        scrollToAdvancedStudio();
        break;
      case "material-web":
        setSourceMaterialPipeline("link");
        scrollToAdvancedStudio();
        break;
      case "material-transcript":
        setSourceMaterialPipeline("transcript");
        scrollToEl("ee-panel-transcript");
        break;
      case "material-audio":
        setSourceMaterialPipeline("audio");
        scrollToAdvancedStudio();
        break;
      case "extract-transcript-blocks":
        setSourceMaterialPipeline("transcript");
        scrollToEl("ee-panel-transcript");
        break;
      case "extract-time-range":
        scrollToEl("ee-extract-time-tools");
        break;
      case "extract-paragraph-blocks":
        setSourceMaterialPipeline("document");
        scrollToAdvancedStudio();
        break;
      case "extract-topic-filter":
        findTopicSections();
        scrollToEl("ee-panel-transcript");
        break;
      case "process-story-beats":
        runAnalysisByLabel("Story beats");
        break;
      case "process-examples":
        runAnalysisByLabel("Examples & cases");
        break;
      case "topic-save":
        appendTopicMaterialFromSelection();
        scrollToAdvancedStudio();
        break;
      case "topic-full-source":
        handleUseFullSource();
        break;
      case "topic-clear":
        handleClearTopic();
        break;
      case "process-main-claims":
        runAnalysisByLabel("Main claims");
        break;
      case "process-core-summary":
        runAnalysisByLabel("Core summary");
        break;
      case "process-topic-card":
        runAnalysisByLabel("Topic card");
        break;
      case "process-writing-directions":
        runAnalysisByLabel("Writing directions");
        break;
      case "process-write-article":
        runQuickByLabel("Write article");
        break;
      case "process-write-essay":
        runQuickByLabel("Write 500-word essay");
        break;
      case "process-linkedin":
        runQuickByLabel("Turn into post");
        break;
      case "process-mendbook":
        runQuickByLabel("Turn into Mendbook chapter");
        break;
      case "process-audiobook":
        runQuickByLabel("Turn into audiobook script");
        break;
      case "process-translate":
        runQuickByLabel("Translate");
        break;
      case "process-rewrite":
        if (primaryResultOutput) continueFromResult(primaryResultOutput, "rewrite");
        else scrollToAdvancedStudio();
        break;
      case "review-listen-source":
        if (input.trim()) void runTtsAction("play", input, "essayengine-source", "essayengine-source.mp3");
        break;
      case "review-listen-draft":
        if (essayDraftContent.trim()) void runTtsAction("play", essayDraftContent, "essayengine-draft", "essayengine-draft.mp3");
        break;
      case "review-listen-final":
        if (finalVersion?.content) void runTtsAction("play", finalVersion.content, "essayengine-final", "essayengine-final.mp3");
        break;
      case "review-revise":
        mobileWorkflow.enterListenAndMarkMode();
        scrollToAdvancedStudio();
        break;
      case "review-rewrite-selection":
        if (primaryResultOutput) continueFromResult(primaryResultOutput, "rewrite");
        else scrollToAdvancedStudio();
        break;
      case "export-save-draft":
        saveEssayDraft();
        break;
      case "export-save-final":
        if (essayDraftContent.trim()) markEssayDraftAsFinal();
        break;
      case "export-copy":
        void copyEssayDraft();
        break;
      case "settings-ai-engine":
      case "settings-language":
      case "settings-tone":
      case "settings-output-style":
      case "settings-tts-voice":
      case "settings-project":
        setControlsCollapsed(false);
        scrollToEl("ee-panel-engines");
        break;
      default:
        scrollToAdvancedStudio();
    }
  };

  const handleWorkflowRibbonStep = (index: number) => {
    if (index <= 4) selectWorkflowStep(index);
    else scrollToEl("ee-advanced-export-anchor");
  };

  const shellOpenMaterial = () => {
    setSourceMaterialPipeline("paste");
    scrollToAdvancedStudio();
  };

  const shellExtractSource = () => {
    setSourceMaterialPipeline("transcript");
    scrollToAdvancedStudio();
    afterAdvancedStudioOpen(() => scrollToEl("ee-panel-transcript"));
  };

  const shellProcessSavedTopic = () => {
    scrollToAdvancedStudio();
    afterAdvancedStudioOpen(() => selectWorkflowStep(3));
  };

  const shellOpenDraftEditor = () => {
    scrollToAdvancedStudio();
    afterAdvancedStudioOpen(() => scrollToEl("ee-draft-editor"));
  };

  const shellOpenReview = () => {
    scrollToAdvancedStudio();
    afterAdvancedStudioOpen(() => selectWorkflowStep(4));
  };

  const shellExportFinal = () => {
    scrollToAdvancedStudio();
    afterAdvancedStudioOpen(() => scrollToEl("ee-advanced-export-anchor"));
  };

  return (
    <EssayEngineProvider value={essayEngineController}>
    <div className="ee-engine-v2-shell">
      <EssayEngineNav
        megaCategoryId={megaMenuCategoryId}
        onMegaCategoryChange={setMegaMenuCategoryId}
        activeWorkflowStepIndex={mobileWorkflowStepIndex}
        onWorkflowRibbonStep={handleWorkflowRibbonStep}
        onMegaItemActivate={handleMegaMenuItem}
      />
      <StudioWorkspaceShell
        topicStrip={
          <TopicMaterialStatusStrip
            variant={!topicMaterial ? "missing" : topicMaterialIsStale ? "stale" : "saved"}
            sourceTypeLabel={topicMaterial ? String(topicMaterial.sourceType) : "—"}
            wordCount={topicMaterialWordCount}
            fullSourceAvailable={Boolean(topicMaterial?.useFullSource)}
            preview={topicMaterial?.content ?? ""}
            statusNote={topicMaterialStatus || undefined}
          />
        }
        sourcePanel={
          <div className="ee-studio-canvas">
            <p className="ee-studio-canvas-lead">Transcript and captured source (read-only preview).</p>
            <pre className="ee-studio-canvas-body">
              {(transcriptText || input).trim()
                ? `${(transcriptText || input).trim().slice(0, 900)}${(transcriptText || input).trim().length > 900 ? "…" : ""}`
                : "No source text yet. Add material from the top menu or open Advanced Studio."}
            </pre>
          </div>
        }
        sourceActions={
          <>
            <button type="button" className="primary" onClick={shellOpenMaterial}>
              Open Material
            </button>
            <button type="button" className="secondary" onClick={shellExtractSource}>
              Extract Source
            </button>
          </>
        }
        draftPanel={
          <div className="ee-studio-canvas">
            <p className="ee-studio-canvas-lead">AI output / draft (read-only preview).</p>
            <pre className="ee-studio-canvas-body">
              {(primaryResultOutput || essayDraftContent).trim()
                ? `${(primaryResultOutput || essayDraftContent).trim().slice(0, 900)}${(primaryResultOutput || essayDraftContent).trim().length > 900 ? "…" : ""}`
                : "No draft yet. Process your saved topic to create a first draft."}
            </pre>
          </div>
        }
        draftActions={
          <>
            <button type="button" className="primary" onClick={shellProcessSavedTopic}>
              Process Saved Topic
            </button>
            <button type="button" className="secondary" onClick={shellOpenDraftEditor}>
              Open Draft Editor
            </button>
          </>
        }
        finalPanel={
          <div className="ee-studio-canvas">
            <p className="ee-studio-canvas-lead">Final product (read-only preview).</p>
            <pre className="ee-studio-canvas-body">
              {finalVersion?.content?.trim()
                ? `${finalVersion.content.trim().slice(0, 900)}${finalVersion.content.trim().length > 900 ? "…" : ""}`
                : "No final product yet. Review a draft, listen to it, then mark it as final."}
            </pre>
          </div>
        }
        finalActions={
          <>
            <button type="button" className="primary" onClick={shellOpenReview}>
              Open Review
            </button>
            <button type="button" className="secondary" onClick={shellExportFinal}>
              Export Final
            </button>
          </>
        }
      />
      <details ref={advancedStudioDetailsRef} className="ee-advanced-studio" id="ee-advanced-studio">
        <summary className="ee-advanced-studio-summary">
          <div className="ee-advanced-summary-row">
            <div className="ee-advanced-summary-text">
              <span className="ee-advanced-summary-title">Advanced Studio</span>
              <span className="ee-advanced-summary-sub">Capture, process, review, export — full controls below.</span>
            </div>
            <span className="ee-advanced-open-pill">Open Full Studio</span>
          </div>
        </summary>
        <div className="ee-advanced-studio-body">
    <div
      className={`workspace${effectiveIsMobileLayout ? " ee-narrow ee-shell-workspace" : ""}${effectiveIsDesktopConsole ? " ee-desktop-triptych" : ""}`}
      data-workflow-step={mobileWorkflowStepId}
    >
      <DesktopConsoleLayout>
      <aside id="ee-panel-engines" className={controlsCollapsed ? "control-column collapsed" : "control-column"}>
        <EngineSelectionPanel>
        <div className="control-panel-toggle">
          <button
            type="button"
            className="collapse-toggle"
            onClick={() => setControlsCollapsed((value) => !value)}
            aria-label={controlsCollapsed ? "展开引擎与设置" : "收起引擎与设置"}
            title={controlsCollapsed ? "展开引擎与设置" : "收起引擎与设置"}
          >
            ☰
          </button>
          {!controlsCollapsed && <span>引擎与设置</span>}
        </div>
        <MaterialWorkspace
          active
          variant="rawInput"
          sourceMaterialRawInput={sourceMaterialRawInput}
          onSourceMaterialRawInputChange={setSourceMaterialRawInput}
          detectedSourceKind={userFacingDetectedSourceKind(sourceMaterialRawInput)}
          autoExtractStatus={autoExtractStatus}
          showLinkExtracting={
            linkExtractLoading &&
            Boolean(sourceMaterialRawInput.trim()) &&
            WEBPAGE_RE.test(sourceMaterialRawInput.trim()) &&
            !YOUTUBE_RE.test(sourceMaterialRawInput.trim())
          }
          showTranscriptExtracting={transcriptLoading && YOUTUBE_RE.test(sourceMaterialRawInput.trim())}
          omitRawInputChildren={effectiveIsDesktopConsole}
        >

          {transcriptText && sourceMaterialPipeline === "transcript" ? (
            <div className="timestamp-chapters" style={{ marginTop: "1rem" }}>
              <div className="range-head">
                <strong>Extracted transcript / 已提取字幕（快速勾选）</strong>
                <p>详细分段见中间栏。勾选后可用于「已选题材」或 「Generate」。</p>
              </div>
              <div className="chapter-list compact" style={{ maxHeight: 220, overflowY: "auto" }}>
                {fullTranscriptSections.map((section) => (
                  <label className="chapter-row" key={section.id}>
                    <input
                      type="checkbox"
                      checked={checkedFullSectionIds.includes(section.id)}
                      onChange={() => toggleFullTranscriptSection(section.id)}
                    />
                    <span>
                      <strong>[{formatTimestamp(section.start)}] </strong>
                      {cleanSectionText(section).slice(0, 120)}
                      {cleanSectionText(section).length > 120 ? "…" : ""}
                    </span>
                  </label>
                ))}
              </div>
              <div className="manual-ranges" style={{ marginTop: "0.5rem" }}>
                <div className="manual-range-row">
                  <label className="field">
                    <span>Start time</span>
                    <input
                      type="text"
                      value={selectedRangeStart}
                      onChange={(e) => setSelectedRangeStart(e.target.value)}
                      placeholder="3:20"
                    />
                  </label>
                  <label className="field">
                    <span>End time</span>
                    <input
                      type="text"
                      value={selectedRangeEnd}
                      onChange={(e) => setSelectedRangeEnd(e.target.value)}
                      placeholder="7:45"
                    />
                  </label>
                  <button type="button" className="secondary" onClick={useTranscriptRangeAsSource}>
                    Use selected range / 使用此时间范围
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {genericSegments.length > 0 && sourceMaterialPipeline !== "transcript" ? (
            <div className="timestamp-chapters" style={{ marginTop: "1rem" }}>
              <div className="range-head">
                <strong>Extracted blocks / 已提取段落或块</strong>
              </div>
              <div className="chapter-list compact" style={{ maxHeight: 220, overflowY: "auto" }}>
                {genericSegments.map((seg, idx) => (
                  <label className="chapter-row" key={seg.id}>
                    <input
                      type="checkbox"
                      checked={genericCheckedIds.includes(seg.id)}
                      onChange={() => toggleGenericSegment(seg.id)}
                    />
                    <span>
                      <strong>Paragraph / block {idx + 1} · </strong>
                      {seg.text.slice(0, 100)}
                      {seg.text.length > 100 ? "…" : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="timestamp-chapters" style={{ marginTop: "1rem" }}>
            <div className="range-head">
              <strong>Extraction &amp; selection / 提取与勾选</strong>
              <p className="transcript-note" style={{ marginTop: "0.35rem" }}>
                Live preview of what you checked in <strong>Source Material Extractor</strong>. Save it as your <strong>saved topic</strong> in the Topic panel before processing.
              </p>
            </div>
            {computeSelectedSourceMaterial() ? (
              <>
                <p>
                  <strong>Source type:</strong>{" "}
                  {labelForMaterialKind(computeSelectedSourceMaterial()!.analysisSourceType, "en")}
                </p>
                <p>
                  <strong>Range / 范围:</strong> {computeSelectedSourceMaterial()?.summary}
                </p>
                <textarea readOnly className="transcript-preview" rows={4} value={computeSelectedSourceMaterial()?.text ?? ""} />
              </>
            ) : (
              <p className="transcript-note">尚未选择可用素材。请先勾选上方块或时间范围，或勾选「使用完整素材」。</p>
            )}
            <div className="range-actions cta-row ee-quick-action-grid">
              <button type="button" className="secondary" onClick={appendTopicMaterialFromSelection} disabled={!computeSelectedSourceMaterial()}>
                Save as Topic
              </button>
              <button type="button" className="copy-action" onClick={clearMaterialSelection}>
                Clear Selection
              </button>
              <button
                type="button"
                className="secondary"
                onClick={enableFullSourceAndAppendToRequest}
                disabled={!transcriptText.trim() && !genericRawContent.trim() && genericSegments.length === 0}
              >
                Use Full Source
              </button>
            </div>
          </div>
        </MaterialWorkspace>

        {mobileWorkflowStepId !== "refine" ? (
          <ProcessingWorkspace
            active
            variant="controls"
            topicMaterial={topicMaterial}
            customInstruction={customInstruction}
            onCustomInstructionChange={handleCustomInstructionChange}
            canRunMaterialOutput={canRunMaterialOutputNow()}
            materialAnalysisLoading={materialAnalysisLoading}
            materialAnalysisButtons={MATERIAL_ANALYSIS_BUTTONS}
            onRunMaterialAnalysisTask={runMaterialAnalysisTask}
            quickRequestButtons={QUICK_REQUEST_BUTTONS}
            onApplyQuickRequest={applyQuickRequest}
            providers={providers}
            comparisonActive={comparisonActive}
            onToggleProvider={toggleProvider}
            controlsCollapsed={controlsCollapsed}
            task={task}
            onTaskChange={setTask}
            activeTask={activeTask}
            showWritingPresetHint={showWritingPresetHint}
            sourceLanguage={sourceLanguage}
            onSourceLanguageChange={setSourceLanguage}
            targetLanguage={targetLanguage}
            onTargetLanguageChange={setTargetLanguage}
            outputMode={outputMode}
            onOutputModeChange={setOutputMode}
            activeMode={activeMode}
            tone={tone}
            onToneChange={setTone}
            instructionPreset={instructionPreset}
            onInstructionPresetChange={setInstructionPreset}
            sourceSummary={sourceSummary}
            generateBlocked={generateBlocked}
            loading={loading}
            canGenerate={canProcessTopicMaterial(topicMaterial)}
            runLabel={runLabel}
            error={error}
            onGenerate={generate}
            generateSectionRef={(node) => {
              generateSectionRef.current = node;
            }}
            hideToolGrid={effectiveIsDesktopConsole}
          />
        ) : null}

        {effectiveIsDesktopConsole ? (
          <details className="ee-rail-secondary" style={{ marginTop: "0.5rem" }}>
            <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: "0.88rem" }}>
              Audio · Read aloud · Project save
            </summary>
            <div style={{ marginTop: "0.65rem", display: "grid", gap: "14px" }}>
              <section className="layer read-layer">
                <div className="layer-head">
                  <p className="eyebrow">9. Read Aloud Layer</p>
                  <h2>{workflowListenGuide.asideHeadline}</h2>
                  <p>{workflowListenGuide.asideBody}</p>
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Voice</span>
                    <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}>
                      {TTS_VOICES.map((voice) => (
                        <option key={voice} value={voice}>
                          {voice}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Speed</span>
                    <select value={ttsSpeed} onChange={(e) => setTtsSpeed(Number(e.target.value))}>
                      {TTS_SPEEDS.map((speed) => (
                        <option key={speed} value={speed}>
                          {speed.toFixed(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Style</span>
                  <select value={ttsStyle} onChange={(e) => setTtsStyle(e.target.value)}>
                    {TTS_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="layer project-layer">
                <div className="layer-head">
                  <p className="eyebrow">10. Project Save Layer</p>
                  <h2>Project save</h2>
                  <p>Save this workspace locally so source, outputs, decisions, and audio settings can be restored later.</p>
                </div>
                <label className="field">
                  <span>Project name</span>
                  <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                </label>
                <div className="project-actions">
                  <button type="button" onClick={() => saveCurrentProject()}>
                    Save project
                  </button>
                  <button type="button" onClick={startNewProject}>
                    New Project
                  </button>
                </div>
                <p className="project-helper">Start a blank workspace without deleting saved projects.</p>
                <label className="field">
                  <span>Load project</span>
                  <select value={activeProjectId} onChange={(e) => loadSelectedProject(e.target.value)}>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="project-actions">
                  <button type="button" onClick={duplicateCurrentProject} disabled={!activeProjectId}>
                    Duplicate project
                  </button>
                  <button type="button" onClick={deleteCurrentProject} disabled={!activeProjectId}>
                    Delete project
                  </button>
                </div>
                <div className="project-meta">
                  <span>Status: {resultStatus}</span>
                  {projectStatus && <strong>{projectStatus}</strong>}
                </div>
              </section>
            </div>
          </details>
        ) : (
          <>
            <section className="layer read-layer">
              <div className="layer-head">
                <p className="eyebrow">9. Read Aloud Layer</p>
                <h2>{workflowListenGuide.asideHeadline}</h2>
                <p>{workflowListenGuide.asideBody}</p>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Voice</span>
                  <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}>
                    {TTS_VOICES.map((voice) => (
                      <option key={voice} value={voice}>
                        {voice}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Speed</span>
                  <select value={ttsSpeed} onChange={(e) => setTtsSpeed(Number(e.target.value))}>
                    {TTS_SPEEDS.map((speed) => (
                      <option key={speed} value={speed}>
                        {speed.toFixed(1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span>Style</span>
                <select value={ttsStyle} onChange={(e) => setTtsStyle(e.target.value)}>
                  {TTS_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="layer project-layer">
              <div className="layer-head">
                <p className="eyebrow">10. Project Save Layer</p>
                <h2>Project save</h2>
                <p>Save this workspace locally so source, outputs, decisions, and audio settings can be restored later.</p>
              </div>
              <label className="field">
                <span>Project name</span>
                <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </label>
              <div className="project-actions">
                <button type="button" onClick={() => saveCurrentProject()}>
                  Save project
                </button>
                <button type="button" onClick={startNewProject}>
                  New Project
                </button>
              </div>
              <p className="project-helper">Start a blank workspace without deleting saved projects.</p>
              <label className="field">
                <span>Load project</span>
                <select value={activeProjectId} onChange={(e) => loadSelectedProject(e.target.value)}>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="project-actions">
                <button type="button" onClick={duplicateCurrentProject} disabled={!activeProjectId}>
                  Duplicate project
                </button>
                <button type="button" onClick={deleteCurrentProject} disabled={!activeProjectId}>
                  Delete project
                </button>
              </div>
              <div className="project-meta">
                <span>Status: {resultStatus}</span>
                {projectStatus && <strong>{projectStatus}</strong>}
              </div>
            </section>
          </>
        )}

        </EngineSelectionPanel>
      </aside>

      <div
        className={effectiveIsDesktopConsole ? "ee-grid-source ee-canvas-source-col" : undefined}
        style={effectiveIsDesktopConsole ? undefined : { display: "contents" }}
      >
      <section id="ee-panel-transcript" className="layer transcript-column">
        <TranscriptWorkspacePanel className="ee-narrow-step-transcript">
        <ExtractionWorkspace
          active
          hideMaterialAnalysisPanel={effectiveIsDesktopConsole}
          sourceMaterialPipeline={sourceMaterialPipeline}
          onSourceMaterialPipelineChange={(tab) => {
            setSourceMaterialPipeline(tab);
            setMaterialAnalysisStatus(null);
          }}
          materialUseFullExplicit={materialUseFullExplicit}
          onMaterialUseFullExplicitChange={setMaterialUseFullExplicit}
          linkExtractUrl={linkExtractUrl}
          onLinkExtractUrlChange={setLinkExtractUrl}
          linkExtractLoading={linkExtractLoading}
          onRunLinkMaterialExtract={runLinkMaterialExtract}
          linkExtractStatus={linkExtractStatus}
          pasteBlockInput={pasteBlockInput}
          onPasteBlockInputChange={setPasteBlockInput}
          onApplyPasteMaterialBlocks={applyPasteMaterialBlocks}
          audioUploadLoading={audioUploadLoading}
          onTranscribeAudioFile={(file) => void transcribeAudioFile(file)}
          onIngestDocumentFile={(file) => void ingestDocumentFile(file)}
          genericWorkspaceNotice={genericWorkspaceNotice}
          genericSegments={genericSegments}
          genericCheckedIds={genericCheckedIds}
          onToggleGenericSegment={toggleGenericSegment}
          genericMaterialKind={genericMaterialKind}
          genericMaterialTitle={genericMaterialTitle}
          selectedMaterial={selectedSourceMaterial}
          onReplaceSourceCaptureFromMaterialSelection={replaceSourceCaptureFromMaterialSelection}
          onUseFullTranscriptAsSource={useFullTranscriptAsSource}
          transcriptText={transcriptText}
          effectiveYoutubeSource={effectiveYoutubeSource}
          transcriptLoading={transcriptLoading}
          onFetchTranscript={() => void getTranscript()}
          transcriptStatus={transcriptStatus}
          timestampChapterInput={timestampChapterInput}
          onTimestampChapterInputChange={setTimestampChapterInput}
          onTimestampChapterInputTouched={() => {
            setChapterSectionsGenerated(false);
            setCheckedChapterIds([]);
            setChapterStatus(null);
          }}
          onApplyTimestampChapters={applyTimestampChapters}
          onReplaceSourceWithCheckedSections={replaceSourceWithCheckedSections}
          onAddCheckedSectionsToSource={addCheckedSectionsToSource}
          onAddCheckedSectionsToDraft={addCheckedSectionsToDraft}
          onCopyCheckedSectionsCleanText={copyCheckedSectionsCleanText}
          chapterSectionsGenerated={chapterSectionsGenerated}
          timestampChapterSections={timestampChapterSections}
          checkedChapterIds={checkedChapterIds}
          onToggleTimestampChapter={toggleTimestampChapter}
          chapterStatus={chapterStatus}
          topicInput={topicInput}
          onTopicInputChange={setTopicInput}
          onFindTopicSections={findTopicSections}
          onReplaceSourceWithMatchedSections={replaceSourceWithMatchedSections}
          onAddMatchedSectionsToSource={addMatchedSectionsToSource}
          onAddMatchedSectionsToDraft={addMatchedSectionsToDraft}
          onCopyMatchedSections={copyMatchedSections}
          onClearTopicMatches={clearTopicMatches}
          topicMatches={topicMatches}
          checkedTopicSectionIds={checkedTopicSectionIds}
          onToggleTopicSection={toggleTopicSection}
          topicStatus={topicStatus}
          manualRanges={manualRanges}
          onUpdateManualRange={updateManualRange}
          onRemoveManualRange={removeManualRange}
          onAddManualRange={addManualRange}
          onReplaceSourceWithManualRanges={replaceSourceWithManualRanges}
          onAddManualRangesToSource={addManualRangesToSource}
          onAddManualRangesToDraft={addManualRangesToDraft}
          onClearManualRanges={clearManualRanges}
          rangeStatus={rangeStatus}
          includeTranscriptTimestamps={includeTranscriptTimestamps}
          onIncludeTranscriptTimestampsChange={setIncludeTranscriptTimestamps}
          onReplaceSourceWithCheckedFullTranscriptSections={replaceSourceWithCheckedFullTranscriptSections}
          onAddCheckedFullTranscriptSectionsToSource={addCheckedFullTranscriptSectionsToSource}
          onAddCheckedFullTranscriptSectionsToDraft={addCheckedFullTranscriptSectionsToDraft}
          onCopyCheckedFullTranscriptSections={copyCheckedFullTranscriptSections}
          fullTranscriptSections={fullTranscriptSections}
          checkedFullSectionIds={checkedFullSectionIds}
          onToggleFullTranscriptSection={toggleFullTranscriptSection}
          fullSectionStatus={fullSectionStatus}
          formatTimestamp={formatTimestamp}
          cleanSectionText={cleanSectionText}
          materialAnalysisButtons={MATERIAL_ANALYSIS_BUTTONS}
          materialAnalysisLoading={materialAnalysisLoading}
          onRunMaterialAnalysisTask={runMaterialAnalysisTask}
          materialCustomPrompt={materialCustomPrompt}
          onMaterialCustomPromptChange={setMaterialCustomPrompt}
          materialAnalysisStatus={materialAnalysisStatus}
          selectedMaterialActions={
            <button type="button" className="secondary" onClick={appendTopicMaterialFromSelection} disabled={!selectedSourceMaterial}>
              Save as Topic
            </button>
          }
          savedTopicCompatibility={
            savedTopicMaterial.trim() ? (
              <label className="field">
                <span>Saved topic (also merged into prompts when not duplicated in your task)</span>
                <textarea className="transcript-preview" readOnly rows={4} value={savedTopicMaterial} />
                <button type="button" className="copy-action" onClick={() => setSavedTopicMaterial("")}>
                  Clear saved topic
                </button>
              </label>
            ) : null
          }
          afterSelectedMaterial={
            <TopicWorkspace
              compact={effectiveIsDesktopConsole}
              active
              topicMaterial={topicMaterial}
              topicMaterialStatus={topicMaterialStatus}
              isCurrentTopicStale={topicMaterialIsStale}
              topicMaterialWordCount={topicMaterialWordCount}
              topicSelectedRangeLabel={topicSelectedRangeLabel}
              canSaveAsTopic={hasSelectedMaterialForTopic()}
              canUseFullSource={Boolean(resolveFullSourceTextForRequest()?.trim())}
              onSaveAsTopic={handleSaveAsTopic}
              onUseFullSource={handleUseFullSource}
              onClearTopic={handleClearTopic}
            />
          }
        />

        <details className="ee-transcript-library-drawer" open={effectiveIsDesktopConsole}>
          <summary className="ee-transcript-library-summary">
            Transcript Library — folders, save transcript, load saved
          </summary>
          <section className="transcript-library-panel">
            <div className="range-head">
              <strong>Transcript Library</strong>
              <p>
                Save fetched transcripts into subject folders and reuse them later. Transcripts are reusable source
                materials. Projects save your full workspace; Transcript Library saves fetched transcripts by topic.
              </p>
            </div>
            <div className="library-grid">
              <label className="field">
                <span>Folder</span>
                <select
                  value={selectedTranscriptFolderId}
                  onChange={(e) => {
                    setSelectedTranscriptFolderId(e.target.value);
                    setSelectedTranscriptId("");
                  }}
                >
                  {transcriptFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name} ({transcriptFolderCounts.get(folder.id) ?? 0})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="secondary library-button"
                onClick={() => {
                  setFolderFormMode("create");
                  setNewTranscriptFolderName("");
                  setTranscriptLibraryStatus(null);
                }}
              >
                New folder
              </button>
              <button
                type="button"
                className="secondary library-button"
                onClick={() => {
                  setFolderFormMode("rename");
                  setFolderRenameName(selectedTranscriptFolder?.name ?? "");
                  setTranscriptLibraryStatus(null);
                }}
                disabled={!selectedTranscriptFolder || selectedFolderIsUnsorted}
              >
                Rename folder
              </button>
              <button
                type="button"
                className="copy-action library-button"
                onClick={deleteCurrentLibraryFolder}
                disabled={!selectedTranscriptFolder || selectedFolderIsUnsorted}
              >
                Delete folder
              </button>
            </div>
            {folderFormMode === "create" && (
              <div className="library-inline-form">
                <label className="field">
                  <span>New folder name</span>
                  <input
                    value={newTranscriptFolderName}
                    onChange={(e) => setNewTranscriptFolderName(e.target.value)}
                    placeholder="Mend, AI Trading, Psychology, Writing Ideas"
                  />
                </label>
                <button type="button" className="primary library-button" onClick={createLibraryFolder} disabled={!canCreateTranscriptFolder}>
                  Create
                </button>
                <button type="button" className="secondary library-button" onClick={() => setFolderFormMode("idle")}>
                  Cancel
                </button>
              </div>
            )}
            {folderFormMode === "rename" && (
              <div className="library-inline-form">
                <label className="field">
                  <span>Rename folder</span>
                  <input
                    value={folderRenameName}
                    onChange={(e) => setFolderRenameName(e.target.value)}
                    placeholder="New folder name"
                  />
                </label>
                <button type="button" className="primary library-button" onClick={renameCurrentLibraryFolder} disabled={!canRenameTranscriptFolder}>
                  Rename
                </button>
                <button type="button" className="secondary library-button" onClick={() => setFolderFormMode("idle")}>
                  Cancel
                </button>
              </div>
            )}
            <label className="field">
              <span>Transcript title</span>
              <input
                value={transcriptLibraryTitle}
                onChange={(e) => setTranscriptLibraryTitle(e.target.value)}
                placeholder="Lisa Barrett — Anxiety and Body Budget"
              />
            </label>
            <div className="library-grid">
              <button type="button" className="primary library-button" onClick={saveCurrentTranscriptToLibrary}>
                {effectiveIsDesktopConsole ? "Save transcript to folder" : "Save transcript"}
              </button>
              <label className="field">
                <span>Load transcript</span>
                <select value={selectedTranscriptId} onChange={(e) => setSelectedTranscriptId(e.target.value)}>
                  <option value="">Choose saved transcript</option>
                  {folderTranscripts.map((transcript) => (
                    <option key={transcript.id} value={transcript.id}>
                      {transcript.title}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="secondary library-button" onClick={loadSelectedLibraryTranscript}>
                Load transcript
              </button>
              <button type="button" className="copy-action library-button" onClick={duplicateSelectedLibraryTranscript}>
                Duplicate transcript
              </button>
              <button type="button" className="copy-action library-button" onClick={deleteSelectedLibraryTranscript}>
                Delete transcript
              </button>
            </div>
            {transcriptLibraryStatus && <span className="range-status">{transcriptLibraryStatus}</span>}
          </section>
        </details>
        </TranscriptWorkspacePanel>
      </section>

        {effectiveIsDesktopConsole ? (
          <SourceMaterialPanel className="ee-narrow-step-source ee-canvas-source-material">
            <MaterialWorkspace
              active
              variant="sourceCapture"
              effectiveIsMobileLayout={effectiveIsMobileLayout}
              timeline={
                <WorkflowTimeline
                  versions={sourceVersions}
                  currentSourceVersionId={currentSourceVersionId}
                  finalVersionId={finalVersionId}
                  onView={viewSourceVersion}
                  onUseCurrent={useSourceVersionAsCurrent}
                  onDuplicate={duplicateSourceVersion}
                  onMarkFinal={markSourceVersionAsFinal}
                  onStartFresh={startFreshWritingPipeline}
                />
              }
              sourceSummaryDetails={sourceSummaryDetails}
              sourceChip={sourceChip}
              onSourceChipChange={setSourceChip}
              isWebpageUrl={isWebpageUrl}
              effectiveYoutubeSource={effectiveYoutubeSource}
              input={input}
              onInputChange={updateInput}
              sourceHelper={sourceHelper}
              currentSourceVersion={currentSourceVersion}
              viewedSourceVersion={viewedSourceVersion}
              currentSourceVersionId={currentSourceVersionId}
              sourceKind={sourceKind}
              sourceActionStatus={sourceActionStatus}
              onSaveSource={() => replaceSource(input, sourceType, "Source saved as current source version.")}
              onListenToSource={() => runTtsAction("play", input, "essayengine-source", "essayengine-source.mp3")}
              onClearSource={clearSourceOnly}
              ttsLoading={ttsLoading}
              transcriptText={transcriptText}
              transcriptLoading={transcriptLoading}
              transcriptStatus={transcriptStatus}
              onFetchTranscript={() => void getTranscript()}
            />
          </SourceMaterialPanel>
        ) : null}
      </div>

      <div id="ee-panel-workspace" className={`work-column${effectiveIsDesktopConsole ? " ee-triptych-work" : ""}`}>
        <span id="ee-advanced-export-anchor" className="ee-anchor-target" aria-hidden />
        {effectiveIsDesktopConsole ? (
          <div className="ee-triptych-mid">
            {mobileWorkflowStepId === "refine" ? (
              <div id="ee-processing-studio-main" className="ee-processing-studio-main ee-narrow-step-processing">
                <ProcessingWorkspace
                  active
                  variant="controls"
                  topicMaterial={topicMaterial}
                  customInstruction={customInstruction}
                  onCustomInstructionChange={handleCustomInstructionChange}
                  canRunMaterialOutput={canRunMaterialOutputNow()}
                  materialAnalysisLoading={materialAnalysisLoading}
                  materialAnalysisButtons={MATERIAL_ANALYSIS_BUTTONS}
                  onRunMaterialAnalysisTask={runMaterialAnalysisTask}
                  quickRequestButtons={QUICK_REQUEST_BUTTONS}
                  onApplyQuickRequest={applyQuickRequest}
                  providers={providers}
                  comparisonActive={comparisonActive}
                  onToggleProvider={toggleProvider}
                  controlsCollapsed={controlsCollapsed}
                  task={task}
                  onTaskChange={setTask}
                  activeTask={activeTask}
                  showWritingPresetHint={showWritingPresetHint}
                  sourceLanguage={sourceLanguage}
                  onSourceLanguageChange={setSourceLanguage}
                  targetLanguage={targetLanguage}
                  onTargetLanguageChange={setTargetLanguage}
                  outputMode={outputMode}
                  onOutputModeChange={setOutputMode}
                  activeMode={activeMode}
                  tone={tone}
                  onToneChange={setTone}
                  instructionPreset={instructionPreset}
                  onInstructionPresetChange={setInstructionPreset}
                  sourceSummary={sourceSummary}
                  generateBlocked={generateBlocked}
                  loading={loading}
                  canGenerate={canProcessTopicMaterial(topicMaterial)}
                  runLabel={runLabel}
                  error={error}
                  onGenerate={generate}
                  generateSectionRef={(node) => {
                    generateSectionRef.current = node;
                  }}
                  hideToolGrid={effectiveIsDesktopConsole}
                />
              </div>
            ) : null}
            <ProcessingWorkspace
              active
              variant="desktopOverview"
              topicMaterial={topicMaterial}
              activeTask={activeTask}
              providers={providers}
              targetLanguage={targetLanguage}
              activeMode={activeMode}
              tone={tone}
              customInstruction={customInstruction}
              onOpenControlConsole={() => document.getElementById("ee-panel-engines")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              onJumpToGenerate={() => generateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />

            <StructureBuilderPanel className="ee-work-support ee-narrow-step-structure ee-narrow-step-draft ee-narrow-step-mark ee-narrow-step-revise ee-narrow-step-validate ee-narrow-step-assemble ee-narrow-step-publish">
            <MobileWorkflowPanel
              captureIdea={mobileWorkflow.captureIdea}
              voiceCapture={mobileWorkflow.voiceCapture}
              voiceRecorder={mobileWorkflow.voiceRecorder}
              linkCaptureUrl={mobileWorkflow.linkCaptureUrl}
              linkCapture={mobileWorkflow.linkCapture}
              coreValue={mobileWorkflow.coreValue}
              structures={mobileWorkflow.workflowStructures}
              selectedStructureId={mobileWorkflow.selectedWorkflowStructureId}
              draftContent={essayDraftContent}
              markedParagraphs={mobileWorkflow.markedParagraphs}
              revisionInstruction={mobileWorkflow.revisionInstruction}
              diagnosis={mobileWorkflow.workflowDiagnosis}
              polishVersions={mobileWorkflow.polishVersions}
              repurposeOutputs={mobileWorkflow.repurposeOutputs}
              busy={loading || ttsLoading || mobileWorkflow.mobileWorkflowBusy}
              status={mobileWorkflow.mobileWorkflowStatus}
              onCaptureChange={mobileWorkflow.setCaptureIdea}
              onLinkCaptureUrlChange={mobileWorkflow.setLinkCaptureUrl}
              onAnalyzeLinkCapture={mobileWorkflow.analyzeLinkCapture}
              onSaveLinkCapture={mobileWorkflow.saveLinkCapture}
              onCopyLinkCapture={mobileWorkflow.copyLinkCapture}
              onExtractValue={mobileWorkflow.extractCoreWritingValue}
              onUseCaptureAsSource={mobileWorkflow.useCaptureAsSource}
              onSaveVoiceCapture={mobileWorkflow.saveVoiceCapture}
              onDiscardVoiceCapture={mobileWorkflow.discardVoiceCapture}
              onCopyVoiceTranscript={mobileWorkflow.copyVoiceTranscript}
              onCreateStructures={() => runWithTopicMaterialGuard(mobileWorkflow.createWorkflowStructures)}
              onSelectStructure={mobileWorkflow.setSelectedWorkflowStructureId}
              onCopySelectedStructureOutline={mobileWorkflow.copySelectedStructureOutline}
              onGenerateDraft={() => runWithTopicMaterialGuard(mobileWorkflow.generateStructuredDraft)}
              onEnterListenMode={mobileWorkflow.enterListenAndMarkMode}
              onToggleParagraphMark={mobileWorkflow.toggleDraftParagraphMark}
              onRevisionInstructionChange={mobileWorkflow.setRevisionInstruction}
              onRequestRevision={() => runWithTopicMaterialGuard(mobileWorkflow.reviseMarkedDraft)}
              onDiagnose={() => runWithTopicMaterialGuard(mobileWorkflow.diagnoseDraftQuality)}
              onCopyDiagnosis={mobileWorkflow.copyDiagnosis}
              selectedPolishDirections={mobileWorkflow.selectedPolishDirections}
              onTogglePolishDirection={mobileWorkflow.togglePolishDirection}
              onCreatePolishVersions={() => runWithTopicMaterialGuard(mobileWorkflow.createPolishVersions)}
              onUsePolishVersion={mobileWorkflow.usePolishAsDraft}
              onCopyPolishVersion={mobileWorkflow.copyPolishVersion}
              selectedRepurposeFormats={mobileWorkflow.selectedRepurposeFormats}
              onToggleRepurposeFormat={mobileWorkflow.toggleRepurposeFormat}
              onRepurpose={() => runWithTopicMaterialGuard(mobileWorkflow.createRepurposeOutputs)}
              onCopyRepurposeOutput={mobileWorkflow.copyRepurposeOutput}
              mode={mobileWorkflowPanelMode}
              compactLabels={effectiveIsMobileLayout}
              supportRailSourceSummary={sourceSummaryDetails}
            />
            </StructureBuilderPanel>
          </div>
        ) : (
          <>
            {mobileWorkflowStepId === "refine" ? (
              <div id="ee-processing-studio-main" className="ee-processing-studio-main ee-narrow-step-processing">
                <ProcessingWorkspace
                  active
                  variant="controls"
                  topicMaterial={topicMaterial}
                  customInstruction={customInstruction}
                  onCustomInstructionChange={handleCustomInstructionChange}
                  canRunMaterialOutput={canRunMaterialOutputNow()}
                  materialAnalysisLoading={materialAnalysisLoading}
                  materialAnalysisButtons={MATERIAL_ANALYSIS_BUTTONS}
                  onRunMaterialAnalysisTask={runMaterialAnalysisTask}
                  quickRequestButtons={QUICK_REQUEST_BUTTONS}
                  onApplyQuickRequest={applyQuickRequest}
                  providers={providers}
                  comparisonActive={comparisonActive}
                  onToggleProvider={toggleProvider}
                  controlsCollapsed={controlsCollapsed}
                  task={task}
                  onTaskChange={setTask}
                  activeTask={activeTask}
                  showWritingPresetHint={showWritingPresetHint}
                  sourceLanguage={sourceLanguage}
                  onSourceLanguageChange={setSourceLanguage}
                  targetLanguage={targetLanguage}
                  onTargetLanguageChange={setTargetLanguage}
                  outputMode={outputMode}
                  onOutputModeChange={setOutputMode}
                  activeMode={activeMode}
                  tone={tone}
                  onToneChange={setTone}
                  instructionPreset={instructionPreset}
                  onInstructionPresetChange={setInstructionPreset}
                  sourceSummary={sourceSummary}
                  generateBlocked={generateBlocked}
                  loading={loading}
                  canGenerate={canProcessTopicMaterial(topicMaterial)}
                  runLabel={runLabel}
                  error={error}
                  onGenerate={generate}
                  generateSectionRef={(node) => {
                    generateSectionRef.current = node;
                  }}
                  hideToolGrid={effectiveIsDesktopConsole}
                />
              </div>
            ) : null}
            <ProcessingWorkspace
              active
              variant="desktopOverview"
              topicMaterial={topicMaterial}
              activeTask={activeTask}
              providers={providers}
              targetLanguage={targetLanguage}
              activeMode={activeMode}
              tone={tone}
              customInstruction={customInstruction}
              onOpenControlConsole={() => document.getElementById("ee-panel-engines")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              onJumpToGenerate={() => generateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />

            <StructureBuilderPanel className="ee-work-support ee-narrow-step-structure ee-narrow-step-draft ee-narrow-step-mark ee-narrow-step-revise ee-narrow-step-validate ee-narrow-step-assemble ee-narrow-step-publish">
            <MobileWorkflowPanel
              captureIdea={mobileWorkflow.captureIdea}
              voiceCapture={mobileWorkflow.voiceCapture}
              voiceRecorder={mobileWorkflow.voiceRecorder}
              linkCaptureUrl={mobileWorkflow.linkCaptureUrl}
              linkCapture={mobileWorkflow.linkCapture}
              coreValue={mobileWorkflow.coreValue}
              structures={mobileWorkflow.workflowStructures}
              selectedStructureId={mobileWorkflow.selectedWorkflowStructureId}
              draftContent={essayDraftContent}
              markedParagraphs={mobileWorkflow.markedParagraphs}
              revisionInstruction={mobileWorkflow.revisionInstruction}
              diagnosis={mobileWorkflow.workflowDiagnosis}
              polishVersions={mobileWorkflow.polishVersions}
              repurposeOutputs={mobileWorkflow.repurposeOutputs}
              busy={loading || ttsLoading || mobileWorkflow.mobileWorkflowBusy}
              status={mobileWorkflow.mobileWorkflowStatus}
              onCaptureChange={mobileWorkflow.setCaptureIdea}
              onLinkCaptureUrlChange={mobileWorkflow.setLinkCaptureUrl}
              onAnalyzeLinkCapture={mobileWorkflow.analyzeLinkCapture}
              onSaveLinkCapture={mobileWorkflow.saveLinkCapture}
              onCopyLinkCapture={mobileWorkflow.copyLinkCapture}
              onExtractValue={mobileWorkflow.extractCoreWritingValue}
              onUseCaptureAsSource={mobileWorkflow.useCaptureAsSource}
              onSaveVoiceCapture={mobileWorkflow.saveVoiceCapture}
              onDiscardVoiceCapture={mobileWorkflow.discardVoiceCapture}
              onCopyVoiceTranscript={mobileWorkflow.copyVoiceTranscript}
              onCreateStructures={() => runWithTopicMaterialGuard(mobileWorkflow.createWorkflowStructures)}
              onSelectStructure={mobileWorkflow.setSelectedWorkflowStructureId}
              onCopySelectedStructureOutline={mobileWorkflow.copySelectedStructureOutline}
              onGenerateDraft={() => runWithTopicMaterialGuard(mobileWorkflow.generateStructuredDraft)}
              onEnterListenMode={mobileWorkflow.enterListenAndMarkMode}
              onToggleParagraphMark={mobileWorkflow.toggleDraftParagraphMark}
              onRevisionInstructionChange={mobileWorkflow.setRevisionInstruction}
              onRequestRevision={() => runWithTopicMaterialGuard(mobileWorkflow.reviseMarkedDraft)}
              onDiagnose={() => runWithTopicMaterialGuard(mobileWorkflow.diagnoseDraftQuality)}
              onCopyDiagnosis={mobileWorkflow.copyDiagnosis}
              selectedPolishDirections={mobileWorkflow.selectedPolishDirections}
              onTogglePolishDirection={mobileWorkflow.togglePolishDirection}
              onCreatePolishVersions={() => runWithTopicMaterialGuard(mobileWorkflow.createPolishVersions)}
              onUsePolishVersion={mobileWorkflow.usePolishAsDraft}
              onCopyPolishVersion={mobileWorkflow.copyPolishVersion}
              selectedRepurposeFormats={mobileWorkflow.selectedRepurposeFormats}
              onToggleRepurposeFormat={mobileWorkflow.toggleRepurposeFormat}
              onRepurpose={() => runWithTopicMaterialGuard(mobileWorkflow.createRepurposeOutputs)}
              onCopyRepurposeOutput={mobileWorkflow.copyRepurposeOutput}
              mode={mobileWorkflowPanelMode}
              compactLabels={effectiveIsMobileLayout}
              supportRailSourceSummary={sourceSummaryDetails}
            />
            </StructureBuilderPanel>
          </>
        )}

        {!effectiveIsDesktopConsole ? (
        <SourceMaterialPanel className="ee-narrow-step-source">
        <MaterialWorkspace
          active
          variant="sourceCapture"
          effectiveIsMobileLayout={effectiveIsMobileLayout}
          timeline={
            <WorkflowTimeline
              versions={sourceVersions}
              currentSourceVersionId={currentSourceVersionId}
              finalVersionId={finalVersionId}
              onView={viewSourceVersion}
              onUseCurrent={useSourceVersionAsCurrent}
              onDuplicate={duplicateSourceVersion}
              onMarkFinal={markSourceVersionAsFinal}
              onStartFresh={startFreshWritingPipeline}
            />
          }
          sourceSummaryDetails={sourceSummaryDetails}
          sourceChip={sourceChip}
          onSourceChipChange={setSourceChip}
          isWebpageUrl={isWebpageUrl}
          effectiveYoutubeSource={effectiveYoutubeSource}
          input={input}
          onInputChange={updateInput}
          sourceHelper={sourceHelper}
          currentSourceVersion={currentSourceVersion}
          viewedSourceVersion={viewedSourceVersion}
          currentSourceVersionId={currentSourceVersionId}
          sourceKind={sourceKind}
          sourceActionStatus={sourceActionStatus}
          onSaveSource={() => replaceSource(input, sourceType, "Source saved as current source version.")}
          onListenToSource={() => runTtsAction("play", input, "essayengine-source", "essayengine-source.mp3")}
          onClearSource={clearSourceOnly}
          ttsLoading={ttsLoading}
          transcriptText={transcriptText}
          transcriptLoading={transcriptLoading}
          transcriptStatus={transcriptStatus}
          onFetchTranscript={() => void getTranscript()}
        />
        </SourceMaterialPanel>
        ) : null}

        <div id="ee-draft-editor">
        <ReviewProductWorkspace
          active
          layout={effectiveIsDesktopConsole ? "split" : "stack"}
          outputPanelProps={{
            result,
            task,
            selectedProviders: providers,
            onReplaceResultSource: useResultAsSource,
            onAddResultToSource: addResultToSource,
            onContinueResult: continueFromResult,
            onReadResult: readResultAloud,
            onAddResultToDraft: (output) => appendToEssayDraft(output, "Result added to Essay Draft."),
            onReplaceDraftWithResult: (output) => replaceEssayDraft(output, "Essay Draft replaced with selected result."),
            onMarkFinal: markResultAsFinal,
            finalResult,
            resultStep: workflowStep + 1,
          }}
          draftWorkspaceProps={{
            title: essayDraftTitle,
            content: essayDraftContent,
            updatedAt: essayDraftUpdatedAt,
            onTitleChange: (value) => {
              setEssayDraftTitle(value);
              setEssayDraftUpdatedAt(new Date().toISOString());
            },
            onContentChange: (value) => {
              setEssayDraftContent(value);
              setEssayDraftUpdatedAt(new Date().toISOString());
            },
            onSaveDraft: saveEssayDraft,
            onClearDraft: clearEssayDraft,
            onCopyDraft: copyEssayDraft,
            onUseDraftAsSource: useEssayDraftAsSource,
            onMarkDraftFinal: markEssayDraftAsFinal,
            onReadDraft: () => runTtsAction("play", essayDraftContent, "essayengine-draft", "essayengine-draft.mp3"),
            onDownloadDraftParts: () => runTtsAction("parts", essayDraftContent, "essayengine-draft", "essayengine-draft.mp3"),
            onDownloadDraftMerged: () => runTtsAction("merged", essayDraftContent, "essayengine-draft", "essayengine-draft.mp3"),
            onDownloadDraftTxt: downloadEssayDraftTxt,
            audioBusy: ttsLoading,
            status: essayDraftStatus,
          }}
          listenPanelContent={
            <>
              {effectiveIsMobileLayout ? (
                <details className="ee-mobile-read-aloud-settings">
                  <summary className="ee-mobile-read-aloud-summary">Read aloud settings</summary>
                  <section className="layer read-layer ee-mobile-read-layer-duplicate">
                    <div className="layer-head">
                      <p className="eyebrow">9. Read Aloud Layer</p>
                      <h2>{workflowListenGuide.asideHeadline}</h2>
                      <p>{workflowListenGuide.asideBody}</p>
                    </div>
                    <div className="field-grid">
                      <label className="field">
                        <span>Voice</span>
                        <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}>
                          {TTS_VOICES.map((voice) => (
                            <option key={voice} value={voice}>
                              {voice}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Speed</span>
                        <select value={ttsSpeed} onChange={(e) => setTtsSpeed(Number(e.target.value))}>
                          {TTS_SPEEDS.map((speed) => (
                            <option key={speed} value={speed}>
                              {speed.toFixed(1)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="field">
                      <span>Style</span>
                      <select value={ttsStyle} onChange={(e) => setTtsStyle(e.target.value)}>
                        {TTS_STYLES.map((style) => (
                          <option key={style} value={style}>
                            {style}
                          </option>
                        ))}
                      </select>
                    </label>
                  </section>
                </details>
              ) : null}
              <section className="layer audio-panel">
                <div className="layer-head">
                  <p className="eyebrow">{workflowListenGuide.panelEyebrow}</p>
                  <h2>{workflowListenGuide.panelHeadline}</h2>
                  <p>{workflowListenGuide.panelBody}</p>
                </div>
                <div className={`media-player state-${audioPlayer.state}`}>
                  <div className="player-topline">
                    <button
                      type="button"
                      className="player-main-button"
                      onClick={toggleAudioPlayback}
                      disabled={!audioCanToggle}
                      aria-label={audioPlayer.state === "playing" ? "Pause audio" : "Play audio"}
                    >
                      {audioPlayer.state === "playing" ? "❚❚" : "▶"}
                    </button>
                    <div>
                      <strong>
                        {audioPlayer.state === "loading"
                          ? "Generating audio..."
                          : audioPlayer.state === "playing"
                            ? "▶ Playing"
                            : audioPlayer.state === "paused"
                              ? "Paused"
                              : audioPlayer.state === "finished"
                                ? "Finished"
                                : audioPlayer.state === "error"
                                  ? "Audio generation failed."
                                  : "Ready to listen"}
                      </strong>
                      <p>
                        {audioPlayer.label} • Voice {ttsVoice} • {ttsSpeed.toFixed(1)}x
                      </p>
                    </div>
                  </div>

                  {audioPlayer.state === "loading" ? (
                    <div className="player-loading">
                      <div className="loading-dots" aria-label="Generating audio">
                        <span>●</span>
                        <span>●</span>
                        <span>○</span>
                        <span>○</span>
                        <span>○</span>
                      </div>
                      <span>
                        Part {audioPlayer.partIndex + 1} of {audioPlayer.partTotal || 1}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="player-progress-row">
                        <input
                          type="range"
                          min={0}
                          max={Math.max(audioPlayer.duration, 0)}
                          step={0.1}
                          value={Math.min(audioPlayer.currentTime, audioPlayer.duration || audioPlayer.currentTime)}
                          onChange={(e) => seekAudio(Number(e.target.value))}
                          disabled={!audioCanToggle && audioPlayer.state !== "finished"}
                          style={{ background: `linear-gradient(90deg, #5da8a6 ${audioProgressPercent}%, #263241 ${audioProgressPercent}%)` }}
                          aria-label="Audio progress"
                        />
                        <span>
                          {formatAudioTime(audioPlayer.currentTime)} / {formatAudioTime(audioPlayer.duration)}
                        </span>
                      </div>
                      <div className="player-controls">
                        <button type="button" className="secondary" onClick={playPreviousAudioPart} disabled={!audioCanMovePrev}>
                          Prev
                        </button>
                        <button type="button" className="primary player-pause" onClick={toggleAudioPlayback} disabled={!audioCanToggle}>
                          {audioPlayer.state === "playing" ? "Pause" : "Play"}
                        </button>
                        <button type="button" className="secondary" onClick={playNextAudioPart} disabled={!audioCanMoveNext}>
                          Next
                        </button>
                        <span>
                          Part {audioPlayer.partTotal ? audioPlayer.partIndex + 1 : 0} of {audioPlayer.partTotal}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="audio-grid">
                  <div className="audio-card">
                    <strong>Source audio</strong>
                    <p>{input.trim() ? sourceSummary : "No source available."}</p>
                    <div className="range-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => runTtsAction("play", input, "essayengine-source", "essayengine-source.mp3")}
                        disabled={!input.trim() || ttsLoading}
                      >
                        Read source
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => runTtsAction("merged", input, "essayengine-source", "essayengine-source.mp3")}
                        disabled={!input.trim() || ttsLoading}
                      >
                        Download MP3
                      </button>
                    </div>
                  </div>
                  <div className="audio-card">
                    <strong>Result audio</strong>
                    <p>{primaryResultOutput ? "Generated result is ready to listen to." : "Generate a result first."}</p>
                    <div className="range-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => runTtsAction("play", primaryResultOutput, "essayengine-result", "essayengine-result.mp3")}
                        disabled={!primaryResultOutput || ttsLoading}
                      >
                        Read result
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => runTtsAction("merged", primaryResultOutput, "essayengine-result", "essayengine-result.mp3")}
                        disabled={!primaryResultOutput || ttsLoading}
                      >
                        Download MP3
                      </button>
                    </div>
                  </div>
                </div>
                {ttsStatus && <p className="tts-status">{ttsStatus}</p>}
              </section>
            </>
          }
          beforeFinalPanel={
            effectiveIsMobileLayout ? (
              <section className="layer project-layer ee-mobile-project-assemble">
                <div className="layer-head">
                  <p className="eyebrow">10. Project Save Layer</p>
                  <h2>Project save</h2>
                  <p>Save this workspace locally so source, outputs, decisions, and audio settings can be restored later.</p>
                </div>
                <label className="field">
                  <span>Project name</span>
                  <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                </label>
                <div className="project-actions">
                  <button type="button" onClick={() => saveCurrentProject()}>
                    Save project
                  </button>
                  <button type="button" onClick={startNewProject}>
                    New Project
                  </button>
                </div>
                <p className="project-helper">Start a blank workspace without deleting saved projects.</p>
                <label className="field">
                  <span>Load project</span>
                  <select value={activeProjectId} onChange={(e) => loadSelectedProject(e.target.value)}>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="project-actions">
                  <button type="button" onClick={duplicateCurrentProject} disabled={!activeProjectId}>
                    Duplicate project
                  </button>
                  <button type="button" onClick={deleteCurrentProject} disabled={!activeProjectId}>
                    Delete project
                  </button>
                </div>
                <div className="project-meta">
                  <span>Status: {resultStatus}</span>
                  {projectStatus && <strong>{projectStatus}</strong>}
                </div>
              </section>
            ) : null
          }
          finalPanelProps={{
            finalVersion,
            onCopyFinal: copyFinalArticle,
            onDownloadFinalTxt: downloadFinalTxt,
            onReadFinal: () => finalVersion && runTtsAction("play", finalVersion.content, "essayengine-final", "essayengine-final.mp3"),
            onDownloadFinalAudiobook: () =>
              finalVersion && runTtsAction("merged", finalVersion.content, "essayengine-final", "essayengine-final.mp3"),
            onCopyGoogleDocs: copyFinalForGoogleDocs,
            audioBusy: ttsLoading,
          }}
        />
        </div>
      </div>
      </DesktopConsoleLayout>

      <section className="mobile-first-workspace" aria-label="Mobile Essay Engine workspace">
        <MobileWorkflowLayout
          activeStepIndex={mobileWorkflowStepIndex}
          onActiveStepIndexChange={selectWorkflowStep}
          onPrimaryWorkspaceAction={() => void generate()}
          primaryWorkspaceDisabled={loading || !canProcessTopicMaterial(topicMaterial) || generateBlocked}
          primaryWorkspaceLabel={loading ? "Generating…" : "生成本轮产出"}
        />

        <div id="ee-active-workspace" className="ee-active-workspace-anchor" aria-hidden="true" />
      </section>

      <div className="mobile-task-toolbar" aria-label="Mobile task toolbar">
        {(["rewrite", "paraphrase", "translate"] as EngineTask[]).map((mobileTask) => {
          const item = TASKS.find((entry) => entry.value === mobileTask);
          return (
            <button
              key={mobileTask}
              type="button"
              className={task === mobileTask ? "active" : ""}
              onClick={() => setTask(mobileTask)}
              aria-label={item?.label ?? mobileTask}
              title={item?.label ?? mobileTask}
            >
              <span aria-hidden="true">{TASK_ICONS[mobileTask]}</span>
              <small>{item?.label ?? mobileTask}</small>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            const textToRead = finalVersion?.content || essayDraftContent || primaryResultOutput || input;
            runTtsAction("play", textToRead, "essayengine-listen", "essayengine-listen.mp3");
          }}
          disabled={!finalVersion?.content && !essayDraftContent.trim() && !primaryResultOutput && !input.trim()}
          aria-label={workflowListenGuide.panelHeadline}
          title={workflowListenGuide.panelHeadline}
        >
          <span aria-hidden="true">🎧</span>
          <small>{workflowListenGuide.mobileToolbarListen}</small>
        </button>
      </div>

      {hasListeningEditContext && (
        <section className="mobile-listening-panel" aria-label="Mobile listening and editing panel">
          <strong>{audioPlayer.label}</strong>
          <span>
            Voice {ttsVoice} • {ttsSpeed.toFixed(1)}x • Part {audioPlayer.partTotal ? audioPlayer.partIndex + 1 : 0}/
            {audioPlayer.partTotal || 0}
          </span>
          <div className="mobile-listen-actions">
            <button type="button" onClick={() => setResultStatus("Needs Rewrite")}>
              Mark this version Needs Rewrite
            </button>
            <button
              type="button"
              disabled={!currentSourceVersion}
              onClick={() => currentSourceVersion && useSourceVersionAsCurrent(currentSourceVersion)}
            >
              Promote to Source
            </button>
            <button
              type="button"
              disabled={!currentSourceVersion}
              onClick={() => currentSourceVersion && markSourceVersionAsFinal(currentSourceVersion)}
            >
              Mark as Final
            </button>
          </div>
        </section>
      )}

      <div className="mobile-bottom-bar">
        <button type="button" onClick={addCheckedSectionsToSource} disabled={checkedChapterIds.length === 0}>
          Add to Source
        </button>
        <button type="button" onClick={replaceSourceWithCheckedSections} disabled={checkedChapterIds.length === 0}>
          Replace Source
        </button>
        <button type="button" onClick={generate} disabled={loading || !canProcessTopicMaterial(topicMaterial) || generateBlocked}>
          Generate
        </button>
      </div>

      <div className={`mobile-player state-${audioPlayer.state}`}>
        <div>
          <strong>
            {audioPlayer.state === "playing" ? "▶ Playing" : audioPlayer.state === "loading" ? "Generating audio..." : audioPlayer.message}
          </strong>
          <span>
            Part {audioPlayer.partTotal ? audioPlayer.partIndex + 1 : 0}/{audioPlayer.partTotal || 0} • {formatAudioTime(audioPlayer.currentTime)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(audioPlayer.duration, 0)}
          step={0.1}
          value={Math.min(audioPlayer.currentTime, audioPlayer.duration || audioPlayer.currentTime)}
          onChange={(e) => seekAudio(Number(e.target.value))}
          disabled={!audioCanToggle && audioPlayer.state !== "finished"}
          aria-label="Mobile audio progress"
        />
        <div className="mobile-player-controls">
          <button type="button" onClick={playPreviousAudioPart} disabled={!audioCanMovePrev}>
            Prev
          </button>
          <button type="button" onClick={toggleAudioPlayback} disabled={!audioCanToggle}>
            {audioPlayer.state === "playing" ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={playNextAudioPart} disabled={!audioCanMoveNext}>
            Next
          </button>
        </div>
      </div>

      <details className="ee-mobile-classic-editor">
        <summary className="ee-mobile-classic-summary">
          <span className="eyebrow">可选</span>
          <strong className="ee-mobile-classic-title">完整编辑区</strong>
          <span className="ee-mobile-classic-hint">草稿与本轮产出快捷入口 — 可选；主流程使用上方五步。</span>
        </summary>
        <div className="ee-mobile-classic-body">
          <nav className="mobile-primary-tabs" aria-label="完整编辑区面板">
            {(
              [
                { id: "draft" as const, label: "Draft" },
                { id: "result" as const, label: "本轮产出" },
              ]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={mobileActiveTab === tab.id ? "active" : ""}
                onClick={() => setMobileActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {mobileActiveTab === "draft" && (
            <section className="mobile-panel mobile-draft-panel">
              <div className="mobile-panel-head">
                <strong>Draft</strong>
                <span>用于润色与发布 — 不属于素材步骤</span>
              </div>
              <input
                value={essayDraftTitle}
                onChange={(e) => {
                  setEssayDraftTitle(e.target.value);
                  setEssayDraftUpdatedAt(new Date().toISOString());
                }}
                placeholder="Draft title"
              />
              <textarea
                value={essayDraftContent}
                onChange={(e) => {
                  setEssayDraftContent(e.target.value);
                  setEssayDraftUpdatedAt(new Date().toISOString());
                }}
                rows={18}
                placeholder="Assemble and edit your essay draft here."
              />
              <div className="mobile-metrics">
                <span>{countWords(essayDraftContent).toLocaleString()} words</span>
                <span>{essayDraftContent.length.toLocaleString()} characters</span>
              </div>
              <div className="mobile-action-grid">
                <button type="button" onClick={useEssayDraftAsSource} disabled={!essayDraftContent.trim()}>
                  Use draft as source
                </button>
                <button type="button" onClick={markEssayDraftAsFinal} disabled={!essayDraftContent.trim()}>
                  Mark as final
                </button>
                <button
                  type="button"
                  onClick={() => runTtsAction("play", essayDraftContent, "essayengine-draft", "essayengine-draft.mp3")}
                  disabled={!essayDraftContent.trim() || ttsLoading}
                >
                  Listen to draft
                </button>
              </div>
              {essayDraftStatus && <div className="mobile-status">{essayDraftStatus}</div>}
            </section>
          )}

          {mobileActiveTab === "result" && (
            <section className="mobile-panel mobile-result-panel">
              <div className="mobile-panel-head">
                <strong>本轮产出</strong>
                <span>最新生成的 AI 输出</span>
              </div>
              <div className="mobile-result-output" data-selectable-output="true">
                {primaryResultOutput || "尚无本轮产出。请在生成任务中从素材生成。"}
              </div>
              <div className="mobile-action-grid">
                <button
                  type="button"
                  onClick={() => appendToEssayDraft(primaryResultOutput, "Result added to Essay Draft.")}
                  disabled={!primaryResultOutput}
                >
                  Add AI output to draft
                </button>
                <button type="button" onClick={() => continueFromResult(primaryResultOutput, "rewrite")} disabled={!primaryResultOutput}>
                  Rewrite
                </button>
                <button type="button" onClick={() => continueFromResult(primaryResultOutput, "translate")} disabled={!primaryResultOutput}>
                  Translate
                </button>
                <button type="button" onClick={() => continueFromResult(primaryResultOutput, "paraphrase")} disabled={!primaryResultOutput}>
                  Paraphrase
                </button>
              </div>
            </section>
          )}
        </div>
      </details>

      <style jsx>{`
        .workspace {
          display: grid;
          grid-template-columns: minmax(0, 0.75fr) minmax(0, 2.3fr) minmax(0, 1fr);
          gap: 18px;
          align-items: start;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .control-column {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
          position: sticky;
          top: 18px;
        }
        .control-column.collapsed {
          gap: 10px;
        }
        .control-column.collapsed .layer {
          padding: 14px;
        }
        .control-column.collapsed .task-layer .layer-head p:not(.eyebrow),
        .control-column.collapsed .task-layer .layer-head h2 {
          display: none;
        }
        .control-panel-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dfe5ec;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 10px 24px rgba(31, 45, 61, 0.05);
          padding: 10px;
        }
        .control-panel-toggle span {
          color: #174447;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .collapse-toggle {
          width: 38px;
          height: 38px;
          border: 1px solid #cfd8e3;
          border-radius: 10px;
          background: #f8fafc;
          color: #22303f;
          font: inherit;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
        }
        .transcript-column,
        .work-column {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
        }
        .transcript-column {
          max-height: calc(100vh - 36px);
          overflow: auto;
          position: sticky;
          top: 18px;
        }
        .ee-desktop-workflow-nav {
          display: none;
          grid-column: 1 / -1;
          min-width: 0;
        }
        .workspace:not(.ee-narrow) .ee-desktop-workflow-nav {
          display: block;
        }
        .ee-active-workspace-anchor {
          height: 1px;
          margin: 0;
          padding: 0;
          overflow: hidden;
          scroll-margin-top: 10px;
        }
        .workspace:not(.ee-narrow) .desktop-console-layout > section.transcript-column {
          display: none !important;
        }
        .workspace:not(.ee-narrow)[data-workflow-step="source"] .desktop-console-layout > section.transcript-column {
          display: flex !important;
        }
        .workspace:not(.ee-narrow)[data-workflow-step="request"] .desktop-console-layout > section.transcript-column {
          display: none !important;
        }
        .workspace:not(.ee-narrow) .desktop-console-layout > .work-column {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 0.42fr);
          gap: 18px;
          align-items: start;
        }
        .workspace:not(.ee-narrow) .desktop-console-layout > .work-column > .ee-work-support {
          grid-column: 2;
        }
        .workspace:not(.ee-narrow) .desktop-console-layout > .work-column > :not(.ee-work-support) {
          grid-column: 1;
        }
        .workspace:not(.ee-narrow)[data-workflow-step] .desktop-console-layout > .work-column > * {
          display: none !important;
        }
        .workspace:not(.ee-narrow)[data-workflow-step="source"] .desktop-console-layout > .work-column > .ee-narrow-step-source {
          display: block !important;
        }
        .workspace:not(.ee-narrow)[data-workflow-step="workpiece"] .desktop-console-layout > .work-column > .ee-narrow-step-structure,
        .workspace:not(.ee-narrow)[data-workflow-step="workpiece"] .desktop-console-layout > .work-column > .ee-narrow-step-draft {
          display: block !important;
        }
        .workspace:not(.ee-narrow)[data-workflow-step="refine"] .desktop-console-layout > .work-column > .ee-narrow-step-mark,
        .workspace:not(.ee-narrow)[data-workflow-step="refine"] .desktop-console-layout > .work-column > .ee-narrow-step-revise,
        .workspace:not(.ee-narrow)[data-workflow-step="refine"] .desktop-console-layout > .work-column > .ee-narrow-step-validate {
          display: block !important;
        }
        .workspace:not(.ee-narrow)[data-workflow-step="refine"] .desktop-console-layout > .work-column > .ee-narrow-step-processing {
          display: block !important;
        }
        .workspace:not(.ee-narrow)[data-workflow-step="request"] .desktop-console-layout > .work-column > .ee-request-workspace-desktop,
        .workspace:not(.ee-narrow)[data-workflow-step="request"] .desktop-console-layout > .work-column > .ee-work-support {
          display: block !important;
        }
        /* Desktop triptych: keep source + draft/final shell visible; tools live in Feature Section + left rail. */
        .workspace.ee-desktop-triptych:not(.ee-narrow) .ee-grid-source {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
          max-height: calc(100vh - 36px);
          overflow: auto;
          position: sticky;
          top: 18px;
        }
        .workspace.ee-desktop-triptych:not(.ee-narrow) .desktop-console-layout > .work-column {
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: stretch;
          min-height: 0;
          min-width: 0;
        }
        .workspace.ee-desktop-triptych:not(.ee-narrow) .desktop-console-layout > .work-column > .ee-work-support {
          grid-column: unset;
        }
        .workspace.ee-desktop-triptych:not(.ee-narrow)[data-workflow-step] .desktop-console-layout > .work-column > * {
          display: none !important;
        }
        .workspace.ee-desktop-triptych:not(.ee-narrow) .desktop-console-layout > .work-column > .ee-triptych-mid {
          display: flex !important;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
        }
        .workspace.ee-desktop-triptych:not(.ee-narrow) .desktop-console-layout > .work-column > .ee-triptych-draft-row {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 14px;
          align-items: stretch;
          flex: 1;
          min-height: 0;
        }
        .workspace:not(.ee-narrow) .ee-request-workspace-desktop .request-workspace-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
        }
        .workspace:not(.ee-narrow) .ee-request-workspace-desktop .request-workspace-actions button {
          border: 1px solid #2f6f73;
          border-radius: 10px;
          background: #f1f8f7;
          color: #174447;
          padding: 10px 14px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }
        .workspace:not(.ee-narrow) .ee-request-workspace-desktop .request-workspace-summary {
          margin-top: 12px;
          border: 1px solid #d8e8e6;
          border-radius: 10px;
          background: #f3faf9;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.45;
        }
        .workspace:not(.ee-narrow) .ee-request-workspace-desktop .request-workspace-summary dl {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 6px 14px;
          margin: 10px 0 0;
        }
        .workspace:not(.ee-narrow) .ee-request-workspace-desktop .request-workspace-summary dt {
          margin: 0;
          color: #526171;
          font-weight: 800;
        }
        .workspace:not(.ee-narrow) .ee-request-workspace-desktop .request-workspace-summary dd {
          margin: 0;
          color: #17202a;
        }
        .layer {
          border: 1px solid #dfe5ec;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 14px 34px rgba(31, 45, 61, 0.07);
          padding: 20px;
        }
        .source-layer {
          min-height: 520px;
          background: linear-gradient(180deg, #ffffff, #fbfdfd);
        }
        .layer-head {
          margin-bottom: 14px;
        }
        .layer-head h2 {
          margin: 2px 0 5px;
          font-size: 18px;
          line-height: 1.25;
          color: #17202a;
        }
        .layer-head p:not(.eyebrow) {
          margin: 0;
          color: #617080;
          font-size: 13px;
          line-height: 1.45;
        }
        .eyebrow {
          margin: 0;
          color: #2f6f73;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .source-purpose {
          margin: -4px 0 14px;
          border: 1px solid #e3e9ef;
          border-radius: 8px;
          background: #f8fafc;
          color: #526171;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.45;
        }
        .source-summary-card {
          display: grid;
          gap: 9px;
        }
        .source-summary-card strong {
          color: #174447;
        }
        .source-summary-card dl {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin: 0;
        }
        .source-summary-card div {
          border: 1px solid #e3e9ef;
          border-radius: 8px;
          background: #ffffff;
          padding: 8px;
        }
        .source-summary-card dt {
          color: #617080;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .source-summary-card dd {
          margin: 2px 0 0;
          color: #17202a;
          font-size: 13px;
          font-weight: 760;
        }
        .source-strip {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .source-strip button,
        .source-strip strong {
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          border: 1px solid #dfe5ec;
          border-radius: 999px;
          background: #f8fafc;
          color: #475569;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 750;
          font-family: inherit;
          cursor: pointer;
        }
        .source-strip button.active {
          border-color: #2f6f73;
          background: #e7f5f3;
          color: #174447;
          box-shadow: 0 0 0 3px rgba(47, 111, 115, 0.1);
        }
        .source-strip strong {
          border-color: #94c9c7;
          background: #eaf7f6;
          color: #174447;
          cursor: default;
        }
        .source-helper {
          margin-bottom: 12px;
          border: 1px solid #e3e9ef;
          border-radius: 8px;
          background: #f8fafc;
          color: #647384;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.45;
        }
        .source-helper.active {
          border-color: #cfe3e1;
          background: #f1f8f7;
          color: #285b5d;
        }
        .source-state {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 10px;
          border: 1px solid #cfe3e1;
          border-radius: 999px;
          background: #ffffff;
          color: #285b5d;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 700;
        }
        .source-state strong {
          color: #174447;
        }
        .source-action-status {
          margin: 0 0 10px;
          border: 1px solid #cfe3e1;
          border-radius: 8px;
          background: #f1f8f7;
          color: #285b5d;
          padding: 9px 10px;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.4;
        }
        .input-label {
          margin: 0 0 7px;
          color: #344252;
          font-size: 12px;
          font-weight: 800;
        }
        .source-audio-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }
        .source-draft-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }
        .source-read {
          border: 1px solid #cfd8e3;
          border-radius: 8px;
          background: #f8fafc;
          color: #22303f;
          padding: 9px 12px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }
        .source-read:hover:not(:disabled) {
          border-color: #2f6f73;
          background: #e7f5f3;
          color: #174447;
        }
        textarea,
        input,
        select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cfd8e3;
          border-radius: 8px;
          background: #fbfcfe;
          color: #17202a;
          font: inherit;
          outline: none;
          transition: border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
        }
        textarea {
          min-height: 360px;
          resize: vertical;
          padding: 14px;
          font: 14px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .source-layer > textarea {
          border-color: #c9d8e5;
          background: #ffffff;
          box-shadow: inset 0 1px 0 rgba(15, 23, 32, 0.03);
        }
        select {
          height: 42px;
          padding: 0 11px;
        }
        input {
          height: 42px;
          padding: 0 11px;
        }
        textarea:focus,
        input:focus,
        select:focus {
          border-color: #2f6f73;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(47, 111, 115, 0.14);
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .field span {
          color: #344252;
          font-size: 12px;
          font-weight: 750;
        }
        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .instruction {
          min-height: 92px;
          font-family: inherit;
        }
        .segmented {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .task-icon-bar {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .task-icon-button {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 44px;
          border: 1px solid #cfd8e3;
          border-radius: 12px;
          background: #f8fafc;
          color: #22303f;
          padding: 8px 10px;
          font: inherit;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
          transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease, transform 120ms ease;
        }
        .task-icon-button:hover,
        .task-icon-button:focus-visible {
          border-color: #2f6f73;
          background: #e7f5f3;
          color: #174447;
        }
        .task-icon-button.active {
          border-color: #1d5f63;
          background: #1d5f63;
          color: #ffffff;
          box-shadow: 0 0 0 3px rgba(47, 111, 115, 0.14);
        }
        .task-icon {
          display: inline-grid;
          place-items: center;
          width: 28px;
          height: 28px;
          font-size: 18px;
          line-height: 1;
        }
        .task-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .control-column.collapsed .task-icon-button {
          justify-content: center;
          padding: 8px;
        }
        .task-icon-button::after {
          content: attr(data-tooltip);
          position: absolute;
          left: calc(100% + 8px);
          top: 50%;
          z-index: 50;
          transform: translateY(-50%);
          width: max-content;
          max-width: 180px;
          border-radius: 8px;
          background: #17202a;
          color: #ffffff;
          padding: 6px 8px;
          font-size: 12px;
          font-weight: 800;
          opacity: 0;
          pointer-events: none;
          transition: opacity 120ms ease;
        }
        .task-icon-button:hover::after,
        .task-icon-button:focus-visible::after {
          opacity: 1;
        }
        .segmented button,
        .quick-picks button,
        .request-quick-picks button,
        .primary,
        .secondary,
        .copy-action {
          border: 1px solid #cfd8e3;
          border-radius: 8px;
          background: #f8fafc;
          color: #22303f;
          font: inherit;
          cursor: pointer;
        }
        .segmented button {
          min-height: 46px;
          padding: 10px 12px;
          text-align: left;
          font-weight: 780;
          transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
        }
        .segmented button.active {
          border-color: #2f6f73;
          background: linear-gradient(180deg, #e7f5f3, #dff0ee);
          color: #174447;
          box-shadow: 0 0 0 3px rgba(47, 111, 115, 0.12);
        }
        .selected-description {
          margin-top: 12px;
          border: 1px solid #d8e8e6;
          border-radius: 8px;
          background: #f3faf9;
          padding: 12px;
        }
        .selected-description strong {
          display: block;
          color: #174447;
          font-size: 13px;
          margin-bottom: 3px;
        }
        .selected-description p {
          margin: 0;
          color: #526171;
          font-size: 13px;
          line-height: 1.45;
        }
        .writing-hint {
          margin-top: 10px;
          border: 1px solid #ead7a7;
          border-radius: 8px;
          background: #fff9e8;
          color: #6b520f;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 700;
        }
        .quick-picks {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .quick-picks button {
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 750;
        }
        .request-quick-picks {
          margin-top: 12px;
        }
        .ee-quick-action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(152px, 1fr));
          gap: 8px;
          align-items: stretch;
        }
        .ee-quick-action-grid button {
          min-height: 44px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.25;
          text-align: center;
        }
        .source-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-top: 12px;
          color: #617080;
          font-size: 13px;
        }
        .primary {
          padding: 12px 16px;
          border-color: #1d5f63;
          background: #1d5f63;
          color: white;
          font-weight: 800;
        }
        .run-layer .primary {
          width: 100%;
        }
        .secondary {
          padding: 8px 12px;
          font-weight: 750;
          white-space: nowrap;
        }
        .copy-action {
          padding: 8px 12px;
          border-color: #d7e3ee;
          background: #ffffff;
          color: #526171;
          font-weight: 750;
          white-space: nowrap;
        }
        .source-clear {
          margin-bottom: 10px;
        }
        .secondary:hover:not(:disabled) {
          border-color: #2f6f73;
          background: #e7f5f3;
          color: #174447;
          box-shadow: 0 0 0 3px rgba(47, 111, 115, 0.1);
        }
        .secondary:active:not(:disabled) {
          transform: translateY(1px);
        }
        .secondary.transfer {
          border-color: #1d5f63;
          background: #1d5f63;
          color: #ffffff;
          box-shadow: 0 8px 18px rgba(29, 95, 99, 0.16);
        }
        .secondary.transfer:hover:not(:disabled) {
          background: #174f52;
          color: #ffffff;
        }
        .secondary.quiet {
          background: #ffffff;
          color: #526171;
        }
        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .transcript-box {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          margin-top: 12px;
          border: 1px solid #cfe3e1;
          border-radius: 10px;
          background: #f1f8f7;
          padding: 12px;
        }
        .transcript-box p {
          margin: 2px 0 0;
          color: #617080;
          font-size: 13px;
        }
        .source-fetch-flow {
          margin: 8px 0 0;
          padding-left: 1.25rem;
          color: #475569;
          font-size: 13px;
          line-height: 1.55;
        }
        .source-fetch-flow li {
          margin: 4px 0;
        }
        .source-fetch-note {
          margin: 10px 0 0;
          font-size: 12px;
          color: #617080;
          line-height: 1.45;
        }
        .transcript-primary-actions {
          justify-self: end;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .status {
          grid-column: 1 / -1;
          color: #2f6f73;
          font-size: 13px;
        }
        .range-selector {
          grid-column: 1 / -1;
          display: grid;
          gap: 10px;
          border: 1px solid #c7dcda;
          border-radius: 8px;
          background: #ffffff;
          padding: 12px;
        }
        .section-workspace,
        .topic-filter {
          display: grid;
          gap: 10px;
        }
        .transcript-empty {
          display: grid;
          gap: 10px;
          border: 1px dashed #cfd8e3;
          border-radius: 12px;
          background: #fbfcfe;
          color: #526171;
          padding: 16px;
        }
        .transcript-empty strong {
          color: #17202a;
        }
        .transcript-empty p {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
        }
        .transcript-fetch {
          justify-self: start;
        }
        .transcript-library-panel {
          display: grid;
          gap: 12px;
          border: 1px solid #cfe3e1;
          border-radius: 12px;
          background: #f8fcfb;
          padding: 14px;
        }
        .topic-material-panel {
          display: grid;
          gap: 12px;
          border: 1px solid #cfe3e1;
          border-radius: 12px;
          background: #f8fcfb;
          padding: 14px;
        }
        .topic-material-preview {
          display: grid;
          gap: 10px;
        }
        .topic-material-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin: 0;
        }
        .topic-material-metrics div {
          border: 1px solid #e3e9ef;
          border-radius: 8px;
          background: #ffffff;
          padding: 8px;
          min-width: 0;
        }
        .topic-material-metrics dt {
          color: #617080;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .topic-material-metrics dd {
          margin: 2px 0 0;
          color: #17202a;
          font-size: 13px;
          font-weight: 760;
          overflow-wrap: anywhere;
        }
        .library-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto auto;
          gap: 10px;
          align-items: end;
        }
        .library-inline-form {
          display: grid;
          grid-template-columns: minmax(180px, 1fr) auto auto;
          gap: 8px;
          align-items: end;
          border: 1px solid #e3e9ef;
          border-radius: 10px;
          background: #ffffff;
          padding: 10px;
        }
        .library-button {
          align-self: end;
          min-height: 42px;
        }
        .transcript-tools {
          grid-column: 1 / -1;
          display: grid;
          gap: 10px;
        }
        .priority-section {
          border-color: #a9d6d3 !important;
          box-shadow: 0 0 0 3px rgba(47, 111, 115, 0.08);
        }
        .cta-row {
          align-items: center;
        }
        .rough-warning {
          border: 1px solid #f0d48a;
          border-radius: 8px;
          background: #fff8e1;
          color: #7a5200;
          padding: 9px 10px;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.4;
        }
        .transcript-tools details {
          border: 1px solid #cfe3e1;
          border-radius: 8px;
          background: #ffffff;
          overflow: hidden;
        }
        .transcript-tools summary {
          padding: 10px 12px;
          color: #174447;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
          background: #f8fcfb;
        }
        .transcript-tools details > :not(summary) {
          margin: 12px;
        }
        .range-head strong {
          display: block;
          color: #174447;
          font-size: 13px;
          margin-bottom: 2px;
        }
        .range-head p {
          margin: 0;
          color: #617080;
          font-size: 13px;
          line-height: 1.45;
        }
        .workspace-subhead {
          margin-top: 10px;
          color: #174447;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .organize-option {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          color: #344252;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
        }
        .organize-option input {
          width: 16px;
          height: 16px;
          padding: 0;
          accent-color: #1d5f63;
        }
        .range-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .manual-ranges {
          display: grid;
          gap: 10px;
        }
        .manual-range-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
          gap: 10px;
          align-items: end;
          border: 1px solid #e3e9ef;
          border-radius: 8px;
          background: #fbfcfe;
          padding: 10px;
        }
        .range-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .range-actions.ee-quick-action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          align-items: stretch;
        }
        .range-status {
          border: 1px solid #d7e3ee;
          border-radius: 7px;
          background: #f8fafc;
          color: #285b5d;
          padding: 8px 10px;
          font-size: 13px;
          line-height: 1.4;
        }
        .timestamp-chapters {
          display: grid;
          gap: 10px;
        }
        .chapter-input {
          min-height: 150px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .rough-note {
          border: 1px solid #f0d48a;
          border-radius: 8px;
          background: #fff8e1;
          color: #7a5200;
          padding: 9px 10px;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.4;
        }
        .chapter-list {
          display: grid;
          gap: 8px;
          max-height: 340px;
          overflow: auto;
          padding-right: 2px;
        }
        .chapter-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 9px;
          align-items: start;
          border: 1px solid #e3e9ef;
          border-radius: 8px;
          background: #fbfcfe;
          color: #344252;
          padding: 9px 10px;
          font-size: 13px;
          line-height: 1.4;
          cursor: pointer;
        }
        .chapter-row input {
          width: 16px;
          height: 16px;
          padding: 0;
          accent-color: #1d5f63;
        }
        .chapter-row span {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .chapter-row strong {
          color: #174447;
          font-weight: 850;
        }
        .transcript-note {
          margin: 0 0 10px;
          color: #617080;
          font-size: 13px;
          line-height: 1.45;
        }
        .workspace-section-list {
          display: grid;
          gap: 10px;
          max-height: 540px;
          overflow: auto;
          padding-right: 2px;
        }
        .workspace-section-list.compact {
          max-height: 320px;
        }
        .workspace-section {
          display: grid;
          gap: 10px;
          border: 1px solid #d7e3ee;
          border-radius: 10px;
          background: #fbfcfe;
          padding: 12px;
        }
        .workspace-section-head {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          color: #174447;
          cursor: pointer;
        }
        .workspace-section-head input {
          width: 17px;
          height: 17px;
          padding: 0;
          accent-color: #1d5f63;
        }
        .workspace-section-head span {
          display: grid;
          gap: 3px;
          min-width: 0;
        }
        .workspace-section-head strong {
          color: #174447;
          font-size: 13px;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .workspace-section-head em {
          color: #617080;
          font-size: 12px;
          font-style: normal;
          font-weight: 750;
        }
        .workspace-section-text {
          max-height: 180px;
          overflow: auto;
          white-space: pre-wrap;
          color: #22303f;
          font-size: 14px;
          line-height: 1.65;
          background: #ffffff;
          border: 1px solid #e3e9ef;
          border-radius: 8px;
          padding: 10px;
        }
        .section-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .transcript-source {
          justify-self: end;
          border: 1px solid #94c9c7;
          border-radius: 999px;
          background: #ffffff;
          color: #174447;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }
        .transcript-preview {
          grid-column: 1 / -1;
          min-height: 148px;
          max-height: 148px;
          resize: vertical;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-word;
          margin: 0;
          border: 1px solid #cfe3e1;
          border-radius: 6px;
          background: #ffffff;
          color: #22303f;
          padding: 10px;
          font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .mode-badge {
          margin-bottom: 12px;
          border: 1px solid #d7e3ee;
          border-radius: 8px;
          background: #f8fafc;
          color: #475569;
          display: flex;
          justify-content: center;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 800;
        }
        .mode-badge.comparison {
          border-color: #83bdb9;
          background: linear-gradient(180deg, #e8f7f6, #dff2f0);
          color: #174447;
        }
        .engine-list {
          display: grid;
          gap: 10px;
        }
        .engine {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #dfe5ec;
          border-radius: 10px;
          background: #fbfcfe;
          padding: 12px;
          cursor: pointer;
          transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
        }
        .engine.selected {
          border-color: #2f6f73;
          background: #f1f8f7;
          box-shadow: 0 0 0 3px rgba(47, 111, 115, 0.1);
        }
        .engine input {
          width: 16px;
          height: 16px;
          accent-color: #1d5f63;
        }
        .engine span {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .engine small {
          color: #617080;
          font-size: 12px;
        }
        .run-layer {
          background: linear-gradient(180deg, #ffffff, #f3faf9);
        }
        .run-blocked {
          margin: 0 0 12px;
          border: 1px solid #f0d48a;
          border-radius: 8px;
          background: #fff8e1;
          color: #7a5200;
          padding: 9px 10px;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
        }
        .read-layer {
          background: linear-gradient(180deg, #ffffff, #f8fbff);
        }
        .read-layer .field + .field,
        .read-layer .field-grid + .field {
          margin-top: 12px;
        }
        .read-layer-download {
          width: 100%;
          margin-top: 12px;
          border: 1px solid #1d5f63;
          border-radius: 8px;
          background: #1d5f63;
          color: #ffffff;
          padding: 10px 12px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }
        .read-layer-download:hover:not(:disabled) {
          background: #174f52;
        }
        .read-layer-download:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .tts-status {
          margin: 12px 0 0;
          border: 1px solid #d7e3ee;
          border-radius: 8px;
          background: #f8fafc;
          color: #285b5d;
          padding: 9px 10px;
          font-size: 13px;
          line-height: 1.45;
        }
        .audio-panel,
        .final-panel {
          background: linear-gradient(180deg, #ffffff, #fbfcfe);
        }
        .media-player {
          display: grid;
          gap: 14px;
          margin-bottom: 14px;
          border: 1px solid #cfe3e1;
          border-radius: 16px;
          background: linear-gradient(180deg, #f8fcfb, #eef8f7);
          padding: 16px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }
        .media-player.state-playing {
          border-color: #83bdb9;
          box-shadow: 0 12px 28px rgba(29, 95, 99, 0.1);
        }
        .media-player.state-error {
          border-color: #fecdd3;
          background: #fff1f2;
        }
        .player-topline {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 12px;
          align-items: center;
        }
        .player-main-button {
          width: 48px;
          height: 48px;
          border: 0;
          border-radius: 999px;
          background: #1d5f63;
          color: #ffffff;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
        }
        .player-main-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .player-topline strong {
          display: block;
          color: #174447;
          font-size: 16px;
          line-height: 1.25;
        }
        .player-topline p {
          margin: 3px 0 0;
          color: #617080;
          font-size: 13px;
        }
        .player-loading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border: 1px solid #d8e8e6;
          border-radius: 10px;
          background: #ffffff;
          color: #285b5d;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 800;
        }
        .loading-dots {
          display: inline-flex;
          gap: 5px;
          color: #1d5f63;
          letter-spacing: 0.05em;
          animation: pulseDots 1.2s ease-in-out infinite;
        }
        @keyframes pulseDots {
          0%, 100% {
            opacity: 0.55;
          }
          50% {
            opacity: 1;
          }
        }
        .player-progress-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          color: #344252;
          font-size: 13px;
          font-weight: 800;
        }
        .player-progress-row input,
        .mobile-player input {
          width: 100%;
          height: 8px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          accent-color: #1d5f63;
          cursor: pointer;
        }
        .player-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .player-pause {
          width: auto;
          min-width: 92px;
        }
        .player-controls span {
          margin-left: auto;
          color: #617080;
          font-size: 13px;
          font-weight: 800;
        }
        .audio-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .audio-card,
        .final-result-card,
        .empty-final {
          display: grid;
          gap: 10px;
          border: 1px solid #e3e9ef;
          border-radius: 10px;
          background: #fbfcfe;
          padding: 12px;
        }
        .audio-card strong,
        .final-meta strong,
        .empty-final strong {
          color: #174447;
          font-size: 13px;
        }
        .audio-card p,
        .empty-final p {
          margin: 0;
          color: #617080;
          font-size: 13px;
          line-height: 1.45;
        }
        .final-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #617080;
          font-size: 12px;
        }
        .final-output-preview {
          max-height: 240px;
          overflow: auto;
          white-space: pre-wrap;
          border: 1px solid #e3e9ef;
          border-radius: 8px;
          background: #ffffff;
          color: #22303f;
          padding: 12px;
          font-size: 14px;
          line-height: 1.65;
        }
        .project-layer {
          background: linear-gradient(180deg, #ffffff, #fbfcfe);
        }
        .project-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0;
        }
        .project-actions button {
          border: 1px solid #cfd8e3;
          border-radius: 8px;
          background: #f8fafc;
          color: #22303f;
          padding: 8px 10px;
          font: inherit;
          font-size: 13px;
          font-weight: 780;
          cursor: pointer;
        }
        .project-actions button:first-child {
          border-color: #1d5f63;
          background: #1d5f63;
          color: #ffffff;
        }
        .project-actions button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .project-helper {
          margin: -4px 0 10px;
          color: #617080;
          font-size: 12px;
          line-height: 1.4;
        }
        .project-meta {
          display: grid;
          gap: 6px;
          border: 1px solid #d7e3ee;
          border-radius: 8px;
          background: #f8fafc;
          color: #526171;
          padding: 9px 10px;
          font-size: 13px;
          line-height: 1.4;
        }
        .project-meta strong {
          color: #285b5d;
        }
        .ready-summary {
          border: 1px solid #cfe3e1;
          border-radius: 10px;
          background: #f1f8f7;
          color: #174447;
          padding: 12px;
          margin-bottom: 12px;
          font-size: 13px;
          font-weight: 800;
        }
        .ready-summary ul {
          display: grid;
          gap: 4px;
          margin: 8px 0 0;
          padding-left: 18px;
          color: #285b5d;
          font-weight: 650;
          line-height: 1.45;
        }
        .run-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin: 0 0 12px;
        }
        .run-summary div {
          border: 1px solid #e2ebf2;
          border-radius: 8px;
          background: #ffffff;
          padding: 9px 10px;
          min-width: 0;
        }
        .run-summary dt {
          color: #617080;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .run-summary dd {
          margin: 2px 0 0;
          color: #17202a;
          font-size: 13px;
          font-weight: 760;
          overflow-wrap: anywhere;
        }
        .error {
          margin: 10px 0 0;
          color: #a11d2a;
          background: #fff1f2;
          border: 1px solid #fecdd3;
          border-radius: 8px;
          padding: 9px 10px;
          font-size: 13px;
        }
        .mobile-first-workspace,
        .mobile-task-toolbar,
        .mobile-bottom-bar,
        .mobile-listening-panel,
        .mobile-player {
          display: none;
        }
        .workspace.ee-narrow {
          grid-template-columns: minmax(0, 1fr);
          gap: 14px;
          padding-bottom: 190px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: hidden;
        }
        .workspace.ee-narrow .control-column,
        .workspace.ee-narrow .transcript-column {
          position: static;
          max-height: none;
          overflow: visible;
          min-width: 0;
          max-width: 100%;
        }
        .workspace.ee-narrow .work-column {
          position: static;
          min-width: 0;
          max-width: 100%;
        }

          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="request"] .control-column .run-layer,
          .workspace.ee-narrow.ee-shell-workspace .control-column .read-layer,
          .workspace.ee-narrow.ee-shell-workspace .control-column .project-layer {
            display: none !important;
          }

          .workspace.ee-narrow.ee-shell-workspace .desktop-console-layout > aside,
          .workspace.ee-narrow.ee-shell-workspace .desktop-console-layout > section.transcript-column,
          .workspace.ee-narrow.ee-shell-workspace .desktop-console-layout > .work-column {
            display: none !important;
          }

          .workspace.ee-narrow.ee-shell-workspace .desktop-console-layout > .work-column > * {
            display: none !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="request"] .desktop-console-layout > aside {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="source"] .desktop-console-layout > aside {
            display: none !important;
          }
          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="source"] .desktop-console-layout > section.transcript-column,
          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="source"] .desktop-console-layout > .work-column {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="workpiece"] .desktop-console-layout > aside,
          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="workpiece"] .desktop-console-layout > section.transcript-column,
          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="refine"] .desktop-console-layout > aside,
          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="refine"] .desktop-console-layout > section.transcript-column,
          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="publish"] .desktop-console-layout > aside,
          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="publish"] .desktop-console-layout > section.transcript-column {
            display: none !important;
          }
          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="workpiece"] .desktop-console-layout > .work-column,
          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="refine"] .desktop-console-layout > .work-column,
          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="publish"] .desktop-console-layout > .work-column {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="source"]
            .desktop-console-layout
            > .work-column
            > .ee-narrow-step-source {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="workpiece"]
            .desktop-console-layout
            > .work-column
            > .ee-narrow-step-structure,
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
            > .ee-narrow-step-revise,
          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="refine"]
            .desktop-console-layout
            > .work-column
            > .ee-narrow-step-validate {
            display: block !important;
          }
          .workspace.ee-narrow.ee-shell-workspace[data-workflow-step="refine"]
            .desktop-console-layout
            > .work-column
            > .ee-narrow-step-processing {
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

          .workspace.ee-narrow > .mobile-first-workspace {
            display: grid;
            gap: 14px;
            order: -1;
            min-width: 0;
            max-width: 100%;
          }
          .workspace.ee-narrow .ee-transcript-library-drawer {
            min-width: 0;
            max-width: 100%;
          }
          .workspace.ee-narrow .ee-transcript-library-summary {
            cursor: pointer;
            min-height: 48px;
            display: flex;
            align-items: center;
            padding: 10px 12px;
            border: 1px solid #dfe5ec;
            border-radius: 12px;
            background: #f8fafc;
            font-size: 14px;
            font-weight: 800;
            color: #22303f;
            list-style: none;
          }
          .workspace.ee-narrow .ee-transcript-library-summary::-webkit-details-marker {
            display: none;
          }
          .workspace.ee-narrow .ee-mobile-classic-editor {
            min-width: 0;
            max-width: 100%;
            grid-column: 1 / -1;
            order: 100;
            margin-top: 8px;
          }
          .workspace.ee-narrow .ee-mobile-classic-summary {
            cursor: pointer;
            display: grid;
            gap: 4px;
            padding: 12px 14px;
            border: 1px solid #dfe5ec;
            border-radius: 14px;
            background: #ffffff;
            min-height: 48px;
            list-style: none;
          }
          .workspace.ee-narrow .ee-mobile-classic-summary::-webkit-details-marker {
            display: none;
          }
          .workspace.ee-narrow .ee-mobile-classic-title {
            color: #17202a;
            font-size: 17px;
            line-height: 1.2;
          }
          .workspace.ee-narrow .ee-mobile-classic-hint {
            color: #617080;
            font-size: 13px;
            font-weight: 650;
          }
          .workspace.ee-narrow .ee-mobile-classic-body {
            margin-top: 12px;
            min-width: 0;
            max-width: 100%;
          }
          .workspace.ee-narrow .mobile-result-output {
            user-select: text;
            -webkit-user-select: text;
            touch-action: manipulation;
            white-space: pre-wrap;
            min-height: 360px;
            max-height: 60vh;
            overflow: auto;
            overflow-wrap: anywhere;
            border: 1px solid #e3e9ef;
            border-radius: 12px;
            background: #fbfcfe;
            color: #15202b;
            padding: 14px;
            font-size: 15px;
            line-height: 1.65;
          }
          .workspace.ee-narrow .mobile-classic-head {
            display: grid;
            gap: 4px;
            border: 1px solid #dfe5ec;
            border-radius: 14px;
            background: #ffffff;
            padding: 14px;
            box-shadow: 0 10px 26px rgba(31, 45, 61, 0.06);
          }
          .workspace.ee-narrow .mobile-classic-head h2,
          .workspace.ee-narrow .mobile-classic-head p {
            margin: 0;
          }
          .workspace.ee-narrow .mobile-classic-head h2 {
            color: #17202a;
            font-size: 18px;
          }
          .workspace.ee-narrow .mobile-classic-head p:not(.eyebrow) {
            color: #617080;
            font-size: 13px;
            line-height: 1.45;
          }
          .workspace.ee-narrow .mobile-primary-tabs {
            position: sticky;
            top: 0;
            z-index: 22;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            border: 1px solid #dfe5ec;
            border-radius: 14px;
            background: rgba(15, 23, 34, 0.96);
            backdrop-filter: blur(12px);
            padding: 8px;
            box-shadow: 0 8px 24px rgba(31, 45, 61, 0.08);
          }
          .workspace.ee-narrow .mobile-primary-tabs button {
            border: 1px solid #cfd8e3;
            border-radius: 999px;
            background: #f8fafc;
            color: #22303f;
            padding: 10px 8px;
            font: inherit;
            font-size: 13px;
            font-weight: 900;
          }
          .workspace.ee-narrow .mobile-primary-tabs button.active {
            border-color: #1d5f63;
            background: #1d5f63;
            color: #ffffff;
          }
          .workspace.ee-narrow .mobile-panel {
            display: grid;
            gap: 12px;
            border: 1px solid #dfe5ec;
            border-radius: 16px;
            background: #ffffff;
            box-shadow: 0 14px 34px rgba(31, 45, 61, 0.07);
            padding: 14px;
          }
          .workspace.ee-narrow .mobile-panel-head {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 10px;
          }
          .workspace.ee-narrow .mobile-panel-head strong {
            color: #17202a;
            font-size: 18px;
          }
          .workspace.ee-narrow .mobile-panel-head span {
            color: #617080;
            font-size: 12px;
            font-weight: 800;
            text-align: right;
          }
          .workspace.ee-narrow .mobile-panel textarea {
            min-height: 320px;
            font-family: inherit;
            font-size: 15px;
            line-height: 1.65;
          }
          .workspace.ee-narrow .mobile-draft-panel textarea {
            min-height: 420px;
          }
          .workspace.ee-narrow .mobile-metrics {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .workspace.ee-narrow .mobile-metrics span {
            border: 1px solid #e3e9ef;
            border-radius: 999px;
            background: #f8fafc;
            color: #526171;
            padding: 6px 9px;
            font-size: 12px;
            font-weight: 850;
          }
          .workspace.ee-narrow .mobile-action-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }
          .workspace.ee-narrow .mobile-result-panel .mobile-action-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .workspace.ee-narrow .mobile-action-grid button {
            border: 1px solid #cfd8e3;
            border-radius: 10px;
            background: #f8fafc;
            color: #22303f;
            padding: 10px 8px;
            font: inherit;
            font-size: 12px;
            font-weight: 900;
            min-height: 44px;
          }
          .workspace.ee-narrow .mobile-action-grid button:first-child {
            border-color: #1d5f63;
            background: #1d5f63;
            color: #ffffff;
          }
          .workspace.ee-narrow .mobile-action-grid button:disabled {
            opacity: 0.55;
          }
          .workspace.ee-narrow .mobile-status {
            border: 1px solid #cfe3e1;
            border-radius: 8px;
            background: #f1f8f7;
            color: #285b5d;
            padding: 9px 10px;
            font-size: 13px;
            font-weight: 800;
          }
          .workspace.ee-narrow .source-layer {
            order: 1;
          }
          .workspace.ee-narrow :global(.result-layer) {
            order: 3;
          }
          .workspace.ee-narrow .mobile-task-toolbar {
            display: none;
          }
          .workspace.ee-narrow .mobile-task-toolbar button {
            display: grid;
            place-items: center;
            gap: 3px;
            border: 1px solid #cfd8e3;
            border-radius: 10px;
            background: #f8fafc;
            color: #22303f;
            padding: 8px 6px;
            font: inherit;
            font-size: 12px;
            font-weight: 850;
          }
          .workspace.ee-narrow .mobile-task-toolbar button.active {
            border-color: #1d5f63;
            background: #1d5f63;
            color: #ffffff;
          }
          .workspace.ee-narrow .mobile-task-toolbar button:disabled {
            opacity: 0.55;
          }
          .workspace.ee-narrow .mobile-task-toolbar span {
            font-size: 17px;
            line-height: 1;
          }
          .workspace.ee-narrow .mobile-task-toolbar small {
            font-size: 10px;
            font-weight: 850;
          }
          .workspace.ee-narrow .mobile-bottom-bar {
            display: none;
          }
          .workspace.ee-narrow .mobile-listening-panel {
            display: grid;
            gap: 8px;
            border: 1px solid #cfe3e1;
            border-radius: 12px;
            background: #f8fcfb;
            padding: 12px;
          }
          .workspace.ee-narrow .mobile-listening-panel strong {
            color: #174447;
            font-size: 13px;
          }
          .workspace.ee-narrow .mobile-listening-panel span {
            color: #617080;
            font-size: 12px;
            font-weight: 800;
          }
          .workspace.ee-narrow .mobile-listen-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .workspace.ee-narrow .mobile-listen-actions button {
            border: 1px solid #cfd8e3;
            border-radius: 8px;
            background: #ffffff;
            color: #22303f;
            padding: 8px 10px;
            font: inherit;
            font-size: 12px;
            font-weight: 800;
          }
          .workspace.ee-narrow .mobile-player {
            position: fixed;
            left: 12px;
            right: 12px;
            bottom: 12px;
            z-index: 31;
            display: grid;
            gap: 8px;
            border: 1px solid #83bdb9;
            border-radius: 14px;
            background: rgba(248, 252, 251, 0.98);
            box-shadow: 0 14px 36px rgba(31, 45, 61, 0.16);
            padding: 10px;
            padding-bottom: calc(10px + env(safe-area-inset-bottom));
          }
          .workspace.ee-narrow .mobile-player.state-idle {
            display: none;
          }
          .workspace.ee-narrow .mobile-player > div:first-child {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            color: #174447;
            font-size: 12px;
          }
          .workspace.ee-narrow .mobile-player span {
            color: #617080;
            font-weight: 800;
          }
          .workspace.ee-narrow .mobile-player-controls {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          .workspace.ee-narrow .mobile-player button {
            border: 1px solid #cfd8e3;
            border-radius: 10px;
            background: #f8fafc;
            color: #22303f;
            padding: 8px;
            font: inherit;
            font-size: 12px;
            font-weight: 800;
            min-height: 42px;
          }
          .workspace.ee-narrow .mobile-player button:nth-child(2) {
            border-color: #1d5f63;
            background: #1d5f63;
            color: #ffffff;
          }
          .workspace.ee-narrow .mobile-bottom-bar button {
            border: 1px solid #cfd8e3;
            border-radius: 10px;
            background: #f8fafc;
            color: #22303f;
            padding: 10px 8px;
            font: inherit;
            font-size: 12px;
            font-weight: 800;
          }
          .workspace.ee-narrow .mobile-bottom-bar button:last-child {
            border-color: #1d5f63;
            background: #1d5f63;
            color: #ffffff;
          }
        @media (max-width: 640px) {
          .workspace {
            padding-bottom: 220px;
          }
          .layer {
            padding: 14px;
          }
          .field-grid,
          .segmented,
          .range-grid,
          .manual-range-row,
          .transcript-box,
          .run-summary,
          .audio-grid,
          .library-grid,
          .library-inline-form,
          .topic-material-metrics,
          .source-summary-card dl,
          .mobile-bottom-bar {
            grid-template-columns: 1fr;
          }
          .player-progress-row {
            grid-template-columns: 1fr;
          }
          .player-controls span {
            width: 100%;
            margin-left: 0;
          }
          .mobile-player {
            bottom: max(12px, env(safe-area-inset-bottom));
          }
          .transcript-source {
            justify-self: start;
          }
          .transcript-primary-actions {
            justify-self: start;
            justify-content: flex-start;
          }
        }
        @media (max-width: 420px) {
          .workspace {
            gap: 10px;
            padding-bottom: 240px;
          }
          .mobile-primary-tabs {
            gap: 6px;
            border-radius: 12px;
            padding: 6px;
          }
          .mobile-primary-tabs button {
            min-height: 42px;
            padding: 9px 6px;
            font-size: 12px;
          }
          .mobile-panel,
          .mobile-classic-head,
          .project-layer,
          .transcript-library-panel {
            border-radius: 14px;
            padding: 12px;
          }
          .mobile-action-grid,
          .mobile-result-panel .mobile-action-grid,
          .project-actions {
            grid-template-columns: 1fr;
          }
          .project-actions button,
          .library-button,
          .copy-action,
          .secondary {
            width: 100%;
            min-height: 44px;
            white-space: normal;
            text-align: center;
          }
          .mobile-panel textarea {
            min-height: 260px;
          }
          .mobile-draft-panel textarea {
            min-height: 360px;
          }
          .mobile-result-output {
            min-height: 280px;
            max-height: 52vh;
          }
          .mobile-panel-head {
            align-items: flex-start;
            flex-direction: column;
          }
          .mobile-panel-head span {
            text-align: left;
          }
          .mobile-player {
            left: 8px;
            right: 8px;
            gap: 7px;
            border-radius: 14px;
          }
        }
      `}</style>
    </div>
        </div>
      </details>
    </div>
    </EssayEngineProvider>
  );
}
