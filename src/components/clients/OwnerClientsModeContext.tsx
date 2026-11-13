"use client";

import { createContext, useContext } from "react";

export type OwnerClientsAccessMode = "agent" | "specialist" | "business";

type OwnerClientsModeValue = {
  mode: OwnerClientsAccessMode;
  businessPartnerType?: "STORE" | "COMPANY";
  canLinkOnboardingHistory?: boolean;
};

const OwnerClientsModeContext = createContext<OwnerClientsModeValue | null>(null);

export function OwnerClientsModeProvider({
  mode,
  businessPartnerType,
  canLinkOnboardingHistory,
  children,
}: {
  mode: OwnerClientsAccessMode;
  businessPartnerType?: "STORE" | "COMPANY";
  canLinkOnboardingHistory?: boolean;
  children: React.ReactNode;
}) {
  return (
    <OwnerClientsModeContext.Provider
      value={{ mode, businessPartnerType, canLinkOnboardingHistory }}
    >
      {children}
    </OwnerClientsModeContext.Provider>
  );
}

export function useOwnerClientsMode(): OwnerClientsAccessMode | null {
  return useContext(OwnerClientsModeContext)?.mode ?? null;
}

export function useOwnerClientsBusinessPartnerType(): "STORE" | "COMPANY" | undefined {
  return useContext(OwnerClientsModeContext)?.businessPartnerType;
}

export function useOwnerClientsCanLinkOnboardingHistory(): boolean | undefined {
  return useContext(OwnerClientsModeContext)?.canLinkOnboardingHistory;
}
