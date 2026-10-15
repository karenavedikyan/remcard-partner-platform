import { remcardFetch } from "@/lib/api-client";
import type {
  AgentProfileDraftResponse,
  AgentProfileStatusResponse,
  AgentRequisitesItem,
} from "./types";

export async function fetchAgentProfileStatus() {
  return remcardFetch<AgentProfileStatusResponse>("/api/pro/agent-profile/status");
}

export async function fetchAgentProfileDraft() {
  return remcardFetch<AgentProfileDraftResponse>("/api/pro/agent-profile/draft");
}

export async function patchAgentProfileDraft(body: {
  expectedVersion: number;
  step?: number;
  payload: Record<string, string>;
}) {
  return remcardFetch<AgentProfileDraftResponse>("/api/pro/agent-profile/draft", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function finishAgentProfile(body: { expectedVersion: number }) {
  return remcardFetch<{ ok: boolean; profileComplete: boolean }>(
    "/api/pro/agent-profile/finish",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function activateAgentActivity() {
  return remcardFetch<{ user: { partnerActivities: string[] } }>("/api/pro/agent-activate", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function listAgentRequisites() {
  return remcardFetch<{ items: AgentRequisitesItem[] }>("/api/pro/agent-payout-requisites");
}

export async function createAgentRequisites(body: Record<string, unknown>) {
  return remcardFetch<{ item: AgentRequisitesItem }>("/api/pro/agent-payout-requisites", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchAgentRequisites(id: string, body: Record<string, unknown>) {
  return remcardFetch<{ item: AgentRequisitesItem; replacedId?: string }>(
    `/api/pro/agent-payout-requisites/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}
