import type { AvailablePartner } from "@/lib/certificate-types";
import { categoryFieldKey } from "@/lib/certificate-percent";

export function partnerSelectionKey(partner: AvailablePartner): string {
  return `${partner.storeUserId}:${partner.partnershipId ?? "self"}`;
}

export function partnerMatchesSearch(partner: AvailablePartner, query: string): boolean {
  const q = query.trim().toLocaleLowerCase("ru");
  if (!q) return true;
  const haystack = [
    partner.storeName,
    partner.displayName ?? "",
    partner.city ?? "",
    ...partner.categories.map((c) => `${c.categoryLabel} ${c.category}`),
  ]
    .join(" ")
    .toLocaleLowerCase("ru");
  return haystack.includes(q);
}

export function defaultCategoryDiscountDraft(poolPercent: number | null): string {
  if (poolPercent == null || !Number.isFinite(poolPercent)) return "";
  const capped = Math.min(5, poolPercent);
  const rounded = Math.round(capped * 10) / 10;
  return String(rounded);
}

export function categoryKeysForPartners(partners: AvailablePartner[]): string[] {
  const keys: string[] = [];
  for (const partner of partners) {
    for (const cat of partner.categories) {
      keys.push(categoryFieldKey(partner.storeUserId, cat.category));
    }
  }
  return keys;
}
