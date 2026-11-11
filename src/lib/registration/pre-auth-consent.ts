import type { RegistrationKind } from "./types";

/** Local intent only — not legal account consent and not sent to the API before identity. */
export const REGISTRATION_PRE_AUTH_CONSENT_KINDS = [
  "PERSONAL_DATA",
  "TERMS",
  "PUBLIC_OFFER_PRO",
] as const;

export type RegistrationPreAuthConsentKind =
  (typeof REGISTRATION_PRE_AUTH_CONSENT_KINDS)[number];

const ACK_PREFIX = "remcard.registration.preAuthConsent.v1";

function storageKey(kind: RegistrationKind): string {
  return `${ACK_PREFIX}:${kind}`;
}

export function loadPreAuthConsentAck(kind: RegistrationKind): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(storageKey(kind)) === "1";
  } catch {
    return false;
  }
}

export function savePreAuthConsentAck(kind: RegistrationKind): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(kind), "1");
  } catch {
    // ignore — UI gate still applies in-memory for the session
  }
}

export function clearPreAuthConsentAck(kind: RegistrationKind): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(kind));
  } catch {
    // ignore
  }
}

export function preAuthDocumentHref(legalBase: string, kind: RegistrationPreAuthConsentKind): string {
  if (kind === "PERSONAL_DATA") return `${legalBase}/privacy`;
  if (kind === "TERMS") return `${legalBase}/terms`;
  return `${legalBase}/legal/public-offer-pro`;
}
