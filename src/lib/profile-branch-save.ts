import { RemcardApiError, remcardFetch } from "@/lib/api-client";

export type BranchCatalogDraft = {
  name: string;
  city: string;
  address: string;
  description: string;
  photoUrl: string;
  workingHours: string | null;
  specializations: string[];
  storeCategories: string[];
};

export async function persistBranchWorkingAndCatalog(
  branchId: string,
  draft: BranchCatalogDraft,
): Promise<void> {
  await remcardFetch(`/api/pro/organization/branches/${encodeURIComponent(branchId)}`, {
    method: "PATCH",
    body: {
      name: draft.name.trim(),
      city: draft.city.trim(),
      address: draft.address.trim(),
      workingHours: draft.workingHours,
      description: draft.description.trim() || null,
      photoUrl: draft.photoUrl.trim() || null,
      specializations: draft.specializations,
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

/** @deprecated use persistBranchWorkingAndCatalog */
export async function persistBranchCatalogDraft(
  branchId: string,
  draft: Pick<BranchCatalogDraft, "description" | "photoUrl" | "storeCategories">,
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

export function branchSaveErrorMessage(caught: unknown): string {
  return caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить";
}
