import { remcardFetch } from "@/lib/api-client";

export type AgentR04Status = {
  contractVersion: string;
  featureEnabled: boolean;
  hasAgentActivity: boolean;
  eligible: boolean;
  userId: string;
  ineligibleReason: string | null;
};

export async function fetchAgentR04Status() {
  return remcardFetch<AgentR04Status>("/api/pro/r04/status");
}

export async function patchPartnershipListPreference(
  partnershipId: string,
  body: { personalAlias?: string | null; archived?: boolean; hidden?: boolean },
) {
  return remcardFetch<{
    preference: { personalAlias: string | null; archivedAt: string | null; hiddenAt: string | null };
  }>(
    `/api/pro/partnership-list-preferences/${partnershipId}`,
    { method: "PATCH", body },
  );
}
