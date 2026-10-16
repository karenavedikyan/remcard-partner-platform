export type AgentProfileDraftPayload = {
  displayName?: string;
  city?: string;
  audience?: string;
  channel?: string;
  contactPhone?: string;
  contactEmail?: string;
};

export type AgentProfileDraftResponse = {
  contractVersion: string;
  pilotEnabled: boolean;
  active: boolean;
  step: number;
  version: number;
  draftEpoch: number;
  payload: AgentProfileDraftPayload;
  savedProfile?: AgentProfileDraftPayload;
  hasDraft?: boolean;
  /** Saved profile on server (independent of open draft). */
  profileSaved?: boolean;
  profileComplete?: boolean;
};

export type AgentProfileStatusResponse = {
  contractVersion: string;
  featureEnabled: boolean;
  hasAgentActivity: boolean;
  eligible: boolean;
  profileComplete: boolean;
  userId: string;
  ineligibleReason?: string | null;
};

export type AgentRequisitesItem = {
  id: string;
  legalSideId?: string;
  kind: "person" | "ip" | "company" | string;
  label?: string | null;
  legalName: string;
  inn: string | null;
  kpp: string | null;
  bankName: string | null;
  bik: string | null;
  accountNumber?: string | null;
  accountNumberMasked: string | null;
  corrAccount?: string | null;
  corrAccountMasked: string | null;
  isPrimary: boolean;
  applyForNextPayout: boolean;
  isArchived: boolean;
  version: number;
};
