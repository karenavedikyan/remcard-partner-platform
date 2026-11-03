import type { EmployeesOverviewResponse } from "./employees-overview-types";

export type TeamNewPartnerEmptyGateInput = {
  contentReady: boolean;
  overview: EmployeesOverviewResponse | null;
  displayTeamCount: number;
  pendingInviteCount: number;
  soloEmployeeCount: number;
  searchQuery: string;
  locationFilter: string;
  invitesLoadError: boolean;
  canManage: boolean;
};

/** True only when roster is genuinely empty (not search/filter, loading, or partial invite failure). */
export function shouldShowTeamNewPartnerEmptyState(input: TeamNewPartnerEmptyGateInput): boolean {
  if (!input.contentReady || !input.overview) return false;
  if (input.overview.myRole === "OTHER") return false;
  if (input.searchQuery.trim()) return false;
  if (input.locationFilter !== "all") return false;
  if (input.displayTeamCount > 0) return false;
  if (input.pendingInviteCount > 0) return false;
  if (input.overview.myRole === "SOLO_PARTNER" && input.soloEmployeeCount > 0) return false;
  if (input.canManage && input.invitesLoadError) return false;
  return true;
}
