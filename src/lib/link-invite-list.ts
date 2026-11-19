export type LinkInviteListRow = {
  id: string;
  status: string;
  statusLabel: string;
  expiresAt: string;
  legacyTtl: boolean;
  createdAt: string;
  acceptedAt: string | null;
  intendedPartnerType: string | null;
  note: string | null;
  partnershipId: string | null;
  previewPath: string | null;
  canCopyLink: boolean;
  canReissue: boolean;
  createdBy: { userId: string | null; displayName: string; at: string };
  acceptedBy: { userId: string | null; displayName: string; at: string } | null;
  terms: { category: string; categoryLabel: string; storePercent: number; isExcluded: boolean }[];
};

export type LinkInviteListResponse = {
  active: { items: LinkInviteListRow[]; nextCursor: string | null };
  archive: { items: LinkInviteListRow[]; nextCursor: string | null };
  activeLimit: number;
};

export function formatInviteListDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function inviteAbsoluteUrl(previewPath: string | null, appUrl: string): string | null {
  if (!previewPath) return null;
  return `${appUrl}${previewPath}`;
}

export function emptyLinkInviteList(): LinkInviteListResponse {
  return {
    active: { items: [], nextCursor: null },
    archive: { items: [], nextCursor: null },
    activeLimit: 50,
  };
}