import type { AgentR03ListSort } from "@/lib/agent-r03/types";

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
