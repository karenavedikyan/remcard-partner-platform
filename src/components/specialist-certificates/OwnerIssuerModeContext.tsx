"use client";

import { createContext, useContext } from "react";

export type OwnerIssuerAccessMode = "specialist" | "legacy";

const Ctx = createContext<OwnerIssuerAccessMode | null>(null);

export function OwnerIssuerModeProvider({
  mode,
  children,
}: {
  mode: OwnerIssuerAccessMode;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={mode}>{children}</Ctx.Provider>;
}

export function useOwnerIssuerMode(): OwnerIssuerAccessMode | null {
  return useContext(Ctx);
}
