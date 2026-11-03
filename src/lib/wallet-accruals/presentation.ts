import type { WalletPresentation } from "@/lib/wallet-accruals/types";

/** Format supported public id for card PAN line; never use prototype demo numbers. */
export function formatWalletCardIdentifier(publicId: string | null | undefined): string | null {
  const trimmed = publicId?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^RC-/i, "RC ").replace(/-/g, " ");
}

export function resolveWalletPresentation(input: {
  displayName?: string | null;
  catalogDisplayName?: string | null;
  publicId?: string | null;
  fallbackRibbon?: string;
}): WalletPresentation {
  const ribbonLabel =
    input.catalogDisplayName?.trim() ||
    input.displayName?.trim() ||
    input.fallbackRibbon?.trim() ||
    "Кошелёк";
  return {
    ribbonLabel,
    cardIdentifier: formatWalletCardIdentifier(input.publicId),
  };
}
