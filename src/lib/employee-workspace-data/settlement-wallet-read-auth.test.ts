import { describe, expect, it } from "vitest";
import {
  authorizeSettlementWalletRead,
  settlementWalletAccessDeniedCopy,
} from "./settlement-wallet-read-auth";
import {
  fixtureOptovikOwnerProContext,
  fixtureSergeyAuthUser,
  fixtureSergeyOrgEmployeeContext,
} from "./fixtures";

describe("authorizeSettlementWalletRead", () => {
  it("denies CLIENT employee without canViewWallet before ledger", () => {
    expect(
      authorizeSettlementWalletRead({
        user: fixtureSergeyAuthUser(),
        proContext: fixtureSergeyOrgEmployeeContext({ canViewWallet: false }),
        contextReady: true,
      }),
    ).toEqual({ allowed: false, reason: "missing_wallet_permission" });
  });

  it("allows CLIENT employee with canViewWallet", () => {
    expect(
      authorizeSettlementWalletRead({
        user: fixtureSergeyAuthUser(),
        proContext: fixtureSergeyOrgEmployeeContext({ canViewWallet: true }),
        contextReady: true,
      }),
    ).toEqual({ allowed: true, mode: "org-member-with-ledger" });
  });

  it("allows PRO org owner without explicit ledger flag", () => {
    expect(
      authorizeSettlementWalletRead({
        user: { role: "PRO" },
        proContext: fixtureOptovikOwnerProContext(),
        contextReady: true,
      }),
    ).toEqual({ allowed: true, mode: "pro-owner" });
  });

  it("uses permission copy instead of generic profile denial", () => {
    expect(settlementWalletAccessDeniedCopy("missing_wallet_permission")).toContain(
      "Просмотр расчётов",
    );
  });
});
