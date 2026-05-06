"use client";

import { useMemo, useRef, useState } from "react";
import { EssayDraftWorkspace } from "@/components/EssayDraftWorkspace";
import { FinalPanel } from "@/components/FinalPanel";
import { DesktopConsoleLayout } from "@/components/layout/DesktopConsoleLayout";
import { MobileWorkflowLayout } from "@/components/layout/MobileWorkflowLayout";
import { MobileWorkflowPanel } from "@/components/MobileWorkflowPanel";
import { OutputPanel } from "@/components/OutputPanel";
import {
  DraftGeneratorPanel,
  EngineSelectionPanel,
  EssayAssemblyPanel,
  ListenAndMarkPanel,
  ResultValidationPanel,
  SourceMaterialPanel,
  StructureBuilderPanel,
  TranscriptWorkspacePanel,
} from "@/components/essay-engine/panels";
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

import {
  INSTRUCTION_PRESETS,
  MODES,
  PROVIDER_OPTIONS,
  SOURCE_CHIPS,
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  TASKS,
  TASK_ICONS,
  TONES,
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
  const [mobileActiveTab, setMobileActiveTab] = useState<"source" | "draft" | "result">("draft");
  const [mobileWorkflowStepIndex, setMobileWorkflowStepIndex] = useState(0);
  const [mobileToolsDrawerOpen, setMobileToolsDrawerOpen] = useState(false);
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
  const generateSectionRef = useRef<HTMLElement | null>(null);
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
    return parts.length ? parts.join(". ") : undefined;
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
    try {
      const req: EngineRequest = {
        input,
        task,
        outputMode,
        sourceLanguage: sourceLanguage || undefined,
        targetLanguage: targetLanguage || undefined,
        tone: tone || undefined,
        userInstruction: combinedInstruction(),
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

  async function getTranscript() {
    setTranscriptLoading(true);
    setTranscriptStatus(null);
    const sourceUrl = input.trim();
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
        setTranscriptStatus("Transcript fetched. Choose how to use it.");
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
        setTranscriptStatus(data.warnings?.[0] ?? "Transcript unavailable.");
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
      (sourceVersions.length > 0 || input.trim() || essayDraftContent.trim() || result || finalResult) &&
      !window.confirm("Start a fresh writing pipeline? This clears current Source Versions, Source, Result, Draft, and Final for this project.")
    ) {
      return;
    }
    resetPipelineSourceWorkspace();
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
      setTranscriptStatus("Transcript preview is empty. Fetch a transcript first.");
      return;
    }
    const content = formatTranscriptText(transcriptText);
    setInput(content);
    setSourceType("youtube_transcript_full");
    setSourceFrom(transcriptOrigin === "saved transcript" ? "saved transcript" : "fetched transcript");
    setSourceSelectionCount(fullTranscriptSections.length || 1);
    createSourceVersion({
      content,
      origin: "transcript_selection",
      label: "Full transcript",
      parentVersionId: currentSourceVersionId ?? undefined,
    });
    setTranscriptStatus("Full transcript is now used as source.");
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

  function manualRangeBlocks(): { start: number; end: number; title: string; text: string }[] | null {
    const blocks: { start: number; end: number; title: string; text: string }[] = [];
    const populatedRanges = manualRanges.filter((range) => range.start.trim() || range.end.trim());

    if (populatedRanges.length === 0) {
      setRangeStatus("Add at least one transcript range.");
      return null;
    }

    for (let i = 0; i < populatedRanges.length; i += 1) {
      const range = populatedRanges[i];
      const startSeconds = parseTimestampToSeconds(range.start);
      const endSeconds = parseTimestampToSeconds(range.end);
      const label = `Range ${i + 1}`;
      if (startSeconds === null || endSeconds === null) {
        setRangeStatus(`${label} has an invalid timestamp. Use MM:SS or H:MM:SS.`);
        return null;
      }
      if (endSeconds <= startSeconds) {
        setRangeStatus(`${label} end time must be later than start time.`);
        return null;
      }
      const text = extractTranscriptRangeFromSegments(transcriptSegments, startSeconds, endSeconds);
      if (!text) {
        setRangeStatus(`${label} has no transcript segments. Check the timestamp range.`);
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

  return (
    <EssayEngineProvider value={essayEngineController}>
    <div
      className={`workspace${effectiveIsMobileLayout ? " ee-narrow ee-shell-workspace" : ""}`}
      data-mobile-step={effectiveIsMobileLayout && mobileWorkflowStepId ? mobileWorkflowStepId : undefined}
    >
      <DesktopConsoleLayout>
      <aside id="ee-panel-engines" className={controlsCollapsed ? "control-column collapsed" : "control-column"}>
        <EngineSelectionPanel>
        <div className="control-panel-toggle">
          <button
            type="button"
            className="collapse-toggle"
            onClick={() => setControlsCollapsed((value) => !value)}
            aria-label={controlsCollapsed ? "Expand control panel" : "Collapse control panel"}
            title={controlsCollapsed ? "Expand controls" : "Collapse controls"}
          >
            ☰
          </button>
          {!controlsCollapsed && <span>Control Console</span>}
        </div>
        <section className="layer">
          <div className="layer-head">
            <p className="eyebrow">2. Engine Selection Layer</p>
            <h2>Engine selection</h2>
            <p>Select one engine for normal mode, or multiple engines for real comparison.</p>
          </div>
          <div className={comparisonActive ? "mode-badge comparison" : "mode-badge"}>
            {comparisonActive
              ? "Comparison mode active. Results will appear side-by-side in the Result / Validation workspace."
              : "Single engine mode. One result will be generated."}
          </div>
          <div className="engine-list">
            {PROVIDER_OPTIONS.map((p) => (
              <label key={p.value} className={providers.includes(p.value) ? "engine selected" : "engine"}>
                <input
                  type="checkbox"
                  checked={providers.includes(p.value)}
                  onChange={() => toggleProvider(p.value)}
                />
                <span>
                  <strong>{p.label}</strong>
                  <small>{p.note}</small>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="layer task-layer">
          <div className="layer-head">
            <p className="eyebrow">3. Task Layer</p>
            <h2>Transformation task</h2>
            <p>Choose what the engine should do with the captured source.</p>
          </div>
          <div className="task-icon-bar" aria-label="Transformation task">
            {TASKS.map((t) => (
              <button
                key={t.value}
                type="button"
                className={task === t.value ? "task-icon-button active" : "task-icon-button"}
                onClick={() => setTask(t.value)}
                aria-label={t.label}
                title={t.label}
                data-tooltip={t.label}
              >
                <span className="task-icon" aria-hidden="true">{TASK_ICONS[t.value]}</span>
                {!controlsCollapsed && <span className="task-label">{t.label}</span>}
              </button>
            ))}
          </div>
          {!controlsCollapsed && <div className="selected-description">
            <strong>{activeTask.label}</strong>
            <p>{activeTask.helper}</p>
          </div>}
          {!controlsCollapsed && showWritingPresetHint && (
            <div className="writing-hint">
              For English human rewriting, use Humanize English or Author-style rewrite. For Chinese rewriting, use Natural Chinese rewrite.
            </div>
          )}
        </section>

        <section className="layer">
          <div className="layer-head">
            <p className="eyebrow">4. Language Layer</p>
            <h2>Language direction</h2>
            <p>Use controlled language choices for predictable translation and rewriting.</p>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Source Language</span>
              <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
                {SOURCE_LANGUAGES.map((language) => (
                  <option key={language.label} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Target Language</span>
              <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
                {TARGET_LANGUAGES.map((language) => (
                  <option key={language.label} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="quick-picks" aria-label="Common target languages">
            <button type="button" onClick={() => setTargetLanguage("Chinese Simplified")}>
              Chinese Simplified
            </button>
            <button type="button" onClick={() => setTargetLanguage("English")}>
              English
            </button>
            <button type="button" onClick={() => setTargetLanguage("Chinese Traditional")}>
              Chinese Traditional
            </button>
          </div>
        </section>

        <section className="layer">
          <div className="layer-head">
            <p className="eyebrow">5. Output Behavior Layer</p>
            <h2>Output behavior</h2>
            <p>Choose how strictly the result should preserve or reshape the source.</p>
          </div>
          <label className="field">
            <span>Output Behavior</span>
            <select value={outputMode} onChange={(e) => setOutputMode(e.target.value as OutputMode)}>
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div className="selected-description">
            <strong>{activeMode.label}</strong>
            <p>{activeMode.helper}</p>
          </div>
        </section>

        <section className="layer">
          <div className="layer-head">
            <p className="eyebrow">6. Advanced Control Layer</p>
            <h2>Tone and instruction</h2>
            <p>Use presets for common rules, then add precise constraints only when needed.</p>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Tone</span>
              <select value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => (
                  <option key={t.label} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Instruction Preset</span>
              <select value={instructionPreset} onChange={(e) => setInstructionPreset(e.target.value)}>
                {INSTRUCTION_PRESETS.map((preset) => (
                  <option key={preset.label} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Custom Instruction</span>
            <textarea
              className="instruction"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              rows={4}
              placeholder="Add extra control if needed, e.g. preserve HTML classes, do not change links, keep JSX logic untouched."
            />
          </label>
          <div className="writing-hint">
            For Chinese lyrical prose, use “Modern Chinese lyrical prose”. It asks for a清雅、含蓄、细腻的现代散文气质 without directly imitating any specific writer.
          </div>
        </section>

        <section className="layer run-layer" ref={generateSectionRef}>
          <div className="layer-head">
            <p className="eyebrow">7. Generate / Run Layer</p>
            <h2>Run workspace</h2>
            <p>Generate output from the current source, engine selection, and transformation settings.</p>
          </div>
          <div className="ready-summary">
            <strong>Before Generate</strong>
            <p>{sourceSummary}</p>
            <ul>
              <li>{providers.length} engine{providers.length === 1 ? "" : "s"}</li>
              <li>Task: {task}</li>
              <li>Target: {targetLanguage}</li>
              <li>Behavior: {outputMode}</li>
            </ul>
          </div>
          <dl className="run-summary">
            <div>
              <dt>Task</dt>
              <dd>{activeTask.label}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>{targetLanguage}</dd>
            </div>
            <div>
              <dt>Providers</dt>
              <dd>{providers.length}</dd>
            </div>
            <div>
              <dt>Behavior</dt>
              <dd>{activeMode.label}</dd>
            </div>
          </dl>
          {generateBlocked && (
            <div className="run-blocked">
              Transcript fetched. Apply the full transcript or selected sections to Source Capture before generating.
            </div>
          )}
          <button type="button" className="primary" onClick={generate} disabled={loading || !input.trim() || generateBlocked}>
            {loading ? "Generating..." : runLabel}
          </button>
          {error && <p className="error">{error}</p>}
        </section>

        <section className="layer read-layer">
          <div className="layer-head">
            <p className="eyebrow">9. Read Aloud Layer</p>
            <h2>Read aloud</h2>
            <p>
              Listen to the source or generated results before deciding what to use. Long text will be read in parts
              automatically. You can download parts or one merged MP3.
            </p>
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
        </EngineSelectionPanel>
      </aside>

      <section id="ee-panel-transcript" className="layer transcript-column">
        <TranscriptWorkspacePanel className="ee-narrow-step-transcript">
        <div className="layer-head">
          <p className="eyebrow">Transcript Workspace</p>
          <h2>Transcript Workspace</h2>
          <p>Select, filter, and prepare transcript content before sending to Source.</p>
        </div>

        {!transcriptText && (
          <div className="transcript-empty">
            <strong>{isYouTubeUrl ? "YouTube source detected" : "No transcript loaded"}</strong>
            <p>
              {isYouTubeUrl
                ? "Fetch the transcript, then curate chapters, topics, or ranges before replacing Source."
                : "Paste a YouTube URL in Source, then fetch a transcript to use this workspace."}
            </p>
            {isYouTubeUrl && (
              <button type="button" className="primary transcript-fetch" onClick={getTranscript} disabled={transcriptLoading}>
                {transcriptLoading ? "Fetching..." : "Get Transcript"}
              </button>
            )}
            {transcriptStatus && <span className="range-status">{transcriptStatus}</span>}
          </div>
        )}

        {transcriptText && (
          <div className="transcript-tools">
            <details open className="priority-section">
              <summary>1. Timestamp Chapters</summary>
              <div className="timestamp-chapters">
                <div className="range-head">
                  <strong>Recommended: use timestamp chapters for precise selection</strong>
                  <p>Convert pasted timestamps into selectable transcript sections.</p>
                </div>
                <div className="workspace-subhead">A. Timestamp Input</div>
                <label className="field">
                  <span>Timestamp chapters</span>
                  <textarea
                    className="chapter-input"
                    value={timestampChapterInput}
                    onChange={(e) => {
                      setTimestampChapterInput(e.target.value);
                    setChapterSectionsGenerated(false);
                    setCheckedChapterIds([]);
                      setChapterStatus(null);
                    }}
                    rows={7}
                  placeholder={`Paste timestamps like:

00:00 The hook
01:30 The problem
02:15 Planning the rebuild`}
                  />
                </label>
                <div className="range-actions cta-row">
                  <button type="button" className="secondary" onClick={applyTimestampChapters}>
                    Generate chapter sections
                  </button>
                  <button type="button" className="primary" onClick={replaceSourceWithCheckedSections}>
                    Replace source with checked chapters
                  </button>
                  <button type="button" className="secondary" onClick={addCheckedSectionsToSource}>
                    Add checked chapters to source
                  </button>
                <button type="button" className="secondary" onClick={addCheckedSectionsToDraft}>
                  Add checked chapters to Essay Draft
                </button>
                  <button type="button" className="copy-action" onClick={copyCheckedSectionsCleanText}>
                    Copy checked clean text
                  </button>
                </div>
                {chapterSectionsGenerated ? (
                  <>
                    <div className="workspace-subhead">B. Parsed Sections</div>
                    <div className="chapter-list compact">
                      {timestampChapterSections.map((section) => (
                        <label className="chapter-row" key={section.id}>
                          <input
                            type="checkbox"
                            checked={checkedChapterIds.includes(section.id)}
                            onChange={() => toggleTimestampChapter(section.id)}
                          />
                          <span>
                            <strong>{formatTimestamp(section.start)}-{formatTimestamp(section.end)}</strong>
                            {section.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="transcript-note">Parsed sections will appear after you click Generate chapter sections.</p>
                )}
                {chapterStatus && <span className="range-status">{chapterStatus}</span>}
              </div>
            </details>

            <details open>
              <summary>2. Topic Filter</summary>
              <div className="topic-filter">
                <div className="range-head">
                  <strong>Topic Filter</strong>
                  <p>Search within transcript sections locally. This selects relevant sections; it does not summarize.</p>
                </div>
                <label className="field">
                  <span>Topic keywords or phrases</span>
                  <input
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="anxiety, depression, social contagion, ADHD, body budget"
                  />
                </label>
                <div className="range-actions cta-row">
                  <button type="button" className="secondary" onClick={findTopicSections}>
                    Find matches
                  </button>
                  <button type="button" className="primary" onClick={replaceSourceWithMatchedSections}>
                    Replace source with matched sections
                  </button>
                  <button type="button" className="secondary" onClick={addMatchedSectionsToSource}>
                    Add matched sections to source
                  </button>
                  <button type="button" className="secondary" onClick={addMatchedSectionsToDraft}>
                    Add matched sections to Essay Draft
                  </button>
                  <button type="button" className="copy-action" onClick={copyMatchedSections}>
                    Copy matched clean text
                  </button>
                  <button type="button" className="copy-action" onClick={clearTopicMatches}>
                    Clear matches
                  </button>
                </div>
                <div className="workspace-section-list compact">
                  {topicMatches.map((match) => (
                    <article className="workspace-section" key={match.section.id}>
                      <label className="workspace-section-head">
                        <input
                          type="checkbox"
                          checked={checkedTopicSectionIds.includes(match.section.id)}
                          onChange={() => toggleTopicSection(match.section.id)}
                        />
                        <span>
                          <strong>
                            {formatTimestamp(match.section.start)}-{formatTimestamp(match.section.end)} — {match.section.title}
                          </strong>
                          <em>Keyword score: {match.score}</em>
                        </span>
                      </label>
                    </article>
                  ))}
                </div>
                {topicStatus && <span className="range-status">{topicStatus}</span>}
              </div>
            </details>

            <details>
              <summary>3. Advanced: Manual Time Ranges</summary>
              <div className="range-selector">
                <div className="range-head">
                  <strong>Advanced: Manual Time Ranges</strong>
                  <p>Use this only when you already know the exact start and end times.</p>
                </div>
                <div className="manual-ranges">
                  {manualRanges.map((range, index) => (
                    <div className="manual-range-row" key={range.id}>
                      <label className="field">
                        <span>Start time</span>
                        <input
                          type="text"
                          value={range.start}
                          onChange={(e) => updateManualRange(range.id, "start", e.target.value)}
                          placeholder={index === 0 ? "49:47" : "1:08:23"}
                        />
                      </label>
                      <label className="field">
                        <span>End time</span>
                        <input
                          type="text"
                          value={range.end}
                          onChange={(e) => updateManualRange(range.id, "end", e.target.value)}
                          placeholder={index === 0 ? "54:06" : "1:15:00"}
                        />
                      </label>
                      <button type="button" className="copy-action" onClick={() => removeManualRange(range.id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="range-actions cta-row">
                  <button type="button" className="secondary" onClick={addManualRange}>
                    Add range
                  </button>
                  <button type="button" className="primary" onClick={replaceSourceWithManualRanges}>
                    Replace source with ranges
                  </button>
                  <button type="button" className="secondary" onClick={addManualRangesToSource}>
                    Add ranges to source
                  </button>
                  <button type="button" className="secondary" onClick={addManualRangesToDraft}>
                    Add ranges to Essay Draft
                  </button>
                  <button type="button" className="copy-action" onClick={clearManualRanges}>
                    Clear ranges
                  </button>
                </div>
                {rangeStatus && <span className="range-status">{rangeStatus}</span>}
              </div>
            </details>

            <details>
              <summary>4. Rough transcript sections for browsing</summary>
              <div className="section-workspace">
                <div className="rough-warning">Headings are approximate and may be inaccurate.</div>
                <label className="organize-option">
                  <input
                    type="checkbox"
                    checked={includeTranscriptTimestamps}
                    onChange={(e) => setIncludeTranscriptTimestamps(e.target.checked)}
                  />
                  <span>Include timestamps in copied headings</span>
                </label>
                <div className="range-actions cta-row">
                  <button type="button" className="primary" onClick={replaceSourceWithCheckedFullTranscriptSections}>
                    Replace source with checked rough sections
                  </button>
                  <button type="button" className="secondary" onClick={addCheckedFullTranscriptSectionsToSource}>
                    Add checked rough sections to source
                  </button>
                  <button type="button" className="secondary" onClick={addCheckedFullTranscriptSectionsToDraft}>
                    Add checked rough sections to Essay Draft
                  </button>
                  <button type="button" className="copy-action" onClick={copyCheckedFullTranscriptSections}>
                    Copy checked rough sections
                  </button>
                </div>
                <div className="workspace-section-list">
                  {fullTranscriptSections.map((section) => (
                    <article className="workspace-section" key={section.id}>
                      <label className="workspace-section-head">
                        <input
                          type="checkbox"
                          checked={checkedFullSectionIds.includes(section.id)}
                          onChange={() => toggleFullTranscriptSection(section.id)}
                        />
                        <span>
                          <strong>
                            {formatTimestamp(section.start)}-{formatTimestamp(section.end)} — {section.title}
                          </strong>
                          <em>Approximate section</em>
                        </span>
                      </label>
                      <div className="workspace-section-text">{cleanSectionText(section)}</div>
                    </article>
                  ))}
                </div>
                {fullSectionStatus && <span className="range-status">{fullSectionStatus}</span>}
              </div>
            </details>

            <details>
              <summary>5. Raw Transcript</summary>
              <p className="transcript-note">Preview only. Source is not updated unless you use Add or Replace.</p>
              <textarea className="transcript-preview" value={transcriptText} readOnly rows={8} />
            </details>
          </div>
        )}

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

      <div id="ee-panel-workspace" className="work-column">
        {effectiveIsDesktopConsole ? (
          <SourceMaterialPanel>
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
          </SourceMaterialPanel>
        ) : null}

        <StructureBuilderPanel className="ee-narrow-step-structure ee-narrow-step-draft ee-narrow-step-mark ee-narrow-step-revise ee-narrow-step-validate ee-narrow-step-assemble">
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
          onCreateStructures={mobileWorkflow.createWorkflowStructures}
          onSelectStructure={mobileWorkflow.setSelectedWorkflowStructureId}
          onCopySelectedStructureOutline={mobileWorkflow.copySelectedStructureOutline}
          onGenerateDraft={mobileWorkflow.generateStructuredDraft}
          onEnterListenMode={mobileWorkflow.enterListenAndMarkMode}
          onToggleParagraphMark={mobileWorkflow.toggleDraftParagraphMark}
          onRevisionInstructionChange={mobileWorkflow.setRevisionInstruction}
          onRequestRevision={mobileWorkflow.reviseMarkedDraft}
          onDiagnose={mobileWorkflow.diagnoseDraftQuality}
          onCopyDiagnosis={mobileWorkflow.copyDiagnosis}
          selectedPolishDirections={mobileWorkflow.selectedPolishDirections}
          onTogglePolishDirection={mobileWorkflow.togglePolishDirection}
          onCreatePolishVersions={mobileWorkflow.createPolishVersions}
          onUsePolishVersion={mobileWorkflow.usePolishAsDraft}
          onCopyPolishVersion={mobileWorkflow.copyPolishVersion}
          selectedRepurposeFormats={mobileWorkflow.selectedRepurposeFormats}
          onToggleRepurposeFormat={mobileWorkflow.toggleRepurposeFormat}
          onRepurpose={mobileWorkflow.createRepurposeOutputs}
          onCopyRepurposeOutput={mobileWorkflow.copyRepurposeOutput}
          mode={mobileWorkflowPanelMode}
          compactLabels={effectiveIsMobileLayout}
          supportRailSourceSummary={sourceSummaryDetails}
        />
        </StructureBuilderPanel>

        <SourceMaterialPanel className="ee-narrow-step-source">
        {effectiveIsMobileLayout ? (
          <details className="ee-mobile-writing-pipeline">
            <summary className="ee-mobile-writing-pipeline-summary">Writing pipeline</summary>
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
          </details>
        ) : null}
        <section className="layer source-layer">
          <div className="layer-head">
            <p className="eyebrow">Source → Generate</p>
            <h2>Source (Engine Input)</h2>
            <p>Only this source content feeds Generate. Transcript Workspace never generates directly.</p>
          </div>
          <div className="source-purpose source-summary-card">
            <strong>Source summary:</strong>
            <dl>
              <div>
                <dt>Type</dt>
                <dd>{sourceSummaryDetails.type}</dd>
              </div>
              <div>
                <dt>Sections</dt>
                <dd>{sourceSummaryDetails.sections}</dd>
              </div>
              <div>
                <dt>Approx. words</dt>
                <dd>{sourceSummaryDetails.words.toLocaleString()}</dd>
              </div>
              <div>
                <dt>From</dt>
                <dd>{sourceSummaryDetails.from}</dd>
              </div>
            </dl>
          </div>

          <div className="source-strip" aria-label="Supported source types">
            {SOURCE_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                className={sourceChip.label === chip.label ? "active" : ""}
                onClick={() => setSourceChip(chip)}
              >
                {chip.label}
              </button>
            ))}
            {isWebpageUrl && <strong>Webpage detected</strong>}
            {isYouTubeUrl && <strong>YouTube detected</strong>}
          </div>

          <div className={input.trim() ? "source-helper active" : "source-helper"}>
            {sourceHelper}
          </div>
          <div className="source-state">
            <strong>Current source:</strong> {currentSourceVersion ? `v${currentSourceVersion.versionNumber} ${currentSourceVersion.label}` : sourceKind}
          </div>
          {viewedSourceVersion && viewedSourceVersion.id !== currentSourceVersionId && (
            <div className="source-action-status">
              Viewing v{viewedSourceVersion.versionNumber}. Click “Use as current source” in the timeline to make it active.
            </div>
          )}
          {sourceActionStatus && <div className="source-action-status">{sourceActionStatus}</div>}
          <div className="source-draft-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => appendToEssayDraft(input, "Current Source added to Essay Draft.")}
              disabled={!input.trim()}
            >
              Add source to Essay Draft
            </button>
            <button type="button" className="copy-action source-clear" onClick={clearSourceOnly} disabled={!input.trim()}>
              Clear source
            </button>
          </div>
          <div className="input-label">Engine input — this text will be processed.</div>

          <textarea
            value={input}
            onChange={(e) => updateInput(e.target.value)}
            rows={16}
            placeholder={sourceChip.placeholder}
          />

          {isYouTubeUrl && !transcriptText && (
            <div className="transcript-box source-fetch">
              <div>
                <strong>YouTube source detected</strong>
                <p>Fetch the transcript, then curate it in the center workspace before replacing Source.</p>
              </div>
              <button type="button" className="secondary" onClick={getTranscript} disabled={transcriptLoading}>
                {transcriptLoading ? "Fetching..." : "Get Transcript"}
              </button>
              {transcriptStatus && <span className="status">{transcriptStatus}</span>}
            </div>
          )}

          {false && (isYouTubeUrl || transcriptText) && (
            <div className="transcript-box">
              <div>
                <strong>{transcriptText ? "Transcript Workspace" : "YouTube source detected"}</strong>
                <p>
                  {transcriptText
                    ? "Review, copy, or select transcript sections before sending them into Source Capture."
                    : "Fetch transcript to use it as source material."}
                </p>
              </div>
              {isYouTubeUrl && !transcriptText ? (
                <button type="button" className="secondary" onClick={getTranscript} disabled={transcriptLoading}>
                  {transcriptLoading ? "Fetching..." : "Get Transcript"}
                </button>
              ) : null}
              {transcriptStatus && <span className="status">{transcriptStatus}</span>}
              {transcriptText && (
                <div className="transcript-tools">
                  <details open>
                    <summary>1. Full Transcript Sections</summary>
                    <div className="section-workspace">
                      <div className="range-head">
                        <strong>Full Transcript Sections</strong>
                        <p>Browse the full transcript organized into readable sections with headings.</p>
                      </div>
                      <label className="organize-option">
                        <input
                          type="checkbox"
                          checked={includeTranscriptTimestamps}
                          onChange={(e) => setIncludeTranscriptTimestamps(e.target.checked)}
                        />
                        <span>Include timestamps in copied headings</span>
                      </label>
                      <div className="range-actions">
                        <button type="button" className="secondary" onClick={copyFullTranscriptSections}>
                          Copy all clean sections
                        </button>
                        <button type="button" className="secondary transfer" onClick={addFullTranscriptSectionsToSource}>
                          Add all sections to source
                        </button>
                        <button type="button" className="secondary transfer" onClick={replaceSourceWithFullTranscriptSections}>
                          Replace source with all sections
                        </button>
                        <button type="button" className="secondary" onClick={copyCheckedFullTranscriptSections}>
                          Copy checked sections
                        </button>
                        <button type="button" className="secondary transfer" onClick={addCheckedFullTranscriptSectionsToSource}>
                          Add checked sections to source
                        </button>
                        <button type="button" className="secondary transfer" onClick={replaceSourceWithCheckedFullTranscriptSections}>
                          Replace source with checked sections
                        </button>
                        <button type="button" className="secondary quiet" onClick={clearCheckedFullTranscriptSections}>
                          Clear checked sections
                        </button>
                      </div>
                      <div className="workspace-section-list">
                        {fullTranscriptSections.map((section) => (
                          <article className="workspace-section" key={section.id}>
                            <label className="workspace-section-head">
                              <input
                                type="checkbox"
                                checked={checkedFullSectionIds.includes(section.id)}
                                onChange={() => toggleFullTranscriptSection(section.id)}
                              />
                              <span>
                                <strong>
                                  {formatTimestamp(section.start)}-{formatTimestamp(section.end)}
                                  {" — "}
                                  {section.title}
                                </strong>
                                <em>Approximate transcript section</em>
                              </span>
                            </label>
                            <div className="workspace-section-text">{cleanSectionText(section)}</div>
                            <div className="section-actions">
                              <button
                                type="button"
                                className="secondary"
                                onClick={() =>
                                  copyTranscriptText(cleanSectionText(section), "Section clean text copied.", setFullSectionStatus)
                                }
                              >
                                Copy clean text
                              </button>
                              <button
                                type="button"
                                className="secondary transfer"
                                onClick={() => addFullTranscriptSectionToSource(section)}
                              >
                                Add section to source
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                      {fullSectionStatus && <span className="range-status">{fullSectionStatus}</span>}
                    </div>
                  </details>

                  <details open>
                    <summary>2. Timestamp Chapters</summary>
                    <div className="timestamp-chapters">
                      <div className="range-head">
                        <strong>Timestamp Chapters</strong>
                        <p>Paste real YouTube timestamp chapters, then select precise transcript sections.</p>
                      </div>
                      <label className="field">
                        <span>Timestamp list</span>
                        <textarea
                          className="chapter-input"
                          value={timestampChapterInput}
                          onChange={(e) => {
                            setTimestampChapterInput(e.target.value);
                            setChapterStatus(null);
                          }}
                          rows={7}
                          placeholder={`00:00 The hook — why I built this
01:30 The problem
02:15 Planning the rebuild
04:00 The build begins
08:15 Everything breaks
15:25 The honest verdict`}
                        />
                      </label>
                      <div className="range-actions">
                        <button type="button" className="secondary" onClick={applyTimestampChapters}>
                          Apply timestamp chapters
                        </button>
                        <button type="button" className="secondary" onClick={generateRoughChapterSuggestions}>
                          Generate rough chapter suggestions
                        </button>
                      </div>
                      {chapterStatus === "Rough suggestions generated — edit titles before using." && (
                        <div className="rough-note">Rough suggestions — edit titles before using.</div>
                      )}
                      <div className="range-actions">
                        <button type="button" className="secondary" onClick={copyCheckedSectionsCleanText}>
                          Copy checked sections
                        </button>
                        <button type="button" className="secondary" onClick={copyCheckedSectionsWithHeadings}>
                          Copy checked sections with headings
                        </button>
                        <button type="button" className="secondary transfer" onClick={addCheckedSectionsToSource}>
                          Add checked sections to source
                        </button>
                        <button type="button" className="secondary transfer" onClick={replaceSourceWithCheckedSections}>
                          Replace source with checked sections
                        </button>
                        <button type="button" className="secondary quiet" onClick={clearCheckedChapters}>
                          Clear checked chapters
                        </button>
                      </div>
                      <div className="workspace-section-list">
                        {timestampChapterSections.map((section) => (
                          <article className="workspace-section" key={section.id}>
                            <label className="workspace-section-head">
                              <input
                                type="checkbox"
                                checked={checkedChapterIds.includes(section.id)}
                                onChange={() => toggleTimestampChapter(section.id)}
                              />
                              <span>
                                <strong>
                                  {formatTimestamp(section.start)}-{formatTimestamp(section.end)}
                                  {" — "}
                                  {section.title}
                                </strong>
                              </span>
                            </label>
                            <div className="workspace-section-text">{cleanSectionText(section)}</div>
                            <div className="section-actions">
                              <button type="button" className="secondary" onClick={() => copySectionCleanText(section)}>
                                Copy clean text
                              </button>
                              <button type="button" className="secondary transfer" onClick={() => addSectionToSource(section)}>
                                Add section to source
                              </button>
                            <button type="button" className="secondary transfer" onClick={() => addSectionToDraft(section)}>
                              Add to Essay Draft
                            </button>
                            </div>
                          </article>
                        ))}
                      </div>
                      {timestampChapterSections.length === 0 && (
                        <p className="transcript-note">Apply timestamp chapters to create precise chapter sections.</p>
                      )}
                      {chapterStatus && <span className="range-status">{chapterStatus}</span>}
                    </div>
                  </details>

                  <details open>
                    <summary>3. Manual Time Ranges</summary>
                    <div className="range-selector">
                      <div className="range-head">
                        <strong>Manual Time Ranges</strong>
                        <p>Add one or more non-continuous timestamp ranges and combine them as source.</p>
                      </div>
                      <label className="organize-option">
                        <input
                          type="checkbox"
                          checked={organizeTranscriptSections}
                          onChange={(e) => setOrganizeTranscriptSections(e.target.checked)}
                        />
                        <span>Organize range transfers into sections</span>
                      </label>
                      <div className="manual-ranges">
                        {manualRanges.map((range, index) => (
                          <div className="manual-range-row" key={range.id}>
                            <label className="field">
                              <span>Start time</span>
                              <input
                                type="text"
                                value={range.start}
                                onChange={(e) => updateManualRange(range.id, "start", e.target.value)}
                                placeholder={index === 0 ? "49:47" : "1:08:23"}
                              />
                            </label>
                            <label className="field">
                              <span>End time</span>
                              <input
                                type="text"
                                value={range.end}
                                onChange={(e) => updateManualRange(range.id, "end", e.target.value)}
                                placeholder={index === 0 ? "54:06" : "1:15:00"}
                              />
                            </label>
                            <button type="button" className="secondary quiet" onClick={() => removeManualRange(range.id)}>
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="range-actions">
                        <button type="button" className="secondary" onClick={addManualRange}>
                          Add range
                        </button>
                        <button type="button" className="secondary transfer" onClick={useManualRangesAsSource}>
                          Use selected ranges as source
                        </button>
                        <button type="button" className="secondary quiet" onClick={clearManualRanges}>
                          Clear ranges
                        </button>
                      </div>
                      {rangeStatus && <span className="range-status">{rangeStatus}</span>}
                    </div>
                  </details>

                  <details open>
                    <summary>4. Topic Filter</summary>
                    <div className="topic-filter">
                      <div className="range-head">
                        <strong>Topic Filter</strong>
                        <p>Find matching full transcript sections using local keyword or phrase matching only.</p>
                      </div>
                      <label className="field">
                        <span>Topic keywords or phrases</span>
                        <input
                          value={topicInput}
                          onChange={(e) => setTopicInput(e.target.value)}
                          placeholder="anxiety, depression, social contagion, ADHD, body budget"
                        />
                      </label>
                      <div className="range-actions">
                        <button type="button" className="secondary" onClick={findTopicSections}>
                          Find topic sections
                        </button>
                        <button type="button" className="secondary quiet" onClick={clearTopicMatches}>
                          Clear topic matches
                        </button>
                        <button type="button" className="secondary" onClick={copyMatchedSections}>
                          Copy matched clean text
                        </button>
                        <button type="button" className="secondary transfer" onClick={addMatchedSectionsToSource}>
                          Add matched sections to source
                        </button>
                        <button type="button" className="secondary transfer" onClick={replaceSourceWithMatchedSections}>
                          Replace source with matched sections
                        </button>
                      </div>
                      <div className="workspace-section-list">
                        {topicMatches.map((match) => (
                          <article className="workspace-section" key={match.section.id}>
                            <label className="workspace-section-head">
                              <input
                                type="checkbox"
                                checked={checkedTopicSectionIds.includes(match.section.id)}
                                onChange={() => toggleTopicSection(match.section.id)}
                              />
                              <span>
                                <strong>
                                  {formatTimestamp(match.section.start)}-{formatTimestamp(match.section.end)}
                                  {" — "}
                                  {match.section.title}
                                </strong>
                                <em>Keyword score: {match.score}</em>
                              </span>
                            </label>
                            <div className="workspace-section-text">{cleanSectionText(match.section)}</div>
                            <div className="section-actions">
                              <button
                                type="button"
                                className="secondary"
                                onClick={() =>
                                  copyTranscriptText(cleanSectionText(match.section), "Matched section copied.", setTopicStatus)
                                }
                              >
                                Copy clean text
                              </button>
                              <button
                                type="button"
                                className="secondary transfer"
                                onClick={() => {
                                  appendToSource(
                                    formatSectionsForSource([match.section], "## Topic Matched Transcript Sections"),
                                    "youtube_transcript_selected_sections",
                                    "Matched section added to Source Capture.",
                                  );
                                  setTopicStatus("Matched section added to Source Capture.");
                                }}
                              >
                                Add section to source
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                      {topicMatchedSectionIds.length > 0 && topicMatches.length === 0 && (
                        <p className="transcript-note">Matched sections are no longer available for the current transcript.</p>
                      )}
                      {topicStatus && <span className="range-status">{topicStatus}</span>}
                    </div>
                  </details>

                  <details>
                    <summary>Raw Transcript Preview</summary>
                    <p className="transcript-note">Preview only. Source Capture is not updated unless you use add, replace, or use-as-source actions.</p>
                    <textarea className="transcript-preview" value={transcriptText} readOnly rows={8} />
                  </details>
                </div>
              )}
            </div>
          )}

          <div className="source-footer">
            <span>{input.trim().length.toLocaleString()} characters captured</span>
          </div>
        </section>
        </SourceMaterialPanel>

        <ResultValidationPanel className="ee-narrow-step-draft ee-narrow-step-validate">
        <OutputPanel
          result={result}
          task={task}
          selectedProviders={providers}
          onReplaceResultSource={useResultAsSource}
          onAddResultToSource={addResultToSource}
          onContinueResult={continueFromResult}
          onReadResult={readResultAloud}
          onAddResultToDraft={(output) => appendToEssayDraft(output, "Result added to Essay Draft.")}
          onReplaceDraftWithResult={(output) => replaceEssayDraft(output, "Essay Draft replaced with selected result.")}
          onMarkFinal={markResultAsFinal}
          finalResult={finalResult}
          resultStep={workflowStep + 1}
        />
        </ResultValidationPanel>

        <DraftGeneratorPanel className="ee-narrow-step-assemble">
        <EssayDraftWorkspace
          title={essayDraftTitle}
          content={essayDraftContent}
          updatedAt={essayDraftUpdatedAt}
          onTitleChange={(value) => {
            setEssayDraftTitle(value);
            setEssayDraftUpdatedAt(new Date().toISOString());
          }}
          onContentChange={(value) => {
            setEssayDraftContent(value);
            setEssayDraftUpdatedAt(new Date().toISOString());
          }}
          onSaveDraft={saveEssayDraft}
          onClearDraft={clearEssayDraft}
          onCopyDraft={copyEssayDraft}
          onUseDraftAsSource={useEssayDraftAsSource}
          onMarkDraftFinal={markEssayDraftAsFinal}
          onReadDraft={() => runTtsAction("play", essayDraftContent, "essayengine-draft", "essayengine-draft.mp3")}
          onDownloadDraftParts={() => runTtsAction("parts", essayDraftContent, "essayengine-draft", "essayengine-draft.mp3")}
          onDownloadDraftMerged={() => runTtsAction("merged", essayDraftContent, "essayengine-draft", "essayengine-draft.mp3")}
          onDownloadDraftTxt={downloadEssayDraftTxt}
          audioBusy={ttsLoading}
          status={essayDraftStatus}
        />
        </DraftGeneratorPanel>

        <ListenAndMarkPanel className="ee-narrow-step-mark">
        {effectiveIsMobileLayout ? (
          <details className="ee-mobile-read-aloud-settings">
            <summary className="ee-mobile-read-aloud-summary">Read aloud settings</summary>
            <section className="layer read-layer ee-mobile-read-layer-duplicate">
              <div className="layer-head">
                <p className="eyebrow">9. Read Aloud Layer</p>
                <h2>Read aloud</h2>
                <p>
                  Listen to the source or generated results before deciding what to use. Long text will be read in parts
                  automatically. You can download parts or one merged MP3.
                </p>
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
            <p className="eyebrow">Listen</p>
            <h2>Audio</h2>
            <p>
              Listen after selecting source, result, or final output.
              {effectiveIsMobileLayout ? " Voice settings are in Read aloud settings above." : " Voice settings live in the left controls."}
            </p>
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
        </ListenAndMarkPanel>

        <EssayAssemblyPanel className="ee-narrow-step-assemble">
        {effectiveIsMobileLayout ? (
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
        ) : null}
        <FinalPanel
          finalVersion={finalVersion}
          onCopyFinal={copyFinalArticle}
          onDownloadFinalTxt={downloadFinalTxt}
          onReadFinal={() => finalVersion && runTtsAction("play", finalVersion.content, "essayengine-final", "essayengine-final.mp3")}
          onDownloadFinalAudiobook={() => finalVersion && runTtsAction("merged", finalVersion.content, "essayengine-final", "essayengine-final.mp3")}
          onCopyGoogleDocs={copyFinalForGoogleDocs}
          audioBusy={ttsLoading}
        />
        </EssayAssemblyPanel>
      </div>
      </DesktopConsoleLayout>

      <section className="mobile-first-workspace" aria-label="Mobile Essay Engine workspace">
        <MobileWorkflowLayout
          activeStepIndex={mobileWorkflowStepIndex}
          onActiveStepIndexChange={setMobileWorkflowStepIndex}
          onPrimaryWorkspaceAction={() => void generate()}
          primaryWorkspaceDisabled={loading || !input.trim() || generateBlocked}
          primaryWorkspaceLabel={loading ? "Generating…" : runLabel}
          desktopMinWidth={DESKTOP_MIN}
        />

        <details className="ee-mobile-classic-editor" open={effectiveIsDesktopConsole}>
          <summary className="ee-mobile-classic-summary">
            <span className="eyebrow">Classic Editor</span>
            <strong className="ee-mobile-classic-title">Source / Draft / Result</strong>
            <span className="ee-mobile-classic-hint">Optional quick edit — expand for tabs</span>
          </summary>
          <div className="ee-mobile-classic-body">
        <nav className="mobile-primary-tabs" aria-label="Mobile workflow tabs">
          {[
            { id: "source", label: "Source" },
            { id: "draft", label: "Draft" },
            { id: "result", label: "Result" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={mobileActiveTab === tab.id ? "active" : ""}
              onClick={() => setMobileActiveTab(tab.id as "source" | "draft" | "result")}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {mobileActiveTab === "source" && (
          <section className="mobile-panel mobile-source-panel">
            <div className="mobile-panel-head">
              <strong>Source</strong>
              <span>Current engine input</span>
            </div>
            <textarea
              value={input}
              onChange={(e) => updateInput(e.target.value)}
              rows={14}
              placeholder="Paste or edit source text here."
            />
            <div className="mobile-metrics">
              <span>{sourceWordCount.toLocaleString()} words</span>
              <span>{input.length.toLocaleString()} characters</span>
            </div>
            <div className="mobile-action-grid">
              <button type="button" onClick={() => replaceSource(input, sourceType, "Source saved as current source version.")} disabled={!input.trim()}>
                Replace
              </button>
              <button type="button" onClick={() => appendToEssayDraft(input, "Source added to Essay Draft.")} disabled={!input.trim()}>
                Add to Draft
              </button>
              <button type="button" onClick={() => runTtsAction("play", input, "essayengine-source", "essayengine-source.mp3")} disabled={!input.trim() || ttsLoading}>
                Read aloud
              </button>
            </div>
          </section>
        )}

        {mobileActiveTab === "draft" && (
          <section className="mobile-panel mobile-draft-panel">
            <div className="mobile-panel-head">
              <strong>Draft</strong>
              <span>Human writing and assembly space</span>
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
              <button type="button" onClick={() => runTtsAction("play", essayDraftContent, "essayengine-draft", "essayengine-draft.mp3")} disabled={!essayDraftContent.trim() || ttsLoading}>
                Read aloud
              </button>
            </div>
            {essayDraftStatus && <div className="mobile-status">{essayDraftStatus}</div>}
          </section>
        )}

        {mobileActiveTab === "result" && (
          <section className="mobile-panel mobile-result-panel">
            <div className="mobile-panel-head">
              <strong>Result</strong>
              <span>Latest generated output</span>
            </div>
            <div className="mobile-result-output" data-selectable-output="true">{primaryResultOutput || "No result yet. Generate from Source first."}</div>
            <div className="mobile-action-grid">
              <button type="button" onClick={() => appendToEssayDraft(primaryResultOutput, "Result added to Essay Draft.")} disabled={!primaryResultOutput}>
                Add to Draft
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

      </section>

      <nav className="mobile-tabs legacy-mobile-tabs" aria-label="Mobile workflow tabs">
        <span>Transcript</span>
        <span>Source</span>
        <span>Results</span>
        <span>Listen</span>
        <span>Final</span>
      </nav>

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
          aria-label="Listen"
          title="Listen"
        >
          <span aria-hidden="true">🎧</span>
          <small>Listen</small>
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
            <button type="button" onClick={() => currentSourceVersion && useSourceVersionAsCurrent(currentSourceVersion)}>
              Promote to Source
            </button>
            <button type="button" onClick={() => currentSourceVersion && markSourceVersionAsFinal(currentSourceVersion)}>
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
        <button type="button" onClick={generate} disabled={loading || !input.trim() || generateBlocked}>
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
        .mobile-tabs,
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

          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="engines"] .control-column .run-layer,
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

          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="engines"] .desktop-console-layout > aside {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="transcript"]
            .desktop-console-layout
            > section.transcript-column {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="source"] .desktop-console-layout > .work-column,
          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="structure"] .desktop-console-layout > .work-column,
          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="draft"] .desktop-console-layout > .work-column,
          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="mark"] .desktop-console-layout > .work-column,
          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="revise"] .desktop-console-layout > .work-column,
          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="validate"] .desktop-console-layout > .work-column,
          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="assemble"] .desktop-console-layout > .work-column {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="source"]
            .desktop-console-layout
            > .work-column
            > .ee-narrow-step-source {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="structure"]
            .desktop-console-layout
            > .work-column
            > .ee-narrow-step-structure {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="draft"]
            .desktop-console-layout
            > .work-column
            > .ee-narrow-step-draft {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="mark"]
            .desktop-console-layout
            > .work-column
            > .ee-narrow-step-mark {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="revise"]
            .desktop-console-layout
            > .work-column
            > .ee-narrow-step-revise {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="validate"]
            .desktop-console-layout
            > .work-column
            > .ee-narrow-step-validate {
            display: block !important;
          }

          .workspace.ee-narrow.ee-shell-workspace[data-mobile-step="assemble"]
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
            grid-template-columns: repeat(3, 1fr);
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
          .workspace.ee-narrow .mobile-tabs {
            display: none;
          }
          .workspace.ee-narrow .mobile-tabs span {
            border-radius: 999px;
            background: #f1f8f7;
            color: #174447;
            padding: 8px 6px;
            text-align: center;
            font-size: 12px;
            font-weight: 800;
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
          .mobile-tabs {
            display: none;
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
    </EssayEngineProvider>
  );
}
