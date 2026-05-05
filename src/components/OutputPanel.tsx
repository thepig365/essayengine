"use client";

import { useEffect, useState } from "react";
import { DESKTOP_MIN } from "@/essay-engine/breakpoints";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { FinalResultSelection } from "@/lib/projectStorage";
import type { EngineResponse, EngineTask, LLMProvider, ProviderResult } from "@/types/engine";

const PROVIDER_LABEL: Record<string, string> = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
  qwen: "Qwen",
};

type Props = {
  result: EngineResponse | null;
  task: EngineTask;
  selectedProviders: LLMProvider[];
  onReplaceResultSource: (output: string) => void;
  onAddResultToSource: (output: string) => void;
  onContinueResult: (output: string, task: EngineTask) => void;
  onReadResult: (output: string) => void;
  onAddResultToDraft: (output: string) => void;
  onReplaceDraftWithResult: (output: string) => void;
  onMarkFinal: (output: string, provider?: LLMProvider, providerLabel?: string) => void;
  finalResult: FinalResultSelection | null;
  resultStep: number;
};

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function providerLabel(provider: string): string {
  return PROVIDER_LABEL[provider] ?? provider;
}

function formatLatency(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function looksStiff(text: string): boolean {
  const sentences = text.split(/[.!?。！？]+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return false;
  const avgWords = sentences.reduce((sum, sentence) => sum + sentence.split(/\s+/).filter(Boolean).length, 0) / sentences.length;
  const starts = sentences.map((sentence) => sentence.split(/\s+/).slice(0, 2).join(" ").toLowerCase());
  const repeatedStarts = new Set(starts).size < starts.length;
  return avgWords > 28 || repeatedStarts;
}

function suggestedAction(result: ProviderResult, task: EngineTask, outputMode: string): string {
  if (!result.success || !result.output) return "Improve this";
  if (looksStiff(result.output)) return "Paraphrase this";
  if (outputMode === "content_only") return "Use this";
  if (task === "translate") return result.fallbackUsed ? "Improve this" : "Use this";
  if (task === "rewrite" || task === "improve") return "Use this";
  return "Improve this";
}

function guidanceFor(): string[] {
  return [
    "Check accuracy against the source",
    "Check naturalness",
    "Check whether wording avoids AI-slop",
    "Check whether meaning was compressed or expanded",
    "Check tone match",
  ];
}

function ResultCard({
  result,
  task,
  outputMode,
  onReplaceResultSource,
  onAddResultToSource,
  onContinueResult,
  onReadResult,
  onAddResultToDraft,
  onReplaceDraftWithResult,
  onMarkFinal,
  stepLabel,
  compactLabels,
}: {
  result: ProviderResult;
  task: EngineTask;
  outputMode: string;
  onReplaceResultSource: (output: string) => void;
  onAddResultToSource: (output: string) => void;
  onContinueResult: (output: string, task: EngineTask) => void;
  onReadResult: (output: string) => void;
  onAddResultToDraft: (output: string) => void;
  onReplaceDraftWithResult: (output: string) => void;
  onMarkFinal: (output: string, provider?: LLMProvider, providerLabel?: string) => void;
  stepLabel: string;
  compactLabels?: boolean;
}) {
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const requestedLabel = providerLabel(result.requestedProvider);
  const actualLabel = providerLabel(result.actualProvider);
  const routeLabel = result.fallbackUsed
    ? `${requestedLabel} \u2192 fallback ${actualLabel}`
    : `${requestedLabel} \u2192 ${actualLabel}`;
  const suggestion = suggestedAction(result, task, outputMode);
  const guidance = guidanceFor();

  return (
    <article className={`result-card provider-${result.requestedProvider}`}>
      <header className="card-head">
        <div>
          <div className="step-label">{stepLabel}</div>
          <h3>{requestedLabel}</h3>
          <p>{result.success ? "Generated output" : "Generation failed"}</p>
        </div>
        <span className={result.fallbackUsed ? "route fallback" : "route"}>{routeLabel}</span>
      </header>

      <div className="output-text selectable-output" data-selectable-output="true">{result.output || "(no output)"}</div>

      <div className="suggested-action">Suggested: {suggestion}</div>
      <div className="flow-hint">Original source → Result → Next step</div>

      <section className="assessment">
        <h4>Assessment notes</h4>
        <ul>
          {guidance.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="actions">
        <button
          type="button"
          onClick={() => {
            onReplaceResultSource(result.output);
            setActionStatus("Result promoted to a new source version.");
          }}
          disabled={!result.output}
        >
          {compactLabels ? "Promote source" : "Promote to new source version"}
        </button>
        <button
          type="button"
          onClick={() => {
            onAddResultToSource(result.output);
            setActionStatus("Result added to Source Capture.");
          }}
          disabled={!result.output}
        >
          {compactLabels ? "Add to source" : "Add this result to source"}
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await copyText(result.output);
              setActionStatus("Copied.");
            } catch {
              setActionStatus("Copy failed.");
            }
          }}
          disabled={!result.output}
        >
          Copy
        </button>
        <button
          type="button"
          onClick={() => {
            onAddResultToDraft(result.output);
            setActionStatus("Result added to Essay Draft.");
          }}
          disabled={!result.output}
        >
          Add to Essay Draft
        </button>
        <button
          type="button"
          onClick={() => {
            onReplaceDraftWithResult(result.output);
            setActionStatus("Essay Draft replace requested.");
          }}
          disabled={!result.output}
        >
          {compactLabels ? "Replace draft" : "Replace Essay Draft with this result"}
        </button>
        <button
          type="button"
          onClick={() => {
            onMarkFinal(result.output, result.requestedProvider, requestedLabel);
            setActionStatus("Marked as Final.");
          }}
          disabled={!result.output}
        >
          Mark as Final
        </button>
      </div>

      <section className="continue-result">
        <h4>Continue with this result</h4>
        <div className="continue-actions">
          <button
            type="button"
            onClick={() => {
              onContinueResult(result.output, "translate");
              setActionStatus("Result is now Source. Task set to Translate.");
            }}
            disabled={!result.output}
          >
            Translate
          </button>
          <button
            type="button"
            onClick={() => {
              onContinueResult(result.output, "paraphrase");
              setActionStatus("Result is now Source. Task set to Paraphrase.");
            }}
            disabled={!result.output}
          >
            Paraphrase
          </button>
          <button
            type="button"
            onClick={() => {
              onContinueResult(result.output, "rewrite");
              setActionStatus("Result is now Source. Task set to Rewrite.");
            }}
            disabled={!result.output}
          >
            Rewrite
          </button>
          <button
            type="button"
            onClick={() => {
              onContinueResult(result.output, "summarize");
              setActionStatus("Result is now Source. Task set to Summarize.");
            }}
            disabled={!result.output}
          >
            Summarize
          </button>
          <button
            type="button"
            onClick={() => {
              onReadResult(result.output);
              setActionStatus("Reading this result aloud.");
            }}
            disabled={!result.output}
          >
            Read aloud
          </button>
        </div>
      </section>
      {actionStatus && <div className="action-status">{actionStatus}</div>}

      {result.error && (
        <div className={result.success ? "provider-error warning" : "provider-error"}>
          {result.error}
        </div>
      )}

      <dl className="metadata">
        <div>
          <dt>Requested</dt>
          <dd>{requestedLabel}</dd>
        </div>
        <div>
          <dt>Actual</dt>
          <dd>{actualLabel}</dd>
        </div>
        <div>
          <dt>Fallback</dt>
          <dd>{result.fallbackUsed ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Latency</dt>
          <dd>{formatLatency(result.latencyMs)}</dd>
        </div>
      </dl>

      <style jsx>{`
        .result-card {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
          border: 1px solid #dfe5ec;
          border-top: 4px solid #8aa0b3;
          border-radius: 12px;
          background: #ffffff;
          padding: 16px;
          box-shadow: 0 10px 24px rgba(31, 45, 61, 0.05);
        }
        .provider-openai {
          border-top-color: #2f6f73;
        }
        .provider-deepseek {
          border-top-color: #596f9f;
        }
        .provider-qwen {
          border-top-color: #9a6b2f;
        }
        .card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        h3 {
          margin: 0;
          color: #17202a;
          font-size: 18px;
          line-height: 1.2;
        }
        .card-head p {
          margin: 3px 0 0;
          color: #617080;
          font-size: 12px;
        }
        .step-label {
          display: inline-flex;
          width: fit-content;
          margin-bottom: 6px;
          border: 1px solid #cfe3e1;
          border-radius: 999px;
          background: #f1f8f7;
          color: #174447;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .route {
          border: 1px solid #dfe5ec;
          border-radius: 999px;
          background: #f8fafc;
          color: #475569;
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }
        .route.fallback {
          border-color: #f0d48a;
          background: #fff8e1;
          color: #7a5200;
        }
        .output-text {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          min-height: 240px;
          max-height: 660px;
          overflow: auto;
          border: 1px solid #e3e9ef;
          border-radius: 10px;
          background: #fbfcfe;
          color: #15202b;
          padding: 20px;
          font: 16px/1.78 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          user-select: text;
          -webkit-user-select: text;
          touch-action: manipulation;
        }
        .suggested-action {
          border: 1px solid #cfe3e1;
          border-radius: 999px;
          background: #f1f8f7;
          color: #174447;
          align-self: flex-start;
          padding: 7px 10px;
          font-size: 13px;
          font-weight: 800;
        }
        .flow-hint {
          border: 1px solid #e3e9ef;
          border-radius: 999px;
          background: #fbfcfe;
          color: #526171;
          width: fit-content;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 800;
        }
        .assessment {
          border-top: 1px solid #d8e8e6;
          border: 1px solid #d8e8e6;
          border-radius: 10px;
          background: #f3faf9;
          padding: 12px;
        }
        .assessment h4 {
          margin: 0 0 7px;
          color: #174447;
          font-size: 13px;
        }
        .assessment ul {
          display: grid;
          gap: 4px;
          margin: 0;
          padding-left: 18px;
          color: #526171;
          font-size: 13px;
          line-height: 1.4;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          border-top: 1px solid #edf2f6;
          padding-top: 12px;
        }
        .continue-result {
          display: grid;
          gap: 10px;
          border: 1px solid #d8e8e6;
          border-radius: 10px;
          background: #f8fcfb;
          padding: 12px;
        }
        .continue-result h4 {
          margin: 0;
          color: #174447;
          font-size: 13px;
        }
        .continue-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        button {
          border: 1px solid #cfd8e3;
          border-radius: 8px;
          background: #f8fafc;
          color: #22303f;
          padding: 9px 12px;
          font: inherit;
          font-size: 13px;
          font-weight: 780;
          cursor: pointer;
        }
        button:first-child {
          border-color: #1d5f63;
          background: #1d5f63;
          color: #ffffff;
        }
        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .provider-error {
          color: #9f1239;
          background: #fff1f2;
          border: 1px solid #fecdd3;
          padding: 9px 10px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.45;
        }
        .provider-error.warning {
          color: #8a5a00;
          background: #fff8e1;
          border-color: #ffe082;
        }
        .action-status {
          border: 1px solid #cfe3e1;
          border-radius: 8px;
          background: #f1f8f7;
          color: #285b5d;
          padding: 9px 10px;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.4;
        }
        .metadata {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin: 0;
          border-top: 1px solid #edf2f6;
          padding-top: 12px;
        }
        .metadata dt {
          color: #617080;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .metadata dd {
          margin: 2px 0 0;
          color: #17202a;
          font-size: 12px;
          font-weight: 750;
          overflow-wrap: anywhere;
        }
        @media (max-width: 640px) {
          .card-head {
            flex-direction: column;
          }
          .route {
            white-space: normal;
          }
          .metadata {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .actions button {
            flex: 1 1 100%;
          }
        }
      `}</style>
    </article>
  );
}

function PreviewCard({ provider }: { provider: LLMProvider }) {
  const label = providerLabel(provider);

  return (
    <article className={`preview-card provider-${provider}`}>
      <h3>{label}</h3>
      <div className="preview-output">{label} output will appear here</div>

      <style jsx>{`
        .preview-card {
          min-width: 0;
          border: 1px dashed #cfd8e3;
          border-top: 4px solid #8aa0b3;
          border-radius: 12px;
          background: #fbfcfe;
          padding: 16px;
        }
        .provider-openai {
          border-top-color: #2f6f73;
        }
        .provider-deepseek {
          border-top-color: #596f9f;
        }
        .provider-qwen {
          border-top-color: #9a6b2f;
        }
        h3 {
          margin: 0 0 12px;
          color: #17202a;
          font-size: 18px;
          line-height: 1.2;
        }
        .preview-output {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 240px;
          border: 1px solid #e3e9ef;
          border-radius: 10px;
          background: #ffffff;
          color: #647384;
          padding: 18px;
          text-align: center;
          font-size: 15px;
          line-height: 1.6;
        }
      `}</style>
    </article>
  );
}

export function OutputPanel({
  result,
  task,
  selectedProviders,
  onReplaceResultSource,
  onAddResultToSource,
  onContinueResult,
  onReadResult,
  onAddResultToDraft,
  onReplaceDraftWithResult,
  onMarkFinal,
  finalResult,
  resultStep,
}: Props) {
  const [fallbackStatus, setFallbackStatus] = useState<string | null>(null);
  const [compareTab, setCompareTab] = useState(0);
  const outputs = result?.outputs ?? [];
  const isMulti = outputs.length > 1;
  const compactLabels = useMediaQuery(`(max-width: ${DESKTOP_MIN - 1}px)`, false);
  const useResultTabs = isMulti && compactLabels;
  const selectedIsMulti = selectedProviders.length > 1;
  const providersUsed = outputs.length
    ? outputs.map((o) => providerLabel(o.actualProvider)).join(", ")
    : "-";

  useEffect(() => {
    setCompareTab(0);
  }, [result?.outputs]);

  return (
    <section className="result-layer">
      <div className="layer-head">
        <p className="eyebrow">8. Result / Validation Layer</p>
        <div className="title-row">
          <div>
            <h2>Result / Validation</h2>
            <p>
              {isMulti
                ? "Compare provider outputs side by side, then choose the best version to use or refine."
                : "Read the generated result, review validation notes, then use or refine it."}
            </p>
          </div>
          {(isMulti || selectedIsMulti) && <span className="comparison-mode">Comparison Mode Active</span>}
        </div>
      </div>

      <div className="result-explainer">
        Generated outputs appear here. Select multiple engines to compare OpenAI, DeepSeek, and Qwen side by side.
      </div>
      {finalResult && (
        <div className="final-result">
          <strong>Final result selected</strong>
          <span>Provider: {finalResult.providerLabel ?? "Result"}</span>
          <span>Updated: {new Date(finalResult.updatedAt).toLocaleString()}</span>
        </div>
      )}

      {result ? (
        <>
          <dl className="run-meta">
            <div>
              <dt>Input Type</dt>
              <dd>{result.inputType}</dd>
            </div>
            <div>
              <dt>Output Behavior</dt>
              <dd>{result.outputMode}</dd>
            </div>
            <div>
              <dt>Providers Used</dt>
              <dd>{providersUsed}</dd>
            </div>
          </dl>

          {outputs.length > 0 ? (
            useResultTabs ? (
              <>
                <div className="compare-tabs" role="tablist" aria-label="Engine comparison">
                  {outputs.map((o, i) => (
                    <button
                      key={`${o.requestedProvider}-${i}-tab`}
                      type="button"
                      role="tab"
                      aria-selected={compareTab === i}
                      className={compareTab === i ? "compare-tab active" : "compare-tab"}
                      onClick={() => setCompareTab(i)}
                    >
                      {providerLabel(o.requestedProvider)}
                    </button>
                  ))}
                </div>
                <div className="result-grid">
                  <ResultCard
                    key={`${outputs[compareTab].requestedProvider}-${compareTab}`}
                    result={outputs[compareTab]}
                    task={task}
                    outputMode={result.outputMode}
                    onReplaceResultSource={onReplaceResultSource}
                    onAddResultToSource={onAddResultToSource}
                    onContinueResult={onContinueResult}
                    onReadResult={onReadResult}
                    onAddResultToDraft={onAddResultToDraft}
                    onReplaceDraftWithResult={onReplaceDraftWithResult}
                    onMarkFinal={onMarkFinal}
                    stepLabel={`Step ${resultStep} result`}
                    compactLabels={compactLabels}
                  />
                </div>
              </>
            ) : (
            <div className={isMulti ? "result-grid multi" : "result-grid"}>
              {outputs.map((o, i) => (
                <ResultCard
                  key={`${o.requestedProvider}-${i}`}
                  result={o}
                  task={task}
                  outputMode={result.outputMode}
                  onReplaceResultSource={onReplaceResultSource}
                  onAddResultToSource={onAddResultToSource}
                  onContinueResult={onContinueResult}
                  onReadResult={onReadResult}
                  onAddResultToDraft={onAddResultToDraft}
                  onReplaceDraftWithResult={onReplaceDraftWithResult}
                  onMarkFinal={onMarkFinal}
                  stepLabel={`Step ${resultStep} result`}
                  compactLabels={compactLabels}
                />
              ))}
            </div>
            )
          ) : (
            <div className="fallback-wrap">
              <div className="fallback-output">{result.output || "(no output)"}</div>
              <div className="fallback-actions">
                <button
                  type="button"
                  className="read-result primary-action"
                  onClick={() => {
                    onReplaceResultSource(result.output);
                    setFallbackStatus("Result promoted to a new source version.");
                  }}
                  disabled={!result.output}
                >
                  Promote to new source version
                </button>
                <button
                  type="button"
                  className="read-result"
                  onClick={() => {
                    onAddResultToSource(result.output);
                    setFallbackStatus("Result added to Source Capture.");
                  }}
                  disabled={!result.output}
                >
                  Add this result to source
                </button>
                <button
                  type="button"
                  className="read-result"
                  onClick={() => {
                    onContinueResult(result.output, "translate");
                    setFallbackStatus("Result is now Source. Task set to Translate.");
                  }}
                  disabled={!result.output}
                >
                  Translate
                </button>
                <button type="button" className="read-result" onClick={() => onContinueResult(result.output, "paraphrase")} disabled={!result.output}>
                  Paraphrase
                </button>
                <button type="button" className="read-result" onClick={() => onContinueResult(result.output, "rewrite")} disabled={!result.output}>
                  Rewrite
                </button>
                <button type="button" className="read-result" onClick={() => onContinueResult(result.output, "summarize")} disabled={!result.output}>
                  Summarize
                </button>
                <button type="button" className="read-result" onClick={() => onReadResult(result.output)} disabled={!result.output}>
                  Read aloud
                </button>
                <button type="button" className="read-result" onClick={() => onAddResultToDraft(result.output)} disabled={!result.output}>
                  Add to Essay Draft
                </button>
                <button type="button" className="read-result" onClick={() => onReplaceDraftWithResult(result.output)} disabled={!result.output}>
                  Replace Essay Draft with this result
                </button>
                <button
                  type="button"
                  className="read-result"
                  onClick={async () => {
                    try {
                      await copyText(result.output);
                      setFallbackStatus("Copied.");
                    } catch {
                      setFallbackStatus("Copy failed.");
                    }
                  }}
                  disabled={!result.output}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="read-result"
                  onClick={() => {
                    onMarkFinal(result.output, undefined, "Result");
                    setFallbackStatus("Marked as Final.");
                  }}
                  disabled={!result.output}
                >
                  Mark as Final
                </button>
              </div>
              {fallbackStatus && <div className="fallback-status">{fallbackStatus}</div>}
            </div>
          )}

          <div className={result.warnings.length > 0 ? "warnings" : "warnings empty"}>
            {result.warnings.length > 0 ? (
              <>
                <div>
                  <strong>Validation Warnings</strong>
                  <span>{result.warnings.length} warning(s)</span>
                </div>
                <p>These warnings check whether the output followed the selected format rules.</p>
                <ul>
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Validation: no format or structure issues detected.</p>
            )}
          </div>
        </>
      ) : (
        selectedIsMulti ? (
          <div className="result-grid multi preview-grid">
            {selectedProviders.map((provider) => (
              <PreviewCard key={provider} provider={provider} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Single engine mode.</strong>
            <p>Your translated result will appear here after generation.</p>
          </div>
        )
      )}

      <style jsx>{`
        .result-layer {
          border: 1px solid #dfe5ec;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 14px 34px rgba(31, 45, 61, 0.07);
          padding: 20px;
        }
        .layer-head {
          margin-bottom: 14px;
        }
        .eyebrow {
          margin: 0;
          color: #2f6f73;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-top: 2px;
        }
        h2 {
          margin: 0 0 5px;
          color: #17202a;
          font-size: 18px;
          line-height: 1.25;
        }
        .title-row p {
          margin: 0;
          color: #617080;
          font-size: 13px;
          line-height: 1.45;
        }
        .comparison-mode {
          border: 1px solid #83bdb9;
          border-radius: 999px;
          background: #e8f7f6;
          color: #174447;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }
        .result-explainer {
          border: 1px solid #d8e8e6;
          border-radius: 10px;
          background: #f3faf9;
          color: #285b5d;
          padding: 12px;
          margin-bottom: 14px;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.5;
        }
        .compare-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .compare-tab {
          flex: 1 1 auto;
          min-height: 44px;
          border: 1px solid #cfd8e3;
          border-radius: 999px;
          background: #f8fafc;
          color: #22303f;
          padding: 10px 14px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }
        .compare-tab.active {
          border-color: #1d5f63;
          background: #1d5f63;
          color: #ffffff;
        }
        .final-result {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          border: 1px solid #cfe3e1;
          border-radius: 10px;
          background: #f8fcfb;
          color: #285b5d;
          padding: 10px 12px;
          margin-bottom: 14px;
          font-size: 13px;
          line-height: 1.4;
        }
        .final-result strong {
          color: #174447;
        }
        .final-result span {
          border-left: 1px solid #cfe3e1;
          padding-left: 10px;
        }
        .run-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 0 0 14px;
        }
        .run-meta div {
          border: 1px solid #e7edf3;
          border-radius: 10px;
          background: #f8fafc;
          padding: 12px;
          min-width: 0;
        }
        .run-meta dt {
          color: #617080;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .run-meta dd {
          margin: 3px 0 0;
          color: #17202a;
          font-size: 13px;
          font-weight: 760;
          overflow-wrap: anywhere;
        }
        .result-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 12px;
          align-items: stretch;
        }
        .result-grid.multi {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          overflow-x: visible;
        }
        .preview-grid {
          align-items: stretch;
        }
        .fallback-output {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          border: 1px solid #e3e9ef;
          border-radius: 10px;
          background: #fbfcfe;
          color: #15202b;
          padding: 18px;
          font: 16px/1.72 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .fallback-wrap {
          display: grid;
          gap: 10px;
        }
        .fallback-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .read-result {
          justify-self: start;
          border: 1px solid #cfd8e3;
          border-radius: 8px;
          background: #f8fafc;
          color: #22303f;
          padding: 9px 12px;
          font: inherit;
          font-size: 13px;
          font-weight: 780;
          cursor: pointer;
        }
        .read-result:hover:not(:disabled) {
          border-color: #2f6f73;
          background: #e7f5f3;
          color: #174447;
        }
        .read-result.primary-action {
          border-color: #1d5f63;
          background: #1d5f63;
          color: #ffffff;
        }
        .read-result:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .fallback-status {
          border: 1px solid #cfe3e1;
          border-radius: 8px;
          background: #f1f8f7;
          color: #285b5d;
          padding: 9px 10px;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.4;
        }
        .warnings {
          margin-top: 12px;
          color: #8a5a00;
          background: #fff8e1;
          border: 1px solid #ffe082;
          border-radius: 8px;
          padding: 12px;
          font-size: 13px;
        }
        .warnings.empty {
          color: #315c48;
          background: #f0f8f4;
          border-color: #cfe8d9;
        }
        .warnings div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .warnings span {
          font-size: 12px;
          font-weight: 800;
        }
        .warnings ul {
          margin: 8px 0 0;
          padding-left: 18px;
        }
        .warnings p {
          margin: 8px 0 0;
        }
        .empty-state {
          border: 1px dashed #cfd8e3;
          border-radius: 10px;
          background: #fbfcfe;
          padding: 24px;
          color: #617080;
        }
        .empty-state strong {
          display: block;
          color: #17202a;
          margin-bottom: 4px;
        }
        .empty-state p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
        }
        @media (max-width: 640px) {
          .title-row {
            flex-direction: column;
          }
          .comparison-mode {
            white-space: normal;
          }
          .run-meta {
            grid-template-columns: 1fr;
          }
          .result-grid,
          .result-grid.multi {
            grid-template-columns: 1fr;
            overflow-x: visible;
          }
          .warnings div {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </section>
  );
}
