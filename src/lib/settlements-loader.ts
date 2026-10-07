import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { SettlementsResponse } from "./settlements-types";

export async function fetchSettlements(): Promise<SettlementsResponse> {
  return remcardFetch<SettlementsResponse>("/api/pro/wallet/settlements");
}

export function isSettlementsAccessDenied(error: unknown): boolean {
  return error instanceof RemcardApiError && (error.status === 403 || error.status === 404);
}
