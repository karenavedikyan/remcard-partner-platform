import { isPureAgentActivities } from "@/lib/agent-profile/mode";

/** Business STORE/COMPANY wallet principal (not legacy technical STORE+AGENT-only). */
export function isBusinessStoreCompanyWalletOwner(user: {
  role?: string | null;
  partnerType: string | null;
  partnerActivities?: string[] | null;
}): boolean {
  if (user.role && user.role !== "PRO") return false;
  const acts = user.partnerActivities ?? [];
  if (acts.includes("STORE") || acts.includes("SERVICE")) return true;
  const pt = user.partnerType;
  if (pt !== "STORE" && pt !== "COMPANY") return false;
  if (isPureAgentActivities(acts)) return false;
  return true;
}