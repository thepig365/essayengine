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
          <div className="ee-studio-col-head">
            <span className="ee-studio-step">1</span>
            <h2 className="ee-studio-heading">Source</h2>
          </div>
          {sourcePanel}
          {sourceActions ? <div className="ee-studio-panel-actions">{sourceActions}</div> : null}
        </div>
        <div className="ee-studio-col ee-studio-col--draft">
          <div className="ee-studio-col-head">
            <span className="ee-studio-step">2</span>
            <h2 className="ee-studio-heading">Draft / Semi-product</h2>
          </div>
          {draftPanel}
          {draftActions ? <div className="ee-studio-panel-actions">{draftActions}</div> : null}
        </div>
        <div className="ee-studio-col ee-studio-col--final">
          <div className="ee-studio-col-head">
            <span className="ee-studio-step">3</span>
            <h2 className="ee-studio-heading">Final / Review</h2>
          </div>
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
        .ee-studio-col-head {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .ee-studio-step {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 1px solid rgba(125, 211, 192, 0.45);
          background: rgba(30, 58, 58, 0.5);
          color: #ccfbf1;
          font-size: 13px;
          font-weight: 900;
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
          .ee-studio-shell {
            margin-bottom: 16px;
          }
          .ee-studio-triptych {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .ee-studio-col {
            min-height: 0;
            padding: 16px;
            border-radius: 15px;
          }
          .ee-studio-heading {
            font-size: 14px;
            line-height: 1.25;
          }
        }
      `}</style>
    </section>
  );
}
