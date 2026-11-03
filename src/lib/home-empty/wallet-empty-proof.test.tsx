import { describe, expect, it } from "vitest";
import type { WalletBalanceResponse } from "@/lib/history-types";
import {
  EMPTY_MASTER_WALLET_FIXTURE,
  specialistWalletEmptyProof,
} from "./wallet-empty-proof";

describe("specialistWalletEmptyProof", () => {
  it("accepts fully zero MASTER wallet with optional fields absent", () => {
    expect(specialistWalletEmptyProof(EMPTY_MASTER_WALLET_FIXTURE, null)).toBe("empty");
  });

  it("accepts optional rub fields when explicitly zero", () => {
    expect(
      specialistWalletEmptyProof(
        {
          ...EMPTY_MASTER_WALLET_FIXTURE,
          awaitingRub: 0,
          suspendedRub: 0,
          balanceRub: 0,
        },
        null,
      ),
    ).toBe("empty");
  });

  it("rejects audit reproduction with pending accruals and count", () => {
    expect(
      specialistWalletEmptyProof(
        {
          role: "MASTER",
          totalRub: 0,
          paidRub: 0,
          pendingRub: 700,
          awaitingRub: 300,
          count: 2,
        },
        null,
      ),
    ).toBe("not_empty");
  });

  it.each([
    ["totalRub", { totalRub: 1 }],
    ["paidRub", { paidRub: 1 }],
    ["pendingRub", { pendingRub: 1 }],
    ["count", { count: 1 }],
    ["awaitingRub", { awaitingRub: 1 }],
    ["suspendedRub", { suspendedRub: 1 }],
    ["balanceRub", { balanceRub: 1 }],
  ] as const)("rejects non-zero %s", (_label, patch) => {
    expect(
      specialistWalletEmptyProof({ ...EMPTY_MASTER_WALLET_FIXTURE, ...patch }, null),
    ).toBe("not_empty");
  });

  it("returns unknown on wallet error or malformed payload", () => {
    expect(specialistWalletEmptyProof(null, "fail")).toBe("unknown");
    expect(specialistWalletEmptyProof({ role: "MASTER" } as WalletBalanceResponse, null)).toBe(
      "unknown",
    );
    expect(specialistWalletEmptyProof({ ...EMPTY_MASTER_WALLET_FIXTURE, count: "2" as never }, null)).toBe(
      "unknown",
    );
  });

  it("returns unknown for non-MASTER role", () => {
    expect(
      specialistWalletEmptyProof({ ...EMPTY_MASTER_WALLET_FIXTURE, role: "AGENT" }, null),
    ).toBe("unknown");
  });
});
