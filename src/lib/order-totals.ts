import type { PreviewCategory } from "@/lib/order-types";

export type CategoryAmountDraft = Record<string, string>;

export type OrderTotals = {
  totalAmount: number;
  totalDiscount: number;
  totalIssuerBonus: number;
  payableAmount: number;
};

/**
 * Client-side preview of purchase totals. Server recalculates on POST /api/store/order.
 * Amounts are gross purchase sums in rubles (before discount), integer rounding per line.
 */
export function computeOrderTotals(
  categories: PreviewCategory[],
  amountDrafts: CategoryAmountDraft,
): OrderTotals {
  let totalAmount = 0;
  let totalDiscount = 0;
  let totalIssuerBonus = 0;

  for (const category of categories) {
    const raw = amountDrafts[category.category]?.trim() ?? "";
    if (!raw) {
      continue;
    }
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      continue;
    }
    totalAmount += amount;
    totalDiscount += Math.round((amount * category.discountPercent) / 100);
    totalIssuerBonus += Math.round((amount * category.issuerPercent) / 100);
  }

  return {
    totalAmount,
    totalDiscount,
    totalIssuerBonus,
    payableAmount: totalAmount - totalDiscount,
  };
}

export function buildOrderItems(
  categories: PreviewCategory[],
  amountDrafts: CategoryAmountDraft,
): Array<{ category: string; categoryLabel: string; amount: number }> {
  return categories
    .map((category) => {
      const raw = amountDrafts[category.category]?.trim() ?? "";
      const amount = Number(raw);
      return {
        category: category.category,
        categoryLabel: category.categoryLabel,
        amount,
      };
    })
    .filter((item) => Number.isFinite(item.amount) && item.amount > 0);
}

export function validateOrderAmounts(
  categories: PreviewCategory[],
  amountDrafts: CategoryAmountDraft,
): { ok: true } | { ok: false; message: string } {
  if (categories.length === 0) {
    return { ok: false, message: "Нет доступных категорий" };
  }

  let hasPositive = false;
  for (const category of categories) {
    const raw = amountDrafts[category.category]?.trim() ?? "";
    if (!raw) {
      continue;
    }
    const amount = Number(raw);
    if (!Number.isFinite(amount)) {
      return { ok: false, message: `Некорректная сумма для ${category.categoryLabel}` };
    }
    if (amount < 0) {
      return { ok: false, message: "Сумма не может быть отрицательной" };
    }
    if (amount > 0) {
      hasPositive = true;
    }
  }

  if (!hasPositive) {
    return { ok: false, message: "Укажите сумму покупки хотя бы по одной категории" };
  }

  return { ok: true };
}
