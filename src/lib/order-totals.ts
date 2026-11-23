import type { PreviewCategory } from "@/lib/order-types";

export type CategoryAmountDraft = Record<string, string>;
export type CategoryDiscountDraft = Record<string, string>;

export type OrderTotals = {
  totalAmount: number;
  totalDiscount: number;
  totalIssuerBonus: number;
  payableAmount: number;
};

/** Per-line client discount in whole rubles (must match server preview rounding). */
export function lineDiscountRub(amount: number, discountPercent: number): number {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(discountPercent)) {
    return 0;
  }
  return Math.round((amount * discountPercent) / 100);
}

function previewPoolPercent(category: PreviewCategory): number {
  return category.discountPercent + category.issuerPercent;
}

export function hasExplicitClientDiscountDraft(
  category: PreviewCategory,
  discountDrafts?: CategoryDiscountDraft,
): boolean {
  const raw = discountDrafts?.[category.category];
  return raw !== undefined && raw.trim() !== "";
}

/** Call only after `validateOrderDiscountDrafts` passes for active lines. */
export function appliedClientDiscountPercent(
  category: PreviewCategory,
  discountDrafts?: CategoryDiscountDraft,
): number {
  const raw = discountDrafts?.[category.category]?.trim();
  if (!raw) return category.discountPercent;
  return Number(raw);
}

export const CLIENT_DISCOUNT_POOL_TOLERANCE_PP = 0.01;

export function categoryPoolPercent(category: PreviewCategory): number {
  return previewPoolPercent(category);
}

export function validateOrderDiscountDrafts(
  categories: PreviewCategory[],
  amountDrafts: CategoryAmountDraft,
  discountDrafts?: CategoryDiscountDraft,
): { ok: true } | { ok: false; message: string } {
  for (const category of categories) {
    const amountRaw = amountDrafts[category.category]?.trim() ?? "";
    if (!amountRaw) continue;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const pool = categoryPoolPercent(category);
    const explicit = hasExplicitClientDiscountDraft(category, discountDrafts);
    const parsed = explicit
      ? Number(discountDrafts![category.category]!.trim())
      : category.discountPercent;
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      return {
        ok: false,
        message: `Некорректная скидка клиенту для ${category.categoryLabel} (укажите 0–100%)`,
      };
    }
    if (parsed - pool > CLIENT_DISCOUNT_POOL_TOLERANCE_PP - 1e-9) {
      return {
        ok: false,
        message: `Скидка ${parsed}% по «${category.categoryLabel}» превышает максимум по категории: ${pool}%`,
      };
    }
  }
  return { ok: true };
}

function previewIssuerPercent(category: PreviewCategory, appliedDiscount: number): number {
  const pool = previewPoolPercent(category);
  const raw = pool - appliedDiscount;
  return raw <= 0 ? 0 : Math.round(raw * 100) / 100;
}

/**
 * Client-side preview of purchase totals. Server recalculates on POST /api/store/order.
 * Amounts are gross purchase sums in rubles (before discount), integer rounding per line.
 */
export function computeOrderTotals(
  categories: PreviewCategory[],
  amountDrafts: CategoryAmountDraft,
  discountDrafts?: CategoryDiscountDraft,
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
    const applied = appliedClientDiscountPercent(category, discountDrafts);
    totalAmount += amount;
    totalDiscount += lineDiscountRub(amount, applied);
    const issuerPct = previewIssuerPercent(category, applied);
    totalIssuerBonus += Math.round((amount * issuerPct) / 100);
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
  discountDrafts?: CategoryDiscountDraft,
): Array<{ category: string; categoryLabel: string; amount: number; discountPercent?: number }> {
  return categories
    .map((category) => {
      const raw = amountDrafts[category.category]?.trim() ?? "";
      const amount = Number(raw);
      const explicitDiscount = hasExplicitClientDiscountDraft(category, discountDrafts);
      const applied = appliedClientDiscountPercent(category, discountDrafts);
      return {
        category: category.category,
        categoryLabel: category.categoryLabel,
        amount,
        ...(explicitDiscount ? { discountPercent: applied } : {}),
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