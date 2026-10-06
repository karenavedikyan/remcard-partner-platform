import type {
  AvailablePartnerCategory,
  CreateCertificateBody,
  CreateCertificatePartnerInput,
} from "@/lib/certificate-types";

export type CategoryPercentInput = {
  category: string;
  categoryLabel: string;
  poolPercent?: number;
  discountPercent?: number;
  isSelfScan: boolean;
};

export type ResolvedCategoryPercents = {
  discountPercent: number;
  issuerPercent: number;
  poolPercent: number;
};

export type CategoryValidationFailureReason =
  | "empty"
  | "invalid"
  | "negative"
  | "over_limit"
  | "missing_pool";

export function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

/** @deprecated Use roundPercent on already-validated values. Kept for tests mirroring navigator clamp helper. */
export function toPercent(value: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  return roundPercent(clamped);
}

export function formatDiscountLimitError(poolPercent: number): string {
  return `Согласовано ${poolPercent}%. Укажите скидку от 0 до ${poolPercent}% или предложите изменить условия партнёрства`;
}

export function resolvePoolPercent(category: CategoryPercentInput): number | null {
  if (category.isSelfScan) {
    return 100;
  }
  const pool = category.poolPercent;
  if (pool == null || !Number.isFinite(pool) || pool <= 0 || pool > 100) {
    return null;
  }
  return pool;
}

export type ComputeCategoryResult =
  | { ok: true; value: ResolvedCategoryPercents }
  | { ok: false; message: string; reason: CategoryValidationFailureReason };

/**
 * Validates and splits an agreed pool between client discount and PROF reward.
 * Does not clamp out-of-range values — returns an error instead.
 */
export function computeCategoryPercents(
  category: CategoryPercentInput,
  discountRaw: string,
): ComputeCategoryResult {
  const trimmed = discountRaw.trim();
  if (!trimmed) {
    return { ok: false, message: "Укажите скидку клиенту", reason: "empty" };
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    return { ok: false, message: "Некорректное значение скидки", reason: "invalid" };
  }

  if (numeric < 0) {
    return { ok: false, message: "Скидка не может быть отрицательной", reason: "negative" };
  }

  const pool = resolvePoolPercent(category);
  if (pool === null) {
    return {
      ok: false,
      message: `Не задан согласованный процент для «${category.categoryLabel}»`,
      reason: "missing_pool",
    };
  }

  if (category.isSelfScan) {
    if (numeric > 100) {
      return {
        ok: false,
        message: "Укажите скидку от 0 до 100%",
        reason: "over_limit",
      };
    }
    const discountPercent = roundPercent(numeric);
    return {
      ok: true,
      value: { discountPercent, issuerPercent: 0, poolPercent: pool },
    };
  }

  const maxTotal = roundPercent(pool);
  if (numeric > maxTotal) {
    return {
      ok: false,
      message: formatDiscountLimitError(maxTotal),
      reason: "over_limit",
    };
  }

  const discountPercent = roundPercent(numeric);
  const issuerPercent = roundPercent(maxTotal - discountPercent);

  return {
    ok: true,
    value: { discountPercent, issuerPercent, poolPercent: maxTotal },
  };
}

export function previewIssuerPercent(
  category: CategoryPercentInput,
  discountRaw: string,
): number | null {
  const result = computeCategoryPercents(category, discountRaw);
  if (!result.ok) {
    return null;
  }
  return result.value.issuerPercent;
}

export function partnershipTermsHref(partnershipId: string | null | undefined): string | null {
  if (!partnershipId) {
    return null;
  }
  return `/partners?terms=${encodeURIComponent(partnershipId)}`;
}

export type BuildPayloadInput = {
  selectedPartners: Array<{
    storeUserId: string;
    storeName: string;
    partnershipId: string | null;
    isSelfScan: boolean;
    categories: AvailablePartnerCategory[];
  }>;
  discountDrafts: Record<string, string>;
  validUntil?: string;
  maxUsages?: number;
};

export type BuildPayloadResult =
  | { ok: true; body: CreateCertificateBody }
  | {
      ok: false;
      formError?: string;
      fieldErrors: Record<string, string>;
      fieldErrorReasons: Record<string, CategoryValidationFailureReason>;
    };

export function categoryFieldKey(storeUserId: string, category: string): string {
  return `${storeUserId}::${category}`;
}

export function buildCreateCertificatePayload(input: BuildPayloadInput): BuildPayloadResult {
  if (input.selectedPartners.length === 0) {
    return {
      ok: false,
      formError: "Выберите хотя бы одного партнёра",
      fieldErrors: {},
      fieldErrorReasons: {},
    };
  }

  const fieldErrors: Record<string, string> = {};
  const fieldErrorReasons: Record<string, CategoryValidationFailureReason> = {};
  const partners: CreateCertificatePartnerInput[] = [];

  for (const partner of input.selectedPartners) {
    const categories: CreateCertificatePartnerInput["categories"] = [];

    for (const cat of partner.categories) {
      const key = categoryFieldKey(partner.storeUserId, cat.category);
      const raw =
        input.discountDrafts[key] ??
        (cat.discountPercent != null ? String(cat.discountPercent) : "");

      const computed = computeCategoryPercents(
        {
          category: cat.category,
          categoryLabel: cat.categoryLabel,
          poolPercent: cat.poolPercent,
          discountPercent: cat.discountPercent,
          isSelfScan: partner.isSelfScan,
        },
        raw,
      );

      if (!computed.ok) {
        fieldErrors[key] = computed.message;
        fieldErrorReasons[key] = computed.reason;
        continue;
      }

      categories.push({
        category: cat.category,
        categoryLabel: cat.categoryLabel,
        discountPercent: computed.value.discountPercent,
        issuerPercent: computed.value.issuerPercent,
      });
    }

    if (categories.length !== partner.categories.length) {
      continue;
    }

    partners.push({
      storeUserId: partner.storeUserId,
      storeName: partner.storeName,
      partnershipId: partner.partnershipId,
      isSelfScan: partner.isSelfScan,
      categories,
    });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      formError: "Исправьте условия по категориям",
      fieldErrors,
      fieldErrorReasons,
    };
  }

  if (partners.length === 0) {
    return {
      ok: false,
      formError: "Выберите хотя бы одного партнёра",
      fieldErrors: {},
      fieldErrorReasons: {},
    };
  }

  return {
    ok: true,
    body: {
      validUntil: input.validUntil,
      maxUsages: input.maxUsages ?? 0,
      partners,
    },
  };
}
