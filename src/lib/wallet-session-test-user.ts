import type { AuthUser } from "@/lib/types";

/** Vitest / local preview stand-in (legacy shell — no CabinetPresentationProvider). */
export const walletSessionTestUser: AuthUser = {
  id: "wallet-session-test",
  role: "PRO",
  partnerType: null,
  displayName: "Test",
};
