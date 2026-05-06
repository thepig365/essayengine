"use client";

import type { EngineTask } from "@/types/engine";

export type FeatureMaterialAnalysisDef = { label: string; task: string };
export type FeatureQuickRequestDef = { label: string; task: EngineTask; instruction: string };

type Props = {
  /** Desktop-only strip; hidden on narrow layouts via CSS. */
  variant?: "desktop" | "hidden";
  canRunMaterialOutput: boolean;
  materialAnalysisLoading: boolean;
  materialAnalysisButtons: ReadonlyArray<FeatureMaterialAnalysisDef>;
  onRunMaterialAnalysisTask: (task: string) => void;
  quickRequestButtons: ReadonlyArray<FeatureQuickRequestDef>;
  onApplyQuickRequest: (def: FeatureQuickRequestDef) => void;
  onScrollToTranscript: () => void;
  onScrollToTimeRange: () => void;
  onRunTopicFilter: () => void;
  listenSourceDisabled: boolean;
  listenDraftDisabled: boolean;
  listenFinalDisabled: boolean;
  onListenSource: () => void;
  onListenDraft: () => void;
  onListenFinal: () => void;
  markIssueDisabled: boolean;
  onMarkIssue: () => void;
  rewriteSelectionDisabled: boolean;
  onRewriteSelection: () => void;
  onSaveDraft: () => void;
  onSaveFinal: () => void;
  saveFinalDisabled: boolean;
  onCopyDraft: () => void;
  onDownloadDraft: () => void;
};

type CardSpec =
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
  | { kind: "action"; title: string; blurb: string; onClick: () => void; disabled?: boolean }
  | { kind: "disabled"; title: string; blurb: string; hint: string };

type Group = { id: string; heading: string; intro: string; cards: CardSpec[] };

function cardDisabled(
  spec: CardSpec,
  canRun: boolean,
  materialLoading: boolean,
  materialLabels: Set<string>,
  quickLabels: Set<string>,
): boolean {
  if (spec.kind === "disabled") return true;
  if (spec.kind === "action") return Boolean(spec.disabled);
  if (spec.kind === "material") {
    if (!canRun || materialLoading) return true;
    return !materialLabels.has(spec.materialLabel);
  }
  if (spec.kind === "quick") {
    if (!canRun) return true;
    return !quickLabels.has(spec.quickLabel);
  }
  return true;
}

export function FeatureSection({
  variant = "desktop",
  canRunMaterialOutput,
  materialAnalysisLoading,
  materialAnalysisButtons,
  onRunMaterialAnalysisTask,
  quickRequestButtons,
  onApplyQuickRequest,
  onScrollToTranscript,
  onScrollToTimeRange,
  onRunTopicFilter,
  listenSourceDisabled,
  listenDraftDisabled,
  listenFinalDisabled,
  onListenSource,
  onListenDraft,
  onListenFinal,
  markIssueDisabled,
  onMarkIssue,
  rewriteSelectionDisabled,
  onRewriteSelection,
  onSaveDraft,
  onSaveFinal,
  saveFinalDisabled,
  onCopyDraft,
  onDownloadDraft,
}: Props) {
  if (variant === "hidden") return null;

  const materialLabels = new Set(materialAnalysisButtons.map((b) => b.label));
  const quickLabels = new Set(quickRequestButtons.map((b) => b.label));

  const groups: Group[] = [
    {
      id: "understand",
      heading: "UNDERSTAND",
      intro: "Clarify what the saved selection is saying.",
      cards: [
        { kind: "material", materialLabel: "Main claims", title: "Main claims", blurb: "Bullet the core claims from the material." },
        { kind: "material", materialLabel: "Core summary", title: "Core summary", blurb: "Faithful short recap." },
        { kind: "material", materialLabel: "Emotional thread", title: "Emotional thread", blurb: "Tone and feeling grounded in text." },
        { kind: "material", materialLabel: "Quotable lines", title: "Quotable lines", blurb: "Lines worth quoting with traceability." },
      ],
    },
    {
      id: "extract",
      heading: "EXTRACT",
      intro: "Navigate extraction; run structure-oriented pulls.",
      cards: [
        {
          kind: "action",
          title: "Select transcript",
          blurb: "Jump to the transcript / blocks viewer.",
          onClick: onScrollToTranscript,
        },
        {
          kind: "action",
          title: "Time range",
          blurb: "Scroll to timestamp / range tools.",
          onClick: onScrollToTimeRange,
        },
        {
          kind: "action",
          title: "Topic filter",
          blurb: "Run topic section finder in the extractor.",
          onClick: onRunTopicFilter,
          disabled: false,
        },
        { kind: "material", materialLabel: "Story beats", title: "Story beats", blurb: "Narrative beats present in the source." },
        { kind: "material", materialLabel: "Examples & cases", title: "Examples & cases", blurb: "Concrete examples only if present." },
      ],
    },
    {
      id: "create",
      heading: "CREATE",
      intro: "Draft new prose from your saved topic.",
      cards: [
        { kind: "quick", quickLabel: "Write article", title: "Write article", blurb: "Online article shape." },
        { kind: "quick", quickLabel: "Write 500-word essay", title: "Write essay", blurb: "~500-word arc." },
        { kind: "quick", quickLabel: "Turn into post", title: "LinkedIn post", blurb: "Hook + close, social length." },
        { kind: "quick", quickLabel: "Turn into Mendbook chapter", title: "Mendbook chapter", blurb: "Reflective chapter pacing." },
        { kind: "quick", quickLabel: "Turn into audiobook script", title: "Audiobook script", blurb: "Cadence for listening." },
      ],
    },
    {
      id: "translate",
      heading: "TRANSLATE",
      intro: "Language transfer (single pipeline today).",
      cards: [
        { kind: "quick", quickLabel: "Translate", title: "Translate", blurb: "Use current language settings." },
        {
          kind: "disabled",
          title: "Faithful translation",
          blurb: "Line-faithful rendering.",
          hint: "Use Translate + output style.",
        },
        {
          kind: "disabled",
          title: "Natural translation",
          blurb: "Idiomatic target language.",
          hint: "Use Translate + tone.",
        },
        {
          kind: "disabled",
          title: "Literary / healing translation",
          blurb: "Softer literary voice.",
          hint: "Use Translate + instruction preset.",
        },
        {
          kind: "disabled",
          title: "Compare translations",
          blurb: "Side-by-side variants.",
          hint: "Coming later.",
        },
      ],
    },
    {
      id: "rewrite",
      heading: "REWRITE",
      intro: "Style passes — wire when quick actions exist.",
      cards: [
        { kind: "disabled", title: "More natural", blurb: "Smoother rhythm.", hint: "Coming later." },
        { kind: "disabled", title: "More gentle", blurb: "Softer phrasing.", hint: "Coming later." },
        { kind: "disabled", title: "More literary", blurb: "Elevated prose.", hint: "Coming later." },
        { kind: "disabled", title: "Better for voiceover", blurb: "Breathing room for TTS.", hint: "Try Audiobook script in Create." },
        { kind: "disabled", title: "Less AI-like", blurb: "Reduce generic model tone.", hint: "Coming later." },
      ],
    },
    {
      id: "listen",
      heading: "LISTEN & REVIEW",
      intro: "Hear and mark without leaving the flow.",
      cards: [
        {
          kind: "action",
          title: "Listen to source",
          blurb: "TTS for captured source text.",
          onClick: onListenSource,
          disabled: listenSourceDisabled,
        },
        {
          kind: "action",
          title: "Listen to draft",
          blurb: "Play essay draft audio.",
          onClick: onListenDraft,
          disabled: listenDraftDisabled,
        },
        {
          kind: "action",
          title: "Listen to final",
          blurb: "Play final article if set.",
          onClick: onListenFinal,
          disabled: listenFinalDisabled,
        },
        {
          kind: "action",
          title: "Mark issue",
          blurb: "Open listen & mark draft mode.",
          onClick: onMarkIssue,
          disabled: markIssueDisabled,
        },
        {
          kind: "action",
          title: "Rewrite selected part",
          blurb: "Continue from latest result context.",
          onClick: onRewriteSelection,
          disabled: rewriteSelectionDisabled,
        },
      ],
    },
    {
      id: "export",
      heading: "EXPORT",
      intro: "Persist and copy artifacts.",
      cards: [
        { kind: "action", title: "Save draft", blurb: "Persist essay draft.", onClick: onSaveDraft },
        {
          kind: "action",
          title: "Save final",
          blurb: "Use workflow save final where available.",
          onClick: onSaveFinal,
          disabled: saveFinalDisabled,
        },
        { kind: "action", title: "Copy", blurb: "Copy draft to clipboard.", onClick: onCopyDraft },
        { kind: "action", title: "Download", blurb: "Download draft .txt.", onClick: onDownloadDraft },
      ],
    },
  ];

  const runCard = (spec: CardSpec) => {
    if (spec.kind === "material") {
      const d = materialAnalysisButtons.find((b) => b.label === spec.materialLabel);
      if (d) onRunMaterialAnalysisTask(d.task);
      return;
    }
    if (spec.kind === "quick") {
      const d = quickRequestButtons.find((b) => b.label === spec.quickLabel);
      if (d) onApplyQuickRequest(d);
      return;
    }
    if (spec.kind === "action") {
      spec.onClick();
    }
  };

  return (
    <section className="ee-feature-section" aria-label="Feature tools">
      <header className="ee-feature-head">
        <p className="eyebrow">TOOLS</p>
        <h2>Feature menu</h2>
        <p className="ee-feature-sub">Grouped actions — same engine behavior as before.</p>
      </header>
      <div className="ee-feature-groups">
        {groups.map((g) => (
          <div key={g.id} className="ee-feature-group">
            <h3 className="ee-feature-group-title">{g.heading}</h3>
            <p className="ee-feature-group-intro">{g.intro}</p>
            <div className="ee-feature-cards">
              {g.cards.map((c) => {
                const dis = cardDisabled(c, canRunMaterialOutput, materialAnalysisLoading, materialLabels, quickLabels);
                const isDis = c.kind === "disabled";
                return (
                  <button
                    key={`${g.id}-${c.title}`}
                    type="button"
                    className={
                      isDis ? "ee-feature-card ee-feature-card--disabled" : "ee-feature-card" + (dis ? " ee-feature-card--muted" : "")
                    }
                    disabled={dis || isDis}
                    onClick={() => !isDis && !dis && runCard(c)}
                    title={isDis ? c.hint : c.title}
                  >
                    <span className="ee-feature-card-title">{c.title}</span>
                    <span className="ee-feature-card-blurb">
                      {isDis ? `${c.blurb} — ${c.hint}` : c.blurb}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .ee-feature-section {
          display: none;
          flex-direction: column;
          gap: 1rem;
          padding: 0 0 0.75rem;
          border-bottom: 1px solid rgba(63, 143, 138, 0.2);
          margin-bottom: 0.25rem;
        }
        :global(.workspace.ee-desktop-triptych:not(.ee-narrow)) .ee-feature-section {
          display: flex;
          grid-column: 1 / -1;
        }
        .ee-feature-head h2 {
          margin: 0.15rem 0 0.2rem;
          font-size: 1.15rem;
        }
        .ee-feature-sub {
          margin: 0;
          font-size: 0.82rem;
          opacity: 0.85;
        }
        .ee-feature-groups {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 0.75rem 1rem;
        }
        .ee-feature-group {
          border: 1px solid rgba(100, 116, 139, 0.25);
          border-radius: 12px;
          padding: 0.65rem 0.75rem;
          background: rgba(15, 23, 32, 0.65);
        }
        .ee-feature-group-title {
          margin: 0;
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          font-weight: 800;
          color: #94a3b8;
        }
        .ee-feature-group-intro {
          margin: 0.25rem 0 0.5rem;
          font-size: 0.74rem;
          color: #7b8a9c;
          line-height: 1.35;
        }
        .ee-feature-cards {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ee-feature-card {
          text-align: left;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(8, 12, 18, 0.55);
          color: #e2e8f0;
          padding: 0.5rem 0.6rem;
          cursor: pointer;
          font: inherit;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .ee-feature-card:hover:not(:disabled) {
          border-color: rgba(95, 168, 166, 0.45);
          background: rgba(30, 58, 58, 0.25);
        }
        .ee-feature-card--muted:disabled {
          opacity: 0.45;
        }
        .ee-feature-card--disabled {
          opacity: 0.4;
          cursor: not-allowed;
          border-style: dashed;
        }
        .ee-feature-card-title {
          display: block;
          font-weight: 750;
          font-size: 0.82rem;
        }
        .ee-feature-card-blurb {
          display: block;
          font-size: 0.7rem;
          color: #94a3b8;
          line-height: 1.35;
          margin-top: 0.15rem;
        }
      `}</style>
    </section>
  );
}
