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

export type ReceivingAppealHistoryWire = {
  at: string;
  authorLabel: string;
  text: string;
  reason?: string;
};

export function mapReceivingHistoryFromWire(entries: ReceivingAppealHistoryWire[]): ReceivingAppealHistoryEntry[] {
  return entries.map((e) => ({
    at: e.at,
    author: e.authorLabel,
    text: e.text,
    reason: e.reason,
  }));
}

/**
 * K8/K1 list row wire (K8 `1894569a` / K1 `83f279e8`) — map via `mapReceivingAppealListRowFromWire`.
 * P2 may centralize in `contracts.ts`; П6 owns explicit mapper until re-export.
 */
export type ReceivingAppealListRowWire = {
  id: string;
  clientDisplayName?: string | null;
  certificateId?: string | null;
  receivingPartnerUserId?: string | null;
  receivingPartnerId?: string | null;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
  referrerProUserId?: string | null;
  interest?: string | null;
  budgetHint?: string | null;
  stageKey?: string | null;
  refusedReason?: string | null;
  shippedAt?: string | null;
  paidAmountKopecks?: number | null;
  paidAt?: string | null;
  originKind?: "certificate" | "manual" | string | null;
  manualSourceKey?: string | null;
  purchaseOrderId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  bucket?: ReceivingListBucket;
  /** Legacy tolerance — not emitted from K8 `0f4fe833`. */
  clientName?: string | null;
  stageId?: string | null;
  sourceKey?: string | null;
  purchaseId?: string | null;
  referrerPartnerId?: string | null;
  paidAmount?: number | null;
  clientCity?: string | null;
  manualEntry?: boolean;
};

/** Detail-only fields on `GET /:id` appeal object (K8 canonical). */
export type ReceivingAppealDetailFieldsWire = {
  privateNotes?: string | null;
  clientContact?: string | null;
  discountPercent?: number | null;
  certValidUntil?: string | null;
};

export type ReceivingAppealDetailRowWire = ReceivingAppealListRowWire & ReceivingAppealDetailFieldsWire;

/** List row — UI view-model (prototype renderListPage table). */
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
  /** UI alias — wire `referrerProUserId`. */
  referrerPartnerId: string;
  interest: string;
  budgetHint?: string | null;
  stageId: string;
  refusedReason?: string | null;
  shippedAt?: string | null;
  /** Canonical kopecks from server. */
  paidAmountKopecks?: number | null;
  /** Display rubles derived from kopecks ÷ 100 (no settlement math). */
  paidAmountRub?: number | null;
  paidAt?: string | null;
  sourceKey?: string;
  /** K1 `manualSourceKey` when origin is manual. */
  manualSourceKey?: string | null;
  purchaseId?: string | null;
  createdAt: string;
  updatedAt: string;
  manualEntry?: boolean;
  /** K8 field required for bucket tabs — request in P2 if absent from first API draft. */
  bucket?: ReceivingListBucket;
};

/** Detail row — receiving-owner fields. P4 renders full payload. */
export type ReceivingAppealDetail = ReceivingAppealListRow & {
  privateNotes?: string;
  clientContact?: string | null;
  discountPercent?: number;
  certValidUntil?: string | null;
};

/**
 * GET `/api/pro/client-appeals/:id` top-level wire (K1).
 * P4 may consume this envelope directly — П6 mapper is non-authoritative convenience.
 */
export type ReceivingAppealDetailWire = {
  appeal: ReceivingAppealDetailRowWire;
  revision: string | number;
  history: ReceivingAppealHistoryWire[];
  workingStages?: ReceivingWorkingStage[];
  refusalReasons?: string[];
};

/** Mapped detail for P4 — preserves `revision` for CAS writes. */
export type ReceivingAppealDetailPayload = {
  appeal: ReceivingAppealDetail;
  revision: string | number;
  history: ReceivingAppealHistoryEntry[];
  workingStages: ReceivingWorkingStage[];
  refusalReasons: string[];
};

export function mapReceivingAppealDetailFieldsFromWire(
  wire: ReceivingAppealDetailRowWire,
): ReceivingAppealDetail {
  const base = mapReceivingAppealListRowFromWire(wire);
  return {
    ...base,
    privateNotes: wire.privateNotes?.trim() ? wire.privateNotes.trim() : undefined,
    clientContact: wire.clientContact ?? null,
    discountPercent:
      typeof wire.discountPercent === "number" ? wire.discountPercent : undefined,
    certValidUntil: wire.certValidUntil ?? null,
  };
}

export function mapReceivingAppealDetailFromWire(wire: ReceivingAppealDetailWire): ReceivingAppealDetailPayload {
  return {
    appeal: mapReceivingAppealDetailFieldsFromWire(wire.appeal),
    revision: wire.revision,
    history: mapReceivingHistoryFromWire(wire.history ?? []),
    workingStages: wire.workingStages ?? [],
    refusalReasons: wire.refusalReasons ?? [],
  };
}

export type ReceivingWorkingStage = {
  id: string;
  label: string;
};

/**
 * Prototype `partnerSettings[partnerId]` — `partnerId` = receiving owner **User.id**.
 * Must be persisted (K8 additive settings storage scoped to `receivingPartnerUserId`).
 */
export type ReceivingManualChannel = {
  key: string;
  label: string;
};

export type ReceivingPartnerSettings = {
  receivingPartnerUserId?: string;
  workingStages: ReceivingWorkingStage[];
  refusalReasons: string[];
  archivedStages: ReceivingWorkingStage[];
  /** K8 `0f4fe833` — custom manual channels per receiving User.id. */
  manualChannels?: ReceivingManualChannel[];
};

/** GET working-stages wire — unwrap `{ settings, settings.version }`. */
export type ReceivingPartnerSettingsWire = {
  settings: ReceivingPartnerSettings & { version?: string | number };
};

export type ReceivingPartnerSettingsSnapshot = {
  settings: ReceivingPartnerSettings;
  version?: string | number;
};

export function unwrapReceivingPartnerSettingsWire(
  wire: ReceivingPartnerSettingsWire | ReceivingPartnerSettings | null | undefined,
): ReceivingPartnerSettingsSnapshot | null {
  if (!wire) return null;
  if ("settings" in wire && wire.settings) {
    const { version, ...rest } = wire.settings;
    return {
      settings: {
        workingStages: rest.workingStages ?? [],
        refusalReasons: rest.refusalReasons ?? [],
        archivedStages: rest.archivedStages ?? [],
        manualChannels: rest.manualChannels ?? [],
        receivingPartnerUserId: rest.receivingPartnerUserId,
      },
      version,
    };
  }
  return { settings: wire as ReceivingPartnerSettings };
}

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
    list = list.filter(
      (a) => a.sourceKey === "certificate" || (Boolean(a.certificateId) && !a.manualEntry),
    );
  } else if (filters.source === "manual") {
    list = list.filter((a) => a.sourceKey === "manual" || a.manualEntry);
  }
  if (filters.status !== DEFAULT_STATUS_LABEL) {
    list = list.filter((a) => stageLabelById(a) === filters.status);
  }
  const q = filters.q.trim().toLowerCase();
  if (q) {
    list = list.filter((a) =>
      [a.clientName, a.certificateId, a.id, a.interest, a.referrerPartnerId, a.stageId]
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
  settingsVersion?: string | number;
  /** Future K1 — not invented when absent. */
  access?: ReceivingPrincipalAccess;
  principal?: ReceivingSessionPrincipal;
};

export const RECEIVING_EMPTY_SETTINGS: ReceivingPartnerSettings = {
  workingStages: [],
  refusalReasons: [],
  archivedStages: [],
  manualChannels: [],
};

/** Prototype `manualChannelsFor` — builtins first, then persisted custom. */
export function receivingManualChannelOptions(
  settings?: ReceivingPartnerSettings | null,
): ReceivingManualChannel[] {
  const builtins: ReceivingManualChannel[] = RECEIVING_MANUAL_CHANNEL_OPTIONS.map((o) => ({
    key: o.key,
    label: o.label,
  }));
  const custom = settings?.manualChannels ?? [];
  return [...builtins, ...custom];
}

/** Prototype `addWorkspaceChannel` duplicate check (case-insensitive label). */
export function findDuplicateManualChannelLabel(
  label: string,
  channels: ReceivingManualChannel[],
): ReceivingManualChannel | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  return channels.find((c) => c.label.trim().toLowerCase() === lower) ?? null;
}

export type PostReceivingManualChannelBody = {
  kind: "manualChannel";
  label: string;
  expectedVersion?: string | number;
};

export type PostReceivingManualChannelResult =
  | { ok: true; snapshot: ReceivingPartnerSettingsSnapshot; channel: ReceivingManualChannel }
  | { ok: false; code: "BLOCKED_CONTRACT" | "VALIDATION" | "ERROR"; message: string };

export async function postReceivingManualChannel(
  label: string,
  expectedVersion?: string | number,
): Promise<PostReceivingManualChannelResult> {
  const trimmed = label.trim();
  if (!trimmed) {
    return { ok: false, code: "VALIDATION", message: "Введите название канала." };
  }
  const path = "/api/pro/client-appeals/working-stages";
  if (!isAllowedProxyRoute("POST", path)) {
    return {
      ok: false,
      code: "BLOCKED_CONTRACT",
      message: "Сохранение канала ждёт K1 working-stages POST и P1 allowlist.",
    };
  }
  try {
    const payload = await remcardFetch<ReceivingPartnerSettingsWire>(path, {
      method: "POST",
      body: JSON.stringify({
        kind: "manualChannel",
        label: trimmed,
        expectedVersion,
      } satisfies PostReceivingManualChannelBody),
    });
    const snapshot = unwrapReceivingPartnerSettingsWire(payload);
    if (!snapshot) {
      return { ok: false, code: "ERROR", message: "Пустой ответ настроек после сохранения канала." };
    }
    const channel =
      snapshot.settings.manualChannels?.find(
        (c) => c.label.trim().toLowerCase() === trimmed.toLowerCase(),
      ) ?? null;
    if (!channel) {
      return {
        ok: false,
        code: "ERROR",
        message: "Сервер не вернул сохранённый канал.",
      };
    }
    return { ok: true, snapshot, channel };
  } catch (caught) {
    return {
      ok: false,
      code: "ERROR",
      message: caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить канал",
    };
  }
}

export function receivingAppealsMutationsAllowed(data: Pick<ReceivingAppealsListResponse, "readOnly">): boolean {
  return data.readOnly !== true;
}

/**
 * K1 GET wire (`83f279e8`): `{ appeals, nextCursor, tab, readOnly }` (+ optional fields when aligned).
 * @see audit/remcard-parallel-20261113/P6/k1-83f279e8-list-envelope.md
 */
export type K1ClientAppealsListWire = {
  appeals?: ReceivingAppealListRowWire[];
  nextCursor?: string | null;
  tab?: string | null;
  readOnly?: boolean;
  kpis?: ReceivingListKpis;
  settings?: ReceivingPartnerSettings;
  access?: Partial<ReceivingPrincipalAccess>;
  principal?: Partial<ReceivingSessionPrincipal>;
  data?: K1ClientAppealsListWire;
};

const RECEIVING_SYSTEM_STAGE_LABELS: Record<string, string> = {
  [RECEIVING_SYSTEM_STAGE.NEW]: "Новый",
  [RECEIVING_SYSTEM_STAGE.PAID]: "Оплачено",
  [RECEIVING_SYSTEM_STAGE.SHIPPED]: "Отгружено",
  [RECEIVING_SYSTEM_STAGE.RETURN]: "Возврат",
  [RECEIVING_SYSTEM_STAGE.REFUSED]: "Отказ",
};

/** Map UI status filter label → `stageKey` for K1 list query (never send label). */
export function receivingStageKeyForStatusFilter(
  statusLabel: string,
  settings?: ReceivingPartnerSettings | null,
): string | null {
  if (statusLabel === DEFAULT_STATUS_LABEL) return null;
  for (const stage of settings?.workingStages ?? []) {
    if (stage.label === statusLabel) return stage.id;
  }
  for (const [key, label] of Object.entries(RECEIVING_SYSTEM_STAGE_LABELS)) {
    if (label === statusLabel) return key;
  }
  if (Object.values(RECEIVING_SYSTEM_STAGE).includes(statusLabel as (typeof RECEIVING_SYSTEM_STAGE)[keyof typeof RECEIVING_SYSTEM_STAGE])) {
    return statusLabel;
  }
  return null;
}

export function receivingStageLabelsFromSettings(
  settings?: ReceivingPartnerSettings | null,
): string[] {
  const labels = new Set<string>([DEFAULT_STATUS_LABEL]);
  for (const s of settings?.workingStages ?? []) labels.add(s.label);
  for (const label of Object.values(RECEIVING_SYSTEM_STAGE_LABELS)) labels.add(label);
  return [...labels];
}

export function formatReceivingPaidRubFromKopecks(kopecks: number | null | undefined): string | null {
  if (kopecks == null || !Number.isFinite(kopecks)) return null;
  const rub = Math.trunc(kopecks / 100);
  const frac = Math.abs(kopecks % 100);
  return frac === 0 ? `${rub} ₽` : `${rub},${String(frac).padStart(2, "0")} ₽`;
}

/** List GET query — K1 reads `bucket` + `stage` (stageKey). */
export function buildReceivingAppealsListQuery(
  filters?: Partial<ReceivingListFilters>,
  cursor?: string | null,
  settings?: ReceivingPartnerSettings | null,
): string {
  const params = new URLSearchParams();
  if (filters?.bucket) params.set("bucket", filters.bucket);
  if (filters?.source && filters.source !== "all") params.set("source", filters.source);
  const q = filters?.q?.trim();
  if (q) params.set("q", q);
  if (filters?.status && filters.status !== DEFAULT_STATUS_LABEL) {
    const stageKey = receivingStageKeyForStatusFilter(filters.status, settings);
    if (stageKey) params.set("stage", stageKey);
  }
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function mapReceivingAppealListRowFromWire(wire: ReceivingAppealListRowWire): ReceivingAppealListRow {
  const uid = (wire.receivingPartnerUserId ?? wire.receivingPartnerId ?? "").trim();
  const originKind = (wire.originKind ?? wire.sourceKey ?? "").trim();
  const manualSourceKey = wire.manualSourceKey?.trim() || null;
  const manualEntry =
    wire.manualEntry === true || originKind === "manual" || Boolean(manualSourceKey);
  const paidAmountKopecks =
    wire.paidAmountKopecks ??
    (typeof wire.paidAmount === "number" ? Math.round(wire.paidAmount * 100) : null);
  const row: ReceivingAppealListRow = {
    id: wire.id,
    clientName: (wire.clientDisplayName ?? wire.clientName ?? "").trim() || "—",
    certificateId: wire.certificateId?.trim() ?? "",
    receivingPartnerUserId: uid,
    receivingPartnerId: (wire.receivingPartnerId ?? uid).trim() || uid,
    receivingOrganizationId: wire.receivingOrganizationId,
    receivingBranchId: wire.receivingBranchId,
    referrerPartnerId: (wire.referrerProUserId ?? wire.referrerPartnerId ?? "").trim(),
    interest: wire.interest?.trim() ?? "—",
    budgetHint: wire.budgetHint,
    stageId: (wire.stageKey ?? wire.stageId ?? "").trim() || RECEIVING_SYSTEM_STAGE.NEW,
    refusedReason: wire.refusedReason,
    shippedAt: wire.shippedAt,
    paidAmountKopecks,
    paidAmountRub: paidAmountKopecks != null ? paidAmountKopecks / 100 : null,
    paidAt: wire.paidAt,
    sourceKey: originKind || undefined,
    manualSourceKey,
    purchaseId: wire.purchaseOrderId ?? wire.purchaseId ?? null,
    createdAt: wire.createdAt ?? new Date(0).toISOString(),
    updatedAt: wire.updatedAt ?? wire.createdAt ?? new Date(0).toISOString(),
    manualEntry,
    bucket: wire.bucket,
  };
  return coerceReceivingAppealListRow(row);
}

export function mergeReceivingAppealPages(
  prev: ReceivingAppealListRow[],
  next: ReceivingAppealListRow[],
): ReceivingAppealListRow[] {
  const byId = new Map(prev.map((a) => [a.id, a]));
  for (const row of next) byId.set(row.id, row);
  return [...byId.values()];
}

export function receivingListHasMore(data: Pick<ReceivingAppealsListResponse, "nextCursor">): boolean {
  return Boolean(data.nextCursor?.trim());
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
  const appeals = (list.appeals ?? []).map(mapReceivingAppealListRowFromWire);
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

/** Form/UI body (prototype names). */
/** Prototype manual form — name / interest / contact / channel (no speculative city/notes in П6). */
export type ReceivingAppealCreateBody = {
  clientName: string;
  interest?: string;
  clientContact?: string;
  manualSourceKey?: string;
};

/** K1 POST wire — `manualSourceKey` = builtin key or persisted custom `key` (K8). */
export type ReceivingAppealCreateWire = {
  clientDisplayName: string;
  interest?: string;
  clientContact?: string;
  manualSourceKey?: string;
};

export function toK1ReceivingAppealCreateBody(body: ReceivingAppealCreateBody): ReceivingAppealCreateWire {
  return {
    clientDisplayName: body.clientName.trim(),
    interest: body.interest?.trim() || undefined,
    clientContact: body.clientContact?.trim() || undefined,
    manualSourceKey: body.manualSourceKey?.trim() || undefined,
  };
}

/** Profile PATCH — no stage/finance (K1 rejects immutable fields on `/:id`). */
export type ReceivingAppealProfilePatchBody = {
  privateNotes?: string;
  clientContact?: string;
  interest?: string;
  expectedRevision: string | number;
};

export type ReceivingAppealProfilePatchWire = {
  privateNotes?: string;
  clientContact?: string;
  interest?: string;
  expectedRevision: string | number;
};

/** Stage PATCH — `PATCH /:id/stage` only. */
export type ReceivingAppealStagePatchBody = {
  stageKey: string;
  refusedReason?: string | null;
  expectedRevision: string | number;
};

export type ReceivingAppealFinancePatchBlockedNote =
  "Оплата и отгрузка не сохраняются из Clients UI — только серверные финансовые потоки.";

export const RECEIVING_FINANCE_PATCH_FROZEN =
  "Оплата/отгрузка не редактируются из Clients UI (K1 immutable finance fields)." as ReceivingAppealFinancePatchBlockedNote;

export function isReceivingAppealProfilePatchProxyReady(id = "x"): boolean {
  return isAllowedProxyRoute("PATCH", `/api/pro/client-appeals/${id}`);
}

export function isReceivingAppealStagePatchProxyReady(id = "x"): boolean {
  return isAllowedProxyRoute("PATCH", `/api/pro/client-appeals/${id}/stage`);
}

/**
 * K1 certificate entry — POST body (Clients-only route; does not call store order POST).
 * `certificateCode` = qrCode or promoCode (same as `POST /api/store/order/preview`).
 * K1 chains: `authorizeStoreScan` → read-only `validateCertificateForStore` → idempotent appeal find/create.
 */
/** UI extracts promo from QR; wire field is `promoCode` (K1). */
export type ReceivingCertificateEntryBody = {
  promoCode: string;
};

/** HTTP 200 with `valid: false` is a real invalid result — not an error throw. */
export type ReceivingCertificateEntryWireResponse = {
  valid: boolean;
  message?: string | null;
  outcome?: "created" | "existing";
  appeal?: ReceivingAppealListRowWire;
};

export type ReceivingCertificateEntryResult =
  | {
      ok: true;
      appealId: string;
      outcome: "created" | "existing";
      appeal: ReceivingAppealListRow;
    }
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
    const payload = await remcardFetch<ReceivingCertificateEntryWireResponse>(RECEIVING_CERT_ENTRY_PATH, {
      method: "POST",
      body: JSON.stringify({ promoCode: body.promoCode }),
    });
    if (payload.valid === false) {
      return {
        ok: false,
        code: "INVALID",
        message: payload.message?.trim() || "Сертификат недействителен или срок истёк.",
      };
    }
    if (!payload.appeal) {
      return {
        ok: false,
        code: "ERROR",
        message: payload.message?.trim() || "Нет данных обращения после проверки сертификата.",
      };
    }
    const appealRow = mapReceivingAppealListRowFromWire(payload.appeal);
    return {
      ok: true,
      outcome: payload.outcome ?? "created",
      appeal: appealRow,
      appealId: appealRow.id,
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
  patch?: { stageKey?: string; privateNotes?: string };
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
  settingsForQuery?: ReceivingPartnerSettings | null,
): Promise<ReceivingAppealsLoadResult> {
  if (!isReceivingAppealsProxyReady()) {
    return receivingContractBlocked();
  }
  const listPath = `/api/pro/client-appeals${buildReceivingAppealsListQuery(filters, cursor, settingsForQuery)}`;
  try {
    const [listWire, settingsWire] = await Promise.all([
      remcardFetch<K1ClientAppealsListWire>(listPath),
      remcardFetch<ReceivingPartnerSettingsWire>("/api/pro/client-appeals/working-stages").catch(
        () => null,
      ),
    ]);
    const data = coerceK1ClientAppealsListPayload(listWire);
    const unwrapped = unwrapReceivingPartnerSettingsWire(settingsWire);
    if (unwrapped) {
      data.settings = unwrapped.settings;
      data.settingsVersion = unwrapped.version;
      if (unwrapped.settings.receivingPartnerUserId && data.principal) {
        data.principal = {
          ...data.principal,
          receivingPartnerUserId: unwrapped.settings.receivingPartnerUserId,
        };
      }
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
    await remcardFetch<{ appeal: ReceivingAppealListRowWire }>("/api/pro/client-appeals", {
      method: "POST",
      body: JSON.stringify(toK1ReceivingAppealCreateBody(body)),
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
  | { ok: true; data: ReceivingAppealDetailPayload }
  | { ok: false; code: "BLOCKED_CONTRACT" | "ERROR"; message: string }
> {
  const path = `/api/pro/client-appeals/${encodeURIComponent(id)}`;
  if (!isAllowedProxyRoute("GET", path)) {
    return { ok: false, code: "BLOCKED_CONTRACT", message: RECEIVING_API_CONTRACT_NOTE };
  }
  try {
    const payload = await remcardFetch<ReceivingAppealDetailWire>(path);
    return { ok: true, data: mapReceivingAppealDetailFromWire(payload) };
  } catch (caught) {
    return {
      ok: false,
      code: "ERROR",
      message: caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить обращение",
    };
  }
}

function assertReceivingMutationAllowed(
  gate?: Pick<ReceivingAppealsListResponse, "readOnly"> | ReceivingPrincipalAccess,
): string | null {
  const readOnly =
    gate && "readOnly" in gate
      ? gate.readOnly === true
      : gate
        ? !normalizeReceivingAccess(gate).mutationsAllowed
        : true;
  return readOnly ? RECEIVING_ACCESS_LIST_ONLY_DENIAL : null;
}

export async function patchReceivingAppealProfile(
  id: string,
  body: ReceivingAppealProfilePatchBody,
  gate?: Pick<ReceivingAppealsListResponse, "readOnly"> | ReceivingPrincipalAccess,
): Promise<ReceivingAppealsLoadResult> {
  const denied = assertReceivingMutationAllowed(gate);
  if (denied) return { ok: false, code: "ERROR", message: denied };
  const path = `/api/pro/client-appeals/${encodeURIComponent(id)}`;
  if (!isReceivingAppealProfilePatchProxyReady(id)) {
    return {
      ok: false,
      code: "BLOCKED_CONTRACT",
      message: "PATCH profile ждёт P1 allowlist.",
    };
  }
  try {
    await remcardFetch(path, { method: "PATCH", body: JSON.stringify(body) });
    return fetchReceivingAppealsWorkspace();
  } catch (caught) {
    return {
      ok: false,
      code: "ERROR",
      message: caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить профиль",
    };
  }
}

export async function patchReceivingAppealStage(
  id: string,
  body: ReceivingAppealStagePatchBody,
  gate?: Pick<ReceivingAppealsListResponse, "readOnly"> | ReceivingPrincipalAccess,
): Promise<ReceivingAppealsLoadResult> {
  const denied = assertReceivingMutationAllowed(gate);
  if (denied) return { ok: false, code: "ERROR", message: denied };
  const path = `/api/pro/client-appeals/${encodeURIComponent(id)}/stage`;
  if (!isReceivingAppealStagePatchProxyReady(id)) {
    return {
      ok: false,
      code: "BLOCKED_CONTRACT",
      message: "PATCH stage ждёт K1 `/:id/stage` + P1 allowlist.",
    };
  }
  try {
    await remcardFetch(path, { method: "PATCH", body: JSON.stringify(body) });
    return fetchReceivingAppealsWorkspace();
  } catch (caught) {
    return {
      ok: false,
      code: "ERROR",
      message: caught instanceof RemcardApiError ? caught.message : "Не удалось сменить этап",
    };
  }
}
