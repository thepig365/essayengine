"use client";

import { useEffect, useState } from "react";

const GUIDE_HIDE_KEY = "essayengine.hideGuideHint";

export function UserGuide() {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    try {
      setDontShowAgain(window.localStorage.getItem(GUIDE_HIDE_KEY) === "true");
    } catch {
      setDontShowAgain(false);
    }
  }, []);

  function toggleDontShowAgain(checked: boolean) {
    setDontShowAgain(checked);
    try {
      window.localStorage.setItem(GUIDE_HIDE_KEY, checked ? "true" : "false");
    } catch {
      // Preference is optional; the guide still works without storage.
    }
  }

  return (
    <>
      <button type="button" className="guide-button" onClick={() => setOpen(true)}>
        How it works
      </button>

      {open && (
        <div className="guide-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <aside
            className="guide-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="essay-engine-guide-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="guide-head">
              <div>
                <p>Guide</p>
                <h2 id="essay-engine-guide-title">Essay Engine Guide</h2>
              </div>
              <button type="button" className="close-button" onClick={() => setOpen(false)} aria-label="Close guide">
                Close
              </button>
            </header>

            <section>
              <h3>What is Essay Engine</h3>
              <p>
                Essay Engine helps you turn raw scripts, transcripts, notes, and generated outputs into a staged writing
                pipeline: curate content, transform it, assemble a draft, then finalize or listen.
              </p>
            </section>

            <section>
              <h3>Workflow</h3>
              <div className="flow-chart" aria-label="Essay Engine workflow">
                {["Raw Content", "Select & Filter", "Source", "Transform", "New Source Version", "Essay Draft", "Final Output", "Audio / Export"].map(
                  (item, index, list) => (
                    <div className="flow-item" key={item}>
                      <span>{item}</span>
                      {index < list.length - 1 && <strong aria-hidden="true">↓</strong>}
                    </div>
                  ),
                )}
              </div>
            </section>

            <section>
              <h3>Key Concepts</h3>
              <dl className="concepts">
                <div>
                  <dt>Transcript Workspace</dt>
                  <dd>Reusable raw material area. Select chapters, topic matches, or ranges before sending text forward.</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>The current engine input. Generate only uses the text inside Source.</dd>
                </div>
                <div>
                  <dt>Result → Source Loop</dt>
                  <dd>Promote a result into a new source version, then translate, paraphrase, rewrite, or summarize again.</dd>
                </div>
                <div>
                  <dt>Essay Draft Workspace</dt>
                  <dd>Your human writing and assembly area. It is not sent to the engine unless you choose Use draft as source.</dd>
                </div>
                <div>
                  <dt>Final</dt>
                  <dd>The approved article version used for final copy, audio, and export.</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3>Quick Start</h3>
              <ol>
                <li>Paste content or fetch a YouTube transcript.</li>
                <li>Select sections, topic matches, or ranges, then send them to Source.</li>
                <li>Generate, review the result, and continue as a new source or add useful parts to the draft.</li>
              </ol>
            </section>

            <section>
              <h3>Audio</h3>
              <p>
                Use the Listen panel to read the current Source, generated Result, Essay Draft, or Final Output. Long text
                is split into parts by the existing TTS flow, and the sticky mobile player keeps playback controls nearby.
              </p>
            </section>

            <label className="dont-show">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(event) => toggleDontShowAgain(event.target.checked)}
              />
              <span>Don’t show again</span>
            </label>
          </aside>
        </div>
      )}

      <style jsx>{`
        .guide-button {
          border: 1px solid #1d5f63;
          border-radius: 999px;
          background: #1d5f63;
          color: #ffffff;
          padding: 10px 14px;
          font: inherit;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 8px 18px rgba(29, 95, 99, 0.18);
        }
        .guide-button:hover {
          background: #174f52;
        }
        .guide-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          justify-content: flex-end;
          background: rgba(15, 23, 42, 0.38);
          padding: 18px;
        }
        .guide-panel {
          width: min(560px, 100%);
          max-height: calc(100vh - 36px);
          overflow: auto;
          border: 1px solid #dfe5ec;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 26px 70px rgba(15, 23, 42, 0.26);
          padding: 24px;
        }
        .guide-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid #edf2f6;
          padding-bottom: 16px;
          margin-bottom: 18px;
        }
        .guide-head p {
          margin: 0;
          color: #2f6f73;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        h2 {
          margin: 3px 0 0;
          color: #111827;
          font-size: 24px;
          line-height: 1.15;
        }
        .close-button {
          border: 1px solid #cfd8e3;
          border-radius: 999px;
          background: #f8fafc;
          color: #22303f;
          padding: 8px 12px;
          font: inherit;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
        }
        section {
          display: grid;
          gap: 8px;
          margin: 0 0 20px;
        }
        h3 {
          margin: 0;
          color: #17202a;
          font-size: 16px;
          line-height: 1.25;
        }
        p,
        li,
        dd {
          color: #526171;
          font-size: 14px;
          line-height: 1.55;
        }
        p {
          margin: 0;
        }
        .flow-chart {
          display: grid;
          gap: 6px;
          border: 1px solid #d8e8e6;
          border-radius: 14px;
          background: #f8fcfb;
          padding: 14px;
        }
        .flow-item {
          display: grid;
          place-items: center;
          gap: 6px;
          text-align: center;
        }
        .flow-item span {
          width: 100%;
          border: 1px solid #cfe3e1;
          border-radius: 999px;
          background: #ffffff;
          color: #174447;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 900;
        }
        .flow-item strong {
          color: #2f6f73;
          font-size: 18px;
          line-height: 1;
        }
        .concepts {
          display: grid;
          gap: 8px;
          margin: 0;
        }
        .concepts div {
          border: 1px solid #e3e9ef;
          border-radius: 10px;
          background: #fbfcfe;
          padding: 10px;
        }
        dt {
          color: #17202a;
          font-size: 13px;
          font-weight: 900;
        }
        dd {
          margin: 3px 0 0;
        }
        ol {
          margin: 0;
          padding-left: 20px;
        }
        .dont-show {
          display: flex;
          align-items: center;
          gap: 8px;
          border-top: 1px solid #edf2f6;
          padding-top: 14px;
          color: #526171;
          font-size: 13px;
          font-weight: 750;
        }
        .dont-show input {
          width: 16px;
          height: 16px;
        }
        @media (max-width: 640px) {
          .guide-backdrop {
            justify-content: center;
            padding: 10px;
          }
          .guide-panel {
            max-height: calc(100vh - 20px);
            border-radius: 14px;
            padding: 18px;
          }
          .guide-head {
            flex-direction: column;
          }
          .close-button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
