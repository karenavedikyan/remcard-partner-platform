export type CertificatesListLoadState = "loading" | "loaded" | "error";

/** True only for a successful response when the workspace has no certificates at all. */
export function shouldShowCertificatesNewPartnerEmpty(input: {
  loadState: CertificatesListLoadState;
  error: string;
  itemsLength: number;
  activeCount: number;
  archivedCount: number;
  archived: boolean;
  filtersActive: boolean;
}): boolean {
  if (input.loadState !== "loaded") return false;
  if (input.error.trim()) return false;
  if (input.archived) return false;
  if (input.filtersActive) return false;
  if (input.itemsLength > 0) return false;
  if (input.activeCount > 0 || input.archivedCount > 0) return false;
  return true;
}
