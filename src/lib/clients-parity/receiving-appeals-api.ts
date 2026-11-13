/**
 * Receiving CRM («Клиенты у меня») — typed contract surface for prototype client-appeals.js.
 * Loads only when P1 proxy allowlists routes; otherwise honest BLOCKED_CONTRACT (no fixtures).
 *
 * **K8 canonical sync (pending push):** `src/lib/clientAppeals/contract.ts` @
 * `fc33b4fae859fb692757807c3b27696b66d57558` + `HANDOFF.md` @ `16253b84` on branch
 * `cursor/remcard-k8-acceptance-20261113` — **not readable on origin/GitHub API yet**;
 * re-import DTOs when K8 lands; do not invent competing schemas or localStorage settings.
 */
export const RECEIVING_API_CONTRACT_NOTE =
  "K8_CANDIDATE_PENDING: partnerSettings persistence requires K8 additive storage, not API constants.";

import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { CLIENTS_CONTRACT_BLOCKERS } from "./contracts";
import { isAllowedProxyRoute } from "@/lib/remcard-proxy";

/** Prototype Appeal typedef (incoming receivingPartnerId scope). */
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
  receivingPartnerId: string;
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
 * Prototype `partnerSettings` — must be persisted (K8 additive settings storage).
 * Constants-only defaults are **not** production-ready (Root review fc33b4fa gap #2).
 */
export type ReceivingPartnerSettings = {
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

export type ReceivingListKpis = {
  inWork: number;
  paid: number;
  shipped: number;
  conv: string;
};

export type ReceivingAppealsListResponse = {
  appeals: ReceivingAppealListRow[];
  kpis: ReceivingListKpis;
  settings: ReceivingPartnerSettings;
};

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
export async function fetchReceivingAppealsWorkspace(): Promise<ReceivingAppealsLoadResult> {
  if (!isReceivingAppealsProxyReady()) {
    return receivingContractBlocked();
  }
  try {
    const [list, settings] = await Promise.all([
      remcardFetch<ReceivingAppealsListResponse>("/api/pro/client-appeals"),
      remcardFetch<ReceivingPartnerSettings>("/api/pro/client-appeals/working-stages").catch(
        () => null,
      ),
    ]);
    return {
      ok: true,
      data: {
        appeals: list.appeals ?? [],
        kpis: list.kpis ?? { inWork: 0, paid: 0, shipped: 0, conv: "—" },
        settings: settings ?? list.settings ?? { workingStages: [], refusalReasons: [], archivedStages: [] },
      },
    };
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
): Promise<ReceivingAppealsLoadResult> {
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

export async function patchReceivingAppeal(
  id: string,
  body: ReceivingAppealPatchBody,
): Promise<ReceivingAppealsLoadResult> {
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
