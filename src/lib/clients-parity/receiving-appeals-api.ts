/**
 * Receiving CRM («Клиенты у меня») — typed contract surface for prototype client-appeals.js.
 * Loads only when P1 proxy allowlists routes; otherwise honest BLOCKED_CONTRACT (no fixtures).
 */

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
  clientContact?: string | null;
  purchaseId?: string | null;
  createdAt: string;
  updatedAt: string;
  manualEntry?: boolean;
};

export type ReceivingWorkingStage = {
  id: string;
  label: string;
};

export type ReceivingPartnerSettings = {
  workingStages: ReceivingWorkingStage[];
  refusalReasons: string[];
  archivedStages: ReceivingWorkingStage[];
};

export type ReceivingListBucket = "active" | "archive" | "trash";

/** Prototype ws() list state for incoming tab (renderListPage). */
export type ReceivingListFilters = {
  q: string;
  status: string;
  source: "all" | "cert" | "manual";
  bucket: ReceivingListBucket;
};

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
