import { remcardFetch } from "@/lib/api-client";

export type PartnerRegistryItem = {
  id: string;
  publicId: string | null;
  displayName: string | null;
  partnerType: string | null;
  city: string | null;
  registrationLabel: "ACTIVE" | "DEMO";
  lifecycle: {
    catalogHiddenAt: string | null;
    projectArchivedAt: string | null;
  } | null;
};

export type PartnerRegistryResponse = {
  total: number;
  items: PartnerRegistryItem[];
  nextCursor: string | null;
};

export async function fetchPartnerRegistry(params: URLSearchParams): Promise<PartnerRegistryResponse> {
  return remcardFetch<PartnerRegistryResponse>(`/api/pro/admin/partners/registry?${params.toString()}`);
}

export async function previewPartnerLifecycle(userId: string, action: string) {
  return remcardFetch<{ preview: { effects: string[]; warnings: string[]; displayName: string | null } }>(
    `/api/pro/admin/partners/${encodeURIComponent(userId)}/lifecycle/preview?action=${encodeURIComponent(action)}`,
  );
}

export async function applyPartnerLifecycle(userId: string, action: string, reason: string) {
  return remcardFetch(`/api/pro/admin/partners/${encodeURIComponent(userId)}/lifecycle`, {
    method: "POST",
    body: { action, reason },
  });
}
