/** Viewport < 768 */
export const MOBILE_MAX = 767;
/** 768 <= viewport <= 1023 */
export const TABLET_MIN = 768;
export const TABLET_MAX = 1023;
/** Viewport >= 1024 — full desktop console */
export const DESKTOP_MIN = 1024;

/** Header toggle + optional persistence: real narrow viewports always use mobile shell. */
export type ConsoleViewPreference = "auto" | "desktop" | "mobile";

export const CONSOLE_VIEW_STORAGE_KEY = "essayengine-console-view-preference";
