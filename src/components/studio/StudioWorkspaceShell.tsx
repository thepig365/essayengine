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
        }
      `}</style>
    </section>
  );
}
