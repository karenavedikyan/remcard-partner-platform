import { remcardFetch } from "@/lib/api-client";
import type { AgentClientRow, AgentCertificateRow, AgentR03Status } from "./types";
import type { CreateCertificateBody, StoreCertificate } from "@/lib/certificate-types";

export function fetchAgentR03Status() {
  return remcardFetch<AgentR03Status>("/api/pro/r03/status");
}

export function fetchAgentClients(params?: { archived?: boolean; q?: string; cursor?: string }) {
  const q = new URLSearchParams();
  if (params?.archived) q.set("archived", "true");
  if (params?.q) q.set("q", params.q);
  if (params?.cursor) q.set("cursor", params.cursor);
  const suffix = q.toString() ? `?${q}` : "";
  return remcardFetch<{ clients: AgentClientRow[]; nextCursor: string | null }>(
    `/api/pro/agent-clients${suffix}`,
  );
}

export function createAgentClient(body: {
  displayName: string;
  phone?: string;
  email?: string;
  city?: string;
  note?: string;
}) {
  return remcardFetch<{ client: AgentClientRow }>("/api/pro/agent-clients", {
    method: "POST",
    body,
  });
}

export function fetchAgentClient(id: string) {
  return remcardFetch<{ client: AgentClientRow; certificates: AgentCertificateRow[] }>(
    `/api/pro/agent-clients/${encodeURIComponent(id)}`,
  );
}

export function patchAgentClient(id: string, body: Record<string, unknown>) {
  return remcardFetch(`/api/pro/agent-clients/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}

export function deleteAgentClient(id: string) {
  return remcardFetch(`/api/pro/agent-clients/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function fetchAgentCertificates(params?: {
  archived?: boolean;
  q?: string;
  cursor?: string;
  agentClientId?: string;
}) {
  const q = new URLSearchParams();
  if (params?.archived) q.set("archived", "true");
  if (params?.q) q.set("q", params.q);
  if (params?.cursor) q.set("cursor", params.cursor);
  if (params?.agentClientId) q.set("agentClientId", params.agentClientId);
  const suffix = q.toString() ? `?${q}` : "";
  return remcardFetch<{ certificates: AgentCertificateRow[]; nextCursor: string | null }>(
    `/api/pro/agent-certificates${suffix}`,
  );
}

export function createAgentCertificate(body: CreateCertificateBody & { agentClientId?: string }) {
  return remcardFetch<StoreCertificate>("/api/pro/agent-certificates", {
    method: "POST",
    body,
  });
}

export function patchAgentCertificate(id: string, body: Record<string, unknown>) {
  return remcardFetch(`/api/pro/agent-certificates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}

export function deleteAgentCertificate(id: string) {
  return remcardFetch(`/api/pro/agent-certificates/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function batchAgentCertificates(body: {
  action: "archive" | "restore" | "delete";
  ids: string[];
}) {
  return remcardFetch<{
    processedCount: number;
    skippedCount: number;
    processed: string[];
    skipped: Array<{ id: string; reason: string }>;
  }>("/api/pro/agent-certificates/batch", { method: "POST", body });
}
