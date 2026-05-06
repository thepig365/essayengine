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
};

export const PROCESSING_LAYERS: ReadonlyArray<{ id: ProcessingLayer; label: string }> = [
  { id: "understanding", label: "Understanding" },
  { id: "topic_transform", label: "Topic Transform" },
  { id: "structure", label: "Structure" },
  { id: "creation", label: "Creation" },
  { id: "translation", label: "Translation" },
  { id: "style_revision", label: "Style Revision" },
];

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
}: Props) {
  const ready = Boolean(topicMaterial && (topicMaterial.content.trim() || topicMaterial.useFullSource));

  if (!active) return null;

  if (variant === "desktopOverview") {
    return (
      <section className="layer ee-request-workspace-desktop" aria-label="Processing workspace overview">
        <div className="layer-head">
          <p className="eyebrow">Processing / 加工</p>
          <h2>Processing workspace</h2>
          <p>
            After you save <strong>TopicMaterial</strong>, use the <strong>Control Console</strong> (left) to describe how to process it:
            custom processing text, quick actions, engines, task, languages, output behavior, and tone. Then run <strong>Generate</strong>.
          </p>
        </div>
        <div className="request-workspace-summary">
          <strong>Current setup (read-only)</strong>
          <dl>
            <div>
              <dt>Task</dt>
              <dd>{activeTask.label}</dd>
            </div>
            <div>
              <dt>Engines</dt>
              <dd>
                {providers.length === 0
                  ? "None selected"
                  : providers.map((p) => PROVIDER_OPTIONS.find((o) => o.value === p)?.label ?? p).join(", ")}
              </dd>
            </div>
            <div>
              <dt>Target language</dt>
              <dd>{targetLanguage}</dd>
            </div>
            <div>
              <dt>Output behavior</dt>
              <dd>{activeMode.label}</dd>
            </div>
            <div>
              <dt>Tone</dt>
              <dd>{TONES.find((t) => t.value === tone)?.label ?? tone}</dd>
            </div>
            <div>
              <dt>Custom request</dt>
              <dd>
                {customInstruction.trim()
                  ? customInstruction.trim().length > 220
                    ? `${customInstruction.trim().slice(0, 220)}…`
                    : customInstruction.trim()
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="request-workspace-actions">
          <button type="button" onClick={onOpenControlConsole}>
            Open Control Console
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
        <section className="layer request-layer">
          <div className="layer-head">
            <p className="eyebrow">Processing / 加工</p>
            <h2>How do you want to process this TopicMaterial?</h2>
            <p>
              Use this area after <strong>TopicMaterial</strong> is saved. Do not paste source URLs here — put URLs only under{" "}
              <strong>Material</strong>. The engine runs on saved <strong>TopicMaterial.content</strong>, not on ad-hoc selection text.
            </p>
          </div>
          <p className="transcript-note">
            Save a topic first, then choose processing instructions and run Generate. / 请先保存题材，再填写加工说明并生成。
          </p>
          <label className="field">
            <span>Processing instructions / 加工说明</span>
            <textarea
              className="instruction"
              value={customInstruction}
              onChange={(e) => onCustomInstructionChange?.(e.target.value)}
              rows={4}
              placeholder="Example: Summarize key claims, rewrite as a reflective essay, translate to English, or tighten for spoken audio — all applied to your saved TopicMaterial."
            />
          </label>
          <div className="request-quick-picks ee-quick-action-grid" aria-label="Quick processing actions">
            {materialAnalysisButtons.map((b) => (
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
            {quickRequestButtons.map((def) => (
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
        </section>

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
                <input type="checkbox" checked={providers.includes(p.value)} onChange={() => onToggleProvider?.(p.value)} />
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

        <section className="layer">
          <div className="layer-head">
            <p className="eyebrow">4. Language Layer</p>
            <h2>Language direction</h2>
            <p>Use controlled language choices for predictable translation and rewriting.</p>
          </div>
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
        </section>

        <section className="layer">
          <div className="layer-head">
            <p className="eyebrow">5. Output Behavior Layer</p>
            <h2>Output behavior</h2>
            <p>Choose how strictly the result should preserve or reshape the source.</p>
          </div>
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
            Custom processing text and quick picks live in the Processing block above. Use tone and presets here for voice-level shaping.
          </div>
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
          <button type="button" className="primary" onClick={onGenerate} disabled={loading || !canGenerate || generateBlocked}>
            {loading ? "Generating..." : runLabel}
          </button>
          {error && <p className="error">{error}</p>}
        </section>

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
