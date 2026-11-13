/**
 * Receiving CRM («Клиенты у меня») — typed contract surface for prototype client-appeals.js.
 * Loads only when P1 proxy allowlists routes; otherwise honest BLOCKED_CONTRACT (no fixtures).
 *
 * **Identity (Root 20:32 MSK, source-verified):** canonical receiving owner =
 * `receivingPartnerUserId` (trusted session User.id). Prototype `receivingPartnerId` keys
 * `PARTNERS` / `partnerSettings` — **partner User id, not Branch.id**. Solo R06 specialist
 * without owned Organization: `receivingOrganizationId` / `receivingBranchId` **null** —
 * receiving still authorized via `requireOwnerClientsContext`; no dummy org creation.
 *
 * **K8 canonical sync (pending push):** `src/lib/clientAppeals/contract.ts` — re-export when
 * on origin; until then this file is the P2-coordinated DTO surface (no Branch-as-principal).
 */
export const RECEIVING_API_CONTRACT_NOTE =
  "K8_CANDIDATE_PENDING: partnerSettings persistence requires K8 additive storage, not API constants.";

import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { CLIENTS_CONTRACT_BLOCKERS } from "./contracts";
import { isAllowedProxyRoute } from "@/lib/remcard-proxy";

/** System stage ids — prototype `SYSTEM` constant (client-appeals.js). */
export const RECEIVING_SYSTEM_STAGE = {
  NEW: "sys_new",
  PAID: "sys_paid",
  SHIPPED: "sys_shipped",
  RETURN: "sys_return",
  REFUSED: "sys_refused",
} as const;

/** Trusted receiving owner from session (K1). Org/branch optional metadata only. */
export type ReceivingSessionPrincipal = {
  receivingPartnerUserId: string;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
};

export function normalizeReceivingSessionPrincipal(
  raw?: Partial<ReceivingSessionPrincipal> | null,
  appeals?: ReceivingAppealListRow[],
): ReceivingSessionPrincipal {
  const fromAppeal = appeals?.[0] ? receivingAppealOwnerUserId(appeals[0]) : undefined;
  return {
    receivingPartnerUserId: String(raw?.receivingPartnerUserId ?? fromAppeal ?? "").trim(),
    receivingOrganizationId: raw?.receivingOrganizationId ?? null,
    receivingBranchId: raw?.receivingBranchId ?? null,
  };
}

/** Canonical User.id for appeal row; `receivingPartnerId` legacy alias (never Branch.id). */
export function receivingAppealOwnerUserId(
  row: Pick<ReceivingAppealListRow, "receivingPartnerUserId" | "receivingPartnerId">,
): string {
  return (row.receivingPartnerUserId?.trim() || row.receivingPartnerId?.trim() || "");
}

/**
 * Prototype `isActiveAppeal` — only refused/return are inactive.
 * UI `bucket` archive/trash does **not** affect active-cert uniqueness (K8 must not conflate).
 */
export function isReceivingAppealActive(
  appeal: Pick<ReceivingAppealListRow, "stageId">,
): boolean {
  return (
    appeal.stageId !== RECEIVING_SYSTEM_STAGE.REFUSED &&
    appeal.stageId !== RECEIVING_SYSTEM_STAGE.RETURN
  );
}

/** Prototype `findActiveAppeal(certificateId, receivingPartnerId)` — scope by User.id. */
export function findActiveReceivingAppeal(
  appeals: ReceivingAppealListRow[],
  certificateId: string,
  receivingPartnerUserId: string,
): ReceivingAppealListRow | undefined {
  const ownerId = receivingPartnerUserId.trim();
  return appeals.find(
    (a) =>
      a.certificateId === certificateId &&
      receivingAppealOwnerUserId(a) === ownerId &&
      isReceivingAppealActive(a),
  );
}

/** Prototype Appeal typedef (incoming scope = receiving owner User.id). */
export type ReceivingAppealHistoryEntry = {
  at: string;
  author: string;
  text: string;
  reason?: string;
};

/** List row — public columns only (prototype renderListPage table). */
export type ReceivingAppealListRow = {
  id: string;
  clientName: string;
  certificateId: string;
  /** Trusted receiving owner User.id (K8 / K1). */
  receivingPartnerUserId: string;
  /**
   * Wire compatibility + prototype field name — **same User.id as `receivingPartnerUserId`**.
   * Not Branch.id (Root retracts Branch-as-receiver interpretation).
   */
  receivingPartnerId: string;
  /** Optional when solo specialist has no owned org; never required for UI visibility. */
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
  /** K8 field required for bucket tabs — request in P2 if absent from first API draft. */
  bucket?: ReceivingListBucket;
};

/** Detail — receiving-owner fields (never leak via observer/referrer DTO). P4 owner. */
export type ReceivingAppealDetail = ReceivingAppealListRow & {
  privateNotes?: string;
  clientContact?: string | null;
  history: ReceivingAppealHistoryEntry[];
  discountPercent?: number;
  certValidUntil?: string | null;
};

export type ReceivingWorkingStage = {
  id: string;
  label: string;
};

/**
 * Prototype `partnerSettings[partnerId]` — `partnerId` = receiving owner **User.id**.
 * Must be persisted (K8 additive settings storage scoped to `receivingPartnerUserId`).
 */
export type ReceivingPartnerSettings = {
  receivingPartnerUserId?: string;
  workingStages: ReceivingWorkingStage[];
  refusalReasons: string[];
  archivedStages: ReceivingWorkingStage[];
};

export function isReceivingSettingsMaterialized(settings: ReceivingPartnerSettings): boolean {
  return (
    settings.workingStages.length > 0 ||
    settings.refusalReasons.length > 0 ||
    settings.archivedStages.length > 0
  );
}

export type ReceivingListBucket = "active" | "archive" | "trash";

/** Prototype ws() list state for incoming tab (renderListPage). */
export type ReceivingListFilters = {
  q: string;
  status: string;
  source: "all" | "cert" | "manual";
  bucket: ReceivingListBucket;
};

export const RECEIVING_LIST_SOURCE_OPTIONS = [
  { key: "all" as const, label: "Все" },
  { key: "cert" as const, label: "По сертификату" },
  { key: "manual" as const, label: "Вручную" },
];

export const RECEIVING_MANUAL_CHANNEL_OPTIONS = [
  { key: "phone" as const, label: "Звонок" },
  { key: "messenger" as const, label: "Мессенджер" },
  { key: "visit" as const, label: "Личный визит" },
  { key: "ads" as const, label: "Реклама" },
  { key: "other" as const, label: "Другое" },
];

const DEFAULT_STATUS_LABEL = "Все статусы";

/** Client filter — prototype `filterAppeals(incoming)` (no network). */
export function filterReceivingAppeals(
  appeals: ReceivingAppealListRow[],
  filters: ReceivingListFilters,
  stageLabelById: (row: ReceivingAppealListRow) => string = (r) => r.stageId,
): ReceivingAppealListRow[] {
  let list = appeals.filter((a) => (a.bucket ?? "active") === filters.bucket);
  if (filters.source === "cert") {
    list = list.filter((a) => Boolean(a.certificateId) && !a.manualEntry);
  } else if (filters.source === "manual") {
    list = list.filter((a) => a.manualEntry);
  }
  if (filters.status !== DEFAULT_STATUS_LABEL) {
    list = list.filter((a) => stageLabelById(a) === filters.status);
  }
  const q = filters.q.trim().toLowerCase();
  if (q) {
    list = list.filter((a) =>
      [a.clientName, a.certificateId, a.id, a.interest, a.referrerPartnerId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  return list.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function receivingStatusFilterOptions(
  appeals: ReceivingAppealListRow[],
  stageLabelById: (row: ReceivingAppealListRow) => string,
): string[] {
  const labels = new Set<string>([DEFAULT_STATUS_LABEL]);
  for (const a of appeals) {
    labels.add(stageLabelById(a));
  }
  return [...labels];
}

/** KPI strip — values from K1/K8 server aggregation only (UI does not recompute). */
export type ReceivingListKpis = {
  inWork: number;
  /** Count in paid stage — client purchase funnel, not bonus payout. */
  paid: number;
  shipped: number;
  conv: string;
};

/**
 * K7/K1 boundary: `requireOwnerClientsListContext` (list GET) vs
 * `requireOwnerClientsContext` (mutations). UI must follow server flags — never
 * infer from `canManageLeads` or employee role alone.
 */
export type ReceivingPrincipalAccess = {
  listAllowed: boolean;
  mutationsAllowed: boolean;
  /** Reuse origin denial code when list-only principal hits UI (e.g. 403 reason). */
  denialCode?: string | null;
};

/** Synthetic marker for list-only org-workplace principal (match K1 when wired). */
export const RECEIVING_ACCESS_LIST_ONLY_DENIAL = "OWNER_CLIENTS_LIST_CONTEXT_ONLY";

export function normalizeReceivingAccess(
  raw?: Partial<ReceivingPrincipalAccess> | null,
): ReceivingPrincipalAccess {
  return {
    listAllowed: raw?.listAllowed !== false,
    mutationsAllowed: raw?.mutationsAllowed === true,
    denialCode: raw?.denialCode ?? null,
  };
}

/** UI view-model after K1 adapter (`coerceK1ClientAppealsListPayload`). */
export type ReceivingAppealsListResponse = {
  appeals: ReceivingAppealListRow[];
  /** K1 `83f279e8` — sole write gate until `access` lands. */
  readOnly: boolean;
  nextCursor?: string | null;
  /** Server echo of active list tab/bucket when present. */
  tab?: string | null;
  kpis?: ReceivingListKpis;
  settings?: ReceivingPartnerSettings;
  /** Future K1 — not invented when absent. */
  access?: ReceivingPrincipalAccess;
  principal?: ReceivingSessionPrincipal;
};

export const RECEIVING_EMPTY_SETTINGS: ReceivingPartnerSettings = {
  workingStages: [],
  refusalReasons: [],
  archivedStages: [],
};

export function receivingAppealsMutationsAllowed(data: Pick<ReceivingAppealsListResponse, "readOnly">): boolean {
  return data.readOnly !== true;
}

/**
 * K1 GET wire (`83f279e8`): `{ appeals, nextCursor, tab, readOnly }` (+ optional fields when aligned).
 * @see audit/remcard-parallel-20261113/P6/k1-83f279e8-list-envelope.md
 */
export type K1ClientAppealsListWire = {
  appeals?: ReceivingAppealListRow[];
  nextCursor?: string | null;
  tab?: string | null;
  readOnly?: boolean;
  kpis?: ReceivingListKpis;
  settings?: ReceivingPartnerSettings;
  access?: Partial<ReceivingPrincipalAccess>;
  principal?: Partial<ReceivingSessionPrincipal>;
  data?: K1ClientAppealsListWire;
};

/** List GET query — coordinate names with K1/P2 (bucket→`tab`). */
export function buildReceivingAppealsListQuery(
  filters?: Partial<ReceivingListFilters>,
  cursor?: string | null,
): string {
  const params = new URLSearchParams();
  if (filters?.bucket) params.set("tab", filters.bucket);
  if (filters?.source && filters.source !== "all") params.set("source", filters.source);
  const q = filters?.q?.trim();
  if (q) params.set("q", q);
  if (filters?.status && filters.status !== DEFAULT_STATUS_LABEL) {
    params.set("stage", filters.status);
  }
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function coerceReceivingAppealListRow(row: ReceivingAppealListRow): ReceivingAppealListRow {
  const uid = receivingAppealOwnerUserId(row);
  if (!uid) return row;
  return {
    ...row,
    receivingPartnerUserId: uid,
    receivingPartnerId: (row.receivingPartnerId ?? uid).trim() || uid,
  };
}

/** Map K1 GET body into workspace view-model (no branch/org query params on fetch). */
export function coerceK1ClientAppealsListPayload(
  wire: K1ClientAppealsListWire,
): ReceivingAppealsListResponse {
  const list: K1ClientAppealsListWire = wire.data?.appeals != null ? wire.data : wire;
  const appeals = (list.appeals ?? []).map(coerceReceivingAppealListRow);
  const readOnly = list.readOnly === true;
  const out: ReceivingAppealsListResponse = {
    appeals,
    readOnly,
    nextCursor: list.nextCursor ?? null,
    tab: list.tab ?? null,
  };
  if (list.kpis) out.kpis = list.kpis;
  if (list.settings) out.settings = list.settings;
  if (list.access) out.access = normalizeReceivingAccess(list.access);
  if (list.principal) {
    out.principal = normalizeReceivingSessionPrincipal(list.principal, appeals);
  }
  return out;
}

export type ReceivingAppealCreateBody = {
  clientName: string;
  interest?: string;
  clientCity?: string;
  clientContact?: string;
  manualChannel?: "phone" | "messenger" | "visit" | "ads" | "other";
  privateNotes?: string;
};

export type ReceivingAppealPatchBody = {
  stageId?: string;
  refusedReason?: string | null;
  privateNotes?: string;
  shippedAt?: string | null;
  paidAt?: string | null;
  paidAmount?: number | null;
};

/**
 * K1 certificate entry — POST body (Clients-only route; does not call store order POST).
 * `certificateCode` = qrCode or promoCode (same as `POST /api/store/order/preview`).
 * K1 chains: `authorizeStoreScan` → read-only `validateCertificateForStore` → idempotent appeal find/create.
 */
export type ReceivingCertificateEntryBody = {
  certificateCode: string;
};

export type ReceivingCertificateEntrySuccess = {
  outcome: "created" | "existing";
  appeal: ReceivingAppealListRow;
};

export type ReceivingCertificateEntryResult =
  | { ok: true; appealId: string } & ReceivingCertificateEntrySuccess
  | {
      ok: false;
      code: "BLOCKED_CONTRACT" | "FORBIDDEN" | "INVALID" | "CONFLICT" | "ERROR";
      message: string;
    };

const RECEIVING_CERT_ENTRY_PATH = "/api/pro/client-appeals/certificate-entry";

/** P1 allowlist — separate from list route until K1+P1 land. */
export function isReceivingCertificateEntryProxyReady(): boolean {
  return isAllowedProxyRoute("POST", RECEIVING_CERT_ENTRY_PATH);
}

export async function submitReceivingCertificateEntry(
  body: ReceivingCertificateEntryBody,
  gate?: Pick<ReceivingAppealsListResponse, "readOnly"> | ReceivingPrincipalAccess,
): Promise<ReceivingCertificateEntryResult> {
  const readOnly =
    gate && "readOnly" in gate
      ? gate.readOnly === true
      : gate
        ? !normalizeReceivingAccess(gate).mutationsAllowed
        : true;
  if (readOnly) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: RECEIVING_ACCESS_LIST_ONLY_DENIAL,
    };
  }
  if (!isReceivingCertificateEntryProxyReady()) {
    return {
      ok: false,
      code: "BLOCKED_CONTRACT",
      message: RECEIVING_API_CONTRACT_NOTE,
    };
  }
  try {
    const payload = await remcardFetch<ReceivingCertificateEntrySuccess>(RECEIVING_CERT_ENTRY_PATH, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return {
      ok: true,
      outcome: payload.outcome,
      appeal: payload.appeal,
      appealId: payload.appeal.id,
    };
  } catch (caught) {
    if (caught instanceof RemcardApiError) {
      const { status, message } = caught;
      if (status === 403) {
        return { ok: false, code: "FORBIDDEN", message };
      }
      if (status === 409) {
        return { ok: false, code: "CONFLICT", message };
      }
      if (status === 400 || status === 404 || status === 422) {
        return { ok: false, code: "INVALID", message };
      }
    }
    return {
      ok: false,
      code: "ERROR",
      message: caught instanceof RemcardApiError ? caught.message : "Не удалось обработать сертификат",
    };
  }
}

/** P5 bulk — POST /api/pro/client-appeals/batch */
export type ReceivingAppealsBatchBody = {
  ids: string[];
  action: "archive" | "unarchive" | "trash" | "restore" | "patch";
  patch?: Pick<ReceivingAppealPatchBody, "stageId" | "privateNotes">;
};

export type ReceivingAppealsLoadResult =
  | { ok: true; data: ReceivingAppealsListResponse }
  | {
      ok: false;
      code: "BLOCKED_CONTRACT" | "ERROR";
      blockerId?: string;
      message: string;
      missingRoutes?: string[];
    };

const RECEIVING_BLOCKER_ID = "BLK-RECEIVING-APPEALS";

function receivingContractBlocked(): ReceivingAppealsLoadResult {
  const blocker = CLIENTS_CONTRACT_BLOCKERS.find((b) => b.id === RECEIVING_BLOCKER_ID);
  return {
    ok: false,
    code: "BLOCKED_CONTRACT",
    blockerId: blocker?.id ?? RECEIVING_BLOCKER_ID,
    message: blocker?.summary ?? "Нет контракта принимающего CRM.",
    missingRoutes: blocker?.missingApi ?? [],
  };
}

/** True only when P1 proxy allowlists list route (K1 confirmation). */
export function isReceivingAppealsProxyReady(): boolean {
  return isAllowedProxyRoute("GET", "/api/pro/client-appeals");
}

/**
 * Primary workspace load — GET /api/pro/client-appeals (+ optional working-stages).
 * Does not call network until proxy ready.
 */
export async function fetchReceivingAppealsWorkspace(
  filters?: Partial<ReceivingListFilters>,
  cursor?: string | null,
): Promise<ReceivingAppealsLoadResult> {
  if (!isReceivingAppealsProxyReady()) {
    return receivingContractBlocked();
  }
  const listPath = `/api/pro/client-appeals${buildReceivingAppealsListQuery(filters, cursor)}`;
  try {
    const [listWire, settingsWire] = await Promise.all([
      remcardFetch<K1ClientAppealsListWire>(listPath),
      remcardFetch<ReceivingPartnerSettings>("/api/pro/client-appeals/working-stages").catch(
        () => null,
      ),
    ]);
    const data = coerceK1ClientAppealsListPayload(listWire);
    if (settingsWire) {
      data.settings = {
        ...(data.settings ?? RECEIVING_EMPTY_SETTINGS),
        ...settingsWire,
        receivingPartnerUserId:
          settingsWire.receivingPartnerUserId ?? data.principal?.receivingPartnerUserId,
      };
    }
    return { ok: true, data };
  } catch (caught) {
    return {
      ok: false,
      code: "ERROR",
      message: caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить обращения",
    };
  }
}

export async function createReceivingAppeal(
  body: ReceivingAppealCreateBody,
  gate?: Pick<ReceivingAppealsListResponse, "readOnly"> | ReceivingPrincipalAccess,
): Promise<ReceivingAppealsLoadResult> {
  const readOnly =
    gate && "readOnly" in gate
      ? gate.readOnly === true
      : gate
        ? !normalizeReceivingAccess(gate).mutationsAllowed
        : true;
  if (readOnly) {
    return {
      ok: false,
      code: "ERROR",
      message: RECEIVING_ACCESS_LIST_ONLY_DENIAL,
    };
  }
  if (!isAllowedProxyRoute("POST", "/api/pro/client-appeals")) {
    return receivingContractBlocked();
  }
  try {
    await remcardFetch<{ appeal: ReceivingAppealListRow }>("/api/pro/client-appeals", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return fetchReceivingAppealsWorkspace();
  } catch (caught) {
    return {
      ok: false,
      code: "ERROR",
      message: caught instanceof RemcardApiError ? caught.message : "Не удалось создать обращение",
    };
  }
}

/** P4 detail load — GET must be read-only on server (no write side effects). */
export async function fetchReceivingAppealDetail(
  id: string,
): Promise<
  | { ok: true; appeal: ReceivingAppealDetail }
  | { ok: false; code: "BLOCKED_CONTRACT" | "ERROR"; message: string }
> {
  const path = `/api/pro/client-appeals/${encodeURIComponent(id)}`;
  if (!isAllowedProxyRoute("GET", path)) {
    return { ok: false, code: "BLOCKED_CONTRACT", message: RECEIVING_API_CONTRACT_NOTE };
  }
  try {
    const payload = await remcardFetch<{ appeal: ReceivingAppealDetail }>(path);
    return { ok: true, appeal: payload.appeal };
  } catch (caught) {
    return {
      ok: false,
      code: "ERROR",
      message: caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить обращение",
    };
  }
}

/** Stage / field updates — **PATCH** only (not POST). */
export async function patchReceivingAppeal(
  id: string,
  body: ReceivingAppealPatchBody,
  gate?: Pick<ReceivingAppealsListResponse, "readOnly"> | ReceivingPrincipalAccess,
): Promise<ReceivingAppealsLoadResult> {
  const readOnly =
    gate && "readOnly" in gate
      ? gate.readOnly === true
      : gate
        ? !normalizeReceivingAccess(gate).mutationsAllowed
        : true;
  if (readOnly) {
    return {
      ok: false,
      code: "ERROR",
      message: RECEIVING_ACCESS_LIST_ONLY_DENIAL,
    };
  }
  if (!isAllowedProxyRoute("PATCH", `/api/pro/client-appeals/${encodeURIComponent(id)}`)) {
    return receivingContractBlocked();
  }
  try {
    await remcardFetch(`/api/pro/client-appeals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return fetchReceivingAppealsWorkspace();
  } catch (caught) {
    return {
      ok: false,
      code: "ERROR",
      message: caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить обращение",
    };
  }
}
