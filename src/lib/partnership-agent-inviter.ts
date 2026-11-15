import { isBusinessStoreCompanyWalletOwner } from "@/lib/business-wallet-admission";
import { userHasAgentActivity } from "@/lib/principal-agent-eligibility";

/** Agent cooperation invite: AGENT activity, excluding business STORE/COMPANY owners (legacy technical STORE agents allowed). */
export function isAgentCooperationInviter(user: {
  partnerType: string | null;
  partnerActivities?: string[] | null;
  role?: string | null;
  isBlocked?: boolean;
  isStoreOwner?: boolean;
}): boolean {
  if (!userHasAgentActivity(user)) return false;
  if (isBusinessStoreCompanyWalletOwner(user)) return false;
  return true;
}
