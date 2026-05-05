/** Viewport < 768 */
export const MOBILE_MAX = 767;
/** 768 <= viewport <= 1023 */
export const TABLET_MIN = 768;
export const TABLET_MAX = 1023;
/** Viewport >= 1024 — full desktop console */
export const DESKTOP_MIN = 1024;

/**
 * Layout preference for wide viewports. Narrow viewports always use the mobile shell
 * (single-column / step layout over the same engine state).
 * @see effectiveMobileLayout in page.tsx
 */
export type ViewMode = "auto" | "desktop" | "mobile";

/** @deprecated Use `ViewMode` — same union, clearer name for product docs */
export type ConsoleViewPreference = ViewMode;

export const CONSOLE_VIEW_STORAGE_KEY = "essayengine-console-view-preference";
