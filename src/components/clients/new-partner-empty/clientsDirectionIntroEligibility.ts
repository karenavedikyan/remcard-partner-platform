import type { AgentR03ListSort } from "@/lib/agent-r03/types";
import type { ReceivingListFilters } from "@/lib/clients-parity/receiving-appeals-api";
import type { ObserverFilterState } from "@/lib/clients-parity/filter-observer";
import type { ObserverDataContractState } from "@/components/clients/observer/ObserverPartnersListView";

export function isReceivingDirectionIntroEligible(input: {
  phase: "loading" | "blocked" | "ready" | "error";
  listView: "list" | "manual" | "settings" | "scan" | "detail";
  filters: ReceivingListFilters;
  appealsLength: number;
  serverBacked: boolean;
  listHasMore: boolean;
}): boolean {
  if (input.phase !== "ready") return false;
  if (input.listView !== "list") return false;
  if (input.appealsLength !== 0) return false;
  if (input.filters.bucket !== "active") return false;
  if (input.filters.q.trim()) return false;
  if (input.filters.status !== "Все статусы") return false;
  if (input.filters.source !== "all") return false;
  if (input.serverBacked && input.listHasMore) return false;
  return true;
}

export function isObserverDirectionIntroEligible(input: {
  loadState: "loading" | "blocked" | "ready";
  dataContract: ObserverDataContractState;
  appealsLength: number;
  filters: ObserverFilterState;
}): boolean {
  if (input.loadState !== "ready") return false;
  if (input.dataContract.status !== "ready") return false;
  if (input.appealsLength !== 0) return false;
  if (input.filters.q.trim()) return false;
  if (input.filters.period !== "all") return false;
  if (input.filters.bucket !== "active") return false;
  return true;
}

/** Legacy agent-r03 list — unchanged gate for AgentClientsList consumers. */
export function isClientsNewPartnerEmptyEligible(input: {
  loadState: "loading" | "loaded" | "error";
  page: number;
  appliedQ: string;
  archived: boolean;
  sort: AgentR03ListSort;
  itemsLength: number;
  knownListCounts: { active: number; archived: number } | null;
}): boolean {
  if (input.loadState !== "loaded") return false;
  if (input.itemsLength !== 0) return false;
  if (input.page !== 1) return false;
  if (input.archived) return false;
  if (input.appliedQ.trim()) return false;
  if (input.sort !== "updated_desc") return false;
  if (!input.knownListCounts) return false;
  if (input.knownListCounts.active !== 0) return false;
  if (input.knownListCounts.archived !== 0) return false;
  return true;
}