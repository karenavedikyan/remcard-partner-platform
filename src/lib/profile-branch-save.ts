import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { BranchContactsForm } from "@/lib/branch-public-contacts";
import { BRANCH_CONTACT_KINDS } from "@/lib/branch-public-contacts";

export type BranchCatalogDraft = {
  name: string;
  city: string;
  address: string;
  addressCity?: string | null;
  addressDistrict?: string | null;
  addressGeohash?: string | null;
  description: string;
  photoUrl: string;
  workingHours: string | null;
  specializations: string[];
  storeCategories: string[];
};

function channelsFromForm(form: BranchContactsForm): Record<string, { isActive: boolean; value: string }> {
  const channels: Record<string, { isActive: boolean; value: string }> = {};
  for (const kind of BRANCH_CONTACT_KINDS) {
    channels[kind] = {
      isActive: form[kind].isActive,
      value: form[kind].value.trim(),
    };
  }
  return channels;
}

/** Single PATCH: branch fields + public contacts (atomic on server draft). */
export async function persistBranchDraft(
  branchId: string,
  draft: BranchCatalogDraft,
  contacts: BranchContactsForm,
): Promise<void> {
  await remcardFetch(`/api/pro/organization/branches/${encodeURIComponent(branchId)}`, {
    method: "PATCH",
    body: {
      name: draft.name.trim(),
      city: draft.city.trim(),
      address: draft.address.trim(),
      addressCity: draft.addressCity ?? null,
      addressDistrict: draft.addressDistrict ?? null,
      addressGeohash: draft.addressGeohash ?? null,
      workingHours: draft.workingHours,
      description: draft.description.trim() || null,
      photoUrl: draft.photoUrl.trim() || null,
      specializations: draft.specializations,
      storeCategories: draft.storeCategories,
      channels: channelsFromForm(contacts),
    },
  });
}

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
      addressCity: draft.addressCity ?? null,
      addressDistrict: draft.addressDistrict ?? null,
      addressGeohash: draft.addressGeohash ?? null,
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

export function branchSaveErrorMessage(caught: unknown): string {
  return caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить";
}
