import type { MiniAppPlatform } from "@/lib/mini-app/types";

export const MINI_CERTIFICATE_CREATE_DRAFT_VERSION = 1;
const TTL_MS = 24 * 60 * 60 * 1000;

export type MiniCertificateCreateDraftScope = {
  actorUserId: string;
  platform: MiniAppPlatform;
  branchId: string | null;
};

export type MiniCertificateCreateDraft = {
  v: number;
  actorUserId: string;
  platform: MiniAppPlatform;
  branchId: string | null;
  savedAt: number;
  wizardStep: 1 | 2;
  selectedKeys: string[];
  discountDrafts: Record<string, string>;
  selectedCategoryKeys: Record<string, boolean>;
  partnerSearchQuery: string;
  clientId: string;
};

export type MiniCertificateCreateDraftPayload = Omit<
  MiniCertificateCreateDraft,
  "v" | "actorUserId" | "platform" | "branchId" | "savedAt"
>;

function scopeKey(scope: MiniCertificateCreateDraftScope): string {
  const branch = scope.branchId?.trim() || "_";
  return `${scope.actorUserId}:${scope.platform}:${branch}`;
}

export function serializeMiniCertificateCreateDraftScope(scope: MiniCertificateCreateDraftScope): string {
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

function draftKey(scope: MiniCertificateCreateDraftScope): string {
  return `rc-mini-cert-create-v${MINI_CERTIFICATE_CREATE_DRAFT_VERSION}:${scopeKey(scope)}`;
}

function scopeMatches(parsed: MiniCertificateCreateDraft, scope: MiniCertificateCreateDraftScope): boolean {
  return (
    parsed.actorUserId === scope.actorUserId &&
    parsed.platform === scope.platform &&
    (parsed.branchId ?? null) === (scope.branchId ?? null)
  );
}

export function loadMiniCertificateCreateDraft(
  scope: MiniCertificateCreateDraftScope,
): MiniCertificateCreateDraftPayload | null {
  const storage = sessionStorageSafe();
  if (!storage) return null;
  const raw = storage.getItem(draftKey(scope));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MiniCertificateCreateDraft;
    if (parsed.v !== MINI_CERTIFICATE_CREATE_DRAFT_VERSION) return null;
    if (!scopeMatches(parsed, scope)) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      storage.removeItem(draftKey(scope));
      return null;
    }
    return {
      wizardStep: parsed.wizardStep === 2 ? 2 : 1,
      selectedKeys: Array.isArray(parsed.selectedKeys) ? parsed.selectedKeys : [],
      discountDrafts:
        parsed.discountDrafts && typeof parsed.discountDrafts === "object" ? parsed.discountDrafts : {},
      selectedCategoryKeys:
        parsed.selectedCategoryKeys && typeof parsed.selectedCategoryKeys === "object"
          ? parsed.selectedCategoryKeys
          : {},
      partnerSearchQuery: typeof parsed.partnerSearchQuery === "string" ? parsed.partnerSearchQuery : "",
      clientId: typeof parsed.clientId === "string" ? parsed.clientId : "",
    };
  } catch {
    return null;
  }
}

export function saveMiniCertificateCreateDraft(
  scope: MiniCertificateCreateDraftScope,
  payload: MiniCertificateCreateDraftPayload,
): void {
  const storage = sessionStorageSafe();
  if (!storage) return;
  const record: MiniCertificateCreateDraft = {
    v: MINI_CERTIFICATE_CREATE_DRAFT_VERSION,
    actorUserId: scope.actorUserId,
    platform: scope.platform,
    branchId: scope.branchId,
    savedAt: Date.now(),
    wizardStep: payload.wizardStep,
    selectedKeys: payload.selectedKeys,
    discountDrafts: payload.discountDrafts,
    selectedCategoryKeys: payload.selectedCategoryKeys,
    partnerSearchQuery: payload.partnerSearchQuery,
    clientId: payload.clientId,
  };
  storage.setItem(draftKey(scope), JSON.stringify(record));
}

export function clearMiniCertificateCreateDraft(scope: MiniCertificateCreateDraftScope): void {
  const storage = sessionStorageSafe();
  if (!storage) return;
  storage.removeItem(draftKey(scope));
}

export function reconcileMiniCertificateDraftPartnerKeys(input: {
  selectedKeys: string[];
  discountDrafts: Record<string, string>;
  selectedCategoryKeys: Record<string, boolean>;
  partnerKeys: Set<string>;
  categoryKeys: Set<string>;
}): {
  selectedKeys: string[];
  discountDrafts: Record<string, string>;
  selectedCategoryKeys: Record<string, boolean>;
  stalePartnerKeys: string[];
} {
  const selectedKeys = input.selectedKeys.filter((k) => input.partnerKeys.has(k));
  const stalePartnerKeys = input.selectedKeys.filter((k) => !input.partnerKeys.has(k));
  const discountDrafts: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.discountDrafts)) {
    if (input.categoryKeys.has(key)) discountDrafts[key] = value;
  }
  const nextCategoryKeys: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(input.selectedCategoryKeys)) {
    if (input.categoryKeys.has(key)) nextCategoryKeys[key] = value;
  }
  return {
    selectedKeys,
    discountDrafts,
    selectedCategoryKeys: nextCategoryKeys,
    stalePartnerKeys,
  };
}