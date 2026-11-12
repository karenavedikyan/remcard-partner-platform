import {
  PARTNERSHIP_STATUS_LABELS,
} from "@/lib/partnership-labels";
import {
  partnerProductLabels,
  partnerRenovationStageLabels,
  partnerServiceLabels,
  partnerTermsDetail,
  partnerTypeLabel,
  partnershipPartnerProfile,
} from "@/lib/agent-r04/partner-list-row";
import { partnerDisplayTitle, resolvePublicPartnerType } from "@/lib/agent-r04/partner-filters";
import type { Partnership, PartnershipCooperationContact, PartnershipUser } from "@/lib/types";

export type CounterpartyProfileView = {
  typeLabel: string;
  displayName: string;
  cityLine: string;
  organizationLine: string | null;
  personalAliasLine: string | null;
  cooperationStatusLabel: string;
  cooperationSince: string;
  cooperationTermsSummary: string;
  publicId: string | null;
  publicIdContractAvailable: boolean;
  about: { text: string; mode: "value" | "partner-empty" | "no-contract" };
  products: string[];
  services: string[];
  renovationStages: string[];
  geography: { items: string[]; mode: "value" | "partner-empty" | "no-contract" };
  contact: {
    lines: { kind: "name" | "phone" | "email"; value: string }[];
    mode: "value" | "partner-empty" | "no-contract";
  };
  avatarInitials: string;
  photoUrl: string | null;
};

const NO_CONTRACT_COPY = "Нет данных для отображения";

function fieldInContract<K extends keyof PartnershipUser>(
  user: PartnershipUser,
  key: K,
): boolean {
  return Object.prototype.hasOwnProperty.call(user, key);
}

function aboutCopy(user: PartnershipUser): CounterpartyProfileView["about"] {
  if (!fieldInContract(user, "description")) {
    return { text: NO_CONTRACT_COPY, mode: "no-contract" };
  }
  const text = user.description?.trim();
  if (!text) {
    return { text: "Партнёр пока не добавил описание.", mode: "partner-empty" };
  }
  return { text, mode: "value" };
}

export function mergeCounterpartyGeography(user: PartnershipUser): string[] {
  const merged: string[] = [];
  const cityTrim = user.city?.trim();
  if (cityTrim) merged.push(cityTrim);
  if (fieldInContract(user, "areas")) {
    for (const area of user.areas ?? []) {
      const trimmed = area?.trim();
      if (trimmed) merged.push(trimmed);
    }
  }
  for (const branch of user.branches ?? []) {
    const branchCity = branch.city?.trim();
    if (branchCity) merged.push(branchCity);
  }
  return [...new Set(merged)];
}

function geographyCopy(user: PartnershipUser): CounterpartyProfileView["geography"] {
  const items = mergeCounterpartyGeography(user);
  if (items.length) return { items, mode: "value" };
  const hasListGeo =
    Boolean(user.city?.trim()) ||
    Boolean(user.branches?.some((b) => b.city?.trim())) ||
    (fieldInContract(user, "areas") && Boolean(user.areas?.some((a) => a?.trim())));
  if (hasListGeo) return { items: [], mode: "partner-empty" };
  if (!fieldInContract(user, "areas") && !user.branches?.length && !user.city?.trim()) {
    return { items: [], mode: "no-contract" };
  }
  return { items: [], mode: "partner-empty" };
}

function contactCopy(
  user: PartnershipUser,
): CounterpartyProfileView["contact"] {
  if (!fieldInContract(user, "partnershipContact")) {
    return { lines: [], mode: "no-contract" };
  }
  const src = user.partnershipContact;
  if (!src) {
    return { lines: [], mode: "partner-empty" };
  }
  const lines: CounterpartyProfileView["contact"]["lines"] = [];
  if (src.name?.trim()) lines.push({ kind: "name", value: src.name.trim() });
  if (src.phone?.trim()) lines.push({ kind: "phone", value: src.phone.trim() });
  if (src.email?.trim()) lines.push({ kind: "email", value: src.email.trim() });
  if (!lines.length) return { lines: [], mode: "partner-empty" };
  return { lines, mode: "value" };
}

function formatCooperationSince(createdAt: string): string {
  const trimmed = createdAt?.trim();
  if (!trimmed) return "—";
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return (parts[0].slice(0, 1) + (parts[1]?.slice(0, 1) || "")).toUpperCase();
}

export function showsCounterpartyOrganization(
  partner: ReturnType<typeof partnershipPartnerProfile>,
): boolean {
  const kind = resolvePublicPartnerType(partner);
  return (kind === "store" || kind === "company") && Boolean(partner.organizationName?.trim());
}

export function buildCounterpartyProfileView(
  partnership: Partnership,
  listPrincipalId: string,
): CounterpartyProfileView {
  const partner = partnershipPartnerProfile(partnership, listPrincipalId);
  const { alias, official } = partnerDisplayTitle(partnership, listPrincipalId);
  const displayName = official;
  const typeLabel = partnerTypeLabel(partner);
  const cityLine = partner.city?.trim() || "Город не указан";
  const personalAliasLine = alias;
  const organizationLine = showsCounterpartyOrganization(partner)
    ? partner.organizationName?.trim() || null
    : null;

  const publicIdContractAvailable = fieldInContract(partner, "publicId");
  const publicId = publicIdContractAvailable && partner.publicId?.trim()
    ? partner.publicId.trim()
    : null;

  const cooperationStatusLabel =
    PARTNERSHIP_STATUS_LABELS[partnership.status] ?? partnership.status;
  const cooperationSince = formatCooperationSince(partnership.createdAt);
  const cooperationTermsSummary =
    partnerTermsDetail(partnership) || "Условия ещё не согласованы";

  return {
    typeLabel,
    displayName,
    cityLine,
    organizationLine,
    personalAliasLine,
    cooperationStatusLabel,
    cooperationSince,
    cooperationTermsSummary,
    publicId,
    publicIdContractAvailable,
    about: aboutCopy(partner),
    products: partnerProductLabels(partner),
    services: partnerServiceLabels(partner),
    renovationStages: partnerRenovationStageLabels(partner),
    geography: geographyCopy(partner),
    contact: contactCopy(partner),
    avatarInitials: initials(displayName),
    photoUrl: partner.photoUrl?.trim() || partner.organizationLogoUrl?.trim() || null,
  };
}

export function counterpartyContactKindLabel(kind: "name" | "phone" | "email"): string {
  if (kind === "name") return "Имя";
  if (kind === "phone") return "Телефон";
  return "Email";
}
