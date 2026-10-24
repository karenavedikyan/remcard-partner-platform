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
  isActive?: boolean;
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
  const fromBranch = org.branches.find(
    (b) => b.catalogStatus !== "DRAFT" && moderationSubmittedString(b.submitted.city),
  )?.submitted.city;
  return moderationSubmittedString(fromBranch);
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
  const ids = keys.filter((k): k is string => typeof k === "string");
  if (!ids.length) return "—";
  return ids.map(resolver).join(", ");
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
  const push = (label: string, from: unknown, to: unknown) => {
    const a = moderationSubmittedString(from);
    const b = moderationSubmittedString(to);
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
  push("Логотип", live.logoUrl, s.logoUrl);
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

  const liveStages = "—";
  const subStages =
    (s.navigatorStageIds ?? []).length > 0
      ? moderationSubmittedStageLabels(s.navigatorStageIds).join(", ")
      : "—";
  if (subStages !== liveStages && (s.navigatorStageIds?.length ?? 0) > 0) {
    lines.push(`Этапы ремонта: ${subStages}`);
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

function moderationStringIds(ids: string[] | undefined): string[] {
  return (ids ?? []).filter((id): id is string => typeof id === "string");
}

export function moderationSubmittedCategoryLabels(ids: string[] | undefined): string[] {
  return moderationStringIds(ids).map((id) => displayCategoryLabel(id));
}

export function moderationSubmittedServiceLabels(ids: string[] | undefined): string[] {
  return moderationStringIds(ids).map((id) => masterDirectionLabel(id));
}

export function moderationSubmittedStageLabels(ids: string[] | undefined): string[] {
  return moderationStringIds(ids).map((id) => {
    const stage = ONBOARDING_STAGES.find((s) => s.id === id);
    return stage ? `${stage.icon} ${stage.title}` : masterDirectionLabel(id);
  });
}

export function moderationSubmittedString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
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
    description: moderationSubmittedString(s.description),
    partnerType: org.partnerType,
    specializations: moderationStringIds(s.specializations),
    storeCategories: moderationStringIds(s.storeCategories),
    organizationName: org.name,
    branchAddress: "",
    website: moderationSubmittedString(s.website),
    telegram: moderationSubmittedString(s.telegram),
    publicEmail: moderationSubmittedString(s.publicEmail),
    publicPhone: moderationSubmittedString(s.publicPhone),
    catalogPublicName: org.name,
    showFullName: false,
    catalogImageUrl: moderationSubmittedString(s.logoUrl),
    productCategoryIds: [],
    serviceSpecializationIds: [],
    navigatorStageIds: moderationStringIds(s.navigatorStageIds),
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
    name: moderationSubmittedString(branch.submitted.name) || "Филиал",
    city: moderationSubmittedString(branch.submitted.city),
    address: moderationSubmittedString(branch.submitted.address),
    description: moderationSubmittedString(branch.submitted.description),
    workingHours: moderationSubmittedString(branch.submitted.workingHours),
    storeCategories: (org.submitted.storeCategories ?? []).filter(
      (id): id is string => typeof id === "string",
    ),
    specializations: (org.submitted.specializations ?? []).filter(
      (id): id is string => typeof id === "string",
    ),
    photoUrl: moderationSubmittedString(branch.submitted.photoUrl),
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

export function moderationFormatPublicPhone(raw: unknown): string {
  const v = moderationSubmittedString(raw);
  if (!v) return "—";
  return formatPhoneForDisplay(v) || v;
}

export { partnerTypeLabel };
