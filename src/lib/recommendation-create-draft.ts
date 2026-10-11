export const RECOMMENDATION_CREATE_DRAFT_VERSION = 2;
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
  return true;
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

export function loadRecommendationCreateDraft(
  scope: RecommendationCreateDraftScope,
): RecommendationCreateDraft | null {
  if (!sessionStorageSafe()) return null;
  const raw = readStorage(recommendationCreateDraftKey(scope));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidDraftShape(parsed)) {
      removeStorage(recommendationCreateDraftKey(scope));
      return null;
    }
    if (!draftScopeMatches(parsed, scope)) {
      return null;
    }
    if (Date.now() - parsed.savedAt > TTL_MS) {
      removeStorage(recommendationCreateDraftKey(scope));
      return null;
    }
    return parsed;
  } catch {
    removeStorage(recommendationCreateDraftKey(scope));
    return null;
  }
}

export function clearRecommendationCreateDraft(scope: RecommendationCreateDraftScope): void {
  if (!sessionStorageSafe()) return;
  removeStorage(recommendationCreateDraftKey(scope));
}

/** Logout / account switch: drop all recommendation create drafts for this user. */
export function clearRecommendationCreateDraftsForUser(userId: string): void {
  const storage = sessionStorageSafe();
  if (!storage || !userId) return;
  const prefix = `rc-rec-create-v${RECOMMENDATION_CREATE_DRAFT_VERSION}:${userId}:`;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) removeStorage(key);
  } catch {
    // ignore
  }
}

export function reconcileRecommendationDraftWithPartners(input: {
  selectedKeys: string[];
  discountDrafts: Record<string, string>;
  partnerKeys: Set<string>;
}): {
  selectedKeys: string[];
  discountDrafts: Record<string, string>;
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
  return { selectedKeys, discountDrafts, stalePartnerKeys };
}
