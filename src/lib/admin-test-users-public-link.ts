export type AdminTestUserPublicLinkInput = {
  id: string;
  publicId: string;
  catalogStatus?: string | null;
  isPublic?: boolean;
  isBlocked?: boolean;
  profTestDisabledAt?: string | null;
  profTestPublicCatalogAllowed?: boolean;
  organizationsOwned?: Array<{
    id: string;
    catalogStatus: string;
    catalogPublished: boolean;
  }>;
};

/** Public remcard.ru link only when catalog is approved, allowed, and not blocked. */
export function adminTestUserPublicCatalogUrl(item: AdminTestUserPublicLinkInput): string | null {
  if (item.profTestDisabledAt || item.isBlocked) return null;
  if (!item.profTestPublicCatalogAllowed) return null;

  const org = item.organizationsOwned?.[0];
  if (org?.catalogPublished && org.catalogStatus === "APPROVED") {
    return `https://remcard.ru/catalog/org/${encodeURIComponent(org.id)}`;
  }

  if (!org && item.isPublic === true && item.catalogStatus === "APPROVED") {
    return `https://remcard.ru/partner/${encodeURIComponent(item.id)}`;
  }

  return null;
}
