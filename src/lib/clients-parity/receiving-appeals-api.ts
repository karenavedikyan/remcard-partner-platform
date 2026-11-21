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
import {
  resolveClientAppealStageDisplayLabel,
  trimTrustedClientsDisplayString,
} from "./client-appeal-display";
import { CLIENTS_CONTRACT_BLOCKERS } from "./contracts";
import { isAllowedProxyRoute } from "@/lib/remcard-proxy";
import {
  coerceProfAppealsFromP149ListWire,
  isP149ListContractWire,
  parseProfFilterCounts,
  profListQueryParams,
  type ProfAppealListRow,
  type ProfAppealProfilePatchBody,
  type ProfListFilters,
  type ReceivingAppealP149CapabilitiesWire,
} from "./prof-appeals-adapter";

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
/**
 * Server-computed rights over ONE appeal, from its stored branch and the actor's grants (display only — every write is
 * re-authorized by the server). Absent on servers that predate it.
 */
export type ReceivingRowCapabilities = {
  canManageLeads: boolean;
  canScan: boolean;
};

export function parseReceivingRowCapabilities(raw: unknown): ReceivingRowCapabilities | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.canManageLeads !== "boolean" || typeof r.canScan !== "boolean") return undefined;
  return { canManageLeads: r.canManageLeads, canScan: r.canScan };
}

/**
 * May the actor change this appeal (stage / notes / refusal / archive / trash / bulk)?
 * The row's own server flag wins. Without it (older server) only a single-branch list answer may be trusted; the general
 * «all branches» answer is an aggregate over branches, so it never grants a write.
 */
export function receivingRowCanManageLeads(
  row: Pick<ReceivingAppealListRow, "capabilities">,
  ctx: { listAllowsLeads: boolean; scopeAll: boolean },
): boolean {
  if (row.capabilities) return row.capabilities.canManageLeads;
  return ctx.listAllowsLeads && !ctx.scopeAll;
}

export type ReceivingAppealListRowWire = {
  id: string;
  capabilities?: ReceivingRowCapabilities | null;
  clientDisplayName?: string | null;
  certificateId?: string | null;
  /** K1 scan/preview promo when certificate-bound — never substitute raw certificateId. */
  certificatePromoCode?: string | null;
  receivingPartnerUserId?: string | null;
  receivingPartnerId?: string | null;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
  referrerProUserId?: string | null;
  /** K1 b0ffd197 — trusted human caption when present. */
  referrerDisplayName?: string | null;
  interest?: string | null;
  budgetHint?: string | null;
  stageKey?: string | null;
  /** K1 b0ffd197 — RECEIVING-scope stage caption when present. */
  stageLabel?: string | null;
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
  referrerDisplayName?: string | null;
  interest: string;
  budgetHint?: string | null;
  stageId: string;
  stageLabel?: string | null;
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
  /** Per-appeal rights from the server; see `receivingRowCanManageLeads`. */
  capabilities?: ReceivingRowCapabilities;
};

/** Detail row — receiving-owner fields. P4 renders full payload. */
export type ReceivingAppealDetail = ReceivingAppealListRow & {
  privateNotes?: string;
  clientContact?: string | null;
  clientCity?: string | null;
  discountPercent?: number;
  certValidUntil?: string | null;
};

/**
 * GET `/api/pro/client-appeals/:id` top-level wire (K1).
 * P4 may consume this envelope directly — П6 mapper is non-authoritative convenience.
 */
export type ReceivingAppealDetailWire = {
  appeal: ReceivingAppealDetailRowWire;
  certificateTerm?: {
    validUntil: string;
    purchaseLimit: number | null;
    consumedUses: number;
    remainingPurchases: number | null;
  } | null;
  revision: string | number;
  history: ReceivingAppealHistoryWire[];
  workingStages?: ReceivingWorkingStage[];
  refusalReasons?: string[];
  readOnly?: boolean;
  access?: Partial<ReceivingPrincipalAccess>;
  /** Legacy per-card rights (`canManageLeads`, `canScan`). */
  capabilities?: ReceivingRowCapabilities | null;
  /** Additive p149 rights when server serves PROF contract. */
  p149Capabilities?: ReceivingAppealP149CapabilitiesWire | null;
};

/**
 * Is the opened card read-only for this actor? Decided by the server's per-card answer; a general «all branches» read
 * from a server without per-card flags is treated as read-only (its aggregate is not a write right).
 */
export function receivingDetailWireReadOnly(
  wire: Pick<ReceivingAppealDetailWire, "readOnly" | "access" | "capabilities">,
  opts?: { scopeAll?: boolean },
): boolean {
  const caps = parseReceivingRowCapabilities(wire.capabilities);
  if (caps) return !caps.canManageLeads;
  if (opts?.scopeAll) return true;
  if (wire.readOnly === true) return true;
  if (wire.access?.mutationsAllowed === false) return true;
  return wire.access?.canManageLeads === false;
}

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
    clientCity: wire.clientCity?.trim() || null,
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
  /** p149 — forwarded as `remCardOnly=1` when server supports filterCounts. */
  remCardOnly?: boolean;
  /** Employee's branch filter; omitted = the server default (working branch / owner default). */
  branchId?: string | null;
  /**
   * Explicit "all accessible branches" for reading. Sent as `branchScope=all` so the server ignores the
   * working-branch cookie; never combined with `branchId` and never sent with a mutation.
   */
  branchScope?: "all";
};

/** Read-only scope of a single GET (detail / funnel): a concrete branch or the explicit "all". */
export type ReceivingReadScope = Pick<ReceivingListFilters, "branchId" | "branchScope">;

export function receivingReadScopeParams(scope?: ReceivingReadScope | null): URLSearchParams {
  const params = new URLSearchParams();
  const branchId = scope?.branchId?.trim();
  if (branchId) params.set("branchId", branchId);
  else if (scope?.branchScope === "all") params.set("branchScope", "all");
  return params;
}

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
  /** Size of the filtered cohort (denominator of `conv`); absent on older servers. */
  total?: number;
  returned?: number;
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
  /** Server-declared capability: change appeals. Absent on older envelopes (treated as allowed). */
  canManageLeads?: boolean;
  /** Server-declared capability: accept certificates (certificate-entry, order-link). */
  canScan?: boolean;
  actorKind?: "owner" | "staff" | "assistant";
};

/** Synthetic marker for list-only org-workplace principal (match K1 when wired). */
export const RECEIVING_ACCESS_LIST_ONLY_DENIAL = "OWNER_CLIENTS_LIST_CONTEXT_ONLY";

export const RECEIVING_FORBIDDEN_MESSAGE =
  "Нет доступа к клиентам этого филиала. Обратитесь к владельцу кабинета.";
export const RECEIVING_VIEW_ONLY_MESSAGE =
  "В режиме просмотра изменять обращения нельзя.";

/** User-facing text for a denial code from the access envelope; never the raw technical code. */
export function receivingDenialMessage(code?: string | null): string {
  if (!code || code === "READ_ONLY" || code === RECEIVING_ACCESS_LIST_ONLY_DENIAL) {
    return RECEIVING_VIEW_ONLY_MESSAGE;
  }
  return RECEIVING_FORBIDDEN_MESSAGE;
}

/** A 403 of any code reads as a plain access sentence, never a bare «Forbidden». */
export function receivingApiErrorMessage(caught: unknown, fallback: string): string {
  if (!(caught instanceof RemcardApiError)) return fallback;
  return caught.status === 403 ? RECEIVING_FORBIDDEN_MESSAGE : caught.message;
}

export function normalizeReceivingAccess(
  raw?: Partial<ReceivingPrincipalAccess> | null,
): ReceivingPrincipalAccess {
  return {
    listAllowed: raw?.listAllowed !== false,
    mutationsAllowed: raw?.mutationsAllowed === true,
    denialCode: raw?.denialCode ?? null,
    ...(typeof raw?.canManageLeads === "boolean" ? { canManageLeads: raw.canManageLeads } : {}),
    ...(typeof raw?.canScan === "boolean" ? { canScan: raw.canScan } : {}),
    ...(raw?.actorKind === "owner" || raw?.actorKind === "staff" || raw?.actorKind === "assistant"
      ? { actorKind: raw.actorKind }
      : {}),
  };
}

/** UI view-model after K1 adapter (`coerceK1ClientAppealsListPayload`). */
export type ReceivingAppealsListResponse = {
  appeals: ReceivingAppealListRow[];
  /** True when GET carried `filterCounts.remCardMatchCount` (p149 contract, including empty page). */
  p149ListContract?: boolean;
  /** p149 rows only — never synthesized from legacy appeals. */
  profAppeals?: ProfAppealListRow[];
  remCardMatchCount?: number;
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
  /** Staff only, from the server's trusted read scope; absent for owners and for servers without it. */
  visibleBranches?: ReceivingStaffBranch[];
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

/** K1 `51353825` working-stages POST kinds (prototype settings actions). */
export type PostReceivingWorkingStagesBody =
  | { kind: "manualChannel"; label: string; expectedVersion?: string | number }
  | { kind: "addWorkingStage"; label: string; expectedVersion?: string | number }
  | { kind: "renameWorkingStage"; stageId: string; label: string; expectedVersion?: string | number }
  | { kind: "archiveWorkingStage"; stageId: string; expectedVersion?: string | number }
  | { kind: "restoreWorkingStage"; stageId: string; expectedVersion?: string | number }
  | { kind: "moveWorkingStage"; stageId: string; direction: "up" | "down"; expectedVersion?: string | number }
  | { kind: "addRefusalReason"; label: string; expectedVersion?: string | number }
  | { kind: "renameRefusalReason"; previousLabel: string; label: string; expectedVersion?: string | number }
  | { kind: "removeRefusalReason"; label: string; expectedVersion?: string | number }
  | {
      kind: "saveSettings";
      workingStages: ReceivingWorkingStage[];
      refusalReasons: string[];
      archivedStages: ReceivingWorkingStage[];
      expectedVersion?: string | number;
    };

export type PostReceivingManualChannelBody = Extract<PostReceivingWorkingStagesBody, { kind: "manualChannel" }>;

export type PostReceivingWorkingStagesResult =
  | { ok: true; snapshot: ReceivingPartnerSettingsSnapshot }
  | { ok: false; code: "BLOCKED_CONTRACT" | "VALIDATION" | "CONFLICT" | "ERROR"; message: string };

const RECEIVING_WORKING_STAGES_PATH = "/api/pro/client-appeals/working-stages";

export function isReceivingWorkingStagesPostReady(): boolean {
  return isAllowedProxyRoute("POST", RECEIVING_WORKING_STAGES_PATH);
}

export function findDuplicateWorkingStageLabel(
  label: string,
  stages: ReceivingWorkingStage[],
): ReceivingWorkingStage | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  return stages.find((s) => s.label.trim().toLowerCase() === lower) ?? null;
}

export function findDuplicateRefusalReasonLabel(
  label: string,
  reasons: string[],
): string | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  return reasons.find((r) => r.trim().toLowerCase() === lower) ?? null;
}

export async function fetchReceivingPartnerSettings(): Promise<
  | { ok: true; snapshot: ReceivingPartnerSettingsSnapshot }
  | { ok: false; code: "BLOCKED_CONTRACT" | "ERROR"; message: string }
> {
  if (!isAllowedProxyRoute("GET", RECEIVING_WORKING_STAGES_PATH)) {
    return {
      ok: false,
      code: "BLOCKED_CONTRACT",
      message: "GET working-stages ждёт P1 allowlist.",
    };
  }
  try {
    const wire = await remcardFetch<ReceivingPartnerSettingsWire>(RECEIVING_WORKING_STAGES_PATH);
    const snapshot = unwrapReceivingPartnerSettingsWire(wire);
    if (!snapshot) {
      return { ok: false, code: "ERROR", message: "Пустой ответ настроек." };
    }
    return { ok: true, snapshot };
  } catch (caught) {
    return {
      ok: false,
      code: "ERROR",
      message: receivingApiErrorMessage(caught, "Не удалось загрузить настройки"),
    };
  }
}

export async function postReceivingWorkingStagesMutation(
  body: PostReceivingWorkingStagesBody,
): Promise<PostReceivingWorkingStagesResult> {
  if (!isReceivingWorkingStagesPostReady()) {
    return {
      ok: false,
      code: "BLOCKED_CONTRACT",
      message: "POST working-stages ждёт K1 handler и P1 allowlist.",
    };
  }
  try {
    const payload = await remcardFetch<ReceivingPartnerSettingsWire>(RECEIVING_WORKING_STAGES_PATH, {
      method: "POST",
      body,
    });
    const snapshot = unwrapReceivingPartnerSettingsWire(payload);
    if (!snapshot) {
      return { ok: false, code: "ERROR", message: "Пустой ответ настроек после сохранения." };
    }
    return { ok: true, snapshot };
  } catch (caught) {
    if (caught instanceof RemcardApiError && caught.status === 409) {
      return { ok: false, code: "CONFLICT", message: caught.message };
    }
    return {
      ok: false,
      code: "ERROR",
      message: receivingApiErrorMessage(caught, "Не удалось сохранить настройки"),
    };
  }
}

export type PostReceivingManualChannelResult =
  | { ok: true; snapshot: ReceivingPartnerSettingsSnapshot; channel: ReceivingManualChannel }
  | { ok: false; code: "BLOCKED_CONTRACT" | "VALIDATION" | "CONFLICT" | "ERROR"; message: string };

export async function postReceivingManualChannel(
  label: string,
  expectedVersion?: string | number,
): Promise<PostReceivingManualChannelResult> {
  const trimmed = label.trim();
  if (!trimmed) {
    return { ok: false, code: "VALIDATION", message: "Введите название канала." };
  }
  const res = await postReceivingWorkingStagesMutation({
    kind: "manualChannel",
    label: trimmed,
    expectedVersion,
  });
  if (!res.ok) return res;
  const channel =
    res.snapshot.settings.manualChannels?.find(
      (c) => c.label.trim().toLowerCase() === trimmed.toLowerCase(),
    ) ?? null;
  if (!channel) {
    return { ok: false, code: "ERROR", message: "Сервер не вернул сохранённый канал." };
  }
  return { ok: true, snapshot: res.snapshot, channel };
}

export function receivingAppealsMutationsAllowed(data: Pick<ReceivingAppealsListResponse, "readOnly">): boolean {
  return data.readOnly !== true;
}

/**
 * K1 GET wire (`83f279e8`): `{ appeals, nextCursor, tab, readOnly }` (+ optional fields when aligned).
 * @see audit/remcard-parallel-20261113/P6/k1-83f279e8-list-envelope.md
 */
/** A branch the employee may read in «Клиенты»: name data of the server's trusted read scope. */
export type ReceivingStaffBranch = { id: string; name: string; city: string; address?: string | null };

export type K1ClientAppealsListWire = {
  appeals?: ReceivingAppealListRowWire[];
  filterCounts?: { remCardMatchCount?: number };
  nextCursor?: string | null;
  tab?: string | null;
  readOnly?: boolean;
  kpis?: ReceivingListKpis;
  settings?: ReceivingPartnerSettings;
  access?: Partial<ReceivingPrincipalAccess>;
  principal?: Partial<ReceivingSessionPrincipal>;
  /** Staff only: active branches readable in «Клиенты» (independent of working assignments). */
  branchScope?: { branches?: ReceivingStaffBranch[] };
  data?: K1ClientAppealsListWire;
};

const RECEIVING_SYSTEM_STAGE_LABELS: Record<string, string> = {
  [RECEIVING_SYSTEM_STAGE.NEW]: "Новое обращение",
  [RECEIVING_SYSTEM_STAGE.PAID]: "Оплачено",
  [RECEIVING_SYSTEM_STAGE.SHIPPED]: "Отгружено",
  [RECEIVING_SYSTEM_STAGE.RETURN]: "Возврат",
  [RECEIVING_SYSTEM_STAGE.REFUSED]: "Отказ",
};

/** Frozen prototype systemLabel/getStageLabel, including archived custom stages. */
export function receivingStageDisplayLabel(
  stageId: string,
  settings?: ReceivingPartnerSettings | null,
  trustedStageLabel?: string | null,
): string {
  return resolveClientAppealStageDisplayLabel({
    stageKey: stageId,
    trustedStageLabel,
    workingStages: [...(settings?.workingStages ?? []), ...(settings?.archivedStages ?? [])],
  });
}

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
  const rub = Math.trunc(kopecks / 100).toLocaleString("ru-RU");
  const frac = Math.abs(kopecks % 100);
  return frac === 0 ? `${rub} ₽` : `${rub},${String(frac).padStart(2, "0")} ₽`;
}

/** List GET query — K1 reads `bucket` + `stage` (stageKey). */
export function buildReceivingAppealsListQuery(
  filters?: Partial<ReceivingListFilters & ProfListFilters>,
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
  for (const [key, value] of receivingReadScopeParams(filters)) params.set(key, value);
  for (const [key, value] of profListQueryParams(filters ?? {})) params.set(key, value);
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
  const capabilities = parseReceivingRowCapabilities(wire.capabilities);
  const row: ReceivingAppealListRow = {
    id: wire.id,
    clientName: (wire.clientDisplayName ?? wire.clientName ?? "").trim() || "—",
    certificateId: wire.certificateId?.trim() ?? "",
    receivingPartnerUserId: uid,
    receivingPartnerId: (wire.receivingPartnerId ?? uid).trim() || uid,
    receivingOrganizationId: wire.receivingOrganizationId,
    receivingBranchId: wire.receivingBranchId,
    referrerPartnerId: (wire.referrerProUserId ?? wire.referrerPartnerId ?? "").trim(),
    referrerDisplayName: trimTrustedClientsDisplayString(wire.referrerDisplayName),
    interest: wire.interest?.trim() ?? "—",
    budgetHint: wire.budgetHint,
    stageId: (wire.stageKey ?? wire.stageId ?? "").trim() || RECEIVING_SYSTEM_STAGE.NEW,
    stageLabel: trimTrustedClientsDisplayString(wire.stageLabel),
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
    ...(capabilities ? { capabilities } : {}),
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
  const appealsWire = list.appeals ?? [];
  const appeals = appealsWire.map(mapReceivingAppealListRowFromWire);
  const p149ListContract = isP149ListContractWire(list);
  const profAppeals = p149ListContract ? coerceProfAppealsFromP149ListWire(appealsWire) : undefined;
  const remCardMatchCount = parseProfFilterCounts(list) ?? undefined;
  const readOnly = list.readOnly === true;
  const out: ReceivingAppealsListResponse = {
    appeals,
    ...(p149ListContract ? { p149ListContract: true } : {}),
    ...(profAppeals != null ? { profAppeals } : {}),
    ...(remCardMatchCount != null ? { remCardMatchCount } : {}),
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
  const branches = list.branchScope?.branches;
  if (Array.isArray(branches)) {
    out.visibleBranches = branches
      .filter((b) => typeof b?.id === "string" && b.id.trim() !== "")
      .map((b) => ({ id: b.id, name: String(b.name ?? ""), city: String(b.city ?? ""), address: b.address ?? null }));
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
export type ReceivingAppealProfilePatchBody = ProfAppealProfilePatchBody;

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
  /** ISO instant, only with `sys_shipped`; omitted/null lets the server use the current time. */
  shippedAt?: string | null;
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
  /** Human text when present (may duplicate or omit when `reason` carries detail). */
  message?: string | null;
  /** K1 validation detail when `valid: false` (e.g. issuer/branch restriction). */
  reason?: unknown;
  outcome?: "created" | "existing";
  appeal?: ReceivingAppealListRowWire;
};

export const RECEIVING_CERTIFICATE_ENTRY_INVALID_FALLBACK =
  "Сертификат недействителен или срок истёк.";

function trimReceivingCertificateEntryText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** `message` wins over `reason`; malformed/missing fields use `fallback`. */
export function resolveReceivingCertificateEntryUserMessage(
  payload: Pick<ReceivingCertificateEntryWireResponse, "message" | "reason">,
  fallback: string = RECEIVING_CERTIFICATE_ENTRY_INVALID_FALLBACK,
): string {
  return (
    trimReceivingCertificateEntryText(payload.message) ??
    trimReceivingCertificateEntryText(payload.reason) ??
    fallback
  );
}

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
      /** Set when server sent only `reason` (trimmed) for invalid certificate entry. */
      reason?: string;
    };

const RECEIVING_CERT_ENTRY_PATH = "/api/pro/client-appeals/certificate-entry";

/** P1 allowlist — separate from list route until K1+P1 land. */
export function isReceivingCertificateEntryProxyReady(): boolean {
  return isAllowedProxyRoute("POST", RECEIVING_CERT_ENTRY_PATH);
}

/** Scanner capture — branch query + abort for preview lifecycle. */
export type ReceivingCertificateEntryCapture = {
  branchId?: string | null;
  signal?: AbortSignal;
};

export const RECEIVING_SCANNER_CRM_READ_ONLY_NOTICE =
  "Создание обращения в CRM недоступно при текущих правах. Покупку через сканер можно оформить, но новое обращение по сертификату здесь не создаётся — откройте раздел «Клиенты» или обратитесь к администратору.";

export type ReceivingScannerCertificateEntryGate =
  | {
      ok: true;
      gate: Pick<ReceivingAppealsListResponse, "readOnly" | "access"> | ReceivingPrincipalAccess;
    }
  | {
      ok: false;
      code: "READ_ONLY" | "BLOCKED_CONTRACT" | "ERROR";
      message: string;
      retryable: boolean;
    };

function receivingListEnvelopeReadOnly(data: Pick<ReceivingAppealsListResponse, "readOnly" | "access">): boolean {
  if (data.readOnly === true) return true;
  if (data.access) {
    return !normalizeReceivingAccess(data.access).mutationsAllowed;
  }
  return false;
}

function receivingScannerGateFromListWire(
  wire: K1ClientAppealsListWire,
):
  | { ok: true; gate: Pick<ReceivingAppealsListResponse, "readOnly" | "access"> }
  | { ok: false; code: "READ_ONLY"; message: string }
  | { ok: false; code: "MALFORMED"; message: string } {
  const list: K1ClientAppealsListWire =
    wire && typeof wire === "object" && wire.data?.appeals != null ? wire.data : wire;
  if (!list || typeof list !== "object") {
    return { ok: false, code: "MALFORMED", message: "Некорректный ответ CRM (список обращений)." };
  }
  const hasReadOnly = typeof list.readOnly === "boolean";
  const hasAccess =
    list.access !== undefined &&
    list.access !== null &&
    typeof list.access === "object" &&
    typeof list.access.mutationsAllowed === "boolean";
  if (!hasReadOnly && !hasAccess) {
    return {
      ok: false,
      code: "MALFORMED",
      message: "Сервер не вернул явных прав CRM (readOnly/access).",
    };
  }
  const data = coerceK1ClientAppealsListPayload(wire);
  if (receivingListEnvelopeReadOnly(data)) {
    return {
      ok: false,
      code: "READ_ONLY",
      message: RECEIVING_SCANNER_CRM_READ_ONLY_NOTICE,
    };
  }
  return { ok: true, gate: { readOnly: data.readOnly, access: data.access } };
}

/** Read-only GET list envelope — authoritative CRM write scope for certificate-entry. */
export async function resolveReceivingScannerCertificateEntryGate(
  capture?: ReceivingCertificateEntryCapture,
): Promise<ReceivingScannerCertificateEntryGate> {
  if (!isReceivingAppealsProxyReady()) {
    return {
      ok: false,
      code: "BLOCKED_CONTRACT",
      message: RECEIVING_API_CONTRACT_NOTE,
      retryable: false,
    };
  }
  const branchId = capture?.branchId?.trim() || undefined;
  const listPath = branchId
    ? `/api/pro/client-appeals?${new URLSearchParams({ branchId }).toString()}`
    : "/api/pro/client-appeals";
  try {
    const listWire = await remcardFetch<K1ClientAppealsListWire>(listPath, {
      signal: capture?.signal,
    });
    const parsed = receivingScannerGateFromListWire(listWire);
    if (!parsed.ok) {
      if (parsed.code === "READ_ONLY") {
        return {
          ok: false,
          code: "READ_ONLY",
          message: parsed.message,
          retryable: false,
        };
      }
      return {
        ok: false,
        code: "ERROR",
        message: parsed.message,
        retryable: true,
      };
    }
    return { ok: true, gate: parsed.gate };
  } catch (caught) {
    if (caught instanceof RemcardApiError && caught.status === 403) {
      return {
        ok: false,
        code: "READ_ONLY",
        message: RECEIVING_SCANNER_CRM_READ_ONLY_NOTICE,
        retryable: false,
      };
    }
    if (caught instanceof DOMException && caught.name === "AbortError") {
      return {
        ok: false,
        code: "ERROR",
        message: "Проверка прав CRM отменена.",
        retryable: true,
      };
    }
    return {
      ok: false,
      code: "ERROR",
      message:
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось проверить права CRM. Повторите позже.",
      retryable: true,
    };
  }
}

export async function submitReceivingCertificateEntry(
  body: ReceivingCertificateEntryBody,
  gate?: Pick<ReceivingAppealsListResponse, "readOnly"> | ReceivingPrincipalAccess,
  capture?: ReceivingCertificateEntryCapture,
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
  const branchId = capture?.branchId?.trim() || undefined;
  try {
    const payload = await remcardFetch<ReceivingCertificateEntryWireResponse>(RECEIVING_CERT_ENTRY_PATH, {
      method: "POST",
      body: { promoCode: body.promoCode },
      searchParams: branchId ? { branchId } : undefined,
      signal: capture?.signal,
    });
    if (payload.valid === false) {
      const detail = resolveReceivingCertificateEntryUserMessage(payload);
      const reasonOnly =
        !trimReceivingCertificateEntryText(payload.message) &&
        trimReceivingCertificateEntryText(payload.reason);
      return {
        ok: false,
        code: "INVALID",
        message: detail,
        ...(reasonOnly ? { reason: reasonOnly } : {}),
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
      message: receivingApiErrorMessage(caught, "Не удалось обработать сертификат"),
    };
  }
}

/** P5 bulk — POST /api/pro/client-appeals/batch */
export type ReceivingAppealsBatchBody = {
  ids: string[];
  action: "archive" | "unarchive" | "trash" | "restore" | "patch";
  patch?: { stageKey?: string; privateNotes?: string };
};

/** K1 batch response — consumed by P5 `normalizeReceivingBatchResponse`. */
export type ReceivingAppealsBatchResponseWire = {
  action?: "archive" | "unarchive" | "trash" | "restore";
  updatedIds: string[];
  skippedIds: string[];
  failures: { id: string; code?: string; reason?: string; message?: string }[];
};

export type PostReceivingAppealsBatchResult =
  | { ok: true; data: ReceivingAppealsBatchResponseWire }
  | { ok: false; code: "BLOCKED_CONTRACT" | "ERROR"; message: string };

const RECEIVING_BATCH_PATH = "/api/pro/client-appeals/batch";

export function isReceivingBatchProxyReady(): boolean {
  return isAllowedProxyRoute("POST", RECEIVING_BATCH_PATH);
}

function coerceReceivingAppealsBatchWire(payload: unknown): ReceivingAppealsBatchResponseWire | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  if (!Array.isArray(p.updatedIds)) return null;
  // Keep the original evidence, including malformed fields, for the request-bound
  // normalizer. Filtering here could erase a contradiction and invent success.
  return payload as ReceivingAppealsBatchResponseWire;
}

export async function postReceivingAppealsBatch(body: {
  action: NonNullable<ReceivingAppealsBatchResponseWire["action"]>;
  ids: string[];
}): Promise<PostReceivingAppealsBatchResult> {
  const ids = [...new Set(body.ids.filter((id) => id.trim().length > 0))];
  if (ids.length === 0) {
    return { ok: false, code: "ERROR", message: "Не выбрано ни одного обращения." };
  }
  if (!isReceivingBatchProxyReady()) {
    return {
      ok: false,
      code: "BLOCKED_CONTRACT",
      message: "POST /api/pro/client-appeals/batch ждёт P1 allowlist и K1 handler.",
    };
  }
  try {
    const data = await remcardFetch<ReceivingAppealsBatchResponseWire>(RECEIVING_BATCH_PATH, {
      method: "POST",
      body: { action: body.action, ids } satisfies ReceivingAppealsBatchBody,
    });
    return { ok: true, data };
  } catch (caught) {
    if (caught instanceof RemcardApiError && caught.body && caught.status !== 401 && caught.status !== 403) {
      const partial = coerceReceivingAppealsBatchWire(caught.body);
      if (partial && (caught.status === 409 || partial.updatedIds.length > 0)) {
        return { ok: true, data: partial };
      }
    }
    return {
      ok: false,
      code: "ERROR",
      message: receivingApiErrorMessage(caught, "Не удалось выполнить групповое действие"),
    };
  }
}

export type ReceivingAppealsLoadResult =
  | { ok: true; data: ReceivingAppealsListResponse }
  | {
      ok: false;
      code: "BLOCKED_CONTRACT" | "ERROR";
      blockerId?: string;
      message: string;
      missingRoutes?: string[];
      /** Transport metadata for safe list refresh recovery, not a write permission. */
      httpStatus?: number;
      retryable?: boolean;
    };

const RECEIVING_BLOCKER_ID = "BLK-RECEIVING-APPEALS";

function receivingContractBlocked(): Extract<ReceivingAppealsLoadResult, { ok: false }> {
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
      message: receivingApiErrorMessage(caught, "Не удалось загрузить обращения"),
      httpStatus: caught instanceof RemcardApiError ? caught.status : undefined,
      retryable: !(caught instanceof RemcardApiError && (caught.status === 401 || caught.status === 403)),
    };
  }
}

export type ReceivingAppealCreateResult =
  | { ok: true }
  | Extract<ReceivingAppealsLoadResult, { ok: false }>;

export async function createReceivingAppeal(
  body: ReceivingAppealCreateBody,
  gate?: Pick<ReceivingAppealsListResponse, "readOnly"> | ReceivingPrincipalAccess,
  capture?: { branchId?: string | null },
): Promise<ReceivingAppealCreateResult> {
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
      body: toK1ReceivingAppealCreateBody(body),
      searchParams: capture?.branchId?.trim() ? { branchId: capture.branchId.trim() } : undefined,
    });
    // A committed POST must never become a retryable creation error because a
    // subsequent list GET failed. The workspace owns read-only reconciliation.
    return { ok: true };
  } catch (caught) {
    return {
      ok: false,
      code: "ERROR",
      message: receivingApiErrorMessage(caught, "Не удалось создать обращение"),
    };
  }
}

/** P4 detail load — GET must be read-only on server (no write side effects). */
export async function fetchReceivingAppealDetail(
  id: string,
  scope?: ReceivingReadScope | null,
): Promise<
  | { ok: true; data: ReceivingAppealDetailPayload }
  | { ok: false; code: "BLOCKED_CONTRACT" | "ERROR"; message: string }
> {
  const raw = await fetchReceivingAppealDetailWire(id, scope);
  if (!raw.ok) {
    return {
      ok: false,
      code: raw.code === "NOT_FOUND" ? "ERROR" : raw.code,
      message: raw.message,
    };
  }
  return { ok: true, data: mapReceivingAppealDetailFromWire(raw.wire) };
}

/** Raw K1 GET envelope for P4 mapper (`receiving-detail-envelope-bridge.ts`). */
export async function fetchReceivingAppealDetailWire(
  id: string,
  scope?: ReceivingReadScope | null,
): Promise<
  | { ok: true; wire: ReceivingAppealDetailWire }
  | {
      ok: false;
      code: "BLOCKED_CONTRACT" | "NOT_FOUND" | "ERROR";
      message: string;
    }
> {
  const path = `/api/pro/client-appeals/${encodeURIComponent(id)}`;
  if (!isAllowedProxyRoute("GET", path)) {
    return { ok: false, code: "BLOCKED_CONTRACT", message: RECEIVING_API_CONTRACT_NOTE };
  }
  try {
    const qs = receivingReadScopeParams(scope).toString();
    const payload = await remcardFetch<ReceivingAppealDetailWire>(qs ? `${path}?${qs}` : path);
    return { ok: true, wire: payload };
  } catch (caught) {
    if (caught instanceof RemcardApiError && caught.status === 404) {
      return { ok: false, code: "NOT_FOUND", message: "Обращение не найдено." };
    }
    return {
      ok: false,
      code: "ERROR",
      message: receivingApiErrorMessage(caught, "Не удалось загрузить обращение"),
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

export type ReceivingAppealPatchOneResult =
  | { ok: true }
  | { ok: false; code: "CONFLICT" | "BLOCKED_CONTRACT" | "ERROR"; message: string };

/** Detail host — profile PATCH with CAS, no list reload. */
export async function patchReceivingAppealProfileCas(
  id: string,
  body: ReceivingAppealProfilePatchBody,
): Promise<ReceivingAppealPatchOneResult> {
  const path = `/api/pro/client-appeals/${encodeURIComponent(id)}`;
  if (!isReceivingAppealProfilePatchProxyReady(id)) {
    return { ok: false, code: "BLOCKED_CONTRACT", message: "PATCH profile ждёт P1 allowlist." };
  }
  try {
    await remcardFetch(path, { method: "PATCH", body });
    return { ok: true };
  } catch (caught) {
    if (caught instanceof RemcardApiError && caught.status === 409) {
      return { ok: false, code: "CONFLICT", message: caught.message };
    }
    return {
      ok: false,
      code: "ERROR",
      message: receivingApiErrorMessage(caught, "Не удалось сохранить профиль"),
    };
  }
}

/** Detail host — stage PATCH with CAS, no list reload. */
export async function patchReceivingAppealStageCas(
  id: string,
  body: ReceivingAppealStagePatchBody,
): Promise<ReceivingAppealPatchOneResult> {
  const path = `/api/pro/client-appeals/${encodeURIComponent(id)}/stage`;
  if (!isReceivingAppealStagePatchProxyReady(id)) {
    return {
      ok: false,
      code: "BLOCKED_CONTRACT",
      message: "PATCH stage ждёт K1 `/:id/stage` + P1 allowlist.",
    };
  }
  try {
    await remcardFetch(path, { method: "PATCH", body });
    return { ok: true };
  } catch (caught) {
    if (caught instanceof RemcardApiError && caught.status === 409) {
      return { ok: false, code: "CONFLICT", message: caught.message };
    }
    return {
      ok: false,
      code: "ERROR",
      message: receivingApiErrorMessage(caught, "Не удалось сменить этап"),
    };
  }
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
    await remcardFetch(path, { method: "PATCH", body });
    return fetchReceivingAppealsWorkspace();
  } catch (caught) {
    return {
      ok: false,
      code: "ERROR",
      message: receivingApiErrorMessage(caught, "Не удалось сохранить профиль"),
    };
  }
}

export type ReceivingAppealOrderLinkBody = {
  orderId: string;
  expectedRevision: number;
};

export type ReceivingAppealOrderLinkSuccess = {
  appealId: string;
  orderId: string;
  revision: number;
  alreadyLinked: boolean;
};

export type ReceivingAppealOrderLinkResult =
  | { ok: true; data: ReceivingAppealOrderLinkSuccess }
  | {
      ok: false;
      code: "BLOCKED_CONTRACT" | "CONFLICT" | "FORBIDDEN" | "NOT_FOUND" | "INVALID" | "ERROR";
      message: string;
      status?: number;
    };

export function isReceivingAppealOrderLinkProxyReady(id = "x"): boolean {
  return isAllowedProxyRoute("POST", `/api/pro/client-appeals/${id}/order-link`);
}

/** POST …/:id/order-link — after store order success only; no store order retry here. */
export async function postReceivingAppealOrderLink(
  appealId: string,
  body: ReceivingAppealOrderLinkBody,
): Promise<ReceivingAppealOrderLinkResult> {
  const path = `/api/pro/client-appeals/${encodeURIComponent(appealId)}/order-link`;
  if (!isReceivingAppealOrderLinkProxyReady(appealId)) {
    return { ok: false, code: "BLOCKED_CONTRACT", message: RECEIVING_API_CONTRACT_NOTE };
  }
  try {
    const data = await remcardFetch<ReceivingAppealOrderLinkSuccess>(path, {
      method: "POST",
      body,
    });
    return { ok: true, data };
  } catch (caught) {
    if (caught instanceof RemcardApiError) {
      const status = caught.status;
      const codeFromBody = caught.body?.code?.trim();
      const code =
        status === 403
          ? "FORBIDDEN"
          : status === 404
            ? "NOT_FOUND"
            : status === 409
              ? "CONFLICT"
              : status === 400 || status === 401 || status === 422
                ? "INVALID"
                : codeFromBody === "CONFLICT"
                  ? "CONFLICT"
                  : "ERROR";
      return {
        ok: false,
        code,
        message: caught.message,
        status,
      };
    }
    return { ok: false, code: "ERROR", message: "Не удалось привязать заказ к обращению." };
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
    await remcardFetch(path, { method: "PATCH", body });
    return fetchReceivingAppealsWorkspace();
  } catch (caught) {
    return {
      ok: false,
      code: "ERROR",
      message: receivingApiErrorMessage(caught, "Не удалось сменить этап"),
    };
  }
}


/** `GET /api/pro/client-appeals/funnel` — read-only aggregation of the receiving owner's cohort. */
export type ReceivingFunnelCohort = { total: number; paid: number; conv: string };

export type ReceivingFunnel = {
  total: number;
  inWork: number;
  paid: number;
  shipped: number;
  returned: number;
  conv: string;
  period: { from: string | null; to: string | null };
  /** Mean client purchase amount in kopecks; null when the cohort has no counted purchases. */
  avgCheckKopecks: number | null;
  avgCheckPurchases: number;
  certificate: ReceivingFunnelCohort;
  manual: ReceivingFunnelCohort;
};

export type ReceivingFunnelQuery = {
  /** `YYYY-MM-DD` (UTC day start). Omit for no lower bound. */
  from?: string;
  /** `YYYY-MM-DD` (UTC day end). Omit for no upper bound. */
  to?: string;
  source?: "all" | "cert" | "manual";
  branchId?: string | null;
  branchScope?: "all";
};

export type ReceivingFunnelLoadResult =
  | { ok: true; funnel: ReceivingFunnel }
  | { ok: false; code: "BLOCKED_CONTRACT" | "VALIDATION" | "ERROR"; message: string };

const RECEIVING_FUNNEL_PATH = "/api/pro/client-appeals/funnel";

export async function fetchReceivingFunnel(
  query: ReceivingFunnelQuery = {},
  signal?: AbortSignal,
): Promise<ReceivingFunnelLoadResult> {
  if (!isAllowedProxyRoute("GET", RECEIVING_FUNNEL_PATH)) {
    return { ok: false, code: "BLOCKED_CONTRACT", message: RECEIVING_API_CONTRACT_NOTE };
  }
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.source && query.source !== "all") params.set("source", query.source);
  for (const [key, value] of receivingReadScopeParams(query)) params.set(key, value);
  const qs = params.toString();
  try {
    const payload = await remcardFetch<{ funnel?: ReceivingFunnel }>(
      qs ? `${RECEIVING_FUNNEL_PATH}?${qs}` : RECEIVING_FUNNEL_PATH,
      { signal },
    );
    if (!payload?.funnel || typeof payload.funnel.total !== "number") {
      return { ok: false, code: "ERROR", message: "Пустой ответ аналитики." };
    }
    return { ok: true, funnel: payload.funnel };
  } catch (caught) {
    if (caught instanceof RemcardApiError && caught.status === 400) {
      return { ok: false, code: "VALIDATION", message: caught.message };
    }
    if (caught instanceof DOMException && caught.name === "AbortError") throw caught;
    return {
      ok: false,
      code: "ERROR",
      message: receivingApiErrorMessage(caught, "Не удалось загрузить аналитику"),
    };
  }
}
