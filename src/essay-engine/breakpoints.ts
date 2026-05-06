/** Viewport < 768 */
export const MOBILE_MAX = 767;
/** 768 <= viewport <= 1023 */
export const TABLET_MIN = 768;
export const TABLET_MAX = 1023;
/** Viewport >= 1024 — full desktop console */
export const DESKTOP_MIN = 1024;

/** Phone-width preview when Mobile Friendly View is forced on a wide viewport (see `page.tsx`). Tablet (~768px) can be added later as a toggle. */
export const MOBILE_PREVIEW_PHONE_WIDTH_PX = 430;

/**
 * Layout preference for wide viewports. Narrow viewports always use the mobile shell
 * (single-column / step layout over the same engine state).
 * @see effectiveMobileLayout in page.tsx
 */
export type ViewMode = "auto" | "desktop" | "mobile";

/** @deprecated Use `ViewMode` — same union, clearer name for product docs */
export type ConsoleViewPreference = ViewMode;

export const CONSOLE_VIEW_STORAGE_KEY = "essayengine-console-view-preference";
