/**
 * Phase 1 mega menu structure — descriptive only.
 * EngineForm maps `actionId` to scroll targets, existing handlers, or disabled/advanced behavior.
 */
export type MegaMenuActionId = string;

export type MegaMenuItemSpec = {
  actionId: MegaMenuActionId;
  icon: string;
  title: string;
  description: string;
  /** live: primary Phase 1 wiring; advanced: jumps to Advanced Studio; disabled: no-op hint */
  tier: "live" | "advanced" | "disabled";
};

export type MegaMenuCategorySpec = {
  id: "material" | "extract" | "topic" | "process" | "review" | "export" | "settings";
  navLabel: string;
  items: MegaMenuItemSpec[];
};

export const MEGA_MENU_CATEGORIES: MegaMenuCategorySpec[] = [
  {
    id: "material",
    navLabel: "Material",
    items: [
      { actionId: "material-paste", icon: "📋", title: "Paste source", description: "Long-form paste and plain-text capture.", tier: "live" },
      { actionId: "material-youtube", icon: "▶", title: "YouTube", description: "Fetch transcript from a video URL.", tier: "live" },
      { actionId: "material-web", icon: "🔗", title: "Web article", description: "Extract readable text from a page URL.", tier: "live" },
      { actionId: "material-transcript", icon: "📝", title: "Transcript", description: "Transcript / captions workspace tab.", tier: "live" },
      { actionId: "material-audio", icon: "🎙", title: "Audio", description: "Upload audio for transcription.", tier: "live" },
      {
        actionId: "material-image",
        icon: "🖼",
        title: "Image / screenshot",
        description: "Visual capture pipeline.",
        tier: "disabled",
      },
    ],
  },
  {
    id: "extract",
    navLabel: "Extract",
    items: [
      { actionId: "extract-transcript-blocks", icon: "☑", title: "Select transcript blocks", description: "Jump to block checklist in the extractor.", tier: "live" },
      { actionId: "extract-time-range", icon: "⏱", title: "Timestamp range", description: "Manual and advanced time ranges.", tier: "live" },
      { actionId: "extract-paragraph-blocks", icon: "¶", title: "Paragraph blocks", description: "Paste / document paragraph mode.", tier: "live" },
      { actionId: "extract-topic-filter", icon: "🔎", title: "Topic filter", description: "Find sections by keywords.", tier: "live" },
      { actionId: "process-story-beats", icon: "📖", title: "Story beats", description: "Narrative beats from saved material.", tier: "live" },
      { actionId: "process-examples", icon: "💡", title: "Examples & cases", description: "Concrete examples from the source.", tier: "live" },
    ],
  },
  {
    id: "topic",
    navLabel: "Topic",
    items: [
      { actionId: "topic-save", icon: "💾", title: "Save as Topic", description: "Promote selection to your saved topic.", tier: "live" },
      { actionId: "topic-full-source", icon: "⛶", title: "Use full source", description: "Build topic from the full captured source.", tier: "live" },
      { actionId: "topic-clear", icon: "⌫", title: "Clear Topic", description: "Reset saved topic material.", tier: "live" },
      {
        actionId: "topic-notes",
        icon: "📌",
        title: "Topic notes",
        description: "Extended notes on the topic card.",
        tier: "advanced",
      },
      {
        actionId: "topic-status-detail",
        icon: "📊",
        title: "Topic status",
        description: "Full status and controls in Advanced Studio.",
        tier: "advanced",
      },
    ],
  },
  {
    id: "process",
    navLabel: "Process",
    items: [
      { actionId: "process-main-claims", icon: "✦", title: "Main claims", description: "Bullet core claims from saved topic text.", tier: "live" },
      { actionId: "process-core-summary", icon: "✳", title: "Core summary", description: "Faithful short recap.", tier: "live" },
      { actionId: "process-topic-card", icon: "🃏", title: "Topic card", description: "Reusable writing topic card.", tier: "live" },
      { actionId: "process-writing-directions", icon: "✍", title: "Writing directions", description: "Concrete directions for drafting.", tier: "live" },
      { actionId: "process-write-article", icon: "📰", title: "Write article", description: "Online article shape.", tier: "live" },
      { actionId: "process-write-essay", icon: "📄", title: "Write essay", description: "~500-word arc.", tier: "live" },
      { actionId: "process-linkedin", icon: "💼", title: "LinkedIn post", description: "Hook and close for social.", tier: "live" },
      { actionId: "process-mendbook", icon: "📕", title: "Mendbook chapter", description: "Reflective chapter pacing.", tier: "live" },
      { actionId: "process-audiobook", icon: "🎧", title: "Audiobook script", description: "Cadence for listening.", tier: "live" },
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
      { actionId: "review-listen-source", icon: "🔊", title: "Listen to source", description: "TTS for captured source text.", tier: "live" },
      { actionId: "review-listen-draft", icon: "🔉", title: "Listen to draft", description: "Play essay draft audio.", tier: "live" },
      { actionId: "review-listen-final", icon: "🔈", title: "Listen to final", description: "Play saved final output.", tier: "live" },
      { actionId: "review-revise", icon: "🛠", title: "Revise", description: "Open listen-and-mark workflow.", tier: "live" },
      {
        actionId: "review-rewrite-selection",
        icon: "✎",
        title: "Rewrite selected part",
        description: "Continue from latest result.",
        tier: "live",
      },
      {
        actionId: "review-compare-versions",
        icon: "⇄",
        title: "Compare versions",
        description: "Side-by-side version review.",
        tier: "disabled",
      },
    ],
  },
  {
    id: "export",
    navLabel: "Export",
    items: [
      { actionId: "export-save-draft", icon: "💾", title: "Save draft", description: "Persist current essay draft.", tier: "live" },
      { actionId: "export-save-final", icon: "✓", title: "Save final", description: "Mark draft workflow outputs as final.", tier: "live" },
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
        title: "Audio script",
        description: "Audiobook-style script variant.",
        tier: "advanced",
      },
    ],
  },
  {
    id: "settings",
    navLabel: "Settings",
    items: [
      { actionId: "settings-ai-engine", icon: "🧠", title: "AI engine", description: "Model providers and comparison.", tier: "live" },
      { actionId: "settings-language", icon: "🌐", title: "Language", description: "Source and target language.", tier: "live" },
      { actionId: "settings-tone", icon: "🎚", title: "Tone", description: "Voice and tone presets.", tier: "live" },
      { actionId: "settings-output-style", icon: "◎", title: "Output style", description: "Formatting and output mode.", tier: "live" },
      { actionId: "settings-tts-voice", icon: "🗣", title: "TTS voice", description: "Read-aloud voice, speed, style.", tier: "live" },
      { actionId: "settings-project", icon: "📁", title: "Project save/load", description: "Local projects and duplicates.", tier: "live" },
    ],
  },
];
