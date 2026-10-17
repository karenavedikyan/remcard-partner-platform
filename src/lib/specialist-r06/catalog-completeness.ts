import type { ProfileDraft } from "@/lib/profile-save";
import type { CatalogMissingItem } from "@/lib/profile-catalog-completeness";
import { catalogMissingForSubmit } from "@/lib/profile-catalog-completeness";

function hasPublicContact(draft: ProfileDraft): boolean {
  return (
    draft.publicPhone.trim().length >= 10 ||
    draft.publicEmail.trim().length >= 3 ||
    draft.telegram.trim().length >= 2 ||
    draft.website.trim().length >= 4
  );
}

/** R06 specialist catalog submit requirements (client mirror). */
export function specialistCatalogMissingForSubmit(
  profile: Parameters<typeof catalogMissingForSubmit>[0],
  draft: ProfileDraft,
): CatalogMissingItem[] {
  const base = catalogMissingForSubmit(profile, draft);
  const missing = base.filter((m) => m.id !== "directions");

  if (draft.specializations.length === 0) {
    missing.push({
      id: "services",
      label: "Хотя бы одна услуга",
      fieldId: "catalog-products",
    });
  }
  if (draft.navigatorStageIds.length === 0) {
    missing.push({
      id: "stages",
      label: "Хотя бы один этап ремонта",
      fieldId: "catalog-stages",
    });
  }
  if (!hasPublicContact(draft)) {
    missing.push({
      id: "public-contact",
      label: "Публичный контакт (телефон, email, Telegram или сайт)",
      fieldId: "catalog-contacts",
    });
  }
  return missing;
}
