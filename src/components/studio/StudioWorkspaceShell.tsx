"use client";

import type { ReactNode } from "react";

type StepPanel = {
  id: string;
  label: string;
  title: string;
  description: string;
  content: ReactNode;
};

type Props = {
  topicStrip: ReactNode;
  sourcePanel: ReactNode;
  sourceActions?: ReactNode;
  draftPanel: ReactNode;
  draftActions?: ReactNode;
  finalPanel: ReactNode;
  finalActions?: ReactNode;
  activeStepIndex?: number;
  stepPanels?: StepPanel[];
};

/**
 * Main workflow shell. When step panels are supplied, normal CTAs land on one
 * clean workflow screen instead of opening the full Advanced Studio cockpit.
 */
export function StudioWorkspaceShell({
  topicStrip,
  sourcePanel,
  sourceActions,
  draftPanel,
  draftActions,
  finalPanel,
  finalActions,
  activeStepIndex = 0,
  stepPanels,
}: Props) {
  const activePanel = stepPanels?.[activeStepIndex] ?? stepPanels?.[0];

  return (
    <section className="ee-studio-shell" id="ee-main-workflow" aria-label="Main workspace">
      {topicStrip}
      {activePanel ? (
        <div className="ee-workflow-step-screen" id="ee-active-workspace" data-step-id={activePanel.id}>
          <div className="ee-workflow-step-head">
            <p className="ee-studio-heading">{activePanel.label}</p>
            <h2>{activePanel.title}</h2>
            <p>{activePanel.description}</p>
          </div>
          <div className="ee-workflow-step-body">{activePanel.content}</div>
        </div>
      ) : (
        <div className="ee-studio-triptych">
          <div className="ee-studio-col ee-studio-col--source">
            <h2 className="ee-studio-heading">Source</h2>
            {sourcePanel}
            {sourceActions ? <div className="ee-studio-panel-actions">{sourceActions}</div> : null}
          </div>
          <div className="ee-studio-col ee-studio-col--draft">
            <h2 className="ee-studio-heading">Draft</h2>
            {draftPanel}
            {draftActions ? <div className="ee-studio-panel-actions">{draftActions}</div> : null}
          </div>
          <div className="ee-studio-col ee-studio-col--final">
            <h2 className="ee-studio-heading">Final</h2>
            {finalPanel}
            {finalActions ? <div className="ee-studio-panel-actions">{finalActions}</div> : null}
          </div>
        </div>
      )}
      <style jsx>{`
        .ee-studio-shell {
          margin-bottom: 28px;
        }
        .ee-workflow-step-screen {
          border: 1px solid #2c3d4e;
          border-radius: 18px;
          background: rgba(14, 20, 28, 0.72);
          box-shadow: 0 22px 54px rgba(0, 0, 0, 0.25);
          padding: 20px;
          color: #dbe7ef;
        }
        .ee-workflow-step-head {
          margin-bottom: 16px;
          max-width: 860px;
        }
        .ee-workflow-step-head h2 {
          margin: 4px 0 6px;
          color: #f8fafc;
          font-size: clamp(1.35rem, 2vw, 2rem);
          letter-spacing: -0.03em;
        }
        .ee-workflow-step-head p:not(.ee-studio-heading) {
          margin: 0;
          color: #9fb0c2;
          line-height: 1.55;
        }
        .ee-workflow-step-body {
          display: grid;
          gap: 16px;
        }
        .ee-workflow-step-body :global(.layer),
        .ee-workflow-step-body :global(.topic-material-panel) {
          box-shadow: none;
        }
        .ee-workflow-step-body :global(.ee-clean-step-grid) {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 0.7fr);
          gap: 16px;
          align-items: start;
        }
        .ee-workflow-step-body :global(.ee-clean-card) {
          border: 1px solid #dfe5ec;
          border-radius: 12px;
          background: #ffffff;
          color: #17202a;
          padding: 18px;
        }
        .ee-workflow-step-body :global(.ee-clean-card h3) {
          margin: 0 0 6px;
          color: #17202a;
        }
        .ee-workflow-step-body :global(.ee-clean-muted) {
          margin: 0 0 12px;
          color: #617080;
          line-height: 1.45;
          font-size: 13px;
        }
        .ee-workflow-step-body :global(.ee-clean-two-col) {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 0.6fr);
          gap: 16px;
        }
        .ee-workflow-step-body :global(.ee-clean-metrics) {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin: 0 0 12px;
        }
        .ee-workflow-step-body :global(.ee-clean-metrics div) {
          border: 1px solid #e3e9ef;
          border-radius: 8px;
          background: #f8fafc;
          padding: 8px;
        }
        .ee-workflow-step-body :global(.ee-clean-metrics dt) {
          color: #617080;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .ee-workflow-step-body :global(.ee-clean-metrics dd) {
          margin: 2px 0 0;
          font-weight: 760;
          overflow-wrap: anywhere;
        }
        .ee-workflow-step-body :global(.ee-clean-preview) {
          min-height: 160px;
          max-height: 420px;
          overflow: auto;
          white-space: pre-wrap;
          border: 1px solid #e3e9ef;
          border-radius: 10px;
          background: #f8fafc;
          color: #22303f;
          padding: 12px;
          font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .ee-workflow-step-body :global(.ee-clean-preview--large) {
          min-height: 420px;
        }
        .ee-workflow-step-body :global(.ee-clean-actions) {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .ee-studio-triptych {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
          gap: 18px;
          align-items: stretch;
        }
        .ee-studio-col {
          border: 1px solid #2c3d4e;
          border-radius: 16px;
          background: rgba(14, 20, 28, 0.65);
          padding: 18px 18px 22px;
          min-height: 280px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }
        .ee-studio-heading {
          margin: 0;
          font-size: 13px;
          font-weight: 820;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #7dd3c0;
        }
        @media (max-width: 1023px) {
          .ee-studio-triptych {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .ee-studio-col {
            min-height: 200px;
          }
          .ee-workflow-step-screen {
            padding: 14px;
          }
          .ee-workflow-step-body :global(.ee-clean-step-grid),
          .ee-workflow-step-body :global(.ee-clean-two-col) {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
