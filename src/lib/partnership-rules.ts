import type {
  InviteTermInput,
  PartnerSearchResult,
  Partnership,
  ProProfileUser,
} from "@/lib/types";

export const GENERAL_PARTNERSHIP_CATEGORY = "general";
export const DEFAULT_GENERAL_PERCENT = 10;
export const INVITE_PARTNER_UNKNOWN_BLOCK_MESSAGE =
  "Не удалось определить условия партнёра. Приглашение пока недоступно";

export type PartnerSideProfile = {
  id: string;
  partnerType: string | null;
  storeCategories: string[];
  specializations: string[];
  /**
   * true — владелец организации типа STORE (подтверждено сервером).
   * false — организация подтверждена, но не STORE.
   * undefined — тип организации неизвестен (API поиска не возвращает partnerType организации).
   */
  isStoreOwner?: boolean;
  /** Название организации из поиска; наличие без типа означает неизвестный store-side. */
  organizationName?: string | null;
};

export type InviteTermRow = {
  category: string;
  percent: string;
  excluded: boolean;
};

export type PartnershipActionKind =
  | "accept"
  | "reject"
  | "cancel"
  | "accept_pending"
  | "withdraw_counter"
  | "pause"
  | "resume";

export type PartnershipUiAction =
  | { kind: PartnershipActionKind; label: string; variant?: "primary" | "secondary" }
  | { kind: "waiting"; message: string };

export type SearchRole = "store" | "pro";

export const SEARCH_ROLE_OPTIONS: ReadonlyArray<{
  value: SearchRole;
  label: string;
  description: string;
  namePlaceholder: string;
}> = [
  {
    value: "store",
    label: "Мастера и компании",
    description: "Специалисты с одобренным профилем в каталоге RemCard",
    namePlaceholder: "Имя мастера или компании",
  },
  {
    value: "pro",
    label: "Магазины, мастера и компании",
    description: "Партнёры с одобренным профилем (магазины, мастера, компании)",
    namePlaceholder: "Название магазина или имя",
  },
];

function filterProfileCategories(values: string[] | undefined | null): string[] {
  return [...(values ?? [])].filter((value) => value && value !== "all");
}

export function tradeSideTermCategories(user: PartnerSideProfile): string[] {
  const stores = filterProfileCategories(user.storeCategories);
  if (stores.length > 0) {
    return stores;
  }
  const specs = filterProfileCategories(user.specializations);
  if (specs.length > 0) {
    return specs;
  }
  return [];
}

function isStoreSide(user: PartnerSideProfile): boolean {
  return user.partnerType === "STORE" || user.isStoreOwner === true;
}

/**
 * Неизвестно, задаёт ли цель условия как магазин: есть организация, но partnerType организации
 * не подтверждён, а user.partnerType не STORE.
 */
export function inviteTargetStoreOwnershipUnknown(target: PartnerSideProfile): boolean {
  if (target.partnerType === "STORE" || target.isStoreOwner === true) {
    return false;
  }
  if (target.isStoreOwner === false) {
    return false;
  }
  if (target.partnerType !== "MASTER" && target.partnerType !== "COMPANY") {
    return false;
  }
  return Boolean(target.organizationName?.trim());
}

/** Зеркало tradeSideCategories из POST /api/partnership/invite (navigator). */
export function resolveInviteTradeSideCategories(
  inviter: PartnerSideProfile,
  target: PartnerSideProfile,
): { categories: string[]; mode: "store" | "pro"; blockedReason?: string } {
  if (isStoreSide(inviter)) {
    return { categories: tradeSideTermCategories(inviter), mode: "store" };
  }

  if (inviter.partnerType === "MASTER" || inviter.partnerType === "COMPANY") {
    if (isStoreSide(target)) {
      return { categories: tradeSideTermCategories(target), mode: "pro" };
    }
    if (target.partnerType === "MASTER" || target.partnerType === "COMPANY") {
      if (inviteTargetStoreOwnershipUnknown(target)) {
        return {
          categories: [],
          mode: "pro",
          blockedReason: INVITE_PARTNER_UNKNOWN_BLOCK_MESSAGE,
        };
      }
      return { categories: tradeSideTermCategories(inviter), mode: "pro" };
    }
    return { categories: [], mode: "pro", blockedReason: "Партнёр недоступен для приглашения" };
  }

  return {
    categories: [],
    mode: "pro",
    blockedReason: "Укажите тип партнёра в профиле, чтобы отправлять приглашения",
  };
}

export function buildDefaultInviteRows(categories: string[]): InviteTermRow[] {
  return categories.map((category) => ({
    category,
    percent: String(DEFAULT_GENERAL_PERCENT),
    excluded: false,
  }));
}

export function buildGeneralInviteRow(): InviteTermRow {
  return {
    category: GENERAL_PARTNERSHIP_CATEGORY,
    percent: String(DEFAULT_GENERAL_PERCENT),
    excluded: false,
  };
}

export function inviteRowsToTerms(rows: InviteTermRow[]): InviteTermInput[] {
  return rows
    .filter((row) => row.category)
    .map((row) => ({
      category: row.category,
      categoryLabel: row.category,
      storePercent: row.excluded
        ? 0
        : Math.min(100, Math.max(0, Number(row.percent) || 0)),
      isExcluded: row.excluded,
    }));
}

export function validateInviteRows(rows: InviteTermRow[]): string | null {
  const active = rows.filter((row) => row.category && !row.excluded);
  if (active.length === 0) {
    return "Отметьте хотя бы одну категорию без исключения";
  }
  for (const row of active) {
    const value = Number(row.percent);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return "Процент должен быть от 0 до 100";
    }
  }
  return null;
}

export function profileUserToPartnerSide(
  user: ProProfileUser,
  organization: { partnerType: string | null } | null,
): PartnerSideProfile {
  return {
    id: user.id,
    partnerType: user.partnerType,
    storeCategories: user.storeCategories,
    specializations: user.specializations,
    isStoreOwner:
      organization == null
        ? undefined
        : organization.partnerType === "STORE"
          ? true
          : false,
  };
}

/** Карточка из GET /api/partnership/search — без эвристик по organizationName. */
export function searchResultToPartnerSide(target: PartnerSearchResult): PartnerSideProfile {
  const orgType = target.organizationPartnerType;
  let isStoreOwner: boolean | undefined;
  if (orgType === "STORE") {
    isStoreOwner = true;
  } else if (orgType != null) {
    isStoreOwner = false;
  } else {
    isStoreOwner = undefined;
  }

  return {
    id: target.id,
    partnerType: target.partnerType ?? null,
    storeCategories: target.storeCategories ?? [],
    specializations: target.specializations ?? [],
    isStoreOwner,
    organizationName: target.organizationName ?? null,
  };
}

export function inviteSideStableKey(side: PartnerSideProfile): string {
  return [
    side.id,
    side.partnerType ?? "",
    side.isStoreOwner === true ? "1" : side.isStoreOwner === false ? "0" : "?",
    side.storeCategories.join(","),
    side.specializations.join(","),
  ].join("\0");
}

export function partnershipNeedsMyResponse(partnership: Partnership, meId: string): boolean {
  const isParticipant =
    partnership.storeUserId === meId || partnership.proUserId === meId;
  if (!isParticipant) {
    return false;
  }

  if (partnership.status === "INVITED") {
    return partnership.initiatedBy !== meId;
  }

  if (partnership.status === "PENDING") {
    const authorId = partnership.pendingProposedBy ?? "";
    return Boolean(authorId && authorId !== meId);
  }

  return false;
}

export function countNeedsMyResponse(partnerships: Partnership[], meId: string): number {
  return partnerships.filter((item) => partnershipNeedsMyResponse(item, meId)).length;
}

export function getPartnershipUiActions(
  partnership: Partnership,
  meId: string,
): PartnershipUiAction[] {
  const isParticipant =
    partnership.storeUserId === meId || partnership.proUserId === meId;
  if (!isParticipant) {
    return [];
  }

  const iAmInitiator = partnership.initiatedBy === meId;
  const authorId = partnership.pendingProposedBy ?? "";
  const iAmAuthor = authorId === meId;

  if (partnership.status === "INVITED") {
    if (iAmInitiator) {
      return [{ kind: "cancel", label: "Отозвать приглашение", variant: "secondary" }];
    }
    return [
      { kind: "accept", label: "Принять", variant: "primary" },
      { kind: "reject", label: "Отклонить", variant: "secondary" },
    ];
  }

  if (partnership.status === "PENDING") {
    if (iAmAuthor) {
      if (!iAmInitiator) {
        return [
          {
            kind: "withdraw_counter",
            label: "Отозвать предложение",
            variant: "secondary",
          },
        ];
      }
      return [{ kind: "waiting", message: "Условия отправлены. Ожидаем ответа партнёра." }];
    }

    if (authorId && !iAmAuthor) {
      return [
        { kind: "accept_pending", label: "Принять условия", variant: "primary" },
        { kind: "reject", label: "Отклонить", variant: "secondary" },
      ];
    }

    return [{ kind: "waiting", message: "Ожидаем ответа второй стороны" }];
  }

  if (partnership.status === "ACTIVE") {
    return [
      { kind: "pause", label: "Приостановить", variant: "secondary" },
    ];
  }

  if (partnership.status === "PAUSED") {
    return [{ kind: "resume", label: "Возобновить", variant: "primary" }];
  }

  return [];
}

export function defaultSearchRoleForUser(user: PartnerSideProfile): SearchRole {
  return isStoreSide(user) ? "store" : "pro";
}
