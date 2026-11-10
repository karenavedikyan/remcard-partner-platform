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

  it("denies when no ACTIVE branch grants (bb7db4ca count===0 must not allow)", () => {
    expect(
      authorizeSettlementWalletRead({
        user: fixtureSergeyAuthUser(),
        proContext: fixtureSergeyOrgEmployeeContext({
          canViewWallet: true,
          includeActiveBranchGrant: false,
        }),
        contextReady: true,
      }),
    ).toEqual({ allowed: false, reason: "no_active_branch_grant" });
  });

  it("allows CLIENT employee with canViewWallet on every active branch as company ledger (not owner)", () => {
    expect(
      authorizeSettlementWalletRead({
        user: fixtureSergeyAuthUser(),
        proContext: fixtureSergeyOrgEmployeeContext({ canViewWallet: true }),
        contextReady: true,
      }),
    ).toEqual({
      allowed: true,
      mode: "org-member-company-ledger",
    });
  });

  it("allows CLIENT employee with partial canViewWallet as branch ledger only", () => {
    expect(
      authorizeSettlementWalletRead({
        user: fixtureSergeyAuthUser(),
        proContext: fixtureSergeyOrgEmployeeContext({
          canViewWallet: true,
          organizationActiveBranchIds: [
            "branch-optovik-main",
            "branch-optovik-north",
          ],
        }),
        contextReady: true,
      }),
    ).toEqual({
      allowed: true,
      mode: "org-member-with-ledger",
      branchIds: ["branch-optovik-main"],
    });
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
