"use client";

import { createContext, useContext } from "react";

export type OwnerIssuerAccessMode = "specialist" | "legacy" | "business";

export type OwnerIssuerModeValue = {
  mode: OwnerIssuerAccessMode;
  /** Set when mode is business (store/company owner shell). */
  businessPartnerType?: "STORE" | "COMPANY";
  /** From `/api/auth/me` in OwnerIssuerGate (session role). */
  canLinkOnboardingHistory?: boolean;
  /** False for branch employees without `canManageCertificates`; undefined means unchanged (owner/specialist). */
  canIssueCertificates?: boolean;
  /** Branch employee shell: certificates are read-only here except issuing. */
  isBranchStaff?: boolean;
  /** Branch employee: own certificate branches, source of the "Все мои филиалы" filter. */
  staffBranches?: Array<{ id: string; name: string; city: string; address?: string | null }>;
};

const Ctx = createContext<OwnerIssuerModeValue | null>(null);

export function OwnerIssuerModeProvider({
  mode,
  businessPartnerType,
  canLinkOnboardingHistory,
  canIssueCertificates,
  isBranchStaff,
  staffBranches,
  children,
}: {
  mode: OwnerIssuerAccessMode;
  businessPartnerType?: "STORE" | "COMPANY";
  canLinkOnboardingHistory?: boolean;
  canIssueCertificates?: boolean;
  isBranchStaff?: boolean;
  staffBranches?: Array<{ id: string; name: string; city: string; address?: string | null }>;
  children: React.ReactNode;
}) {
  return (
    <Ctx.Provider value={{ mode, businessPartnerType, canLinkOnboardingHistory, canIssueCertificates, isBranchStaff, staffBranches }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOwnerIssuerMode(): OwnerIssuerAccessMode | null {
  return useContext(Ctx)?.mode ?? null;
}

export function useOwnerIssuerModeValue(): OwnerIssuerModeValue | null {
  return useContext(Ctx);
}
