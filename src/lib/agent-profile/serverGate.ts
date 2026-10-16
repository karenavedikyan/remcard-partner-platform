import { fetchRemcardUpstream } from "@/lib/remcard-server";
import type { AgentProfileStatusResponse } from "./types";
import { isPureAgentActivities } from "./mode";

export type AgentProfileServerGate = {
  featureEnabled: boolean;
  eligible: boolean;
  profileComplete: boolean;
};

export async function fetchAgentProfileGateServer(
  cookieHeader: string | null | undefined,
): Promise<AgentProfileServerGate | null> {
  const res = await fetchRemcardUpstream<AgentProfileStatusResponse>(
    "/api/pro/agent-profile/status",
    { headers: cookieHeader ? { cookie: cookieHeader } : undefined },
  );
  if (!res.ok) return null;
  return {
    featureEnabled: res.data.featureEnabled,
    eligible: res.data.eligible,
    profileComplete: res.data.profileComplete,
  };
}

export function isPureAgentCompactProfile(
  partnerActivities: string[] | null | undefined,
  gate: AgentProfileServerGate | null,
): boolean {
  return (
    Boolean(gate?.featureEnabled && gate?.eligible) &&
    isPureAgentActivities(partnerActivities)
  );
}
