"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string, ssrMatches = false): boolean {
  const [matches, setMatches] = useState(ssrMatches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
