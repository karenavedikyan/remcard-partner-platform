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
  author: string;
  text: string;
  reason?: string;
};

/** List/drill row — prototype `Appeal` fields required for observer UI + stats. */
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
  /** Receiving-partner CRM notes — read-only for observer; not personal overlay. */
  privateNotes?: string | null;
  purchaseId?: string | null;
  paidAt?: string | null;
  shippedAt?: string | null;
  paidAmount?: number | null;
  refusedReason?: string | null;
};

/** Detail — adds immutable timeline (prototype `history[]`). */
export type ObserverReferredAppealDetail = ObserverReferredAppeal & {
  history: ObserverAppealHistoryEntry[];
  createdAt: string;
  sourceKey?: string | null;
  clientContact?: string | null;
};

export type ObserverPartnerMeta = {
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
  beforeTrash?: ObserverPersonalBucket | null;
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
