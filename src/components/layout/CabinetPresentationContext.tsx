"use client";

import { createContext, useContext } from "react";
import type { CabinetPresentationSnapshot } from "@/lib/cabinet-presentation/types";

const CabinetPresentationContext = createContext<CabinetPresentationSnapshot | null>(null);

export function CabinetPresentationProvider({
  value,
  children,
}: {
  value: CabinetPresentationSnapshot;
  children: React.ReactNode;
}) {
  return (
    <CabinetPresentationContext.Provider value={value}>{children}</CabinetPresentationContext.Provider>
  );
}

export function useCabinetPresentation(): CabinetPresentationSnapshot | null {
  return useContext(CabinetPresentationContext);
}
