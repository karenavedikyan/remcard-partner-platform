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

export type CategoryValidationError = {
  fieldKey: string;
  message: string;
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

export function toPercent(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max) * 100) / 100;
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

/**
 * Mirrors `updateCategoryPercent` in navigator CertificateWizard.
 */
export function computeCategoryPercents(
  category: CategoryPercentInput,
  discountRaw: string,
): { ok: true; value: ResolvedCategoryPercents } | { ok: false; message: string } {
  const trimmed = discountRaw.trim();
  if (!trimmed) {
    return { ok: false, message: "Укажите скидку клиенту" };
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    return { ok: false, message: "Некорректное значение скидки" };
  }

  const pool = resolvePoolPercent(category);
  if (pool === null) {
    return {
      ok: false,
      message: `Не задан согласованный процент для «${category.categoryLabel}»`,
    };
  }

  if (category.isSelfScan) {
    const discountPercent = toPercent(numeric, 0, 100);
    return {
      ok: true,
      value: { discountPercent, issuerPercent: 0, poolPercent: pool },
    };
  }

  const maxTotal = toPercent(pool, 0, 100);
  const discountPercent = toPercent(numeric, 0, maxTotal);
  const issuerPercent = toPercent(maxTotal - discountPercent, 0, maxTotal);

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
  | { ok: false; formError?: string; fieldErrors: Record<string, string> };

export function categoryFieldKey(storeUserId: string, category: string): string {
  return `${storeUserId}::${category}`;
}

export function buildCreateCertificatePayload(input: BuildPayloadInput): BuildPayloadResult {
  if (input.selectedPartners.length === 0) {
    return { ok: false, formError: "Выберите хотя бы одного партнёра", fieldErrors: {} };
  }

  const fieldErrors: Record<string, string> = {};
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
    };
  }

  if (partners.length === 0) {
    return { ok: false, formError: "Выберите хотя бы одного партнёра", fieldErrors: {} };
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
