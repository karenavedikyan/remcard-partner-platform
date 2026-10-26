/** Mirrors navigator isAgentCooperationInviter / businessWalletAdmission. */

export function isPureAgentActivities(activities: string[] | null | undefined): boolean {
  const list = activities ?? [];
  return list.includes("AGENT") && !list.includes("STORE") && !list.includes("SERVICE");
}

export function isBusinessStoreCompanyPartner(user: {
  partnerType: string | null;
  partnerActivities?: string[];
}): boolean {
  if (isPureAgentActivities(user.partnerActivities)) return false;
  return user.partnerType === "STORE" || user.partnerType === "COMPANY";
}

export function isAgentCooperationInviter(user: {
  partnerType: string | null;
  partnerActivities?: string[];
  isStoreOwner?: boolean;
}): boolean {
  if (!(user.partnerActivities ?? []).includes("AGENT")) return false;
  if (isBusinessStoreCompanyPartner(user)) return false;
  return true;
}
