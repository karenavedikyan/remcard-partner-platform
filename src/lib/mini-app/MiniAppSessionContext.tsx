"use client";

import { createContext, useContext, useMemo } from "react";
import type { MiniAppEmbeddedContext } from "./embedded-context";
import type { MiniAppPlatform } from "./types";

export type MiniAppSessionContextValue = {
  platform: MiniAppPlatform;
  embeddedContext: MiniAppEmbeddedContext;
};

const MiniAppSessionContext = createContext<MiniAppSessionContextValue | null>(null);

export function MiniAppSessionProvider({
  platform,
  embeddedContext,
  children,
}: MiniAppSessionContextValue & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({ platform, embeddedContext }),
  [platform, embeddedContext]);
  return <MiniAppSessionContext.Provider value={value}>{children}</MiniAppSessionContext.Provider>;
}

export function useMiniAppSession(): MiniAppSessionContextValue | null {
  return useContext(MiniAppSessionContext);
}