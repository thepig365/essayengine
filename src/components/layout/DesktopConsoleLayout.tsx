"use client";

import type { ReactNode } from "react";

/** Desktop shell: use `display: contents` so children participate in parent `.workspace` grid. */
export function DesktopConsoleLayout({ children }: { children: ReactNode }) {
  return <div className="desktop-console-layout">{children}</div>;
}
