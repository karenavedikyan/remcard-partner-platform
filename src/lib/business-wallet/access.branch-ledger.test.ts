import { describe, expect, it } from "vitest";
import { walletLedgerBranchIdsFromReadAuth } from "./access";
import { fixtureSergeyOrgEmployeeContext } from "@/lib/employee-workspace-data/fixtures";

describe("walletLedgerBranchIdsFromReadAuth", () => {
  it("returns sorted unique branch ids for org-member-with-ledger only", () => {
    expect(
      walletLedgerBranchIdsFromReadAuth({
        allowed: true,
        mode: "org-member-with-ledger",
        branchIds: ["b2", "b1", "b2"],
      }),
    ).toEqual(["b1", "b2"]);
  });

  it("omits owner and solo modes", () => {
    expect(
      walletLedgerBranchIdsFromReadAuth({ allowed: true, mode: "pro-owner" }),
    ).toBeUndefined();
    expect(
      walletLedgerBranchIdsFromReadAuth({
        allowed: true,
        mode: "org-member-with-ledger",
        branchIds: [],
      }),
    ).toBeUndefined();
  });

  it("maps fixture Sergey grants to branch list", () => {
    const auth = {
      allowed: true as const,
      mode: "org-member-with-ledger" as const,
      branchIds: ["branch-optovik-main"],
    };
    expect(walletLedgerBranchIdsFromReadAuth(auth)).toEqual(["branch-optovik-main"]);
    expect(fixtureSergeyOrgEmployeeContext({ canViewWallet: true }).branchAssignments?.[0]?.branchId).toBe(
      "branch-optovik-main",
    );
  });
});
