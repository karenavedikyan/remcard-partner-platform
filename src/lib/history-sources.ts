import type { AuthUser } from "@/lib/types";

export type HistorySourceAvailability = {
  /** GET /api/store/orders returned 200 for store-like user */
  acceptedOrders: boolean;
  /** GET /api/pro/orders returned 200 */
  issuedOrders: boolean;
};

export function isStoreLikePartner(user: AuthUser): boolean {
  return (
    user.partnerType === "STORE" ||
    user.partnerType === "COMPANY" ||
    user.partnerType === "MASTER"
  );
}

/** Legacy limitation banner removed once accepted-order API is active. */
export function shouldShowAcceptedBonusLimitation(
  _sources: HistorySourceAvailability,
): boolean {
  return false;
}

export function shouldShowAcceptedBonusEmptyNote(
  sources: HistorySourceAvailability,
  acceptedRowCount: number,
  loading: boolean,
  error: boolean,
  acceptedAccessDenied: boolean,
): boolean {
  return (
    sources.acceptedOrders &&
    !sources.issuedOrders &&
    !loading &&
    !error &&
    !acceptedAccessDenied &&
    acceptedRowCount === 0
  );
}

export function shouldShowAcceptedAccessDeniedNote(
  acceptedAccessDenied: boolean,
  loading: boolean,
  error: boolean,
): boolean {
  return acceptedAccessDenied && !loading && !error;
}
