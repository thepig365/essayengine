"use client";

import { useCallback, useEffect, useState } from "react";
import { EngineForm } from "@/components/EngineForm";
import { UserGuide } from "@/components/UserGuide";
import {
  CONSOLE_VIEW_STORAGE_KEY,
  DESKTOP_MIN,
  type ConsoleViewPreference,
} from "@/essay-engine/breakpoints";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { EngineResponse } from "@/types/engine";

export default function HomePage() {
  const [result, setResult] = useState<EngineResponse | null>(null);
  const [consoleViewPreference, setConsoleViewPreference] = useState<ConsoleViewPreference>("auto");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONSOLE_VIEW_STORAGE_KEY);
      if (raw === "desktop" || raw === "mobile" || raw === "auto") {
        setConsoleViewPreference(raw);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setConsolePreference = useCallback((next: ConsoleViewPreference) => {
    setConsoleViewPreference(next);
    try {
      localStorage.setItem(CONSOLE_VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const viewportIsDesktop = useMediaQuery(`(min-width: ${DESKTOP_MIN}px)`, true);
  const effectiveIsMobileLayout =
    !viewportIsDesktop || (viewportIsDesktop && consoleViewPreference === "mobile");

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p>Translator / Paraphraser Engine v1.0</p>
          <h1>Essay Engine</h1>
        </div>
        <div className="hero-actions">
          <span>Build essays from transcripts, notes, and ideas — refine, iterate, and finalize into text or audio.</span>
          {viewportIsDesktop ? (
            <button
              type="button"
              className="console-view-toggle"
              onClick={() => setConsolePreference(effectiveIsMobileLayout ? "desktop" : "mobile")}
            >
              {effectiveIsMobileLayout ? "Desktop Console View" : "Mobile Friendly View"}
            </button>
          ) : null}
          <UserGuide />
        </div>
      </header>

      <EngineForm result={result} onResult={setResult} consoleViewPreference={consoleViewPreference} />

      <style jsx>{`
        .page {
          --bg-main: #0B1117;
          --bg-panel: #111A22;
          --bg-card: #16212B;
          --bg-card-soft: #1B2935;
          --bg-input: #0E1720;
          --bg-elevated: #1A2632;
          --border-soft: #263746;
          --border-medium: #334657;
          --border-focus: #3F8F8A;
          --text-primary: #E6EDF3;
          --text-secondary: #A8B3C1;
          --text-muted: #748395;
          --text-disabled: #526170;
          --accent-primary: #3F8F8A;
          --accent-primary-hover: #4FA7A0;
          --accent-secondary: #6C7DDC;
          --accent-soft: #1E3A3A;
          --success: #7DBE8A;
          --warning: #D6A85C;
          --error: #E07A7A;
          --info: #7BA7D9;
          --font-system: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", "Segoe UI", system-ui, sans-serif;
          --font-size-body: 16px;
          --font-size-body-mobile: 18px;
          --font-size-helper: 13.5px;
          --font-size-helper-mobile: 15.5px;
          --font-size-label: 14px;
          --font-size-label-mobile: 16px;
          --font-size-button: 15px;
          --font-size-button-mobile: 17px;
          --font-size-prose: 18px;
          --font-size-prose-mobile: 20px;
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(63, 143, 138, 0.12), transparent 34rem),
            linear-gradient(180deg, var(--bg-main), #0d141b 42%, var(--bg-main));
          color: var(--text-primary);
          font-family: var(--font-system);
          font-size: var(--font-size-body);
          line-height: 1.6;
          padding: 28px;
          color-scheme: dark;
        }
        .hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          max-width: 1440px;
          margin: 0 auto 22px;
        }
        .hero p {
          margin: 0 0 5px;
          color: #7fb7b3;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .hero h1 {
          margin: 0;
          color: #edf2f7;
          font-size: 34px;
          line-height: 1.05;
          letter-spacing: 0;
        }
        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 14px;
        }
        .hero-actions span {
          max-width: 520px;
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.55;
          text-align: right;
        }
        .console-view-toggle {
          flex-shrink: 0;
          border: 1px solid var(--border-medium);
          border-radius: 999px;
          background: var(--bg-card-soft);
          color: var(--text-primary);
          padding: 10px 18px;
          font: inherit;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
          white-space: nowrap;
        }
        .console-view-toggle:hover {
          border-color: var(--accent-primary);
          background: var(--accent-soft);
        }
        :global(body),
        :global(button),
        :global(input),
        :global(textarea),
        :global(select) {
          font-family: var(--font-system) !important;
        }
        :global(.workspace),
        :global(.layer),
        :global(.mobile-workflow-panel),
        :global(.essay-draft-workspace),
        :global(.result-layer),
        :global(.final-panel),
        :global(.workflow-timeline),
        :global(.guide-panel) {
          font-size: var(--font-size-body) !important;
          line-height: 1.6 !important;
        }
        :global(.workspace) {
          max-width: 1440px;
          margin: 0 auto;
        }
        :global(*::selection) {
          background: rgba(93, 168, 166, 0.35);
          color: #f8fafc;
        }
        :global(.layer),
        :global(.mobile-workflow-panel),
        :global(.workflow-timeline),
        :global(.essay-draft-workspace),
        :global(.final-panel),
        :global(.result-layer),
        :global(.guide-panel) {
          border-color: #263241 !important;
          background: #111821 !important;
          color: #d8dee8 !important;
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28) !important;
        }
        :global(.control-column),
        :global(.transcript-column),
        :global(.work-column) {
          color: #d8dee8 !important;
        }
        :global(.layer-head h2),
        :global(.panel-head h2),
        :global(.mobile-panel-head strong),
        :global(.workflow-step h3),
        :global(.version-card h3),
        :global(.audio-card strong),
        :global(.final-meta strong),
        :global(.empty-final strong),
        :global(.source-summary-card strong),
        :global(.range-head strong),
        :global(.project-meta strong),
        :global(.mini-card strong),
        :global(.guide-panel h2),
        :global(.guide-panel h3),
        :global(.draft-metrics span:first-child) {
          color: #edf2f7 !important;
        }
        :global(.layer-head p),
        :global(.panel-head p),
        :global(.helper),
        :global(.audio-card p),
        :global(.empty-final p),
        :global(.mobile-panel-head span),
        :global(.source-footer),
        :global(.transcript-note),
        :global(.guide-panel p),
        :global(.guide-panel dd),
        :global(.mini-card p),
        :global(.mini-card small),
        :global(.notes-list),
        :global(.diagnosis),
        :global(.structure small),
        :global(.paragraph span) {
          color: #9aa8ba !important;
        }
        :global(.eyebrow),
        :global(.workflow-step > span),
        :global(.guide-head p) {
          color: #7fc7c2 !important;
        }
        :global(textarea),
        :global(input),
        :global(select) {
          border-color: #334155 !important;
          background: #0b111a !important;
          color: #e5edf7 !important;
          box-shadow: none !important;
          caret-color: #8fd3cf;
        }
        :global(textarea::placeholder),
        :global(input::placeholder) {
          color: #6f7f92 !important;
        }
        :global(textarea:focus),
        :global(input:focus),
        :global(select:focus) {
          border-color: #5da8a6 !important;
          background: #0d1520 !important;
          box-shadow: 0 0 0 3px rgba(93, 168, 166, 0.18) !important;
        }
        :global(button),
        :global(.secondary),
        :global(.copy-action),
        :global(.source-read),
        :global(.task-icon-button),
        :global(.library-button),
        :global(.structure),
        :global(.paragraph),
        :global(.show-older),
        :global(.fresh-button) {
          border-color: #334155 !important;
          background: #151e29 !important;
          color: #dbe4ef !important;
          box-shadow: none !important;
        }
        :global(button:hover:not(:disabled)),
        :global(.secondary:hover:not(:disabled)),
        :global(.copy-action:hover:not(:disabled)),
        :global(.task-icon-button:hover),
        :global(.task-icon-button:focus-visible) {
          border-color: #5da8a6 !important;
          background: #1a2935 !important;
          color: #f3f8fb !important;
          box-shadow: 0 0 0 3px rgba(93, 168, 166, 0.13) !important;
        }
        :global(.primary),
        :global(.task-icon-button.active),
        :global(.segmented button.active),
        :global(.mobile-primary-tabs button.active),
        :global(.player-main-button),
        :global(.player-pause),
        :global(.mobile-player button:nth-child(2)) {
          border-color: #5da8a6 !important;
          background: #1f6f77 !important;
          color: #f3fbfb !important;
          box-shadow: 0 0 0 3px rgba(93, 168, 166, 0.12) !important;
        }
        :global(button:disabled),
        :global(.primary:disabled),
        :global(.secondary:disabled) {
          opacity: 0.48 !important;
        }
        :global(.source-helper),
        :global(.source-helper.active),
        :global(.source-state),
        :global(.source-action-status),
        :global(.ready-summary),
        :global(.selected-description),
        :global(.draft-helper),
        :global(.draft-status),
        :global(.range-status),
        :global(.workflow-status),
        :global(.value-box),
        :global(.voice-capture-box),
        :global(.mobile-status),
        :global(.project-meta),
        :global(.chain),
        :global(.final-output-preview),
        :global(.mobile-result-output),
        :global(.transcript-empty),
        :global(.empty-timeline),
        :global(.empty-final),
        :global(.final-result-card),
        :global(.audio-card),
        :global(.version-card),
        :global(.mini-card),
        :global(.workflow-step),
        :global(.mobile-panel),
        :global(.mobile-classic-head),
        :global(.transcript-library-panel),
        :global(.chapter-card),
        :global(.section-card),
        :global(.topic-card),
        :global(.transcript-box),
        :global(.run-summary div),
        :global(.flow-chart),
        :global(.concepts div),
        :global(.guide-panel section) {
          border-color: #263241 !important;
          background: #0f1722 !important;
          color: #cbd5e1 !important;
          box-shadow: none !important;
        }
        :global(.source-strip button),
        :global(.source-strip strong),
        :global(.mobile-metrics span),
        :global(.choice),
        :global(.final-meta span),
        :global(.version-top span),
        :global(.version-top strong) {
          border-color: #314052 !important;
          background: #121c27 !important;
          color: #b8c5d4 !important;
        }
        :global(.source-strip button.active),
        :global(.source-strip strong),
        :global(.structure.selected),
        :global(.paragraph.marked),
        :global(.version-card.current) {
          border-color: #5da8a6 !important;
          background: #12272d !important;
          color: #dff7f5 !important;
          box-shadow: 0 0 0 3px rgba(93, 168, 166, 0.12) !important;
        }
        :global(.error),
        :global(.voice-error),
        :global(.provider-error) {
          border-color: #7f2f3f !important;
          background: #2a1118 !important;
          color: #f2b8c3 !important;
        }
        :global(.writing-hint),
        :global(.validation-card),
        :global(.tts-status) {
          border-color: #6e5522 !important;
          background: #241c10 !important;
          color: #e9d49b !important;
        }
        :global(.media-player),
        :global(.mobile-player),
        :global(.mobile-listening-panel) {
          border-color: #365765 !important;
          background: rgba(13, 20, 30, 0.98) !important;
          color: #d8dee8 !important;
          box-shadow: 0 18px 38px rgba(0, 0, 0, 0.38) !important;
        }
        :global(input[type="range"]) {
          accent-color: #6fc6c1;
        }
        :global(audio) {
          width: 100%;
          color-scheme: dark;
        }
        :global(.guide-backdrop) {
          background: rgba(2, 6, 12, 0.72) !important;
        }
        :global(.guide-button),
        :global(.close-button) {
          border-color: #38515f !important;
          background: #13202c !important;
          color: #d8edf0 !important;
        }
        :global(.flow-item strong) {
          color: #7fc7c2 !important;
        }
        /* Final true-night override: keep every MVP surface low-glare. */
        :global(.layer),
        :global(.mobile-workflow-panel),
        :global(.workflow-timeline),
        :global(.essay-draft-workspace),
        :global(.final-panel),
        :global(.result-layer),
        :global(.guide-panel),
        :global(.project-layer),
        :global(.transcript-library-panel),
        :global(.mobile-classic-head),
        :global(.mobile-panel),
        :global(.mobile-primary-tabs),
        :global(.result-card),
        :global(.preview-card),
        :global(.final-result-card),
        :global(.version-card),
        :global(.workflow-step),
        :global(.audio-card),
        :global(.media-player),
        :global(.mobile-player),
        :global(.mobile-listening-panel) {
          border-color: var(--border-soft) !important;
          background: var(--bg-panel) !important;
          color: var(--text-primary) !important;
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28) !important;
        }
        :global(.source-helper),
        :global(.source-helper.active),
        :global(.source-state),
        :global(.source-action-status),
        :global(.ready-summary),
        :global(.selected-description),
        :global(.draft-helper),
        :global(.draft-status),
        :global(.range-status),
        :global(.workflow-status),
        :global(.value-box),
        :global(.voice-capture-box),
        :global(.link-capture-box),
        :global(.link-material),
        :global(.mobile-status),
        :global(.project-meta),
        :global(.chain),
        :global(.final-output-preview),
        :global(.final-result),
        :global(.mobile-result-output),
        :global(.transcript-empty),
        :global(.empty-timeline),
        :global(.empty-final),
        :global(.chapter-card),
        :global(.section-card),
        :global(.topic-card),
        :global(.transcript-box),
        :global(.range-selector),
        :global(.manual-range-row),
        :global(.library-inline-form),
        :global(.transcript-tools details),
        :global(.transcript-tools summary),
        :global(.run-summary div),
        :global(.flow-chart),
        :global(.concepts div),
        :global(.guide-panel section),
        :global(.assessment),
        :global(.continue-result),
        :global(.output-text),
        :global(.fallback-output),
        :global(.preview-output),
        :global(.fallback-status),
        :global(.action-status),
        :global(.metadata div),
        :global(.run-meta div),
        :global(.draft-metrics span),
        :global(.mobile-metrics span),
        :global(.source-strip button),
        :global(.source-strip strong),
        :global(.choice),
        :global(.mini-card),
        :global(.final-meta span),
        :global(.final-meta strong),
        :global(.version-top span),
        :global(.version-top strong) {
          border-color: var(--border-soft) !important;
          background: var(--bg-card) !important;
          color: var(--text-secondary) !important;
          box-shadow: none !important;
        }
        :global(.link-material),
        :global(.mini-card),
        :global(.output-text),
        :global(.fallback-output),
        :global(.final-output-preview),
        :global(.mobile-result-output),
        :global(.transcript-box),
        :global(.range-selector),
        :global(.library-inline-form),
        :global(.transcript-tools details) {
          background: var(--bg-card-soft) !important;
        }
        :global(.layer-head h2),
        :global(.panel-head h2),
        :global(.mobile-panel-head strong),
        :global(.workflow-step h3),
        :global(.version-card h3),
        :global(.audio-card strong),
        :global(.final-meta strong),
        :global(.empty-final strong),
        :global(.source-summary-card strong),
        :global(.range-head strong),
        :global(.project-meta strong),
        :global(.mini-card strong),
        :global(.link-material strong),
        :global(.guide-panel h2),
        :global(.guide-panel h3),
        :global(.draft-metrics span:first-child),
        :global(.mobile-panel-head strong),
        :global(.run-summary dd),
        :global(.metadata dd),
        :global(.run-meta dd),
        :global(.transcript-empty strong),
        :global(.empty-state strong),
        :global(.preview-card h3),
        :global(.result-card h3) {
          color: var(--text-primary) !important;
          line-height: 1.25 !important;
        }
        :global(.layer-head h2),
        :global(.panel-head h2),
        :global(.workflow-step h3),
        :global(.mobile-panel-head strong),
        :global(.version-card h3),
        :global(.result-card h3),
        :global(.preview-card h3),
        :global(.final-panel h2),
        :global(.essay-draft-workspace h2),
        :global(.workflow-timeline h2) {
          font-size: clamp(18px, 1.7vw, 22px) !important;
        }
        :global(.layer-head p),
        :global(.panel-head p),
        :global(.helper),
        :global(.audio-card p),
        :global(.empty-final p),
        :global(.mobile-panel-head span),
        :global(.source-footer),
        :global(.transcript-note),
        :global(.guide-panel p),
        :global(.guide-panel dd),
        :global(.mini-card p),
        :global(.mini-card small),
        :global(.notes-list),
        :global(.diagnosis),
        :global(.structure small),
        :global(.paragraph span),
        :global(.link-material p),
        :global(.link-material li),
        :global(.voice-capture-box p),
        :global(.link-capture-box p),
        :global(.selected-description p),
        :global(.transcript-empty p),
        :global(.project-helper),
        :global(.source-helper),
        :global(.run-summary dt),
        :global(.metadata dt),
        :global(.run-meta dt),
        :global(.mobile-player span) {
          color: var(--text-secondary) !important;
          font-size: var(--font-size-helper) !important;
          line-height: 1.5 !important;
        }
        :global(label),
        :global(.field span),
        :global(.run-summary dt),
        :global(.metadata dt),
        :global(.run-meta dt),
        :global(.mobile-panel-head span) {
          font-size: var(--font-size-label) !important;
          line-height: 1.35 !important;
          font-weight: 700 !important;
        }
        :global(.eyebrow),
        :global(.workflow-step > span),
        :global(.guide-head p),
        :global(.link-material small),
        :global(.flow-item strong) {
          color: var(--accent-primary-hover) !important;
          font-size: 13px !important;
          line-height: 1.35 !important;
        }
        :global(textarea),
        :global(input),
        :global(select) {
          border-color: var(--border-medium) !important;
          background: var(--bg-input) !important;
          color: var(--text-primary) !important;
          font-size: 16px !important;
          line-height: 1.5 !important;
          box-shadow: none !important;
          caret-color: var(--accent-primary-hover);
        }
        :global(textarea::placeholder),
        :global(input::placeholder) {
          color: var(--text-muted) !important;
        }
        :global(textarea:focus),
        :global(input:focus),
        :global(select:focus) {
          border-color: var(--border-focus) !important;
          background: #101c26 !important;
          box-shadow: 0 0 0 3px rgba(63, 143, 138, 0.18) !important;
        }
        :global(button),
        :global(.secondary),
        :global(.copy-action),
        :global(.source-read),
        :global(.task-icon-button),
        :global(.library-button),
        :global(.structure),
        :global(.paragraph),
        :global(.show-older),
        :global(.fresh-button),
        :global(.read-result),
        :global(.guide-button),
        :global(.close-button) {
          border-color: var(--border-medium) !important;
          background: #1C2A36 !important;
          color: #D9E3EC !important;
          font-size: var(--font-size-button) !important;
          line-height: 1.3 !important;
          font-weight: 700 !important;
          box-shadow: none !important;
        }
        :global(button:hover:not(:disabled)),
        :global(.secondary:hover:not(:disabled)),
        :global(.copy-action:hover:not(:disabled)),
        :global(.task-icon-button:hover),
        :global(.task-icon-button:focus-visible),
        :global(.read-result:hover:not(:disabled)) {
          border-color: var(--accent-primary-hover) !important;
          background: #263847 !important;
          color: var(--text-primary) !important;
          box-shadow: 0 0 0 3px rgba(63, 143, 138, 0.12) !important;
        }
        :global(.primary),
        :global(.primary-action),
        :global(.task-icon-button.active),
        :global(.segmented button.active),
        :global(.mobile-primary-tabs button.active),
        :global(.player-main-button),
        :global(.player-pause),
        :global(.mobile-player button:nth-child(2)),
        :global(.button-row button:first-child),
        :global(.workflow-step > button:first-of-type),
        :global(.project-actions button:first-child),
        :global(.mobile-action-grid button:first-child) {
          border-color: var(--accent-primary) !important;
          background: #2F7F7A !important;
          color: #F2FBFA !important;
          box-shadow: 0 0 0 3px rgba(63, 143, 138, 0.12) !important;
        }
        :global(.primary:hover:not(:disabled)),
        :global(.primary-action:hover:not(:disabled)),
        :global(.player-main-button:hover:not(:disabled)),
        :global(.player-pause:hover:not(:disabled)),
        :global(.button-row button:first-child:hover:not(:disabled)),
        :global(.workflow-step > button:first-of-type:hover:not(:disabled)) {
          border-color: var(--accent-primary-hover) !important;
          background: #3F9A94 !important;
          color: #F2FBFA !important;
        }
        :global(button:disabled),
        :global(.primary:disabled),
        :global(.secondary:disabled),
        :global(.copy-action:disabled) {
          border-color: #243342 !important;
          background: #1A222C !important;
          color: var(--text-disabled) !important;
          opacity: 0.65 !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
        }
        :global(.source-clear),
        :global(button[disabled] + button:last-child) {
          color: #FFE4E4;
        }
        :global(.error),
        :global(.voice-error),
        :global(.provider-error) {
          border-color: #6d3438 !important;
          background: #2b1519 !important;
          color: var(--error) !important;
        }
        :global(.writing-hint),
        :global(.validation-card),
        :global(.tts-status),
        :global(.rough-warning),
        :global(.warnings) {
          border-color: #6a4b22 !important;
          background: #2a2115 !important;
          color: var(--warning) !important;
        }
        :global(.warnings.empty) {
          border-color: #2f5438 !important;
          background: #17281d !important;
          color: var(--success) !important;
        }
        :global(.source-strip button.active),
        :global(.source-strip strong),
        :global(.structure.selected),
        :global(.paragraph.marked),
        :global(.version-card.current),
        :global(.suggested-action),
        :global(.step-label),
        :global(.flow-hint) {
          border-color: var(--accent-primary) !important;
          background: var(--accent-soft) !important;
          color: #DFF7F5 !important;
          box-shadow: 0 0 0 3px rgba(63, 143, 138, 0.12) !important;
        }
        :global(.flow-item span) {
          border-color: var(--accent-primary) !important;
          background: #123C38 !important;
          color: #DFF7F5 !important;
          box-shadow: none !important;
        }
        :global(audio) {
          background: var(--bg-input) !important;
        }
        :global(.output-text),
        :global(.fallback-output),
        :global(.preview-output),
        :global(.final-output-preview),
        :global(.mobile-result-output),
        :global(.essay-draft-workspace textarea),
        :global(.mobile-panel textarea),
        :global(.source-layer textarea),
        :global(.source-capture textarea),
        :global(.transcript-column textarea),
        :global(.work-column textarea),
        :global(.transcript-preview),
        :global(.transcript-box),
        :global(.mini-card p),
        :global(.paragraph span),
        :global(.diagnosis),
        :global(.notes-list),
        :global(.link-material),
        :global(.value-box) {
          font-size: var(--font-size-prose) !important;
          line-height: 1.65 !important;
        }
        :global(.mini-card small),
        :global(.project-helper),
        :global(.source-footer),
        :global(.transcript-note),
        :global(.voice-status),
        :global(.project-meta),
        :global(.workflow-status),
        :global(.draft-status),
        :global(.mobile-status),
        :global(.tts-status),
        :global(.error) {
          font-size: var(--font-size-helper) !important;
          line-height: 1.5 !important;
        }
        @media (min-width: 1024px) {
          :global(.output-text),
          :global(.fallback-output),
          :global(.final-output-preview) {
            font-size: 16px !important;
            line-height: 1.65 !important;
          }
        }
        @media (max-width: 820px) {
          .page {
            padding: 18px;
            font-size: var(--font-size-body-mobile);
            line-height: 1.62;
          }
          .hero {
            align-items: flex-start;
            flex-direction: column;
          }
          .hero-actions {
            align-items: flex-start;
            flex-direction: column;
          }
          .hero-actions span {
            text-align: left;
          }
        }
        @media (max-width: 480px) {
          .page {
            padding: 12px;
          }
          .hero {
            gap: 12px;
            margin-bottom: 14px;
          }
          .hero h1 {
            font-size: 30px;
            line-height: 1.08;
          }
          .hero-actions {
            gap: 10px;
          }
          .hero-actions span {
            font-size: 16px;
            line-height: 1.6;
          }
          :global(.workspace),
          :global(.layer),
          :global(.mobile-workflow-panel),
          :global(.essay-draft-workspace),
          :global(.result-layer),
          :global(.final-panel),
          :global(.workflow-timeline),
          :global(.guide-panel) {
            font-size: var(--font-size-body-mobile) !important;
            line-height: 1.62 !important;
          }
          :global(.layer-head h2),
          :global(.panel-head h2),
          :global(.workflow-step h3),
          :global(.mobile-panel-head strong),
          :global(.version-card h3),
          :global(.result-card h3),
          :global(.preview-card h3),
          :global(.final-panel h2),
          :global(.essay-draft-workspace h2),
          :global(.workflow-timeline h2) {
            font-size: 21px !important;
            line-height: 1.22 !important;
          }
          :global(.layer-head p),
          :global(.panel-head p),
          :global(.helper),
          :global(.mini-card small),
          :global(.project-helper),
          :global(.source-footer),
          :global(.transcript-note),
          :global(.workflow-status),
          :global(.draft-status),
          :global(.mobile-status),
          :global(.tts-status),
          :global(.error) {
            font-size: var(--font-size-helper-mobile) !important;
            line-height: 1.52 !important;
          }
          :global(label),
          :global(.field span),
          :global(.run-summary dt),
          :global(.metadata dt),
          :global(.run-meta dt),
          :global(.mobile-panel-head span) {
            font-size: var(--font-size-label-mobile) !important;
          }
          :global(button),
          :global(.secondary),
          :global(.copy-action),
          :global(.source-read),
          :global(.task-icon-button),
          :global(.library-button),
          :global(.structure),
          :global(.paragraph),
          :global(.read-result) {
            font-size: var(--font-size-button-mobile) !important;
            line-height: 1.3 !important;
          }
          :global(.output-text),
          :global(.fallback-output),
          :global(.preview-output),
          :global(.final-output-preview),
          :global(.mobile-result-output),
          :global(.essay-draft-workspace textarea),
          :global(.mobile-panel textarea),
          :global(.source-layer textarea),
          :global(.source-capture textarea),
          :global(.transcript-column textarea),
          :global(.work-column textarea),
          :global(.mini-card p),
          :global(.paragraph span),
          :global(.diagnosis),
          :global(.notes-list),
          :global(.link-material),
          :global(.value-box) {
            font-size: var(--font-size-prose-mobile) !important;
            line-height: 1.66 !important;
          }
          :global(input),
          :global(select) {
            font-size: 16px !important;
            line-height: 1.55 !important;
          }
          :global(textarea) {
            font-size: var(--font-size-prose-mobile) !important;
            line-height: 1.66 !important;
          }
          :global(.eyebrow),
          :global(.workflow-step > span),
          :global(.guide-head p),
          :global(.link-material small) {
            font-size: 14px !important;
            letter-spacing: 0.035em !important;
          }
        }
      `}</style>
    </main>
  );
}
