import { remcardFetch } from "@/lib/api-client";
import type { PartnerTaxonomyResponse } from "@/lib/types";

export async function fetchPartnerTaxonomy(query?: string): Promise<PartnerTaxonomyResponse> {
  const q = query?.trim();
  const path = q
    ? `/api/pro/partner-taxonomy?q=${encodeURIComponent(q)}`
    : "/api/pro/partner-taxonomy";
  return remcardFetch<PartnerTaxonomyResponse>(path, { method: "GET" });
}
