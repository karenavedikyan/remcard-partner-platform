import { displayCategoryLabel } from "@/lib/category-display";
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import { ONBOARDING_STAGES } from "@/lib/onboarding-stages";
import { partnerTypeLabel } from "@/lib/profile-overview-display";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { buildBranchPreviewModel } from "@/lib/branch-catalog-preview";
import { emptyBranchContactsForm } from "@/lib/branch-public-contacts";

export type ModerationOrgSubmitted = {
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  telegram?: string | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
  storeCategories?: string[];
  specializations?: string[];
  navigatorStageIds?: string[];
};

export type ModerationOrgLive = {
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  telegram?: string | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
  catalogPublished?: boolean;
  storeCategories?: { key: string; label: string }[];
  specializations?: { key: string; label: string }[];
};

export type ModerationBranchRow = {
  id: string;
  revisionToken?: string;
  catalogStatus: string;
  submitted: {
    name?: string;
    city?: string;
    address?: string;
    photoUrl?: string | null;
    workingHours?: string | null;
    description?: string | null;
  };
  hasSubmittedDiff: boolean;
};

export type ModerationOrgDetail = {
  id: string;
  name: string;
  partnerType: string;
  catalogStatus: string;
  catalogPublished: boolean;
  ownerId: string;
  ownerPublicId: string;
  isTestPartner: boolean;
  profTestPublicCatalogAllowed: boolean | null;
  pendingBranchesCount: number;
  hasSubmittedDiff: boolean;
  revisionToken: string;
  updatedAt?: string;
  submitted: ModerationOrgSubmitted;
  live: ModerationOrgLive;
  publicContacts: { type: string; label: string | null; value: string; isPublic: boolean }[];
  branches: ModerationBranchRow[];
};

const CATALOG_STATUS_RU: Record<string, string> = {
  PENDING: "На проверке",
  DRAFT: "Черновик",
  APPROVED: "Одобрено",
  REJECTED: "Отклонено",
  NEEDS_REVISION: "На доработке",
};

export function moderationCatalogStatusLabel(status: string): string {
  return CATALOG_STATUS_RU[status] ?? status;
}

export function moderationOrgCity(org: ModerationOrgDetail): string {
  const fromBranch = org.branches.find((b) => b.submitted.city?.trim())?.submitted.city?.trim();
  return fromBranch ?? "";
}

export type ModerationVisibilityState = {
  headline: string;
  detail: string;
};

/** Public catalog visibility (separate from moderation status). */
export function moderationOrgPublicVisibility(org: ModerationOrgDetail): ModerationVisibilityState {
  if (org.isTestPartner && org.profTestPublicCatalogAllowed === false) {
    return {
      headline: "Скрыта",
      detail:
        "Тестовый партнёр: после одобрения карточка останется скрытой, пока вы отдельно не разрешите публикацию тестового партнёра.",
    };
  }
  if (!org.catalogPublished && !org.live.catalogPublished) {
    return {
      headline: "Ещё не опубликована",
      detail: "Первая заявка: в каталоге пока нет опубликованной версии этой организации.",
    };
  }
  if (org.catalogStatus === "PENDING" && org.live.catalogPublished) {
    return {
      headline: "Опубликована прежняя версия",
      detail: "Клиенты видят последнюю одобренную версию; на проверке — новая отправленная заявка.",
    };
  }
  if (org.catalogPublished) {
    return {
      headline: "Опубликована",
      detail: "Текущая одобренная версия доступна в каталоге (с учётом кэша до ~360 с).",
    };
  }
  return {
    headline: "Не в каталоге",
    detail: "Публикация зависит от статуса модерации и правил test opt-in.",
  };
}

export type ModerationChangeBlock = {
  mode: "first" | "resubmit";
  title: string;
  lines: string[];
};

function labelList(keys: string[], resolver: (k: string) => string): string {
  if (!keys.length) return "—";
  return keys.map(resolver).join(", ");
}

function liveCategoryLabels(live: ModerationOrgLive, kind: "storeCategories" | "specializations"): string {
  const rows = live[kind] ?? [];
  if (!rows.length) return "—";
  return rows.map((r) => r.label).join(", ");
}

export function moderationOrgChangeBlock(org: ModerationOrgDetail): ModerationChangeBlock {
  const s = org.submitted;
  const live = org.live;
  const isFirst = !org.live.catalogPublished && !org.catalogPublished;

  if (isFirst && !org.hasSubmittedDiff) {
    return {
      mode: "first",
      title: "Новая заявка",
      lines: ["Карточка ещё не опубликована. Проверьте отправленные данные перед одобрением."],
    };
  }

  if (isFirst) {
    return {
      mode: "first",
      title: "Новая заявка",
      lines: ["Карточка ещё не опубликована."],
    };
  }

  const lines: string[] = [];
  const push = (label: string, from: string | null | undefined, to: string | null | undefined) => {
    const a = (from ?? "").trim();
    const b = (to ?? "").trim();
    if (a === b) return;
    if (!b && a) {
      lines.push(`${label}: удалено (было «${a}»)`);
      return;
    }
    if (!a && b) {
      lines.push(`${label}: добавлено «${b}»`);
      return;
    }
    lines.push(`${label}: «${a}» → «${b}»`);
  };

  push("Описание", live.description, s.description);
  push("Сайт", live.website, s.website);
  push("Telegram", live.telegram, s.telegram);
  push("Email", live.publicEmail, s.publicEmail);
  push("Телефон", live.publicPhone, s.publicPhone);

  const liveProd = liveCategoryLabels(live, "storeCategories");
  const subProd = labelList(s.storeCategories ?? [], displayCategoryLabel);
  if (liveProd !== subProd && !(liveProd === "—" && subProd === "—")) {
    lines.push(`Товары: ${liveProd} → ${subProd}`);
  }

  const liveSvc = liveCategoryLabels(live, "specializations");
  const subSvc = labelList(s.specializations ?? [], masterDirectionLabel);
  if (liveSvc !== subSvc && !(liveSvc === "—" && subSvc === "—")) {
    lines.push(`Услуги: ${liveSvc} → ${subSvc}`);
  }

  if (!lines.length && org.hasSubmittedDiff) {
    lines.push("Есть отличия отправленной версии от опубликованной (детали в блоках ниже).");
  }
  if (!lines.length) {
    lines.push("Отправленная версия совпадает с опубликованной по основным полям.");
  }

  return {
    mode: "resubmit",
    title: "Повторная заявка",
    lines,
  };
}

export type ModerationReadinessItem = {
  level: "required" | "recommendation" | "ok";
  text: string;
};

export function moderationOrgReadiness(org: ModerationOrgDetail): ModerationReadinessItem[] {
  const items: ModerationReadinessItem[] = [];
  const s = org.submitted;
  const pt = org.partnerType;

  if (org.name.trim().length < 2) {
    items.push({ level: "required", text: "Укажите название организации (минимум 2 символа)." });
  } else {
    items.push({ level: "ok", text: "Название организации указано." });
  }

  if (pt === "STORE" || pt === "COMPANY") {
    if (!(s.storeCategories?.length ?? 0)) {
      items.push({ level: "required", text: "Выберите категории товаров." });
    } else {
      items.push({ level: "ok", text: "Категории товаров выбраны." });
    }
  }

  if (pt === "MASTER" || pt === "COMPANY") {
    if (!(s.specializations?.length ?? 0)) {
      items.push({ level: "required", text: "Выберите направления услуг." });
    } else {
      items.push({ level: "ok", text: "Направления услуг выбраны." });
    }
  }

  const pendingBranches = org.branches.filter((b) => b.catalogStatus === "PENDING");
  if ((pt === "STORE" || pt === "COMPANY") && pendingBranches.length === 0 && org.catalogStatus === "PENDING") {
    items.push({
      level: "recommendation",
      text: "Нет филиалов на проверке — проверьте, что заявка по организации полная.",
    });
  }

  if (!s.description?.trim()) {
    items.push({ level: "recommendation", text: "Описание не заполнено — рекомендуется добавить для каталога." });
  }

  if (org.isTestPartner && org.profTestPublicCatalogAllowed === false) {
    items.push({
      level: "recommendation",
      text: "После одобрения карточка останется скрытой до разрешения публикации тестового партнёра.",
    });
  }

  return items;
}

export function moderationOrgCanPublishLabel(org: ModerationOrgDetail): string {
  const required = moderationOrgReadiness(org).filter((i) => i.level === "required");
  if (required.length) return "Нельзя рекомендовать публикацию — не выполнены обязательные условия.";
  if (org.isTestPartner && org.profTestPublicCatalogAllowed === false) {
    return "После одобрения заявка будет принята, но карточка останется скрытой (test opt-in).";
  }
  return "После одобрения одобренная версия станет доступна в каталоге (с учётом кэша).";
}

export function moderationSubmittedCategoryLabels(ids: string[] | undefined): string[] {
  return (ids ?? []).map((id) => displayCategoryLabel(id));
}

export function moderationSubmittedServiceLabels(ids: string[] | undefined): string[] {
  return (ids ?? []).map((id) => masterDirectionLabel(id));
}

export function moderationSubmittedStageLabels(ids: string[] | undefined): string[] {
  return (ids ?? []).map((id) => {
    const stage = ONBOARDING_STAGES.find((s) => s.id === id);
    return stage ? `${stage.icon} ${stage.title}` : masterDirectionLabel(id);
  });
}

export function buildModerationOrgCatalogPreviewInput(org: ModerationOrgDetail): {
  profile: ProProfileResponse;
  draft: ProfileDraft;
} {
  const city = moderationOrgCity(org);
  const s = org.submitted;
  const draft: ProfileDraft = {
    displayName: org.name,
    catalogCity: city,
    city,
    description: s.description?.trim() ?? "",
    partnerType: org.partnerType,
    specializations: s.specializations ?? [],
    storeCategories: s.storeCategories ?? [],
    organizationName: org.name,
    branchAddress: "",
    website: s.website?.trim() ?? "",
    telegram: s.telegram?.trim() ?? "",
    publicEmail: s.publicEmail?.trim() ?? "",
    publicPhone: s.publicPhone?.trim() ?? "",
    catalogPublicName: org.name,
    showFullName: false,
    catalogImageUrl: s.logoUrl?.trim() ?? "",
    productCategoryIds: [],
    serviceSpecializationIds: [],
    navigatorStageIds: s.navigatorStageIds ?? [],
    primaryDirection: null,
    partnerSearchOptIn: false,
    partnerWorkMode: "",
    areas: [],
    partnershipContactName: "",
    partnershipContactPhone: "",
    partnershipContactEmail: "",
    partnerActivities: [],
  };

  const profile = {
    user: {
      partnerType: org.partnerType,
      displayName: org.name,
      city,
      catalogCity: city,
    },
    organization: {
      id: org.id,
      name: org.name,
      partnerType: org.partnerType,
      catalogStatus: org.catalogStatus,
      branchCount: org.branches.length,
    },
  } as ProProfileResponse;

  return { profile, draft };
}

export function buildModerationBranchPreviewModel(
  branch: ModerationBranchRow,
  org: ModerationOrgDetail,
) {
  return buildBranchPreviewModel({
    name: branch.submitted.name ?? "Филиал",
    city: branch.submitted.city ?? "",
    address: branch.submitted.address ?? "",
    description: branch.submitted.description?.trim() ?? "",
    workingHours: branch.submitted.workingHours?.trim() ?? "",
    storeCategories: org.submitted.storeCategories ?? [],
    specializations: org.submitted.specializations ?? [],
    photoUrl: branch.submitted.photoUrl?.trim() ?? "",
    contacts: emptyBranchContactsForm(),
  });
}

export function moderationPublicContactTypeLabel(type: string): string {
  const map: Record<string, string> = {
    PHONE: "Телефон",
    EMAIL: "Email",
    TELEGRAM: "Telegram",
    WHATSAPP: "WhatsApp",
    WEBSITE: "Сайт",
    VK: "VK",
    INSTAGRAM: "Instagram",
  };
  return map[type] ?? type;
}

export function moderationFormatPublicPhone(raw: string | null | undefined): string {
  const v = raw?.trim() ?? "";
  if (!v) return "—";
  return formatPhoneForDisplay(v) || v;
}

export { partnerTypeLabel };
