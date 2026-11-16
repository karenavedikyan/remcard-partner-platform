import { displayCategoryLabel } from "@/lib/category-display";
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
  const right = new Map(b.categoryRates.map((rate) => [rate.category, rate.poolPercent]));
  if (right.size !== b.categoryRates.length) return false;
  for (const left of a.categoryRates) {
    if (!right.has(left.category) || right.get(left.category) !== left.poolPercent) return false;
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

  const nextByKey = new Map(next.categoryRates.map((rate) => [rate.category, rate]));
  const currentKeys = new Set(current.categoryRates.map((rate) => rate.category));
  for (const cur of current.categoryRates) {
    const nxt = nextByKey.get(cur.category);
    push(
      displayCategoryLabel(cur.category, nxt?.categoryLabel ?? cur.categoryLabel),
      `${cur.poolPercent}%`,
      nxt ? `${nxt.poolPercent}%` : "—",
    );
  }
  for (const nxt of next.categoryRates) {
    if (currentKeys.has(nxt.category)) continue;
    push(displayCategoryLabel(nxt.category, nxt.categoryLabel), "—", `${nxt.poolPercent}%`);
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