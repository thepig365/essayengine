/**
 * Canonical 5-stage workflow domain model.
 *
 * Source → Extraction → Topic → Processing → Review/Product
 *
 *   Source        raw inputs (text, URLs, files, transcripts, screenshots)
 *   Extraction    raw inputs broken into selectable segments
 *   Topic         user-selected segments saved as `TopicMaterial`
 *   Processing    AI transforms TopicMaterial.content into drafts
 *   Review        human review, finalize, and ship as `FinalProduct`
 *
 * Core contract: AI calls in Processing operate on `TopicMaterial.content`,
 * never on the unselected raw source unless `useFullSource === true`.
 */

export type WorkflowStage =
  | "material"
  | "extraction"
  | "topic"
  | "processing"
  | "review_product";

export type SourceKind =
  | "youtube"
  | "podcast"
  | "audio"
  | "linkedin"
  | "social_post"
  | "article"
  | "webpage"
  | "text"
  | "document"
  | "image"
  | "screenshot";

export type CanonicalSource = {
  id: string;
  type: SourceKind;
  title?: string;
  url?: string;
  author?: string;
  rawContent?: string;
  mediaUrl?: string;
  createdAt: string;
};

export type CanonicalSourceSegmentType =
  | "timestamp"
  | "paragraph"
  | "comment"
  | "image_description"
  | "ocr_text"
  | "visual_element";

export type CanonicalSourceSegment = {
  id: string;
  sourceId: string;
  type: CanonicalSourceSegmentType;
  startTime?: number;
  endTime?: number;
  label?: string;
  author?: string;
  text: string;
  selected: boolean;
};

export type TopicMaterial = {
  id: string;
  sourceId: string;
  sourceType: SourceKind | string;
  selectedSegmentIds: string[];
  selectedRange?: {
    startTime?: number;
    endTime?: number;
  };
  /** The text the engine will operate on. Built from selected segments. */
  content: string;
  title?: string;
  notes?: string;
  tags?: string[];
  /** When true, AI may reference the full original source. Defaults to false. */
  useFullSource: boolean;
  saved: boolean;
  createdAt: string;
};

export type ProcessingLayer =
  | "understanding"
  | "topic_transform"
  | "structure"
  | "creation"
  | "translation"
  | "style_revision";

export type ProcessingStyleSettings = {
  language: "zh" | "en" | "bilingual";
  writingStyle:
    | "plain"
    | "literary"
    | "reflective"
    | "narrative"
    | "poetic"
    | "thought_leadership";
  tone:
    | "gentle"
    | "calm"
    | "direct"
    | "warm"
    | "powerful"
    | "prayerful";
  emotionalIntensity: "low" | "medium" | "high";
  audience: string;
  format: string;
  length: "short" | "medium" | "long" | "custom";
  listeningMode:
    | "silent_reading"
    | "read_aloud"
    | "voiceover"
    | "audiobook"
    | "meditation_audio";
};

export const DEFAULT_PROCESSING_STYLE_SETTINGS: ProcessingStyleSettings = {
  language: "zh",
  writingStyle: "reflective",
  tone: "calm",
  emotionalIntensity: "medium",
  audience: "Readers seeking reflective, gentle prose",
  format: "article",
  length: "medium",
  listeningMode: "read_aloud",
};

/** Stage labels for `WorkflowShell` / `WorkflowStageNav` (independent of legacy mobile step ids). */
export type WorkflowStepDescriptor = {
  id: WorkflowStage;
  label: string;
  short: string;
  description: string;
};

export const WORKFLOW_STAGES: ReadonlyArray<WorkflowStepDescriptor> = [
  {
    id: "material",
    label: "Source",
    short: "1 Source",
    description: "Capture raw inputs — text, URLs, files, transcripts, voice, screenshots.",
  },
  {
    id: "extraction",
    label: "Extraction",
    short: "2 Extraction",
    description: "Break raw inputs into selectable segments (timestamps, paragraphs, comments).",
  },
  {
    id: "topic",
    label: "Topic",
    short: "3 Topic",
    description: "Save the selected segments as the topic the engine will work on.",
  },
  {
    id: "processing",
    label: "Processing",
    short: "4 Processing",
    description: "Apply Understanding, Topic Transform, Structure, Creation, Translation, or Style Revision.",
  },
  {
    id: "review_product",
    label: "Review & Product",
    short: "5 Review",
    description: "Review the draft, finalize, export, repurpose, listen.",
  },
] as const;

export type DraftWorkpieceType =
  | "summary"
  | "outline"
  | "article"
  | "essay"
  | "post"
  | "chapter"
  | "script"
  | "translation";

export type DraftWorkpieceStatus = "draft" | "needs_revision" | "approved";

export type DraftWorkpiece = {
  id: string;
  topicMaterialId: string;
  layer: ProcessingLayer;
  type: DraftWorkpieceType;
  content: string;
  styleSettings?: ProcessingStyleSettings;
  version: number;
  status: DraftWorkpieceStatus;
  createdAt: string;
};

export type FinalProductFormat =
  | "article"
  | "post"
  | "chapter"
  | "video_script"
  | "audiobook_script"
  | "translation"
  | "pdf"
  | "docx";

export type FinalProductStatus = "final" | "published" | "archived";

export type FinalProduct = {
  id: string;
  draftId: string;
  topicMaterialId: string;
  title: string;
  format: FinalProductFormat;
  content: string;
  audioPreviewUrl?: string;
  status: FinalProductStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
};

/** Stages that should be locked until prerequisite data exists. */
export function isStageReady(
  stage: WorkflowStage,
  context: {
    hasMaterial?: boolean;
    hasExtractedSegments?: boolean;
    hasTopicMaterial?: boolean;
    hasDraft?: boolean;
  },
): boolean {
  switch (stage) {
    case "material":
      return true;
    case "extraction":
      return Boolean(context.hasMaterial);
    case "topic":
      return Boolean(context.hasExtractedSegments);
    case "processing":
      return Boolean(context.hasTopicMaterial);
    case "review_product":
      return Boolean(context.hasDraft);
  }
}
