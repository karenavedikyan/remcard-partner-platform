import { buildInviteShareMessage, buildInviteShareMessageBody, type PartnerTypeCode } from "@/lib/invite-presentation";
import type { LinkInviteListRow } from "@/lib/link-invite-list";

export const LINK_INVITE_MISSING_RECIPIENT = "Имя не сохранено";

export const LINK_INVITE_INTENDED_LABELS: Record<string, string> = {
  AGENT: "Агент",
  MASTER: "Специалист",
  STORE: "Магазин",
  COMPANY: "Компания",
};

export type LinkInviteGallerySort = "newest" | "oldest";

export function linkInviteOriginalRecipientLabel(invite: LinkInviteListRow): string | null {
  const fromApi = invite.recipientLabel?.trim();
  return fromApi || null;
}

export function linkInvitePersonalTitle(invite: LinkInviteListRow): string | null {
  const fromApi = invite.personalLabel?.trim();
  return fromApi || null;
}

/** Title on the card: private list name, else original recipient, else honest gap. */
export function linkInviteCardTitle(invite: LinkInviteListRow): string {
  const personal = linkInvitePersonalTitle(invite);
  if (personal) return personal;
  const recipient = linkInviteOriginalRecipientLabel(invite);
  if (recipient) return recipient;
  return LINK_INVITE_MISSING_RECIPIENT;
}

export function linkInviteIntendedLabel(intendedPartnerType: string | null): string | null {
  if (!intendedPartnerType) return null;
  return LINK_INVITE_INTENDED_LABELS[intendedPartnerType] ?? intendedPartnerType;
}

export function participatingTermCount(invite: LinkInviteListRow): number {
  return invite.terms.length;
}

export function formatLinkInviteCopyText(input: {
  invite: LinkInviteListRow;
  url: string;
  inviterName: string;
  inviterType?: PartnerTypeCode;
}): string {
  const url = input.url.trim();
  if (!url) return "";
  const persistedNote = input.invite.note?.trim();
  const body = persistedNote
    ? persistedNote
    : buildInviteShareMessageBody({
        inviterName: input.inviterName,
        inviterType: input.inviterType,
        intendedType: input.invite.intendedPartnerType,
      });
  return `${body}\n\n${url}`;
}

export function formatLinkInviteShareText(input: {
  invite: LinkInviteListRow;
  url: string;
  inviterName: string;
  inviterType?: PartnerTypeCode;
}): string {
  return formatLinkInviteCopyText(input);
}

export function matchesLinkInviteSearch(
  invite: LinkInviteListRow,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const title = linkInviteCardTitle(invite).toLowerCase();
  const personal = linkInvitePersonalTitle(invite)?.toLowerCase() ?? "";
  const recipient = linkInviteOriginalRecipientLabel(invite)?.toLowerCase() ?? "";
  const type = linkInviteIntendedLabel(invite.intendedPartnerType)?.toLowerCase() ?? "";
  const author = invite.createdBy.displayName.toLowerCase();
  const note = invite.note?.toLowerCase() ?? "";

  return [title, personal, recipient, type, author, note].some((part) => part.includes(q));
}

export function sortLinkInviteRows(
  rows: LinkInviteListRow[],
  sort: LinkInviteGallerySort,
): LinkInviteListRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const at = Date.parse(a.createdAt);
    const bt = Date.parse(b.createdAt);
    return sort === "newest" ? bt - at : at - bt;
  });
  return copy;
}

/** Narrow default share text for tests / parity with legacy formatter. */
export function legacyRowInviteShareText(
  invite: LinkInviteListRow,
  url: string,
  inviterName: string,
  inviterType?: PartnerTypeCode,
): string {
  const persistedNote = invite.note?.trim();
  if (persistedNote) return `${persistedNote}\n\n${url}`;
  return buildInviteShareMessage({
    inviterName,
    url,
    inviterType,
    intendedType: invite.intendedPartnerType,
  });
}