import { remcardFetch } from "@/lib/api-client";

export type ModerationQueueItem = {
  entityKind: "user" | "organization" | "branch";
  id: string;
  title: string;
  publicId: string | null;
  partnerType: string | null;
  city: string | null;
  catalogStatus: string;
  isTestPartner: boolean;
  organizationId: string | null;
  organizationName: string | null;
  updatedAt: string;
  unresolvedNotesCount: number;
};

export type ModerationQueueResponse = {
  items: ModerationQueueItem[];
  counts: {
    users: number;
    organizations: number;
    branches: number;
    reviews: number;
    totalPending: number;
  };
};

export async function fetchModerationQueue(params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return remcardFetch<ModerationQueueResponse>(`/api/pro/admin/moderation?${q.toString()}`);
}

export async function fetchModerationPartner(userId: string) {
  return remcardFetch<{ partner: Record<string, unknown> }>(
    `/api/pro/admin/moderation/partners/${encodeURIComponent(userId)}`,
  );
}

export async function fetchModerationOrganization(orgId: string) {
  return remcardFetch<{ organization: Record<string, unknown> }>(
    `/api/pro/admin/moderation/organizations/${encodeURIComponent(orgId)}`,
  );
}

export type ModerationPublicPreviewRequest = {
  orgRevision: string;
  branchRevisions: Record<string, string>;
  signal?: AbortSignal;
};

export async function fetchModerationOrganizationPublicPreview(
  orgId: string,
  params: ModerationPublicPreviewRequest,
) {
  const q = new URLSearchParams({
    orgRevision: params.orgRevision,
    branchRevisions: JSON.stringify(params.branchRevisions),
  });
  return remcardFetch<Record<string, unknown>>(
    `/api/pro/admin/moderation/organizations/${encodeURIComponent(orgId)}/public-preview?${q.toString()}`,
    { signal: params.signal },
  );
}

export function buildModerationOrgPreviewRevisionQuery(org: {
  revisionToken: string;
  branches: { id: string; catalogStatus: string; revisionToken?: string }[];
}): Pick<ModerationPublicPreviewRequest, "orgRevision" | "branchRevisions"> {
  const branchRevisions: Record<string, string> = {};
  for (const b of org.branches) {
    if (b.catalogStatus === "PENDING" && b.revisionToken) {
      branchRevisions[b.id] = b.revisionToken;
    }
  }
  return { orgRevision: org.revisionToken, branchRevisions };
}

export async function moderationPartnerAction(
  userId: string,
  action: "approve" | "reject" | "revise",
  body?: Record<string, unknown>,
) {
  return remcardFetch(`/api/pro/admin/moderation/partners/${encodeURIComponent(userId)}/${action}`, {
    method: "POST",
    body: body ?? {},
  });
}

export async function moderationOrganizationAction(
  orgId: string,
  action: "approve" | "approve-all" | "reject" | "revise",
  body?: Record<string, unknown>,
) {
  return remcardFetch(
    `/api/pro/admin/moderation/organizations/${encodeURIComponent(orgId)}/${action}`,
    { method: "POST", body: body ?? {} },
  );
}

export async function moderationBranchAction(
  branchId: string,
  action: "approve" | "reject" | "revise",
  body?: Record<string, unknown>,
) {
  return remcardFetch(
    `/api/pro/admin/moderation/branches/${encodeURIComponent(branchId)}/${action}`,
    { method: "POST", body: body ?? {} },
  );
}
