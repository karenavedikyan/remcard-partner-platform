/** Mirrors navigator principalAgentEligibility — AGENT cooperation activity gate. */

export function userHasAgentActivity(user: {
  partnerActivities?: string[] | null;
  isBlocked?: boolean;
}): boolean {
  if (user.isBlocked) return false;
  return (user.partnerActivities ?? []).includes("AGENT");
}