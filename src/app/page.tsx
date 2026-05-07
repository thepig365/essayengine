"use client";

import { useCallback, useEffect, useState } from "react";
import { EngineForm } from "@/components/EngineForm";
import { UserGuide } from "@/components/UserGuide";
import {
  CONSOLE_VIEW_STORAGE_KEY,
  DESKTOP_MIN,
  MOBILE_PREVIEW_PHONE_WIDTH_PX,
  type ViewMode,
} from "@/essay-engine/breakpoints";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { EngineResponse } from "@/types/engine";

export default function HomePage() {
  const [result, setResult] = useState<EngineResponse | null>(null);
  /** User-chosen shell on wide screens. Ignored when viewport is narrow (always mobile shell). */
  const [viewMode, setViewMode] = useState<ViewMode>("auto");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONSOLE_VIEW_STORAGE_KEY);
      if (raw === "desktop" || raw === "mobile" || raw === "auto") {
        setViewMode(raw);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistViewMode = useCallback((next: ViewMode) => {
    setViewMode(next);
    try {
      localStorage.setItem(CONSOLE_VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const viewportIsDesktop = useMediaQuery(`(min-width: ${DESKTOP_MIN}px)`, true);
  /**
   * Same engine state; only shell changes.
   * - Narrow: always mobile layout (matches `viewMode === "auto" && viewport < 1024` when auto).
   * - Wide: `viewMode === "mobile"` forces mobile shell; `auto` and `desktop` use desktop console.
   */
  const effectiveIsMobileLayout =
    !viewportIsDesktop || (viewportIsDesktop && viewMode === "mobile");

  /** Wide screen + user forced narrow layout — show phone-width centered shell. */
  const isForcedMobilePreviewOnDesktop = viewMode === "mobile" && viewportIsDesktop;

  return (
    <main className="page">
      <header className="hero hero--compact">
        <p className="hero-one-liner">
          Turn sources into saved topics, drafts, and final products.
        </p>
      </header>

      <div className={isForcedMobilePreviewOnDesktop ? "mobile-preview-frame" : "engine-slot"}>
        <div className={isForcedMobilePreviewOnDesktop ? "mobile-preview-shell" : "engine-slot-inner"}>
          <EngineForm
            result={result}
            onResult={setResult}
            viewMode={viewMode}
            navTrailing={
              <>
                <UserGuide />
                {viewportIsDesktop ? (
                  <button
                    type="button"
                    className="console-view-toggle console-view-toggle--icon"
                    onClick={() => persistViewMode(effectiveIsMobileLayout ? "desktop" : "mobile")}
                    aria-label={effectiveIsMobileLayout ? "宽屏布局" : "手机布局"}
                    title={effectiveIsMobileLayout ? "宽屏布局" : "手机布局"}
                  >
                    <span aria-hidden="true">{effectiveIsMobileLayout ? "🖥" : "📱"}</span>
                  </button>
                ) : null}
              </>
            }
          />
        </div>
      </div>

      <style jsx>{`
        .page {
          --bg-main: var(--ee-bg);
          --bg-panel: var(--ee-surface);
          --bg-card: var(--ee-card);
          --bg-card-soft: var(--ee-surface-soft);
          --bg-input: var(--ee-surface);
          --bg-elevated: var(--ee-card);
          --border-soft: var(--ee-border);
          --border-medium: var(--ee-border);
          --border-focus: var(--ee-primary);
          --text-primary: var(--ee-text);
          --text-secondary: var(--ee-muted);
          --text-muted: var(--ee-muted);
          --text-disabled: var(--ee-disabled);
          --accent-primary: var(--ee-primary);
          --accent-primary-hover: var(--ee-primary-hover);
          --accent-secondary: var(--ee-secondary);
          --accent-soft: var(--ee-secondary);
          --success: #6f7f4f;
          --warning: #9b6f35;
          --error: #9f453d;
          --info: #806a70;
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
            radial-gradient(circle at top left, rgba(185, 90, 78, 0.12), transparent 34rem),
            linear-gradient(180deg, var(--ee-bg), #fbf3ed 42%, var(--ee-bg));
          color: var(--text-primary);
          font-family: var(--font-system);
          font-size: var(--font-size-body);
          line-height: 1.6;
          padding: 28px;
          color-scheme: light;
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
          color: var(--ee-primary);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .hero h1 {
          margin: 0;
          color: var(--ee-text);
          font-size: 34px;
          line-height: 1.05;
          letter-spacing: 0;
        }
        .hero--compact {
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          gap: 16px;
        }
        .hero-one-liner {
          margin: 0;
          flex: 1;
          min-width: 0;
          color: var(--ee-muted);
          font-size: 15px;
          font-weight: 650;
          line-height: 1.5;
        }
        .console-view-toggle--icon {
          padding: 10px 14px;
          font-size: 1.15rem;
          line-height: 1;
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
          color: var(--ee-muted);
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
        .engine-slot,
        .engine-slot-inner {
          display: contents;
        }
        /* Centered device-width preview when Mobile Friendly View is forced on desktop (>=1024). Real narrow viewports stay full-width. */
        .mobile-preview-shell {
          max-width: ${MOBILE_PREVIEW_PHONE_WIDTH_PX}px;
          width: min(${MOBILE_PREVIEW_PHONE_WIDTH_PX}px, 100%);
          margin: 0 auto;
          box-sizing: border-box;
          min-width: 0;
        }
        @media (min-width: ${DESKTOP_MIN}px) {
          .mobile-preview-frame {
            max-width: ${MOBILE_PREVIEW_PHONE_WIDTH_PX}px;
            width: 100%;
            margin: 0 auto;
            min-height: 100vh;
            box-sizing: border-box;
          }
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
          background: rgba(185, 90, 78, 0.24);
          color: var(--ee-text);
        }
        :global(.layer),
        :global(.mobile-workflow-panel),
        :global(.workflow-timeline),
        :global(.essay-draft-workspace),
        :global(.final-panel),
        :global(.result-layer),
        :global(.guide-panel) {
          border-color: var(--ee-border) !important;
          background: var(--ee-surface) !important;
          color: var(--ee-text) !important;
          box-shadow: 0 18px 42px rgba(86, 55, 48, 0.12) !important;
        }
        :global(.control-column),
        :global(.transcript-column),
        :global(.work-column) {
          color: var(--ee-text) !important;
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
          color: var(--ee-muted) !important;
        }
        :global(.eyebrow),
        :global(.workflow-step > span),
        :global(.guide-head p) {
          color: var(--ee-primary) !important;
        }
        :global(textarea),
        :global(input),
        :global(select) {
          border-color: var(--ee-border) !important;
          background: var(--ee-surface) !important;
          color: var(--ee-text) !important;
          box-shadow: none !important;
          caret-color: var(--ee-primary);
        }
        :global(textarea::placeholder),
        :global(input::placeholder) {
          color: var(--ee-disabled) !important;
        }
        :global(textarea:focus),
        :global(input:focus),
        :global(select:focus) {
          border-color: var(--ee-primary) !important;
          background: var(--ee-surface) !important;
          box-shadow: 0 0 0 3px rgba(185, 90, 78, 0.16) !important;
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
          border-color: var(--ee-border) !important;
          background: var(--ee-secondary) !important;
          color: var(--ee-text) !important;
          box-shadow: none !important;
        }
        :global(button:hover:not(:disabled)),
        :global(.secondary:hover:not(:disabled)),
        :global(.copy-action:hover:not(:disabled)),
        :global(.task-icon-button:hover),
        :global(.task-icon-button:focus-visible) {
          border-color: var(--ee-primary) !important;
          background: var(--ee-surface-soft) !important;
          color: var(--ee-text) !important;
          box-shadow: 0 0 0 3px rgba(185, 90, 78, 0.12) !important;
        }
        :global(.primary),
        :global(.task-icon-button.active),
        :global(.segmented button.active),
        :global(.mobile-primary-tabs button.active),
        :global(.player-main-button),
        :global(.player-pause),
        :global(.mobile-player button:nth-child(2)) {
          border-color: var(--ee-primary) !important;
          background: var(--ee-primary) !important;
          color: var(--ee-surface) !important;
          box-shadow: 0 0 0 3px rgba(185, 90, 78, 0.12) !important;
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
          border-color: var(--ee-border) !important;
          background: var(--ee-card) !important;
          color: var(--ee-muted) !important;
          box-shadow: none !important;
        }
        :global(.source-strip button),
        :global(.source-strip strong),
        :global(.mobile-metrics span),
        :global(.choice),
        :global(.final-meta span),
        :global(.version-top span),
        :global(.version-top strong) {
          border-color: var(--ee-border) !important;
          background: var(--ee-card-muted) !important;
          color: var(--ee-muted) !important;
        }
        :global(.source-strip button.active),
        :global(.source-strip strong),
        :global(.structure.selected),
        :global(.paragraph.marked),
        :global(.version-card.current) {
          border-color: var(--ee-primary) !important;
          background: var(--ee-secondary) !important;
          color: var(--ee-text) !important;
          box-shadow: 0 0 0 3px rgba(185, 90, 78, 0.12) !important;
        }
        :global(.error),
        :global(.voice-error),
        :global(.provider-error) {
          border-color: #7f2f3f !important;
          background: #f7ded8 !important;
          color: var(--ee-primary-hover) !important;
        }
        :global(.writing-hint),
        :global(.validation-card),
        :global(.tts-status) {
          border-color: #6e5522 !important;
          background: #f6ead0 !important;
          color: #7a5427 !important;
        }
        :global(.media-player),
        :global(.mobile-player),
        :global(.mobile-listening-panel) {
          border-color: var(--ee-border) !important;
          background: var(--ee-card) !important;
          color: var(--ee-text) !important;
          box-shadow: 0 18px 38px rgba(86, 55, 48, 0.14) !important;
        }
        :global(input[type="range"]) {
          accent-color: var(--ee-primary);
        }
        :global(audio) {
          width: 100%;
          color-scheme: light;
        }
        :global(.guide-backdrop) {
          background: rgba(58, 32, 40, 0.20) !important;
        }
        :global(.guide-button),
        :global(.close-button) {
          border-color: var(--ee-border) !important;
          background: var(--ee-secondary) !important;
          color: var(--ee-text) !important;
        }
        :global(.flow-item strong) {
          color: var(--ee-primary) !important;
        }
        /* Warm editorial override: keep MVP surfaces aligned with the product shell. */
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
          box-shadow: 0 18px 42px rgba(86, 55, 48, 0.12) !important;
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
          background: var(--ee-surface) !important;
          box-shadow: 0 0 0 3px rgba(185, 90, 78, 0.16) !important;
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
          background: var(--ee-secondary) !important;
          color: var(--ee-text) !important;
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
          background: var(--ee-surface-soft) !important;
          color: var(--text-primary) !important;
          box-shadow: 0 0 0 3px rgba(185, 90, 78, 0.12) !important;
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
          background: var(--ee-primary) !important;
          color: var(--ee-surface) !important;
          box-shadow: 0 0 0 3px rgba(185, 90, 78, 0.12) !important;
        }
        :global(.primary:hover:not(:disabled)),
        :global(.primary-action:hover:not(:disabled)),
        :global(.player-main-button:hover:not(:disabled)),
        :global(.player-pause:hover:not(:disabled)),
        :global(.button-row button:first-child:hover:not(:disabled)),
        :global(.workflow-step > button:first-of-type:hover:not(:disabled)) {
          border-color: var(--accent-primary-hover) !important;
          background: var(--ee-primary-hover) !important;
          color: var(--ee-surface) !important;
        }
        :global(button:disabled),
        :global(.primary:disabled),
        :global(.secondary:disabled),
        :global(.copy-action:disabled) {
          border-color: var(--ee-border) !important;
          background: var(--ee-card-muted) !important;
          color: var(--text-disabled) !important;
          opacity: 0.65 !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
        }
        :global(.source-clear),
        :global(button[disabled] + button:last-child) {
          color: var(--ee-primary-hover);
        }
        :global(.error),
        :global(.voice-error),
        :global(.provider-error) {
          border-color: #d9a49b !important;
          background: #f7ded8 !important;
          color: var(--error) !important;
        }
        :global(.writing-hint),
        :global(.validation-card),
        :global(.tts-status),
        :global(.rough-warning),
        :global(.warnings) {
          border-color: #d8bd8f !important;
          background: #f6ead0 !important;
          color: var(--warning) !important;
        }
        :global(.warnings.empty) {
          border-color: #c5cda5 !important;
          background: #eef1df !important;
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
          color: var(--ee-text) !important;
          box-shadow: 0 0 0 3px rgba(185, 90, 78, 0.12) !important;
        }
        :global(.flow-item span) {
          border-color: var(--accent-primary) !important;
          background: var(--ee-secondary) !important;
          color: var(--ee-text) !important;
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
        :global(.work-column textarea) {
          border-color: rgba(255, 246, 239, 0.16) !important;
          background: var(--ee-editor-bg) !important;
          color: var(--ee-editor-text) !important;
          caret-color: var(--ee-primary);
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
