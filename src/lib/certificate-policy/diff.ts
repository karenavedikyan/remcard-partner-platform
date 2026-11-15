import type { CertificatePolicyTerms } from "./types";
import {
  certificatePolicyDaysWord,
  certificatePolicyLimitsSummary,
  certificatePolicyRubles,
} from "./format";

export type CertificatePolicyDiffRow = {
  label: string;
  current: string;
  next: string;
};

export function certificatePolicyTermsEqual(
  a: CertificatePolicyTerms,
  b: CertificatePolicyTerms,
): boolean {
  if (
    a.validityDays !== b.validityDays ||
    a.purchaseLimit !== b.purchaseLimit ||
    a.promotionsCompatible !== b.promotionsCompatible ||
    (a.minimumPurchaseAmount ?? null) !== (b.minimumPurchaseAmount ?? null) ||
    (a.exclusionsText ?? "") !== (b.exclusionsText ?? "")
  ) {
    return false;
  }
  if (a.categoryRates.length !== b.categoryRates.length) return false;
  for (let i = 0; i < a.categoryRates.length; i += 1) {
    const left = a.categoryRates[i];
    const right = b.categoryRates[i];
    if (
      left.category !== right.category ||
      left.poolPercent !== right.poolPercent
    ) {
      return false;
    }
  }
  return true;
}

export function buildCertificatePolicyDiffRows(
  current: CertificatePolicyTerms,
  next: CertificatePolicyTerms,
): CertificatePolicyDiffRow[] {
  const rows: CertificatePolicyDiffRow[] = [];
  const push = (label: string, a: string, b: string) => {
    if (a !== b) rows.push({ label, current: a, next: b });
  };

  push(
    "Срок",
    `${current.validityDays} ${certificatePolicyDaysWord(current.validityDays)}`,
    `${next.validityDays} ${certificatePolicyDaysWord(next.validityDays)}`,
  );
  push("Покупок", String(current.purchaseLimit), String(next.purchaseLimit));

  const len = Math.max(current.categoryRates.length, next.categoryRates.length);
  for (let i = 0; i < len; i += 1) {
    const cur = current.categoryRates[i];
    const nxt = next.categoryRates[i];
    const label = nxt?.categoryLabel ?? cur?.categoryLabel ?? "Категория";
    push(
      label,
      cur ? `${cur.poolPercent}%` : "—",
      nxt ? `${nxt.poolPercent}%` : "—",
    );
  }

  push(
    "Покупка от",
    current.minimumPurchaseAmount
      ? certificatePolicyRubles(current.minimumPurchaseAmount)
      : "нет",
    next.minimumPurchaseAmount
      ? certificatePolicyRubles(next.minimumPurchaseAmount)
      : "нет",
  );
  push(
    "Другие скидки",
    current.promotionsCompatible ? "суммируется" : "не суммируется",
    next.promotionsCompatible ? "суммируется" : "не суммируется",
  );
  push("Исключения", current.exclusionsText || "нет", next.exclusionsText || "нет");

  return rows;
}