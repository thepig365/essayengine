"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

/**
 * Full controller for Essay Engine UI. Typed loosely so the large legacy surface
 * can be migrated incrementally without blocking the responsive shell refactor.
 */
export type EssayEngineController = Record<string, unknown> & {
  mobileWorkflowStepIndex: number;
  setMobileWorkflowStepIndex: (n: number) => void;
  mobileShellTab: "workspace" | "tools" | "sources";
  setMobileShellTab: (t: "workspace" | "tools" | "sources") => void;
  mobileToolsDrawerOpen: boolean;
  setMobileToolsDrawerOpen: (open: boolean) => void;
  /** True when viewport is at least 1024px (desktop console layout). */
  isDesktopLayout: boolean;
};

const EssayEngineContext = createContext<EssayEngineController | null>(null);

export function EssayEngineProvider({
  value,
  children,
}: {
  value: EssayEngineController;
  children: ReactNode;
}) {
  return <EssayEngineContext.Provider value={value}>{children}</EssayEngineContext.Provider>;
}

export function useEssayEngine(): EssayEngineController {
  const ctx = useContext(EssayEngineContext);
  if (!ctx) {
    throw new Error("useEssayEngine must be used within EssayEngineProvider");
  }
  return ctx;
}
