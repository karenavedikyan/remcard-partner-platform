import { ONBOARDING_STAGES } from "@/lib/onboarding-stages";
import type { ModerationOrgDetail } from "@/lib/prof-admin-moderation-org-display";

const VALID_STAGE_IDS = new Set(ONBOARDING_STAGES.map((s) => s.id));

/** Mirrors backend `orgCatalogNavigatorStagesValidForSubmit`. */
export function orgCatalogNavigatorStagesValidForSubmit(ids: string[] | undefined): string[] {
  return (ids ?? []).filter((id) => typeof id === "string" && VALID_STAGE_IDS.has(id.trim()));
}

/** Mirrors backend `validateCatalogDirectionsForModeration`. */
export function validateCatalogDirectionsForModeration(fields: {
  storeCategories: string[];
  specializations: string[];
}): string[] {
  const hasProducts = fields.storeCategories.length > 0;
  const hasServices = fields.specializations.length > 0;
  if (!hasProducts && !hasServices) {
    return ["Выберите товары и/или услуги для каталога"];
  }
  return [];
}

/** Mirrors backend `validateOrgCatalogForModeration` (navigator proProfileCompleteness). */
export function validateOrgCatalogForModeration(fields: {
  name: string | null;
  branchCount: number;
  storeCategories: string[];
  specializations: string[];
  navigatorStageIds?: string[];
}): string[] {
  const errors: string[] = [];
  if (!fields.name?.trim()) errors.push("Укажите название организации");
  if (fields.branchCount === 0) errors.push("Добавьте хотя бы один филиал");
  errors.push(
    ...validateCatalogDirectionsForModeration({
      storeCategories: fields.storeCategories,
      specializations: fields.specializations,
    }),
  );
  if (orgCatalogNavigatorStagesValidForSubmit(fields.navigatorStageIds).length === 0) {
    errors.push("Выберите хотя бы один этап ремонта для каталога");
  }
  return errors;
}

export type ModerationReadinessItem = {
  level: "required" | "recommendation" | "ok";
  text: string;
};

export function moderationOrgServerReadiness(org: ModerationOrgDetail): ModerationReadinessItem[] {
  const branchCount = org.branches.filter((b) => b.catalogStatus !== "DRAFT").length;
  const serverErrors = validateOrgCatalogForModeration({
    name: org.name,
    branchCount,
    storeCategories: org.submitted.storeCategories ?? [],
    specializations: org.submitted.specializations ?? [],
    navigatorStageIds: org.submitted.navigatorStageIds,
  });

  const items: ModerationReadinessItem[] = serverErrors.map((text) => ({
    level: "required" as const,
    text,
  }));

  if (serverErrors.length === 0) {
    items.push({ level: "ok", text: "Обязательные условия сервера для отправки в каталог выполнены." });
  }

  if (!org.submitted.description?.trim()) {
    items.push({
      level: "recommendation",
      text: "Описание не заполнено — рекомендуется для карточки в каталоге.",
    });
  }

  if (org.isTestPartner && org.profTestPublicCatalogAllowed === false) {
    items.push({
      level: "recommendation",
      text: "После одобрения карточка останется скрытой, пока не разрешите публикацию тестового партнёра.",
    });
  }

  return items;
}

export function moderationOrgCanPublishLabel(org: ModerationOrgDetail): string {
  const required = moderationOrgServerReadiness(org).filter((i) => i.level === "required");
  if (required.length) {
    return "Есть обязательные замечания по правилам отправки в каталог (см. список выше).";
  }
  if (org.isTestPartner && org.profTestPublicCatalogAllowed === false) {
    return "После одобрения заявка будет принята, но карточка останется скрытой (тестовый партнёр).";
  }
  return "После одобрения одобренная версия станет доступна в каталоге (с учётом кэша до ~360 с).";
}
