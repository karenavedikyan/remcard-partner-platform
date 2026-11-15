/** PRO owner certificate policy — mirrors K1 wire (no client-trusted issuance limits). */

export type CertificatePolicyCategoryRate = {
  category: string;
  categoryLabel: string;
  poolPercent: number;
};

export type CertificatePolicyTerms = {
  validityDays: number;
  purchaseLimit: number;
  minimumPurchaseAmount: number | null;
  promotionsCompatible: boolean;
  exclusionsText: string | null;
  categoryRates: CertificatePolicyCategoryRate[];
};

export type CertificatePolicyScope = "general" | "individual";

export type CertificatePolicyCounterpartyStatus =
  | "general"
  | "individual"
  | "pending_outgoing"
  | "pending_incoming"
  /** Prior individual proposal declined — effective terms unchanged. */
  | "rejected_outgoing";

export type CertificatePolicyCounterparty = {
  userId: string;
  displayName: string;
  roleLabel: string;
  initials: string;
  status: CertificatePolicyCounterpartyStatus;
  partnershipId: string | null;
  /** Effective terms for this counterparty (general or approved individual). */
  effective: CertificatePolicyTerms;
  /** OCC for approved individual terms document (absent while on general only). */
  individualVersion?: number | null;
  /** Canonical cooperation-pool revision for this counterparty pair (navigator-issued). */
  categoryRatesRevision?: string | null;
  pendingProposal?: CertificatePolicyProposal | null;
  /** Server individual document — last reject timestamp when status is rejected_outgoing. */
  lastRejectedAt?: string | null;
};

export type CertificatePolicyProposal = {
  id: string;
  version: number;
  proposerUserId: string;
  receiverUserId: string;
  proposed: CertificatePolicyTerms;
  createdAt: string;
  /** Effective terms while proposal is open (never the proposal body). */
  effective: CertificatePolicyTerms;
};

export type CertificatePolicyGeneralDocument = {
  scope: "general";
  effective: CertificatePolicyTerms;
  version: number;
  /** Canonical pool fingerprint — stale rate changes reject saves. */
  categoryRatesRevision?: string | null;
};

export type CertificatePolicyIndividualDocument = {
  scope: "individual";
  counterpartyUserId: string;
  effective: CertificatePolicyTerms;
  version: number;
  pendingProposal?: CertificatePolicyProposal | null;
  lastRejectedAt?: string | null;
};

export type CertificatePolicyWorkspace = {
  general: CertificatePolicyGeneralDocument;
  counterparties: CertificatePolicyCounterparty[];
  /** Proposals where current user must respond (never self-approve). */
  incomingProposals: CertificatePolicyProposal[];
};

export type CertificatePolicyPatchAction =
  | "save_general"
  | "propose_individual"
  | "approve_proposal"
  | "reject_proposal";

export type CertificatePolicyPatchBody = {
  action: CertificatePolicyPatchAction;
  /** General document version (save_general / propose_individual). */
  expectedVersion: number;
  /** Individual document version when proposing terms for one counterparty. */
  expectedIndividualVersion?: number;
  /** Open proposal row version for approve/reject. */
  expectedProposalVersion?: number;
  categoryRatesRevision?: string | null;
  counterpartyCategoryRatesRevision?: string | null;
  terms?: CertificatePolicyTerms;
  counterpartyUserId?: string;
  proposalId?: string;
};

/** Public catalog / program summary — general terms only. */
export type CertificatePolicyPublicSummary = {
  validityDays: number;
  purchaseLimit: number;
  minimumPurchaseAmount: number | null;
  promotionsCompatible: boolean;
  exclusionsText: string | null;
  items: Array<{ category: string; categoryLabel: string; poolPercent: number }>;
  truncated?: boolean;
};

/** Per-recipient effective terms at issuance (from available-partners). */
export type CertificateRecipientPolicySnapshot = {
  validityDays: number;
  purchaseLimit: number;
  minimumPurchaseAmount: number | null;
  promotionsCompatible: boolean;
  exclusionsText: string | null;
  policySource: "general" | "individual";
  validUntil: string | null;
};

export type CertificatePolicyApiErrorCode =
  | "VALIDATION"
  | "NO_OP"
  | "VERSION_CONFLICT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SELF_APPROVAL"
  | "BLOCKED_CONTRACT";