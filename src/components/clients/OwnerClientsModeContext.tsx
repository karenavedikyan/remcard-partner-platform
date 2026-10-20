"use client";

import { createContext, useContext } from "react";

export type OwnerClientsAccessMode = "agent" | "specialist";

const OwnerClientsModeContext = createContext<OwnerClientsAccessMode | null>(null);

export function OwnerClientsModeProvider({
  mode,
  children,
}: {
  mode: OwnerClientsAccessMode;
  children: React.ReactNode;
}) {
  return (
    <OwnerClientsModeContext.Provider value={mode}>{children}</OwnerClientsModeContext.Provider>
  );
}

export function useOwnerClientsMode(): OwnerClientsAccessMode | null {
  return useContext(OwnerClientsModeContext);
}
