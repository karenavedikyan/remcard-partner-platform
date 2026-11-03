import type { AuthMeResponse } from "@/lib/types";
import type { WalletPresentation } from "@/lib/wallet-accruals/types";
import { resolveWalletPresentation } from "@/lib/wallet-accruals/presentation";

type Input = {
  fallbackRibbon?: string;
  /**
   * When true, show actor displayName/publicId on the card.
   * Backend does not expose wallet-owner identity on /api/auth/me for employees;
   * leave false until a provable ownership signal exists.
   */
  provableWalletOwnership?: boolean;
};

/** Card ribbon/PAN — never infer owner from actor id alone. */
export function resolveWalletPresentationForSession(
  me: AuthMeResponse | null,
  input: Input = {},
): WalletPresentation {
  if (!input.provableWalletOwnership || !me?.user) {
    return resolveWalletPresentation({
      fallbackRibbon: input.fallbackRibbon ?? "Кошелёк",
      catalogDisplayName: null,
      displayName: null,
      publicId: null,
    });
  }

  return resolveWalletPresentation({
    displayName: me.user.displayName,
    publicId: me.user.publicId,
    fallbackRibbon: input.fallbackRibbon,
  });
}
