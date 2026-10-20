import { remcardFetch } from "@/lib/api-client";
import type {
  AgentClientDetailResponse,
  AgentClientRow,
  AgentCertificateRow,
  AgentR03ListMeta,
  AgentR03Status,
} from "./types";
import type { CreateCertificateBody, StoreCertificate } from "@/lib/certificate-types";

export function fetchAgentR03Status() {
  return remcardFetch<AgentR03Status>("/api/pro/r03/status");
}

export function fetchAgentClients(params?: {
  archived?: boolean;
  q?: string;
  cursor?: string;
  page?: number;
  limit?: number;
  sort?: string;
}) {
  const q = new URLSearchParams();
  if (params?.archived) q.set("archived", "true");
  if (params?.q) q.set("q", params.q);
  if (params?.cursor) q.set("cursor", params.cursor);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.sort) q.set("sort", params.sort);
  const suffix = q.toString() ? `?${q}` : "";
  return remcardFetch<{ clients: AgentClientRow[]; nextCursor: string | null } & AgentR03ListMeta>(
    `/api/pro/agent-clients${suffix}`,
  );
}

export function batchAgentClients(body: {
  action: "archive" | "restore" | "delete";
  ids: string[];
}) {
  return remcardFetch<{
    processedCount: number;
    skippedCount: number;
    processed: string[];
    skipped: Array<{ id: string; reason: string }>;
  }>("/api/pro/agent-clients/batch", { method: "POST", body });
}

export function createAgentClient(body: {
  displayName: string;
  phone?: string;
  email?: string;
  city?: string;
  need?: string;
  note?: string;
}) {
  return remcardFetch<{ client: AgentClientRow }>("/api/pro/agent-clients", {
    method: "POST",
    body,
  });
}

export function fetchAgentClient(id: string) {
  return remcardFetch<AgentClientDetailResponse>(
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
  page?: number;
  limit?: number;
  sort?: string;
  status?: string;
}) {
  const q = new URLSearchParams();
  if (params?.archived) q.set("archived", "true");
  if (params?.q) q.set("q", params.q);
  if (params?.cursor) q.set("cursor", params.cursor);
  if (params?.agentClientId) q.set("agentClientId", params.agentClientId);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.sort) q.set("sort", params.sort);
  if (params?.status) q.set("status", params.status);
  const suffix = q.toString() ? `?${q}` : "";
  return remcardFetch<
    { certificates: AgentCertificateRow[]; nextCursor: string | null } & AgentR03ListMeta
  >(`/api/pro/agent-certificates${suffix}`);
}

export function createAgentCertificate(
  body: CreateCertificateBody & { agentClientId?: string },
  options?: { idempotencyKey?: string },
) {
  return remcardFetch<StoreCertificate>("/api/pro/agent-certificates", {
    method: "POST",
    body,
    idempotencyKey: options?.idempotencyKey?.trim().slice(0, 128),
  });
}

export function fetchAgentCertificate(id: string) {
  return remcardFetch<{ certificate: AgentCertificateRow }>(
    `/api/pro/agent-certificates/${encodeURIComponent(id)}`,
  );
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
