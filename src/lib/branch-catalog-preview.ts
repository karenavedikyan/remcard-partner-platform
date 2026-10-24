import { displayCategoryLabel } from "@/lib/category-display";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import type { BranchContactsForm } from "@/lib/branch-public-contacts";
import { BRANCH_CONTACT_KINDS } from "@/lib/branch-public-contacts";

export type BranchPreviewModel = {
  title: string;
  city: string;
  address: string;
  description: string;
  workingHours: string;
  productLabels: string[];
  serviceLabels: string[];
  contactLines: string[];
  imageUrl: string | null;
};

function branchField(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

export function buildBranchPreviewModel(input: {
  name: string;
  city: string;
  address: string;
  description: string;
  workingHours: string;
  storeCategories: string[];
  specializations: string[];
  photoUrl: string;
  contacts: BranchContactsForm;
}): BranchPreviewModel {
  const contactLines = BRANCH_CONTACT_KINDS.filter(
    (k) => input.contacts[k].isActive && branchField(input.contacts[k].value),
  ).map((k) => `${k}: ${branchField(input.contacts[k].value)}`);

  return {
    title: branchField(input.name) || branchField(input.address) || "Филиал",
    city: branchField(input.city),
    address: branchField(input.address),
    description: branchField(input.description),
    workingHours: branchField(input.workingHours),
    productLabels: input.storeCategories
      .filter((id): id is string => typeof id === "string")
      .map((id) => displayCategoryLabel(id, null)),
    serviceLabels: input.specializations
      .filter((id): id is string => typeof id === "string")
      .map((id) => masterDirectionLabel(id)),
    contactLines,
    imageUrl: branchField(input.photoUrl) || null,
  };
}
