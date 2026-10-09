import type { ProProfileResponse } from "@/lib/types";
import type { ProfileDraft } from "@/lib/profile-save";
import { catalogEntityForProfile } from "@/lib/profile-catalog-state";

export type CatalogMissingItem = {
  id: string;
  label: string;
  /** DOM id or section anchor for scroll/focus */
  fieldId: string;
};

const PLACEHOLDER_NAME = "Пользователь";

function isNameOk(name: string): boolean {
  const t = name.trim();
  return t.length >= 2 && t !== PLACEHOLDER_NAME;
}

/** Client-side mirror of navigator submit checks (for labels + submit button). */
export function catalogMissingForSubmit(
  profile: ProProfileResponse,
  draft: ProfileDraft,
): CatalogMissingItem[] {
  const missing: CatalogMissingItem[] = [];
  const entity = catalogEntityForProfile(profile);
  const partnerType = draft.partnerType || profile.user.partnerType || "MASTER";

  if (entity === "organization") {
    if (!draft.organizationName.trim()) {
      missing.push({
        id: "org-name",
        label: "Название организации",
        fieldId: "catalog-public-name",
      });
    }
    const branches = profile.organization?.branchCount ?? 0;
    if (branches === 0 && draft.branchAddress.trim().length < 3) {
      missing.push({
        id: "branch",
        label: "Адрес первого филиала",
        fieldId: "catalog-branch-address",
      });
    }
    if (branches === 0 && !profile.organization) {
      missing.push({
        id: "branch",
        label: "Добавьте филиал в разделе «Филиалы»",
        fieldId: "catalog-branch-address",
      });
    }
    if (
      (partnerType === "STORE" || partnerType === "COMPANY") &&
      draft.storeCategories.length === 0
    ) {
      missing.push({
        id: "products",
        label: "Категории товаров",
        fieldId: "catalog-products",
      });
    }
    if (partnerType === "MASTER" && draft.specializations.length === 0) {
      missing.push({
        id: "services",
        label: "Специализации",
        fieldId: "catalog-services",
      });
    }
    return missing;
  }

  if (!isNameOk(draft.catalogPublicName || draft.displayName)) {
    missing.push({
      id: "public-name",
      label: "Публичное имя",
      fieldId: "catalog-public-name",
    });
  }
  if (!draft.city.trim()) {
    missing.push({ id: "city", label: "Город", fieldId: "catalog-city-hint" });
  }
  if (partnerType === "MASTER" && draft.specializations.length === 0) {
    missing.push({
      id: "services",
      label: "Услуги для каталога",
      fieldId: "catalog-services",
    });
  }
  if (
    (partnerType === "STORE" || partnerType === "COMPANY") &&
    draft.storeCategories.length === 0
  ) {
    missing.push({
      id: "products",
      label: "Товары для каталога",
      fieldId: "catalog-products",
    });
  }
  return missing;
}

export function catalogPublicationStatusKey(profile: ProProfileResponse): string {
  const status = profile.organization?.catalogStatus ?? profile.user.catalogStatus;
  const live = profile.catalogPublication?.isLivePublic;
  const draftPending =
    profile.catalogPublication?.draftPending ||
    profile.user.catalogDraftPending ||
    profile.organization?.catalogDraftPending;

  if (status === "PENDING") return "pending_review";
  if (status === "NEEDS_REVISION") return "needs_revision";
  if (status === "REJECTED") return "rejected";
  if (live && draftPending) return "published_with_draft";
  if (live) return "published";
  if (status === "APPROVED" && !live) return "ready_unpublished";
  if (draftPending) return "draft_pending";
  return "not_published";
}

export function catalogPublicationStatusLabel(profile: ProProfileResponse): string {
  switch (catalogPublicationStatusKey(profile)) {
    case "pending_review":
      return "На проверке";
    case "needs_revision":
      return "Нужно исправить";
    case "rejected":
      return "Отклонён";
    case "published_with_draft":
      return "Опубликован · есть черновик правок";
    case "published":
      return "Опубликован";
    case "ready_unpublished":
      return "Готовится к публикации";
    case "draft_pending":
      return "Готовится к публикации";
    default:
      return "Не опубликован";
  }
}
