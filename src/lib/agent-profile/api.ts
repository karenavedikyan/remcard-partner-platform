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
  expectedEpoch: number;
  step?: number;
  fromStep?: number;
  mode?: "save" | "advance";
  payload: Record<string, string>;
}) {
  return remcardFetch<AgentProfileDraftResponse>("/api/pro/agent-profile/draft", {
    method: "PATCH",
    body,
  });
}

export async function finishAgentProfile(body: { expectedVersion: number; expectedEpoch: number }) {
  return remcardFetch<{ ok: boolean; profileComplete: boolean }>(
    "/api/pro/agent-profile/finish",
    { method: "POST", body },
  );
}

export async function enableR02AgentActivity() {
  return remcardFetch<{ user: { partnerActivities: string[] } }>(
    "/api/pro/agent-profile/enable-activity",
    { method: "POST", body: {} },
  );
}

export async function listAgentRequisites() {
  return remcardFetch<{ items: AgentRequisitesItem[] }>("/api/pro/agent-payout-requisites");
}

export async function fetchAgentRequisites(id: string) {
  return remcardFetch<{ item: AgentRequisitesItem }>(
    `/api/pro/agent-payout-requisites/${encodeURIComponent(id)}`,
  );
}

export async function createAgentRequisites(body: Record<string, unknown>) {
  return remcardFetch<{ item: AgentRequisitesItem }>("/api/pro/agent-payout-requisites", {
    method: "POST",
    body,
  });
}

export async function patchAgentRequisites(id: string, body: Record<string, unknown>) {
  return remcardFetch<{ item: AgentRequisitesItem; replacedId?: string }>(
    `/api/pro/agent-payout-requisites/${encodeURIComponent(id)}`,
    { method: "PATCH", body },
  );
}
