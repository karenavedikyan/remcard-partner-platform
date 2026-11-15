import {
  CERTIFICATE_POLICY_MAX_EXCLUSIONS_LENGTH,
  CERTIFICATE_POLICY_MAX_PURCHASE_LIMIT,
  CERTIFICATE_POLICY_MAX_VALIDITY_DAYS,
} from "./defaults";
import type { CertificatePolicyTerms } from "./types";
import { certificatePolicyTermsEqual } from "./diff";

export type CertificatePolicyValidationResult =
  | { ok: true; terms: CertificatePolicyTerms }
  | { ok: false; message: string };

export function parseCertificatePolicyTermsInput(
  raw: CertificatePolicyTerms,
  baseline?: CertificatePolicyTerms,
): CertificatePolicyValidationResult {
  const days = raw.validityDays;
  const limit = raw.purchaseLimit;
  const minimum = raw.minimumPurchaseAmount;
  const exclusions = raw.exclusionsText?.trim() ?? "";

  if (
    !Number.isSafeInteger(days) ||
    days < 1 ||
    days > CERTIFICATE_POLICY_MAX_VALIDITY_DAYS
  ) {
    return {
      ok: false,
      message: `Срок: от 1 до ${CERTIFICATE_POLICY_MAX_VALIDITY_DAYS} календарных дней.`,
    };
  }
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > CERTIFICATE_POLICY_MAX_PURCHASE_LIMIT
  ) {
    return {
      ok: false,
      message: `Покупок: от 1 до ${CERTIFICATE_POLICY_MAX_PURCHASE_LIMIT}.`,
    };
  }
  if (
    minimum != null &&
    (!Number.isSafeInteger(minimum) || minimum < 0)
  ) {
    return { ok: false, message: "Минимальная сумма: целое число ≥ 0." };
  }

  const canonical = baseline?.categoryRates ?? raw.categoryRates;
  const formByCategory = new Map(raw.categoryRates.map((r) => [r.category, r]));
  const seen = new Set<string>();
  const rates: CertificatePolicyTerms["categoryRates"] = [];

  for (const base of canonical) {
    if (seen.has(base.category)) {
      return { ok: false, message: "Дублирующиеся категории в ответе сервера." };
    }
    seen.add(base.category);
    const fromForm = formByCategory.get(base.category);
    const pool = fromForm?.poolPercent ?? base.poolPercent;
    if (!Number.isFinite(pool) || pool < 0 || pool > 100) {
      return { ok: false, message: "Проценты по категориям: 0–100, шаг 0,1%." };
    }
    if (Math.abs(pool * 10 - Math.round(pool * 10)) > 1e-8) {
      return { ok: false, message: "Проценты по категориям: 0–100, шаг 0,1%." };
    }
    rates.push({
      category: base.category,
      categoryLabel: base.categoryLabel,
      poolPercent: pool,
    });
  }

  for (const extra of raw.categoryRates) {
    if (!seen.has(extra.category)) {
      return { ok: false, message: "Неизвестная категория в черновике." };
    }
  }

  if (exclusions.length > CERTIFICATE_POLICY_MAX_EXCLUSIONS_LENGTH) {
    return {
      ok: false,
      message: `Исключения: не более ${CERTIFICATE_POLICY_MAX_EXCLUSIONS_LENGTH} символов.`,
    };
  }

  const terms: CertificatePolicyTerms = {
    validityDays: days,
    purchaseLimit: limit,
    minimumPurchaseAmount: minimum != null && minimum > 0 ? minimum : null,
    promotionsCompatible: raw.promotionsCompatible,
    exclusionsText: exclusions.length > 0 ? exclusions : null,
    categoryRates: rates as CertificatePolicyTerms["categoryRates"],
  };

  return { ok: true, terms };
}

export function rejectNoOpIndividualProposal(
  effective: CertificatePolicyTerms,
  proposed: CertificatePolicyTerms,
): string | null {
  if (certificatePolicyTermsEqual(effective, proposed)) {
    return "Нет отличий от действующих условий.";
  }
  return null;
}