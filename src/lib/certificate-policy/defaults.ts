import type { CertificatePolicyTerms } from "./types";

export const CERTIFICATE_POLICY_DEFAULT_VALIDITY_DAYS = 30;
export const CERTIFICATE_POLICY_DEFAULT_PURCHASE_LIMIT = 1;
export const CERTIFICATE_POLICY_MAX_VALIDITY_DAYS = 3650;
export const CERTIFICATE_POLICY_MAX_PURCHASE_LIMIT = 10_000;
export const CERTIFICATE_POLICY_MAX_EXCLUSIONS_LENGTH = 500;

export const CERTIFICATE_POLICY_MOSCOW_EXPIRY_NOTE =
  "Срок считается по календарным дням (Europe/Moscow): день выпуска — день 1, окончание — 23:59:59 последнего дня.";

export function emptyCertificatePolicyTerms(
  categoryRates: CertificatePolicyTerms["categoryRates"] = [],
): CertificatePolicyTerms {
  return {
    validityDays: CERTIFICATE_POLICY_DEFAULT_VALIDITY_DAYS,
    purchaseLimit: CERTIFICATE_POLICY_DEFAULT_PURCHASE_LIMIT,
    minimumPurchaseAmount: null,
    promotionsCompatible: false,
    exclusionsText: null,
    categoryRates,
  };
}