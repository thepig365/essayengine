import type { EngineTask, LLMProvider, OutputMode } from "@/types/engine";

export const TASKS: { value: EngineTask; label: string; helper: string }[] = [
  { value: "translate", label: "Translate", helper: "Convert content to target language" },
  { value: "paraphrase", label: "Paraphrase", helper: "Express differently" },
  { value: "rewrite", label: "Rewrite", helper: "Change style or clarity" },
  { value: "summarize", label: "Summarize", helper: "Condense content" },
  { value: "extract", label: "Extract", helper: "Pull key info" },
  { value: "improve", label: "Improve", helper: "Refine quality" },
];

export const TASK_ICONS: Record<EngineTask, string> = {
  rewrite: "📝",
  paraphrase: "🔁",
  translate: "🌍",
  summarize: "📄",
  extract: "🔍",
  improve: "✨",
};

export const MODES: { value: OutputMode; label: string; helper: string }[] = [
  { value: "auto", label: "Auto", helper: "Engine decides safest behavior" },
  { value: "content_only", label: "Content Only", helper: "Best for normal writing" },
  { value: "same_format", label: "Same Format", helper: "Preserves HTML / JSX / Markdown / JSON" },
  { value: "text_node_only", label: "Text Nodes Only", helper: "Safe for code/page replacement" },
  { value: "diff", label: "Diff", helper: "Only changed lines (Cursor workflow)" },
  { value: "structured_data", label: "Structured JSON", helper: "For CMS / templates / automation" },
];

export const SOURCE_LANGUAGES = [
  { value: "", label: "Auto Detect" },
  { value: "English", label: "English" },
  { value: "Chinese Simplified", label: "Chinese Simplified" },
  { value: "Chinese Traditional", label: "Chinese Traditional" },
  { value: "Spanish", label: "Spanish" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Japanese", label: "Japanese" },
  { value: "Korean", label: "Korean" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Italian", label: "Italian" },
  { value: "Arabic", label: "Arabic" },
  { value: "Hindi", label: "Hindi" },
];

export const TARGET_LANGUAGES = [
  { value: "English", label: "English" },
  { value: "Chinese Simplified", label: "Chinese Simplified" },
  { value: "Chinese Traditional", label: "Chinese Traditional" },
  { value: "Spanish", label: "Spanish" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Japanese", label: "Japanese" },
  { value: "Korean", label: "Korean" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Italian", label: "Italian" },
  { value: "Arabic", label: "Arabic" },
  { value: "Hindi", label: "Hindi" },
];

export const TONES = [
  { value: "", label: "Default" },
  { value: "Clear", label: "Clear" },
  { value: "Formal", label: "Formal" },
  { value: "Friendly", label: "Friendly" },
  { value: "Warm", label: "Warm" },
  { value: "Professional", label: "Professional" },
  { value: "Concise", label: "Concise" },
  { value: "Persuasive", label: "Persuasive" },
  { value: "Gentle", label: "Gentle" },
  { value: "Academic", label: "Academic" },
];

export const INSTRUCTION_PRESETS = [
  { value: "", label: "None" },
  {
    value:
      "Rewrite this in natural human English. Preserve meaning. Avoid AI-sounding phrasing, inflated academic wording, generic transitions, and unnatural synonyms. Keep the voice clear, grounded, and author-like.",
    label: "Humanize English",
  },
  {
    value:
      "Rewrite this as a thoughtful human essay paragraph. Keep the meaning, improve rhythm and clarity, reduce stiffness, and avoid corporate or academic AI tone.",
    label: "Author-style rewrite",
  },
  {
    value:
      "Remove AI-like phrasing. Avoid over-polished, generic, inflated, or robotic language. Make the writing sound natural, specific, and human.",
    label: "Remove AI tone",
  },
  {
    value: "用自然、流畅、有作者感的中文改写。保留原意，避免翻译腔、AI腔、空泛表达和过度正式的措辞。",
    label: "Natural Chinese rewrite",
  },
  {
    value:
      "请根据 Source 内容写成一篇中文散文。风格清雅、含蓄、细腻，有早期现代中文散文的抒情气质；语言自然、有画面感，避免AI腔、口号式表达和过度总结。保留原意，但可以重组结构，使其成为一篇完整、有节奏的短文。不要直接仿写任何具体作家。",
    label: "Modern Chinese lyrical prose",
  },
  {
    value:
      "Rewrite with a warm, reflective, essay-like voice. Keep the meaning clear, but make the rhythm more human and emotionally grounded.",
    label: "Warm essay voice",
  },
  {
    value:
      "Polish for academic clarity and precision while preserving the original meaning. Avoid unnecessary complexity.",
    label: "Academic polish",
  },
  { value: "preserve the original structure", label: "Preserve structure" },
  { value: "only change visible text", label: "Only change visible text" },
  { value: "output a diff", label: "Output diff" },
  { value: "keep the same format", label: "Keep same format" },
  { value: "make the output more natural", label: "Make it more natural" },
  { value: "make the output more concise", label: "Make it more concise" },
  { value: "make the output warmer", label: "Make it warmer" },
  { value: "make the output more formal", label: "Make it more formal" },
  { value: "extract the key points", label: "Extract key points" },
  { value: "return structured JSON", label: "Return structured JSON" },
];

export const PROVIDER_OPTIONS: { value: LLMProvider; label: string; note: string }[] = [
  { value: "openai", label: "OpenAI", note: "general quality" },
  { value: "deepseek", label: "DeepSeek", note: "long text / cost" },
  { value: "qwen", label: "Qwen", note: "Chinese strength" },
];

export const SOURCE_CHIPS = [
  {
    label: "Text",
    placeholder: "Paste plain text or essay content here.",
    helper: "Paste source text to translate, rewrite, summarize, or improve.",
  },
  {
    label: "Webpage URL",
    placeholder: "Paste a public webpage URL here.",
    helper: "The engine will fetch webpage content server-side and process it as source material.",
  },
  {
    label: "YouTube",
    placeholder: "Paste a YouTube URL here.",
    helper: "Fetch a transcript and use it as source material for writing, summaries, or articles.",
  },
  {
    label: "HTML / JSX",
    placeholder: "Paste HTML, JSX, or TSX here.",
    helper: "Use Same Format or Text Nodes Only to preserve structure.",
  },
  {
    label: "JSON",
    placeholder: "Paste JSON here.",
    helper: "Use Structured JSON or Same Format depending on your goal.",
  },
  {
    label: "Notes",
    placeholder: "Paste notes, rough ideas, or NotebookLM material here.",
    helper: "Turn notes into clearer essays, summaries, or thought-leader drafts.",
  },
  {
    label: "Article Draft",
    placeholder: "Paste an article draft here.",
    helper: "Improve, rewrite, translate, or repurpose the draft.",
  },
];

export const TTS_VOICES = ["echo", "alloy", "verse", "aria", "coral", "sage"];
export const TTS_SPEEDS = [0.8, 1.0, 1.1, 1.2];
export const TTS_STYLES = ["Default", "Calm", "Warm", "Clear", "Reflective"];
export const YOUTUBE_RE =
  /^https?:\/\/(?:(?:www\.|m\.)?youtube\.com\/(?:watch\?[^ ]*v=|shorts\/)|youtu\.be\/)[\w-]{11}/i;
export const WEBPAGE_RE = /^https?:\/\/\S+$/i;
