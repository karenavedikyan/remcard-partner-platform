export const RECOMMENDATION_CREATE_DRAFT_VERSION = 3;
export const RECOMMENDATION_CREATE_DRAFT_VERSION_LEGACY = 2;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const VALIDITY_PRESETS = new Set(["1", "3", "6", "12", "unlimited"]);

export type RecommendationCreateDraftScope = {
  userId: string;
  organizationId: string | null;
  branchId: string | null;
};

export type RecommendationCreateDraft = {
  v: number;
  userId: string;
  organizationId: string | null;
  branchId: string | null;
  savedAt: number;
  selectedKeys: string[];
  discountDrafts: Record<string, string>;
  validityPreset: string;
  partnerSearchQuery?: string;
  specialistStep?: 1 | 2;
  selectedCategoryKeys?: Record<string, boolean>;
};

export type RecommendationCreateDraftPayload = Omit<
  RecommendationCreateDraft,
  "v" | "userId" | "organizationId" | "branchId" | "savedAt"
>;

function scopeSegment(id: string | null): string {
  return id?.trim() || "_";
}

function scopeKey(scope: RecommendationCreateDraftScope): string {
  return `${scope.userId}:${scopeSegment(scope.organizationId)}:${scopeSegment(scope.branchId)}`;
}

export function serializeRecommendationCreateDraftScope(
  scope: RecommendationCreateDraftScope,
): string {
  return scopeKey(scope);
}

function sessionStorageSafe(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    void sessionStorage.length;
    return sessionStorage;
  } catch {
    return null;
  }
}

export function recommendationCreateDraftKey(scope: RecommendationCreateDraftScope): string {
  return `rc-rec-create-v${RECOMMENDATION_CREATE_DRAFT_VERSION}:${scopeKey(scope)}`;
}

export function recommendationCreateDraftKeyLegacyV2(scope: RecommendationCreateDraftScope): string {
  return `rc-rec-create-v${RECOMMENDATION_CREATE_DRAFT_VERSION_LEGACY}:${scopeKey(scope)}`;
}

function draftScopeMatches(
  parsed: RecommendationCreateDraft,
  scope: RecommendationCreateDraftScope,
): boolean {
  return (
    parsed.userId === scope.userId &&
    (parsed.organizationId ?? null) === (scope.organizationId ?? null) &&
    (parsed.branchId ?? null) === (scope.branchId ?? null)
  );
}

function isValidDraftShape(raw: unknown): raw is RecommendationCreateDraft {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.v !== RECOMMENDATION_CREATE_DRAFT_VERSION) return false;
  if (typeof o.userId !== "string" || !o.userId.trim()) return false;
  if (o.organizationId != null && typeof o.organizationId !== "string") return false;
  if (o.branchId != null && typeof o.branchId !== "string") return false;
  if (typeof o.savedAt !== "number" || !Number.isFinite(o.savedAt)) return false;
  if (!Array.isArray(o.selectedKeys) || !o.selectedKeys.every((k) => typeof k === "string")) {
    return false;
  }
  if (!o.discountDrafts || typeof o.discountDrafts !== "object" || Array.isArray(o.discountDrafts)) {
    return false;
  }
  for (const value of Object.values(o.discountDrafts as Record<string, unknown>)) {
    if (typeof value !== "string") return false;
  }
  if (typeof o.validityPreset !== "string" || !VALIDITY_PRESETS.has(o.validityPreset)) return false;
  if (o.partnerSearchQuery != null && typeof o.partnerSearchQuery !== "string") return false;
  if (o.specialistStep != null && o.specialistStep !== 1 && o.specialistStep !== 2) return false;
  if (o.selectedCategoryKeys != null) {
    if (typeof o.selectedCategoryKeys !== "object" || Array.isArray(o.selectedCategoryKeys)) return false;
    for (const value of Object.values(o.selectedCategoryKeys as Record<string, unknown>)) {
      if (typeof value !== "boolean") return false;
    }
  }
  return true;
}

type RecommendationCreateDraftV2Core = Pick<
  RecommendationCreateDraft,
  | "userId"
  | "organizationId"
  | "branchId"
  | "savedAt"
  | "selectedKeys"
  | "discountDrafts"
  | "validityPreset"
>;

function isValidLegacyV2DraftShape(raw: unknown): raw is RecommendationCreateDraftV2Core & { v: 2 } {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.v !== RECOMMENDATION_CREATE_DRAFT_VERSION_LEGACY) return false;
  if (typeof o.userId !== "string" || !o.userId.trim()) return false;
  if (o.organizationId != null && typeof o.organizationId !== "string") return false;
  if (o.branchId != null && typeof o.branchId !== "string") return false;
  if (typeof o.savedAt !== "number" || !Number.isFinite(o.savedAt)) return false;
  if (!Array.isArray(o.selectedKeys) || !o.selectedKeys.every((k) => typeof k === "string")) {
    return false;
  }
  if (!o.discountDrafts || typeof o.discountDrafts !== "object" || Array.isArray(o.discountDrafts)) {
    return false;
  }
  for (const value of Object.values(o.discountDrafts as Record<string, unknown>)) {
    if (typeof value !== "string") return false;
  }
  if (typeof o.validityPreset !== "string" || !VALIDITY_PRESETS.has(o.validityPreset)) return false;
  return true;
}

function migrateLegacyV2Draft(
  legacy: RecommendationCreateDraftV2Core & { v: 2 },
): RecommendationCreateDraft {
  return {
    v: RECOMMENDATION_CREATE_DRAFT_VERSION,
    userId: legacy.userId,
    organizationId: legacy.organizationId,
    branchId: legacy.branchId,
    savedAt: legacy.savedAt,
    selectedKeys: legacy.selectedKeys,
    discountDrafts: legacy.discountDrafts,
    validityPreset: legacy.validityPreset,
    partnerSearchQuery: "",
    specialistStep: 1,
    selectedCategoryKeys: {},
  };
}

function readStorage(key: string): string | null {
  const storage = sessionStorageSafe();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): boolean {
  const storage = sessionStorageSafe();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStorage(key: string): void {
  const storage = sessionStorageSafe();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore quota / privacy mode
  }
}

export function saveRecommendationCreateDraft(
  scope: RecommendationCreateDraftScope,
  draft: RecommendationCreateDraftPayload,
): void {
  if (!sessionStorageSafe()) return;
  const payload: RecommendationCreateDraft = {
    v: RECOMMENDATION_CREATE_DRAFT_VERSION,
    userId: scope.userId,
    organizationId: scope.organizationId,
    branchId: scope.branchId,
    savedAt: Date.now(),
    ...draft,
  };
  writeStorage(recommendationCreateDraftKey(scope), JSON.stringify(payload));
}

function parseDraftFromRaw(
  scope: RecommendationCreateDraftScope,
  raw: string,
  storageKey: string,
): RecommendationCreateDraft | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValidDraftShape(parsed)) {
      if (!draftScopeMatches(parsed, scope)) return null;
      if (Date.now() - parsed.savedAt > TTL_MS) {
        removeStorage(storageKey);
        return null;
      }
      return parsed;
    }
    if (isValidLegacyV2DraftShape(parsed)) {
      if (!draftScopeMatches(parsed, scope)) return null;
      if (Date.now() - parsed.savedAt > TTL_MS) {
        removeStorage(storageKey);
        return null;
      }
      return migrateLegacyV2Draft(parsed);
    }
    removeStorage(storageKey);
    return null;
  } catch {
    removeStorage(storageKey);
    return null;
  }
}

export function loadRecommendationCreateDraft(
  scope: RecommendationCreateDraftScope,
): RecommendationCreateDraft | null {
  if (!sessionStorageSafe()) return null;
  const v3Key = recommendationCreateDraftKey(scope);
  const v3Raw = readStorage(v3Key);
  if (v3Raw) {
    return parseDraftFromRaw(scope, v3Raw, v3Key);
  }
  const v2Key = recommendationCreateDraftKeyLegacyV2(scope);
  const v2Raw = readStorage(v2Key);
  if (!v2Raw) return null;
  return parseDraftFromRaw(scope, v2Raw, v2Key);
}

export function clearRecommendationCreateDraft(scope: RecommendationCreateDraftScope): void {
  if (!sessionStorageSafe()) return;
  removeStorage(recommendationCreateDraftKey(scope));
  removeStorage(recommendationCreateDraftKeyLegacyV2(scope));
}

/** Logout / account switch: drop all recommendation create drafts for this user. */
export function clearRecommendationCreateDraftsForUser(userId: string): void {
  const storage = sessionStorageSafe();
  if (!storage || !userId) return;
  const prefixes = [
    `rc-rec-create-v${RECOMMENDATION_CREATE_DRAFT_VERSION}:${userId}:`,
    `rc-rec-create-v${RECOMMENDATION_CREATE_DRAFT_VERSION_LEGACY}:${userId}:`,
  ];
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && prefixes.some((p) => key.startsWith(p))) keys.push(key);
    }
    for (const key of keys) removeStorage(key);
  } catch {
    // ignore
  }
}

export function reconcileRecommendationDraftWithPartners(input: {
  selectedKeys: string[];
  discountDrafts: Record<string, string>;
  selectedCategoryKeys?: Record<string, boolean>;
  partnerKeys: Set<string>;
}): {
  selectedKeys: string[];
  discountDrafts: Record<string, string>;
  selectedCategoryKeys: Record<string, boolean>;
  stalePartnerKeys: string[];
} {
  const stalePartnerKeys = input.selectedKeys.filter((k) => !input.partnerKeys.has(k));
  const selectedKeys = input.selectedKeys.filter((k) => input.partnerKeys.has(k));
  const selectedStoreIds = new Set(selectedKeys.map((k) => k.split(":")[0]).filter(Boolean));
  const discountDrafts: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.discountDrafts)) {
    const storeUserId = key.split("::")[0];
    if (storeUserId && selectedStoreIds.has(storeUserId)) {
      discountDrafts[key] = value;
    }
  }
  const selectedCategoryKeys: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(input.selectedCategoryKeys ?? {})) {
    const storeUserId = key.split("::")[0];
    if (storeUserId && selectedStoreIds.has(storeUserId)) {
      selectedCategoryKeys[key] = value;
    }
  }
  return { selectedKeys, discountDrafts, selectedCategoryKeys, stalePartnerKeys };
}
