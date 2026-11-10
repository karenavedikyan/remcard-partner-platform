import {
  authorizeSettlementWalletRead,
  settlementWalletAccessDeniedCopy,
  type SettlementWalletReadAuthResult,
} from "@/lib/employee-workspace-data/settlement-wallet-read-auth";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import type { WorkplacePartnerType } from "@/lib/cabinet-presentation/types";

/** React cache / remount scope: always actor session id, never organization.ownerId. */
export function businessWalletLedgerScopeKey(input: {
  actorUserId: string;
  organizationId: string | null | undefined;
  partnerType: WorkplacePartnerType;
}): string {
  const orgPart = input.organizationId?.trim() || "no-org";
  return `${input.partnerType}:${orgPart}:${input.actorUserId}`;
}

/** Payout requisites and wallet mutations remain owner-only on backend. */
export function canManageBusinessWalletRequisites(input: {
  user: Pick<AuthUser, "role">;
  proContext: ProContextSnapshot | null;
}): boolean {
  if (input.user.role !== "PRO") return false;
  return input.proContext?.role === "ORG_OWNER";
}

export function resolveSettlementWalletReadAccess(input: {
  user: Pick<AuthUser, "id" | "role">;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): SettlementWalletReadAuthResult {
  return authorizeSettlementWalletRead(input);
}

export function settlementWalletReadBlockedMessage(
  auth: Extract<SettlementWalletReadAuthResult, { allowed: false }>,
): string {
  return settlementWalletAccessDeniedCopy(auth.reason);
}

/**
 * Explicit granted branches for staff settlements GET ?branchId= union.
 * Company-wide staff (`org-member-company-ledger`) and owner/solo return undefined
 * so the loader uses unscoped GET /api/pro/wallet/settlements.
 */
export function walletLedgerBranchIdsFromReadAuth(
  auth: SettlementWalletReadAuthResult,
): string[] | undefined {
  if (!auth.allowed || auth.mode !== "org-member-with-ledger") return undefined;
  const ids = [...new Set((auth.branchIds ?? []).map((id) => id.trim()).filter(Boolean))].sort();
  return ids.length > 0 ? ids : undefined;
}
