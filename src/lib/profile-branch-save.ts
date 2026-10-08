import { RemcardApiError, remcardFetch } from "@/lib/api-client";

export type BranchCatalogDraft = {
  description: string;
  photoUrl: string;
  storeCategories: string[];
};

export async function persistBranchCatalogDraft(
  branchId: string,
  draft: BranchCatalogDraft,
): Promise<void> {
  await remcardFetch(`/api/pro/organization/branches/${encodeURIComponent(branchId)}`, {
    method: "PATCH",
    body: {
      description: draft.description.trim() || null,
      photoUrl: draft.photoUrl.trim() || null,
      storeCategories: draft.storeCategories,
    },
  });
}

export async function unpublishBranchFromCatalog(branchId: string): Promise<void> {
  await remcardFetch(`/api/pro/organization/branches/${encodeURIComponent(branchId)}`, {
    method: "PATCH",
    body: { action: "unpublishFromCatalog" },
  });
}

export async function discardBranchCatalogDraft(branchId: string): Promise<void> {
  await remcardFetch(`/api/pro/organization/branches/${encodeURIComponent(branchId)}`, {
    method: "PATCH",
    body: { action: "discardCatalogDraft" },
  });
}

export async function submitBranchForModeration(branchId: string): Promise<void> {
  await remcardFetch(
    `/api/pro/organization/branches/${encodeURIComponent(branchId)}/submit-for-moderation`,
    { method: "POST", body: {} },
  );
}
