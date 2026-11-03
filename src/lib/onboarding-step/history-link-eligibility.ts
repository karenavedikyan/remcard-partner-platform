import type { AuthUser } from "@/lib/types";
import type { WalletEmptyAudienceRole } from "@/lib/wallet-empty/types";

/**
 * History list APIs return 403 only when session `user.role !== "PRO"` (backend audit bb7db4ca).
 * Used for onboarding `/history` links — no proContext GET required.
 */
export function canLinkOnboardingHistoryFromUserRole(
  role: AuthUser["role"] | string | null | undefined,
): boolean {
  return role === "PRO";
}

/** @deprecated Prefer `canLinkOnboardingHistoryFromUserRole` for onboarding links (5f). */
export function canLinkOnboardingReadOnlyHistoryFromProContext(
  proContextRole: string | null | undefined,
): boolean {
  return proContextRole === "ORG_OWNER";
}

/**
 * Onboarding may link to read-only `/history` only for PRO sessions that can use history APIs.
 * Business sellers (store/company) additionally require org-owner pro context.
 */
export function canOpenOnboardingReadOnlyHistory(input: {
  sessionRole: AuthUser["role"] | string | null | undefined;
  proContextRole?: string | null | undefined;
  /** Agent / issuer surfaces (no branch pro-context gate). */
  issuerHistory?: boolean;
}): boolean {
  if (input.sessionRole !== "PRO") return false;
  if (input.issuerHistory) return true;
  return canLinkOnboardingReadOnlyHistoryFromProContext(input.proContextRole);
}

export function canOpenOnboardingReadOnlyHistoryForWalletEmpty(
  walletRole: WalletEmptyAudienceRole | null | undefined,
  sessionRole: AuthUser["role"] | string | null | undefined,
  proContextRole: string | null | undefined,
): boolean {
  if (walletRole !== "store" && walletRole !== "company") return false;
  return canOpenOnboardingReadOnlyHistory({ sessionRole, proContextRole, issuerHistory: false });
}
