"use client";

import type { ReactNode } from "react";
import {
  INSTRUCTION_PRESETS,
  MODES,
  PROVIDER_OPTIONS,
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  TASKS,
  TASK_ICONS,
  TONES,
} from "@/essay-engine/constants";
import type { EngineTask, LLMProvider, OutputMode } from "@/types/engine";
import type { ProcessingLayer, TopicMaterial } from "@/types/workflow";

/**
 * Stage 4: Processing — AI transforms over `TopicMaterial.content`.
 *
 * `variant="controls"` is mounted from EngineForm in the left aside when the workflow
 * step is not `refine`, and in the main `work-column` when the step is `refine` (Processing)
 * so the grouped Studio UI stays on the active Processing step without duplicating instances.
 *
 * Disabled until `TopicMaterial.content` exists. AI calls MUST send
 * TopicMaterial.content as input (never the raw original source) unless
 * `topicMaterial.useFullSource === true`.
 */
type Props = {
  children?: ReactNode;
  active?: boolean;
  topicMaterial?: TopicMaterial | null;
  layer?: ProcessingLayer;
  variant?: "shell" | "controls" | "desktopOverview";
  customInstruction?: string;
  onCustomInstructionChange?: (value: string) => void;
  canRunMaterialOutput?: boolean;
  materialAnalysisLoading?: boolean;
  materialAnalysisButtons?: ReadonlyArray<{ label: string; task: string }>;
  onRunMaterialAnalysisTask?: (task: string) => void;
  quickRequestButtons?: ReadonlyArray<{ label: string; task: EngineTask; instruction: string }>;
  onApplyQuickRequest?: (request: { label: string; task: EngineTask; instruction: string }) => void;
  providers?: LLMProvider[];
  comparisonActive?: boolean;
  onToggleProvider?: (provider: LLMProvider) => void;
  controlsCollapsed?: boolean;
  task?: EngineTask;
  onTaskChange?: (task: EngineTask) => void;
  activeTask?: { label: string; helper: string };
  showWritingPresetHint?: boolean;
  sourceLanguage?: string;
  onSourceLanguageChange?: (language: string) => void;
  targetLanguage?: string;
  onTargetLanguageChange?: (language: string) => void;
  outputMode?: OutputMode;
  onOutputModeChange?: (mode: OutputMode) => void;
  activeMode?: { label: string; helper: string };
  tone?: string;
  onToneChange?: (tone: string) => void;
  instructionPreset?: string;
  onInstructionPresetChange?: (preset: string) => void;
  sourceSummary?: string;
  generateBlocked?: boolean;
  loading?: boolean;
  canGenerate?: boolean;
  runLabel?: string;
  error?: string | null;
  onGenerate?: () => void;
  generateSectionRef?: (node: HTMLElement | null) => void;
  onOpenControlConsole?: () => void;
  onJumpToGenerate?: () => void;
  /** When true, omit grouped tool cards (shown in `FeatureSection` on desktop instead). */
  hideToolGrid?: boolean;
};

export const PROCESSING_LAYERS: ReadonlyArray<{ id: ProcessingLayer; label: string }> = [
  { id: "understanding", label: "Understanding" },
  { id: "topic_transform", label: "Topic Transform" },
  { id: "structure", label: "Structure" },
  { id: "creation", label: "Creation" },
  { id: "translation", label: "Translation" },
  { id: "style_revision", label: "Style Revision" },
];

type StudioCardSpec =
  | {
      kind: "material";
      materialLabel: string;
      title: string;
      blurb: string;
    }
  | {
      kind: "quick";
      quickLabel: string;
      title: string;
      blurb: string;
    }
  | {
      kind: "disabled";
      title: string;
      blurb: string;
      hint: string;
    };

type StudioGroupSpec = {
  id: string;
  heading: string;
  intro: string;
  icon: "eye" | "map" | "create" | "globe" | "spark";
  cards: StudioCardSpec[];
};

const STUDIO_GROUPS: StudioGroupSpec[] = [
  {
    id: "understand",
    heading: "UNDERSTAND",
    intro: "Pull structure, claims, and texture from the saved topic.",
    icon: "eye",
    cards: [
      {
        kind: "material",
        materialLabel: "Main claims",
        title: "Main claims",
        blurb: "Bullet the central claims using only what’s in the material.",
      },
      {
        kind: "material",
        materialLabel: "Core summary",
        title: "Core summary",
        blurb: "Short, faithful recap of the core content.",
      },
      {
        kind: "material",
        materialLabel: "Quotable lines",
        title: "Quotable lines",
        blurb: "Lines worth quoting, tied to passages.",
      },
      {
        kind: "material",
        materialLabel: "Emotional thread",
        title: "Emotional thread",
        blurb: "Tone and emotional cues grounded in the text.",
      },
    ],
  },
  {
    id: "turn-topic",
    heading: "TURN INTO TOPIC",
    intro: "Shape the material into angles, structure, and argument maps.",
    icon: "map",
    cards: [
      {
        kind: "material",
        materialLabel: "Topic card",
        title: "Topic card",
        blurb: "Reusable topic card: theme, angle, audience, bullets.",
      },
      {
        kind: "material",
        materialLabel: "Writing directions",
        title: "Writing directions",
        blurb: "Several concrete directions (title + one-line premise each).",
      },
      {
        kind: "material",
        materialLabel: "Story beats",
        title: "Story beats",
        blurb: "Narrative beats actually present in the source.",
      },
      {
        kind: "material",
        materialLabel: "Arguments / positions",
        title: "Arguments / positions",
        blurb: "Arguments and positions; facts vs inference.",
      },
    ],
  },
  {
    id: "create",
    heading: "CREATE",
    intro: "Draft new prose from the topic using the same pipelines as before.",
    icon: "create",
    cards: [
      {
        kind: "quick",
        quickLabel: "Write article",
        title: "Write article",
        blurb: "Clear article shaped for online reading.",
      },
      {
        kind: "quick",
        quickLabel: "Write 500-word essay",
        title: "Write essay",
        blurb: "~500-word essay with a coherent arc.",
      },
      {
        kind: "quick",
        quickLabel: "Turn into post",
        title: "LinkedIn post",
        blurb: "Concise social post — hook, body, reflective close.",
      },
      {
        kind: "quick",
        quickLabel: "Turn into Mendbook chapter",
        title: "Mendbook chapter",
        blurb: "Reflective Mendbook-style chapter pacing.",
      },
      {
        kind: "quick",
        quickLabel: "Turn into audiobook script",
        title: "Audiobook script",
        blurb: "Spoken cadence, short sentences, listenable transitions.",
      },
    ],
  },
  {
    id: "translate",
    heading: "TRANSLATE",
    intro: "Language transfer using the existing translate task where available.",
    icon: "globe",
    cards: [
      {
        kind: "quick",
        quickLabel: "Translate",
        title: "Translate",
        blurb: "Run translation with your current language settings.",
      },
      {
        kind: "disabled",
        title: "Faithful translation",
        blurb: "Strict, line-faithful rendering.",
        hint: "No separate pipeline yet — use Translate + Output behavior.",
      },
      {
        kind: "disabled",
        title: "Natural translation",
        blurb: "Idiomatic, reader-natural wording.",
        hint: "No separate pipeline yet — use Translate + tone presets.",
      },
      {
        kind: "disabled",
        title: "Literary / healing translation",
        blurb: "Softer, literary or therapeutic voice.",
        hint: "No separate pipeline yet — use Translate + tone / instruction preset.",
      },
    ],
  },
  {
    id: "rewrite",
    heading: "REWRITE",
    intro: "Style-focused rewrites — cards reserved until matching quick actions exist.",
    icon: "spark",
    cards: [
      {
        kind: "disabled",
        title: "More natural",
        blurb: "Smoother, more human rhythm.",
        hint: "No quick action wired — use Task + custom instructions.",
      },
      {
        kind: "disabled",
        title: "More gentle",
        blurb: "Softer, less sharp phrasing.",
        hint: "No quick action wired — use tone and presets.",
      },
      {
        kind: "disabled",
        title: "More literary",
        blurb: "Elevated prose and imagery.",
        hint: "No quick action wired — use instruction presets.",
      },
      {
        kind: "disabled",
        title: "Better for voiceover",
        blurb: "Breathing room for TTS and read-aloud.",
        hint: "No quick action wired — try Audiobook script in Create.",
      },
      {
        kind: "disabled",
        title: "Less AI-like",
        blurb: "Reduce generic model phrasing.",
        hint: "No quick action wired — use Task + Humanize hints.",
      },
    ],
  },
];

function StudioGroupIcon({ name }: { name: StudioGroupSpec["icon"] }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
  };
  const stroke = "#7fc7c2";
  switch (name) {
    case "eye":
      return (
        <svg {...common}>
          <path
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
            d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"
          />
          <circle cx="12" cy="12" r="3.25" stroke={stroke} strokeWidth="1.75" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 4 3 7v13l6-3 6 3 6-3V4l-6 3-6-3Z"
          />
        </svg>
      );
    case "create":
      return (
        <svg {...common}>
          <path
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"
          />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.75" />
          <path stroke={stroke} strokeWidth="1.75" d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
            d="m12 3 1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3ZM19 15l.7 2.1 2.1.7-2.1.7L19 21l-.7-2.1-2.1-.7 2.1-.7L19 15ZM5 14l.6 1.7 1.7.6-1.7.6L5 19l-.6-1.7-1.7-.6 1.7-.6L5 14Z"
          />
        </svg>
      );
  }
}

function collectMatchedLabels(): { material: Set<string>; quick: Set<string> } {
  const material = new Set<string>();
  const quick = new Set<string>();
  for (const g of STUDIO_GROUPS) {
    for (const c of g.cards) {
      if (c.kind === "material") material.add(c.materialLabel);
      if (c.kind === "quick") quick.add(c.quickLabel);
    }
  }
  return { material, quick };
}

export function ProcessingWorkspace({
  children,
  active = true,
  topicMaterial,
  layer,
  variant = "shell",
  customInstruction = "",
  onCustomInstructionChange,
  canRunMaterialOutput = false,
  materialAnalysisLoading = false,
  materialAnalysisButtons = [],
  onRunMaterialAnalysisTask,
  quickRequestButtons = [],
  onApplyQuickRequest,
  providers = [],
  comparisonActive = false,
  onToggleProvider,
  controlsCollapsed = false,
  task = "improve",
  onTaskChange,
  activeTask = TASKS.find((entry) => entry.value === task) ?? TASKS[0],
  showWritingPresetHint = false,
  sourceLanguage = "",
  onSourceLanguageChange,
  targetLanguage = "Chinese Simplified",
  onTargetLanguageChange,
  outputMode = "auto",
  onOutputModeChange,
  activeMode = MODES.find((entry) => entry.value === outputMode) ?? MODES[0],
  tone = "",
  onToneChange,
  instructionPreset = "",
  onInstructionPresetChange,
  sourceSummary = "",
  generateBlocked = false,
  loading = false,
  canGenerate = false,
  runLabel = "Generate Result",
  error,
  onGenerate,
  generateSectionRef,
  onOpenControlConsole,
  onJumpToGenerate,
  hideToolGrid = false,
}: Props) {
  const ready = Boolean(topicMaterial && (topicMaterial.content.trim() || topicMaterial.useFullSource));

  const { material: matchedMaterialLabels, quick: matchedQuickLabels } = collectMatchedLabels();

  const orphanMaterialButtons = materialAnalysisButtons.filter((b) => !matchedMaterialLabels.has(b.label));
  const orphanQuickButtons = quickRequestButtons.filter((b) => !matchedQuickLabels.has(b.label));

  const runStudioCard = (spec: StudioCardSpec) => {
    if (spec.kind === "material") {
      const def = materialAnalysisButtons.find((b) => b.label === spec.materialLabel);
      if (def) onRunMaterialAnalysisTask?.(def.task);
      return;
    }
    if (spec.kind === "quick") {
      const def = quickRequestButtons.find((b) => b.label === spec.quickLabel);
      if (def) onApplyQuickRequest?.(def);
    }
  };

  const cardDisabled = (spec: StudioCardSpec): boolean => {
    if (spec.kind === "disabled") return true;
    if (spec.kind === "material") {
      if (!canRunMaterialOutput || materialAnalysisLoading) return true;
      return !materialAnalysisButtons.some((b) => b.label === spec.materialLabel);
    }
    if (spec.kind === "quick") {
      if (!canRunMaterialOutput) return true;
      return !quickRequestButtons.some((b) => b.label === spec.quickLabel);
    }
    return true;
  };

  if (!active) return null;

  if (variant === "desktopOverview") {
    return (
      <section className="layer ee-request-workspace-desktop" aria-label="Processing workspace overview">
        <div className="layer-head">
          <p className="eyebrow">PROCESSING</p>
          <h2>Processing Studio</h2>
          <p>
            Choose grouped actions and settings in the <strong>Processing Studio</strong> on the left, then run <strong>Generate</strong>. Processing
            always uses your saved <strong>topic text</strong>.
          </p>
        </div>
        <div className="request-workspace-summary ee-current-setup-card">
          <strong>Current setup</strong>
          <p className="ee-current-setup-line">
            {activeTask.label} · {targetLanguage} · {providers.length === 0
              ? "No engine selected"
              : providers.map((p) => PROVIDER_OPTIONS.find((o) => o.value === p)?.label ?? p).join(", ")}
          </p>
          <ul className="ee-current-setup-list">
            <li>
              <span>Output style:</span> {activeMode.label}
            </li>
            <li>
              <span>Tone:</span> {TONES.find((t) => t.value === tone)?.label ?? tone}
            </li>
            <li>
              <span>Custom instruction:</span>{" "}
              {customInstruction.trim()
                ? customInstruction.trim().length > 160
                  ? `${customInstruction.trim().slice(0, 160)}…`
                  : customInstruction.trim()
                : "None"}
            </li>
          </ul>
        </div>
        <div className="request-workspace-actions">
          <button type="button" onClick={onOpenControlConsole}>
            Open Processing Studio
          </button>
          <button type="button" onClick={onJumpToGenerate}>
            Jump to Generate
          </button>
        </div>
      </section>
    );
  }

  if (variant === "controls") {
    return (
      <>
        <section className="layer request-layer ps-studio-root" aria-label="Processing studio">
          <header className="ps-studio-header">
            <p className="eyebrow">PROCESSING</p>
            <h2>Processing Studio</h2>
            <p className="ps-studio-lede">Choose how to transform the saved topic. Processing uses saved topic text only.</p>
          </header>

          {!hideToolGrid ? (
            <>
          <div className="ps-studio-groups">
            {STUDIO_GROUPS.map((group) => (
              <section key={group.id} className="ps-studio-group" aria-labelledby={`ps-group-${group.id}`}>
                <div className="ps-studio-group-head">
                  <span className="ps-studio-group-icon" aria-hidden>
                    <StudioGroupIcon name={group.icon} />
                  </span>
                  <div>
                    <h3 className="ps-studio-group-title" id={`ps-group-${group.id}`}>
                      {group.heading}
                    </h3>
                    <p className="ps-studio-group-intro">{group.intro}</p>
                  </div>
                </div>
                <div className="ps-studio-card-grid">
                  {group.cards.map((card) => {
                    const disabled = cardDisabled(card);
                    const isDisabledCard = card.kind === "disabled";
                    return (
                      <button
                        key={`${group.id}-${card.title}`}
                        type="button"
                        className={
                          isDisabledCard ? "ps-studio-card ps-studio-card--disabled" : "ps-studio-card" + (disabled ? " ps-studio-card--wait" : "")
                        }
                        disabled={disabled || isDisabledCard}
                        onClick={() => !isDisabledCard && runStudioCard(card)}
                        title={isDisabledCard ? card.hint : card.title}
                      >
                        <span className="ps-studio-card-title">{card.title}</span>
                        <span className="ps-studio-card-blurb">{isDisabledCard ? `${card.blurb} ${card.hint}` : card.blurb}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {(orphanMaterialButtons.length > 0 || orphanQuickButtons.length > 0) && (
            <details className="ps-studio-overflow">
              <summary>More shortcuts (same actions as before)</summary>
              <p className="transcript-note">
                Extra material analyses and requests that are not on the grid above — behavior unchanged.
              </p>
              <div className="request-quick-picks ee-quick-action-grid ps-studio-overflow-actions">
                {orphanMaterialButtons.map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    disabled={!canRunMaterialOutput || materialAnalysisLoading}
                    onClick={() => onRunMaterialAnalysisTask?.(b.task)}
                    title={b.label}
                  >
                    {b.label}
                  </button>
                ))}
                {orphanQuickButtons.map((def) => (
                  <button
                    key={def.label}
                    type="button"
                    disabled={!canRunMaterialOutput}
                    onClick={() => onApplyQuickRequest?.(def)}
                    title={def.label}
                  >
                    {def.label}
                  </button>
                ))}
              </div>
            </details>
          )}
            </>
          ) : null}

          <div className="ps-studio-custom-block">
            <label className="field">
              <span>How do you want to process this topic?</span>
              <textarea
                className="instruction"
                value={customInstruction}
                onChange={(e) => onCustomInstructionChange?.(e.target.value)}
                rows={4}
                placeholder="Example: Summarize key claims, rewrite as a reflective essay, translate to English, or tighten for spoken audio — all applied to your saved topic."
              />
            </label>
            <p className="transcript-note ps-studio-url-hint">
              Do not paste source URLs here — put URLs only under <strong>Source</strong> in Advanced Studio. The engine
              runs on <strong>saved topic content</strong>.
            </p>
          </div>
        </section>

        <details className="layer ps-settings-details" open={!hideToolGrid}>
          <summary className="ps-settings-summary">
            <span className="ps-settings-summary-main">AI engine &amp; task</span>
            <span className="ps-settings-summary-hint">Models, comparison, transformation task</span>
          </summary>
          <div className={comparisonActive ? "mode-badge comparison" : "mode-badge"}>
            {comparisonActive
              ? "Comparison mode active. Results will appear side-by-side in the Result / Validation workspace."
              : "Single engine mode. One result will be generated."}
          </div>
          <div className="engine-list">
            {PROVIDER_OPTIONS.map((p) => (
              <label key={p.value} className={providers.includes(p.value) ? "engine selected" : "engine"}>
                <input type="checkbox" checked={providers.includes(p.value)} onChange={() => onToggleProvider?.(p.value)} />
                <span>
                  <strong>{p.label}</strong>
                  <small>{p.note}</small>
                </span>
              </label>
            ))}
          </div>
          <section className="task-layer ps-settings-task">
            <div className="layer-head">
              <p className="eyebrow">Transformation task</p>
              <h2>Task</h2>
              <p>Choose what the engine should do with the saved topic.</p>
            </div>
            <div className="task-icon-bar" aria-label="Transformation task">
              {TASKS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={task === t.value ? "task-icon-button active" : "task-icon-button"}
                  onClick={() => onTaskChange?.(t.value)}
                  aria-label={t.label}
                  title={t.label}
                  data-tooltip={t.label}
                >
                  <span className="task-icon" aria-hidden="true">
                    {TASK_ICONS[t.value]}
                  </span>
                  {!controlsCollapsed && <span className="task-label">{t.label}</span>}
                </button>
              ))}
            </div>
            {!controlsCollapsed && (
              <div className="selected-description">
                <strong>{activeTask.label}</strong>
                <p>{activeTask.helper}</p>
              </div>
            )}
            {!controlsCollapsed && showWritingPresetHint && (
              <div className="writing-hint">
                For English human rewriting, use Humanize English or Author-style rewrite. For Chinese rewriting, use Natural Chinese rewrite.
              </div>
            )}
          </section>
        </details>

        <details className="layer ps-settings-details">
          <summary className="ps-settings-summary">
            <span className="ps-settings-summary-main">Language</span>
            <span className="ps-settings-summary-hint">Source &amp; target</span>
          </summary>
          <div className="field-grid">
            <label className="field">
              <span>Source Language</span>
              <select value={sourceLanguage} onChange={(e) => onSourceLanguageChange?.(e.target.value)}>
                {SOURCE_LANGUAGES.map((language) => (
                  <option key={language.label} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Target Language</span>
              <select value={targetLanguage} onChange={(e) => onTargetLanguageChange?.(e.target.value)}>
                {TARGET_LANGUAGES.map((language) => (
                  <option key={language.label} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="quick-picks" aria-label="Common target languages">
            <button type="button" onClick={() => onTargetLanguageChange?.("Chinese Simplified")}>
              Chinese Simplified
            </button>
            <button type="button" onClick={() => onTargetLanguageChange?.("English")}>
              English
            </button>
            <button type="button" onClick={() => onTargetLanguageChange?.("Chinese Traditional")}>
              Chinese Traditional
            </button>
          </div>
        </details>

        <details className="layer ps-settings-details">
          <summary className="ps-settings-summary">
            <span className="ps-settings-summary-main">Output style</span>
            <span className="ps-settings-summary-hint">Preserve vs reshape</span>
          </summary>
          <label className="field">
            <span>Output Behavior</span>
            <select value={outputMode} onChange={(e) => onOutputModeChange?.(e.target.value as OutputMode)}>
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
        </details>

        <details className="layer ps-settings-details">
          <summary className="ps-settings-summary">
            <span className="ps-settings-summary-main">Voice &amp; tone</span>
            <span className="ps-settings-summary-hint">Preset rules &amp; timbre</span>
          </summary>
          <div className="field-grid">
            <label className="field">
              <span>Tone</span>
              <select value={tone} onChange={(e) => onToneChange?.(e.target.value)}>
                {TONES.map((t) => (
                  <option key={t.label} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Instruction Preset</span>
              <select value={instructionPreset} onChange={(e) => onInstructionPresetChange?.(e.target.value)}>
                {INSTRUCTION_PRESETS.map((preset) => (
                  <option key={preset.label} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="writing-hint">
            Custom processing text and studio cards live above. Use tone and presets here for voice-level shaping.
          </div>
          <div className="writing-hint">
            For lyrical prose in Chinese, use “Modern Chinese lyrical prose”. It asks for an elegant, subtle, and delicate modern prose quality without directly imitating any specific writer.
          </div>
        </details>

        <section className="layer run-layer ps-generate-panel" ref={generateSectionRef}>
          <div className="layer-head">
            <p className="eyebrow">Generate</p>
            <h2>Run</h2>
            <p>Generate output from saved topic, engines, and settings above.</p>
          </div>
          <div className="ready-summary">
            <strong>Before Generate</strong>
            <p>{sourceSummary}</p>
            <ul>
              <li>
                {providers.length} engine{providers.length === 1 ? "" : "s"}
              </li>
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
          <button type="button" className="primary ps-generate-cta" onClick={onGenerate} disabled={loading || !canGenerate || generateBlocked}>
            {loading ? "Generating..." : runLabel}
          </button>
          {error && <p className="error">{error}</p>}
        </section>

        <style jsx>{`
          .ps-studio-root {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }
          .ps-studio-header {
            padding: 0.1rem 0 0.15rem;
          }
          .ps-studio-header h2 {
            margin: 0.2rem 0 0.35rem;
            font-size: 1.35rem;
            letter-spacing: -0.02em;
          }
          .ps-studio-lede {
            margin: 0;
            font-size: 0.95rem;
            line-height: 1.55;
            color: inherit;
            opacity: 0.92;
          }
          .ps-studio-groups {
            display: flex;
            flex-direction: column;
            gap: 1.35rem;
          }
          .ps-studio-group {
            border: 1px solid rgba(63, 143, 138, 0.22);
            border-radius: 14px;
            padding: 1rem 1.1rem 1.15rem;
            background: linear-gradient(165deg, rgba(22, 33, 43, 0.98), rgba(14, 22, 30, 0.92));
            box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
          }
          .ps-studio-group-head {
            display: flex;
            gap: 0.75rem;
            align-items: flex-start;
            margin-bottom: 0.85rem;
          }
          .ps-studio-group-icon {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: rgba(63, 143, 138, 0.12);
            border: 1px solid rgba(63, 143, 138, 0.25);
          }
          .ps-studio-group-title {
            margin: 0;
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #9aa8ba;
          }
          .ps-studio-group-intro {
            margin: 0.2rem 0 0;
            font-size: 0.82rem;
            line-height: 1.45;
            color: #8c9aac;
          }
          .ps-studio-card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
            gap: 10px;
          }
          @media (max-width: 520px) {
            .ps-studio-card-grid {
              grid-template-columns: 1fr;
            }
          }
          .ps-studio-card {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
            gap: 0.35rem;
            min-height: 78px;
            padding: 0.75rem 0.85rem;
            border-radius: 12px;
            border: 1px solid rgba(148, 163, 184, 0.18);
            background: rgba(15, 23, 32, 0.85);
            color: #e6edf3;
            cursor: pointer;
            font: inherit;
            transition:
              border-color 0.15s ease,
              background 0.15s ease,
              box-shadow 0.15s ease;
          }
          .ps-studio-card:hover:not(:disabled) {
            border-color: rgba(95, 168, 166, 0.45);
            background: rgba(30, 58, 58, 0.35);
            box-shadow: 0 0 0 1px rgba(95, 168, 166, 0.12);
          }
          .ps-studio-card--wait:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .ps-studio-card--disabled {
            opacity: 0.42;
            cursor: not-allowed;
            border-style: dashed;
          }
          .ps-studio-card-title {
            font-size: 0.9rem;
            font-weight: 750;
            letter-spacing: -0.01em;
          }
          .ps-studio-card-blurb {
            font-size: 0.75rem;
            line-height: 1.4;
            color: #94a3b8;
          }
          .ps-studio-overflow {
            border: 1px dashed rgba(148, 163, 184, 0.22);
            border-radius: 12px;
            padding: 0.65rem 0.85rem;
            background: rgba(10, 15, 22, 0.45);
          }
          .ps-studio-overflow summary {
            cursor: pointer;
            font-weight: 700;
            font-size: 0.88rem;
          }
          .ps-studio-overflow-actions {
            margin-top: 0.65rem;
          }
          .ps-studio-custom-block {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            padding-top: 0.15rem;
          }
          .ps-studio-url-hint {
            margin: 0;
          }
          .ps-settings-details {
            border-radius: 14px;
            overflow: hidden;
          }
          .ps-settings-summary {
            list-style: none;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.15rem;
            cursor: pointer;
            padding: 0.35rem 0;
            font: inherit;
          }
          .ps-settings-summary::-webkit-details-marker {
            display: none;
          }
          .ps-settings-summary-main {
            font-weight: 800;
            font-size: 0.95rem;
            letter-spacing: -0.01em;
          }
          .ps-settings-summary-hint {
            font-size: 0.78rem;
            color: #8c9aac;
            font-weight: 600;
          }
          .ps-settings-details[open] .ps-settings-summary {
            margin-bottom: 0.65rem;
            border-bottom: 1px solid rgba(63, 143, 138, 0.15);
            padding-bottom: 0.65rem;
          }
          .ps-settings-task {
            padding: 0;
            margin: 0;
            border: none;
            background: transparent;
            box-shadow: none;
          }
          .ps-settings-task .layer-head {
            padding-top: 0.25rem;
          }
          .ps-generate-panel {
            border-width: 1.5px;
            border-color: rgba(95, 168, 166, 0.35);
            box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
          }
          .ps-generate-cta {
            width: 100%;
            margin-top: 0.65rem;
            padding: 0.95rem 1.1rem;
            font-size: 1.05rem;
            font-weight: 800;
            border-radius: 12px;
          }
        `}</style>

        <style jsx global>{`
          .control-column.collapsed .layer {
            padding: 14px;
          }
          .control-column.collapsed .task-layer .layer-head p:not(.eyebrow),
          .control-column.collapsed .task-layer .layer-head h2 {
            display: none;
          }
          .control-column.collapsed .task-icon-button {
            justify-content: center;
            padding: 8px;
          }
        `}</style>
      </>
    );
  }

  return (
    <section
      className="processing-workspace"
      data-stage="processing"
      data-processing-ready={ready ? "true" : "false"}
      data-processing-layer={layer}
      hidden={!active}
      aria-label="Processing — apply AI layers"
      aria-disabled={!ready || undefined}
    >
      {children}
    </section>
  );
}
