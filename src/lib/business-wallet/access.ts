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
