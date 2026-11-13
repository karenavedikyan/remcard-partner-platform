/**
 * Partner «Клиенты» view-models — aligned with frozen prototype
 * `3dc31836` (`client-appeals.js`, `observer-personal-list.js`).
 * K8 (navigator) is source of truth for persistence; these types are the
 * partner-platform contract inventory (P2 coordinator).
 */

/** Prototype `SYSTEM` in client-appeals.js */
export const CLIENTS_APPEAL_SYSTEM_STAGE = {
  NEW: "sys_new",
  PAID: "sys_paid",
  SHIPPED: "sys_shipped",
  RETURN: "sys_return",
  REFUSED: "sys_refused",
} as const;

export type ClientsAppealSystemStageId =
  (typeof CLIENTS_APPEAL_SYSTEM_STAGE)[keyof typeof CLIENTS_APPEAL_SYSTEM_STAGE];

/** Custom pipeline stage id per receiving partner (`workingStages[].id`). */
export type ObserverAppealStageId = ClientsAppealSystemStageId | (string & {});

export type ObserverAppealHistoryEntry = {
  at: string;
  /** K8 wire: `authorLabel`; adapter maps to prototype `author`. */
  author: string;
  text: string;
  reason?: string;
};

/**
 * Canonical partner identity for observer (P2 adapter — not User.id for receiving).
 * Prototype `receivingPartnerId` → **`receivingBranchId`**.
 * Prototype `referrerPartnerId` → **`referrerProUserId`** (certificate issuer).
 */
export type ObserverBranchPartnerIdentity = {
  receivingBranchId: string;
  receivingOrganizationId: string;
};

/**
 * K2 observer wire allowlist (GAP-K8-D). P5/P6 map from this — never pass through full row.
 * K8 must converge `dto.ts` to this shape; until then adapter rejects unknown keys.
 */
export type ObserverAppealK2WireDto = {
  id: string;
  clientDisplayName: string;
  certificateId: string | null;
  receivingBranchId: string;
  receivingOrganizationId: string;
  referrerProUserId: string | null;
  originKind: "CERTIFICATE" | "MANUAL";
  stageKey: string;
  interest: string | null;
  clientCity: string | null;
  budgetHint: string | null;
  discountPercent: number | null;
  certValidUntil: string | null;
  refusedReason: string | null;
  shippedAt: string | null;
  orderId: string | null;
  paidAmountKopecks: number | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  manualSourceKey?: string | null;
};

/** Grouping card for observer list — branch display, not org owner User.id. */
export type ObserverBranchPartnerMetaWire = {
  receivingBranchId: string;
  receivingOrganizationId: string;
  displayName: string;
  city?: string | null;
  category?: string | null;
};

/**
 * Observer list row (partner UI). Maps from `ObserverAppealK2WireDto` via stable renames only.
 */
export type ObserverReferredAppeal = {
  id: string;
  clientName: string;
  certificateId: string;
  receivingPartnerId: string;
  referrerPartnerId: string;
  interest?: string | null;
  clientCity?: string | null;
  budgetHint?: string | null;
  stageId: ObserverAppealStageId;
  updatedAt: string;
  referralAt?: string | null;
  discountPercent?: number | null;
  certValidUntil?: string | null;
  manualEntry?: boolean;
  purchaseId?: string | null;
  paidAt?: string | null;
  shippedAt?: string | null;
  paidAmount?: number | null;
  refusedReason?: string | null;
  /** Settings scope helper until GAP-K8-E resolved; not shown as partner id in UI. */
  receivingOrganizationId?: string;
};

/** Detail — adds immutable timeline (prototype `history[]`). */
export type ObserverReferredAppealDetail = ObserverReferredAppeal & {
  history: ObserverAppealHistoryEntry[];
  createdAt: string;
  sourceKey?: string | null;
};

export type ObserverPartnerMeta = {
  /** Same as `receivingBranchId` (prototype receiving partner key). */
  id: string;
  name: string;
  city?: string | null;
  category?: string | null;
  receivingOrganizationId?: string;
};

export type ObserverPartnerAppealStats = {
  total: number;
  inWork: number;
  paidThrough: number;
  refusals: number;
  returns: number;
  lastUpdate: string;
  conv: string;
};

export type ObserverPersonalBucket = "active" | "archived" | "trash";

/** Prototype `workspace.observerPersonal.meta[appealId]` */
export type ObserverPersonalMeta = {
  alias?: string | null;
  tag?: string | null;
  note?: string | null;
  bucket?: ObserverPersonalBucket;
  /** K8 column `beforeTrashBucket`; lowercase in JSON at API boundary. */
  beforeTrash?: ObserverPersonalBucket | null;
  version?: number;
};

export type ClientsParityDirection = "incoming" | "at-partners";

export type ObserverAppealsLoadResult =
  | {
      ok: true;
      appeals: ObserverReferredAppeal[];
      partners: ObserverPartnerMeta[];
      personalMeta?: Record<string, ObserverPersonalMeta>;
      nextCursor?: string | null;
    }
  | {
      ok: false;
      code: "BLOCKED_CONTRACT";
      blockerId: string;
      message: string;
      missingRoutes: string[];
    };

/** Receiving CRM (`client-appeals.js` at-partners flip) — inventoried for K8; not agent UI scope. */
export type ClientAppealWorkingStage = {
  id: string;
  label: string;
};

export type ReceivingClientAppeal = ObserverReferredAppeal & {
  history: ObserverAppealHistoryEntry[];
  createdAt: string;
  manualEntry?: boolean;
};
