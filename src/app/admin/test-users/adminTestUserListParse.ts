export type AdminTestUserRow = {
  id: string;
  publicId: string;
  displayName: string;
  partnerType: string | null;
  partnerActivities: string[];
  profTestDisabledAt: string | null;
  profTestCreatedAt: string | null;
  profTestPublicCatalogAllowed?: boolean;
  catalogStatus?: string | null;
  isPublic?: boolean;
  isBlocked?: boolean;
  organizationsOwned?: Array<{
    id: string;
    name: string;
    catalogStatus: string;
    catalogPublished: boolean;
  }>;
};

export type ParseAdminTestUserListResult =
  | { ok: true; items: AdminTestUserRow[] }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return typeof value === "string" ? value : undefined;
}

function parseRow(raw: unknown, index: number): AdminTestUserRow | null {
  if (!isRecord(raw)) return null;
  const id = raw.id;
  const publicId = raw.publicId;
  const displayName = raw.displayName;
  if (typeof id !== "string" || !id.trim()) return null;
  if (typeof publicId !== "string" || !publicId.trim()) return null;
  if (typeof displayName !== "string") return null;

  const partnerType = optionalString(raw.partnerType);
  if (partnerType === undefined) return null;

  if (!Array.isArray(raw.partnerActivities)) return null;
  const partnerActivities = raw.partnerActivities.filter((a): a is string => typeof a === "string");

  const profTestDisabledAt = optionalString(raw.profTestDisabledAt);
  if (profTestDisabledAt === undefined) return null;

  const profTestCreatedAt = optionalString(raw.profTestCreatedAt);
  if (profTestCreatedAt === undefined) return null;

  const row: AdminTestUserRow = {
    id,
    publicId,
    displayName,
    partnerType,
    partnerActivities,
    profTestDisabledAt,
    profTestCreatedAt,
  };

  const catalogStatus = optionalString(raw.catalogStatus);
  if (catalogStatus !== undefined) row.catalogStatus = catalogStatus;

  if (typeof raw.isPublic === "boolean") row.isPublic = raw.isPublic;
  if (typeof raw.isBlocked === "boolean") row.isBlocked = raw.isBlocked;
  if (typeof raw.profTestPublicCatalogAllowed === "boolean") {
    row.profTestPublicCatalogAllowed = raw.profTestPublicCatalogAllowed;
  }

  if (Array.isArray(raw.organizationsOwned)) {
    const orgs = raw.organizationsOwned
      .map((org) => {
        if (!isRecord(org)) return null;
        if (typeof org.id !== "string" || typeof org.name !== "string") return null;
        if (typeof org.catalogStatus !== "string" || typeof org.catalogPublished !== "boolean") return null;
        return {
          id: org.id,
          name: org.name,
          catalogStatus: org.catalogStatus,
          catalogPublished: org.catalogPublished,
        };
      })
      .filter((org): org is NonNullable<typeof org> => org !== null);
    if (orgs.length > 0) row.organizationsOwned = orgs;
  }

  if (index < 0) return null;
  return row;
}

export function parseAdminTestUserListResponse(body: unknown): ParseAdminTestUserListResult {
  if (!isRecord(body)) {
    return { ok: false, message: "Некорректный ответ сервера — ожидался список тестовых пользователей" };
  }
  if (!("items" in body)) {
    return { ok: false, message: "Ответ сервера не содержит список тестовых пользователей" };
  }
  if (!Array.isArray(body.items)) {
    return { ok: false, message: "Некорректный формат списка тестовых пользователей" };
  }

  const items: AdminTestUserRow[] = [];
  const seenIds = new Set<string>();
  for (let i = 0; i < body.items.length; i += 1) {
    const row = parseRow(body.items[i], i);
    if (!row) {
      return {
        ok: false,
        message: "Некорректные данные в списке тестовых пользователей — обновите страницу или повторите загрузку",
      };
    }
    if (seenIds.has(row.id)) {
      return { ok: false, message: "Список тестовых пользователей содержит повторяющиеся записи" };
    }
    seenIds.add(row.id);
    items.push(row);
  }

  return { ok: true, items };
}
