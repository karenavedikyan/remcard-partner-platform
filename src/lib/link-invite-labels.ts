import { buildInviteShareMessageBody, type PartnerTypeCode } from "@/lib/invite-presentation";
import type { LinkInviteListRow } from "@/lib/link-invite-list";

export const LINK_INVITE_MISSING_RECIPIENT = "Имя не сохранено";

export function linkInviteOriginalRecipientLabel(invite: LinkInviteListRow): string | null {
  const fromApi = invite.recipientLabel?.trim();
  return fromApi || null;
}

export function linkInvitePersonalTitle(invite: LinkInviteListRow): string | null {
  const fromApi = invite.personalLabel?.trim();
  return fromApi || null;
}

/** List title: private name for the author, else original recipient, else honest gap. */
export function linkInviteListTitle(invite: LinkInviteListRow): string {
  const personal = linkInvitePersonalTitle(invite);
  if (personal) return personal;
  const recipient = linkInviteOriginalRecipientLabel(invite);
  if (recipient) return recipient;
  return LINK_INVITE_MISSING_RECIPIENT;
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