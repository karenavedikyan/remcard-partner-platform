import { remcardFetch } from "@/lib/api-client";

/** Server-authoritative collaboration search eligibility (not public catalog visibility). */
export type PartnerSearchAdminOverride = "AUTO" | "SHOW" | "HIDE";

/** Server-authoritative collaboration search eligibility (not public catalog visibility). */
export type PartnerSearchVisibility = {
  visible: boolean;
  reasonCode: string;
  reasonLabel: string;
  /** Admin override for live partner search; AUTO keeps registration/catalog policy. */
  adminOverride?: PartnerSearchAdminOverride | null;
};

/** Server-authoritative partnership lifecycle counts for admin registry. */
export type PartnerRegistryPartnershipCounts = {
  active: number;
  invited: number;
  pending: number;
  paused: number;
  ended: number;
  total: number;
};

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
  /** Optional until backend rollout; never infer from catalog/registration fields. */
  partnerSearchVisibility?: PartnerSearchVisibility | null;
  partnershipCounts?: PartnerRegistryPartnershipCounts | null;
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

export type AdminPartnershipStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "INVITED"
  | "PENDING"
  | "PAUSED"
  | "ENDED";

export type AdminPartnershipCounterparty = {
  id: string;
  publicId: string | null;
  displayName: string | null;
  partnerKind: "agent" | "specialist" | "store" | "company" | null;
  city: string | null;
};

export type AdminPartnershipListItem = {
  id: string;
  status: AdminPartnershipStatusFilter | string;
  createdAt: string;
  updatedAt: string;
  partner: AdminPartnershipCounterparty;
};

export type AdminPartnershipListResponse = {
  items: AdminPartnershipListItem[];
  total: number;
  nextCursor: string | null;
};

export async function fetchAdminPartnerPartnerships(
  partnerUserId: string,
  options: {
    status?: AdminPartnershipStatusFilter;
    limit?: number;
    cursor?: string | null;
  } = {},
): Promise<AdminPartnershipListResponse> {
  const params = new URLSearchParams();
  params.set("status", options.status ?? "ALL");
  params.set("limit", String(options.limit ?? 25));
  if (options.cursor) params.set("cursor", options.cursor);
  return remcardFetch<AdminPartnershipListResponse>(
    `/api/pro/admin/partners/${encodeURIComponent(partnerUserId)}/partnerships?${params.toString()}`,
  );
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
