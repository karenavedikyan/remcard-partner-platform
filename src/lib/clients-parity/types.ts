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

/**
 * Receiving CRM full history only (K1 detail) — not observer referrer timeline.
 * @see CLIENTS_RECEIVING_HTTP_CONTRACT detail; observer uses ObserverPublicTimelineEvent.
 */
export type ReceivingAppealHistoryWireEntry = {
  at: string;
  authorLabel: string;
  text: string;
  reason?: string | null;
  actorUserId?: string | null;
};

/** @deprecated alias — receiving CRM only */
export type ObserverAppealHistoryEntry = {
  at: string;
  /** K8 wire: `authorLabel`; adapter maps to prototype `author`. */
  author: string;
  text: string;
  reason?: string;
};

/**
 * Observer referrer detail timeline — prototype `publicReferrerTimeline` output.
 * Safe wire for P4: only `at` + normalized `text` (no author/reason/id).
 */
export type ObserverPublicTimelineEvent = {
  at: string;
  text: string;
};

/** K2 GET /api/pro/referred-appeals/:id target @ CLIENTS_OBSERVER_DETAIL_HTTP_CONTRACT. */
export type ObserverReferredAppealDetailHttp = {
  appeal: ObserverAppealK2WireDto;
  receivingPartner: ObserverReceivingPartnerMetaWire;
  timeline: ObserverPublicTimelineEvent[];
  purchase: { amountKopecks: number; note: string | null } | null;
};

/**
 * Trusted receiving principal + optional org/branch scope (K8 contract target).
 * Prototype `receivingPartnerId` = **receiving principal `User.id`** (solo specialist has no org).
 * `referrerPartnerId` = **`referrerProUserId`** (certificate issuer).
 */
export type ClientsReceivingPartnerIdentity = {
  /** Required trusted column — actual receiving partner principal User.id */
  receivingPartnerUserId: string;
  receivingOrganizationId: string | null;
  receivingBranchId: string | null;
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
  receivingOrganizationId: string | null;
  receivingBranchId: string | null;
  referrerProUserId: string | null;
  /** K2 b0ffd197 optional — human referrer caption. */
  referrerDisplayName?: string | null;
  originKind: "CERTIFICATE" | "MANUAL";
  stageKey: string;
  /** K2 b0ffd197 optional — RECEIVING-scope caption. */
  stageLabel?: string | null;
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
  receivingOrganizationId: string | null;
  receivingBranchId: string | null;
};

/**
 * K2 GET list `partners[]` @ 3c6ccc19 interim (GAP-K8-P) — distinct branch, not principal id.
 * P3 maps to `ObserverPartnerMeta` using appeal-level `receivingPartnerUserId` for card keys.
 */
export type K2ObserverPartnerSummaryInterim = {
  receivingBranchId: string;
  receivingOrganizationId: string;
  displayName: string;
  city?: string | null;
  category?: string | null;
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
  /** K2 optional wire `stageLabel` — display caption; `stageId` stays logic key. */
  stageLabel?: string;
  /** K2 optional wire `referrerDisplayName`. */
  referrerDisplayName?: string | null;
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
  receivingOrganizationId: string | null;
  receivingBranchId: string | null;
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

/** Overlay row joined on list @ K2 — may omit beforeTrash/version until GAP-K5-I closed. */
export type K2PersonalMetaOverlayDto = {
  alias?: string | null;
  tag?: string | null;
  note?: string | null;
  bucket?: ObserverPersonalBucket;
};

export type ClientsParityDirection = "incoming" | "at-partners";

/**
 * Accepted K2 HTTP list @ 3c6ccc19 — `{ appeals, partners, personalMeta, … }`.
 * @see CLIENTS_LIST_RESPONSE_CONTRACT.k2HttpObserverActual in contracts.ts
 */
export type K2ObserverReferredAppealsHttpResponse = {
  appeals: ObserverAppealK2WireDto[];
  partners: K2ObserverPartnerSummaryInterim[];
  personalMeta: Record<string, K2PersonalMetaOverlayDto | null>;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  empty: boolean;
};

export type K2ObserverListHttpResponse = K2ObserverReferredAppealsHttpResponse;

/** Stale envelope @ 72193c78 — do not implement in P3 fetch. */
export type K2ObserverListHttpResponseStale72193c78 = {
  items: ObserverAppealK2WireDto[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  empty: boolean;
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

/** K8 `receivingList.ts` + prototype cabinet buckets — not observer personal trash. */
export type ClientAppealReceivingBucket = "active" | "archive" | "trash";

export type ClientAppealReceivingSourceFilter = "all" | "manual" | "cert";

/** K1 HTTP must expose on list/detail for P6 workspace gates @ CLIENTS_RECEIVING_HTTP_CONTRACT. */
export type ReceivingAppealsAccessWire = {
  mode: "receiving";
  actorUserId: string;
  ownerUserId: string;
  receivingPartnerUserId: string;
  receivingOrganizationId: string | null;
  receivingBranchId: string | null;
  readOnly: boolean;
  accessMode: "specialist" | "business" | "org_workplace_read";
};

/** K1 buildReceivingAccessEnvelope @ 5a51d7b7 — list + detail spreads. */
export type K1ReceivingAccessEnvelope = {
  principal: {
    receivingPartnerUserId: string;
    receivingOrganizationId: string | null;
    receivingBranchId: string | null;
    actorUserId: string;
    ownerUserId: string;
  };
  access: {
    listAllowed: true;
    mutationsAllowed: boolean;
    denialCode: string | null;
  };
  readOnly: boolean;
};

/** K1 GET list @ 5a51d7b7 actual JSON (bucket on wire; tab is display-only incoming). */
export type K1ReceivingListHttpActual = {
  appeals: ReceivingClientAppealRecordWire[];
  nextCursor: string | null;
  bucket: ClientAppealReceivingBucket;
  tab: "incoming";
  readOnly: boolean;
} & Partial<K1ReceivingAccessEnvelope>;

/** Legacy list JSON before bucket/access — P6 mapper still accepts missing bucket. */
export type K1ReceivingListHttpLegacy = {
  appeals: ReceivingClientAppealRecordWire[];
  nextCursor: string | null;
  tab: "incoming";
  readOnly: boolean;
};

/** P6 + K1 target list JSON after GAP-K1-HTTP-* closed. */
export type K1ReceivingListHttpTarget = K1ReceivingListHttpActual &
  Required<Pick<K1ReceivingAccessEnvelope, "principal" | "access">>;

/** K8 `ClientAppealRecord` wire on receiving routes (CRM fields allowed). */
export type ReceivingClientAppealRecordWire = {
  id: string;
  clientDisplayName: string;
  certificateId: string | null;
  receivingPartnerUserId: string;
  receivingOrganizationId: string | null;
  receivingBranchId: string | null;
  referrerProUserId: string | null;
  originKind: "CERTIFICATE" | "MANUAL";
  manualSourceKey?: string | null;
  stageKey: string;
  interest?: string | null;
  clientCity?: string | null;
  budgetHint?: string | null;
  refusedReason?: string | null;
  shippedAt?: string | null;
  purchaseOrderId?: string | null;
  paidAmountKopecks?: number | null;
  paidAt?: string | null;
  privateNotes?: string | null;
  clientContact?: string | null;
  createdAt: string;
  updatedAt: string;
  discountPercent?: number | null;
  certValidUntil?: string | null;
};

export type ReceivingAppealStagePatchBody = {
  stageKey?: string;
  /** Alias accepted by K1 route. */
  stageId?: string;
  expectedRevision?: number | null;
  refusedReason?: string | null;
  shippedAt?: string | null;
};

/** K1 parseAppealProfilePatch — PATCH /client-appeals/:id (not stage). */
export type ReceivingAppealProfilePatchBody = {
  clientDisplayName?: string;
  /** P6 alias */
  clientName?: string;
  manualSourceKey?: string | null;
  manualChannel?: string | null;
  interest?: string | null;
  clientCity?: string | null;
  clientContact?: string | null;
  budgetHint?: string | null;
  privateNotes?: string | null;
  expectedRevision?: number | null;
};

export type ReceivingCertificateEntryPostWire = {
  promoCode: string;
};

export type ReceivingCertificateEntryResponse =
  | { valid: true; outcome: string; appeal?: ReceivingClientAppealRecordWire }
  | { valid: false; reason: string };

/** K1 GET detail @ 5a51d7b7 — history/revision are siblings of appeal, not nested. */
export type K1ReceivingDetailHttpActual = {
  appeal: ReceivingClientAppealRecordWire;
  revision: number;
  history: ReceivingAppealHistoryWireEntry[];
  workingStages: ClientAppealWorkingStage[];
  refusalReasons: string[];
  readOnly?: boolean;
} & Partial<K1ReceivingAccessEnvelope>;

/** Mirrors K8 `ClientAppealManualChannel` @ manualChannels.ts. */
export type ClientAppealManualChannelWire = {
  key: string;
  label: string;
};

/** K8 built-ins — `scan` allowed on certificate flow, rejected on manual POST @ K1. */
export const CLIENT_APPEAL_BUILTIN_MANUAL_SOURCE_KEYS = [
  "phone",
  "messenger",
  "visit",
  "ads",
  "other",
  "scan",
] as const;

export type ClientAppealBuiltinManualSourceKey =
  (typeof CLIENT_APPEAL_BUILTIN_MANUAL_SOURCE_KEYS)[number];

/** Built-in keys + persisted `custom_*` from settings.manualChannels. */
export type ClientAppealManualSourceKeyWire = ClientAppealBuiltinManualSourceKey | `custom_${string}`;

export type ReceivingPartnerSettingsWire = {
  receivingPartnerUserId: string;
  receivingOrganizationId: string | null;
  receivingBranchId: string | null;
  workingStages: ClientAppealWorkingStage[];
  refusalReasons: string[];
  archivedStages: ClientAppealWorkingStage[];
  manualChannels: ClientAppealManualChannelWire[];
  version: number;
  updatedAt: string;
};

/** K1 POST /working-stages when kind=manualChannel @ a71b8f37. */
export type ReceivingManualChannelPostBody = {
  kind: "manualChannel";
  label: string;
  expectedVersion?: number | null;
};

export type ReceivingBatchHttpActual = {
  updated: number;
  failures?: Array<{ id: string; code: string }>;
};

export type ReceivingBatchHttpTarget = {
  updatedIds: string[];
  skippedIds?: string[];
  failures: Array<{ id: string; code: string }>;
};

export type ReceivingClientAppeal = ObserverReferredAppeal & {
  history: ObserverAppealHistoryEntry[];
  createdAt: string;
  manualEntry?: boolean;
  privateNotes?: string | null;
  clientContact?: string | null;
};

/** P6 list row contract (prototype `Appeal` incoming table). */
export type ReceivingAppealUiListRow = {
  id: string;
  clientName: string;
  certificateId: string;
  receivingPartnerUserId: string;
  receivingPartnerId: string;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
  referrerPartnerId: string;
  interest: string;
  clientCity?: string | null;
  budgetHint?: string | null;
  stageId: string;
  refusedReason?: string | null;
  shippedAt?: string | null;
  paidAmount?: number | null;
  paidAt?: string | null;
  sourceKey?: string;
  purchaseId?: string | null;
  createdAt: string;
  updatedAt: string;
  manualEntry?: boolean;
  bucket?: ClientAppealReceivingBucket;
};

/** P6 manual create form. */
export type ReceivingUiManualCreateBody = {
  clientName: string;
  interest?: string;
  clientCity?: string;
  clientContact?: string;
  manualChannel?: ClientAppealBuiltinManualSourceKey | string;
  privateNotes?: string;
};

/** K1 POST body after UI→wire map @ 83f279e8. */
export type K1ManualCreatePostWire = {
  clientDisplayName: string;
  manualSourceKey: string;
  interest?: string | null;
  clientCity?: string | null;
  clientContact?: string | null;
};

/** P6 gates — derived from K1 access wire + readOnly. */
export type ReceivingUiPrincipalAccess = {
  listAllowed: boolean;
  mutationsAllowed: boolean;
  denialCode?: string | null;
};

export const RECEIVING_LIST_DEFAULT_PAGE_SIZE = 25;

export function mapReceivingAppealWireToUiRow(
  wire: ReceivingClientAppealRecordWire,
): ReceivingAppealUiListRow {
  const ownerId = wire.receivingPartnerUserId;
  return {
    id: wire.id,
    clientName: wire.clientDisplayName,
    certificateId: wire.certificateId ?? "",
    receivingPartnerUserId: ownerId,
    receivingPartnerId: ownerId,
    receivingOrganizationId: wire.receivingOrganizationId,
    receivingBranchId: wire.receivingBranchId,
    referrerPartnerId: wire.referrerProUserId ?? "",
    interest: wire.interest ?? "",
    clientCity: wire.clientCity,
    budgetHint: wire.budgetHint,
    stageId: wire.stageKey,
    refusedReason: wire.refusedReason ?? undefined,
    shippedAt: wire.shippedAt ?? undefined,
    paidAmount: wire.paidAmountKopecks ?? undefined,
    paidAt: wire.paidAt ?? undefined,
    sourceKey: wire.manualSourceKey ?? undefined,
    purchaseId: wire.purchaseOrderId ?? undefined,
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
    manualEntry: wire.originKind === "MANUAL",
  };
}

export function mapReceivingUiManualCreateToK1Post(
  body: ReceivingUiManualCreateBody,
): K1ManualCreatePostWire {
  return {
    clientDisplayName: body.clientName.trim(),
    manualSourceKey: body.manualChannel ?? "other",
    interest: body.interest?.trim() || null,
    clientCity: body.clientCity?.trim() || null,
    clientContact: body.clientContact?.trim() || null,
  };
}

export function mapReceivingUiStageIdToK1StagePatch(stageId: string): ReceivingAppealStagePatchBody {
  return { stageKey: stageId };
}

type K1ReceivingAccessBlock = K1ReceivingAccessEnvelope["access"];

function isK1ReceivingAccessBlock(
  value: Partial<ReceivingAppealsAccessWire> | K1ReceivingAccessBlock | null | undefined,
): value is K1ReceivingAccessBlock {
  if (value == null || typeof value !== "object") return false;
  if (!("mutationsAllowed" in value)) return false;
  return typeof value.mutationsAllowed === "boolean";
}

export function mapK1AccessWireToP6Gates(input: {
  access?: Partial<ReceivingAppealsAccessWire> | K1ReceivingAccessBlock | null;
  readOnly?: boolean;
  envelope?: Partial<K1ReceivingAccessEnvelope> | null;
}): ReceivingUiPrincipalAccess {
  const k1Access = input.envelope?.access ?? input.access;
  if (isK1ReceivingAccessBlock(k1Access)) {
    return {
      listAllowed: true,
      mutationsAllowed: k1Access.mutationsAllowed,
      denialCode: k1Access.denialCode ?? null,
    };
  }
  const legacyAccess: Partial<ReceivingAppealsAccessWire> | null =
    input.access != null && !isK1ReceivingAccessBlock(input.access) ? input.access : null;
  const readOnly =
    input.readOnly === true || input.envelope?.readOnly === true || legacyAccess?.readOnly === true;
  const accessMode = legacyAccess?.accessMode;
  const orgListOnly = accessMode === "org_workplace_read";
  return {
    listAllowed: true,
    mutationsAllowed: !readOnly && !orgListOnly,
    denialCode: orgListOnly ? "OWNER_CLIENTS_LIST_CONTEXT_ONLY" : null,
  };
}

export function mapReceivingUiCertificateCodeToK1Promo(
  certificateCode: string,
): ReceivingCertificateEntryPostWire {
  return { promoCode: certificateCode.trim() };
}

export function mapReceivingUiProfilePatchToK1(
  patch: ReceivingAppealProfilePatchBody,
): Omit<ReceivingAppealProfilePatchBody, "clientName" | "manualChannel"> & {
  clientDisplayName?: string;
} {
  const { clientName, manualChannel, ...rest } = patch;
  return {
    ...rest,
    clientDisplayName: patch.clientDisplayName ?? clientName,
    manualSourceKey: patch.manualSourceKey ?? manualChannel ?? undefined,
  };
}

export function normalizeK1ReceivingListHttp(
  json: K1ReceivingListHttpActual | K1ReceivingListHttpLegacy,
): {
  appeals: ReceivingAppealUiListRow[];
  nextCursor: string | null;
  bucket: ClientAppealReceivingBucket;
  tab: "incoming";
  readOnly: boolean;
  access: ReceivingUiPrincipalAccess;
} {
  const bucket = "bucket" in json && json.bucket ? json.bucket : "active";
  return {
    appeals: (json.appeals ?? []).map((row) => ({ ...mapReceivingAppealWireToUiRow(row), bucket })),
    nextCursor: json.nextCursor ?? null,
    bucket,
    tab: json.tab ?? "incoming",
    readOnly: json.readOnly === true,
    access: mapK1AccessWireToP6Gates({
      envelope: "access" in json ? (json as K1ReceivingListHttpActual) : null,
      readOnly: json.readOnly,
    }),
  };
}

export function normalizeK1ReceivingDetailHttp(json: K1ReceivingDetailHttpActual): {
  appeal: ReceivingAppealUiListRow;
  revision: number;
  history: ObserverAppealHistoryEntry[];
  workingStages: ClientAppealWorkingStage[];
  refusalReasons: string[];
  access: ReceivingUiPrincipalAccess;
} {
  return {
    appeal: mapReceivingAppealWireToUiRow(json.appeal),
    revision: json.revision,
    history: (json.history ?? []).map((h) => ({
      at: h.at,
      author: h.authorLabel,
      text: h.text,
      reason: h.reason ?? undefined,
    })),
    workingStages: json.workingStages ?? [],
    refusalReasons: json.refusalReasons ?? [],
    access: mapK1AccessWireToP6Gates({
      envelope: json,
      readOnly: json.readOnly,
    }),
  };
}

export function unwrapK1WorkingStagesResponse(
  payload: ReceivingPartnerSettingsWire | { settings: ReceivingPartnerSettingsWire },
): ReceivingPartnerSettingsWire {
  const raw = "settings" in payload ? payload.settings : payload;
  return {
    ...raw,
    manualChannels: raw.manualChannels ?? [],
  };
}

/** K1 `batchReceivingAppeals` JSON @ a71b8f37 — no `action` field on wire. */
export type K1ReceivingBatchHttpActual = {
  updatedIds: string[];
  skippedIds: string[];
  failures: Array<{ id: string; code: string }>;
};

export type ReceivingCrmBatchAction = "archive" | "unarchive" | "trash" | "restore";

/** Feed P5 `normalizeReceivingBatchResponse` after P6 POST. */
export function mapK1BatchHttpForP5Normalize(
  requestedAction: ReceivingCrmBatchAction,
  wire: K1ReceivingBatchHttpActual,
): {
  action: ReceivingCrmBatchAction;
  updatedIds: string[];
  skippedIds: string[];
  failures: Array<{ id: string; code?: string; reason?: string; message?: string }>;
} {
  return {
    action: requestedAction,
    updatedIds: wire.updatedIds ?? [],
    skippedIds: wire.skippedIds ?? [],
    failures: (wire.failures ?? []).map((f) => ({ id: f.id, code: f.code })),
  };
}
