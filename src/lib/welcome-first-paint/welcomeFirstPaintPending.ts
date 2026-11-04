import type { AgentR03ListSort } from "@/lib/agent-r03/types";
import type { ScannerEmptyActivityProbe } from "@/lib/scanner-empty/eligibility";

/** Initial baseline list fetch — hide legacy chrome until load settles (not filter refetch). */
export function isClientsWelcomeDecisionPending(input: {
  loadState: "loading" | "loaded" | "error";
  page: number;
  appliedQ: string;
  archived: boolean;
  sort: AgentR03ListSort;
  itemsLength: number;
}): boolean {
  if (input.loadState !== "loading") return false;
  if (input.itemsLength > 0) return false;
  if (input.page !== 1) return false;
  if (input.archived) return false;
  if (input.appliedQ.trim()) return false;
  if (input.sort !== "updated_desc") return false;
  return true;
}

export function isCertificatesWelcomeDecisionPending(input: {
  loadState: "loading" | "loaded" | "error";
  itemsLength: number;
  archived: boolean;
  filtersActive: boolean;
}): boolean {
  if (input.loadState !== "loading") return false;
  if (input.itemsLength > 0) return false;
  if (input.archived) return false;
  if (input.filtersActive) return false;
  return true;
}

export function isPartnersOverviewPresentationPending(input: {
  loading: boolean;
  listReady: boolean;
}): boolean {
  return input.loading || !input.listReady;
}

export function isScannerWelcomeDecisionPending(probe: ScannerEmptyActivityProbe): boolean {
  return probe.status === "idle" || probe.status === "loading";
}

export function isTeamWelcomeDecisionPending(input: {
  loading: boolean;
  error: string;
}): boolean {
  return input.loading && !input.error.trim();
}

export function isRecommendationsWelcomeDecisionPending(input: {
  loadState: "loading" | "loaded" | "error";
  itemsLength: number;
}): boolean {
  return input.loadState === "loading" && input.itemsLength === 0;
}

export function isHomeMetricsPresentationPending(loadState: "loading" | "loaded"): boolean {
  return loadState === "loading";
}
