import type {
  PreAuthConsentRequirement,
  PreAuthConsentsCapability,
  RegistrationKind,
  RegistrationPreAuthConsentKind,
} from "./types";

export const REGISTRATION_PRE_AUTH_CONSENT_KINDS = [
  "PERSONAL_DATA",
  "TERMS",
  "PUBLIC_OFFER_PRO",
] as const satisfies readonly RegistrationPreAuthConsentKind[];

export type { RegistrationPreAuthConsentKind };

export const PRE_AUTH_CONSENT_SNAPSHOT_CONTRACT = "2026-11-13.pre-auth-consent.v1";
export const PRE_AUTH_CONSENT_TTL_MS = 30 * 60 * 1000;

export type PreAuthConsentSnapshot = {
  contractVersion: string;
  registrationKind: RegistrationKind;
  acceptedAt: number;
  expiresAt: number;
  requirements: PreAuthConsentRequirement[];
  attemptId: string;
  consumedForUserId?: string;
};

const SNAPSHOT_PREFIX = "remcard.registration.preAuthConsent.snapshot.v2";
const HANDOFF_PREFIX = "remcard.registration.preAuthConsent.handoff.v1";
const LEGACY_ACK_PREFIX = "remcard.registration.preAuthConsent.v1";

function snapshotKey(kind: RegistrationKind): string {
  return `${SNAPSHOT_PREFIX}:${kind}`;
}

function handoffKey(kind: RegistrationKind): string {
  return `${HANDOFF_PREFIX}:${kind}`;
}

function legacyAckKey(kind: RegistrationKind): string {
  return `${LEGACY_ACK_PREFIX}:${kind}`;
}

function readSessionStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeSessionStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function purgeLegacyBooleanAck(kind: RegistrationKind): void {
  if (readSessionStorage(legacyAckKey(kind)) === "1") {
    removeSessionStorage(legacyAckKey(kind));
  }
}

export function createPreAuthAttemptId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseSnapshot(raw: string | null): PreAuthConsentSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PreAuthConsentSnapshot;
    if (
      parsed?.contractVersion !== PRE_AUTH_CONSENT_SNAPSHOT_CONTRACT ||
      !parsed.registrationKind ||
      !Array.isArray(parsed.requirements) ||
      typeof parsed.acceptedAt !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.attemptId !== "string"
    ) {
      return null;
    }
    if (Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadPreAuthConsentSnapshot(kind: RegistrationKind): PreAuthConsentSnapshot | null {
  purgeLegacyBooleanAck(kind);
  return parseSnapshot(readSessionStorage(snapshotKey(kind)));
}

export function savePreAuthConsentSnapshot(
  kind: RegistrationKind,
  requirements: PreAuthConsentRequirement[],
  attemptId: string,
): boolean {
  purgeLegacyBooleanAck(kind);
  const snapshot: PreAuthConsentSnapshot = {
    contractVersion: PRE_AUTH_CONSENT_SNAPSHOT_CONTRACT,
    registrationKind: kind,
    acceptedAt: Date.now(),
    expiresAt: Date.now() + PRE_AUTH_CONSENT_TTL_MS,
    requirements,
    attemptId,
  };
  return writeSessionStorage(snapshotKey(kind), JSON.stringify(snapshot));
}

export function clearPreAuthConsentSnapshot(kind: RegistrationKind): void {
  removeSessionStorage(snapshotKey(kind));
  removeSessionStorage(handoffKey(kind));
  purgeLegacyBooleanAck(kind);
}

/** @deprecated Use clearPreAuthConsentSnapshot */
export const clearPreAuthConsentAck = clearPreAuthConsentSnapshot;

const JOIN_KINDS_WITH_SNAPSHOT: RegistrationKind[] = [
  "agent",
  "specialist",
  "store",
  "company",
];

export function clearAllPreAuthConsentAcks(): void {
  for (const kind of JOIN_KINDS_WITH_SNAPSHOT) {
    clearPreAuthConsentSnapshot(kind);
  }
}

export function snapshotMatchesCapability(
  snapshot: PreAuthConsentSnapshot,
  capability: PreAuthConsentsCapability,
): boolean {
  if (!capability.available || capability.requirements.length === 0) return false;
  if (snapshot.contractVersion !== capability.contractVersion) return false;
  return capability.requirements.every((req) =>
    snapshot.requirements.some(
      (saved) =>
        saved.kind === req.kind &&
        saved.legalDocumentId === req.legalDocumentId &&
        saved.version === req.version,
    ),
  );
}

export function isPreAuthMessengerGateReady(
  kind: RegistrationKind,
  capability: PreAuthConsentsCapability | null | undefined,
): boolean {
  const snapshot = loadPreAuthConsentSnapshot(kind);
  if (!snapshot || snapshot.consumedForUserId) return false;
  if (!capability?.available) return false;
  return snapshotMatchesCapability(snapshot, capability);
}

export function loadPreAuthConsentAck(
  kind: RegistrationKind,
  capability?: PreAuthConsentsCapability | null,
): boolean {
  if (capability) {
    return isPreAuthMessengerGateReady(kind, capability);
  }
  const snapshot = loadPreAuthConsentSnapshot(kind);
  return snapshot != null && !snapshot.consumedForUserId;
}

export function markPreAuthHandoffPending(kind: RegistrationKind, attemptId: string): void {
  writeSessionStorage(handoffKey(kind), attemptId);
}

export function clearPreAuthHandoffPending(kind: RegistrationKind): void {
  removeSessionStorage(handoffKey(kind));
}

export function isPreAuthHandoffPending(kind: RegistrationKind): boolean {
  const snapshot = loadPreAuthConsentSnapshot(kind);
  const pendingAttempt = readSessionStorage(handoffKey(kind));
  if (!snapshot || !pendingAttempt) return false;
  return pendingAttempt === snapshot.attemptId;
}

/** Drop unconsumed snapshots when an unrelated session resumes (no fresh verify). */
export function discardStalePreAuthSnapshotOnSessionResume(kind: RegistrationKind): void {
  const snapshot = loadPreAuthConsentSnapshot(kind);
  if (!snapshot) return;
  if (snapshot.consumedForUserId) return;
  if (isPreAuthHandoffPending(kind)) return;
  clearPreAuthConsentSnapshot(kind);
}

export function markPreAuthSnapshotConsumed(kind: RegistrationKind, userId: string): void {
  const snapshot = loadPreAuthConsentSnapshot(kind);
  if (!snapshot) return;
  const next: PreAuthConsentSnapshot = { ...snapshot, consumedForUserId: userId };
  writeSessionStorage(snapshotKey(kind), JSON.stringify(next));
  clearPreAuthHandoffPending(kind);
}

export function clearPreAuthSnapshotForDifferentUser(kind: RegistrationKind, userId: string): void {
  const snapshot = loadPreAuthConsentSnapshot(kind);
  if (!snapshot?.consumedForUserId) return;
  if (snapshot.consumedForUserId !== userId) {
    clearPreAuthConsentSnapshot(kind);
  }
}

export function preAuthDocumentHref(
  legalBase: string,
  kind: RegistrationPreAuthConsentKind,
  requirement?: PreAuthConsentRequirement,
): string {
  if (requirement?.documentUrl) {
    if (requirement.documentUrl.startsWith("http")) return requirement.documentUrl;
    const path = requirement.documentUrl.startsWith("/")
      ? requirement.documentUrl
      : `/${requirement.documentUrl}`;
    return `${legalBase.replace(/\/$/, "")}${path}`;
  }
  if (kind === "PERSONAL_DATA") return `${legalBase}/privacy`;
  if (kind === "TERMS") return `${legalBase}/terms`;
  return `${legalBase}/legal/public-offer-pro`;
}
