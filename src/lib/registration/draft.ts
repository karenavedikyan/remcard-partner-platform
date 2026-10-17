import type { RegistrationDraft, RegistrationDraftFields, RegistrationKind } from "./types";

const STORAGE_PREFIX = "remcard.registration.draft.v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function storageKey(kind: RegistrationKind): string {
  return `${STORAGE_PREFIX}:${kind}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
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

export function loadRegistrationDraft(kind: RegistrationKind): RegistrationDraft | null {
  if (!isBrowser()) return null;
  const parsed = parseDraft(sessionStorage.getItem(storageKey(kind)));
  if (!parsed) {
    sessionStorage.removeItem(storageKey(kind));
    return null;
  }
  return parsed;
}

export function saveRegistrationDraft(
  kind: RegistrationKind,
  fields: RegistrationDraftFields,
): RegistrationDraft {
  const draft: RegistrationDraft = {
    kind,
    fields: { ...fields },
    updatedAt: Date.now(),
  };
  if (isBrowser()) {
    sessionStorage.setItem(storageKey(kind), JSON.stringify(draft));
  }
  return draft;
}

export function clearRegistrationDraft(kind: RegistrationKind): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(storageKey(kind));
}

export function mergeRegistrationDraftFields(
  kind: RegistrationKind,
  patch: RegistrationDraftFields,
): RegistrationDraft {
  const existing = loadRegistrationDraft(kind);
  return saveRegistrationDraft(kind, { ...(existing?.fields ?? {}), ...patch });
}

export { TTL_MS as REGISTRATION_DRAFT_TTL_MS };
