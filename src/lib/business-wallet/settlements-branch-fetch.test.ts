import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SettlementsResponse } from "@/lib/settlements-types";

vi.mock("@/lib/api-client", () => {
  class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { remcardFetch: vi.fn(), RemcardApiError };
});

import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { fetchSettlements, mergeSettlementsResponses } from "@/lib/settlements-loader";

const baseRow = {
  id: "a1",
  orderId: "o1",
  accrualType: "bonus" as const,
  counterpartyId: "c1",
  counterpartyName: "P",
  amount: 10,
  basis: "b",
  status: "CONFIRMED",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("mergeSettlementsResponses", () => {
  it("dedupes open rows by accrualType:id and completed by direction:type:id", () => {
    const merged = mergeSettlementsResponses([
      {
        receivable: [baseRow, { ...baseRow, amount: 99 }],
        payable: [],
        completed: [],
        coverageNote: "A",
      },
      {
        receivable: [
          { ...baseRow, accrualType: "agentBonus", amount: 20 },
        ],
        payable: [{ ...baseRow, id: "p1" }],
        completed: [
          {
            ...baseRow,
            paidAt: "2026-02-01T00:00:00.000Z",
            direction: "receivable" as const,
          },
          {
            ...baseRow,
            accrualType: "agentBonus",
            paidAt: "2026-02-02T00:00:00.000Z",
            direction: "receivable" as const,
          },
        ],
        coverageNote: "B",
      },
    ]);
    expect(merged.receivable).toHaveLength(2);
    expect(merged.receivable[0]?.amount).toBe(10);
    expect(merged.receivable.find((r) => r.accrualType === "agentBonus")?.amount).toBe(20);
    expect(merged.payable).toHaveLength(1);
    expect(merged.completed).toHaveLength(2);
    expect(merged.coverageNote).toContain("A");
    expect(merged.coverageNote).toContain("B");
  });
});

describe("fetchSettlements branch scope", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("rejects explicit empty staff branch scope without owner GET", async () => {
    await expect(fetchSettlements({ walletLedgerBranchIds: [] })).rejects.toMatchObject({
      status: 403,
    });
    expect(remcardFetch).not.toHaveBeenCalled();
  });

  it("uses owner GET without branchId when options omitted", async () => {
    const payload: SettlementsResponse = {
      receivable: [],
      payable: [],
      completed: [],
      coverageNote: "",
    };
    vi.mocked(remcardFetch).mockResolvedValue(payload);
    await fetchSettlements();
    expect(remcardFetch).toHaveBeenCalledWith("/api/pro/wallet/settlements");
  });

  it("fails entire load when any branch request returns 403", async () => {
    const branchPayload: SettlementsResponse = {
      receivable: [baseRow],
      payable: [],
      completed: [],
      coverageNote: "",
    };
    vi.mocked(remcardFetch).mockImplementation((url: string) => {
      if (url.includes("branchId=b1")) return Promise.resolve(branchPayload);
      if (url.includes("branchId=b2")) {
        return Promise.reject(new RemcardApiError(403, "Forbidden"));
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    await expect(
      fetchSettlements({ walletLedgerBranchIds: ["b2", "b1"] }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("merges two successful branch responses", async () => {
    vi.mocked(remcardFetch).mockImplementation((url: string) => {
      if (url.includes("branchId=b1")) {
        return Promise.resolve({
          receivable: [{ ...baseRow, id: "r1" }],
          payable: [],
          completed: [],
          coverageNote: "",
        });
      }
      if (url.includes("branchId=b2")) {
        return Promise.resolve({
          receivable: [{ ...baseRow, id: "r2" }],
          payable: [],
          completed: [],
          coverageNote: "",
        });
      }
      return Promise.reject(new Error(url));
    });

    const merged = await fetchSettlements({ walletLedgerBranchIds: ["b1", "b2"] });
    expect(merged.receivable.map((r) => r.id).sort()).toEqual(["r1", "r2"]);
  });
});
