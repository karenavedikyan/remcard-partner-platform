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
 * Observer list row (partner UI). Maps from K8 `ClientAppealRecord` via adapter.
 * `receivingPartnerId` holds **receivingBranchId** (prototype “partner” key).
 * `referrerPartnerId` holds **referrerProUserId** (User.id).
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
};

/** K2 wire shape — MUST NOT include receiving CRM tenant fields (GAP-K8-5). */
export type ObserverClientAppealPublicDto = Omit<
  ObserverReferredAppeal,
  never
> & {
  /** Explicitly disallowed on observer wire — adapter strips if present in DB DTO. */
  privateNotes?: never;
  clientContact?: never;
};

/** Detail — adds immutable timeline (prototype `history[]`). */
export type ObserverReferredAppealDetail = ObserverClientAppealPublicDto & {
  history: ObserverAppealHistoryEntry[];
  createdAt: string;
  sourceKey?: string | null;
};

export type ObserverPartnerMeta = {
  /** Receiving branch id for grouping (K8 `receivingBranchId`). */
  id: string;
  name: string;
  city?: string | null;
  category?: string | null;
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
