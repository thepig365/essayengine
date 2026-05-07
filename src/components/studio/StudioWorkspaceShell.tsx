"use client";

import type { ReactNode } from "react";

type Props = {
  topicStrip: ReactNode;
  sourcePanel: ReactNode;
  sourceActions?: ReactNode;
  draftPanel: ReactNode;
  draftActions?: ReactNode;
  finalPanel: ReactNode;
  finalActions?: ReactNode;
};

/**
 * Spacious triptych for Phase 1 shell — layout only; parents supply content or placeholders.
 */
export function StudioWorkspaceShell({
  topicStrip,
  sourcePanel,
  sourceActions,
  draftPanel,
  draftActions,
  finalPanel,
  finalActions,
}: Props) {
  return (
    <section className="ee-studio-shell" aria-label="Main workspace">
      {topicStrip}
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
      <style jsx>{`
        .ee-studio-shell {
          margin-bottom: 28px;
        }
        .ee-studio-triptych {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.92fr);
          gap: 18px;
          align-items: start;
        }
        .ee-studio-col {
          border: 1px solid #ead8d0;
          border-radius: 20px;
          background: linear-gradient(180deg, #fffaf7, #f8ede9);
          padding: 18px 18px 22px;
          min-height: 280px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
          box-shadow: 0 18px 44px rgba(112, 55, 50, 0.08);
        }
        .ee-studio-heading {
          margin: 0;
          font-size: 13px;
          font-weight: 820;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #9d4f51;
        }
        .ee-studio-panel-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-top: auto;
        }
        @media (max-width: 1023px) {
          .ee-studio-triptych {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .ee-studio-col {
            min-height: 200px;
          }
        }
      `}</style>
    </section>
  );
}
