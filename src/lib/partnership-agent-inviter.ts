/** Mirrors navigator isAgentCooperationInviter / businessWalletAdmission. */

import type { PartnerActivitiesList } from "@/lib/types";

export function isPureAgentActivities(activities: PartnerActivitiesList): boolean {
  const list = activities ?? [];
  return list.includes("AGENT") && !list.includes("STORE") && !list.includes("SERVICE");
}

export function isBusinessStoreCompanyPartner(user: {
  partnerType: string | null;
  partnerActivities?: PartnerActivitiesList;
}): boolean {
  if (isPureAgentActivities(user.partnerActivities)) return false;
  return user.partnerType === "STORE" || user.partnerType === "COMPANY";
}

export function isAgentCooperationInviter(user: {
  partnerType: string | null;
  partnerActivities?: PartnerActivitiesList;
  isStoreOwner?: boolean;
}): boolean {
  if (!(user.partnerActivities ?? []).includes("AGENT")) return false;
  if (isBusinessStoreCompanyPartner(user)) return false;
  return true;
}
