export type RequiredLoginConsents = {
  personalData: boolean;
  terms: boolean;
};

export const EMPTY_LOGIN_CONSENTS: RequiredLoginConsents = {
  personalData: false,
  terms: false,
};

export function validateRequiredLoginConsents(consents: RequiredLoginConsents): string | null {
  if (!consents.personalData || !consents.terms) {
    return "Примите обязательные соглашения, чтобы продолжить.";
  }
  return null;
}

const CONSENT_KINDS = ["PERSONAL_DATA", "TERMS"] as const;

/** Persist mandatory consents after verify-code session is established. */
export async function recordRequiredLoginConsents(
  fetchConsent: (kind: string) => Promise<void>,
): Promise<void> {
  for (const kind of CONSENT_KINDS) {
    await fetchConsent(kind);
  }
}
