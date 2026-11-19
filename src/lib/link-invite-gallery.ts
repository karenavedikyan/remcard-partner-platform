import { buildInviteShareMessage, buildInviteShareMessageBody, type PartnerTypeCode } from "@/lib/invite-presentation";
import type { LinkInviteListResponse, LinkInviteListRow } from "@/lib/link-invite-list";

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

export type LinkInviteCopyContext = {
  listMode: "v2" | "legacy";
  resurfaceEnabled: boolean;
};

/** Pending active row the server still exposes for public link copy. */
export function inviteRowAllowsPublicCopy(
  invite: LinkInviteListRow,
  ctx: LinkInviteCopyContext,
): boolean {
  return (
    invite.status === "PENDING" &&
    invite.canCopyLink &&
    Boolean(invite.previewPath?.trim()) &&
    ctx.listMode === "v2" &&
    ctx.resurfaceEnabled
  );
}

export type ManualCopySnapshot = {
  url: string;
  previewPath: string;
};

export function manualCopySnapshotStillValid(
  invite: LinkInviteListRow,
  snapshot: ManualCopySnapshot,
  absoluteUrl: string | null,
  ctx: LinkInviteCopyContext,
): boolean {
  if (!inviteRowAllowsPublicCopy(invite, ctx)) return false;
  if (!absoluteUrl || !invite.previewPath) return false;
  return snapshot.previewPath === invite.previewPath && snapshot.url === absoluteUrl;
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
  const accepted = invite.acceptedBy?.displayName.toLowerCase() ?? "";
  const note = invite.note?.toLowerCase() ?? "";

  return [title, personal, recipient, type, author, accepted, note].some((part) => part.includes(q));
}

/** Append a fetched page without duplicate ids (stale cursor / race safe). */
export function mergeLinkInvitePhaseItems(
  existing: LinkInviteListRow[],
  incoming: LinkInviteListRow[],
): LinkInviteListRow[] {
  const seen = new Set(existing.map((row) => row.id));
  const merged = [...existing];
  for (const row of incoming) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  return merged;
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
export function appendLinkInviteListPhase(
  prev: LinkInviteListResponse,
  page: LinkInviteListResponse,
  phase: "active" | "archive",
): LinkInviteListResponse {
  const mergedItems = mergeLinkInvitePhaseItems(prev[phase].items, page[phase].items);
  return {
    listVersion: page.listVersion,
    resurfaceEnabled: page.resurfaceEnabled,
    activeLimit: page.activeLimit,
    active:
      phase === "active"
        ? { items: mergedItems, nextCursor: page.active.nextCursor }
        : prev.active,
    archive:
      phase === "archive"
        ? { items: mergedItems, nextCursor: page.archive.nextCursor }
        : prev.archive,
  };
}

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