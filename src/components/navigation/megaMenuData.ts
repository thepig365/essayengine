/**
 * Functions menu — descriptive only.
 * EngineForm maps `actionId` to scroll targets, existing handlers, or disabled/advanced behavior.
 * Internal category `id` values are stable; visible labels use Source (not Material) at the top level.
 */
export type MegaMenuActionId = string;

export type MegaMenuItemSpec = {
  actionId: MegaMenuActionId;
  icon: string;
  title: string;
  description: string;
  /** live: primary wiring; advanced: jumps to Advanced Studio; disabled: no-op */
  tier: "live" | "advanced" | "disabled";
};

export type MegaMenuCategorySpec = {
  id: "material" | "extract" | "topic" | "process" | "review" | "export" | "settings";
  /** Visible workflow section title (Source, not Material) */
  navLabel: string;
  items: MegaMenuItemSpec[];
};

export const MEGA_MENU_CATEGORIES: MegaMenuCategorySpec[] = [
  {
    id: "material",
    navLabel: "Source",
    items: [
      { actionId: "material-paste", icon: "📋", title: "Paste Source", description: "Long-form paste and plain-text capture.", tier: "live" },
      { actionId: "material-youtube", icon: "▶", title: "YouTube", description: "Fetch transcript from a video URL.", tier: "live" },
      { actionId: "material-web", icon: "🔗", title: "Web Article", description: "Extract readable text from a page URL.", tier: "live" },
      { actionId: "material-transcript", icon: "📝", title: "Transcript", description: "Transcript and captions workspace.", tier: "live" },
      { actionId: "material-audio", icon: "🎙", title: "Audio", description: "Upload audio for transcription.", tier: "live" },
      {
        actionId: "material-image",
        icon: "🖼",
        title: "Image / Screenshot",
        description: "Visual capture pipeline.",
        tier: "disabled",
      },
      {
        actionId: "source-save",
        icon: "💾",
        title: "Save Source",
        description: "Persist current source text as the active source version.",
        tier: "live",
      },
      {
        actionId: "source-clear",
        icon: "⌫",
        title: "Clear Source",
        description: "Reset the current source capture (workspace only).",
        tier: "live",
      },
    ],
  },
  {
    id: "extract",
    navLabel: "Extract",
    items: [
      { actionId: "extract-transcript-blocks", icon: "☑", title: "Select Transcript Blocks", description: "Open the block checklist in the extractor.", tier: "live" },
      { actionId: "extract-time-range", icon: "⏱", title: "Timestamp Range", description: "Manual time ranges and tools.", tier: "live" },
      { actionId: "extract-paragraph-blocks", icon: "¶", title: "Paragraph Blocks", description: "Paste or document paragraph mode.", tier: "live" },
      { actionId: "extract-topic-filter", icon: "🔎", title: "Topic Filter", description: "Find sections by keywords.", tier: "live" },
      { actionId: "process-story-beats", icon: "📖", title: "Story Beats", description: "Narrative beats from saved topic text.", tier: "live" },
      { actionId: "process-examples", icon: "💡", title: "Examples & Cases", description: "Concrete examples from the source.", tier: "live" },
      {
        actionId: "extract-copy-selected",
        icon: "📎",
        title: "Copy Selected",
        description: "Copy checked transcript blocks to the clipboard.",
        tier: "live",
      },
      {
        actionId: "extract-replace-source-selection",
        icon: "⇄",
        title: "Replace Source with Selection",
        description: "Replace source capture with the checked transcript sections.",
        tier: "live",
      },
    ],
  },
  {
    id: "topic",
    navLabel: "Topic",
    items: [
      { actionId: "topic-save", icon: "💾", title: "Save as Topic", description: "Promote the current selection to your saved topic.", tier: "live" },
      { actionId: "topic-full-source", icon: "⛶", title: "Use Full Source", description: "Build topic from the full captured source.", tier: "live" },
      { actionId: "topic-clear", icon: "⌫", title: "Clear Topic", description: "Reset saved topic material.", tier: "live" },
      {
        actionId: "topic-notes",
        icon: "📌",
        title: "Topic Notes",
        description: "Extended notes on the topic card.",
        tier: "advanced",
      },
      {
        actionId: "topic-status-detail",
        icon: "📊",
        title: "Topic Status",
        description: "Full status and controls in Advanced Studio.",
        tier: "advanced",
      },
    ],
  },
  {
    id: "process",
    navLabel: "Process",
    items: [
      { actionId: "process-main-claims", icon: "✦", title: "Main Claims", description: "Bullet core claims from saved topic text.", tier: "live" },
      { actionId: "process-core-summary", icon: "✳", title: "Core Summary", description: "Faithful short recap.", tier: "live" },
      { actionId: "process-topic-card", icon: "🃏", title: "Topic Card", description: "Reusable writing topic card.", tier: "live" },
      { actionId: "process-writing-directions", icon: "✍", title: "Writing Directions", description: "Concrete directions for drafting.", tier: "live" },
      { actionId: "process-write-article", icon: "📰", title: "Write Article", description: "Online article shape.", tier: "live" },
      { actionId: "process-write-essay", icon: "📄", title: "Write Essay", description: "About 500-word arc.", tier: "live" },
      { actionId: "process-linkedin", icon: "💼", title: "LinkedIn Post", description: "Hook and close for social.", tier: "live" },
      { actionId: "process-mendbook", icon: "📕", title: "Mendbook Chapter", description: "Reflective chapter pacing.", tier: "live" },
      { actionId: "process-audiobook", icon: "🎧", title: "Audiobook Script", description: "Cadence for listening.", tier: "live" },
      { actionId: "process-translate", icon: "🌐", title: "Translate", description: "Use current language settings.", tier: "live" },
      {
        actionId: "process-rewrite",
        icon: "♻",
        title: "Rewrite",
        description: "Style passes from latest workpiece context.",
        tier: "live",
      },
    ],
  },
  {
    id: "review",
    navLabel: "Review",
    items: [
      { actionId: "review-listen-source", icon: "🔊", title: "Listen to Source", description: "Text-to-speech for captured source text.", tier: "live" },
      { actionId: "review-listen-draft", icon: "🔉", title: "Listen to Draft", description: "Play essay draft audio.", tier: "live" },
      { actionId: "review-listen-final", icon: "🔈", title: "Listen to Final", description: "Play saved final output.", tier: "live" },
      { actionId: "review-revise", icon: "🛠", title: "Revise", description: "Open listen-and-mark workflow.", tier: "live" },
      {
        actionId: "review-rewrite-selection",
        icon: "✎",
        title: "Rewrite Selected Part",
        description: "Continue from the latest result.",
        tier: "live",
      },
      {
        actionId: "review-compare-versions",
        icon: "⇄",
        title: "Compare Versions",
        description: "Side-by-side version review.",
        tier: "disabled",
      },
    ],
  },
  {
    id: "export",
    navLabel: "Export",
    items: [
      { actionId: "export-save-draft", icon: "💾", title: "Save Draft", description: "Persist the current essay draft.", tier: "live" },
      { actionId: "export-save-final", icon: "✓", title: "Save Final", description: "Mark draft outputs as final.", tier: "live" },
      { actionId: "export-copy", icon: "📎", title: "Copy", description: "Copy draft to clipboard.", tier: "live" },
      {
        actionId: "export-markdown",
        icon: "MD",
        title: "Markdown",
        description: "Structured export.",
        tier: "advanced",
      },
      {
        actionId: "export-docx",
        icon: "DOCX",
        title: "DOCX",
        description: "Word-compatible export.",
        tier: "advanced",
      },
      {
        actionId: "export-audio-script",
        icon: "📜",
        title: "Audio Script",
        description: "Audiobook-style script variant.",
        tier: "advanced",
      },
    ],
  },
  {
    id: "settings",
    navLabel: "Settings",
    items: [
      { actionId: "settings-ai-engine", icon: "🧠", title: "AI Engine", description: "Model providers and comparison.", tier: "live" },
      { actionId: "settings-language", icon: "🌐", title: "Language", description: "Source and target language.", tier: "live" },
      { actionId: "settings-tone", icon: "🎚", title: "Tone", description: "Voice and tone presets.", tier: "live" },
      { actionId: "settings-output-style", icon: "◎", title: "Output Style", description: "Formatting and output mode.", tier: "live" },
      { actionId: "settings-tts-voice", icon: "🗣", title: "TTS Voice", description: "Read-aloud voice, speed, style.", tier: "live" },
      { actionId: "settings-project", icon: "📁", title: "Project Save / Load", description: "Local projects and duplicates.", tier: "live" },
    ],
  },
];
