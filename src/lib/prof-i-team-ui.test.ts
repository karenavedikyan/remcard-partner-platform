import { describe, expect, it } from "vitest";
import {
  flagsFromActionIds,
  normalizePermissionFlags,
  toggleActionInSet,
} from "./prof-i-permissions";

describe("prof-i-team-ui helpers", () => {
  it("ties payout to ledger in UI normalization", () => {
    const flags = normalizePermissionFlags({ canPayBonusTransfer: true, canViewWallet: false });
    expect(flags.canViewWallet).toBe(true);
  });

  it("toggleActionInSet adds ledger with cash", () => {
    const next = toggleActionInSet([], "cash", true);
    expect(next.includes("ledger")).toBe(true);
    expect(next.includes("cash")).toBe(true);
  });

  it("manager template excludes payout by default", () => {
    const flags = flagsFromActionIds([
      "clients",
      "scan",
      "sale",
      "own",
      "ledger",
      "catalog",
      "terms",
      "team",
    ]);
    expect(flags.canPayBonusCash).toBe(false);
    expect(flags.canPayBonusTransfer).toBe(false);
  });
});
