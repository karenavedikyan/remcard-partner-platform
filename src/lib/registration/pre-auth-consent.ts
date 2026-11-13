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
export const PRE_AUTH_CONSENT_CLOCK_SKEW_MS = 60_000;

export type PreAuthConsentSnapshot = {
  contractVersion: string;
  registrationKind: RegistrationKind;
  acceptedAt: number;
  expiresAt: number;
  requirements: PreAuthConsentRequirement[];
  attemptId: string;
  /** Set immediately after OTP verify, before any consent POST (prevents cross-user replay). */
  verifiedForUserId?: string;
  consumedForUserId?: string;
};

const JOIN_KINDS_WITH_PREAUTH = new Set<RegistrationKind>([
  "agent",
  "specialist",
  "store",
  "company",
]);

const memorySnapshotByKind = new Map<RegistrationKind, PreAuthConsentSnapshot>();

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

function isValidPreAuthRequirement(value: unknown): value is PreAuthConsentRequirement {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (!REGISTRATION_PRE_AUTH_CONSENT_KINDS.includes(row.kind as RegistrationPreAuthConsentKind)) {
    return false;
  }
  if (typeof row.legalDocumentId !== "string" || !row.legalDocumentId.trim()) return false;
  if (typeof row.version !== "string" || !row.version.trim()) return false;
  if (typeof row.documentUrl !== "string" || !row.documentUrl.trim()) return false;
  return true;
}

function validateSnapshotShape(
  parsed: unknown,
  expectedKind?: RegistrationKind,
): PreAuthConsentSnapshot | null {
  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Record<string, unknown>;
  if (row.contractVersion !== PRE_AUTH_CONSENT_SNAPSHOT_CONTRACT) return null;
  const registrationKind = row.registrationKind;
  if (
    typeof registrationKind !== "string" ||
    !JOIN_KINDS_WITH_PREAUTH.has(registrationKind as RegistrationKind)
  ) {
    return null;
  }
  if (expectedKind && registrationKind !== expectedKind) return null;
  if (typeof row.attemptId !== "string" || !row.attemptId.trim()) return null;
  const acceptedAt = row.acceptedAt;
  const expiresAt = row.expiresAt;
  if (typeof acceptedAt !== "number" || !Number.isFinite(acceptedAt)) return null;
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return null;
  const now = Date.now();
  if (acceptedAt > now + PRE_AUTH_CONSENT_CLOCK_SKEW_MS) return null;
  if (expiresAt <= acceptedAt) return null;
  if (now > expiresAt) return null;
  if (expiresAt - acceptedAt > PRE_AUTH_CONSENT_TTL_MS + PRE_AUTH_CONSENT_CLOCK_SKEW_MS) {
    return null;
  }
  if (acceptedAt < now - PRE_AUTH_CONSENT_TTL_MS - PRE_AUTH_CONSENT_CLOCK_SKEW_MS) {
    return null;
  }
  if (!Array.isArray(row.requirements)) return null;
  if (row.requirements.length !== REGISTRATION_PRE_AUTH_CONSENT_KINDS.length) return null;
  const kinds = new Set<string>();
  for (const req of row.requirements) {
    if (!isValidPreAuthRequirement(req)) return null;
    if (kinds.has(req.kind)) return null;
    kinds.add(req.kind);
  }
  for (const kind of REGISTRATION_PRE_AUTH_CONSENT_KINDS) {
    if (!kinds.has(kind)) return null;
  }
  const verifiedForUserId = row.verifiedForUserId;
  const consumedForUserId = row.consumedForUserId;
  if (verifiedForUserId != null && (typeof verifiedForUserId !== "string" || !verifiedForUserId.trim())) {
    return null;
  }
  if (consumedForUserId != null && (typeof consumedForUserId !== "string" || !consumedForUserId.trim())) {
    return null;
  }
  return {
    contractVersion: PRE_AUTH_CONSENT_SNAPSHOT_CONTRACT,
    registrationKind: registrationKind as RegistrationKind,
    acceptedAt,
    expiresAt,
    requirements: row.requirements,
    attemptId: row.attemptId.trim(),
    verifiedForUserId: typeof verifiedForUserId === "string" ? verifiedForUserId.trim() : undefined,
    consumedForUserId: typeof consumedForUserId === "string" ? consumedForUserId.trim() : undefined,
  };
}

function parseSnapshot(raw: string | null, kind?: RegistrationKind): PreAuthConsentSnapshot | null {
  if (!raw) return null;
  try {
    const validated = validateSnapshotShape(JSON.parse(raw), kind);
    if (!validated) {
      if (kind) removeSessionStorage(snapshotKey(kind));
      return null;
    }
    return validated;
  } catch {
    if (kind) removeSessionStorage(snapshotKey(kind));
    return null;
  }
}

export function loadPreAuthConsentSnapshot(kind: RegistrationKind): PreAuthConsentSnapshot | null {
  purgeLegacyBooleanAck(kind);
  const fromSession = parseSnapshot(readSessionStorage(snapshotKey(kind)), kind);
  if (fromSession) {
    memorySnapshotByKind.delete(kind);
    return fromSession;
  }
  const fromMemory = memorySnapshotByKind.get(kind);
  if (fromMemory && fromMemory.registrationKind === kind) {
    const validated = validateSnapshotShape(fromMemory, kind);
    if (validated) return validated;
    memorySnapshotByKind.delete(kind);
  }
  return null;
}

export function savePreAuthConsentSnapshot(
  kind: RegistrationKind,
  requirements: PreAuthConsentRequirement[],
  attemptId: string,
): boolean {
  purgeLegacyBooleanAck(kind);
  if (!JOIN_KINDS_WITH_PREAUTH.has(kind)) return false;
  const snapshot: PreAuthConsentSnapshot = {
    contractVersion: PRE_AUTH_CONSENT_SNAPSHOT_CONTRACT,
    registrationKind: kind,
    acceptedAt: Date.now(),
    expiresAt: Date.now() + PRE_AUTH_CONSENT_TTL_MS,
    requirements,
    attemptId,
  };
  const validated = validateSnapshotShape(snapshot, kind);
  if (!validated) return false;
  const persisted = writeSessionStorage(snapshotKey(kind), JSON.stringify(validated));
  if (persisted) {
    memorySnapshotByKind.delete(kind);
    return true;
  }
  return false;
}

export function clearPreAuthConsentSnapshot(kind: RegistrationKind): void {
  removeSessionStorage(snapshotKey(kind));
  removeSessionStorage(handoffKey(kind));
  purgeLegacyBooleanAck(kind);
  memorySnapshotByKind.delete(kind);
}

/** @deprecated Use clearPreAuthConsentSnapshot */
export const clearPreAuthConsentAck = clearPreAuthConsentSnapshot;

export function clearAllPreAuthConsentAcks(): void {
  for (const kind of JOIN_KINDS_WITH_PREAUTH) {
    clearPreAuthConsentSnapshot(kind);
  }
  memorySnapshotByKind.clear();
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

export function isPreAuthHandoffPendingForUser(kind: RegistrationKind, userId: string): boolean {
  if (!userId) return false;
  const snapshot = loadPreAuthConsentSnapshot(kind);
  if (!snapshot?.verifiedForUserId || snapshot.verifiedForUserId !== userId) return false;
  return isPreAuthHandoffPending(kind);
}

export function bindPreAuthSnapshotToVerifiedUser(kind: RegistrationKind, userId: string): boolean {
  if (!userId) return false;
  const snapshot = loadPreAuthConsentSnapshot(kind);
  if (!snapshot || snapshot.consumedForUserId) return false;
  if (snapshot.verifiedForUserId && snapshot.verifiedForUserId !== userId) {
    clearPreAuthConsentSnapshot(kind);
    return false;
  }
  if (snapshot.verifiedForUserId === userId) return true;
  const next: PreAuthConsentSnapshot = { ...snapshot, verifiedForUserId: userId };
  const persisted = writeSessionStorage(snapshotKey(kind), JSON.stringify(next));
  if (!persisted) return false;
  memorySnapshotByKind.delete(kind);
  return true;
}

export function assertPreAuthSnapshotUser(kind: RegistrationKind, userId: string): "ok" | "missing" | "different" {
  const snapshot = loadPreAuthConsentSnapshot(kind);
  if (!snapshot) return "missing";
  if (!snapshot.verifiedForUserId) return "missing";
  if (snapshot.verifiedForUserId !== userId) return "different";
  return "ok";
}

/** Drop unconsumed snapshots when an unrelated session resumes (no fresh verify). */
export function discardStalePreAuthSnapshotOnSessionResume(kind: RegistrationKind): void {
  const snapshot = loadPreAuthConsentSnapshot(kind);
  if (!snapshot) return;
  if (snapshot.consumedForUserId) return;
  if (snapshot.verifiedForUserId) return;
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
  if (!snapshot) return;
  const owner = snapshot.verifiedForUserId ?? snapshot.consumedForUserId;
  if (owner && owner !== userId) {
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
