/** Session-only branch choice for store home metrics (no global context PATCH). */
export const BUSINESS_HOME_BRANCH_SESSION_KEY = "remcard-business-home-branch-id";

export function readBusinessHomeBranchId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(BUSINESS_HOME_BRANCH_SESSION_KEY)?.trim();
  return raw || null;
}

export function writeBusinessHomeBranchId(branchId: string | null) {
  if (typeof sessionStorage === "undefined") return;
  if (!branchId?.trim()) {
    sessionStorage.removeItem(BUSINESS_HOME_BRANCH_SESSION_KEY);
    return;
  }
  sessionStorage.setItem(BUSINESS_HOME_BRANCH_SESSION_KEY, branchId.trim());
}

export function businessHomeMetricsPath(homeBranchId: string | null): string {
  if (!homeBranchId) return "/api/pro/business-home/metrics";
  const qs = new URLSearchParams({ branchId: homeBranchId });
  return `/api/pro/business-home/metrics?${qs.toString()}`;
}
