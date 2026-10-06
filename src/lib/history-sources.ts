import type { AuthUser } from "@/lib/types";

export type HistorySourceAvailability = {
  /** GET /api/store/bonus-list returned 200 for store-like user */
  acceptedBonusList: boolean;
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

export function shouldShowAcceptedBonusLimitation(
  sources: HistorySourceAvailability,
): boolean {
  return sources.acceptedBonusList;
}

export function shouldShowAcceptedBonusEmptyNote(
  sources: HistorySourceAvailability,
  acceptedRowCount: number,
  loading: boolean,
  error: boolean,
): boolean {
  return (
    sources.acceptedBonusList &&
    !loading &&
    !error &&
    acceptedRowCount === 0
  );
}
