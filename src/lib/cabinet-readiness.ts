export type ConsentRequirementStatus =
  | "missing"
  | "stale"
  | "withdrawn"
  | "no_active_document";

export type ConsentRequirement = {
  kind: string;
  legalDocumentId: string | null;
  version: string | null;
  url: string;
  status: ConsentRequirementStatus;
};

export type CabinetReadiness = {
  nextStep: "consents" | "profile" | "ready";
  missingConsents: ConsentRequirement[];
  needsProfileOnboarding: boolean;
  canAccessCabinet: boolean;
  isEmployee: boolean;
  isAdmin: boolean;
};

/** Login consents only — profile offer is handled on onboarding. */
export function loginConsentRequirements(readiness: CabinetReadiness): ConsentRequirement[] {
  return readiness.missingConsents.filter((c) => c.kind === "PERSONAL_DATA" || c.kind === "TERMS");
}

export function hasPendingLoginConsents(readiness: CabinetReadiness): boolean {
  return loginConsentRequirements(readiness).length > 0;
}
