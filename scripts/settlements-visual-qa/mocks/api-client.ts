import type { SettlementsResponse } from "@/lib/settlements-types";
import {
  QA_FAIL_BRANCH,
  qaBranchScopedSettlements,
  qaOwnerAggregateSettlements,
} from "./company-wallet-fixtures";

export type ApiErrorBody = {
  error?: string;
  message?: string;
};

export class RemcardApiError extends Error {
  status: number;
  body: ApiErrorBody | null;
  constructor(status: number, message: string, body: ApiErrorBody | null = null) {
    super(message);
    this.name = "RemcardApiError";
    this.status = status;
    this.body = body;
  }
}

declare global {
  interface Window {
    __QA_SETTLEMENTS_FETCH_LOG__?: string[];
  }
}

function logSettlementsPath(path: string) {
  if (typeof window === "undefined") return;
  if (!path.includes("/api/pro/wallet/settlements")) return;
  window.__QA_SETTLEMENTS_FETCH_LOG__ = window.__QA_SETTLEMENTS_FETCH_LOG__ ?? [];
  window.__QA_SETTLEMENTS_FETCH_LOG__.push(path);
}

function parseBranchId(path: string): string | null {
  const qIndex = path.indexOf("?");
  if (qIndex < 0) return null;
  const params = new URLSearchParams(path.slice(qIndex + 1));
  return params.get("branchId");
}

/** Synthetic 403 only on ?scene=company-staff-403 (staff-6 must succeed on branch-b4). */
function qaSyntheticBranch403Enabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("scene") === "company-staff-403";
}

export async function remcardFetch<T>(path: string): Promise<T> {
  logSettlementsPath(path);
  if (!path.startsWith("/api/pro/wallet/settlements")) {
    throw new RemcardApiError(501, `Harness stub: unmocked path ${path}`);
  }

  const branchId = parseBranchId(path);
  if (!branchId) {
    return qaOwnerAggregateSettlements() as T;
  }
  if (branchId === QA_FAIL_BRANCH && qaSyntheticBranch403Enabled()) {
    throw new RemcardApiError(403, "Synthetic branch forbidden");
  }
  return qaBranchScopedSettlements(branchId) as T;
}

export async function remcardFetchBlob(): Promise<{ blob: Blob; filename: string | null }> {
  throw new RemcardApiError(501, "Harness stub: export not available in visual QA");
}

export function remcardApiErrorMessage(status: number, statusText: string, body: ApiErrorBody | null) {
  return body?.message?.trim() || statusText || `Ошибка (${status})`;
}
