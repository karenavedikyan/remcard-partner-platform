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
  payload: AgentProfileDraftPayload;
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
  kind: "person" | "ip" | "company" | string;
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
