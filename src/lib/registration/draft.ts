import type { RegistrationDraft, RegistrationDraftFields, RegistrationKind } from "./types";

const STORAGE_PREFIX = "remcard.registration.draft.v1";
const OWNER_PREFIX = "remcard.registration.owner.v1";
const WIZARD_PREFIX = "remcard.registration.wizard.v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StorageBackend = Pick<Storage, "getItem" | "setItem" | "removeItem">;

let memoryStore = new Map<string, string>();
let storageWarningShown = false;

function getSessionBackend(): StorageBackend | null {
  if (typeof window === "undefined") return null;
  try {
    const probe = "__remcard_reg_probe__";
    window.sessionStorage.setItem(probe, "1");
    window.sessionStorage.removeItem(probe);
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function backendOrMemory(): StorageBackend {
  const session = getSessionBackend();
  if (session) return session;
  return {
    getItem: (key) => memoryStore.get(key) ?? null,
    setItem: (key, value) => {
      memoryStore.set(key, value);
    },
    removeItem: (key) => {
      memoryStore.delete(key);
    },
  };
}

export function registrationStorageDegraded(): boolean {
  return typeof window !== "undefined" && getSessionBackend() == null;
}

export function maybeStorageRecoveryNotice(): string | null {
  if (!registrationStorageDegraded()) return null;
  if (storageWarningShown) return null;
  storageWarningShown = true;
  return "Браузер ограничил сохранение черновика. Не закрывайте вкладку до завершения регистрации.";
}

function storageKey(kind: RegistrationKind): string {
  return `${STORAGE_PREFIX}:${kind}`;
}

function parseDraft(raw: string | null): RegistrationDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RegistrationDraft;
    if (!parsed?.kind || !parsed.fields || typeof parsed.updatedAt !== "number") {
      return null;
    }
    if (Date.now() - parsed.updatedAt > TTL_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function safeGetItem(key: string): string | null {
  try {
    return backendOrMemory().getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    backendOrMemory().setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function safeRemoveItem(key: string): void {
  try {
    backendOrMemory().removeItem(key);
  } catch {
    memoryStore.delete(key);
  }
}

export function bindRegistrationDraftOwner(userId: string | null): void {
  if (!userId) {
    safeRemoveItem(OWNER_PREFIX);
    return;
  }
  safeSetItem(OWNER_PREFIX, userId);
}

export function getRegistrationDraftOwner(): string | null {
  return safeGetItem(OWNER_PREFIX);
}

export function clearRegistrationDraftOwner(): void {
  safeRemoveItem(OWNER_PREFIX);
}

export function loadRegistrationDraft(
  kind: RegistrationKind,
  expectedOwnerId?: string | null,
): RegistrationDraft | null {
  const owner = getRegistrationDraftOwner();
  if (expectedOwnerId && owner && owner !== expectedOwnerId) {
    return null;
  }
  const parsed = parseDraft(safeGetItem(storageKey(kind)));
  if (!parsed) {
    safeRemoveItem(storageKey(kind));
    return null;
  }
  return parsed;
}

export function saveRegistrationDraft(
  kind: RegistrationKind,
  fields: RegistrationDraftFields,
  ownerUserId?: string | null,
): RegistrationDraft {
  if (ownerUserId) {
    bindRegistrationDraftOwner(ownerUserId);
  }
  const draft: RegistrationDraft = {
    kind,
    fields: { ...fields },
    updatedAt: Date.now(),
  };
  safeSetItem(storageKey(kind), JSON.stringify(draft));
  return draft;
}

export function clearRegistrationDraft(kind: RegistrationKind): void {
  safeRemoveItem(storageKey(kind));
}

export function clearAllRegistrationDrafts(): void {
  (["agent", "specialist", "store", "company", "employee"] as RegistrationKind[]).forEach(
    (kind) => clearRegistrationDraft(kind),
  );
  clearRegistrationDraftOwner();
  safeRemoveItem(WIZARD_PREFIX);
}

export function mergeRegistrationDraftFields(
  kind: RegistrationKind,
  patch: RegistrationDraftFields,
): RegistrationDraft {
  const existing = loadRegistrationDraft(kind);
  return saveRegistrationDraft(kind, { ...(existing?.fields ?? {}), ...patch });
}

/** Reject draft when bound to another authenticated subject. */
export function loadAgentDraftForUser(userId: string): RegistrationDraft | null {
  const owner = getRegistrationDraftOwner();
  if (owner && owner !== userId) {
    return null;
  }
  return loadRegistrationDraft("agent", userId);
}

export function clearDraftOnOwnerMismatch(userId: string): boolean {
  const owner = getRegistrationDraftOwner();
  if (owner && owner !== userId) {
    clearAllRegistrationDrafts();
    return true;
  }
  return false;
}

export type RegistrationWizardPersisted = {
  step: "types" | "name" | "city" | "auth";
  kind: RegistrationKind | "";
  updatedAt: number;
};

export function saveRegistrationWizardState(state: RegistrationWizardPersisted): void {
  safeSetItem(WIZARD_PREFIX, JSON.stringify({ ...state, updatedAt: Date.now() }));
}

export function loadRegistrationWizardState(): RegistrationWizardPersisted | null {
  const raw = safeGetItem(WIZARD_PREFIX);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RegistrationWizardPersisted;
    if (!parsed || typeof parsed.updatedAt !== "number") return null;
    if (Date.now() - parsed.updatedAt > TTL_MS) {
      safeRemoveItem(WIZARD_PREFIX);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildJoinHref(params: {
  role?: RegistrationKind | null;
  invite?: string | null;
  returnTo?: string | null;
}): string {
  const q = new URLSearchParams();
  if (params.role) q.set("role", params.role);
  if (params.invite) q.set("invite", params.invite);
  if (params.returnTo) q.set("returnTo", params.returnTo);
  const qs = q.toString();
  return qs ? `/join?${qs}` : "/join";
}

export function buildLegacyOnboardingLoginHref(kind: RegistrationKind): string {
  const partnerType = kind === "specialist" ? "MASTER" : kind === "store" ? "STORE" : "COMPANY";
  const returnTo = `/onboarding?partnerType=${partnerType}`;
  return `/login?returnTo=${encodeURIComponent(returnTo)}&registration=legacy`;
}

export { TTL_MS as REGISTRATION_DRAFT_TTL_MS };
