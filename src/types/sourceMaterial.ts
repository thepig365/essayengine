export type SourceMaterialType =
  | "youtube"
  | "podcast"
  | "audio"
  | "linkedin"
  | "stackback"
  | "social_post"
  | "article"
  | "text"
  | "document";

/** Normalized segment for any source; selection state lives in UI (checked id set). */
export type SourceSegment = {
  id: string;
  startTime?: number;
  endTime?: number;
  label?: string;
  author?: string;
  text: string;
};

export type NormalizedSource = {
  id: string;
  type: SourceMaterialType;
  title?: string;
  url?: string;
  author?: string;
  publishedAt?: string;
  rawContent: string;
  segments: SourceSegment[];
};

export type SourceMaterialPipelineTab = "transcript" | "link" | "paste" | "audio" | "document";

export type PersistedGenericMaterialState = {
  kind: SourceMaterialType;
  title?: string;
  url?: string;
  author?: string;
  rawContent: string;
  segments: SourceSegment[];
  checkedSegmentIds: string[];
};
