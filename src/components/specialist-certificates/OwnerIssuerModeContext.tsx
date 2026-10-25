"use client";

import { createContext, useContext } from "react";

export type OwnerIssuerAccessMode = "specialist" | "legacy" | "business";

export type OwnerIssuerModeValue = {
  mode: OwnerIssuerAccessMode;
  /** Set when mode is business (store/company owner shell). */
  businessPartnerType?: "STORE" | "COMPANY";
};

const Ctx = createContext<OwnerIssuerModeValue | null>(null);

export function OwnerIssuerModeProvider({
  mode,
  businessPartnerType,
  children,
}: {
  mode: OwnerIssuerAccessMode;
  businessPartnerType?: "STORE" | "COMPANY";
  children: React.ReactNode;
}) {
  return (
    <Ctx.Provider value={{ mode, businessPartnerType }}>{children}</Ctx.Provider>
  );
}

export function useOwnerIssuerMode(): OwnerIssuerAccessMode | null {
  return useContext(Ctx)?.mode ?? null;
}

export function useOwnerIssuerModeValue(): OwnerIssuerModeValue | null {
  return useContext(Ctx);
}
