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
  reissuedBy?: { userId: string | null; displayName: string; at: string } | null;
  acceptedBy: { userId: string | null; displayName: string; at: string } | null;
  terms: { category: string; categoryLabel: string; storePercent: number; isExcluded: boolean }[];
};

export type LinkInviteListResponse = {
  listVersion: 2;
  resurfaceEnabled: boolean;
  active: { items: LinkInviteListRow[]; nextCursor: string | null };
  archive: { items: LinkInviteListRow[]; nextCursor: string | null };
  activeLimit: number;
};

export type LegacyInviteRow = {
  id: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  intendedPartnerType: string | null;
  note: string | null;
  partnershipId: string | null;
  terms: LinkInviteListRow["terms"];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Активно",
  ACCEPTED: "Принято",
  REVOKED: "Отозвано",
  EXPIRED: "Истекло",
};

export function emptyLinkInviteList(): LinkInviteListResponse {
  return {
    listVersion: 2,
    resurfaceEnabled: false,
    active: { items: [], nextCursor: null },
    archive: { items: [], nextCursor: null },
    activeLimit: 50,
  };
}

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

function legacyRowToListRow(row: LegacyInviteRow, phase: "active" | "archive"): LinkInviteListRow {
  const statusLabel = STATUS_LABEL[row.status] ?? row.status;
  const legacyTtl = row.status === "PENDING" && new Date(row.expiresAt).getFullYear() < 2090;
  return {
    id: row.id,
    status: row.status,
    statusLabel,
    expiresAt: row.expiresAt,
    legacyTtl,
    createdAt: row.createdAt,
    acceptedAt: row.acceptedAt,
    intendedPartnerType: row.intendedPartnerType,
    note: row.note,
    partnershipId: row.partnershipId,
    previewPath: null,
    canCopyLink: false,
    canReissue: false,
    createdBy: { userId: null, displayName: "Не указано", at: row.createdAt },
    acceptedBy: null,
    terms: row.terms ?? [],
  };
}

export type ParsedLinkInviteList =
  | { mode: "v2"; list: LinkInviteListResponse }
  | { mode: "legacy"; list: LinkInviteListResponse };

/** Normalize legacy `invites[]` or explicit v2 list for one panel code-path. */
function isV2Shape(data: object): data is LinkInviteListResponse {
  return "active" in data && "archive" in data;
}

export function parseLinkInviteListPayload(data: unknown): ParsedLinkInviteList {
  if (
    data &&
    typeof data === "object" &&
    ("listVersion" in data && (data as { listVersion: number }).listVersion === 2 || isV2Shape(data))
  ) {
    const v2 = data as LinkInviteListResponse;
    return {
      mode: "v2",
      list: {
        listVersion: 2,
        resurfaceEnabled: Boolean(v2.resurfaceEnabled),
        active: v2.active ?? { items: [], nextCursor: null },
        archive: v2.archive ?? { items: [], nextCursor: null },
        activeLimit: v2.activeLimit ?? 50,
      },
    };
  }
  if (data && typeof data === "object" && "invites" in data && Array.isArray((data as { invites: unknown }).invites)) {
    const invites = (data as { invites: LegacyInviteRow[] }).invites;
    const active: LinkInviteListRow[] = [];
    const archive: LinkInviteListRow[] = [];
    for (const row of invites) {
      const mapped = legacyRowToListRow(row, row.status === "PENDING" ? "active" : "archive");
      if (row.status === "PENDING") active.push(mapped);
      else archive.push(mapped);
    }
    return {
      mode: "legacy",
      list: {
        listVersion: 2,
        resurfaceEnabled: false,
        active: { items: active, nextCursor: null },
        archive: { items: archive, nextCursor: null },
        activeLimit: 50,
      },
    };
  }
  return { mode: "legacy", list: emptyLinkInviteList() };
}