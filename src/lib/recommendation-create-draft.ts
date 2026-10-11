export const RECOMMENDATION_CREATE_DRAFT_VERSION = 1;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type RecommendationCreateDraft = {
  v: number;
  userId: string;
  savedAt: number;
  selectedKeys: string[];
  discountDrafts: Record<string, string>;
  validityPreset: string;
};

export function recommendationCreateDraftKey(userId: string): string {
  return `rc-rec-create-v${RECOMMENDATION_CREATE_DRAFT_VERSION}:${userId}`;
}

export function saveRecommendationCreateDraft(userId: string, draft: Omit<RecommendationCreateDraft, "v" | "userId" | "savedAt">): void {
  if (typeof sessionStorage === "undefined") return;
  const payload: RecommendationCreateDraft = {
    v: RECOMMENDATION_CREATE_DRAFT_VERSION,
    userId,
    savedAt: Date.now(),
    ...draft,
  };
  sessionStorage.setItem(recommendationCreateDraftKey(userId), JSON.stringify(payload));
}

export function loadRecommendationCreateDraft(userId: string): RecommendationCreateDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(recommendationCreateDraftKey(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RecommendationCreateDraft;
    if (parsed.v !== RECOMMENDATION_CREATE_DRAFT_VERSION) return null;
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRecommendationCreateDraft(userId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(recommendationCreateDraftKey(userId));
}
