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
    (k) => input.contacts[k].isActive && input.contacts[k].value.trim(),
  ).map((k) => `${k}: ${input.contacts[k].value.trim()}`);

  return {
    title: input.name.trim() || input.address.trim() || "Филиал",
    city: input.city.trim(),
    address: input.address.trim(),
    description: input.description.trim(),
    workingHours: input.workingHours.trim(),
    productLabels: input.storeCategories.map((id) => displayCategoryLabel(id, null)),
    serviceLabels: input.specializations.map((id) => masterDirectionLabel(id)),
    contactLines,
    imageUrl: input.photoUrl.trim() || null,
  };
}
