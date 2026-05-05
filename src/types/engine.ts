export type InputType =
  | "plain_text"
  | "markdown"
  | "html"
  | "jsx"
  | "tsx"
  | "json"
  | "url"
  | "youtube_url"
  | "unknown";

export type OutputMode =
  | "auto"
  | "content_only"
  | "same_format"
  | "text_node_only"
  | "diff"
  | "structured_data";

export type ResolvedOutputMode = Exclude<OutputMode, "auto">;

export type EngineTask =
  | "translate"
  | "paraphrase"
  | "rewrite"
  | "summarize"
  | "extract"
  | "improve";

export type LLMProvider = "openai" | "deepseek" | "qwen";

export type EngineRequest = {
  input: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  task: EngineTask;
  tone?: string;
  outputMode?: OutputMode;
  preserveFormatting?: boolean;
  userInstruction?: string;
  providers?: LLMProvider[];
};

export type ProviderResult = {
  requestedProvider: LLMProvider;
  actualProvider: LLMProvider;
  fallbackUsed: boolean;
  success: boolean;
  output: string;
  error?: string;
  latencyMs: number;
};

export type EngineResponse = {
  output: string;
  outputs?: ProviderResult[];
  outputMode: ResolvedOutputMode;
  inputType: InputType;
  warnings: string[];
};

export type TranscriptSegment = {
  start: number;
  duration?: number;
  text: string;
};

export type YouTubeTranscript = {
  videoId: string;
  text: string;
  segments: TranscriptSegment[];
};
