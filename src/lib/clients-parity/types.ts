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
 * Trusted receiving principal + optional org/branch scope (K8 contract target).
 * Prototype `receivingPartnerId` = **receiving principal `User.id`** (solo specialist has no org).
 * `referrerPartnerId` = **`referrerProUserId`** (certificate issuer).
 */
export type ClientsReceivingPartnerIdentity = {
  /** Required trusted column — actual receiving partner principal User.id */
  receivingPartnerUserId: string;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
};

/** @deprecated Use ClientsReceivingPartnerIdentity */
export type ObserverBranchPartnerIdentity = ClientsReceivingPartnerIdentity;

/**
 * K2 observer wire allowlist (GAP-K8-D). P5/P6 map from this — never pass through full row.
 * K8 must converge `dto.ts` to this shape; until then adapter rejects unknown keys.
 */
export type ObserverAppealK2WireDto = {
  id: string;
  clientDisplayName: string;
  certificateId: string | null;
  receivingPartnerUserId: string;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
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

/** K2 list `receivingPartners[]` wire — group by receiving principal User.id. */
export type ObserverReceivingPartnerMetaWire = {
  receivingPartnerUserId: string;
  displayName: string;
  city?: string | null;
  category?: string | null;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
};

/** @deprecated Use ObserverReceivingPartnerMetaWire */
export type ObserverBranchPartnerMetaWire = ObserverReceivingPartnerMetaWire;

/**
 * Observer list row (partner UI). Maps from `ObserverAppealK2WireDto` via stable renames only.
 */
export type ObserverReferredAppeal = {
  id: string;
  clientName: string;
  certificateId: string;
  /** Prototype `receivingPartnerId` — trusted receiving principal User.id */
  receivingPartnerId: string;
  referrerPartnerId: string;
  receivingBranchId?: string | null;
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
  receivingOrganizationId?: string | null;
};

/** Detail — adds immutable timeline (prototype `history[]`). */
export type ObserverReferredAppealDetail = ObserverReferredAppeal & {
  history: ObserverAppealHistoryEntry[];
  createdAt: string;
  sourceKey?: string | null;
};

export type ObserverPartnerMeta = {
  /** `receivingPartnerUserId` — prototype partner card key. */
  id: string;
  name: string;
  city?: string | null;
  category?: string | null;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
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

/**
 * K2 navigator HTTP list @ e11f7e59 target (before P5 rename).
 * @see CLIENTS_LIST_RESPONSE_CONTRACT.k2HttpObserverTarget in contracts.ts
 */
export type K2ObserverListHttpResponse = {
  items: ObserverAppealK2WireDto[];
  receivingPartners: ObserverReceivingPartnerMetaWire[];
  personalMeta?: Record<string, ObserverPersonalMeta>;
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
};

/** K8 lib + K1 receiving list envelope — not `{ appeals }`. */
export type ClientAppealsLibListEnvelope<TItem> = {
  items: TItem[];
  nextCursor: string | null;
};

/** K5 PATCH/GET `meta` wire (navigator @ 86ac3e35). */
export type NavigatorPersonalMetaProjection = {
  appealId: string;
  alias: string | null;
  tag: string | null;
  note: string | null;
  bucket: ObserverPersonalBucket;
  version: number;
  updatedAt: string;
};

/** K5 batch row in `processed[]`. */
export type NavigatorPersonalBatchResult = {
  action: "move" | "restore" | "setTag";
  mode: "atomic" | "best_effort";
  processedCount: number;
  skippedCount: number;
  processed: NavigatorPersonalMetaProjection[];
  skipped: Array<{ appealId: string; reason: string }>;
};

export type ObserverAppealsLoadResult =
  | {
      ok: true;
      appeals: ObserverReferredAppeal[];
      partners: ObserverPartnerMeta[];
      personalMeta?: Record<string, ObserverPersonalMeta>;
      /** P3 may read this alias when normalizing list JSON; server target key is `personalMeta`. */
      personalOverlays?: Record<string, ObserverPersonalMeta>;
      nextCursor?: string | null;
      page?: number;
      limit?: number;
      total?: number;
      hasMore?: boolean;
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
