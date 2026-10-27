import { remcardFetch } from "@/lib/api-client";

export type PartnerRegistryItem = {
  id: string;
  publicId: string | null;
  displayName: string | null;
  partnerType: string | null;
  partnerKind?: "agent" | "specialist" | "store" | "company" | null;
  catalogVisibility?: "VISIBLE" | "HIDDEN" | "NOT_PUBLISHED" | "ARCHIVED";
  publicCatalogLinks?: { label: string; path: string }[];
  organizationName?: string | null;
  organizations?: { id: string; name: string }[];
  city: string | null;
  registrationLabel: "ACTIVE" | "DEMO";
  lifecycle: {
    catalogHiddenAt: string | null;
    projectArchivedAt: string | null;
  } | null;
};

export type PartnerRegistryFacets = import("@/lib/prof-admin-management-api").PartnerRegistryFacets;

export type PartnerRegistryResponse = {
  total: number;
  facets: PartnerRegistryFacets | null;
  items: PartnerRegistryItem[];
  nextCursor: string | null;
};

export async function fetchPartnerRegistry(params: URLSearchParams): Promise<PartnerRegistryResponse> {
  return remcardFetch<PartnerRegistryResponse>(`/api/pro/admin/partners/registry?${params.toString()}`);
}

export async function previewPartnerLifecycle(userId: string, action: string) {
  return remcardFetch<{
    preview: {
      effects: string[];
      warnings: string[];
      displayName: string | null;
      confirmToken: string;
    };
  }>(
    `/api/pro/admin/partners/${encodeURIComponent(userId)}/lifecycle/preview?action=${encodeURIComponent(action)}`,
  );
}

export async function applyPartnerLifecycle(
  userId: string,
  action: string,
  reason: string,
  confirmToken: string,
) {
  return remcardFetch(`/api/pro/admin/partners/${encodeURIComponent(userId)}/lifecycle`, {
    method: "POST",
    body: { action, reason, confirmToken },
  });
}

export async function previewDemoSupersession(liveUserId: string, demoUserId: string) {
  return remcardFetch<{
    blocked: boolean;
    blockReason?: string;
    effects: string[];
    warnings: string[];
  }>(
    `/api/pro/admin/partners/${encodeURIComponent(liveUserId)}/demo-supersession/preview?demoUserId=${encodeURIComponent(demoUserId)}`,
  );
}

export async function applyDemoSupersession(
  liveUserId: string,
  demoUserId: string,
  reason: string,
  confirmToken: string,
) {
  return remcardFetch(`/api/pro/admin/partners/${encodeURIComponent(liveUserId)}/demo-supersession`, {
    method: "POST",
    body: { demoUserId, reason, confirmToken },
  });
}
