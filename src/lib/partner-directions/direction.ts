import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
import type {
  PartnerSearchResult,
  Partnership,
  PartnershipDirection,
} from "@/lib/types";
import { isAgentCooperationInviter } from "@/lib/partnership-agent-inviter";

/**
 * One Partnership row is one directed agreement. `storeUserId` receives and authors the terms,
 * `proUserId` issues certificates. The server resolves the viewer's side in `directionInfo`
 * (including legacy rows where a pure agent is stored on the store side).
 */

export type DirectionTabCopy = {
  incoming: string;
  outgoing: string;
  incomingHint: string;
  outgoingHint: string;
  ariaLabel: string;
};

const BUSINESS_TABS: DirectionTabCopy = {
  incoming: "Нас рекомендуют",
  outgoing: "Мы рекомендуем",
  incomingHint: "Партнёры, которые выдают сертификаты вашей организации на ваших условиях.",
  outgoingHint: "Партнёры, которым вы выдаёте сертификаты на их условиях.",
  ariaLabel: "Направление рекомендаций",
};

const SPECIALIST_TABS: DirectionTabCopy = {
  incoming: "Меня рекомендуют",
  outgoing: "Я рекомендую",
  incomingHint: "Партнёры, которые выдают сертификаты вам на ваших условиях.",
  outgoingHint: "Партнёры, которым вы выдаёте сертификаты на их условиях.",
  ariaLabel: "Направление рекомендаций",
};

export function directionTabCopy(audience: PartnersHubAudience | undefined): DirectionTabCopy {
  return audience === "specialist-r04" || audience === "agent-r04" ? SPECIALIST_TABS : BUSINESS_TABS;
}

/** Agents only issue certificates: the list has no incoming direction and no tabs. */
export function audienceHasDirectionTabs(audience: PartnersHubAudience | undefined): boolean {
  return (
    audience === "business-store-r04" ||
    audience === "business-company-r04" ||
    audience === "specialist-r04"
  );
}

export function rowDirection(partnership: Partnership, meId: string): PartnershipDirection {
  const info = partnership.directionInfo;
  if (info) return info.direction;
  return partnership.storeUserId === meId ? "incoming" : "outgoing";
}

export function counterpartyUserId(partnership: Partnership, meId: string): string {
  return (
    partnership.directionInfo?.counterpartyUserId ??
    (partnership.storeUserId === meId ? partnership.proUserId : partnership.storeUserId)
  );
}

export function filterRowsByDirection(
  rows: readonly Partnership[],
  meId: string,
  direction: PartnershipDirection,
): Partnership[] {
  return rows.filter((row) => rowDirection(row, meId) === direction);
}

export function countByDirection(
  rows: readonly Partnership[],
  meId: string,
): Record<PartnershipDirection, number> {
  const counts: Record<PartnershipDirection, number> = { incoming: 0, outgoing: 0 };
  for (const row of rows) counts[rowDirection(row, meId)] += 1;
  return counts;
}

/** Where the UI says "partners" it counts people, not directed agreements. */
export function countDistinctCounterparties(rows: readonly Partnership[], meId: string): number {
  return new Set(rows.map((row) => counterpartyUserId(row, meId))).size;
}

export type DirectionBadgeKind = "incoming" | "outgoing" | "both";

export type DirectionBadgeModel = {
  kind: DirectionBadgeKind;
  glyph: "↓" | "↑" | "↑↓";
  label: string;
  description: string;
};

/**
 * Badge for a row. "both" only when this row AND the reverse row are ACTIVE; a pending,
 * paused or ended reverse agreement never looks like an active one.
 */
export function directionBadgeModel(
  partnership: Partnership,
  meId: string,
  audience?: PartnersHubAudience,
): DirectionBadgeModel {
  const direction = rowDirection(partnership, meId);
  const reverse = partnership.directionInfo?.reverseStatus ?? null;
  const copy = directionTabCopy(audience);
  const reverseActive = partnership.status === "ACTIVE" && reverse === "ACTIVE";

  if (reverseActive) {
    return {
      kind: "both",
      glyph: "↑↓",
      label: "Рекомендуем друг друга",
      description: `${copy.incoming} и ${copy.outgoing.toLowerCase()}: у каждого направления свои условия, лимиты и клиенты.`,
    };
  }

  const reverseNote = reverseStatusNote(reverse);
  if (direction === "incoming") {
    return {
      kind: "incoming",
      glyph: "↓",
      label: copy.incoming,
      description: `${copy.incomingHint}${reverseNote}`,
    };
  }
  return {
    kind: "outgoing",
    glyph: "↑",
    label: copy.outgoing,
    description: `${copy.outgoingHint}${reverseNote}`,
  };
}

function reverseStatusNote(reverse: string | null): string {
  switch (reverse) {
    case "INVITED":
    case "PENDING":
      return " Встречное направление ждёт ответа и пока не действует.";
    case "PAUSED":
      return " Встречное направление приостановлено.";
    case "ENDED":
      return " Встречное направление завершено.";
    case "ACTIVE":
      return " Встречное направление действует.";
    default:
      return "";
  }
}

export type SearchDirectionState = {
  outgoing: { partnershipId: string; status: string } | null;
  incoming: { partnershipId: string; status: string } | null;
};

export function searchDirectionState(result: PartnerSearchResult): SearchDirectionState {
  return {
    outgoing: result.partnershipDirections?.outgoing ?? null,
    incoming: result.partnershipDirections?.incoming ?? null,
  };
}

/** The side of a search result with the server's receiving verdict attached. */
export function searchResultReceivingSide(result: PartnerSearchResult, side: InviteSide): InviteSide {
  return result.canReceiveCertificates === undefined ? side : { ...side, canReceive: result.canReceiveCertificates };
}

function isLive(slot: { status: string } | null): boolean {
  return slot != null && slot.status !== "ENDED";
}

export type SearchBadgeModel = {
  glyph: "↑" | "↓" | "↑↓";
  label: string;
  description: string;
  pending: boolean;
};

/** Search card state: what already exists between me and this profile, per direction. */
export function searchDirectionBadge(
  result: PartnerSearchResult,
  audience?: PartnersHubAudience,
): SearchBadgeModel | null {
  const state = searchDirectionState(result);
  const copy = directionTabCopy(audience);
  const outActive = state.outgoing?.status === "ACTIVE";
  const inActive = state.incoming?.status === "ACTIVE";
  if (outActive && inActive) {
    return {
      glyph: "↑↓",
      label: "Сотрудничаем",
      description: `${copy.incoming} и ${copy.outgoing.toLowerCase()}.`,
      pending: false,
    };
  }
  if (inActive) {
    return {
      glyph: "↓",
      label: "Сотрудничаем",
      description: `${copy.incoming}: партнёр выдаёт сертификаты на ваших условиях.`,
      pending: false,
    };
  }
  if (outActive) {
    return {
      glyph: "↑",
      label: "Сотрудничаем",
      description: `${copy.outgoing}: вы выдаёте сертификаты на условиях партнёра.`,
      pending: false,
    };
  }
  if (isLive(state.outgoing) || isLive(state.incoming)) {
    return {
      glyph: isLive(state.outgoing) ? "↑" : "↓",
      label: "Ожидает ответа",
      description: "Приглашение отправлено или ждёт решения. Сотрудничество пока не действует.",
      pending: true,
    };
  }
  return null;
}

export type InviteDirection = "INVITER_RECEIVES" | "INVITER_ISSUES";

type InviteSide = {
  partnerType: string | null;
  partnerActivities?: string[];
  isStoreOwner?: boolean;
  /** Server verdict from the pure-agent rule; wins over the partnerType heuristic when present. */
  canReceive?: boolean;
};

const BUSINESS_TYPES = new Set(["STORE", "COMPANY", "MASTER"]);

/** Mirrors the server rule: any business type receives; a pure agent only issues. */
export function canReceiveRecommendations(side: InviteSide): boolean {
  if (side.canReceive === false) return false;
  if (isAgentCooperationInviter(side)) return false;
  return side.isStoreOwner === true || (side.partnerType != null && BUSINESS_TYPES.has(side.partnerType));
}

export type InviteDirectionOption = {
  value: InviteDirection;
  label: string;
  description: string;
};

/** Directions the inviter may offer to this target, in display order. */
export function inviteDirectionOptions(
  inviter: InviteSide,
  target: InviteSide,
  audience?: PartnersHubAudience,
): InviteDirectionOption[] {
  const options: InviteDirectionOption[] = [];
  if (canReceiveRecommendations(inviter)) {
    options.push({
      value: "INVITER_RECEIVES",
      label: audience === "specialist-r04" ? "Меня будут рекомендовать" : "Нас будут рекомендовать",
      description: "Вы задаёте условия получения. Партнёр увидит их до принятия.",
    });
  }
  if (canReceiveRecommendations(target)) {
    options.push({
      value: "INVITER_ISSUES",
      label: audience === "specialist-r04" ? "Я буду рекомендовать" : "Мы будем рекомендовать",
      description:
        "Условия получения задаёт сам партнёр. Вы отправляете запрос, а ставки подтверждает получатель.",
    });
  }
  return options;
}

export type ReceivingTermsReadOnlyLine = { label: string; value: string };

export function formatValidityDays(days: number): string {
  const mod10 = days % 10;
  const mod100 = days % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "день"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "дня"
        : "дней";
  return `${days} ${word}`;
}

export function formatPurchaseLimit(limit: number): string {
  const mod10 = limit % 10;
  const mod100 = limit % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "покупка"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "покупки"
        : "покупок";
  return `${limit} ${word}`;
}

/** Clients link for one directed row: observer view scoped to the exact receiving partner. */
export function directionClientsHref(partnership: Partnership, meId: string): string | null {
  if (rowDirection(partnership, meId) !== "outgoing") return null;
  const receiverId = partnership.directionInfo?.receiverUserId ?? counterpartyUserId(partnership, meId);
  if (!receiverId) return null;
  return `/clients?direction=at-partners&partnerId=${encodeURIComponent(receiverId)}`;
}
