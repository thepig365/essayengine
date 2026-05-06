"use client";

import type { ReactNode } from "react";

type PanelProps = { children: ReactNode; className?: string; id?: string };

function definePanel(panel: string) {
  return function FeaturePanel({ children, className, id }: PanelProps) {
    return (
      <div id={id} data-essay-panel={panel} className={className} style={{ minWidth: 0, maxWidth: "100%" }}>
        {children}
      </div>
    );
  };
}

/** Left rail: engines, task, languages, run, TTS, projects (wrapped in EngineForm). */
export const EngineSelectionPanel = definePanel("engine-selection");
/** Center: transcript library and workspace (wrapped in EngineForm). */
export const TranscriptWorkspacePanel = definePanel("transcript-workspace");
/** Source summary, chips, engine input textarea, version timeline pairing (wrapped in EngineForm). */
export const SourceMaterialPanel = definePanel("source-material");
/** Capture inbox, link capture, voice note live inside `MobileWorkflowPanel` — this wraps that panel shell in EngineForm. */
export const VoiceNotePanel = definePanel("voice-note");
/** Workflow spine panels (MobileWorkflowPanel center + support rail). */
export const StructureBuilderPanel = definePanel("structure-builder");
/** Engine output cards, comparison tabs, promote/use actions (`OutputPanel` in `EngineForm`). */
export const ResultValidationPanel = definePanel("result-validation");
/** Essay Draft editor / human assembly surface (`EssayDraftWorkspace` in `EngineForm`). */
export const DraftGeneratorPanel = definePanel("draft-generator");
/** Listen + mark UX (audio strip + marking lives in MobileWorkflowPanel / audio panel). */
export const ListenAndMarkPanel = definePanel("listen-and-mark");
/** Revision request block inside MobileWorkflowPanel. */
export const RevisionRequestPanel = definePanel("revision-request");
/** Draft diagnosis / validation notes inside MobileWorkflowPanel. */
export const DiagnosticsPanel = definePanel("diagnostics");
/** Publish / repurpose: final article, export, audio (FinalPanel + polish/repurpose in workflow). */
export const EssayAssemblyPanel = definePanel("essay-assembly");
