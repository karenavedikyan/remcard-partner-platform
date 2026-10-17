export type SpecialistR06Status = {
  contractVersion: string;
  featureEnabled: boolean;
  hasSpecialistActivity: boolean;
  eligible: boolean;
  userId: string;
  ineligibleReason: string | null;
};

export type SpecialistKindId =
  | "designer"
  | "foreman"
  | "master"
  | "architect"
  | "engineer"
  | "supervisor"
  | "other";

export type SpecialistProfileDraftPayload = {
  displayName?: string;
  city?: string;
  specialistKind?: SpecialistKindId | "";
  specialistTitle?: string;
  productCategoryIds?: string[];
  serviceSpecializationIds?: string[];
  navigatorStageIds?: string[];
  partnerWorkMode?: string;
  areas?: string;
  partnershipContactPhone?: string;
  partnershipContactEmail?: string;
  partnershipContactName?: string;
  publicSite?: string;
  publicTelegram?: string;
};

export type SpecialistDraftResponse = {
  contractVersion: string;
  featureEnabled: boolean;
  step: number;
  version: number;
  payload: SpecialistProfileDraftPayload;
  savedProfile: SpecialistProfileDraftPayload;
  hasDraft: boolean;
};
