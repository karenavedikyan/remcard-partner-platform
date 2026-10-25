import { remcardFetch } from "@/lib/api-client";
import type { AgentCertificateRow, AgentR03ListMeta } from "@/lib/agent-r03/types";

export function fetchBusinessOwnerCertificates(params?: {
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
  >(`/api/pro/business-owner-certificates${suffix}`);
}

export function fetchBusinessOwnerCertificate(id: string) {
  return remcardFetch<{ certificate: AgentCertificateRow }>(
    `/api/pro/business-owner-certificates/${encodeURIComponent(id)}`,
  );
}

export function patchBusinessOwnerCertificate(id: string, body: Record<string, unknown>) {
  return remcardFetch(`/api/pro/business-owner-certificates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}

export function deleteBusinessOwnerCertificate(id: string) {
  return remcardFetch(`/api/pro/business-owner-certificates/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function batchBusinessOwnerCertificates(body: {
  action: "archive" | "restore" | "delete";
  ids: string[];
}) {
  return remcardFetch<{
    processedCount: number;
    skippedCount: number;
    processed: string[];
    skipped: Array<{ id: string; reason: string }>;
  }>("/api/pro/business-owner-certificates/batch", { method: "POST", body });
}
